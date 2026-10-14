/**
 * whatsapp/events.ts — Cursor-based events feed.
 */

import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import { requireApiKey } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { getEventsSinceCursor } from '../db/repo.js';

const querySchema = z.object({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export function createEventsRouter(): Router {
  const router = createRouter();

  router.get('/events', requireApiKey, (req, res, next) => {
    try {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', issues: parsed.error.issues });
        return;
      }
      const { since, limit } = parsed.data;
      const db = getDb();
      const events = getEventsSinceCursor(db, since, limit);
      res.json({
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          waMessageId: e.wa_message_id,
          fromNumber: e.from_number,
          toNumber: e.to_number,
          status: e.status,
          payload: e.payload ? JSON.parse(e.payload) : null,
          createdAt: e.created_at,
        })),
        nextCursor: events.length > 0 ? events[events.length - 1].id : since,
        hasMore: events.length === limit,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
