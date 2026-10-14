/**
 * whatsapp/phone.ts — Phone number validation and normalisation for the frontend.
 * Uses the /min build of libphonenumber-js for smaller bundle size.
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js/min';
import type { CountryCode } from 'libphonenumber-js/min';

export interface PhoneValidationResult {
  valid: boolean;
  e164?: string;
  display?: string;
  error?: string;
}

const DEFAULT_COUNTRY: CountryCode = 'PK';

/**
 * Validate and normalise a phone number to E.164.
 * Uses PK as the default country code when none is provided.
 */
export function validateAndNormalisePhone(
  raw: string,
  countryCode?: string
): PhoneValidationResult {
  if (!raw?.trim()) {
    return { valid: false, error: 'Phone number is required' };
  }

  const country = (countryCode || DEFAULT_COUNTRY) as CountryCode;

  try {
    if (!isValidPhoneNumber(raw.trim(), country)) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    const parsed = parsePhoneNumber(raw.trim(), country);
    if (!parsed?.isValid()) {
      return { valid: false, error: 'Phone number is not valid' };
    }

    return {
      valid: true,
      e164: parsed.format('E.164'),
      display: parsed.formatInternational(),
    };
  } catch {
    return { valid: false, error: 'Could not parse phone number' };
  }
}

/**
 * Quick validity check without normalisation.
 */
export function isPhoneValid(raw: string, countryCode?: string): boolean {
  if (!raw?.trim()) return false;
  try {
    return isValidPhoneNumber(raw.trim(), (countryCode || DEFAULT_COUNTRY) as CountryCode);
  } catch {
    return false;
  }
}

/**
 * Format a phone number for display. Returns the original string on failure.
 */
export function formatPhoneForDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumber(e164);
    return parsed?.formatInternational() ?? e164;
  } catch {
    return e164;
  }
}
