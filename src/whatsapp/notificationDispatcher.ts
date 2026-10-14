/**
 * whatsapp/notificationDispatcher.ts — Single entry point for all notification channels.
 * Routes to EmailJS (existing, unchanged) and the WhatsApp outbox.
 */

import type {
  Student,
  AppSettings,
  NotificationType,
  NotificationChannel,
  DispatchResult,
  DispatchRecipientSkip,
} from '../types';
import { validateAndNormalisePhone } from './phone';
import { enqueueMessage } from './outbox';
import { triggerProcessing, getScheduledForTime } from './outboxProcessor';

export interface DispatchTarget {
  student: Student;
  /** Override recipient name (defaults to student.fatherName || student.motherName || 'Parent') */
  recipientName?: string;
  /** Override phone to send to (defaults to student.parentWhatsApp) */
  phone?: string;
}

export interface DispatchOptions {
  type: NotificationType;
  channels: NotificationChannel[];
  targets: DispatchTarget[];
  template: string;
  params: string[];
  language?: string;
  /** Unique key seed — will be combined with studentId and type */
  dedupeKeySeed: string;
  meta?: Record<string, unknown>;
  settings: AppSettings;
}

/**
 * Dispatch notifications to one or more channels.
 * WhatsApp: validates phone, checks opt-in, enqueues, then triggers processor.
 * Email: delegates to existing notificationHelper functions (caller responsibility).
 */
export async function dispatch(options: DispatchOptions): Promise<DispatchResult> {
  const result: DispatchResult = {
    emailSent: 0,
    emailFailed: 0,
    whatsappQueued: 0,
    whatsappSkipped: [],
  };

  if (!options.channels.includes('whatsapp')) {
    return result;
  }

  // WhatsApp enabled check
  const settings = options.settings;
  if (!settings.whatsappEnabled) {
    return result;
  }

  const defaultCountryCode = settings.whatsappDefaultCountryCode ?? 'PK';
  const seen = new Set<string>(); // deduplicate by phone number

  for (const target of options.targets) {
    const { student } = target;
    const recipientName =
      target.recipientName ??
      student.fatherName ??
      student.motherName ??
      'Parent';

    // Resolve phone
    let rawPhone =
      target.phone ??
      student.parentWhatsApp ??
      (settings.whatsappFallbackToContactNumber ? student.contactNumber : undefined);

    if (!rawPhone) {
      result.whatsappSkipped.push({
        studentId: student.id,
        recipientName,
        reason: 'no_number',
      });
      continue;
    }

    // Validate phone
    const phoneResult = validateAndNormalisePhone(rawPhone, defaultCountryCode);
    if (!phoneResult.valid || !phoneResult.e164) {
      result.whatsappSkipped.push({
        studentId: student.id,
        recipientName,
        reason: 'invalid_number',
      });
      continue;
    }

    const e164 = phoneResult.e164;

    // Check opt-in
    if (!student.whatsappOptIn) {
      result.whatsappSkipped.push({
        studentId: student.id,
        recipientName,
        reason: 'no_opt_in',
      });
      continue;
    }

    // Duplicate check (same phone in this batch)
    if (seen.has(e164)) {
      result.whatsappSkipped.push({
        studentId: student.id,
        recipientName,
        reason: 'duplicate',
      });
      continue;
    }
    seen.add(e164);

    // Check type toggle
    const typeToggles = settings.whatsappTypeToggles ?? {};
    if (typeToggles[options.type] === false) {
      result.whatsappSkipped.push({
        studentId: student.id,
        recipientName,
        reason: 'no_opt_in', // closest reason — type disabled
      });
      continue;
    }

    const dedupeKey = `${options.dedupeKeySeed}_${student.id}_${options.type}`;
    const scheduledFor = getScheduledForTime();

    const queued = await enqueueMessage({
      type: options.type,
      studentId: student.id,
      recipientName,
      to: e164,
      template: options.template,
      language: options.language ?? 'en',
      params: options.params,
      dedupeKey,
      scheduledFor,
      meta: options.meta,
    });

    if (queued) {
      result.whatsappQueued++;
    }
    // If null → duplicate, count as skipped
    else {
      result.whatsappSkipped.push({
        studentId: student.id,
        recipientName,
        reason: 'duplicate',
      });
    }
  }

  // Trigger processor to send immediately (if not quiet hours)
  if (result.whatsappQueued > 0) {
    triggerProcessing();
  }

  return result;
}

/**
 * Build the skip reason summary for the notify sheet.
 */
export function summariseSkips(
  skips: DispatchRecipientSkip[]
): Record<DispatchRecipientSkip['reason'], number> {
  return skips.reduce(
    (acc, skip) => {
      acc[skip.reason] = (acc[skip.reason] ?? 0) + 1;
      return acc;
    },
    {} as Record<DispatchRecipientSkip['reason'], number>
  );
}
