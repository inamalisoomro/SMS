/**
 * whatsapp/outbox.ts — Durable outbox in IndexedDB.
 * Enqueue, bulk enqueue, cancel, retry, and status transitions.
 */

import { dbInstance } from '../database';
import type {
  WhatsAppOutboxItem,
  WhatsAppOutboxStatus,
  NotificationType,
} from '../types';

// Status ordering — used to prevent backwards transitions
const STATUS_ORDER: WhatsAppOutboxStatus[] = [
  'queued',
  'sending',
  'accepted',
  'sent',
  'delivered',
  'read',
];

function isForwardTransition(
  current: WhatsAppOutboxStatus,
  next: WhatsAppOutboxStatus
): boolean {
  const currentIdx = STATUS_ORDER.indexOf(current);
  const nextIdx = STATUS_ORDER.indexOf(next);
  if (currentIdx === -1 || nextIdx === -1) return true; // terminal states always allowed
  return nextIdx > currentIdx;
}

export interface EnqueueOptions {
  clientId?: string;
  type: NotificationType;
  studentId?: string;
  recipientName: string;
  to: string; // E.164
  template: string;
  language?: string;
  params: string[];
  dedupeKey: string;
  scheduledFor?: number;
  meta?: Record<string, unknown>;
}

/**
 * Enqueue a single message. Returns null if deduplicated (already exists).
 */
export async function enqueueMessage(
  options: EnqueueOptions
): Promise<WhatsAppOutboxItem | null> {
  // Check deduplicate
  const existing = await dbInstance.getWhatsAppOutboxItemByDedupeKey(options.dedupeKey);
  if (existing) return null;

  const now = Date.now();
  const item: WhatsAppOutboxItem = {
    id: crypto.randomUUID(),
    clientId: options.clientId ?? crypto.randomUUID(),
    type: options.type,
    studentId: options.studentId,
    recipientName: options.recipientName,
    to: options.to,
    template: options.template,
    language: options.language ?? 'en',
    params: options.params,
    dedupeKey: options.dedupeKey,
    status: 'queued',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    scheduledFor: options.scheduledFor,
    meta: options.meta,
  };

  await dbInstance.saveWhatsAppOutboxItem(item);
  return item;
}

/**
 * Enqueue multiple messages. Returns counts of queued and skipped (deduplicated).
 */
export async function bulkEnqueue(
  items: EnqueueOptions[]
): Promise<{ queued: number; skipped: number }> {
  let queued = 0;
  let skipped = 0;

  for (const item of items) {
    const result = await enqueueMessage(item);
    if (result) queued++;
    else skipped++;
  }

  return { queued, skipped };
}

/**
 * Update the status of an outbox item. Respects forward-only transitions.
 */
export async function updateOutboxStatus(
  id: string,
  status: WhatsAppOutboxStatus,
  updates: Partial<Pick<WhatsAppOutboxItem, 'messageId' | 'error' | 'retryable' | 'nextAttemptAt'>> = {}
): Promise<void> {
  const all = await dbInstance.getWhatsAppOutbox();
  const item = all.find(i => i.id === id);
  if (!item) return;

  // Respect forward-only for delivery chain
  if (!isForwardTransition(item.status, status)) return;

  const updated: WhatsAppOutboxItem = {
    ...item,
    status,
    updatedAt: Date.now(),
    ...updates,
  };

  await dbInstance.saveWhatsAppOutboxItem(updated);
}

/**
 * Update outbox status by gateway messageId (waMessageId).
 */
export async function updateOutboxStatusByMessageId(
  messageId: string,
  status: WhatsAppOutboxStatus
): Promise<void> {
  const all = await dbInstance.getWhatsAppOutbox();
  const item = all.find(i => i.messageId === messageId);
  if (!item) return;
  await updateOutboxStatus(item.id, status);
}

/**
 * Cancel a queued or failed message.
 */
export async function cancelMessage(id: string): Promise<void> {
  await updateOutboxStatus(id, 'cancelled');
}

/**
 * Retry a failed message — resets to queued, increments retryCount.
 */
export async function retryMessage(id: string): Promise<void> {
  const all = await dbInstance.getWhatsAppOutbox();
  const item = all.find(i => i.id === id);
  if (!item || (item.status !== 'failed' && item.status !== 'cancelled')) return;

  const updated: WhatsAppOutboxItem = {
    ...item,
    status: 'queued',
    retryCount: item.retryCount + 1,
    error: undefined,
    nextAttemptAt: undefined,
    updatedAt: Date.now(),
  };

  await dbInstance.saveWhatsAppOutboxItem(updated);
}

/**
 * Get all outbox items that are ready to send now (queued, not scheduled for future).
 */
export async function getPendingItems(): Promise<WhatsAppOutboxItem[]> {
  const now = Date.now();
  const items = await dbInstance.getWhatsAppOutbox(['queued']);
  return items.filter(
    i => !i.scheduledFor || i.scheduledFor <= now
  );
}

/**
 * Get counts by status for dashboard/badge.
 */
export async function getOutboxCounts(): Promise<Record<WhatsAppOutboxStatus, number>> {
  const items = await dbInstance.getWhatsAppOutbox();
  const counts = {} as Record<WhatsAppOutboxStatus, number>;
  for (const item of items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  return counts;
}
