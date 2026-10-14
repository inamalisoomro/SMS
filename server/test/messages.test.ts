/**
 * test/messages.test.ts — POST /api/whatsapp/messages: idempotency, caps, opt-out, validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_messages_32_chars_or_more_aa';
process.env.WHATSAPP_MODE = 'mock';
process.env.DB_PATH = `/tmp/sams_messages_test_${Date.now()}.db`;
process.env.DEFAULT_COUNTRY_CODE = 'PK';
process.env.DAILY_MESSAGE_CAP = '5';
process.env.PER_RECIPIENT_HOURLY_CAP = '3';

const API_KEY = 'test_key_messages_32_chars_or_more_aa';
const VALID_TO = '+923001234567';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  app = await createApp();
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
});

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    clientId: `client_${Math.random().toString(36).slice(2)}`,
    to: VALID_TO,
    template: 'attendance_alert',
    language: 'en',
    params: ['SAMS School', 'Ali Khan', 'absent', 'Mathematics', '2026-10-11'],
    dedupeKey: `dedupe_${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

describe('POST /api/whatsapp/messages — authentication', () => {
  it('rejects without API key', async () => {
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .send({ messages: [makeMessage()] });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/whatsapp/messages — mock mode acceptance', () => {
  it('accepts a valid message batch and returns accepted', async () => {
    const msg = makeMessage();
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [msg] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].result).toBe('accepted');
    expect(res.body.results[0].messageId).toMatch(/^mock_wamid_/);
    expect(res.body.results[0].clientId).toBe(msg.clientId);
  });
});

describe('POST /api/whatsapp/messages — idempotency', () => {
  it('returns duplicate for same dedupeKey', async () => {
    const dedupeKey = `idempotent_key_${Date.now()}`;
    const msg = makeMessage({ dedupeKey });

    // First send
    const res1 = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [msg] });
    expect(res1.body.results[0].result).toBe('accepted');
    const firstId = res1.body.results[0].messageId;

    // Second send with same dedupeKey
    const res2 = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [{ ...msg, clientId: 'different_client' }] });
    expect(res2.body.results[0].result).toBe('duplicate');
    // Original messageId must be returned
    expect(res2.body.results[0].messageId).toBe(firstId);
  });
});

describe('POST /api/whatsapp/messages — template validation', () => {
  it('rejects unknown template', async () => {
    const msg = makeMessage({ template: 'nonexistent_template' });
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [msg] });
    expect(res.status).toBe(200);
    expect(res.body.results[0].result).toBe('invalid_number'); // template error maps to invalid
    expect(res.body.results[0].error.message).toMatch(/Unknown template/i);
  });

  it('rejects wrong parameter count', async () => {
    const msg = makeMessage({ params: ['only_one_param'] }); // attendance_alert needs 5
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [msg] });
    expect(res.status).toBe(200);
    expect(res.body.results[0].result).toBe('invalid_number');
    expect(res.body.results[0].error.message).toMatch(/requires 5 parameters/i);
  });
});

describe('POST /api/whatsapp/messages — phone validation', () => {
  it('rejects invalid phone number', async () => {
    const msg = makeMessage({ to: 'not-a-phone' });
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [msg] });
    expect(res.status).toBe(200);
    expect(res.body.results[0].result).toBe('invalid_number');
  });
});

describe('POST /api/whatsapp/messages — opt-out', () => {
  it('returns opted_out for a number that has opted out', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { recordOptOut } = await import('../src/whatsapp/optout.js');
    const db = getDb();
    const optedOutNumber = '+923009999001';
    recordOptOut(db, optedOutNumber);

    const msg = makeMessage({ to: optedOutNumber });
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [msg] });
    expect(res.status).toBe(200);
    expect(res.body.results[0].result).toBe('opted_out');
  });
});

describe('POST /api/whatsapp/messages — batch size validation', () => {
  it('rejects batch larger than 200', async () => {
    const messages = Array.from({ length: 201 }, () => makeMessage());
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages });
    // Zod catches max(200) violation → 400 Validation Error
    expect(res.status).toBe(400);
  });
});

describe('POST /api/whatsapp/messages — schema validation', () => {
  it('rejects empty messages array', async () => {
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [] });
    expect(res.status).toBe(400); // ZodError → 400
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', API_KEY)
      .send({ messages: [{ to: VALID_TO }] }); // missing clientId, template, dedupeKey
    expect(res.status).toBe(400);
  });
});
