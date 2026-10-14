/**
 * whatsapp/optout.ts — Opt-out keyword detection and store management.
 */

import type Database from 'better-sqlite3';
import { upsertOptout, isOptedOut as dbIsOptedOut } from '../db/repo.js';

const OPT_OUT_KEYWORDS = new Set(['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT', 'OPTOUT']);
const OPT_IN_KEYWORDS = new Set(['START', 'SUBSCRIBE', 'OPTIN', 'OPT IN']);

/**
 * Normalise incoming message text for keyword matching.
 */
function normaliseText(text: string): string {
  return text.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Check if the message text is an opt-out keyword.
 */
export function isOptOutKeyword(text: string): boolean {
  const normalised = normaliseText(text);
  return OPT_OUT_KEYWORDS.has(normalised);
}

/**
 * Check if the message text is an opt-in keyword.
 */
export function isOptInKeyword(text: string): boolean {
  const normalised = normaliseText(text);
  return OPT_IN_KEYWORDS.has(normalised);
}

/**
 * Record an opt-out for a phone number.
 */
export function recordOptOut(db: Database.Database, phone: string): void {
  upsertOptout(db, phone, true);
}

/**
 * Record an opt-in for a phone number.
 */
export function recordOptIn(db: Database.Database, phone: string): void {
  upsertOptout(db, phone, false);
}

/**
 * Check whether a phone number is currently opted out.
 */
export function isOptedOut(db: Database.Database, phone: string): boolean {
  return dbIsOptedOut(db, phone);
}
