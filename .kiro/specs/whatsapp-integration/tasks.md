# WhatsApp Integration — Tasks

**Spec version:** 1.0  

---

## Phase B — Gateway Foundation

- [x] B1: Create `server/` directory with `package.json`, `tsconfig.json`, `.env.example`, `README.md`
- [x] B2: Implement `src/config.ts` with Zod-validated env (fail-fast)
- [x] B3: Implement `src/logger.ts` (pino, redact tokens/phones/auth header)
- [x] B4: Implement `src/db/index.ts` (better-sqlite3, WAL mode)
- [x] B5: Implement `src/db/migrations.ts` (numbered migrations, schema from design.md §8)
- [x] B6: Implement `src/db/repo.ts` (typed repository methods)
- [x] B7: Implement `src/middleware/auth.ts` (API key, timingSafeEqual, multi-key)
- [x] B8: Implement `src/middleware/errors.ts` (centralised, no stack traces to client)
- [x] B9: Implement `src/middleware/requestId.ts`
- [x] B10: Implement `src/app.ts` (Express factory, mount all middleware and routes)
- [x] B11: Implement `src/index.ts` (bootstrap, graceful shutdown)
- [x] B12: Add `GET /health` endpoint
- [x] B13: Create `Dockerfile` (multi-stage, non-root, healthcheck) and `docker-compose.yml`
- [x] B14: Add gateway scripts to `server/package.json` (`dev`, `build`, `test`, `start`)
- [x] B15: Add `server:dev`, `server:build`, `dev:all`, `test` scripts to root `package.json`
- [x] B16: Quality gate: `npm run lint` + `npm run build` pass in server/

## Phase C — Gateway WhatsApp Core

- [x] C1: Implement `src/utils/phone.ts` (normalise, validate, mask with libphonenumber-js)
- [x] C2: Implement `src/utils/hash.ts` (HMAC-SHA256, timingSafeEqual)
- [x] C3: Implement `src/whatsapp/templates.ts` (registry of all 9 templates + sanitiser)
- [x] C4: Implement `src/whatsapp/errorMap.ts` (Meta error codes → friendly + retryable)
- [x] C5: Implement `src/whatsapp/client.ts` (fetch wrapper, retries, 15 s timeout)
- [x] C6: Implement `src/whatsapp/optout.ts` (store, keyword detection, opt-in)
- [x] C7: Implement `src/whatsapp/limits.ts` (daily cap, hourly cap, batch size)
- [x] C8: Implement `src/whatsapp/mock.ts` (mock mode: fake IDs, timer events, /mock/inbound)
- [x] C9: Implement `src/whatsapp/webhook.ts` (GET handshake + POST signed, raw body, immediate 200)
- [x] C10: Implement `src/whatsapp/events.ts` (cursor-based feed)
- [x] C11: Implement `src/whatsapp/routes.ts` (/messages, /text, /templates, /diagnostics, /test)
- [x] C12: Write test suite (phone, webhook, messages, events, optout, mock, caps, idempotency, errorMap)
- [x] C13: Quality gate: all server tests pass, mock-mode end-to-end produces sent→delivered→read

## Phase D — Frontend Data Layer

- [x] D1: Add new types to `src/types.ts` (Student additions, AppSettings additions, WhatsAppOutboxItem, WhatsAppInboundMessage, SyncState)
- [x] D2: Upgrade `src/database.ts` to v4 (non-destructive migration, new stores + indexes, CRUD methods)
- [x] D3: Update backup/restore in `App.tsx` (exclude apiKey, accept v3 backups, include new stores)
- [x] D4: Update system reset to clear new stores
- [x] D5: Create `src/whatsapp/phone.ts` (libphonenumber-js/min for frontend)
- [x] D6: Create `src/whatsapp/apiClient.ts` (typed fetch wrapper, gateway URL from settings)
- [x] D7: Create `src/whatsapp/templates.ts` (client template registry + preview renderer)
- [x] D8: Create `src/whatsapp/payloadBuilders.ts` (pure param builders per notification type)
- [x] D9: Create `src/whatsapp/outbox.ts` (enqueue, bulk enqueue, cancel, retry, transitions)
- [x] D10: Create `src/whatsapp/outboxProcessor.ts` (batch sender, quiet hours, back-off, locks)
- [x] D11: Create `src/whatsapp/syncWorker.ts` (events poller, status updates, inbox, opt-out)
- [x] D12: Create `src/whatsapp/notificationDispatcher.ts` (unified dispatcher, recipient rules)
- [x] D13: Create `src/whatsapp/useWhatsApp.ts` (hook)
- [x] D14: Add Vite proxy `/api → http://localhost:3001` in `vite.config.ts`
- [x] D15: Install `libphonenumber-js` in frontend; install `concurrently` as devDependency
- [x] D16: Quality gate: frontend lint/build pass; v3 DB upgrades without data loss in test

## Phase E — Settings & Students UI

- [x] E1: Add WhatsApp settings card to `SettingsView.tsx` (enable, URL, API key masked, country code, attendance statuses, auto-send, quiet hours, per-type toggles, template overrides, bulk threshold)
- [x] E2: Add Setup Health panel to `SettingsView.tsx` (all check rows, recheck, webhook URL copy)
- [x] E3: Add "Send test message" to settings (calls /test endpoint)
- [x] E4: Add Admin PIN section to settings (PBKDF2, auto-lock, gate WhatsApp settings + reveal key)
- [x] E5: Add parent WhatsApp fields to `StudentsView.tsx` add/edit form (validation, formatted preview)
- [x] E6: Add consent checkbox to student form (records timestamp + source)
- [x] E7: Add WhatsApp status badge to student list (Opted-in / No consent / Invalid / Opted-out)
- [x] E8: Add consent status filter to student list
- [x] E9: Add CSV import support for `parentWhatsApp, secondaryParentWhatsApp, whatsappOptIn` columns
- [x] E10: Add "Export consent register (CSV)" button
- [x] E11: Add bulk set-consent action with confirmation + audit log
- [x] E12: Quality gate: mock mode Setup Health panel shows all checks

