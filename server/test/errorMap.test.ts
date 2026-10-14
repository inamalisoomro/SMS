/**
 * test/errorMap.test.ts — Meta error code mapping.
 */

import { describe, it, expect } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_errormap_32_chars_or_more_hereX';
process.env.WHATSAPP_MODE = 'mock';

describe('mapMetaError', () => {
  it('maps token expiry (190) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(190);
    expect(result.retryable).toBe(false);
    expect(result.message).toMatch(/token/i);
    expect(result.code).toBe(190);
  });

  it('maps template not found (132001) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(132001);
    expect(result.retryable).toBe(false);
    expect(result.message).toMatch(/template/i);
  });

  it('maps parameter mismatch (132000) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(132000);
    expect(result.retryable).toBe(false);
    expect(result.message).toMatch(/parameter/i);
  });

  it('maps undeliverable (131026) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(131026);
    expect(result.retryable).toBe(false);
    expect(result.message).toMatch(/WhatsApp/i);
  });

  it('maps test recipient restriction (131030) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(131030);
    expect(result.retryable).toBe(false);
    expect(result.message).toMatch(/test/i);
  });

  it('maps 24 h window (131047) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(131047);
    expect(result.retryable).toBe(false);
    expect(result.message).toMatch(/24/);
  });

  it('maps throughput limit (130429) to retryable:true', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(130429);
    expect(result.retryable).toBe(true);
  });

  it('maps pair rate limit (131056) to retryable:true', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(131056);
    expect(result.retryable).toBe(true);
  });

  it('maps spam limit (131048) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(131048);
    expect(result.retryable).toBe(false);
  });

  it('maps ecosystem limit (131049) to retryable:false', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(131049);
    expect(result.retryable).toBe(false);
  });

  it('uses default for unknown error codes (retryable:true)', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(999999);
    expect(result.retryable).toBe(true);
    expect(result.code).toBe(999999);
  });

  it('includes raw Meta message when provided', async () => {
    const { mapMetaError } = await import('../src/whatsapp/errorMap.js');
    const result = mapMetaError(190, 'Invalid OAuth access token.');
    expect(result.message).toContain('Invalid OAuth access token.');
  });
});
