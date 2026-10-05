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

export interface Result {
  id: string;
  studentId: string;
  classId: string;
  examName: string;
  examDate: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    marksObtained: number;
    totalMarks: number;
    grade?: string;
  }[];
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  remarks?: string;
  publishedAt: number;
}
