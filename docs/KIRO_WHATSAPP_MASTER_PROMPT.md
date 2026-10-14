# KIRO MASTER PROMPT — WhatsApp Integration for SAMS (Student Attendance Management System)

> **How to use:** Save this file in the project as `docs/KIRO_WHATSAPP_PROMPT.md`. In Kiro, open a new **Spec** session and send:
> *"Read #docs/KIRO_WHATSAPP_PROMPT.md fully and execute it end-to-end, phase by phase, without stopping between phases."*

---

## 0. ROLE & MISSION

You are a senior full-stack engineer and architect. Your mission is to deliver a **complete, enterprise-grade, production-ready WhatsApp communication system** inside the existing SAMS project (React 19 + TypeScript + Vite PWA, IndexedDB, Tailwind v4, Motion, Lucide, EmailJS). The result must feel native to the current app: same design language, same conventions, fully working, tested and documented.

**Owner:** Nisar Ahmed — INBYO TECH. Quality and completeness matter more than speed.

---

## 1. NON-NEGOTIABLE EXECUTION RULES

1. **Execute all phases (A to J) continuously.** Do not pause between phases to ask for approval. After each phase, write a short report into `docs/WHATSAPP_PROGRESS.md`, run the quality gate, then immediately start the next phase.
2. **No scope reduction.** Every feature in this document ships fully working. No `TODO`, no placeholder UI, no stub functions, no fake data in production code paths. (The explicit **mock mode** in §5 is a real feature, not a stub.)
3. **No mid-build redesigns.** The architecture in §3 is decided. Do not switch approach halfway. If you find a genuine blocker, choose the closest compliant alternative, record it in `docs/ASSUMPTIONS.md`, and continue.
4. **Do not break anything that exists.** EmailJS flow, announcements, attendance, reports, analytics, backup/restore, undo, offline behaviour and PWA must keep working exactly as today. WhatsApp is an **additive, optional layer**: if it is disabled or unconfigured, the app behaves as it does now.
5. **Audit first.** Before writing code, read the actual codebase (`src/*`, `database.ts`, `types.ts`, `emailService.ts`, `notificationHelper.ts`, all views, `vite.config.ts`, `package.json`, `docs/*`, `PROJECT_MCP.md`). Follow the real conventions you find (naming, toast usage, modal patterns, logging via `addLog`). Where this prompt and the real code differ, the real code wins for conventions and this prompt wins for requirements.
6. **Quality gate after every phase:** `npm run lint` (tsc, zero errors), `npm run build`, `npm test` (once tests exist), and the same for `server/`. Fix failures before continuing.
7. **TypeScript strict.** No `any` except at validated boundaries (parse with `zod` immediately). No unused code left behind.
8. **Secrets:** the WhatsApp access token and app secret live **only** in `server/.env`. Never in the frontend, never in `localStorage`, never in logs, never committed. Mask phone numbers in logs (`92300****567`).
9. **Do not ask the owner for credentials in chat.** Read them from `server/.env`. Ask a question only if truly blocked; otherwise assume sensible defaults and document them.
10. **Prototype cleanup:** if a `server/` folder from an earlier prototype exists (an `/attendance-alerts` endpoint with an in-memory store), upgrade/replace it with the architecture below.
11. **Spec workflow:** create `.kiro/specs/whatsapp-integration/` with `requirements.md` (EARS format), `design.md`, and `tasks.md`, and a steering file `.kiro/steering/whatsapp-conventions.md` summarising §1, §3 and §4. Then execute the tasks.

---

## 2. CONTEXT & ALREADY-DONE WORK

- Owner has completed Meta setup: Meta developer app with WhatsApp product, test number, Phone Number ID, WhatsApp Business Account ID, App Secret, access token. The owner will place them in `server/.env`.
- Owner will create the message templates in Meta using the exact text you generate in `docs/WHATSAPP_TEMPLATES.md`.
- Current app facts (verify in code): dev port 5173; IndexedDB version 3 with stores for students, classes, subjects, attendance, sessions, logs, notifications, announcements, homework, results; settings in `localStorage`; `Student` has `contactNumber`, `parentEmail`, `secondaryParentEmail`; `NotificationType` already includes `attendance_alert`, `homework`, `result`, `announcement`, `certificate`, `fee_reminder`, `event`, `general`; no authentication; no backend; `express`, `cors`, `concurrently` were deliberately removed from the app.

