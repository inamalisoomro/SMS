# WhatsApp Integration — Design

**Spec version:** 1.0  
**Date:** 2026-10-11  

---

## 1. System Architecture

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

---

## 2. Gateway Package Structure (`server/`)

```
server/
├─ package.json          — separate package, does not import frontend code
├─ tsconfig.json
├─ Dockerfile            — multi-stage, non-root, healthcheck
├─ docker-compose.yml    — SQLite volume, optional static serving
├─ .dockerignore
├─ .env.example          — all env vars documented
├─ README.md
└─ src/
   ├─ index.ts           — bootstrap, graceful shutdown (SIGTERM/SIGINT)
   ├─ app.ts             — Express app factory (testable)
   ├─ config.ts          — Zod-validated env, fail-fast on missing vars
   ├─ logger.ts          — pino + redaction (tokens, phone numbers, auth header)
   ├─ db/
   │  ├─ index.ts        — open SQLite in WAL mode
   │  ├─ migrations.ts   — numbered up-migrations, migrations table
   │  └─ repo.ts         — typed repository (messages, events, inbound, optouts, usage_daily)
   ├─ middleware/
   │  ├─ auth.ts         — API key validation, constant-time compare, multi-key support
   │  ├─ errors.ts       — centralised error handler, no stack traces to clients
   │  └─ requestId.ts    — attach X-Request-ID to every response
   ├─ whatsapp/
   │  ├─ client.ts       — fetch wrapper for Meta Graph API, retries, 15 s timeout
   │  ├─ templates.ts    — registry of all 9 templates (name, category, params, sanitiser)
   │  ├─ routes.ts       — /messages, /text, /templates, /diagnostics, /test, /health
   │  ├─ webhook.ts      — GET/POST webhook, raw body, HMAC-SHA256 verify
   │  ├─ events.ts       — cursor-based events feed
   │  ├─ optout.ts       — opt-out store, keyword detection
   │  ├─ limits.ts       — daily cap, per-recipient hourly cap, batch size guard
   │  ├─ errorMap.ts     — Meta error code → friendly message + retryable flag
   │  └─ mock.ts         — mock mode: fake IDs, timer-driven events, /mock/inbound
   └─ utils/
      ├─ phone.ts        — libphonenumber-js normalise/validate/mask
      └─ hash.ts         — HMAC-SHA256 helper (timingSafeEqual)

test/
├─ phone.test.ts
├─ webhook.test.ts
├─ messages.test.ts
├─ events.test.ts
├─ optout.test.ts
├─ mock.test.ts
└─ ...
```

---

## 3. Frontend Package Additions

```
src/
├─ whatsapp/
│  ├─ apiClient.ts         — typed fetch wrapper, gateway URL from settings
│  ├─ templates.ts         — client mirror of template registry + preview renderer
│  ├─ payloadBuilders.ts   — pure functions: params per NotificationType
│  ├─ outbox.ts            — enqueue, bulk enqueue, cancel, retry, status transitions
│  ├─ outboxProcessor.ts   — batch sender, quiet hours, back-off, navigator.locks
│  ├─ syncWorker.ts        — /events poller, status updates, inbox, opt-out apply
│  ├─ notificationDispatcher.ts — single dispatch entry point for all channels
│  ├─ phone.ts             — libphonenumber-js/min for frontend validation
│  └─ useWhatsApp.ts       — hook: outbox counts, gateway health, last sync time
│
├─ components/
│  ├─ MessagesView.tsx      — WhatsApp Center (Outbox, Inbox, Templates, Stats, Composer)
│  ├─ HomeworkView.tsx      — Homework CRUD + notify (built if missing)
│  └─ ResultsView.tsx       — Results CRUD + notify (built if missing)
```

---

## 4. IndexedDB Migration v3 → v4

### New Stores

**`whatsappOutbox`** (keyPath: `id`)  
Indexes: `status`, `createdAt`, `dedupeKey` (unique), `studentId`, `type`

**`whatsappInbox`** (keyPath: `id`)  
Indexes: `from`, `receivedAt`, `read`

**`syncState`** (keyPath: `key`)  
Used to persist the events cursor (`{key: 'eventscursor', value: number}`)

### Migration Safety
- `onupgradeneeded` checks `db.objectStoreNames.contains(...)` before creating each store
- Existing v3 stores are never touched
- Restoring a v3 backup after upgrade: missing stores treated as empty (no error)

---

## 5. Key Data Types (summary — full types in types.ts)

