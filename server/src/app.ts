/**
 * app.ts — Express application factory.
 * Kept separate from index.ts so it can be imported in tests without starting the server.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { cfg } from './config.js';
import logger from './logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { createWhatsAppRouter } from './whatsapp/routes.js';
import { webhookRouter } from './whatsapp/webhook.js';

export async function createApp() {
  const app = express();

  // Trust proxy (for correct IP behind nginx/Caddy)
  if (cfg.TRUST_PROXY > 0) {
    app.set('trust proxy', cfg.TRUST_PROXY);
  }

  // ── Security headers
  app.use(helmet({
    contentSecurityPolicy: cfg.NODE_ENV === 'production' ? undefined : false,
  }));

  // ── CORS
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (cfg.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Api-Key', 'X-Request-ID'],
    credentials: false,
  };
  app.use(cors(corsOptions));

  // ── Global rate limiter (per IP)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too Many Requests', message: 'Rate limit exceeded, please retry later' },
    })
  );

  // ── Request ID (must be before logger so requestId is available)
  app.use(requestId);

  // ── HTTP request logging
  app.use(
    pinoHttp({
      logger,
      // Don't log health checks in production to reduce noise
      autoLogging: {
        ignore: (req) =>
          cfg.NODE_ENV === 'production' && req.url === '/health',
      },
    })
  );

  // ── Webhook route (MUST be mounted BEFORE express.json to preserve raw body)
  app.use('/api/whatsapp', webhookRouter);

  // ── JSON body parsing (256 kb limit)
  app.use(express.json({ limit: '256kb' }));

  // ── Health endpoint (no auth required)
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      version: '1.0.0',
      mode: cfg.WHATSAPP_MODE,
    });
  });

  // ── WhatsApp API routes (require API key)
  app.use('/api/whatsapp', createWhatsAppRouter());

  // ── Optional: serve built frontend (configured at startup)
  // Static serving is set up in index.ts after the app factory returns

  // ── 404 handler
  app.use(notFound);

  // ── Error handler (must be last)
  app.use(errorHandler);

  return app;
}