---

## 3. ARCHITECTURE (FINAL — DO NOT CHANGE)

WhatsApp Cloud API cannot be called safely from a browser (the access token would be exposed and Meta webhooks need a public server). Therefore:

```
┌──────────────────────── Browser (PWA, offline-first) ────────────────────────┐
│ UI (Attendance, Announcements, Homework, Results, Reports, WhatsApp Center)  │
│        │                                                                      │
│  notificationDispatcher ──► emailService (EmailJS, unchanged)                 │
│        │                                                                      │
│        └──► whatsapp outbox (IndexedDB) ──► outboxProcessor ──┐               │
│                                  ▲                            │ HTTPS + key   │
│                        syncWorker (pull events by cursor) ◄───┼───────┐       │
└──────────────────────────────────────────────────────────────┼───────┼───────┘
                                                               ▼       │
┌─────────────── WhatsApp Gateway  (server/, separate package) ────────┴───────┐
│ Express + TS │ auth │ rate limit │ zod │ SQLite │ pino │ mock mode           │
│ POST /messages  GET /events  GET /templates  GET /diagnostics  /webhook       │
└───────────────────────────────┬───────────────────────────▲──────────────────┘
                                ▼ Graph API                 │ webhooks (signed)
                         Meta WhatsApp Cloud API ───────────┘
```

**Key decisions**
- The gateway is a **separate package** (`server/package.json`) so the frontend `package.json` stays clean. The app never imports server code.
- The gateway API is **generic** (template name + params), not attendance-specific.
- The browser keeps a durable **outbox** in IndexedDB, so sending works offline-first: queued while offline, auto-sent when back online.
- Delivery receipts and parent replies come back through an incremental **events feed** (`GET /events?since=cursor`) that the app syncs into IndexedDB.
- The gateway stores messages/events in **SQLite** (`better-sqlite3`) behind a repository interface, so it can later be swapped for Postgres.
- The gateway can serve the built `dist/` too (single-deploy option) or run separately from a static host. Support both and document both.

---

## 4. TECH & DEPENDENCY RULES

**Gateway (`server/package.json`)**: `express@4`, `cors`, `helmet`, `express-rate-limit`, `zod`, `pino`, `pino-http`, `better-sqlite3`, `libphonenumber-js`, `dotenv`; dev: `typescript`, `tsx`, `vitest`, `supertest`, `@types/*`. Node 20+. Use built-in `fetch` + `AbortSignal.timeout`.

**Frontend**: add only `libphonenumber-js` (use `/min` build) and dev dependency `vitest` (+ `@testing-library/react`, `jsdom`, `fake-indexeddb` for tests). **Do not add chart libraries**: reuse whatever `AnalyticsView` already uses; if it has none, build lightweight SVG/CSS charts.

**Frontend root scripts to add:** `test`, `server:dev`, `server:build`, `dev:all` (run frontend + gateway; use a tiny Node script or `npm-run-all`-free approach if you want to avoid re-adding `concurrently`; adding `concurrently` as a **devDependency** is acceptable).

**Vite:** add dev proxy `/api` → `http://localhost:3001`. The production gateway URL is configurable in Settings.

**Graph API version:** configurable via env (`WHATSAPP_API_VERSION`, default `v21.0`); check Meta's docs for the current version and note it in `docs/ASSUMPTIONS.md`.

**Design system:** Tailwind v4 classes, slate neutral / indigo primary / emerald success / rose error / amber warning, dark mode via `dark:`, mobile-first (`md:`), Motion for transitions, Lucide icons. Every new view needs loading, empty, error and offline states, keyboard accessibility, and ARIA labels.

---

## 5. GATEWAY SPECIFICATION (`server/`)

