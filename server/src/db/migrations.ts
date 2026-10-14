/**
 * db/migrations.ts — Numbered, append-only SQL migrations.
 * Each migration runs exactly once; the migrations table tracks what has been applied.
 */

import type Database from 'better-sqlite3';
import logger from '../logger.js';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        wa_message_id TEXT,
        dedupe_key TEXT UNIQUE,
        to_number TEXT NOT NULL,
        template TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        params TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'queued',
        error_code INTEGER,
        error_message TEXT,
        retryable INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_dedupe ON messages(dedupe_key);
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_to_number ON messages(to_number);

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        wa_message_id TEXT,
        from_number TEXT,
        to_number TEXT,
        status TEXT,
        payload TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_wa_message_id ON events(wa_message_id);
      CREATE INDEX IF NOT EXISTS idx_events_from_number ON events(from_number);
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

      CREATE TABLE IF NOT EXISTS inbound (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wa_message_id TEXT NOT NULL UNIQUE,
        from_number TEXT NOT NULL,
        text TEXT,
        media_type TEXT,
        media_id TEXT,
        received_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inbound_from_number ON inbound(from_number);
      CREATE INDEX IF NOT EXISTS idx_inbound_received_at ON inbound(received_at);

      CREATE TABLE IF NOT EXISTS optouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL UNIQUE,
        opted_out_at INTEGER,
        opted_in_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_optouts_phone ON optouts(phone);

      CREATE TABLE IF NOT EXISTS usage_daily (
        date TEXT NOT NULL,
        api_key_hash TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (date, api_key_hash)
      );
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const getApplied = db.prepare(
    'SELECT id FROM schema_migrations WHERE id = ?'
  );
  const insertMigration = db.prepare(
    'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)'
  );

  for (const migration of migrations) {
    const existing = getApplied.get(migration.id);
    if (!existing) {
      logger.info({ migrationId: migration.id, name: migration.name }, 'Running migration');
      const run = db.transaction(() => {
        db.exec(migration.sql);
        insertMigration.run(migration.id, migration.name, Date.now());
      });
      run();
      logger.info({ migrationId: migration.id }, 'Migration complete');
    }
  }
}
