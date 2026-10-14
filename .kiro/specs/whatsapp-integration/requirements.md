# WhatsApp Integration — Requirements (EARS Format)

**Project:** SAMS WhatsApp Communication System  
**Owner:** Nisar Ahmed — INBYO TECH  
**Spec version:** 1.0  
**DB target:** v4  

---

## Functional Requirements

### Gateway (server/)

REQ-G01: WHEN the server starts, the system SHALL load and validate all environment variables via Zod; IF any required variable is missing or malformed, the process SHALL exit with a descriptive error message.

REQ-G02: WHEN a GET request is made to `/health`, the system SHALL respond with `{ok, version, mode}` without exposing any credentials or tokens.

REQ-G03: WHEN a POST request is made to `/api/whatsapp/messages`, the system SHALL validate the API key, validate each item with Zod, reject unknown templates or wrong parameter counts before calling Meta, and return a per-item result array with `clientId, result, messageId?, error?`.

REQ-G04: WHEN a message is submitted with a `dedupeKey` that already exists, the system SHALL return `duplicate` with the original `messageId` and SHALL NOT call Meta again.

REQ-G05: WHILE a Meta API call returns a 429 or 5xx status, the system SHALL retry with exponential back-off plus jitter for up to 3 attempts with a 15 s timeout per attempt; IF all retries fail, the item result SHALL be `failed` with `retryable:true`.

REQ-G06: WHEN a Meta API call returns a non-retryable error code (e.g. 132001, 131026), the system SHALL return immediately with `retryable:false` and a mapped friendly message.

REQ-G07: WHEN an inbound message text normalises to STOP, UNSUBSCRIBE, CANCEL, or OPT OUT (case-insensitive), the system SHALL store an opt-out record, emit an `optout` event, and SHALL NOT send further template messages to that number.

REQ-G08: WHEN an inbound message text normalises to START or SUBSCRIBE, the system SHALL store an opt-in record and emit an `optin` event.

REQ-G09: WHEN `WHATSAPP_MODE=mock`, the system SHALL behave identically to live mode for validation, BUT SHALL NOT call Meta; it SHALL fabricate message IDs and SHALL simulate `sent → delivered → read` event sequences on timers.

REQ-G10: WHEN `POST /api/whatsapp/mock/inbound` is called (mock mode only), the system SHALL simulate a parent reply message and emit an `inbound` event.

REQ-G11: WHEN the daily message count reaches `DAILY_MESSAGE_CAP`, subsequent messages SHALL return `cap_reached`.

REQ-G12: WHEN a recipient number has received `PER_RECIPIENT_HOURLY_CAP` messages in the last hour, that item SHALL return `rate_limited`.

REQ-G13: WHEN a GET request is made to `/api/whatsapp/events?since=<cursor>&limit=`, the system SHALL return events with autoincrement IDs greater than the cursor, in ascending order.

REQ-G14: WHEN a webhook POST arrives, the system SHALL verify the `X-Hub-Signature-256` header using HMAC-SHA256 with `timingSafeEqual`; IF verification fails, it SHALL return 403 and log the failure.

REQ-G15: WHEN processing webhook events, the system SHALL update delivery status only if the new status is a forward step (sent → delivered → read); it SHALL NEVER move status backwards.

REQ-G16: WHEN `GET /api/whatsapp/diagnostics` is called, the system SHALL return token validity, phone number info, webhook last-seen time, today's usage vs cap, mode, and gateway version.

REQ-G17: WHEN `POST /api/whatsapp/text` is called, the system SHALL only send if the recipient messaged within the last 24 hours; otherwise it SHALL return `window_closed`.

REQ-G18: WHEN the server receives SIGTERM or SIGINT, it SHALL complete in-flight requests and close the database cleanly before exiting.

---

### Frontend — Data Layer

REQ-F01: WHEN the IndexedDB opens at version 4, the system SHALL run a non-destructive migration that adds `whatsappOutbox`, `whatsappInbox`, and `syncState` stores WITHOUT modifying existing v3 data.

REQ-F02: WHEN a v3 backup is restored, the system SHALL accept it and restore all existing stores; the absence of WhatsApp stores in the backup SHALL NOT cause an error.

REQ-F03: WHEN exporting a database backup, the system SHALL NOT include `whatsappApiKey` unless the user explicitly ticks an "include secrets" box.

