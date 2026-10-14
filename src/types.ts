/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string; // unique database uuid/id
  studentId: string; // human readable custom ID (e.g., SAMS-2026-001)
  name: string;
  rollNumber: string;
  classId: string; // reference to Class
  section: string;
  contactNumber: string;
  email?: string;
  photo?: string; // base64 string
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  admissionDate?: string;
  cardValidUntil?: string; // e.g. end of academic year
  qrToken: string; // unique signed opaque token
  cardIssuedAt?: string;
  parentEmail?: string; // Primary parent email for notifications
  secondaryParentEmail?: string; // Secondary parent email
  registeredAt?: number; // Timestamp when student was first registered
  // WhatsApp fields (v4)
  parentWhatsApp?: string;
  secondaryParentWhatsApp?: string;
  whatsappOptIn?: boolean;
  whatsappOptInAt?: number;
  whatsappOptInSource?: 'manual' | 'csv' | 'reply' | 'form';
}

export interface Teacher {
  id: string; // unique database uuid/id
  teacherId: string; // human readable custom ID (e.g., TCH-2026-001)
  name: string;
  email: string;
  phone: string;
  subjectSpecialization?: string; // Primary subject they teach
  qualification?: string; // Highest qualification (e.g., M.Ed., Ph.D.)
  experience?: string; // Years of experience
  joiningDate?: string; // Date joined school (YYYY-MM-DD)
  photo?: string; // base64 string
  address?: string;
  emergencyContact?: string;
  registeredAt?: number; // Timestamp when teacher was first registered
}

export interface Class {
  id: string;
  name: string;
  section: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  id: string; // composite key: classId_subjectId_date_studentId
  studentId: string;
  classId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  updatedAt: number;
  markedVia?: 'manual' | 'qr_scan';
}

export interface AppSettings {
  schoolName: string;
  schoolLogo: string; // emoji fallback
  schoolLogoImage?: string; // base64 encoded custom uploaded image
  theme: 'light' | 'dark';
  academicYear: string;
  schoolAddress?: string;
  schoolPhone?: string;
  principalSignature?: string; // base64 image, optional
  emailJsPublicKey?: string; // EmailJS public key
  emailJsServiceId?: string; // EmailJS service ID
  emailJsTemplateId?: string; // EmailJS template ID
  currency?: string; // Currency symbol for fee management (default: '$')
  // WhatsApp settings (v4)
  whatsappEnabled?: boolean;
  whatsappGatewayUrl?: string;
  whatsappApiKey?: string;
  whatsappDefaultCountryCode?: string;
  whatsappAutoSendAttendance?: boolean;
  whatsappAttendanceStatuses?: ('absent' | 'late' | 'leave')[];
  whatsappQuietHours?: { enabled: boolean; start: string; end: string };
  whatsappTypeToggles?: Partial<Record<NotificationType, boolean>>;
  whatsappTemplateOverrides?: Record<string, string>;
  whatsappBulkConfirmThreshold?: number;
  whatsappLowAttendanceThreshold?: number;
  whatsappFallbackToContactNumber?: boolean;
  whatsappAdminPinHash?: string;
  whatsappAdminPinSalt?: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: number;
  // RBAC Audit fields (optional for backward compatibility)
  userId?: string;
  userRole?: UserRole;
  username?: string;
}

// ==================== STUDENT LOGIN TRACKING ====================

export interface StudentLoginRecord {
  id: string;                    // UUID
  studentId: string;             // Reference to Student
  loginAt: number;               // Login timestamp
  logoutAt?: number;             // Logout timestamp (if logged out)
  sessionId: string;             // Unique session identifier
  deviceInfo?: string;           // Optional device/browser info
}

// ==================== EMAIL NOTIFICATION TYPES ====================

export type NotificationType = 
  | 'homework'
  | 'certificate'
  | 'result'
  | 'announcement'
  | 'attendance_alert'
  | 'fee_reminder'
  | 'event'
  | 'general';

export interface EmailNotification {
  id: string; // unique ID
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  studentId?: string; // related student
  classId?: string; // related class
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: 'pending' | 'sent' | 'failed' | 'queued';
  sentAt?: number;
  failureReason?: string;
  createdAt: number;
  retryCount?: number;
}

