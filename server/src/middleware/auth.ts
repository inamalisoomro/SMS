/**
 * middleware/auth.ts — API key authentication with constant-time comparison.
 * Supports multiple keys for zero-downtime rotation.
 */

import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { cfg } from '../config.js';
import logger from '../logger.js';

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      // Still do a comparison to avoid timing leak on length
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Hash an API key for safe logging (never log the raw key).
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['x-api-key'] as string | undefined;
  const query = req.query['api_key'] as string | undefined;
  const provided = header ?? query ?? '';

  const validKeys: string[] = cfg.API_KEYS;
  const isValid = validKeys.some((k) => safeCompare(provided, k));

  if (!isValid) {
    logger.warn(
      { requestId: req.requestId, path: req.path },
      'API key authentication failed'
    );
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
      requestId: req.requestId,
    });
    return;
  }

  // Attach key hash for usage tracking (safe to log/store)
  (req as Request & { apiKeyHash: string }).apiKeyHash = hashApiKey(provided);
  next();
}
