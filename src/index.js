export class SmsFlowError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "SmsFlowError";
    this.status = status;
    this.body = body;
  }
}

export class SmsFlowClient {
  constructor({
    clientId,
    clientSecret,
    baseUrl = "https://portal.smsflow.co.za/",
    fetchImpl = globalThis.fetch,
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
    this.cachedAuth = null;
    this.refreshAt = 0;
  }

  async authenticate() {
    const basicToken = Buffer.from(`${this.clientId}:${this.clientSecret}`, "utf8").toString("base64");
    const response = await this.fetch(`${this.baseUrl}/api/integration/authentication`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicToken}`,
      },
    });

    const body = await readBody(response);
    if (!response.ok) {
      throw new SmsFlowError("SMSFlow authentication failed.", {
        status: response.status,
        body,
      });
    }

    this.cachedAuth = body;
    const expiresInMinutes = Number(body.expiresInMinutes || 1);
    this.refreshAt = Date.now() + Math.max(expiresInMinutes - 5, 1) * 60 * 1000;
    return body;
  }

  async sendSms({ campaignName = "SMSFlow API", startDeliveryUtc = null, checkOptOuts = true, messages }) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new SmsFlowError("At least one SMS message is required.");
    }

    const token = await this.getToken();
    const response = await this.fetch(`${this.baseUrl}/api/integration/BulkMessages`, {
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
    });

    const body = await readBody(response);
    if (!response.ok) {
      throw new SmsFlowError("SMSFlow send failed.", {
        status: response.status,
        body,
      });
    }

    return body;
  }

  async getBalance() {
    const token = await this.getToken();
    const response = await this.fetch(`${this.baseUrl}/api/integration/Balance`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await readBody(response);
    if (!response.ok) {
      throw new SmsFlowError("SMSFlow balance request failed.", {
        status: response.status,
        body,
      });
    }

    return body;
  }

  async getToken() {
    if (this.cachedAuth?.token && Date.now() < this.refreshAt) {
      return this.cachedAuth.token;
    }

    const auth = await this.authenticate();
    return auth.token;
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