REQ-F04: WHEN a WhatsApp outbox item is enqueued with the same `dedupeKey` as an existing item, the system SHALL skip enqueueing and return the existing item.

REQ-F05: WHILE the app is offline AND attendance is submitted, the system SHALL enqueue WhatsApp messages in the outbox with status `queued`.

REQ-F06: WHEN the app comes back online (or on a 30 s interval while visible), the outbox processor SHALL send batches of ≤50 queued items; IF the same items are sent from two tabs simultaneously, the `navigator.locks` single-flight lock SHALL prevent double-sending.

REQ-F07: WHEN the outbox processor encounters a retryable failure, it SHALL apply exponential back-off with `nextAttemptAt` and up to 5 total attempts.

REQ-F08: WHEN the sync worker pulls new events from the gateway, it SHALL update outbox item statuses, apply opt-out/opt-in to the matching Student record, and store inbound messages in the inbox.

REQ-F09: WHEN WhatsApp is disabled in Settings, the app SHALL behave exactly as it does today; EmailJS flows SHALL be unaffected.

REQ-F10: WHEN quiet hours are enabled and an attendance notification is triggered outside quiet hours, it SHALL send immediately; IF triggered during quiet hours, it SHALL set `scheduledFor` to the quiet-hours end time.

---

### Frontend — UI

REQ-U01: WHEN the user enters a parent WhatsApp number, the system SHALL validate it with `libphonenumber-js/min` and show a formatted preview; an invalid number SHALL block saving.

REQ-U02: WHEN the user clicks the "Notify parents" sheet after submitting attendance, the system SHALL show per-student recipient rows, skip reasons, message preview, and estimated count; IF the count exceeds `whatsappBulkConfirmThreshold`, a confirmation warning SHALL appear.

REQ-U03: WHEN an attendance record is corrected after a notification was already sent, the system SHALL show "Status changed — send correction?" and SHALL NOT auto-resend.

REQ-U04: WHEN a WhatsApp message fails, delivery chips in the attendance sheet SHALL show `failed` with a Resend button.

REQ-U05: WHEN an inbound message arrives in the Inbox, a quick-reply composer SHALL be enabled ONLY if the 24 h reply window is open; otherwise it SHALL explain why.

REQ-U06: WHEN the Setup Health panel is loaded, the system SHALL check gateway reachability, API key validity, mode, token, phone info, each template's approval status, webhook last-seen, and daily usage; each check SHALL show a status icon and a fix hint.

REQ-U07: WHEN the user enters an API key in Settings and saves, the key SHALL be stored masked and SHALL NOT appear in database exports by default.

REQ-U08: WHEN a user navigates to the WhatsApp Center, the sidebar item SHALL show an unread badge count for new replies and pending failures.

REQ-U09: WHEN an announcement is posted, the system SHALL show a channel selector (Email / WhatsApp / Both) and SHALL show per-channel recipient counts.

REQ-U10: WHEN the Admin PIN is set and a user attempts to open Settings → WhatsApp or reveal the API key, the system SHALL require PIN entry; it SHALL auto-lock after inactivity.

---

### Non-Functional

REQ-N01: All TypeScript code SHALL have zero `tsc --noEmit` errors in strict mode; `any` MAY be used only at validated Zod boundaries.

REQ-N02: The WhatsApp access token and app secret SHALL reside ONLY in `server/.env` and SHALL NEVER appear in frontend bundles, logs, exports, or `localStorage`.

REQ-N03: Phone numbers in server logs SHALL be masked to the pattern `92300****567`.

REQ-N04: The gateway SHALL enforce HTTPS, helmet headers, strict CORS allowlist, API-key auth with constant-time comparison, body limit 256 kb, and rate limits per API key and per IP.

REQ-N05: The system SHALL pass a Lighthouse PWA audit without regression from the baseline recorded in Phase A.

REQ-N06: The outbox processor and sync worker SHALL operate correctly with 1,000 students and 5,000 outbox rows without UI jank.

REQ-N07: The gateway SHALL provide a Dockerfile (multi-stage, non-root, healthcheck) and a `docker-compose.yml` with a SQLite volume.

REQ-N08: All new UI components SHALL have loading, empty, error, and offline states; keyboard accessibility; and ARIA labels.
