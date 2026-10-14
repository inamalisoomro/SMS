/**
 * test/templates.test.ts — Template registry validation and sanitisation.
 */

import { describe, it, expect } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test_key_templates_32chars_or_more_here';
process.env.WHATSAPP_MODE = 'mock';

describe('validateTemplate', () => {
  it('returns null for valid template and correct param count', async () => {
    const { validateTemplate } = await import('../src/whatsapp/templates.js');
    const err = validateTemplate('attendance_alert', ['s', 'st', 'absent', 'Math', '2026-10-11']);
    expect(err).toBeNull();
  });

  it('returns error string for unknown template', async () => {
    const { validateTemplate } = await import('../src/whatsapp/templates.js');
    const err = validateTemplate('nonexistent', []);
    expect(err).toBeTruthy();
    expect(err).toMatch(/Unknown template/i);
  });

  it('returns error string for wrong param count', async () => {
    const { validateTemplate } = await import('../src/whatsapp/templates.js');
    const err = validateTemplate('attendance_alert', ['only_one']); // needs 5
    expect(err).toBeTruthy();
    expect(err).toMatch(/requires 5 parameters/i);
  });

  it('validates all 9 required templates exist', async () => {
    const { TEMPLATE_REGISTRY } = await import('../src/whatsapp/templates.js');
    const required = [
      'attendance_alert',
      'attendance_summary',
      'homework_assigned',
      'result_published',
      'announcement_notice',
      'fee_reminder',
      'event_notice',
      'certificate_issued',
      'optin_welcome',
    ];
    for (const name of required) {
      expect(TEMPLATE_REGISTRY[name]).toBeTruthy();
    }
  });
});

describe('sanitiseParam', () => {
  it('strips newlines and tabs', async () => {
    const { sanitiseParam } = await import('../src/whatsapp/templates.js');
    const result = sanitiseParam('Hello\nWorld\tTest', 100);
    expect(result).toBe('Hello World Test');
  });

  it('collapses multiple spaces', async () => {
    const { sanitiseParam } = await import('../src/whatsapp/templates.js');
    const result = sanitiseParam('Hello   World', 100);
    expect(result).toBe('Hello World');
  });

  it('trims leading/trailing whitespace', async () => {
    const { sanitiseParam } = await import('../src/whatsapp/templates.js');
    const result = sanitiseParam('  Hello World  ', 100);
    expect(result).toBe('Hello World');
  });

  it('caps to max length', async () => {
    const { sanitiseParam } = await import('../src/whatsapp/templates.js');
    const long = 'A'.repeat(200);
    const result = sanitiseParam(long, 50);
    expect(result.length).toBe(50);
  });
});

describe('sanitiseParams', () => {
  it('sanitises all params for a template', async () => {
    const { sanitiseParams } = await import('../src/whatsapp/templates.js');
    const params = ['  School  ', 'Student\nName', 'absent', 'Math   101', '2026-10-11'];
    const result = sanitiseParams('attendance_alert', params);
    expect(result[0]).toBe('School');
    expect(result[1]).toBe('Student Name');
    expect(result[3]).toBe('Math 101');
  });

  it('returns original params for unknown template (no-op)', async () => {
    const { sanitiseParams } = await import('../src/whatsapp/templates.js');
    const params = ['param1'];
    const result = sanitiseParams('unknown_template', params);
    expect(result).toEqual(params);
  });
});
