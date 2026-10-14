/**
 * whatsapp/outboxProcessor.ts — Processes the WhatsApp outbox.
 * Sends batches of ≤50, honours quiet hours, exponential back-off,
 * max 5 attempts for retryable errors, single-flight lock across tabs.
 */

import { sendMessages } from './apiClient';
import {
  getPendingItems,
  updateOutboxStatus,
} from './outbox';
import type { WhatsAppOutboxItem } from '../types';
import { dbInstance } from '../database';

const BATCH_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 5;
const LOCK_NAME = 'sams_whatsapp_outbox_processor';

let processorInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ── Quiet hours ──────────────────────────────────────────────────────────────

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isQuietHoursNow(): boolean {
  try {
    const raw = localStorage.getItem('sams_settings');
    if (!raw) return false;
    const s = JSON.parse(raw) as {
      whatsappQuietHours?: { enabled: boolean; start: string; end: string };
    };
    const qh = s.whatsappQuietHours;
    if (!qh?.enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMin = parseTimeToMinutes(qh.start);
    const endMin = parseTimeToMinutes(qh.end);

    if (startMin <= endMin) {
      return currentMinutes >= startMin && currentMinutes < endMin;
    }
    // Crosses midnight
    return currentMinutes >= startMin || currentMinutes < endMin;
  } catch {
    return false;
  }
}

function getQuietHoursEndTime(): number {
  try {
    const raw = localStorage.getItem('sams_settings');
    if (!raw) return Date.now();
    const s = JSON.parse(raw) as {
      whatsappQuietHours?: { enabled: boolean; start: string; end: string };
    };
    const qh = s.whatsappQuietHours;
    if (!qh?.enabled) return Date.now();

    const now = new Date();
    const [endH, endM] = qh.end.split(':').map(Number);
    const end = new Date(now);
    end.setHours(endH ?? 8, endM ?? 0, 0, 0);
    if (end <= now) end.setDate(end.getDate() + 1);
    return end.getTime();
  } catch {
    return Date.now() + 8 * 60 * 60 * 1000;
  }
}

// ── Back-off ──────────────────────────────────────────────────────────────────

function calculateBackoffMs(retryCount: number): number {
  const base = 30_000; // 30 s base
  const delay = base * Math.pow(2, retryCount) + Math.random() * base;
  return Math.min(delay, 30 * 60 * 1000); // cap at 30 min
}

// ── Process one batch ─────────────────────────────────────────────────────────

async function processBatch(items: WhatsAppOutboxItem[]): Promise<void> {
  if (items.length === 0) return;

  // Mark all as sending first (prevents double-send on slow connections)
  for (const item of items) {
    await updateOutboxStatus(item.id, 'sending');
  }

  const messages = items.map(item => ({
    clientId: item.clientId,
    to: item.to,
    template: item.template,
    language: item.language,
    params: item.params,
    dedupeKey: item.dedupeKey,
    meta: item.meta,
  }));

  const result = await sendMessages(messages);

  if (!result.ok) {
    // Gateway unreachable — requeue all
    for (const item of items) {
      await updateOutboxStatus(item.id, 'queued');
    }
    return;
  }

  for (const apiResult of result.data.results) {
    const item = items.find(i => i.clientId === apiResult.clientId);
    if (!item) continue;

    switch (apiResult.result) {
      case 'accepted':
        await updateOutboxStatus(item.id, 'accepted', { messageId: apiResult.messageId });
        await dbInstance.addLog('WhatsApp Sent', `Message accepted for ${item.recipientName} (${item.type})`);
        break;

      case 'duplicate':
        // Already sent — treat as accepted
        await updateOutboxStatus(item.id, 'accepted', { messageId: apiResult.messageId });
        break;

      case 'opted_out':
        await updateOutboxStatus(item.id, 'opted_out');
        // Update student opt-out status
        if (item.studentId) {
          const student = (await dbInstance.getStudents()).find(s => s.id === item.studentId);
          if (student) {
            await dbInstance.saveStudent({ ...student, whatsappOptIn: false });
          }
        }
        break;

      case 'invalid_number':
        await updateOutboxStatus(item.id, 'invalid', { error: apiResult.error?.message });
        break;

      case 'failed':
        if (apiResult.error?.retryable && item.retryCount < MAX_RETRY_ATTEMPTS) {
          const nextAttemptAt = Date.now() + calculateBackoffMs(item.retryCount);
          // Save retryable back to queued with nextAttemptAt
          await dbInstance.saveWhatsAppOutboxItem({
            ...item,
            status: 'queued',
            retryCount: item.retryCount + 1,
            nextAttemptAt,
            error: apiResult.error?.message,
            updatedAt: Date.now(),
          });
        } else {
          await updateOutboxStatus(item.id, 'failed', {
            error: apiResult.error?.message ?? 'Send failed',
            retryable: false,
          });
          await dbInstance.addLog('WhatsApp Failed', `Message failed for ${item.recipientName}: ${apiResult.error?.message ?? 'unknown'}`);
        }
        break;

      case 'rate_limited':
      case 'cap_reached':
        // Requeue with back-off
        await dbInstance.saveWhatsAppOutboxItem({
          ...item,
          status: 'queued',
          nextAttemptAt: Date.now() + 60_000,
          updatedAt: Date.now(),
        });
        break;

      default:
        await updateOutboxStatus(item.id, 'queued');
    }
  }
}

// ── Main processor ────────────────────────────────────────────────────────────

async function runProcessor(): Promise<void> {
  if (isRunning) return;

  // Single-flight lock across tabs using navigator.locks if available
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request(
      LOCK_NAME,
      { ifAvailable: true },
      async (lock) => {
        if (!lock) return; // Another tab has the lock
        await doProcess();
      }
    );
  } else {
    await doProcess();
  }
}

async function doProcess(): Promise<void> {
  isRunning = true;
  try {
    // Skip if quiet hours active
    if (isQuietHoursNow()) return;

    // Check WhatsApp is enabled
    const raw = localStorage.getItem('sams_settings');
    if (!raw) return;
    const s = JSON.parse(raw) as { whatsappEnabled?: boolean };
    if (!s.whatsappEnabled) return;

    const pending = await getPendingItems();
    if (pending.length === 0) return;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
    }
  } catch (err) {
    console.error('[outboxProcessor] Error:', err);
  } finally {
    isRunning = false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the outbox processor. Call once on app start.
 * Runs on: app start, online event, tab focus, 30 s interval while visible.
 */
export function startOutboxProcessor(): void {
  if (processorInterval) return; // Already started

  // Run immediately
  runProcessor();

  // 30 s interval while page is visible
  processorInterval = setInterval(() => {
    if (!document.hidden) {
      runProcessor();
    }
  }, 30_000);

  // Online event
  window.addEventListener('online', runProcessor);

  // Tab focus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      runProcessor();
    }
  });
}

/**
 * Stop the processor (clean up on unmount, though typically runs for app lifetime).
 */
export function stopOutboxProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  window.removeEventListener('online', runProcessor);
}

/**
 * Trigger an immediate processing run (e.g., after queuing new messages).
 */
export function triggerProcessing(): void {
  runProcessor();
}

/**
 * Schedule a message for after quiet hours end.
 */
export function getScheduledForTime(): number | undefined {
  if (isQuietHoursNow()) {
    return getQuietHoursEndTime();
  }
  return undefined;
}
