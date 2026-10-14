/**
 * whatsapp/client.ts — Meta WhatsApp Cloud API client.
 * Uses built-in fetch with AbortSignal.timeout and exponential back-off + jitter.
 */

import { cfg } from '../config.js';
import logger from '../logger.js';
import { mapMetaError, type MappedError } from './errorMap.js';

const BASE_URL = `https://graph.facebook.com/${cfg.WHATSAPP_API_VERSION}`;
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

export interface SendTemplateResult {
  success: boolean;
  messageId?: string;
  error?: MappedError;
}

interface MetaApiResponse {
  messages?: Array<{ id: string }>;
  error?: {
    code: number;
    message: string;
    error_data?: { messaging_product: string; details: string };
  };
}

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential back-off with jitter: base * 2^attempt + random(0, base)
 */
function backoffMs(attempt: number, baseMs = 1000): number {
  return Math.min(baseMs * Math.pow(2, attempt) + Math.random() * baseMs, 30_000);
}

/**
 * Make a raw API call to Meta.
 */
async function callMeta(
  path: string,
  body: unknown,
  attempt = 0
): Promise<MetaApiResponse> {
  const url = `${BASE_URL}/${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.WHATSAPP_TOKEN ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err: unknown) {
    // Network error or timeout — retry
    if (attempt < MAX_RETRIES - 1) {
      const delay = backoffMs(attempt);
      logger.warn({ attempt, delay }, 'Meta API network error, retrying');
      await sleep(delay);
      return callMeta(path, body, attempt + 1);
    }
    throw err;
  }

  if (response.status === 429 || response.status >= 500) {
    if (attempt < MAX_RETRIES - 1) {
      const delay = backoffMs(attempt);
      logger.warn({ status: response.status, attempt, delay }, 'Meta API rate limit / server error, retrying');
      await sleep(delay);
      return callMeta(path, body, attempt + 1);
    }
  }

  const data = (await response.json()) as MetaApiResponse;
  return data;
}

/**
 * Send a template message to a single recipient.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string,
  params: string[]
): Promise<SendTemplateResult> {
  const components =
    params.length > 0
      ? [
          {
            type: 'body',
            parameters: params.map((value) => ({ type: 'text', text: value })),
          },
        ]
      : [];

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  };

  try {
    const result = await callMeta(
      `${cfg.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      body
    );

    if (result.error) {
      const mapped = mapMetaError(result.error.code, result.error.message);
      return { success: false, error: mapped };
    }

    const messageId = result.messages?.[0]?.id;
    if (!messageId) {
      return {
        success: false,
        error: { code: 0, message: 'Meta returned no message ID', retryable: true },
      };
    }

    return { success: true, messageId };
  } catch (err: unknown) {
    logger.error({ err }, 'Meta API call failed after retries');
    return {
      success: false,
      error: { code: 0, message: 'Network error after retries', retryable: true },
    };
  }
}

/**
 * Send a free-form text reply (only valid within the 24 h conversation window).
 */
export async function sendTextMessage(
  to: string,
  text: string
): Promise<SendTemplateResult> {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  try {
    const result = await callMeta(
      `${cfg.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      body
    );

    if (result.error) {
      const mapped = mapMetaError(result.error.code, result.error.message);
      return { success: false, error: mapped };
    }

    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: { code: 0, message: 'Network error', retryable: true },
    };
  }
}

/**
 * Fetch template status from Meta Business Account.
 */
export async function fetchMetaTemplates(): Promise<unknown[]> {
  if (!cfg.WHATSAPP_BUSINESS_ACCOUNT_ID) return [];

  try {
    const url = `${BASE_URL}/${cfg.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,category,language&limit=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.WHATSAPP_TOKEN ?? ''}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { data?: unknown[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch phone number info and quality from Meta.
 */
export async function fetchPhoneNumberInfo(): Promise<unknown | null> {
  if (!cfg.WHATSAPP_PHONE_NUMBER_ID) return null;

  try {
    const url = `${BASE_URL}/${cfg.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.WHATSAPP_TOKEN ?? ''}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