### 5.1 Structure
```
server/
├─ package.json  tsconfig.json  Dockerfile  .dockerignore  .env.example  README.md
├─ src/
│  ├─ index.ts            # bootstrap + graceful shutdown (SIGTERM/SIGINT)
│  ├─ app.ts              # express app factory (testable)
│  ├─ config.ts           # zod-validated env, fail-fast
│  ├─ logger.ts           # pino + redaction (tokens, phone numbers, auth header)
│  ├─ db/{index.ts,migrations.ts,repo.ts}
│  ├─ middleware/{auth.ts,errors.ts,requestId.ts}
│  ├─ whatsapp/{client.ts,templates.ts,routes.ts,webhook.ts,events.ts,optout.ts,limits.ts,errorMap.ts,mock.ts}
│  └─ utils/{phone.ts,hash.ts}
└─ test/ (vitest + supertest, Graph API mocked)
```

### 5.2 Environment (`.env.example`, all documented)
`NODE_ENV, PORT=3001, ALLOWED_ORIGINS, API_KEYS` (comma-separated, ≥32 chars each, supports rotation), `WHATSAPP_MODE=live|mock`, `WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, WHATSAPP_API_VERSION, DEFAULT_COUNTRY_CODE, DB_PATH, DAILY_MESSAGE_CAP=500, PER_RECIPIENT_HOURLY_CAP=5, RETENTION_DAYS=90, SERVE_STATIC=false`. In `mock` mode the Meta variables are optional.

### 5.3 Endpoints (all under `/api`, JSON, zod-validated, request-ID on every response)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | none | liveness (`{ok, version, mode}`) — no sensitive data |
| `GET/POST /whatsapp/webhook` | Meta signature | verification handshake + receipts/inbound. **Mounted before `express.json()`**, raw body, `X-Hub-Signature-256` HMAC-SHA256 with `timingSafeEqual`; respond `200` immediately, process after |
| `POST /whatsapp/messages` | API key | batch (≤200) send. Item: `{clientId, to, template, language?, params[], dedupeKey, meta?}`. Returns per-item `{clientId, result: accepted\|duplicate\|invalid_number\|rate_limited\|cap_reached\|opted_out\|failed, messageId?, error?: {code, message, retryable}}` |
| `POST /whatsapp/text` | API key | free-form reply, **only if the recipient messaged within the last 24 h** (else `window_closed`) |
| `GET /whatsapp/events?since=<cursor>&limit=` | API key | monotonic cursor feed of `status` (sent/delivered/read/failed), `inbound` (text/media-meta), `optout`, `optin` events |
| `GET /whatsapp/templates` | API key | local registry merged with Meta approval status (APPROVED/PENDING/REJECTED, category, language) |
| `GET /whatsapp/diagnostics` | API key | token valid?, phone number info (verified name, display number, quality rating, messaging-limit tier if available), webhook last-seen time, today's usage vs cap, mode, gateway version |
| `POST /whatsapp/test` | API key | sends Meta's built-in `hello_world` (`en_US`) to a given number |

### 5.4 Behaviour requirements
- **Template registry (`templates.ts`)** with all templates from §7: name, category, language, parameter count, per-param max length, sanitiser. Reject unknown template or wrong param count **before** calling Meta. Sanitise params: strip newlines/tabs, collapse runs of spaces, trim, cap length.
- **Idempotency:** unique `dedupeKey` in SQLite; repeated key → `duplicate` with the original `messageId`. Never double-send on client retry.
- **Retries:** exponential backoff + jitter on `429`/`5xx`/network errors (3 attempts, 15 s timeout). Non-retryable errors return immediately with a `retryable:false` flag.
- **Error mapping (`errorMap.ts`)**: translate Meta error codes into friendly messages and a `retryable` flag. Cover at least: expired/invalid token (190), template missing (132001), parameter mismatch (132000), recipient not on WhatsApp / undeliverable (131026), re-engagement/24 h window (131047), recipient not in allowed test list (131030), throughput and pair rate limits (130429, 131056), spam/ecosystem limits (131048, 131049). Verify codes against Meta's current docs and keep a default fallback.
- **Cost & abuse guards:** daily cap, per-recipient hourly cap, max batch 200, body limit 256 kb, rate limit per API key and per IP.
- **Opt-out handling:** inbound messages whose normalised text is `STOP`, `UNSUBSCRIBE`, `CANCEL`, `OPT OUT` (case-insensitive) → store opt-out, emit an `optout` event, send **no** further template messages to that number (`opted_out`), optionally send the confirmation if a template is configured. `START`/`SUBSCRIBE` re-opts-in and emits `optin`.
- **Mock mode (`WHATSAPP_MODE=mock`)**: never calls Meta; validates everything identically, fabricates message IDs, and simulates `sent → delivered → read` events on timers, with a configurable failure rate (`MOCK_FAILURE_RATE`) and a dev-only `POST /whatsapp/mock/inbound` to simulate a parent reply. This lets the owner demo and test everything with zero Meta cost.
- **Persistence (SQLite, WAL mode, migrations table):** `messages`, `events` (autoincrement cursor), `inbound`, `optouts`, `usage_daily`. Retention job purges rows older than `RETENTION_DAYS`.
- **Security:** `helmet`, strict CORS allowlist, API-key auth with constant-time comparison (multiple keys), no stack traces to clients, centralised error handler, `trust proxy` configurable, structured logs with redaction, graceful shutdown.
- **Delivery:** `Dockerfile` (multi-stage, non-root, healthcheck), `docker-compose.yml` with a volume for the SQLite file, optional static serving of `../dist`.
- **Tests (vitest + supertest, Graph API mocked):** phone normalisation, signature verification (valid/invalid/missing), webhook ordering (never move status backwards), idempotency, caps, opt-out flow, template validation, error mapping, events cursor pagination, mock-mode lifecycle, auth.

