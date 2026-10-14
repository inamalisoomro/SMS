/**
 * db/repo.ts — Typed repository for all database operations.
 * All queries go through this interface; never write raw SQL elsewhere.
 */

import type Database from 'better-sqlite3';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DbMessage {
  id: number;
  client_id: string;
  wa_message_id: string | null;
  dedupe_key: string | null;
  to_number: string;
  template: string;
  language: string;
  params: string; // JSON string
  status: string;
  error_code: number | null;
  error_message: string | null;
  retryable: number;
  created_at: number;
  updated_at: number;
}

export interface DbEvent {
  id: number;
  type: string;
  wa_message_id: string | null;
  from_number: string | null;
  to_number: string | null;
  status: string | null;
  payload: string | null; // JSON string
  created_at: number;
}

export interface DbInbound {
  id: number;
  wa_message_id: string;
  from_number: string;
  text: string | null;
  media_type: string | null;
  media_id: string | null;
  received_at: number;
}

export interface DbOptout {
  id: number;
  phone: string;
  opted_out_at: number | null;
  opted_in_at: number | null;
}

export interface DbUsageDaily {
  date: string;
  api_key_hash: string;
  count: number;
}

// ── Messages ──────────────────────────────────────────────────────────────

export function insertMessage(
  db: Database.Database,
  msg: Omit<DbMessage, 'id'>
): number {
  const stmt = db.prepare(`
    INSERT INTO messages
      (client_id, wa_message_id, dedupe_key, to_number, template, language, params,
       status, error_code, error_message, retryable, created_at, updated_at)
    VALUES
      (@client_id, @wa_message_id, @dedupe_key, @to_number, @template, @language, @params,
       @status, @error_code, @error_message, @retryable, @created_at, @updated_at)
  `);
  const result = stmt.run(msg);
  return result.lastInsertRowid as number;
}

export function getMessageByDedupeKey(
  db: Database.Database,
  dedupeKey: string
): DbMessage | undefined {
  return db
    .prepare('SELECT * FROM messages WHERE dedupe_key = ?')
    .get(dedupeKey) as DbMessage | undefined;
}