## Phase F — Attendance Integration

- [x] F1: Add "Notify parents" sheet to `AttendanceView.tsx` (post-submit, counts, recipient list, skip reasons, preview, confirm threshold warning, send/schedule/skip)
- [x] F2: Add auto-send path when `whatsappAutoSendAttendance=true`
- [x] F3: Implement quiet-hours scheduling (set `scheduledFor`)
- [x] F4: Add delivery chips to attendance sheet and history (queued→sent→delivered→read/failed)
- [x] F5: Add Resend button on failed chips
- [x] F6: Detect attendance corrections after notification and show "send correction?" prompt
- [x] F7: Ensure `onSaveAttendance` never blocks on WhatsApp errors (try/catch wrapper)
- [x] F8: Quality gate: offline queue → online send → no duplicates with two tabs

## Phase G — WhatsApp Center

- [x] G1: Create `src/components/MessagesView.tsx` with Outbox/History tab
- [x] G2: Add Inbox tab (grouped by student/number, unread state, student context card, quick-reply, 24 h window guard)
- [x] G3: Add Templates tab (registry list, approval status, rendered preview, copy text)
- [x] G4: Add Stats tab (rates, volume per day/type/class, failure reasons, daily-cap gauge)
- [x] G5: Add Quick Composer tab (type picker, recipient picker, variable fill, preview, confirm, send)
- [x] G6: Add "Messages" sidebar item with unread badge to `Sidebar.tsx`
- [x] G7: Wire WhatsApp failures + new replies into sidebar bell indicator
- [x] G8: Add MessagesView case to `App.tsx` router
- [x] G9: Quality gate: simulated mock reply appears in Inbox; quick reply sends

## Phase H — Cross-module Integration

- [x] H1: Add channel selector (Email / WhatsApp / Both) to `AnnouncementsView.tsx`; update Announcement type with `channels, whatsappQueued, whatsappSent, whatsappFailed`
- [x] H2: Build `HomeworkView.tsx` (CRUD, class/subject filters, undo, publish → notify)
- [x] H3: Build `ResultsView.tsx` (CRUD, filters, undo, publish → notify)
- [x] H4: Add Homework and Results to `Sidebar.tsx` and `App.tsx` router
- [x] H5: Wire WhatsApp channel into homework notify flow (notificationDispatcher)
- [x] H6: Wire WhatsApp channel into results notify flow (notificationDispatcher)
- [x] H7: Add low-attendance warning send to `ReportsView.tsx` (threshold filter, preview, confirm, dispatch)
- [x] H8: Add WhatsApp Dashboard widget to `DashboardView.tsx` (today: sent, delivered%, failed, pending, unread replies; hidden when disabled)
- [x] H9: Quality gate: every notification type can be sent on both channels

## Phase I — Hardening & Tests

- [x] I1: Set up vitest in frontend (jsdom, @testing-library/react, fake-indexeddb)
- [x] I2: Write payload builder tests (all 9 types, param count, sanitisation, truncation)
- [x] I3: Write phone util tests (shared vectors with server, E.164, display format)
- [x] I4: Write outbox state machine tests (enqueue, dedupe, retry, back-off, max attempts)
- [x] I5: Write notificationDispatcher recipient-rules tests (no_number, invalid, no_opt_in, opted_out, duplicate)
- [x] I6: Write DB migration test with fake-indexeddb (v3 → v4, data survival, v3 backup restore)
- [x] I7: Accessibility pass: ARIA labels, keyboard nav, colour contrast on all new components
- [x] I8: Responsive + dark-mode pass on all new components (mobile → md:)
- [x] I9: Empty/error/offline states on all new components
- [x] I10: Performance check: 1,000 students + 5,000 outbox rows — no UI jank
- [x] I11: Security review: no secrets in bundle/logs/exports/localStorage (beyond API key)
- [x] I12: Create `.github/workflows/ci.yml` (lint + test + build for app and server)
- [x] I13: Quality gate: all tests green, Lighthouse PWA score not regressed

## Phase J — Docs, Deployment & Handover

- [x] J1: Write `docs/WHATSAPP_TEMPLATES.md` (9 templates with body, variables, sample values, Meta submission notes)
- [x] J2: Write `docs/WHATSAPP_SETUP.md` (Meta steps, token, webhook registration, ngrok for local dev)
- [x] J3: Write `docs/DEPLOYMENT.md` (Docker + Fly.io/Render PaaS + VPS Caddy/HTTPS; SQLite volume; env checklist; DB file backup)
- [x] J4: Write `docs/WHATSAPP_TESTING.md` (mock-mode script, live-mode script, edge cases)
- [x] J5: Write `docs/GO_LIVE_CHECKLIST.md` (business verification, templates approved, consent, key rotation, monitoring, rollback)
- [x] J6: Update `README.md` (WhatsApp integration section, quick-start for gateway)
- [x] J7: Update `.env.example` (document all new server env vars)
- [x] J8: Update `PROJECT_MCP.md` (version 3.0.0, DB v4, new stores, endpoints, features, troubleshooting)
- [x] J9: Write `docs/HANDOVER.md` (what was built, how to run, known limits, next-step list for owner)
- [x] J10: Final acceptance criteria run and results recorded in `docs/HANDOVER.md`
