# SMSFlow Node.js SDK

Draft public Node.js client for the SMSFlow HTTPS API.

## Install

Package publishing is not enabled yet. During development, reference this package locally.

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

## Safety

Use this SDK from server-side Node.js applications. Do not expose SMSFlow Client Secrets in browser-side JavaScript.
