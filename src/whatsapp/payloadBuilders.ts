/**
 * whatsapp/payloadBuilders.ts — Pure functions that build template param arrays
 * for each notification type. All params are sanitised here (no newlines, trimmed, capped).
 */

import type { Student, Homework, Announcement, Result, AppSettings } from '../types';

// ── Sanitiser ────────────────────────────────────────────────────────────────

function sanitise(value: string, maxLength = 256): string {
  return (value ?? '')
    .replace(/[\n\r\t]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// ── Attendance alert ─────────────────────────────────────────────────────────

export interface AttendanceAlertParams {
  student: Pick<Student, 'name'>;
  status: string;
  subjectName: string;
  date: string;
  schoolName: string;
}

export function buildAttendanceAlertParams(p: AttendanceAlertParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.student.name, 100),
    sanitise(p.status, 20),
    sanitise(p.subjectName, 100),
    sanitise(p.date, 20),
  ];
}

// ── Attendance summary ───────────────────────────────────────────────────────

export interface AttendanceSummaryParams {
  student: Pick<Student, 'name'>;
  percentage: string;
  fromDate: string;
  toDate: string;
  schoolName: string;
}

export function buildAttendanceSummaryParams(p: AttendanceSummaryParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.student.name, 100),
    sanitise(p.percentage, 10),
    sanitise(p.fromDate, 20),
    sanitise(p.toDate, 20),
  ];
}

// ── Homework assigned ────────────────────────────────────────────────────────

export interface HomeworkParams {
  student: Pick<Student, 'name'>;
  homework: Pick<Homework, 'title' | 'dueDate'>;
  subjectName: string;
  schoolName: string;
}

export function buildHomeworkParams(p: HomeworkParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.student.name, 100),
    sanitise(p.homework.title, 200),
    sanitise(p.subjectName, 100),
    sanitise(new Date(p.homework.dueDate).toLocaleDateString(), 20),
  ];
}

// ── Result published ─────────────────────────────────────────────────────────

export interface ResultParams {
  student: Pick<Student, 'name'>;
  result: Pick<Result, 'examName'>;
  subjectName: string;
  marks: string;
  schoolName: string;
}

export function buildResultParams(p: ResultParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.student.name, 100),
    sanitise(p.marks, 20),
    sanitise(p.subjectName, 100),
    sanitise(p.result.examName, 100),
  ];
}

// ── Announcement notice ──────────────────────────────────────────────────────

export interface AnnouncementParams {
  announcement: Pick<Announcement, 'type' | 'message'>;
  schoolName: string;
}

export function buildAnnouncementParams(p: AnnouncementParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.announcement.type.toUpperCase(), 50),
    sanitise(p.announcement.message, 300),
  ];
}

// ── Fee reminder ─────────────────────────────────────────────────────────────

export interface FeeReminderParams {
  student: Pick<Student, 'name'>;
  amount: string;
  dueDate: string;
  schoolName: string;
}

export function buildFeeReminderParams(p: FeeReminderParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.amount, 50),
    sanitise(p.student.name, 100),
    sanitise(p.dueDate, 20),
  ];
}

// ── Event notice ─────────────────────────────────────────────────────────────

export interface EventNoticeParams {
  student: Pick<Student, 'name'>;
  eventName: string;
  date: string;
  venue: string;
  schoolName: string;
}

export function buildEventNoticeParams(p: EventNoticeParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.eventName, 200),
    sanitise(p.date, 20),
    sanitise(p.venue, 200),
    sanitise(p.student.name, 100),
  ];
}

// ── Certificate issued ───────────────────────────────────────────────────────

export interface CertificateParams {
  student: Pick<Student, 'name'>;
  certificateType: string;
  schoolName: string;
}

export function buildCertificateParams(p: CertificateParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.certificateType, 100),
    sanitise(p.student.name, 100),
  ];
}

// ── Opt-in welcome ───────────────────────────────────────────────────────────

export interface OptInWelcomeParams {
  student: Pick<Student, 'name'>;
  schoolName: string;
}

export function buildOptInWelcomeParams(p: OptInWelcomeParams): string[] {
  return [
    sanitise(p.schoolName, 100),
    sanitise(p.student.name, 100),
  ];
}

// ── Helper: get school name from settings ────────────────────────────────────

export function getSchoolName(settings: Pick<AppSettings, 'schoolName'>): string {
  return sanitise(settings.schoolName || 'School', 100);
}
