/**
 * middleware/errors.ts — Centralised error handler.
 * Never leaks stack traces to clients. Logs full details server-side.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../logger.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `No route found for ${req.method} ${req.path}`,
    requestId: req.requestId,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Request validation failed',
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
      requestId: req.requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId }, 'Application error');
    } else {
      logger.warn({ err, requestId: req.requestId }, 'Client error');
    }
    res.status(err.statusCode).json({
      error: err.code ?? 'Error',
      message: err.message,
      requestId: req.requestId,
    });
    return;
  }

  // Unknown error — never expose internals
  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    requestId: req.requestId,
  });
}
