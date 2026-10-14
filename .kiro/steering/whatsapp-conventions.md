---
inclusion: always
---

# WhatsApp Integration — Conventions & Constraints

This steering file summarises the non-negotiable rules from the master prompt (§1, §3, §4) that apply to every AI agent session working on this project.

---

## Execution Rules

1. **Execute all phases (A → J) continuously.** Do not pause between phases for approval. After each phase, update `docs/WHATSAPP_PROGRESS.md` and run the quality gate.
2. **No scope reduction.** Every feature ships fully working. No `TODO`, no placeholder UI, no stub functions, no fake data in production code paths.
3. **No mid-build redesigns.** The architecture in `.kiro/specs/whatsapp-integration/design.md` is final. If a genuine blocker is found, choose the closest compliant alternative, record it in `docs/ASSUMPTIONS.md`, and continue.
4. **Do not break existing features.** EmailJS flow, announcements, attendance, reports, analytics, backup/restore, undo, offline behaviour, and PWA must keep working exactly as before. WhatsApp is an additive, optional layer.
5. **Audit first.** Before writing code, read the actual codebase. Follow real conventions (naming, toast usage, modal patterns, `addLog` for audit entries). Where the master prompt and real code differ, the real code wins for conventions; the master prompt wins for requirements.
6. **Quality gate after every phase:** `npm run lint` (tsc, zero errors) and `npm run build` in both root and `server/`. Also run `npm test` once tests exist. Fix failures before continuing.

---

## Architecture Constraints

- The gateway (`server/`) is a **separate package** — the frontend NEVER imports server code.
- The gateway API is **generic** (template name + params), not attendance-specific.
- The browser keeps a durable **outbox** in IndexedDB (offline-first, durable across reloads).
- The events feed uses an **incremental cursor** (`GET /events?since=cursor`) — polling, not WebSocket.
- SQLite (`better-sqlite3`) with WAL mode and a repository interface — not in-memory.
- The gateway can serve `dist/` (SERVE_STATIC=true) or run separately — support both.

---

## Tech Constraints

### Gateway (`server/package.json`)
Allowed: `express@4`, `cors`, `helmet`, `express-rate-limit`, `zod`, `pino`, `pino-http`, `better-sqlite3`, `libphonenumber-js`, `dotenv`  
Dev: `typescript`, `tsx`, `vitest`, `supertest`, `@types/*`  
Node 20+. Use built-in `fetch` + `AbortSignal.timeout`. **Do NOT add other HTTP clients.**

### Frontend
Add ONLY: `libphonenumber-js` (use `/min` build) and dev-deps `vitest`, `@testing-library/react`, `jsdom`, `fake-indexeddb`.  
`concurrently` is acceptable as a devDependency.  
**Do NOT add chart libraries** — reuse what `AnalyticsView` already uses.

### Graph API Version
Configurable via `WHATSAPP_API_VERSION` env var. Default: `v21.0`. Record the rationale in `docs/ASSUMPTIONS.md`.

### Design System
Tailwind v4 classes, **slate** neutral / **indigo** primary / **emerald** success / **rose** error / **amber** warning.  
Dark mode via `dark:`, mobile-first (`md:`), Motion for transitions, Lucide icons.  
All new views need: loading, empty, error, offline states; keyboard accessibility; ARIA labels.

---

## Security Rules

- WhatsApp access token and app secret: **only in `server/.env`** — never in frontend bundle, localStorage, logs, or commits.
- Phone numbers in server logs: mask to `92300****567` pattern.
- API key: stored masked in UI; excluded from database exports by default (opt-in "include secrets" checkbox).
- Webhook signature: `X-Hub-Signature-256` HMAC-SHA256 with `timingSafeEqual`.
- Multiple API keys: supported for rotation, constant-time comparison.
- Admin PIN: PBKDF2/WebCrypto, salted, stored hashed — local convenience only, not real auth.

---

## Existing Code Conventions

From reading the codebase:
- **Toasts**: `triggerToast(type, message, action?)` — always use this, never raw `alert()`
- **Audit log**: `dbInstance.addLog(action, details)` — call after every significant mutation
- **Loading state**: spinner with `animate-spin` + `Loader2` icon
- **Empty state**: centered icon + text, matching existing pattern in `StudentsView`
- **Modal**: full-screen backdrop `fixed inset-0 z-50`, animated with `motion/react`
- **Table**: `divide-y divide-slate-100 dark:divide-slate-800/50` row dividers
- **Settings sections**: indigo-highlighted with icon badges, matching `SettingsView` layout
- **Form labels**: `text-[10px] font-semibold uppercase font-mono tracking-wider`
- **Primary buttons**: `bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs`
- **Danger buttons**: `bg-rose-500 hover:bg-rose-600 text-white`
- **Dev port**: 5173 for frontend (configured as 3000 in `package.json` scripts), 3001 for gateway

---

## DB Conventions

- DB name: `SAMS_DB`, version **4** (was 3)
- All stores use `keyPath: 'id'`
- New stores: `whatsappOutbox`, `whatsappInbox`, `syncState`
- Always check `db.objectStoreNames.contains(...)` before creating a store in `onupgradeneeded`
- CRUD methods follow the existing pattern: `get<Entity>()`, `save<Entity>()`, `delete<Entity>()`
- Always call `addLog()` with a meaningful action string after mutations
