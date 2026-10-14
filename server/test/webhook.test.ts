/**
 * test/webhook.test.ts — Webhook signature verification, opt-out, and event ordering.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createHmac } from 'crypto';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_webhook_32_chars_or_more_here';
process.env.WHATSAPP_MODE = 'live'; // webhook sig only checked in live mode
process.env.WHATSAPP_APP_SECRET = 'test_app_secret_for_webhook_hmac';
process.env.WHATSAPP_VERIFY_TOKEN = 'test_verify_token_12345';
process.env.WHATSAPP_TOKEN = 'fake_token';
process.env.WHATSAPP_PHONE_NUMBER_ID = 'fake_phone_id';
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'fake_waba_id';
process.env.DB_PATH = `/tmp/sams_webhook_test_${Date.now()}.db`;
process.env.DEFAULT_COUNTRY_CODE = 'PK';

let app: Express;

function makeSignature(body: string, secret = 'test_app_secret_for_webhook_hmac'): string {
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${sig}`;
}

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  app = await createApp();
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
});

describe('GET /api/whatsapp/webhook - verification handshake', () => {
  it('responds 200 with challenge when token matches', async () => {
    const res = await request(app).get(
      '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test_verify_token_12345&hub.challenge=CHALLENGE_CODE'
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe('CHALLENGE_CODE');
  });

  it('responds 403 when token does not match', async () => {
    const res = await request(app).get(
      '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=CHALLENGE_CODE'
    );
    expect(res.status).toBe(403);
  });
});

describe('POST /api/whatsapp/webhook - signature verification', () => {
  it('returns 200 immediately (respond before processing)', async () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const sig = makeSignature(body);
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('X-Hub-Signature-256', sig)
      .set('Content-Type', 'application/json')
      .send(body);
    expect(res.status).toBe(200);
  });

  it('returns 200 even with invalid signature (we process async and just log)', async () => {
    // The webhook MUST return 200 to Meta immediately to avoid retries
    // Signature failure is handled asynchronously (logged, not processed)
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('X-Hub-Signature-256', 'sha256=invalidsignature')
      .set('Content-Type', 'application/json')
      .send(body);
    // Webhook always returns 200 to Meta
    expect(res.status).toBe(200);
  });

  it('processes status updates without moving status backwards', async () => {
    const { getDb } = await import('../src/db/index.js');
    const { insertMessage, updateMessageStatusByWaId } = await import('../src/db/repo.js');
    const db = getDb();
    const now = Date.now();

    // Insert a message at 'delivered' status
    insertMessage(db, {
      client_id: 'test-order-client',
      wa_message_id: 'wamid_order_test_001',
      dedupe_key: 'order_test_dedupe_001',
      to_number: '+923001234567',
      template: 'attendance_alert',
      language: 'en',
      params: '[]',
      status: 'delivered',
      error_code: null,
      error_message: null,
      retryable: 1,
      created_at: now,
      updated_at: now,
    });

    // Try to move backwards to 'sent' — should NOT change status
    updateMessageStatusByWaId(db, 'wamid_order_test_001', 'sent');

    const row = db
      .prepare('SELECT status FROM messages WHERE wa_message_id = ?')
      .get('wamid_order_test_001') as { status: string } | undefined;

    // Status must remain 'delivered', not regress to 'sent'
    expect(row?.status).toBe('delivered');
  });
});

describe('Opt-out keyword detection', () => {
  it('detects STOP as opt-out', async () => {
    const { isOptOutKeyword } = await import('../src/whatsapp/optout.js');
    expect(isOptOutKeyword('STOP')).toBe(true);
    expect(isOptOutKeyword('stop')).toBe(true);
    expect(isOptOutKeyword('  Stop  ')).toBe(true);
    expect(isOptOutKeyword('UNSUBSCRIBE')).toBe(true);
    expect(isOptOutKeyword('CANCEL')).toBe(true);
    expect(isOptOutKeyword('OPT OUT')).toBe(true);
  });

  it('detects START as opt-in', async () => {
    const { isOptInKeyword } = await import('../src/whatsapp/optout.js');
    expect(isOptInKeyword('START')).toBe(true);
    expect(isOptInKeyword('SUBSCRIBE')).toBe(true);
    expect(isOptInKeyword('start')).toBe(true);
  });

  it('does not flag normal messages as opt-out', async () => {
    const { isOptOutKeyword } = await import('../src/whatsapp/optout.js');
    expect(isOptOutKeyword('Hello, is the school open tomorrow?')).toBe(false);
    expect(isOptOutKeyword('Thank you for the notice')).toBe(false);
  });
});