---

## 6. FRONTEND SPECIFICATION

### 6.1 Data layer
- **Types (`types.ts`)**
  - `Student` += `parentWhatsApp?: string`, `secondaryParentWhatsApp?: string`, `whatsappOptIn?: boolean`, `whatsappOptInAt?: number`, `whatsappOptInSource?: 'manual'|'csv'|'reply'|'form'`.
  - `AppSettings` += `whatsappEnabled`, `whatsappGatewayUrl`, `whatsappApiKey`, `whatsappDefaultCountryCode`, `whatsappAutoSendAttendance`, `whatsappAttendanceStatuses: ('absent'|'late'|'leave')[]` (default `absent, late`), `whatsappQuietHours: {enabled, start, end}`, `whatsappTypeToggles` per `NotificationType`, `whatsappTemplateOverrides`, `whatsappBulkConfirmThreshold` (default 50), `whatsappLowAttendanceThreshold` (default 75).
  - `WhatsAppOutboxItem`: `id, clientId, type: NotificationType, studentId?, recipientName, to, template, language, params, dedupeKey, status: queued|sending|accepted|sent|delivered|read|failed|cancelled|opted_out|invalid, messageId?, error?, retryable?, retryCount, nextAttemptAt?, createdAt, updatedAt, scheduledFor?, meta?`.
  - `WhatsAppInboundMessage`: `id, from, studentId?, text, receivedAt, read, replyWindowEndsAt`.
  - `SyncState`: `{key, value}` (stores the events cursor).
- **IndexedDB v3 → v4 migration (non-destructive, `onupgradeneeded`):** add `whatsappOutbox` (indexes: `status`, `createdAt`, unique `dedupeKey`, `studentId`, `type`), `whatsappInbox` (`from`, `receivedAt`, `read`), `syncState`. Add CRUD/query methods to `SAMSIndexedDB` in the existing style, with `addLog` audit entries. Data from v3 must survive untouched.
- **Backup/restore:** include the new stores and a `schemaVersion`; restoring a v3 backup must still work; **never include `whatsappApiKey` in exports** unless the user ticks an explicit "include secrets" box.
- **System reset:** clears the new stores; seed data must not create fake outbox rows.
- **Phone utility (`phone.ts`):** parse/validate with `libphonenumber-js/min`, normalise to digits-only E.164 for the API, display format for UI, same rules as the gateway. Shared test vectors for both sides.

