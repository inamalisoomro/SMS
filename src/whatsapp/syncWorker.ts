/**
 * whatsapp/syncWorker.ts — Pulls /events?since=cursor from the gateway,
 * applies status updates to outbox, stores inbound messages,
 * handles opt-out/opt-in, and fires toasts for important events.
 */

import { fetchEvents } from './apiClient';
import { updateOutboxStatusByMessageId } from './outbox';
import { dbInstance } from '../database';
import type { GatewayEvent, WhatsAppInboundMessage, WhatsAppOutboxStatus } from '../types';

const CURSOR_KEY = 'whatsapp_events_cursor';
const SYNC_INTERVAL_MS = 30_000;

let syncInterval: ReturnType<typeof setInterval> | null = null;
let toastCallback: ((type: 'success' | 'error' | 'info', msg: string) => void) | null = null;
let onInboxUpdate: (() => void) | null = null;

// ── Status mapping from gateway to outbox ────────────────────────────────────

const GATEWAY_TO_OUTBOX_STATUS: Record<string, WhatsAppOutboxStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};

// ── Sync one page of events ──────────────────────────────────────────────────

async function syncOnce(): Promise<void> {
  try {
    // Check WhatsApp is enabled
    const raw = localStorage.getItem('sams_settings');
    if (!raw) return;
    const s = JSON.parse(raw) as { whatsappEnabled?: boolean };
    if (!s.whatsappEnabled) return;

    const cursorRaw = await dbInstance.getSyncState(CURSOR_KEY);
    const cursor = typeof cursorRaw === 'number' ? cursorRaw : 0;

    const result = await fetchEvents(cursor, 100);
    if (!result.ok) return;

    const { events, nextCursor } = result.data;
    if (events.length === 0) return;

    for (const event of events) {
      await processEvent(event);
    }

    // Persist cursor
    await dbInstance.setSyncState(CURSOR_KEY, nextCursor);

    // If there are more events, sync again immediately
    if (result.data.hasMore) {
      await syncOnce();
    }
  } catch (err) {
    console.error('[syncWorker] Error:', err);
  }
}

async function processEvent(event: GatewayEvent): Promise<void> {
  switch (event.type) {
    case 'status': {
      if (!event.waMessageId || !event.status) break;
      const outboxStatus = GATEWAY_TO_OUTBOX_STATUS[event.status];
      if (outboxStatus) {
        await updateOutboxStatusByMessageId(event.waMessageId, outboxStatus);
        // Toast on failure
        if (outboxStatus === 'failed' && toastCallback) {
          toastCallback('error', `WhatsApp delivery failed for message ${event.waMessageId.slice(-6)}`);
        }
      }
      break;
    }

    case 'inbound': {
      if (!event.fromNumber) break;
      const payload = (event.payload ?? {}) as { text?: string; replyWindowEndsAt?: number };
      const now = Date.now();

      // Try to resolve student from phone number
      const students = await dbInstance.getStudents();
      const student = students.find(
        s => s.parentWhatsApp === event.fromNumber || s.secondaryParentWhatsApp === event.fromNumber
      );

      const inbound: WhatsAppInboundMessage = {
        id: crypto.randomUUID(),
        from: event.fromNumber,
        studentId: student?.id,
        text: payload.text ?? '',
        receivedAt: event.createdAt ?? now,
        read: false,
        replyWindowEndsAt: payload.replyWindowEndsAt ?? (now + 24 * 60 * 60 * 1000),
      };

      await dbInstance.saveWhatsAppInboundMessage(inbound);

      // Toast for new reply
      if (toastCallback) {
        const name = student?.name ?? 'a parent';
        toastCallback('info', `New WhatsApp reply from ${name}`);
      }

      if (onInboxUpdate) onInboxUpdate();
      break;
    }

    case 'optout': {
      if (!event.fromNumber) break;
      const students = await dbInstance.getStudents();
      const student = students.find(
        s => s.parentWhatsApp === event.fromNumber || s.secondaryParentWhatsApp === event.fromNumber
      );
      if (student) {
        await dbInstance.saveStudent({ ...student, whatsappOptIn: false });
        await dbInstance.addLog('WhatsApp Opt-Out', `${student.name}'s parent opted out of WhatsApp notifications`);
      }
      break;
    }

    case 'optin': {
      if (!event.fromNumber) break;
      const students = await dbInstance.getStudents();
      const student = students.find(
        s => s.parentWhatsApp === event.fromNumber || s.secondaryParentWhatsApp === event.fromNumber
      );
      if (student) {
        await dbInstance.saveStudent({
          ...student,
          whatsappOptIn: true,
          whatsappOptInAt: Date.now(),
          whatsappOptInSource: 'reply',
        });
        await dbInstance.addLog('WhatsApp Opt-In', `${student.name}'s parent re-opted in to WhatsApp notifications`);
      }
      break;
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the sync worker.
 * @param triggerToast — app-level toast function for important events
 * @param onInbox — callback when inbox has new messages
 */
export function startSyncWorker(
  triggerToast: (type: 'success' | 'error' | 'info', msg: string) => void,
  onInbox?: () => void
): void {
  if (syncInterval) return;
  toastCallback = triggerToast;
  onInboxUpdate = onInbox ?? null;

  // Run immediately
  syncOnce();

  syncInterval = setInterval(() => {
    if (!document.hidden) {
      syncOnce();
    }
  }, SYNC_INTERVAL_MS);

  window.addEventListener('online', syncOnce);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncOnce();
  });
}

export function stopSyncWorker(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener('online', syncOnce);
  toastCallback = null;
  onInboxUpdate = null;
}

/** Force an immediate sync (e.g. user clicks "Refresh"). */
export function triggerSync(): void {
  syncOnce();
}
