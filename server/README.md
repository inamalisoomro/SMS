# SAMS WhatsApp Gateway

A production-ready WhatsApp Cloud API gateway for the SAMS (Student Attendance Management System) application.

## Quick Start

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start in development mode (mock — no Meta credentials needed)
npm run dev
```

The gateway starts on **port 3001** by default. Test it:
```bash
curl http://localhost:3001/health
# → {"ok":true,"version":"1.0.0","mode":"mock"}
```

## Running Both Frontend and Gateway

From the project root:
```bash
npm run dev:all
```

This starts the Vite frontend (port 3000) and the gateway (port 3001) concurrently. The Vite dev server proxies `/api/*` to the gateway automatically.

## Environment Variables

See `.env.example` for full documentation. Key variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `WHATSAPP_MODE` | ✓ | `mock` | `mock` or `live` |
| `API_KEYS` | ✓ | — | Comma-separated keys ≥32 chars |
| `WHATSAPP_TOKEN` | live only | — | Meta access token |
| `WHATSAPP_PHONE_NUMBER_ID` | live only | — | Meta phone number ID |
| `WHATSAPP_APP_SECRET` | live only | — | For webhook signature verification |
| `DB_PATH` | — | `./data/sams_whatsapp.db` | SQLite file path |

## API Endpoints

All endpoints under `/api/whatsapp/` require `X-Api-Key` header (except `/health` and `/webhook`).

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET/POST` | `/api/whatsapp/webhook` | Meta webhook handshake & events |
| `POST` | `/api/whatsapp/messages` | Batch send (≤200 messages) |
| `POST` | `/api/whatsapp/text` | Free-form reply (within 24 h window) |
| `GET` | `/api/whatsapp/events` | Cursor-based event feed |
| `GET` | `/api/whatsapp/templates` | Template registry + approval status |
| `GET` | `/api/whatsapp/diagnostics` | Health, caps, phone info |
| `POST` | `/api/whatsapp/test` | Send `hello_world` to a number |
| `POST` | `/api/whatsapp/mock/inbound` | Simulate parent reply (mock mode only) |

## Docker

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f gateway

# Stop
docker compose down
```

SQLite data is persisted in a Docker volume (`gateway-data`).

## Development vs Production

- **Mock mode**: Set `WHATSAPP_MODE=mock`. No Meta credentials needed. Simulates full message lifecycle with timers.
- **Live mode**: Set `WHATSAPP_MODE=live` and provide all `WHATSAPP_*` credentials.

## Testing

```bash
npm test
```

Tests use vitest + supertest. The Meta Graph API is never called in tests.
