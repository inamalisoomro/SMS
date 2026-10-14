# SAMS WhatsApp Integration — Assumptions & Decisions

**Last updated:** 2026-10-11  

---

## A01 — Meta Graph API Version

**Assumption:** Default `WHATSAPP_API_VERSION=v21.0`  
**Rationale:** As of October 2026, v21.0 is the latest stable Graph API version. The version is configurable via env var so the owner can update without a code change.  
**Reference:** https://developers.facebook.com/docs/whatsapp/business-management-api/changelog

---

## A02 — Frontend Dev Port

**Assumption:** Frontend dev server runs on port **3000** (as configured in `package.json`: `vite --port=3000`), not the Vite default of 5173.  
**Rationale:** `package.json` scripts explicitly set `--port=3000 --host=0.0.0.0`. The Vite proxy and CORS config use port 3000 accordingly.

---

## A03 — Gateway Port

**Assumption:** Gateway runs on port **3001** by default (`PORT=3001` in `.env.example`).  
**Rationale:** Avoids collision with the frontend dev server. The Vite proxy `/api → http://localhost:3001` is configured in `vite.config.ts`.

---

## A04 — Settings Storage

**Assumption:** `AppSettings` (including new WhatsApp fields) continue to be stored in `localStorage` under the key `sams_settings`, consistent with the existing codebase.  
**Rationale:** The existing `App.tsx` initialises settings from localStorage. Migrating to IndexedDB would require a larger refactor with no clear benefit for this use case.

---

## A05 — Phone Number Fallback

**Assumption:** If `parentWhatsApp` is empty for a student, the system does NOT automatically fall back to `contactNumber` unless the user explicitly enables "Use contact number as WhatsApp fallback" in Settings.  
**Rationale:** `contactNumber` may not be a WhatsApp number and sending to a non-WhatsApp number causes a Meta error. Opt-in fallback is safer.

---

## A06 — Template Category

**Assumption:** All 9 templates are initially submitted as category **UTILITY** (service-level messages, not marketing). If Meta reclassifies any as Marketing, the owner must update the category in the template registry (`server/src/whatsapp/templates.ts`) and re-submit.  
**Rationale:** The master prompt states "make the category configurable in the registry." Utility category is the least restrictive starting point for school communication.

---

## A07 — Backup "Include Secrets" Default

**Assumption:** The "include secrets" checkbox defaults to **unchecked**. When unchecked, `whatsappApiKey` is excluded and replaced with an empty string in the export.  
**Rationale:** Security-first default. The owner must explicitly opt in to exporting credentials.

---

## A08 — Admin PIN Scope

**Assumption:** The Admin PIN protects only the **WhatsApp settings card** and the **API key reveal** action within SettingsView. It does not protect other parts of the app.  
**Rationale:** The master prompt specifies "required to open Settings → WhatsApp and to reveal the API key." Broader protection would require a full authentication system outside this scope.

---

## A09 — No Existing server/ Prototype

**Assumption:** No `server/` folder existed before this build began. The master prompt mentions a possible prototype; none was found in the workspace during Phase A audit.  
**Rationale:** `ls` of the workspace root shows no `server/` directory.

---

## A10 — `concurrently` as devDependency

**Assumption:** `concurrently` is added as a root devDependency to implement `dev:all`. This contradicts the original note that concurrently was "deliberately removed", but the master prompt explicitly permits it as a devDependency.  
**Rationale:** Master prompt §4: "adding concurrently as a devDependency is acceptable."

---

## A11 — HomeworkView and ResultsView

**Assumption:** No `HomeworkView.tsx` or `ResultsView.tsx` exists in the current codebase. Both will be built from scratch in Phase H. The IndexedDB stores `homework` and `results` already exist (added in DB v3).  
**Rationale:** Phase A audit found no component files for homework or results views, only the DB stores and types.

---

## A12 — Lighthouse Baseline

**Assumption:** The Lighthouse baseline will be recorded at the start of Phase I after all earlier phases are complete and the app builds cleanly. A regression means any score dropping by more than 5 points from that baseline.  
**Rationale:** Running Lighthouse in Phase A before WhatsApp features are added would give an incomplete picture; the meaningful comparison is before vs after Phase I hardening.
