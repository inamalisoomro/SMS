/**
 * test/diagnostics.test.ts — /diagnostics and /templates endpoints in mock mode.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_diagnostics_32chars_or_more_X';
process.env.WHATSAPP_MODE = 'mock';
process.env.DB_PATH = `/tmp/sams_diagnostics_test_${Date.now()}.db`;
process.env.DEFAULT_COUNTRY_CODE = 'PK';
process.env.DAILY_MESSAGE_CAP = '500';

const API_KEY = 'test_key_diagnostics_32chars_or_more_X';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  app = await createApp();
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
});

describe('GET /api/whatsapp/diagnostics', () => {
  it('returns diagnostics with all expected fields', async () => {
    const res = await request(app)
      .get('/api/whatsapp/diagnostics')
      .set('X-Api-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('mock');
    expect(res.body.tokenValid).toBe(true);
    expect(typeof res.body.dailyUsage).toBe('number');
    expect(typeof res.body.dailyCap).toBe('number');
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates).toContain('attendance_alert');
    expect(res.body.templates).toContain('attendance_summary');
    expect(res.body.version).toBeTruthy();
    expect(res.body.apiVersion).toBe('v21.0');
  });

  it('does not expose tokens or secrets', async () => {
    const res = await request(app)
      .get('/api/whatsapp/diagnostics')
      .set('X-Api-Key', API_KEY);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('WHATSAPP_TOKEN');
    expect(bodyStr).not.toContain('APP_SECRET');
    expect(bodyStr).not.toContain('api_key');
  });

  it('returns phone info in mock mode', async () => {
    const res = await request(app)
      .get('/api/whatsapp/diagnostics')
      .set('X-Api-Key', API_KEY);

    expect(res.body.phoneInfo).toBeTruthy();
    expect(res.body.phoneInfo.verified_name).toMatch(/Mock/i);
  });

  it('requires API key', async () => {
    const res = await request(app).get('/api/whatsapp/diagnostics');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/whatsapp/templates', () => {
  it('returns all 9 templates', async () => {
    const res = await request(app)
      .get('/api/whatsapp/templates')
      .set('X-Api-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates).toHaveLength(9);
  });

  it('each template has required fields', async () => {
    const res = await request(app)
      .get('/api/whatsapp/templates')
      .set('X-Api-Key', API_KEY);

    for (const t of res.body.templates) {
      expect(t.name).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.language).toBeTruthy();
      expect(typeof t.paramCount).toBe('number');
      expect(Array.isArray(t.paramLabels)).toBe(true);
      expect(t.body).toBeTruthy();
      expect(t.approvalStatus).toBe('APPROVED'); // mock mode always APPROVED
    }
  });
});
