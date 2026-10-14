/**
 * utils/hash.ts — HMAC-SHA256 helper with constant-time comparison.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Compute HMAC-SHA256 of a payload using the given secret.
 * Returns the hex digest.
 */
export function hmacSha256(secret: string, payload: Buffer | string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature in constant time.
 * @param secret   The HMAC secret
 * @param payload  The raw body buffer
 * @param provided The signature string to verify against (may be prefixed with "sha256=")
 */
export function verifyHmac(
  secret: string,
  payload: Buffer | string,
  provided: string
): boolean {
  const stripped = provided.startsWith('sha256=') ? provided.slice(7) : provided;
  const expected = hmacSha256(secret, payload);

  try {
    const bufExpected = Buffer.from(expected, 'hex');
    const bufProvided = Buffer.from(stripped, 'hex');
    if (bufExpected.length !== bufProvided.length) {
      // Length difference — constant-time compare won't work, do it anyway and return false
      timingSafeEqual(bufExpected, bufExpected);
      return false;
    }
    return timingSafeEqual(bufExpected, bufProvided);
  } catch {
    return false;
  }
}