export interface EmailTemplate {
  id: string;
  type: NotificationType;
  name: string;
  subject: string; // Can include variables like {{studentName}}
  htmlTemplate: string; // HTML with placeholders
  plainTextTemplate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EmailConfig {
  enabled: boolean;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'resend';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  apiKey?: string; // For SendGrid, Mailgun, Resend
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  dueDate: string; // YYYY-MM-DD
  assignedDate: string; // YYYY-MM-DD
  attachments?: string[]; // URLs or base64
  createdBy: string;
  createdAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'urgent' | 'event' | 'holiday';
  targetAudience: 'all' | 'class' | 'students';
  classIds?: string[]; // If targeting specific classes
  studentIds?: string[]; // If targeting specific students
  publishedDate: string;
  expiryDate?: string;
  createdAt: number;
  attachments?: string[];
}

// ==================== EXAMINATION & RESULTS ====================

export interface Examination {
  id: string;
  name: string; // e.g., "Midterm Exam", "Final Exam", "Monthly Test"
  academicYear: string; // e.g., "2026-2027"
  examDate: string; // YYYY-MM-DD
  classIds: string[]; // Classes taking this exam
  subjectIds: string[]; // Subjects in this exam
  maxMarks: number; // Maximum marks per subject (can be overridden per subject)
  description?: string;
  createdAt: number;
  createdBy?: string;
}

export interface Result {
  id: string;
  studentId: string;
  classId: string;
  examinationId: string; // Reference to Examination
  examName: string;
  examDate: string;
  academicYear: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    marksObtained: number;
    totalMarks: number;
    grade?: string;
    remarks?: string;
  }[];
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string;
  rank?: number;
  remarks?: string;
  isDraft: boolean; // true = draft, false = published
  publishedAt?: number; // Timestamp when published
  createdAt: number;
  updatedAt: number;
}

export interface GradeScale {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  description: string;
}

// ==================== FEE MANAGEMENT ====================

export interface FeeCategory {
  id: string;
  name: string; // e.g., "Tuition Fee", "Admission Fee", "Examination Fee", "Transport Fee"
  description?: string;
  isActive: boolean;
  createdAt: number;
}

export interface FeeCharge {
  id: string;
  studentId: string;
  categoryId: string; // Reference to FeeCategory
  categoryName: string; // Denormalized for quick access
  academicYear: string; // e.g., "2026-2027"
  feePeriod: string; // e.g., "Q1 2026", "January 2026", "Annual 2026"
  amount: number; // Original fee amount
  discount: number; // Approved discount/adjustment (default 0)
  dueDate: string; // YYYY-MM-DD format
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue'; // Calculated from payments
  remarks?: string; // Optional notes
  createdAt: number;
  createdBy?: string;
  updatedAt: number;
}

export interface Payment {
  id: string;
  receiptNumber: string; // Unique receipt identifier (e.g., "REC-2026-001")
  feeChargeId: string; // Reference to FeeCharge
  studentId: string;
  amount: number; // Amount paid
  paymentDate: string; // YYYY-MM-DD format
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'online' | 'other';
  referenceNumber?: string; // Cheque number, transaction ID, etc.
  notes?: string; // Optional payment notes
  createdAt: number;
  createdBy?: string;
  isVoided: boolean; // For voided/cancelled payments
  voidedAt?: number;
  voidedBy?: string;
  voidReason?: string;
}

export interface FeeReminder {
  id: string;
  studentId: string;
  feeChargeIds: string[]; // Multiple fees can be included in one reminder
  sentAt: number;
  sentTo: string[]; // Email addresses
  reminderType: 'overdue' | 'due_soon' | 'general';
  emailStatus: 'sent' | 'failed';
  failureReason?: string;
}

// Fee statistics for dashboard
export interface FeeStatistics {
  totalOutstanding: number;
  totalPaid: number;
  totalOverdue: number;
  studentsWithDues: number;
  paymentsThisMonth: number;
  overdueCount: number;
}

// ==================== ROLE-BASED ACCESS CONTROL ====================

export type UserRole = 'principal' | 'administrator' | 'teacher' | 'parent';

export type Permission =
  | 'view_dashboard'
  | 'view_students'
  | 'manage_students'
  | 'view_teachers'
  | 'manage_teachers'
  | 'view_classes'
  | 'manage_classes'
  | 'view_subjects'
  | 'manage_subjects'
  | 'view_attendance'
  | 'mark_attendance'
  | 'view_reports'
  | 'view_analytics'
  | 'view_announcements'
  | 'manage_announcements'
  | 'view_examinations'
  | 'manage_examinations'
  | 'enter_marks'
  | 'publish_results'
  | 'view_results'
  | 'view_fees'
  | 'manage_fees'
  | 'view_settings'
  | 'manage_settings'
  | 'backup_restore'
  | 'view_parent_portal';

export interface User {
  id: string; // UUID
  username: string; // For display purposes in local prototype
  role: UserRole;
  // For teachers - link to teacher record
  teacherId?: string;
  // For parents - link to student record(s)
  linkedStudentIds?: string[];
  createdAt: number;
  lastLoginAt?: number;
}

export interface TeacherAssignment {
  id: string; // UUID
  teacherId: string; // Reference to Teacher
  classId: string; // Reference to Class
  subjectId: string; // Reference to Subject
  academicYear: string; // e.g., "2026-2027"
  assignedAt: number;
}

// ==================== BACKUP & RESTORE SYSTEM ====================

export type RestoreMode = 'replace' | 'merge';

export interface BackupMetadata {
  backupFormatVersion: string; // e.g., "2.0"
  appVersion?: string; // Application version if available
  dbSchemaVersion: number; // IndexedDB version number
  createdAt: number; // Timestamp when backup was created
  recordCounts: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    attendance: number;
    sessions: number;
    logs: number;
    settings: number;
    notifications: number;
    homework: number;
    announcements: number;
    results: number;
    studentLogins: number;
    examinations: number;
    feeCategories: number;
    feeCharges: number;
    payments: number;
    feeReminders: number;
    users: number;
    teacherAssignments: number;
  };
}

