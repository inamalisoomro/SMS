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
}

export interface AppSettings {
  schoolName: string;
  schoolLogo: string; // base64 or emoji
  theme: 'light' | 'dark';
  academicYear: string;
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
