/**
 * whatsapp/errorMap.ts — Maps Meta WhatsApp Cloud API error codes to
 * friendly messages and a retryable flag.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */

export interface MappedError {
  code: number;
  message: string;
  retryable: boolean;
}

const ERROR_MAP: Record<number, { message: string; retryable: boolean }> = {
  // Auth / token errors
  190: { message: 'Access token expired or invalid. Please refresh the WhatsApp token in the gateway .env.', retryable: false },

  // Template errors
  132000: { message: 'Template parameter count mismatch. Check that the correct number of parameters was sent.', retryable: false },
  132001: { message: 'Template not found or not approved. Verify the template name and approval status in Meta.', retryable: false },
  132005: { message: 'Template message text too long.', retryable: false },
  132007: { message: 'Template header format mismatch.', retryable: false },
  132012: { message: 'Template button URL format is invalid.', retryable: false },
  132015: { message: 'Template is paused due to quality issues. Check the Meta Business Manager.', retryable: false },
  132016: { message: 'Template has been disabled.', retryable: false },

  // Recipient errors
  131026: { message: 'Recipient phone number is not a WhatsApp account or is undeliverable.', retryable: false },
  131030: { message: 'Recipient is not in the allowed test recipient list. Add the number in Meta Developer Console.', retryable: false },

  // 24-hour window / re-engagement
  131047: { message: 'Re-engagement message rejected: recipient has not messaged in the last 24 hours. Only template messages are allowed.', retryable: false },

  // Rate / throughput limits
  130429: { message: 'Rate limit hit on WhatsApp Cloud API. Will retry automatically.', retryable: true },
  131056: { message: 'Too many messages to the same recipient in a short period. Will retry.', retryable: true },

  // Spam / ecosystem limits
  131048: { message: 'Spam rate limit exceeded. Too many messages marked as spam by recipients.', retryable: false },
  131049: { message: 'Message failed due to ecosystem limits (e.g. trial account restrictions).', retryable: false },

  // Generic / unclassified
  1: { message: 'Unknown API error from Meta. Check the gateway logs for details.', retryable: true },
  100: { message: 'Invalid parameter in the request to Meta.', retryable: false },
  200: { message: 'Insufficient permissions on the WhatsApp token.', retryable: false },
};

const DEFAULT_ERROR = {
  message: 'Unexpected error from WhatsApp Cloud API. Check gateway logs.',
  retryable: true,
};

export function mapMetaError(code: number, rawMessage?: string): MappedError {
  const mapped = ERROR_MAP[code] ?? DEFAULT_ERROR;
  return {
    code,
    message: mapped.message + (rawMessage ? ` (Meta: ${rawMessage})` : ''),
    retryable: mapped.retryable,
  };
}
