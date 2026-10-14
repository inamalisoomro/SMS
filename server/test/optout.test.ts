/**
 * test/optout.test.ts — Opt-out store, opt-in re-subscribe, and lifecycle.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_optout_32_chars_or_more_hereXX';
process.env.WHATSAPP_MODE = 'mock';
process.env.DB_PATH = `/tmp/sams_optout_test_${Date.now()}.db`;
process.env.DEFAULT_COUNTRY_CODE = 'PK';

beforeAll(async () => {
  const { getDb } = await import('../src/db/index.js');
  getDb(); // initialise DB
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
});

describe('Opt-out lifecycle', () => {
  it('records an opt-out', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { recordOptOut, isOptedOut } = await import('../src/whatsapp/optout.js');
    const db = getDb();
    const phone = '+923001000001';

    expect(isOptedOut(db, phone)).toBe(false);
    recordOptOut(db, phone);
    expect(isOptedOut(db, phone)).toBe(true);
  });

  it('allows opt-in after opt-out', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { recordOptOut, recordOptIn, isOptedOut } = await import('../src/whatsapp/optout.js');
    const db = getDb();
    const phone = '+923001000002';

    recordOptOut(db, phone);
    expect(isOptedOut(db, phone)).toBe(true);

    recordOptIn(db, phone);
    expect(isOptedOut(db, phone)).toBe(false);
  });

  it('can opt out again after opting in', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { recordOptOut, recordOptIn, isOptedOut } = await import('../src/whatsapp/optout.js');
    const db = getDb();
    const phone = '+923001000003';

    recordOptOut(db, phone);
    recordOptIn(db, phone);
    recordOptOut(db, phone);
    expect(isOptedOut(db, phone)).toBe(true);
  });

  it('new number is not opted out by default', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { isOptedOut } = await import('../src/whatsapp/optout.js');
    const db = getDb();
    expect(isOptedOut(db, '+923009999999')).toBe(false);
  });
});

describe('Opt-out via message route', () => {
  it('sending to opted-out number returns opted_out result', async () => {
    const { createApp } = await import('../src/app.js');
    const app = await createApp();
    const { getDb } = await import('../src/db/index.js');
    const { recordOptOut } = await import('../src/whatsapp/optout.js');
    const db = getDb();

    const optedPhone = '+923002000001';
    recordOptOut(db, optedPhone);

    const { default: supertest } = await import('supertest');
    const res = await supertest(app)
      .post('/api/whatsapp/messages')
      .set('X-Api-Key', 'test_key_optout_32_chars_or_more_hereXX')
      .send({
        messages: [{
          clientId: 'opt_test_1',
          to: optedPhone,
          template: 'attendance_alert',
          language: 'en',
          params: ['School', 'Student', 'absent', 'Math', '2026-10-11'],
          dedupeKey: `opt_dedupe_${Date.now()}`,
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.results[0].result).toBe('opted_out');
  });
});
