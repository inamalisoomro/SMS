/**
 * test/health.test.ts — Basic smoke tests for the gateway server.
 * These run without any .env by using test defaults.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Set test environment before importing config
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.API_KEYS = 'test_key_phase_b_32_chars_or_more_here';
process.env.WHATSAPP_MODE = 'mock';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.DB_PATH = `/tmp/sams_test_${Date.now()}.db`;

let app: Express;

beforeAll(async () => {
  // Dynamic import so env vars are set first
  const { createApp } = await import('../src/app.js');
  app = await createApp();
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/index.js');
  closeDb();
});

describe('GET /health', () => {
  it('returns 200 with ok:true and mode:mock', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mode).toBe('mock');
    expect(res.body.version).toBeTruthy();
  });

  it('does not expose any secret data', async () => {
    const res = await request(app).get('/health');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('token');
    expect(body).not.toContain('secret');
    expect(body).not.toContain('key');
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});

describe('API key auth', () => {
  it('rejects requests without API key', async () => {
    const res = await request(app).get('/api/whatsapp/events');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('accepts requests with valid API key', async () => {
    const res = await request(app)
      .get('/api/whatsapp/events?since=0&limit=10')
      .set('X-Api-Key', 'test_key_phase_b_32_chars_or_more_here');
    expect(res.status).toBe(200);
    expect(res.body.events).toBeDefined();
  });

  it('returns X-Request-ID header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
