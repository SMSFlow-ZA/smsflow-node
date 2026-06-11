import { SmsFlowClient } from "../src/index.js";

const destination = process.env.SMSFLOW_DESTINATION;

if (!process.env.SMSFLOW_CLIENT_ID || !process.env.SMSFLOW_CLIENT_SECRET || !destination) {
  console.error("Set SMSFLOW_CLIENT_ID, SMSFLOW_CLIENT_SECRET, and SMSFLOW_DESTINATION before running.");
  process.exit(1);
}

const client = new SmsFlowClient({
  clientId: process.env.SMSFLOW_CLIENT_ID,
  clientSecret: process.env.SMSFLOW_CLIENT_SECRET,
  baseUrl: process.env.SMSFLOW_BASE_URL,
});

const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const response = await client.sendSms({
  campaignName: "Node SDK sample",
  messages: [
    {
      destination,
      content: `Your SMSFlow Node.js SDK test message was sent successfully. Run ${runId}.`,
    },
  ],
});

console.log(response);
