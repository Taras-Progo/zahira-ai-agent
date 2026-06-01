# SendPulse Integration

SendPulse is the WhatsApp transport layer only. All intelligence lives in the backend. SendPulse never runs AI logic; it sends/receives messages, waits for responses, and routes flows based on `ai_exit`.

## Flow overview

```
WhatsApp user -> SendPulse -> "Send Webhook" block -> POST /api/chat -> backend
backend -> JSON { reply, ai_exit, intent, session_id, metadata } -> SendPulse
SendPulse sends `reply`, stores `session_id`, routes by `ai_exit`, waits for next message -> repeat
```

## Webhook configuration

- Method: `POST`
- URL: `https://YOUR_DOMAIN/api/chat`
- Header: `X-Webhook-Secret: <SENDPULSE_WEBHOOK_SECRET>` (must match the backend `.env`)
- Header: `Content-Type: application/json`

### Request body (variable mapping)

| JSON field   | SendPulse variable        | Notes                                  |
| ------------ | ------------------------- | -------------------------------------- |
| `phone`      | `{{contact.phone}}`       | WhatsApp number of the subscriber      |
| `message`    | `{{last_user_message}}`   | The text the user just sent            |
| `session_id` | `{{session_id}}`          | Stored from the previous response; omit on first message |

```json
{
  "phone": "{{contact.phone}}",
  "message": "{{last_user_message}}",
  "session_id": "{{session_id}}"
}
```

### Response handling

Save these response fields into SendPulse variables:

| Response field | SendPulse variable | Use                                   |
| -------------- | ------------------ | ------------------------------------- |
| `reply`        | `{{ai_reply}}`     | Send as the WhatsApp message          |
| `session_id`   | `{{session_id}}`   | Persist for conversation continuity   |
| `ai_exit`      | `{{ai_exit}}`      | Drive the flow router (filter block)  |
| `intent`       | `{{intent}}`       | Optional analytics/branching          |

## Routing by `ai_exit`

Add a Filter/Router block after the webhook that branches on `{{ai_exit}}`:

- `CONTINUE`  -> send `{{ai_reply}}`, wait for the next user message, re-trigger the webhook (main loop).
- `BOOKING`   -> send `{{ai_reply}}`, enter the booking flow. (Backend already created a `bookings` row.)
- `SUPPORT`   -> send `{{ai_reply}}`, route to the human handoff flow. (Backend already created a `handoffs` row.)
- `MENU`      -> show the menu blocks/buttons.
- `END_SESSION` -> send `{{ai_reply}}`, end the flow. (Backend marked the session CLOSED.)

Most turns return `CONTINUE`.

## Important rules

- Do NOT implement AI logic inside SendPulse.
- Always forward `session_id` back so the backend keeps conversation continuity.
- Keep the webhook secret out of version control.
