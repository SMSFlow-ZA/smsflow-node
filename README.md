# SMSFlow Node.js SDK

[![npm version](https://img.shields.io/npm/v/@smsflow/smsflow.svg)](https://www.npmjs.com/package/@smsflow/smsflow)
[![CI](https://github.com/SMSFlow-ZA/smsflow-node/actions/workflows/ci.yml/badge.svg)](https://github.com/SMSFlow-ZA/smsflow-node/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

The SMSFlow Node.js SDK makes it easy to send SMS messages and check SMS credit balance from backend Node.js applications, Express APIs, workers, scheduled jobs, CRM integrations, and other server-side JavaScript systems.

Documentation: https://docs.smsflow.co.za/

## Install

```bash
npm install @smsflow/smsflow
```

## Configuration

Store credentials in environment variables or your platform's secret manager.

```bash
SMSFLOW_CLIENT_ID=YOUR_CLIENT_ID
SMSFLOW_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

Do not use this SDK from browser-side JavaScript. SMSFlow Client Secrets must stay on the server.

## Usage

```javascript
import { SmsFlowClient } from "@smsflow/smsflow";

const client = new SmsFlowClient({
  clientId: process.env.SMSFLOW_CLIENT_ID,
  clientSecret: process.env.SMSFLOW_CLIENT_SECRET,
  timeoutMs: 30000,
});

const result = await client.sendSms({
  campaignName: "Node SDK example",
  messages: [
    {
      destination: "27000000000",
      content: "Your SMSFlow Node.js test message was sent successfully.",
    },
  ],
});

console.log(result.sendResponse?.eventId);
```

## Bulk send

```javascript
await client.sendSms({
  campaignName: "Order dispatch alerts",
  messages: [
    { destination: "27000000000", content: "Order 1001 has shipped." },
    { destination: "27000000001", content: "Order 1002 has shipped." },
  ],
});
```

## Check balance

```javascript
const balance = await client.getBalance();
console.log(balance.balance);
```

## Error handling

```javascript
import {
  SmsFlowAuthenticationError,
  SmsFlowClient,
  SmsFlowError,
  SmsFlowValidationError,
} from "@smsflow/smsflow";

try {
  await client.sendSms({
    campaignName: "Transactional SMS",
    messages: [{ destination: "27000000000", content: "Hello from SMSFlow." }],
  });
} catch (error) {
  if (error instanceof SmsFlowAuthenticationError) {
    console.error("Check your SMSFlow Client ID and Client Secret.");
  } else if (error instanceof SmsFlowValidationError) {
    console.error("Fix the request before retrying.", error.code, error.body);
  } else if (error instanceof SmsFlowError) {
    console.error(error.status, error.code, error.retryable, error.body);
  }
  throw error;
}
```

## Timeouts and retries

Set a request timeout and opt in to retries when your application can safely handle them:

```javascript
const client = new SmsFlowClient({
  clientId: process.env.SMSFLOW_CLIENT_ID,
  clientSecret: process.env.SMSFLOW_CLIENT_SECRET,
  timeoutMs: 30000,
  retry: { retries: 2, baseDelayMs: 250, maxDelayMs: 2000 },
});

const balance = await client.getBalance(); // Safe to retry temporary failures.

await client.sendSms({
  campaignName: "Transactional SMS",
  retry: true, // Use only with your own idempotency or duplicate-send guard.
  messages: [{ destination: "27000000000", content: "Hello from SMSFlow." }],
});
```

Retry only temporary network failures, `408`, `429`, and `5xx` responses. Do not retry validation errors, authentication failures, or insufficient-balance responses until the underlying issue has been fixed. Store the returned `eventId` against your own transaction or notification record.

## Delivery status

The public HTTPS API currently exposes authentication, send, and balance endpoints. Delivery-status helper methods will be added when a public delivery-status endpoint is available.

## Features

- Get and cache SMSFlow login tokens.
- Send one or more SMS messages.
- Schedule SMS messages using UTC delivery time.
- Respect opt-out checks by default.
- Check account balance.
- Throw typed structured errors when the API returns an error.
- Configure timeouts and opt-in retries for temporary failures.

## Local test send

This command sends a real SMS and may consume test credits:

```bash
SMSFLOW_CLIENT_ID=YOUR_CLIENT_ID \
SMSFLOW_CLIENT_SECRET=YOUR_CLIENT_SECRET \
SMSFLOW_DESTINATION=27000000000 \
npm run example:send
```

## Security

Use this SDK from server-side Node.js applications. Do not expose SMSFlow Client Secrets in browser-side JavaScript.

## License

MIT
