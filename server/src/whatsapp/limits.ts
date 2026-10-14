/**
 * whatsapp/limits.ts — Enforcement of daily cap, per-recipient hourly cap, batch size.
 */

import type Database from 'better-sqlite3';
import { cfg } from '../config.js';
import { getDailyUsage, getHourlyUsageForRecipient } from '../db/repo.js';

export const MAX_BATCH_SIZE = 200;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Today's date in YYYY-MM-DD format (UTC).
 */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if the daily cap has been reached.
 */
export function isDailyCap(db: Database.Database): boolean {
  const count = getDailyUsage(db, todayUTC());
  return count >= cfg.DAILY_MESSAGE_CAP;
}

/**
 * Check if a specific recipient has hit the hourly cap.
 */
export function isRecipientCapped(
  db: Database.Database,
  toNumber: string
): boolean {
  const since = Date.now() - ONE_HOUR_MS;
  const count = getHourlyUsageForRecipient(db, toNumber, since);
  return count >= cfg.PER_RECIPIENT_HOURLY_CAP;
}

/**
 * Validate batch size.
 */
export function isBatchTooLarge(count: number): boolean {
  return count > MAX_BATCH_SIZE;
}
