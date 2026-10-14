/**
 * utils/phone.ts — Phone number normalisation, validation, and masking.
 * Uses libphonenumber-js for robust E.164 parsing.
 */

import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { cfg } from '../config.js';
import { maskPhone } from '../logger.js';

export interface PhoneResult {
  valid: boolean;
  e164?: string;       // "+923001234567" — for API calls
  display?: string;    // "+92 300 1234567" — for UI
  masked?: string;     // "92300****67" — for logs
  error?: string;
}

/**
 * Normalise a phone number string to E.164 format.
 * Uses DEFAULT_COUNTRY_CODE as fallback when no country prefix is present.
 */
export function normalisePhone(raw: string): PhoneResult {
  if (!raw || !raw.trim()) {
    return { valid: false, error: 'Phone number is empty' };
  }

  const cleaned = raw.trim();
  const defaultCountry = cfg.DEFAULT_COUNTRY_CODE as CountryCode;

  try {
    // Try with the default country code as context
    if (!isValidPhoneNumber(cleaned, defaultCountry)) {
      return { valid: false, error: `Invalid phone number: ${maskPhone(cleaned)}` };
    }

    const parsed = parsePhoneNumber(cleaned, defaultCountry);
    if (!parsed.isValid()) {
      return { valid: false, error: `Phone number failed validation: ${maskPhone(cleaned)}` };
    }

    const e164 = parsed.format('E.164');
    const display = parsed.formatInternational();

    return {
      valid: true,
      e164,
      display,
      masked: maskPhone(e164),
    };
  } catch {
    return { valid: false, error: `Could not parse phone number: ${maskPhone(cleaned)}` };
  }
}

/**
 * Validate without normalising — fast check for existence tests.
 */
export function isValidPhone(raw: string): boolean {
  if (!raw?.trim()) return false;
  try {
    return isValidPhoneNumber(raw.trim(), cfg.DEFAULT_COUNTRY_CODE as CountryCode);
  } catch {
    return false;
  }
}

export { maskPhone };