### 6.2 Services (`src/whatsapp/`)
- `apiClient.ts` — typed fetch wrapper (timeouts, abort, error mapping, API-key header, gateway URL from settings, never throws raw errors to UI).
- `templates.ts` — client-side mirror of the template registry (names, param builders, labels, preview renderer that fills `{{n}}` for UI previews).
- `payloadBuilders.ts` — pure functions building params per notification type (attendance, summary, homework, result, announcement, fee, event, certificate, opt-in welcome) with sanitising and truncation.
- `outbox.ts` — enqueue with dedupe, bulk enqueue, cancel, retry, status transitions.
- `outboxProcessor.ts` — runs on app start, `online` event, tab focus, and a 30 s interval while visible. Sends batches of ≤50, honours quiet hours (`scheduledFor`), exponential backoff with `nextAttemptAt`, max 5 attempts for retryable errors, marks non-retryable as `failed` with a human-readable reason. Single-flight lock across tabs (use `BroadcastChannel` or `navigator.locks`). Progressive enhancement with Background Sync if supported, never required.
- `syncWorker.ts` — pulls `/events?since=cursor`, applies status updates to outbox, stores inbound messages, applies `optout`/`optin` to the matching `Student`, persists cursor, fires toasts only for important events (new reply, failures).
- `notificationDispatcher.ts` — single entry point: `dispatch({type, studentIds|recipients, channels: ('email'|'whatsapp')[], payload})`. Routes to the existing `emailService` (unchanged behaviour) and the WhatsApp outbox; applies recipient rules: WhatsApp needs a valid number **and** `whatsappOptIn === true`; reports skipped recipients with reasons (`no_number`, `invalid_number`, `no_opt_in`, `opted_out`, `duplicate`). Extend `notificationHelper.ts` functions to accept channels without breaking current signatures.
- `useWhatsApp()` hook + `useOnlineStatus()` hook exposing outbox counts, gateway health, last sync time.

### 6.3 UI features (match existing styling and patterns)

1. **Settings → "WhatsApp" card** (placed beside EmailJS config): enable switch; gateway URL; API key (masked, reveal toggle, never shown in plain after save); default country code; attendance statuses to notify; auto-send vs confirm-first; quiet hours; per-type toggles; template overrides; bulk-confirm threshold; low-attendance threshold; **Send test message** (to a typed number via `/test`); **Setup Health panel** with live check rows — gateway reachable, API key accepted, mode (live/mock banner), token valid, phone number info + quality rating, each required template found/approved/pending/rejected, webhook last received, daily usage vs cap — each with a clear fix hint and a "Re-check" button. Show the webhook URL with a copy button.
2. **Students:** add parent WhatsApp number(s) with live validation and formatted preview, consent checkbox that records timestamp and source, status badge in the list (Opted-in / No consent / Invalid number / Opted-out), filter by consent status, **CSV import** columns `parentWhatsApp, secondaryParentWhatsApp, whatsappOptIn` with an import report (valid/invalid/duplicate rows), bulk set-consent action with confirmation + audit log, and **Export consent register (CSV)**. If `parentWhatsApp` is empty, fall back to `contactNumber` only when the user enables that option in Settings.
3. **Attendance:** after **Submit Roster**, open a **"Notify parents" sheet** (or auto-send if enabled): counts per status, recipient list with skip reasons, message preview, estimated message count, confirm threshold warning, and "Send now / Schedule for quiet-hours end / Skip". Show per-student **delivery chips** (queued → sent → delivered → read / failed) on the sheet and in attendance history, with **Resend** on failures. Handle corrections: if a record changes after a notification was sent, show "Status changed — send correction?" instead of silently re-sending. Attendance saving must **never** be blocked or delayed by WhatsApp errors.
4. **WhatsApp Center** (`MessagesView.tsx`, new sidebar item with unread badge) with tabs:
   - **Outbox/History:** table (mobile → cards) with search, filters (status, type, class, date range), bulk retry/cancel, detail drawer (timeline, template, rendered preview, error + fix hint), CSV export.
   - **Inbox:** parent replies grouped by student/number, unread state, student context card, quick-reply composer (enabled only while the 24 h window is open, otherwise explains why), opt-out/opt-in indicators.
   - **Templates:** all registry templates with category, language, approval status, rendered preview with sample data, and "copy template text" for Meta submission.
   - **Stats:** sent/delivered/read/failed rates, volume per day, per type, per class, top failure reasons, daily-cap gauge.
   - **Quick Composer:** pick type (fee reminder, event notice, certificate issued, announcement), choose recipients (all / class / individual), fill variables, preview, confirm, send.
