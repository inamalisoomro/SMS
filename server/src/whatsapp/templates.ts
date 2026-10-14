/**
 * whatsapp/templates.ts — Template registry for all WhatsApp message templates.
 * Validates template names, parameter counts, and sanitises param values.
 */

export interface TemplateDefinition {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  paramCount: number;
  paramLabels: string[];
  paramMaxLength: number[];
  body: string; // For preview/reference — actual rendering happens on Meta's side
}

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  attendance_alert: {
    name: 'attendance_alert',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['school', 'student', 'status', 'subject', 'date'],
    paramMaxLength: [100, 100, 20, 100, 20],
    body: 'Attendance Alert from {{1}}: Your child {{2}} was marked {{3}} in {{4}} on {{5}}. Please contact the school if this is incorrect.',
  },
  attendance_summary: {
    name: 'attendance_summary',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['school', 'student', 'percentage', 'from', 'to'],
    paramMaxLength: [100, 100, 10, 20, 20],
    body: 'Attendance Summary from {{1}}: {{2}} has {{3}} attendance from {{4}} to {{5}}. Please ensure regular attendance.',
  },
  homework_assigned: {
    name: 'homework_assigned',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['school', 'student', 'title', 'subject', 'dueDate'],
    paramMaxLength: [100, 100, 200, 100, 20],
    body: 'Homework Notice from {{1}}: {{2}} has new homework titled {{3}} in {{4}}, due on {{5}}. Please help your child complete it on time.',
  },
  result_published: {
    name: 'result_published',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['school', 'student', 'marks', 'subject', 'exam'],
    paramMaxLength: [100, 100, 20, 100, 100],
    body: 'Result Notice from {{1}}: {{2}} scored {{3}} in {{4}} for the {{5}} exam. Please contact the school for details.',
  },
  announcement_notice: {
    name: 'announcement_notice',
    category: 'UTILITY',
    language: 'en',
    paramCount: 3,
    paramLabels: ['school', 'type', 'message'],
    paramMaxLength: [100, 50, 300],
    body: 'School Notice from {{1}} ({{2}}): {{3}} Please contact the school office for any questions.',
  },
  fee_reminder: {
    name: 'fee_reminder',
    category: 'UTILITY',
    language: 'en',
    paramCount: 4,
    paramLabels: ['school', 'amount', 'student', 'dueDate'],
    paramMaxLength: [100, 50, 100, 20],
    body: 'Fee Reminder from {{1}}: The fee of {{2}} for {{3}} is due on {{4}}. Please pay before the due date or contact the school office.',
  },
  event_notice: {
    name: 'event_notice',
    category: 'UTILITY',
    language: 'en',
    paramCount: 5,
    paramLabels: ['school', 'event', 'date', 'venue', 'student'],
    paramMaxLength: [100, 200, 20, 200, 100],
    body: 'Event Notice from {{1}}: {{2}} will be held on {{3}} at {{4}}. Parents of {{5}} are invited to attend.',
  },
  certificate_issued: {
    name: 'certificate_issued',
    category: 'UTILITY',
    language: 'en',
    paramCount: 3,
    paramLabels: ['school', 'certificateType', 'student'],
    paramMaxLength: [100, 100, 100],
    body: 'Certificate Notice from {{1}}: A {{2}} certificate has been issued to {{3}}. Please collect it from the school office.',
  },
  optin_welcome: {
    name: 'optin_welcome',
    category: 'UTILITY',
    language: 'en',
    paramCount: 2,
    paramLabels: ['school', 'student'],
    paramMaxLength: [100, 100],
    body: 'Welcome from {{1}}: You will now receive school updates about {{2}} on WhatsApp. Reply STOP at any time to opt out.',
  },
};

// Built-in Meta test template — always available, no approval needed
export const HELLO_WORLD_TEMPLATE = {
  name: 'hello_world',
  language: 'en_US',
};

/**
 * Sanitise a single template parameter:
 * - Strip newlines and tabs
 * - Collapse runs of spaces to single space
 * - Trim whitespace
 * - Cap to max length
 */
export function sanitiseParam(value: string, maxLength: number): string {
  return value
    .replace(/[\n\r\t]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a template name and parameter array.
 * Returns an error string or null if valid.
 */
export function validateTemplate(
  templateName: string,
  params: string[]
): string | null {
  const def = TEMPLATE_REGISTRY[templateName];
  if (!def) {
    return `Unknown template: '${templateName}'. Valid templates: ${Object.keys(TEMPLATE_REGISTRY).join(', ')}`;
  }
  if (params.length !== def.paramCount) {
    return `Template '${templateName}' requires ${def.paramCount} parameters, got ${params.length}`;
  }
  return null;
}

/**
 * Sanitise all parameters for a template.
 */
export function sanitiseParams(templateName: string, params: string[]): string[] {
  const def = TEMPLATE_REGISTRY[templateName];
  if (!def) return params;
  return params.map((p, i) =>
    sanitiseParam(p, def.paramMaxLength[i] ?? 256)
  );
}
