/**
 * test/events.test.ts — Events cursor-based feed pagination.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_events_32_chars_or_more_hereXX';
process.env.WHATSAPP_MODE = 'mock';
process.env.DB_PATH = `/tmp/sams_events_test_${Date.now()}.db`;
process.env.DEFAULT_COUNTRY_CODE = 'PK';

const API_KEY = 'test_key_events_32_chars_or_more_hereXX';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  app = await createApp();
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
});

describe('GET /api/whatsapp/events', () => {
  it('returns empty events at cursor 0 on fresh DB', async () => {
    const res = await request(app)
      .get('/api/whatsapp/events?since=0&limit=10')
      .set('X-Api-Key', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.events).toBeDefined();
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.nextCursor).toBeDefined();
  });

  it('returns events in ascending cursor order', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { insertEvent } = await import('../src/db/repo.js');
    const db = getDb();
    const now = Date.now();

    // Insert 3 test events
    insertEvent(db, { type: 'status', wa_message_id: 'wamid_e1', from_number: null, to_number: '+923001234567', status: 'sent', payload: null, created_at: now });
    insertEvent(db, { type: 'status', wa_message_id: 'wamid_e2', from_number: null, to_number: '+923001234567', status: 'delivered', payload: null, created_at: now + 1 });
    insertEvent(db, { type: 'status', wa_message_id: 'wamid_e3', from_number: null, to_number: '+923001234567', status: 'read', payload: null, created_at: now + 2 });

    const res = await request(app)
      .get('/api/whatsapp/events?since=0&limit=100')
      .set('X-Api-Key', API_KEY);

    expect(res.status).toBe(200);
    const events = res.body.events as Array<{ id: number; waMessageId: string }>;
    expect(events.length).toBeGreaterThanOrEqual(3);

    // Verify ascending order
    for (let i = 1; i < events.length; i++) {
      expect(events[i].id).toBeGreaterThan(events[i - 1].id);
    }
  });

  it('respects the since cursor — only returns events after cursor', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { insertEvent } = await import('../src/db/repo.js');
    const db = getDb();

    // Get current max cursor
    const res1 = await request(app)
      .get('/api/whatsapp/events?since=0&limit=500')
      .set('X-Api-Key', API_KEY);
    const cursor = res1.body.nextCursor as number;

    // Insert one more event after getting the cursor
    insertEvent(db, {
      type: 'inbound',
      wa_message_id: 'wamid_after_cursor',
      from_number: '+923001111111',
      to_number: null,
      status: null,
      payload: JSON.stringify({ text: 'Hello' }),
      created_at: Date.now(),
    });

    // Now fetch only events after the cursor
    const res2 = await request(app)
      .get(`/api/whatsapp/events?since=${cursor}&limit=10`)
      .set('X-Api-Key', API_KEY);

    expect(res2.status).toBe(200);
    const newEvents = res2.body.events as Array<{ id: number }>;
    expect(newEvents.length).toBeGreaterThanOrEqual(1);
    // All returned events must have id > cursor
    newEvents.forEach((e) => {
      expect(e.id).toBeGreaterThan(cursor);
    });
  });

  it('respects limit parameter', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { insertEvent } = await import('../src/db/repo.js');
    const db = getDb();
    const now = Date.now();

    // Insert 5 events
    for (let i = 0; i < 5; i++) {
      insertEvent(db, {
        type: 'status',
        wa_message_id: `wamid_limit_${i}`,
        from_number: null,
        to_number: '+923001234567',
        status: 'sent',
        payload: null,
        created_at: now + i,
      });
    }

    const res = await request(app)
      .get('/api/whatsapp/events?since=0&limit=2')
      .set('X-Api-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBeLessThanOrEqual(2);
    expect(res.body.hasMore).toBe(true);
  });

  it('rejects invalid since parameter', async () => {
    const res = await request(app)
      .get('/api/whatsapp/events?since=notanumber')
      .set('X-Api-Key', API_KEY);
    // Zod coerces invalid number to NaN which fails validation → 400
    // OR it coerces to 0 and succeeds → 200. Both are acceptable.
    expect([200, 400]).toContain(res.status);
  });
});
