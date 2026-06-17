export class SmsFlowError extends Error {
  constructor(message, { status, body, code = "SMSFLOW_ERROR", retryable = false, cause } = {}) {
    super(message);
    this.name = "SmsFlowError";
    this.status = status;
    this.body = body;
    this.code = code;
    this.retryable = retryable;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class SmsFlowAuthenticationError extends SmsFlowError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "AUTHENTICATION_FAILED" });
    this.name = "SmsFlowAuthenticationError";
  }
}

export class SmsFlowValidationError extends SmsFlowError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "VALIDATION_FAILED" });
    this.name = "SmsFlowValidationError";
  }
}

export class SmsFlowServerError extends SmsFlowError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "SERVER_ERROR", retryable: options.retryable ?? true });
    this.name = "SmsFlowServerError";
  }
}

export class SmsFlowNetworkError extends SmsFlowError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "NETWORK_ERROR", retryable: options.retryable ?? true });
    this.name = "SmsFlowNetworkError";
  }
}

export class SmsFlowClient {
  constructor({
    clientId,
    clientSecret,
    baseUrl = "https://portal.smsflow.co.za/",
    fetchImpl = globalThis.fetch,
    timeoutMs = 30000,
    retry = {},
  }) {
    if (!clientId || !clientSecret) {
      throw new SmsFlowError("SMSFlow clientId and clientSecret are required.");
    }

    if (!fetchImpl) {
      throw new SmsFlowError("A fetch implementation is required.");
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.retry = {
      retries: retry.retries ?? 0,
      baseDelayMs: retry.baseDelayMs ?? 250,
      maxDelayMs: retry.maxDelayMs ?? 2000,
    };
    this.cachedAuth = null;
    this.refreshAt = 0;
  }

  async authenticate() {
    const basicToken = Buffer.from(`${this.clientId}:${this.clientSecret}`, "utf8").toString("base64");

    const body = await this.requestJson(
      `${this.baseUrl}/api/integration/authentication`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicToken}`,
        },
      },
      {
        errorMessage: "SMSFlow authentication failed.",
        allowRetry: true,
      },
    );

    this.cachedAuth = body;
    const expiresInMinutes = Number(body.expiresInMinutes || 1);
    this.refreshAt = Date.now() + Math.max(expiresInMinutes - 5, 1) * 60 * 1000;
    return body;
  }

  async sendSms({ campaignName = "SMSFlow API", startDeliveryUtc = null, checkOptOuts = true, messages, retry = false }) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new SmsFlowValidationError("At least one SMS message is required.");
    }

    const token = await this.getToken();

    return await this.requestJson(
      `${this.baseUrl}/api/integration/BulkMessages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          SendOptions: {
            startDeliveryUtc,
            campaignName,
            checkOptOuts,
          },
          messages: messages.map((message) => ({
            content: message.content,
            destination: message.destination,
          })),
        }),
      },
      {
        errorMessage: "SMSFlow send failed.",
        allowRetry: retry === true,
      },
    );
  }

  async getBalance() {
    const token = await this.getToken();

    return await this.requestJson(
      `${this.baseUrl}/api/integration/Balance`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      {
        errorMessage: "SMSFlow balance request failed.",
        allowRetry: true,
      },
    );
  }

  async getToken() {
    if (this.cachedAuth?.token && Date.now() < this.refreshAt) {
      return this.cachedAuth.token;
    }

    const auth = await this.authenticate();
    return auth.token;
  }

  async requestJson(url, options, { errorMessage, allowRetry }) {
    const maxAttempts = allowRetry ? this.retry.retries + 1 : 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        const body = await readBody(response);
        if (response.ok) {
          return body;
        }

        const error = createApiError(errorMessage, response.status, body);
        if (!error.retryable || attempt === maxAttempts - 1) {
          throw error;
        }
      } catch (error) {
        const smsFlowError = error instanceof SmsFlowError
          ? error
          : new SmsFlowNetworkError("SMSFlow request failed before a response was received.", { cause: error });

        if (!smsFlowError.retryable || attempt === maxAttempts - 1) {
          throw smsFlowError;
        }
      }

      await delay(retryDelayMs(attempt, this.retry));
      attempt += 1;
    }

    throw new SmsFlowError("SMSFlow request failed.");
  }

  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new SmsFlowNetworkError(`SMSFlow request timed out after ${this.timeoutMs} ms.`, {
          code: "REQUEST_TIMEOUT",
          cause: error,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createApiError(message, status, body) {
  const options = {
    status,
    body,
    code: errorCodeFromBody(body),
    retryable: isRetryableStatus(status),
  };

  if (status === 401) {
    return new SmsFlowAuthenticationError(message, options);
  }

  if (status >= 400 && status < 500) {
    return new SmsFlowValidationError(message, options);
  }

  return new SmsFlowServerError(message, options);
}

function errorCodeFromBody(body) {
  if (body?.errors?.[0]?.code) {
    return body.errors[0].code;
  }

  if (body?.code) {
    return body.code;
  }

  return "SMSFLOW_ERROR";
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function retryDelayMs(attempt, retry) {
  return Math.min(retry.baseDelayMs * 2 ** attempt, retry.maxDelayMs);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