export function updateMessageStatus(
  db: Database.Database,
  id: number,
  updates: {
    status: string;
    wa_message_id?: string | null;
    error_code?: number | null;
    error_message?: string | null;
    retryable?: number;
  }
): void {
  db.prepare(`
    UPDATE messages
    SET status = @status,
        wa_message_id = COALESCE(@wa_message_id, wa_message_id),
        error_code = @error_code,
        error_message = @error_message,
        retryable = COALESCE(@retryable, retryable),
        updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    status: updates.status,
    wa_message_id: updates.wa_message_id ?? null,
    error_code: updates.error_code ?? null,
    error_message: updates.error_message ?? null,
    retryable: updates.retryable ?? null,
    updated_at: Date.now(),
  });
}

export function updateMessageStatusByWaId(
  db: Database.Database,
  waMessageId: string,
  status: string
): void {
  // Status ordering: queued < accepted < sent < delivered < read
  const ORDER = ['queued', 'accepted', 'sent', 'delivered', 'read'];
  const newIdx = ORDER.indexOf(status);
  if (newIdx === -1) return; // unknown status — ignore

  db.prepare(`
    UPDATE messages
    SET status = ?,
        updated_at = ?
    WHERE wa_message_id = ?
      AND CASE status
            WHEN 'queued'    THEN 0
            WHEN 'accepted'  THEN 1
            WHEN 'sent'      THEN 2
            WHEN 'delivered' THEN 3
            WHEN 'read'      THEN 4
            ELSE -1
          END < ?
  `).run(status, Date.now(), waMessageId, newIdx);
}

export function deleteOldMessages(db: Database.Database, beforeTs: number): number {
  const result = db
    .prepare('DELETE FROM messages WHERE created_at < ?')
    .run(beforeTs);
  return result.changes;
}

// ── Events ────────────────────────────────────────────────────────────────

export function insertEvent(
  db: Database.Database,
  event: Omit<DbEvent, 'id'>
): number {
  const stmt = db.prepare(`
    INSERT INTO events
      (type, wa_message_id, from_number, to_number, status, payload, created_at)
    VALUES
      (@type, @wa_message_id, @from_number, @to_number, @status, @payload, @created_at)
  `);
  const result = stmt.run(event);
  return result.lastInsertRowid as number;
}

export function getEventsSinceCursor(
  db: Database.Database,
  cursor: number,
  limit: number
): DbEvent[] {
  return db
    .prepare('SELECT * FROM events WHERE id > ? ORDER BY id ASC LIMIT ?')
    .all(cursor, limit) as DbEvent[];
}

export function deleteOldEvents(db: Database.Database, beforeTs: number): number {
  const result = db
    .prepare('DELETE FROM events WHERE created_at < ?')
    .run(beforeTs);
  return result.changes;
}

// ── Inbound ───────────────────────────────────────────────────────────────

export function insertInbound(
  db: Database.Database,
  msg: Omit<DbInbound, 'id'>
): void {
  db.prepare(`
    INSERT OR IGNORE INTO inbound
      (wa_message_id, from_number, text, media_type, media_id, received_at)
    VALUES
      (@wa_message_id, @from_number, @text, @media_type, @media_id, @received_at)
  `).run(msg);
}

export function getLatestInboundFromNumber(
  db: Database.Database,
  fromNumber: string
): DbInbound | undefined {
  return db
    .prepare(
      'SELECT * FROM inbound WHERE from_number = ? ORDER BY received_at DESC LIMIT 1'
    )
    .get(fromNumber) as DbInbound | undefined;
}

// ── Opt-outs ──────────────────────────────────────────────────────────────

export function upsertOptout(
  db: Database.Database,
  phone: string,
  optedOut: boolean
): void {
  if (optedOut) {
    db.prepare(`
      INSERT INTO optouts (phone, opted_out_at, opted_in_at)
      VALUES (?, ?, NULL)
      ON CONFLICT(phone) DO UPDATE SET opted_out_at = excluded.opted_out_at, opted_in_at = NULL
    `).run(phone, Date.now());
  } else {
    db.prepare(`
      INSERT INTO optouts (phone, opted_out_at, opted_in_at)
      VALUES (?, NULL, ?)
      ON CONFLICT(phone) DO UPDATE SET opted_in_at = excluded.opted_in_at, opted_out_at = NULL
    `).run(phone, Date.now());
  }
}

export function isOptedOut(db: Database.Database, phone: string): boolean {
  const row = db
    .prepare(
      'SELECT opted_out_at, opted_in_at FROM optouts WHERE phone = ?'
    )
    .get(phone) as DbOptout | undefined;
  if (!row) return false;
  // Opted out if opted_out_at is set and either opted_in_at is null or older
  return (
    row.opted_out_at !== null &&
    (row.opted_in_at === null || row.opted_out_at > (row.opted_in_at ?? 0))
  );
}

// ── Usage / Daily Caps ────────────────────────────────────────────────────

export function incrementUsage(
  db: Database.Database,
  date: string,
  apiKeyHash: string,
  count = 1
): void {
  db.prepare(`
    INSERT INTO usage_daily (date, api_key_hash, count)
    VALUES (?, ?, ?)
    ON CONFLICT(date, api_key_hash) DO UPDATE SET count = count + excluded.count
  `).run(date, apiKeyHash, count);
}

export function getDailyUsage(
  db: Database.Database,
  date: string
): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(count), 0) as total FROM usage_daily WHERE date = ?')
    .get(date) as { total: number } | undefined;
  return row?.total ?? 0;
}

export function getHourlyUsageForRecipient(
  db: Database.Database,
  toNumber: string,
  sinceTs: number
): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as total FROM messages
       WHERE to_number = ? AND created_at >= ? AND status NOT IN ('failed', 'cancelled', 'invalid', 'opted_out')`
    )
    .get(toNumber, sinceTs) as { total: number } | undefined;
  return row?.total ?? 0;
}

// ── Retention Purge ───────────────────────────────────────────────────────

export function purgeOldData(db: Database.Database, retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const msgDeleted = deleteOldMessages(db, cutoff);
  const evtDeleted = deleteOldEvents(db, cutoff);
  if (msgDeleted > 0 || evtDeleted > 0) {
    // Logged by caller
  }
}
