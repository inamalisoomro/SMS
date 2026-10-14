/**
 * whatsapp/webhook.ts — Meta webhook verification and event processing.
 * MUST be mounted before express.json() to preserve the raw body for HMAC verification.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { cfg } from '../config.js';
import logger from '../logger.js';
import { verifyHmac } from '../utils/hash.js';
import { getDb } from '../db/index.js';
import {
  insertEvent,
  updateMessageStatusByWaId,
  insertInbound,
} from '../db/repo.js';
import { isOptOutKeyword, isOptInKeyword, recordOptOut, recordOptIn } from './optout.js';
import { maskPhone } from '../utils/phone.js';

export const webhookRouter = Router();

// ── GET /api/whatsapp/webhook — Meta verification handshake
webhookRouter.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === cfg.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, provided: '[REDACTED]' }, 'Webhook verification failed');
    res.status(403).json({ error: 'Forbidden', message: 'Webhook verification failed' });
  }
});

// ── POST /api/whatsapp/webhook — Receive events from Meta
// Raw body middleware — must be here before express.json() on the app
webhookRouter.post(
  '/webhook',
  (req: Request, _res: Response, next) => {
    // Collect raw body
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      (req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks);
      next();
    });
    req.on('error', next);
  },
  (req: Request, res: Response) => {
    // Respond immediately (Meta expects 200 within 20 s)
    res.status(200).send('OK');

    // Process asynchronously
    setImmediate(() => {
      try {
        processWebhook(req as Request & { rawBody: Buffer });
      } catch (err) {
        logger.error({ err }, 'Error processing webhook payload');
      }
    });
  }
);

function processWebhook(req: Request & { rawBody: Buffer }): void {
  // Skip signature verification in mock mode (no app secret)
  if (cfg.WHATSAPP_MODE === 'live') {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!signature) {
      logger.warn({ requestId: req.requestId }, 'Webhook missing X-Hub-Signature-256');
      return;
    }
    if (!cfg.WHATSAPP_APP_SECRET) {
      logger.warn('WHATSAPP_APP_SECRET not set — cannot verify webhook signature');
      return;
    }
    const valid = verifyHmac(cfg.WHATSAPP_APP_SECRET, req.rawBody, signature);
    if (!valid) {
      logger.warn({ requestId: req.requestId }, 'Webhook HMAC verification failed');
      return;
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(req.rawBody.toString('utf8'));
  } catch {
    logger.warn('Webhook body is not valid JSON');
    return;
  }

  const body = payload as Record<string, unknown>;
  if (body.object !== 'whatsapp_business_account') return;

  const db = getDb();
  const entries = (body.entry as unknown[]) ?? [];

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const changes = (e.changes as unknown[]) ?? [];

    for (const change of changes) {
      const c = change as Record<string, unknown>;
      if (c.field !== 'messages') continue;

      const value = c.value as Record<string, unknown>;

      // ── Status updates
      const statuses = (value.statuses as unknown[]) ?? [];
      for (const s of statuses) {
        const status = s as Record<string, unknown>;
        const waId = status.id as string;
        const newStatus = status.status as string;

        updateMessageStatusByWaId(db, waId, newStatus);

        const eventId = insertEvent(db, {
          type: 'status',
          wa_message_id: waId,
          from_number: null,
          to_number: (status.recipient_id as string) ?? null,
          status: newStatus,
          payload: JSON.stringify({ errors: status.errors }),
          created_at: Date.now(),
        });

        logger.debug(
          { waId, newStatus, eventId },
          'Webhook: status update processed'
        );
      }

      // ── Inbound messages
      const messages = (value.messages as unknown[]) ?? [];
      for (const m of messages) {
        const msg = m as Record<string, unknown>;
        const waId = msg.id as string;
        const fromNumber = msg.from as string;
        const msgType = msg.type as string;
        const now = Date.now();
        const replyWindowEndsAt = now + 24 * 60 * 60 * 1000;

        let text: string | undefined;
        if (msgType === 'text') {
          text = (msg.text as Record<string, string>)?.body;
        }

        insertInbound(db, {
          wa_message_id: waId,
          from_number: fromNumber,
          text: text ?? null,
          media_type: msgType !== 'text' ? msgType : null,
          media_id:
            msgType !== 'text'
              ? (msg[msgType] as Record<string, string>)?.id ?? null
              : null,
          received_at: now,
        });

        // Check opt-out / opt-in keywords
        if (text) {
          if (isOptOutKeyword(text)) {
            recordOptOut(db, fromNumber);
            insertEvent(db, {
              type: 'optout',
              wa_message_id: waId,
              from_number: fromNumber,
              to_number: null,
              status: null,
              payload: JSON.stringify({ text }),
              created_at: now,
            });
            logger.info(
              { masked: maskPhone(fromNumber) },
              'Webhook: opt-out registered'
            );
          } else if (isOptInKeyword(text)) {
            recordOptIn(db, fromNumber);
            insertEvent(db, {
              type: 'optin',
              wa_message_id: waId,
              from_number: fromNumber,
              to_number: null,
              status: null,
              payload: JSON.stringify({ text }),
              created_at: now,
            });
            logger.info(
              { masked: maskPhone(fromNumber) },
              'Webhook: opt-in registered'
            );
          }
        }

        insertEvent(db, {
          type: 'inbound',
          wa_message_id: waId,
          from_number: fromNumber,
          to_number: null,
          status: null,
          payload: JSON.stringify({ text, msgType, replyWindowEndsAt }),
          created_at: now,
        });

        logger.debug(
          { waId, masked: maskPhone(fromNumber), msgType },
          'Webhook: inbound message processed'
        );
      }
    }
  }
}
