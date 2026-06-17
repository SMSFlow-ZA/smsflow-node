# Changelog

## 0.2.0 - 2026-06-17

- Added typed error classes for authentication, validation, server, and network failures.
- Added request timeout support.
- Added opt-in retry handling for temporary failures.
- Kept send retries explicit so applications can avoid duplicate SMS notifications.
- Expanded README guidance for balance checks, bulk sends, structured errors, and delivery status.

## 0.1.0 - 2026-06-17

- Initial public Node.js SDK for the SMSFlow HTTPS API.
- Added authentication with token caching.
- Added SMS sending, bulk sending, and balance helpers.
- Published package: `@smsflow/smsflow`.