```typescript
// Student additions
parentWhatsApp?: string
secondaryParentWhatsApp?: string
whatsappOptIn?: boolean
whatsappOptInAt?: number
whatsappOptInSource?: 'manual' | 'csv' | 'reply' | 'form'

// AppSettings additions
whatsappEnabled: boolean
whatsappGatewayUrl: string
whatsappApiKey: string          // stored, masked in UI, excluded from exports
whatsappDefaultCountryCode: string
whatsappAutoSendAttendance: boolean
whatsappAttendanceStatuses: ('absent' | 'late' | 'leave')[]
whatsappQuietHours: { enabled: boolean; start: string; end: string }
whatsappTypeToggles: Record<NotificationType, boolean>
whatsappTemplateOverrides: Record<string, string>
whatsappBulkConfirmThreshold: number    // default 50
whatsappLowAttendanceThreshold: number  // default 75

// WhatsAppOutboxItem
id, clientId, type, studentId?, recipientName, to, template, language, params,
dedupeKey, status (queued|sending|accepted|sent|delivered|read|failed|cancelled|opted_out|invalid),
messageId?, error?, retryable?, retryCount, nextAttemptAt?, createdAt, updatedAt,
scheduledFor?, meta?

// WhatsAppInboundMessage
id, from, studentId?, text, receivedAt, read, replyWindowEndsAt

// SyncState
key, value
```

---

## 6. Notification Dispatcher Flow

```
dispatch({ type, studentIds, channels: ['email', 'whatsapp'], payload })
  ├─ email channel → notificationHelper.ts (existing, unchanged signature)
  └─ whatsapp channel
       ├─ for each studentId:
       │   ├─ resolve recipient (student.parentWhatsApp || contactNumber if setting enabled)
       │   ├─ validate phone with phone.ts
       │   ├─ check whatsappOptIn === true
       │   └─ check NOT opted out
       ├─ build params via payloadBuilders.ts
       ├─ build dedupeKey = type + studentId + date
       └─ enqueue via outbox.ts
```

---

## 7. Outbox Processor State Machine

```
queued → [processor picks up] → sending → [API accepted] → accepted
                                        → [API failed, retryable] → queued (with nextAttemptAt, retryCount++)
                                        → [API failed, not retryable] → failed
                                        → [opted out] → opted_out
                                        → [invalid number] → invalid
accepted → [sync worker: sent event] → sent → [delivered event] → delivered → [read event] → read
                                                                             → [failed event] → failed
```

---

## 8. Gateway SQLite Schema

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  wa_message_id TEXT,
  dedupe_key TEXT UNIQUE,
  to_number TEXT NOT NULL,
  template TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  params TEXT NOT NULL,       -- JSON array
  status TEXT NOT NULL,
  error_code INTEGER,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- monotonic cursor
  type TEXT NOT NULL,                    -- status|inbound|optout|optin
  wa_message_id TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT,
  payload TEXT,                          -- JSON
  created_at INTEGER NOT NULL
);

CREATE TABLE inbound (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_message_id TEXT NOT NULL UNIQUE,
  from_number TEXT NOT NULL,
  text TEXT,
  media_type TEXT,
  media_id TEXT,
  received_at INTEGER NOT NULL
);

CREATE TABLE optouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  opted_out_at INTEGER,
  opted_in_at INTEGER
);

CREATE TABLE usage_daily (
  date TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, api_key_hash)
);
```

---

## 9. Security Design

- **Token/secret**: never leaves server; never in client bundle; redacted from pino logs
- **Phone masking**: `92300****567` pattern in all server logs
- **API key auth**: constant-time `timingSafeEqual`; supports ≥2 keys for rotation
- **Webhook HMAC**: raw body, `X-Hub-Signature-256`, `timingSafeEqual`
- **CORS**: explicit allowlist from `ALLOWED_ORIGINS`
- **Helmet**: default middleware
- **Rate limits**: per-IP + per-API-key via `express-rate-limit`
- **Body limit**: 256 kb
- **Admin PIN**: PBKDF2 via WebCrypto, salted, stored hashed in localStorage — local convenience only, not real authentication
- **Export**: `whatsappApiKey` excluded by default; opt-in "include secrets" checkbox

---

## 10. Mock Mode

When `WHATSAPP_MODE=mock`:
- All validation runs identically
- Meta Graph API is never called
- `messageId` = `mock_<uuid>`
- After 1 s: emit `sent` event
- After 3 s: emit `delivered` event  
- After 7 s: emit `read` event
- `MOCK_FAILURE_RATE` (0–1) randomly marks some messages as `failed`
- `POST /api/whatsapp/mock/inbound` simulates a parent reply (dev only)
- Meta credentials are optional in `.env`
