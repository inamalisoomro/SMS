/**
 * index.ts — Server bootstrap with graceful shutdown.
 */

import { createApp } from './app.js';
import { cfg } from './config.js';
import logger from './logger.js';
import { getDb, closeDb } from './db/index.js';
import { purgeOldData } from './db/repo.js';
import express from 'express';

async function main() {
  // Initialise DB before starting the server
  getDb();

  const app = await createApp();

  // ── Optional: serve built frontend dist/
  if (cfg.SERVE_STATIC) {
    const path = await import('path');
    const distPath = path.resolve('../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(cfg.PORT, () => {
    logger.info(
      { port: cfg.PORT, mode: cfg.WHATSAPP_MODE, env: cfg.NODE_ENV },
      'SAMS WhatsApp Gateway started'
    );
  });

  // ── Retention purge — run once at startup then every 24 h
  function runPurge() {
    try {
      const db = getDb();
      purgeOldData(db, cfg.RETENTION_DAYS);
      logger.info({ retentionDays: cfg.RETENTION_DAYS }, 'Data retention purge complete');
    } catch (err) {
      logger.error({ err }, 'Data retention purge failed');
    }
  }
  runPurge();
  const purgeInterval = setInterval(runPurge, 24 * 60 * 60 * 1000);

  // ── Graceful shutdown
  function shutdown(signal: string) {
    logger.info({ signal }, 'Shutdown signal received, closing gracefully...');
    clearInterval(purgeInterval);

    server.close((err) => {
      if (err) {
        logger.error({ err }, 'Error closing HTTP server');
        process.exit(1);
      }
      closeDb();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 s if graceful shutdown hangs
    setTimeout(() => {
      logger.warn('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    closeDb();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    closeDb();
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
