/**
 * config.ts — Zod-validated environment configuration.
 * Fails fast with a descriptive error if any required variable is missing or malformed.
 */

import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';

// Load .env file (no-op in production where vars are injected)
loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  // API authentication — comma-separated keys, each ≥32 chars
  API_KEYS: z
    .string()
    .min(32, 'API_KEYS must contain at least one key with ≥32 characters')
    .transform((s) =>
      s
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length >= 32)
    )
    .refine((keys) => keys.length > 0, {
      message: 'API_KEYS must contain at least one valid key (≥32 chars)',
    }),

  // WhatsApp mode
  WHATSAPP_MODE: z.enum(['live', 'mock']).default('mock'),

  // Meta credentials — optional in mock mode
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),

  // Phone
  DEFAULT_COUNTRY_CODE: z.string().length(2).default('PK'),

  // Database
  DB_PATH: z.string().default('./data/sams_whatsapp.db'),

  // Caps
  DAILY_MESSAGE_CAP: z.coerce.number().int().min(1).default(500),
  PER_RECIPIENT_HOURLY_CAP: z.coerce.number().int().min(1).default(5),
  RETENTION_DAYS: z.coerce.number().int().min(1).default(90),

  // Static serving
  SERVE_STATIC: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),

  // Mock
  MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.05),

  // Proxy
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`[config] Environment validation failed:\n${issues}`);
    process.exit(1);
  }

  const cfg = result.data;

  // In live mode, require Meta credentials
  if (cfg.WHATSAPP_MODE === 'live') {
    const required: Array<keyof typeof cfg> = [
      'WHATSAPP_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_APP_SECRET',
      'WHATSAPP_VERIFY_TOKEN',
    ];
    const missing = required.filter((k) => !cfg[k]);
    if (missing.length > 0) {
      console.error(
        `[config] WHATSAPP_MODE=live requires: ${missing.join(', ')}`
      );
      process.exit(1);
    }
  }

  return cfg;
}

export const cfg = validateEnv();
export type Config = typeof cfg;