export interface BackupData {
  metadata: BackupMetadata;
  // All data stores
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  sessions: AcademicSession[];
  logs: ActivityLog[];
  settings: any[]; // IndexedDB settings store (not localStorage)
  notifications: EmailNotification[];
  homework: Homework[];
  announcements: Announcement[];
  results: Result[];
  studentLogins: StudentLoginRecord[];
  examinations: Examination[];
  feeCategories: FeeCategory[];
  feeCharges: FeeCharge[];
  payments: Payment[];
  feeReminders: FeeReminder[];
  users: User[];
  teacherAssignments: TeacherAssignment[];
  // Optional: localStorage settings (excluded by default for security)
  appSettings?: AppSettings;
  // Legacy format support
  version?: string; // Old format version marker
  exportedAt?: number; // Old format timestamp
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  store?: string; // Which store has the issue
  recordId?: string; // Specific record ID
  field?: string; // Specific field
  message: string; // Human-readable issue description
}

export interface ValidationResult {
  isValid: boolean; // Overall validity
  issues: ValidationIssue[]; // All detected issues
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isLegacyFormat: boolean; // True if backup is old format (v1.0)
  detectedFormatVersion: string;
  metadata?: BackupMetadata; // Parsed metadata if available
}

export interface RestorePreview {
  backupDate: Date | null;
  backupFormatVersion: string;
  dbSchemaVersion: number | null;
  recordCounts: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    attendance: number;
    sessions: number;
    logs: number;
    settings: number;
    notifications: number;
    homework: number;
    announcements: number;
    results: number;
    studentLogins: number;
    examinations: number;
    feeCategories: number;
    feeCharges: number;
    payments: number;
    feeReminders: number;
    users: number;
    teacherAssignments: number;
  };
  includesAppSettings: boolean;
  validation: ValidationResult;
}

export interface MergeConflict {
  store: string;
  recordId: string;
  existingRecord: any;
  incomingRecord: any;
  reason: string; // Why it's a conflict
}

export interface MergeResult {
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: MergeConflict[];
}

export interface RestoreResult {
  success: boolean;
  mode: RestoreMode;
  recordsRestored: number;
  mergeResult?: MergeResult;
  errors: string[];
  warnings: string[];
}

// ==================== WHATSAPP TYPES (v4) ====================

export type WhatsAppOutboxStatus =
  | 'queued'
  | 'sending'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled'
  | 'opted_out'
  | 'invalid';

export interface WhatsAppOutboxItem {
  id: string;
  clientId: string;
  type: NotificationType;
  studentId?: string;
  recipientName: string;
  to: string;
  template: string;
  language: string;
  params: string[];
  dedupeKey: string;
  status: WhatsAppOutboxStatus;
  messageId?: string;
  error?: string;
  retryable?: boolean;
  retryCount: number;
  nextAttemptAt?: number;
  createdAt: number;
  updatedAt: number;
  scheduledFor?: number;
  meta?: Record<string, unknown>;
}

export interface WhatsAppInboundMessage {
  id: string;
  from: string;
  studentId?: string;
  text: string;
  receivedAt: number;
  read: boolean;
  replyWindowEndsAt: number;
}

export interface SyncState {
  key: string;
  value: number | string;
}

export type NotificationChannel = 'email' | 'whatsapp';

export interface DispatchRecipientSkip {
  studentId: string;
  recipientName: string;
  reason: 'no_number' | 'invalid_number' | 'no_opt_in' | 'opted_out' | 'duplicate';
}

export interface DispatchResult {
  emailSent: number;
  emailFailed: number;
  whatsappQueued: number;
  whatsappSkipped: DispatchRecipientSkip[];
}

export interface GatewayMessageResult {
  clientId: string;
  result: 'accepted' | 'duplicate' | 'invalid_number' | 'rate_limited' | 'cap_reached' | 'opted_out' | 'failed';
  messageId?: string;
  error?: { code: number; message: string; retryable: boolean };
}

export interface GatewayEvent {
  id: number;
  type: 'status' | 'inbound' | 'optout' | 'optin';
  waMessageId?: string;
  fromNumber?: string;
  toNumber?: string;
  status?: string;
  payload?: Record<string, unknown>;
  createdAt: number;
}

export interface GatewayTemplate {
  name: string;
  category: string;
  language: string;
  paramCount: number;
  paramLabels: string[];
  body: string;
  approvalStatus: string;
  metaCategory: string;
}

export interface GatewayDiagnostics {
  mode: 'live' | 'mock';
  version: string;
  apiVersion: string;
  tokenValid: boolean;
  phoneInfo: Record<string, unknown> | null;
  webhookLastSeen: number | null;
  dailyUsage: number;
  dailyCap: number;
  templates: string[];
  requestId?: string;
}
