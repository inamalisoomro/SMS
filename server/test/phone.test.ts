/**
 * test/phone.test.ts — Phone number normalisation and masking tests.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Set env before importing config
process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_phase_c_32_chars_or_more_here';
process.env.WHATSAPP_MODE = 'mock';
process.env.DEFAULT_COUNTRY_CODE = 'PK';
process.env.DB_PATH = `/tmp/sams_phone_test_${Date.now()}.db`;

let normalisePhone: (raw: string) => import('../src/utils/phone.js').PhoneResult;
let isValidPhone: (raw: string) => boolean;
let maskPhone: (phone: string) => string;

beforeAll(async () => {
  const mod = await import('../src/utils/phone.js');
  normalisePhone = mod.normalisePhone;
  isValidPhone = mod.isValidPhone;
  maskPhone = mod.maskPhone;
});

describe('normalisePhone', () => {
  it('normalises a Pakistani number with country code', () => {
    const result = normalisePhone('+923001234567');
    expect(result.valid).toBe(true);
    expect(result.e164).toBe('+923001234567');
  });

  it('normalises a Pakistani number without country code using default', () => {
    const result = normalisePhone('03001234567');
    expect(result.valid).toBe(true);
    expect(result.e164).toBe('+923001234567');
  });

  it('rejects an empty string', () => {
    const result = normalisePhone('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a clearly invalid number', () => {
    const result = normalisePhone('abc123');
    expect(result.valid).toBe(false);
  });

  it('rejects a number that is too short', () => {
    const result = normalisePhone('+9230');
    expect(result.valid).toBe(false);
  });

  it('returns a masked form', () => {
    const result = normalisePhone('+923001234567');
    expect(result.masked).toBeTruthy();
    // Masked should not contain the full middle portion
    expect(result.masked).toContain('****');
  });

  it('returns a display format', () => {
    const result = normalisePhone('+923001234567');
    expect(result.display).toBeTruthy();
  });
});

describe('maskPhone', () => {
  it('masks the middle digits', () => {
    const masked = maskPhone('+923001234567');
    expect(masked).toContain('****');
    // Should show first 5 digits and last 2
    expect(masked.length).toBeGreaterThan(6);
  });

  it('handles short strings safely', () => {
    const masked = maskPhone('123');
    expect(masked).toBe('****');
  });
});

describe('isValidPhone', () => {
  it('returns true for valid PK numbers', () => {
    expect(isValidPhone('+923001234567')).toBe(true);
    expect(isValidPhone('03001234567')).toBe(true);
  });

  it('returns false for invalid numbers', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('notaphone')).toBe(false);
    expect(isValidPhone('12345')).toBe(false);
  });
});
