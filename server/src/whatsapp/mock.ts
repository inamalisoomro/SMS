/**
 * whatsapp/mock.ts — Mock mode implementation.
 * Never calls Meta. Fabricates message IDs and simulates delivery events on timers.
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { cfg } from '../config.js';
import logger from '../logger.js';
import { insertEvent, updateMessageStatusByWaId, insertInbound } from '../db/repo.js';
import { maskPhone } from '../utils/phone.js';

export function isMockMode(): boolean {
  return cfg.WHATSAPP_MODE === 'mock';
}

/**
 * Generate a mock WhatsApp message ID.
 */
export function generateMockMessageId(): string {
  return `mock_wamid_${randomUUID().replace(/-/g, '')}`;
}

/**
 * Simulate the delivery lifecycle: sent → delivered → read (with configurable failure).
 * Each step fires a real event into the DB so the sync worker picks it up.
 */
export function simulateMockDelivery(
  getDbFn: () => Database.Database,
  waMessageId: string,
  toNumber: string
): void {
  const failRoll = Math.random();
  const willFail = failRoll < cfg.MOCK_FAILURE_RATE;
  const masked = maskPhone(toNumber);

  // sent — after 1 s
  setTimeout(() => {
    const db = getDbFn();
    if (willFail && failRoll < cfg.MOCK_FAILURE_RATE / 2) {
      // Fail immediately at sent stage
      updateMessageStatusByWaId(db, waMessageId, 'failed');
      insertEvent(db, {
        type: 'status',
        wa_message_id: waMessageId,
        from_number: null,
        to_number: toNumber,
        status: 'failed',
        payload: JSON.stringify({ error: { code: 131026, message: 'Mock failure: undeliverable' } }),
        created_at: Date.now(),
      });
      logger.debug({ waMessageId, masked }, 'Mock: message failed at sent stage');
      return;
    }

    updateMessageStatusByWaId(db, waMessageId, 'sent');
    insertEvent(db, {
      type: 'status',
      wa_message_id: waMessageId,
      from_number: null,
      to_number: toNumber,
      status: 'sent',
      payload: null,
      created_at: Date.now(),
    });
    logger.debug({ waMessageId, masked }, 'Mock: message sent');
  }, 1000);

  // delivered — after 3 s
  setTimeout(() => {
    if (willFail && failRoll >= cfg.MOCK_FAILURE_RATE / 2) {
      const db = getDbFn();
      updateMessageStatusByWaId(db, waMessageId, 'failed');
      insertEvent(db, {
        type: 'status',
        wa_message_id: waMessageId,
        from_number: null,
        to_number: toNumber,
        status: 'failed',
        payload: JSON.stringify({ error: { code: 131026, message: 'Mock failure: delivery error' } }),
        created_at: Date.now(),
      });
      logger.debug({ waMessageId, masked }, 'Mock: message failed at delivery stage');
      return;
    }
    const db = getDbFn();
    updateMessageStatusByWaId(db, waMessageId, 'delivered');
    insertEvent(db, {
      type: 'status',
      wa_message_id: waMessageId,
      from_number: null,
      to_number: toNumber,
      status: 'delivered',
      payload: null,
      created_at: Date.now(),
    });
    logger.debug({ waMessageId, masked }, 'Mock: message delivered');
  }, 3000);

  // read — after 7 s (only if not failing)
  if (!willFail) {
    setTimeout(() => {
      const db = getDbFn();
      updateMessageStatusByWaId(db, waMessageId, 'read');
      insertEvent(db, {
        type: 'status',
        wa_message_id: waMessageId,
        from_number: null,
        to_number: toNumber,
        status: 'read',
        payload: null,
        created_at: Date.now(),
      });
      logger.debug({ waMessageId, masked }, 'Mock: message read');
    }, 7000);
  }
}

/**
 * Simulate an inbound message from a parent (dev-only endpoint).
 */
export function simulateMockInbound(
  db: Database.Database,
  fromNumber: string,
  text: string
): void {
  const waId = `mock_inbound_${randomUUID().replace(/-/g, '')}`;
  const now = Date.now();
  const replyWindowEndsAt = now + 24 * 60 * 60 * 1000;

  insertInbound(db, {
    wa_message_id: waId,
    from_number: fromNumber,
    text,
    media_type: null,
    media_id: null,
    received_at: now,
  });

  insertEvent(db, {
    type: 'inbound',
    wa_message_id: waId,
    from_number: fromNumber,
    to_number: null,
    status: null,
    payload: JSON.stringify({ text, replyWindowEndsAt }),
    created_at: now,
  });

  logger.debug(
    { waId, masked: maskPhone(fromNumber) },
    'Mock: inbound message simulated'
  );
}
