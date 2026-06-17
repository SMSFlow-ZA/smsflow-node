import assert from "node:assert/strict";
import test from "node:test";
import {
  SmsFlowAuthenticationError,
  SmsFlowClient,
  SmsFlowValidationError,
} from "../src/index.js";

test("sendSms authenticates and posts the expected payload", async () => {
  const calls = [];
  const client = new SmsFlowClient({
    clientId: "id",
    clientSecret: "secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/authentication")) {
        return jsonResponse({ token: "token", expiresInMinutes: 120, schema: "Basic" });
      }
      return jsonResponse({ statusCode: 200, sendResponse: { eventId: 123 }, errors: null });
    },
  });

  const result = await client.sendSms({
    campaignName: "Test",
    messages: [{ destination: "27000000000", content: "Hello" }],
  });

  assert.equal(result.sendResponse.eventId, 123);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://portal.smsflow.co.za/api/integration/BulkMessages");
  assert.match(calls[1].options.headers.Authorization, /^Bearer /);
});

test("sendSms raises a typed validation error for non-retryable API failures", async () => {
  const client = new SmsFlowClient({
    clientId: "id",
    clientSecret: "secret",
    fetchImpl: async (url) => {
      if (url.endsWith("/authentication")) {
        return jsonResponse({ token: "token", expiresInMinutes: 120, schema: "Basic" });
      }

      return jsonResponse({
        statusCode: 400,
        errors: [{ code: "INVALID_DESTINATION", message: "Invalid destination." }],
      }, 400);
    },
  });

  await assert.rejects(
    () => client.sendSms({
      campaignName: "Test",
      messages: [{ destination: "not-a-number", content: "Hello" }],
    }),
    (error) => {
      assert.ok(error instanceof SmsFlowValidationError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "INVALID_DESTINATION");
      assert.equal(error.retryable, false);
      return true;
    },
  );
});

test("authenticate retries temporary server failures when retry is configured", async () => {
  const calls = [];
  const client = new SmsFlowClient({
    clientId: "id",
    clientSecret: "secret",
    retry: { retries: 1, baseDelayMs: 1 },
    fetchImpl: async (url) => {
      calls.push(url);
      if (calls.length === 1) {
        return jsonResponse({ errors: [{ code: "SERVICE_UNAVAILABLE" }] }, 503);
      }

      return jsonResponse({ token: "token", expiresInMinutes: 120, schema: "Basic" });
    },
  });

  const auth = await client.authenticate();

  assert.equal(auth.token, "token");
  assert.equal(calls.length, 2);
});

test("authenticate raises typed authentication errors", async () => {
  const client = new SmsFlowClient({
    clientId: "id",
    clientSecret: "secret",
    fetchImpl: async () => jsonResponse({ errors: [{ code: "AUTHENTICATION_FAILED" }] }, 401),
  });

  await assert.rejects(
    () => client.authenticate(),
    (error) => {
      assert.ok(error instanceof SmsFlowAuthenticationError);
      assert.equal(error.status, 401);
      return true;
    },
  );
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}
