/**
 * whatsapp/templates.ts — Client-side mirror of the template registry.
 * Provides param builders, labels, and a preview renderer.
 */

import type { NotificationType } from '../types';

export interface ClientTemplateDefinition {
  name: string;
  notificationType: NotificationType;
  category: string;
  language: string;
  paramCount: number;
  paramLabels: string[];
  body: string;
}

export const CLIENT_TEMPLATES: Record<string, ClientTemplateDefinition> = {
  attendance_alert: {
    name: 'attendance_alert',
    notificationType: 'attendance_alert',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['School Name', 'Student Name', 'Status', 'Subject', 'Date'],
    body: 'Attendance Alert from {{1}}: Your child {{2}} was marked {{3}} in {{4}} on {{5}}. Please contact the school if this is incorrect.',
  },
  attendance_summary: {
    name: 'attendance_summary',
    notificationType: 'attendance_alert',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['School Name', 'Student Name', 'Percentage', 'From Date', 'To Date'],
    body: 'Attendance Summary from {{1}}: {{2}} has {{3}} attendance from {{4}} to {{5}}. Please ensure regular attendance.',
  },
  homework_assigned: {
    name: 'homework_assigned',
    notificationType: 'homework',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['School Name', 'Student Name', 'Homework Title', 'Subject', 'Due Date'],
    body: 'Homework Notice from {{1}}: {{2}} has new homework titled {{3}} in {{4}}, due on {{5}}. Please help your child complete it on time.',
  },
  result_published: {
    name: 'result_published',
    notificationType: 'result',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['School Name', 'Student Name', 'Marks', 'Subject', 'Exam Name'],
    body: 'Result Notice from {{1}}: {{2}} scored {{3}} in {{4}} for the {{5}} exam. Please contact the school for details.',
  },
  announcement_notice: {
    name: 'announcement_notice',
    notificationType: 'announcement',
    category: 'UTILITY',
    language: 'en',
    paramCount: 3,
    paramLabels: ['School Name', 'Type', 'Message (≤300 chars)'],
    body: 'School Notice from {{1}} ({{2}}): {{3}} Please contact the school office for any questions.',
  },
  fee_reminder: {
    name: 'fee_reminder',
    notificationType: 'fee_reminder',
    category: 'UTILITY',
    language: 'en',
    paramCount: 4,
    paramLabels: ['School Name', 'Amount', 'Student Name', 'Due Date'],
    body: 'Fee Reminder from {{1}}: The fee of {{2}} for {{3}} is due on {{4}}. Please pay before the due date or contact the school office.',
  },
  event_notice: {
    name: 'event_notice',
    notificationType: 'event',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['School Name', 'Event Name', 'Date', 'Venue', 'Student Name'],
    body: 'Event Notice from {{1}}: {{2}} will be held on {{3}} at {{4}}. Parents of {{5}} are invited to attend.',
  },
  certificate_issued: {
    name: 'certificate_issued',
    notificationType: 'certificate',
    category: 'UTILITY',
    language: 'en',
    paramCount: 3,
    paramLabels: ['School Name', 'Certificate Type', 'Student Name'],
    body: 'Certificate Notice from {{1}}: A {{2}} certificate has been issued to {{3}}. Please collect it from the school office.',
  },
  optin_welcome: {
    name: 'optin_welcome',
    notificationType: 'general',
    category: 'UTILITY',
    language: 'en',
    paramCount: 2,
    paramLabels: ['School Name', 'Student Name'],
    body: 'Welcome from {{1}}: You will now receive school updates about {{2}} on WhatsApp. Reply STOP at any time to opt out.',
  },
};

/**
 * Render a template preview by replacing {{n}} with sample values.
 */
export function renderTemplatePreview(
  templateName: string,
  params: string[]
): string {
  const def = CLIENT_TEMPLATES[templateName];
  if (!def) return `[Template '${templateName}' not found]`;

  let body = def.body;
  params.forEach((param, index) => {
    body = body.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param || `{{${index + 1}}}`);
  });
  return body;
}

/**
 * Get the template name for a given notification type.
 * Returns the primary template name for that type.
 */
export function getTemplateForType(type: NotificationType): string {
  const typeMap: Partial<Record<NotificationType, string>> = {
    attendance_alert: 'attendance_alert',
    homework: 'homework_assigned',
    result: 'result_published',
    announcement: 'announcement_notice',
    fee_reminder: 'fee_reminder',
    event: 'event_notice',
    certificate: 'certificate_issued',
    general: 'optin_welcome',
  };
  return typeMap[type] ?? 'attendance_alert';
}

/** Sample values for template preview */
export const SAMPLE_PARAMS: Record<string, string[]> = {
  attendance_alert: ['SAMS Academy', 'Ali Khan', 'absent', 'Mathematics', '11 Oct 2026'],
  attendance_summary: ['SAMS Academy', 'Ali Khan', '78%', '1 Oct 2026', '11 Oct 2026'],
  homework_assigned: ['SAMS Academy', 'Sara Ahmed', 'Chapter 5 Review', 'Physics', '15 Oct 2026'],
  result_published: ['SAMS Academy', 'Ali Khan', '87/100', 'Mathematics', 'Mid-Term 2026'],
  announcement_notice: ['SAMS Academy', 'URGENT', 'School will be closed tomorrow due to a public holiday.'],
  fee_reminder: ['SAMS Academy', 'PKR 12,000', 'Ali Khan', '31 Oct 2026'],
  event_notice: ['SAMS Academy', 'Annual Sports Day', '20 Oct 2026', 'Main Ground', 'Ali Khan'],
  certificate_issued: ['SAMS Academy', 'Academic Excellence', 'Ali Khan'],
  optin_welcome: ['SAMS Academy', 'Ali Khan'],
};
