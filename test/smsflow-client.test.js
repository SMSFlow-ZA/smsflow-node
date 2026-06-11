import assert from "node:assert/strict";
import test from "node:test";
import { SmsFlowClient } from "../src/index.js";

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

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}