5. **Announcements:** channel selector **Email / WhatsApp / Both**, recipient counts per channel, add `channels`, `whatsappQueued`, `whatsappSent`, `whatsappFailed` to `Announcement`, show both channels' stats in history.
6. **Homework & Results:** *audit first.* Wire the WhatsApp channel into the existing homework/result notification flows. If no UI exists for the Homework and Results stores, build full `HomeworkView.tsx` and `ResultsView.tsx` (CRUD, class/subject filters, validation, undo, publish → notify) in the existing style and add them to the sidebar.
7. **Reports:** "Low attendance warnings" — list students under the threshold for a chosen date range, preview and send the `attendance_summary` template to the opted-in parents with one confirmation.
8. **Dashboard widget:** WhatsApp today (sent, delivered %, failed needing attention, pending in outbox, unread replies) with links into the Center. Hidden when WhatsApp is disabled.
9. **Sidebar bell:** include WhatsApp failures and new replies alongside the activity indicator.
10. **Admin PIN lock (security layer):** optional PIN (PBKDF2 via WebCrypto, salted, stored hashed) required to open Settings → WhatsApp and to reveal the API key; auto-lock after inactivity. Clearly document that this is a local convenience layer, not real authentication.

---

## 7. TEMPLATES (generate these exactly in `docs/WHATSAPP_TEMPLATES.md`)

For each: name, category, language `en`, body, variable map, sample values, and a short note for Meta submission. Body text must **start and end with text, not a variable**, and variables must not contain newlines. Make the category configurable in the registry, because Meta may reclassify some of these as Marketing and charge accordingly.

| # | Name | Body | Variables |
|---|---|---|---|
| 1 | `attendance_alert` | Attendance Alert from {{1}}: Your child {{2}} was marked {{3}} in {{4}} on {{5}}. Please contact the school if this is incorrect. | school, student, status, subject, date |
| 2 | `attendance_summary` | Attendance Summary from {{1}}: {{2}} has {{3}} attendance from {{4}} to {{5}}. Please ensure regular attendance. | school, student, percentage, from, to |
| 3 | `homework_assigned` | Homework Notice from {{1}}: {{2}} has new homework titled {{3}} in {{4}}, due on {{5}}. Please help your child complete it on time. | school, student, title, subject, due date |
| 4 | `result_published` | Result Notice from {{1}}: {{2}} scored {{3}} in {{4}} for the {{5}} exam. Please contact the school for details. | school, student, marks, subject, exam |
| 5 | `announcement_notice` | School Notice from {{1}} ({{2}}): {{3}} Please contact the school office for any questions. | school, type, message (≤300 chars) |
| 6 | `fee_reminder` | Fee Reminder from {{1}}: The fee of {{2}} for {{3}} is due on {{4}}. Please pay before the due date or contact the school office. | school, amount, student, due date |
| 7 | `event_notice` | Event Notice from {{1}}: {{2}} will be held on {{3}} at {{4}}. Parents of {{5}} are invited to attend. | school, event, date, venue, student |
| 8 | `certificate_issued` | Certificate Notice from {{1}}: A {{2}} certificate has been issued to {{3}}. Please collect it from the school office. | school, certificate type, student |
| 9 | `optin_welcome` | Welcome from {{1}}: You will now receive school updates about {{2}} on WhatsApp. Reply STOP at any time to opt out. | school, student |

Testing uses Meta's built-in `hello_world` (`en_US`), so the owner can verify the pipeline before any template is approved.

---

## 8. PHASES (execute A → J in order, continuously)

**A. Audit & Spec** — read the codebase; create the Kiro spec and steering files; write `docs/ASSUMPTIONS.md`; create `docs/WHATSAPP_PROGRESS.md`. *Done when:* spec/steering exist and the audit summary is recorded.

**B. Gateway foundation** — `server/` package, config, logger, auth, error handling, SQLite + migrations, health, mock mode skeleton, Dockerfile. *Done when:* `server` lint/build/test pass and `/health` works.

**C. Gateway WhatsApp core** — template registry, Meta client with retries and error mapping, `/messages`, `/text`, webhook with signature verification, events feed, opt-out handling, caps, `/templates`, `/diagnostics`, `/test`, full mock lifecycle, full test suite. *Done when:* all endpoint tests pass and a mock-mode end-to-end run produces `sent → delivered → read` events.

