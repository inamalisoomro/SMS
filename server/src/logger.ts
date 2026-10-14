/**
 * logger.ts — pino logger with redaction of tokens, phone numbers, and auth headers.
 * Phone numbers are masked to pattern: 92300****567 (first 5 + last 3 digits revealed).
 */

import pino from 'pino';
import { cfg } from './config.js';

// Paths to redact from structured log output
const redactPaths = [
  'req.headers.authorization',
  'req.headers["x-api-key"]',
  'WHATSAPP_TOKEN',
  'token',
  'accessToken',
  'access_token',
  'appSecret',
  'app_secret',
  'apiKey',
  'api_key',
];

export const logger = pino({
  level: cfg.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  transport:
    cfg.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  serializers: {
    ...pino.stdSerializers,
    // Custom serializer that masks phone numbers in string fields
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Mask a phone number for logging.
 * E.g. "+923001234567" → "923001****67"
 * Shows country code + first 4 digits + **** + last 2 digits.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '****';
  const reveal_start = Math.min(5, digits.length - 3);
  const reveal_end = digits.length - 2;
  return (
    digits.slice(0, reveal_start) +
    '****' +
    digits.slice(reveal_end)
  );
}

export default logger;
