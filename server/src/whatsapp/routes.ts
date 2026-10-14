/**
 * whatsapp/routes.ts — All authenticated WhatsApp API routes.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireApiKey } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import {
  insertMessage,
  getMessageByDedupeKey,
  updateMessageStatus,
  insertEvent,
  incrementUsage,
  getDailyUsage,
  getLatestInboundFromNumber,
} from '../db/repo.js';
import { cfg } from '../config.js';
import logger from '../logger.js';
import {
  TEMPLATE_REGISTRY,
  HELLO_WORLD_TEMPLATE,
  validateTemplate,
  sanitiseParams,
} from './templates.js';
import { normalisePhone, maskPhone } from '../utils/phone.js';
import { isOptedOut } from './optout.js';
import { isDailyCap, isRecipientCapped, isBatchTooLarge, todayUTC } from './limits.js';
import { isMockMode, generateMockMessageId, simulateMockDelivery, simulateMockInbound } from './mock.js';
import { sendTemplateMessage, sendTextMessage, fetchMetaTemplates, fetchPhoneNumberInfo } from './client.js';
import { createEventsRouter } from './events.js';
import type { Request, Response, NextFunction } from 'express';

// ── Request/Response types ──────────────────────────────────────────────────

const messageItemSchema = z.object({
  clientId: z.string().min(1),
  to: z.string().min(5),
  template: z.string().min(1),
  language: z.string().default('en'),
  params: z.array(z.string()).default([]),
  dedupeKey: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
});

const batchSchema = z.object({
  messages: z.array(messageItemSchema).min(1).max(200),
});

const textSchema = z.object({
  to: z.string().min(5),
  text: z.string().min(1).max(4096),
});

const testSchema = z.object({
  to: z.string().min(5),
});

const mockInboundSchema = z.object({
  from: z.string().min(5),
  text: z.string().min(1),
});

// ── Router factory ──────────────────────────────────────────────────────────

export function createWhatsAppRouter(): Router {
  const router = Router();

  // Merge events router
  router.use(createEventsRouter());

  // ── POST /messages — batch send
  router.post('/messages', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = batchSchema.safeParse(req.body);
      if (!parsed.success) throw parsed.error;

      const { messages } = parsed.data;
      const db = getDb();
      const apiKeyHash = (req as Request & { apiKeyHash: string }).apiKeyHash ?? 'unknown';
      const today = todayUTC();

      if (isBatchTooLarge(messages.length)) {
        res.status(400).json({ error: 'Batch too large', message: `Max batch size is 200, got ${messages.length}` });
        return;
      }

      const results = [];

      for (const item of messages) {
        const { clientId, to, template, language, params, dedupeKey, meta } = item;

        // 1. Deduplicate
        const existing = getMessageByDedupeKey(db, dedupeKey);
        if (existing) {
          results.push({
            clientId,
            result: 'duplicate',
            messageId: existing.wa_message_id,
          });
          continue;
        }

        // 2. Validate template
        const templateError = validateTemplate(template, params);
        if (templateError) {
          results.push({ clientId, result: 'invalid_number', error: { code: 0, message: templateError, retryable: false } });
          continue;
        }

        // 3. Validate / normalise phone
        const phoneResult = normalisePhone(to);
        if (!phoneResult.valid || !phoneResult.e164) {
          results.push({ clientId, result: 'invalid_number', error: { code: 0, message: phoneResult.error ?? 'Invalid number', retryable: false } });
          continue;
        }
        const e164 = phoneResult.e164;

        // 4. Opt-out check
        if (isOptedOut(db, e164)) {
          results.push({ clientId, result: 'opted_out' });
          continue;
        }

        // 5. Daily cap
        if (isDailyCap(db)) {
          results.push({ clientId, result: 'cap_reached', error: { code: 0, message: `Daily cap of ${cfg.DAILY_MESSAGE_CAP} reached`, retryable: false } });
          continue;
        }

        // 6. Recipient hourly cap
        if (isRecipientCapped(db, e164)) {
          results.push({ clientId, result: 'rate_limited', error: { code: 0, message: `Hourly cap for this recipient reached`, retryable: true } });
          continue;
        }

        // 7. Sanitise params
        const cleanParams = sanitiseParams(template, params);

        // 8. Insert message record
        const now = Date.now();
        const msgId = insertMessage(db, {
          client_id: clientId,
          wa_message_id: null,
          dedupe_key: dedupeKey,
          to_number: e164,
          template,
          language,
          params: JSON.stringify(cleanParams),
          status: 'accepted',
          error_code: null,
          error_message: null,
          retryable: 1,
          created_at: now,
          updated_at: now,
        });

        // 9. Send (mock or live)
        let waMessageId: string;
        if (isMockMode()) {
          waMessageId = generateMockMessageId();
          updateMessageStatus(db, msgId, { status: 'accepted', wa_message_id: waMessageId });
          simulateMockDelivery(() => getDb(), waMessageId, e164);
        } else {
          const sendResult = await sendTemplateMessage(e164, template, language, cleanParams);
          if (!sendResult.success || !sendResult.messageId) {
            updateMessageStatus(db, msgId, {
              status: 'failed',
              error_code: sendResult.error?.code ?? 0,
              error_message: sendResult.error?.message ?? 'Unknown',
              retryable: sendResult.error?.retryable ? 1 : 0,
            });
            results.push({
              clientId,
              result: 'failed',
              error: sendResult.error,
            });
            continue;
          }
          waMessageId = sendResult.messageId;
          updateMessageStatus(db, msgId, { status: 'accepted', wa_message_id: waMessageId });
        }

        // 10. Increment usage
        incrementUsage(db, today, apiKeyHash, 1);

        // 11. Emit accepted event
        insertEvent(db, {
          type: 'status',
          wa_message_id: waMessageId,
          from_number: null,
          to_number: e164,
          status: 'accepted',
          payload: JSON.stringify({ meta }),
          created_at: Date.now(),
        });

        logger.debug(
          { waMessageId, masked: maskPhone(e164), template },
          'Message accepted'
        );

        results.push({ clientId, result: 'accepted', messageId: waMessageId });
      }

      res.json({ results, requestId: req.requestId });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /text — free-form reply within 24 h window
  router.post('/text', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = textSchema.safeParse(req.body);
      if (!parsed.success) throw parsed.error;

      const { to, text } = parsed.data;
      const db = getDb();

      const phoneResult = normalisePhone(to);
      if (!phoneResult.valid || !phoneResult.e164) {
        res.status(400).json({ error: 'Invalid number', message: phoneResult.error });
        return;
      }

      const e164 = phoneResult.e164;

      // Check 24 h window
      const latest = getLatestInboundFromNumber(db, e164);
      const windowMs = 24 * 60 * 60 * 1000;
      if (!latest || Date.now() - latest.received_at > windowMs) {
        res.status(422).json({
          error: 'window_closed',
          message: 'No inbound message from this recipient in the last 24 hours',
        });
        return;
      }

      if (isMockMode()) {
        const mockId = generateMockMessageId();
        res.json({ result: 'sent', messageId: mockId, requestId: req.requestId });
        return;
      }

      const result = await sendTextMessage(e164, text);
      if (!result.success) {
        res.status(422).json({ error: 'send_failed', ...result.error, requestId: req.requestId });
        return;
      }

      res.json({ result: 'sent', messageId: result.messageId, requestId: req.requestId });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /templates — registry + Meta approval status
  router.get('/templates', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch live approval status from Meta (best-effort, empty in mock mode)
      let metaStatuses: Record<string, { status: string; category: string }> = {};
      if (!isMockMode()) {
        const metaTemplates = await fetchMetaTemplates();
        for (const t of metaTemplates) {
          const mt = t as { name: string; status: string; category: string };
          metaStatuses[mt.name] = { status: mt.status, category: mt.category };
        }
      }

      const templates = Object.values(TEMPLATE_REGISTRY).map((def) => ({
        name: def.name,
        category: def.category,
        language: def.language,
        paramCount: def.paramCount,
        paramLabels: def.paramLabels,
        body: def.body,
        approvalStatus: isMockMode()
          ? 'APPROVED'
          : (metaStatuses[def.name]?.status ?? 'UNKNOWN'),
        metaCategory: metaStatuses[def.name]?.category ?? def.category,
      }));

      res.json({ templates, requestId: req.requestId });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /diagnostics
  router.get('/diagnostics', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      const today = todayUTC();
      const dailyUsage = getDailyUsage(db, today);

      // Get webhook last-seen (most recent event)
      const lastEvent = db
        .prepare('SELECT MAX(created_at) as ts FROM events')
        .get() as { ts: number | null } | undefined;

      let phoneInfo = null;
      let tokenValid = false;
      if (!isMockMode()) {
        try {
          phoneInfo = await fetchPhoneNumberInfo();
          tokenValid = phoneInfo !== null;
        } catch {
          tokenValid = false;
        }
      } else {
        tokenValid = true; // Always valid in mock mode
        phoneInfo = {
          display_phone_number: '+1 (555) 000-0000 [MOCK]',
          verified_name: 'SAMS School [Mock]',
          quality_rating: 'GREEN',
          messaging_limit_tier: 'TIER_1K',
        };
      }

      res.json({
        mode: cfg.WHATSAPP_MODE,
        version: '1.0.0',
        apiVersion: cfg.WHATSAPP_API_VERSION,
        tokenValid,
        phoneInfo,
        webhookLastSeen: lastEvent?.ts ?? null,
        dailyUsage,
        dailyCap: cfg.DAILY_MESSAGE_CAP,
        templates: Object.keys(TEMPLATE_REGISTRY),
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /test — send Meta's hello_world template
  router.post('/test', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = testSchema.safeParse(req.body);
      if (!parsed.success) throw parsed.error;

      const { to } = parsed.data;
      const phoneResult = normalisePhone(to);
      if (!phoneResult.valid || !phoneResult.e164) {
        res.status(400).json({ error: 'Invalid number', message: phoneResult.error });
        return;
      }

      if (isMockMode()) {
        const mockId = generateMockMessageId();
        simulateMockDelivery(() => getDb(), mockId, phoneResult.e164);
        res.json({ result: 'accepted', messageId: mockId, mode: 'mock', requestId: req.requestId });
        return;
      }

      const result = await sendTemplateMessage(
        phoneResult.e164,
        HELLO_WORLD_TEMPLATE.name,
        HELLO_WORLD_TEMPLATE.language,
        []
      );

      if (!result.success) {
        res.status(422).json({ error: 'send_failed', ...result.error, requestId: req.requestId });
        return;
      }

      res.json({ result: 'accepted', messageId: result.messageId, requestId: req.requestId });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /mock/inbound — simulate parent reply (mock mode only)
  router.post('/mock/inbound', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isMockMode()) {
        res.status(404).json({ error: 'Not Found', message: 'This endpoint is only available in mock mode' });
        return;
      }

      const parsed = mockInboundSchema.safeParse(req.body);
      if (!parsed.success) throw parsed.error;

      const { from, text } = parsed.data;
      const phoneResult = normalisePhone(from);
      if (!phoneResult.valid || !phoneResult.e164) {
        res.status(400).json({ error: 'Invalid number', message: phoneResult.error });
        return;
      }

      simulateMockInbound(getDb(), phoneResult.e164, text);

      res.json({ result: 'simulated', from: phoneResult.e164, text, requestId: req.requestId });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