**D. Frontend data layer** — types, DB v4 migration, backup/restore, settings schema, phone util, `apiClient`, `templates`, `payloadBuilders`, `outbox`, `outboxProcessor`, `syncWorker`, `notificationDispatcher`, hooks, Vite proxy, scripts. *Done when:* unit tests pass and a v3 database upgrades without data loss.

**E. Settings & Students UI** — WhatsApp settings card, Setup Health panel, test message, student numbers and consent, CSV import/export, badges and filters, Admin PIN. *Done when:* in mock mode the Setup Health panel is fully green and consent flows work.

**F. Attendance integration** — Notify sheet, auto-send, quiet hours, delivery chips, resend, corrections, offline queueing. *Done when:* marking attendance offline queues messages and they send automatically when back online, with no duplicates.

**G. WhatsApp Center** — Outbox/History, Inbox with quick reply, Templates, Stats, Quick Composer, sidebar item + badge, bell integration. *Done when:* a simulated parent reply in mock mode appears in the Inbox and a quick reply sends.

**H. Cross-module integration** — Announcements channels, Homework/Results (build views if missing), Reports low-attendance warnings, Dashboard widget. *Done when:* every notification type can be sent through the dispatcher on both channels.

**I. Hardening & tests** — frontend tests (payload builders, phone util, outbox state machine/backoff, dispatcher recipient rules, DB migration with `fake-indexeddb`), accessibility pass, responsive + dark-mode pass, empty/error/offline states, performance check with 1,000 students and 5,000 outbox rows, security review (secrets, logs, CORS, rate limits, export redaction), GitHub Actions CI (lint + test + build for app and server). *Done when:* all gates are green.

**J. Docs, deployment & handover** — write `docs/WHATSAPP_SETUP.md` (Meta steps, token, webhook, ngrok), `docs/WHATSAPP_TEMPLATES.md`, `docs/DEPLOYMENT.md` (Docker + a PaaS option + a VPS with Caddy/HTTPS, persistent volume for SQLite, environment checklist, backup of the DB file), `docs/WHATSAPP_TESTING.md` (mock-mode script, live-mode script, edge cases), `docs/GO_LIVE_CHECKLIST.md` (business verification, templates approved, consent collected, key rotation, monitoring, rollback), update `README.md`, `.env.example`, `PROJECT_MCP.md` (version **3.0.0**, DB version 4, new architecture, stores, endpoints, features, troubleshooting) and `TESTING_GUIDE.md`. Finish with `docs/HANDOVER.md`: what was built, how to run it, known limits, and the next-step list for the owner.

---

## 9. ACCEPTANCE CRITERIA (final verification — run and record in `docs/HANDOVER.md`)

1. App with WhatsApp **disabled** behaves exactly as before; EmailJS flows still pass `TESTING_GUIDE.md`.
2. `npm run lint && npm test && npm run build` and the same in `server/` pass with zero errors.
3. In **mock mode**, end-to-end: add student with consent → mark absent → notify sheet → message goes `queued → sent → delivered → read` → chips update → simulate a reply → Inbox shows it → quick reply works → reply `STOP` → student becomes opted-out and is skipped next time.
4. Offline test: go offline, submit attendance, outbox queues, come back online, messages send once (no duplicates), even with two tabs open.
5. v3 database and v3 backup both upgrade/restore without data loss.
6. No secrets, tokens or full phone numbers appear in the frontend bundle, logs, exports or `localStorage` (except the gateway API key the admin entered, which is masked in the UI and excluded from exports by default).
7. Live mode with the owner's test number: `hello_world` test succeeds and Setup Health shows all checks accurately.
8. Lighthouse PWA and accessibility checks do not regress compared with the baseline you record in Phase A.

---

## 10. FINAL INSTRUCTION

Start now with **Phase A**. Work through **Phase J** without stopping for confirmation. Keep quality at production level in every file. When everything is complete, deliver `docs/HANDOVER.md` and a concise summary of what the owner must do next (fill `server/.env`, submit the 9 templates in Meta, deploy the gateway, register the webhook, collect parent consent, go live).
