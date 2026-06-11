# SMSFlow Node.js SDK

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

## Features

- Get and cache SMSFlow login tokens.
- Send one or more SMS messages.
- Schedule SMS messages using UTC delivery time.
- Respect opt-out checks by default.
- Check account balance.
- Throw structured errors when the API returns an error.

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
