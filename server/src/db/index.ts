/**
 * db/index.ts — Opens (or creates) the SQLite database in WAL mode
 * and runs all pending migrations.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { cfg } from '../config.js';
import logger from '../logger.js';
import { runMigrations } from './migrations.js';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.resolve(cfg.DB_PATH);
  const dir = path.dirname(dbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);

  // WAL mode for concurrent reads + crash safety
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  logger.info({ dbPath }, 'SQLite database opened');

  runMigrations(_db);

  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    logger.info('SQLite database closed');
  }
}
