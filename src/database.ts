/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Class, Subject, AttendanceRecord, AcademicSession, ActivityLog, StudentLoginRecord, Teacher, Examination, Result, FeeCategory, FeeCharge, Payment, FeeReminder, User, TeacherAssignment, UserRole } from './types';
import { generateStudentQRToken } from './utils';

const DB_NAME = 'SAMS_DB';
const DB_VERSION = 8; // Incremented for User and TeacherAssignment stores

export class SAMSIndexedDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('students')) {
          db.createObjectStore('students', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('classes')) {
          db.createObjectStore('classes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('homework')) {
          db.createObjectStore('homework', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('announcements')) {
          db.createObjectStore('announcements', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('results')) {
          db.createObjectStore('results', { keyPath: 'id' });
        }
        
        // Version 4: Add student login records store
        if (!db.objectStoreNames.contains('studentLogins')) {
          const loginStore = db.createObjectStore('studentLogins', { keyPath: 'id' });
          loginStore.createIndex('studentId', 'studentId', { unique: false });
          loginStore.createIndex('loginAt', 'loginAt', { unique: false });
        }
        
        // Version 5: Add teachers store
        if (!db.objectStoreNames.contains('teachers')) {
          db.createObjectStore('teachers', { keyPath: 'id' });
        }
        
        // Version 6: Add examinations store
        if (!db.objectStoreNames.contains('examinations')) {
          db.createObjectStore('examinations', { keyPath: 'id' });
        }
        
        // Version 7: Add fee management stores
        if (!db.objectStoreNames.contains('feeCategories')) {
          db.createObjectStore('feeCategories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('feeCharges')) {
          const feeChargeStore = db.createObjectStore('feeCharges', { keyPath: 'id' });
          feeChargeStore.createIndex('studentId', 'studentId', { unique: false });
          feeChargeStore.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains('payments')) {
          const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
          paymentStore.createIndex('feeChargeId', 'feeChargeId', { unique: false });
          paymentStore.createIndex('studentId', 'studentId', { unique: false });
          paymentStore.createIndex('receiptNumber', 'receiptNumber', { unique: true });
        }
        if (!db.objectStoreNames.contains('feeReminders')) {
          const reminderStore = db.createObjectStore('feeReminders', { keyPath: 'id' });
          reminderStore.createIndex('studentId', 'studentId', { unique: false });
        }
        
        // Version 8: Add User and TeacherAssignment stores for RBAC
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('role', 'role', { unique: false });
          userStore.createIndex('teacherId', 'teacherId', { unique: false });
        }
        if (!db.objectStoreNames.contains('teacherAssignments')) {
          const assignmentStore = db.createObjectStore('teacherAssignments', { keyPath: 'id' });
          assignmentStore.createIndex('teacherId', 'teacherId', { unique: false });
          assignmentStore.createIndex('classId', 'classId', { unique: false });
          assignmentStore.createIndex('subjectId', 'subjectId', { unique: false });
        }

        // ── v4 WhatsApp stores ──────────────────────────────────────────────
        if (!db.objectStoreNames.contains('whatsappOutbox')) {
          const outbox = db.createObjectStore('whatsappOutbox', { keyPath: 'id' });
          outbox.createIndex('status', 'status', { unique: false });
          outbox.createIndex('createdAt', 'createdAt', { unique: false });
          outbox.createIndex('dedupeKey', 'dedupeKey', { unique: true });
          outbox.createIndex('studentId', 'studentId', { unique: false });
          outbox.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains('whatsappInbox')) {
          const inbox = db.createObjectStore('whatsappInbox', { keyPath: 'id' });
          inbox.createIndex('from', 'from', { unique: false });
          inbox.createIndex('receivedAt', 'receivedAt', { unique: false });
          inbox.createIndex('read', 'read', { unique: false });
        }
        if (!db.objectStoreNames.contains('syncState')) {
          db.createObjectStore('syncState', { keyPath: 'key' });
        }
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- CRUD for Students ---
  async getStudents(): Promise<Student[]> {
    const store = await this.getStore('students');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        const students: Student[] = request.result || [];
        // Migration check: ensure every student has a valid qrToken and card validity
        let hasMissing = false;
        for (const st of students) {
          if (!st.qrToken) {
            st.qrToken = generateStudentQRToken(st.id);
            if (!st.cardValidUntil) st.cardValidUntil = '2027-06-30';
            if (!st.cardIssuedAt) st.cardIssuedAt = new Date().toISOString().split('T')[0];
            if (!st.bloodGroup) st.bloodGroup = 'O+';
            hasMissing = true;
          }
        }
        if (hasMissing) {
          for (const st of students) {
            await this.saveStudent(st);
          }
        }
        resolve(students);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveStudent(student: Student): Promise<void> {
    if (!student.qrToken) {
      student.qrToken = generateStudentQRToken(student.id);
    }
    const store = await this.getStore('students', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(student);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStudent(id: string): Promise<void> {
    const store = await this.getStore('students', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Teachers ---
  async getTeachers(): Promise<Teacher[]> {
    const store = await this.getStore('teachers');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTeacher(teacher: Teacher): Promise<void> {
    const store = await this.getStore('teachers', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(teacher);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTeacher(id: string): Promise<void> {
    const store = await this.getStore('teachers', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Classes ---
  async getClasses(): Promise<Class[]> {
    const store = await this.getStore('classes');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveClass(cls: Class): Promise<void> {
    const store = await this.getStore('classes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(cls);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteClass(id: string): Promise<void> {
    const store = await this.getStore('classes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Subjects ---
  async getSubjects(): Promise<Subject[]> {
    const store = await this.getStore('subjects');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSubject(subject: Subject): Promise<void> {
    const store = await this.getStore('subjects', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(subject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSubject(id: string): Promise<void> {
    const store = await this.getStore('subjects', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Attendance ---
  async getAttendance(): Promise<AttendanceRecord[]> {
    const store = await this.getStore('attendance');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const store = await this.getStore('attendance', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction('attendance', 'readwrite');
    const store = transaction.objectStore('attendance');

    return new Promise((resolve, reject) => {
      records.forEach((record) => {
        store.put(record);
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    const store = await this.getStore('attendance', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Academic Sessions ---
  async getSessions(): Promise<AcademicSession[]> {
    const store = await this.getStore('sessions');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(session: AcademicSession): Promise<void> {
    const store = await this.getStore('sessions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Activity Logs ---
  async getLogs(): Promise<ActivityLog[]> {
    const store = await this.getStore('logs');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted.slice(0, 100)); // limit to last 100 logs
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addLog(action: string, details: string, userContext?: { userId: string; userRole: UserRole; username: string }): Promise<void> {
    const store = await this.getStore('logs', 'readwrite');
    const log: ActivityLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      action,
      details,
      timestamp: Date.now(),
      ...(userContext && {
        userId: userContext.userId,
        userRole: userContext.userRole,
        username: userContext.username
      })
    };
    return new Promise((resolve, reject) => {
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for School Settings (Multi-tenant support) ---
  async getSettings(schoolId: string = 'default'): Promise<any | null> {
    const store = await this.getStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.get(schoolId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: any, schoolId: string = 'default'): Promise<void> {
    const store = await this.getStore('settings', 'readwrite');
    const settingsWithId = { ...settings, id: schoolId };
    return new Promise((resolve, reject) => {
      const request = store.put(settingsWithId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSchools(): Promise<any[]> {
    const store = await this.getStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSchoolSettings(schoolId: string): Promise<void> {
    const store = await this.getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(schoolId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Email Notifications ---
  async getNotifications(): Promise<any[]> {
    const store = await this.getStore('notifications');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveNotification(notification: any): Promise<void> {
    const store = await this.getStore('notifications', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(notification);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNotification(id: string): Promise<void> {
    const store = await this.getStore('notifications', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Homework ---
  async getHomework(): Promise<any[]> {
    const store = await this.getStore('homework');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveHomework(homework: any): Promise<void> {
    const store = await this.getStore('homework', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(homework);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteHomework(id: string): Promise<void> {
    const store = await this.getStore('homework', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Announcements ---
  async getAnnouncements(): Promise<any[]> {
    const store = await this.getStore('announcements');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAnnouncement(announcement: any): Promise<void> {
    const store = await this.getStore('announcements', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(announcement);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const store = await this.getStore('announcements', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Results ---
  async getResults(): Promise<any[]> {
    const store = await this.getStore('results');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: any, b: any) => b.publishedAt - a.publishedAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveResult(result: any): Promise<void> {
    const store = await this.getStore('results', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteResult(id: string): Promise<void> {
    const store = await this.getStore('results', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Examinations ---
  async getExaminations(): Promise<Examination[]> {
    const store = await this.getStore('examinations');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: Examination, b: Examination) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveExamination(examination: Examination): Promise<void> {
    const store = await this.getStore('examinations', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(examination);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteExamination(id: string): Promise<void> {
    const store = await this.getStore('examinations', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Student Login Records ---
  async getStudentLoginRecords(): Promise<StudentLoginRecord[]> {
    const store = await this.getStore('studentLogins');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveStudentLoginRecord(record: StudentLoginRecord): Promise<void> {
    const store = await this.getStore('studentLogins', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStudentLoginRecord(id: string): Promise<void> {
    const store = await this.getStore('studentLogins', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Seed default data if database is empty
  async seedIfEmpty(): Promise<boolean> {
    const students = await this.getStudents();
    const existingUsers = await this.getUsers();
    
    // If both students AND users exist, no seeding needed
    if (students.length > 0 && existingUsers.length > 0) return false;

    console.log('Seeding initial SAMS data to IndexedDB...');
    
    // If students exist but users don't, seed only users
    if (students.length > 0 && existingUsers.length === 0) {
      console.log('Seeding demo users for RBAC...');
      await this.seedDemoUsers();
      return true;
    }

    // 1. Seed Classes
    const defaultClasses: Class[] = [
      { id: 'c1', name: 'Grade 10', section: 'A' },
      { id: 'c2', name: 'Grade 10', section: 'B' },
      { id: 'c3', name: 'Grade 11', section: 'A' },
      { id: 'c4', name: 'Grade 12', section: 'A' },
    ];
    for (const c of defaultClasses) {
      await this.saveClass(c);
    }

    // 2. Seed Subjects
    const defaultSubjects: Subject[] = [
      { id: 's1', name: 'Mathematics', code: 'MATH-101' },
      { id: 's2', name: 'Physics', code: 'PHYS-101' },
      { id: 's3', name: 'Chemistry', code: 'CHEM-101' },
      { id: 's4', name: 'English Literature', code: 'ENGL-102' },
      { id: 's5', name: 'Computer Science', code: 'COMP-101' },
    ];
    for (const s of defaultSubjects) {
      await this.saveSubject(s);
    }

    // 3. Seed Students
    const defaultStudents: Student[] = [
      { 
        id: 'st1', 
        studentId: 'ST-2026-001', 
        name: 'Alexander Wright', 
        rollNumber: '01', 
        classId: 'c1', 
        section: 'A', 
        contactNumber: '+1 555-0101', 
        email: 'alex.wright@school.edu',
        fatherName: 'Thomas Wright',
        motherName: 'Eleanor Wright',
        bloodGroup: 'O+',
        dateOfBirth: '2010-04-12',
        admissionDate: '2024-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st1')
      },
      { 
        id: 'st2', 
        studentId: 'ST-2026-002', 
        name: 'Sophia Martinez', 
        rollNumber: '02', 
        classId: 'c1', 
        section: 'A', 
        contactNumber: '+1 555-0102', 
        email: 'sophia.m@school.edu',
        fatherName: 'Carlos Martinez',
        motherName: 'Maria Martinez',
        bloodGroup: 'A+',
        dateOfBirth: '2010-08-23',
        admissionDate: '2024-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st2')
      },
      { 
        id: 'st3', 
        studentId: 'ST-2026-003', 
        name: 'Liam Gallagher', 
        rollNumber: '03', 
        classId: 'c1', 
        section: 'A', 
        contactNumber: '+1 555-0103', 
        email: 'liam.g@school.edu',
        fatherName: 'Arthur Gallagher',
        motherName: 'Clara Gallagher',
        bloodGroup: 'B+',
        dateOfBirth: '2010-11-05',
        admissionDate: '2024-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st3')
      },
      { 
        id: 'st4', 
        studentId: 'ST-2026-004', 
        name: 'Emma Watson', 
        rollNumber: '04', 
        classId: 'c1', 
        section: 'A', 
        contactNumber: '+1 555-0104', 
        email: 'emma.w@school.edu',
        fatherName: 'Richard Watson',
        motherName: 'Jacqueline Watson',
        bloodGroup: 'AB+',
        dateOfBirth: '2010-02-18',
        admissionDate: '2024-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st4')
      },
      { 
        id: 'st5', 
        studentId: 'ST-2026-005', 
        name: 'Benjamin Carter', 
        rollNumber: '01', 
        classId: 'c2', 
        section: 'B', 
        contactNumber: '+1 555-0105', 
        email: 'ben.carter@school.edu',
        fatherName: 'Samuel Carter',
        motherName: 'Rebecca Carter',
        bloodGroup: 'O-',
        dateOfBirth: '2010-09-14',
        admissionDate: '2024-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st5')
      },
      { 
        id: 'st6', 
        studentId: 'ST-2026-006', 
        name: 'Olivia Rose', 
        rollNumber: '02', 
        classId: 'c2', 
        section: 'B', 
        contactNumber: '+1 555-0106', 
        email: 'olivia.rose@school.edu',
        fatherName: 'Henry Rose',
        motherName: 'Grace Rose',
        bloodGroup: 'A-',
        dateOfBirth: '2010-06-30',
        admissionDate: '2024-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st6')
      },
      { 
        id: 'st7', 
        studentId: 'ST-2026-007', 
        name: 'Ethan Hunt', 
        rollNumber: '01', 
        classId: 'c3', 
        section: 'A', 
        contactNumber: '+1 555-0107', 
        email: 'ethan.hunt@school.edu',
        fatherName: 'Nathan Hunt',
        motherName: 'Julia Hunt',
        bloodGroup: 'B-',
        dateOfBirth: '2009-01-20',
        admissionDate: '2023-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st7')
      },
      { 
        id: 'st8', 
        studentId: 'ST-2026-008', 
        name: 'Ava Duvernay', 
        rollNumber: '02', 
        classId: 'c3', 
        section: 'A', 
        contactNumber: '+1 555-0108', 
        email: 'ava.d@school.edu',
        fatherName: 'Marcus Duvernay',
        motherName: 'Lynette Duvernay',
        bloodGroup: 'O+',
        dateOfBirth: '2009-07-11',
        admissionDate: '2023-08-15',
        cardValidUntil: '2027-06-30',
        cardIssuedAt: '2026-09-01',
        qrToken: generateStudentQRToken('st8')
      },
    ];
    for (const st of defaultStudents) {
      await this.saveStudent(st);
    }

    // 4. Seed some yesterday's attendance so charts look interesting right away
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayAttendance: AttendanceRecord[] = [
      { id: `c1_s1_${yesterdayStr}_st1`, studentId: 'st1', classId: 'c1', subjectId: 's1', date: yesterdayStr, status: 'present', updatedAt: Date.now() },
      { id: `c1_s1_${yesterdayStr}_st2`, studentId: 'st2', classId: 'c1', subjectId: 's1', date: yesterdayStr, status: 'present', updatedAt: Date.now() },
      { id: `c1_s1_${yesterdayStr}_st3`, studentId: 'st3', classId: 'c1', subjectId: 's1', date: yesterdayStr, status: 'absent', updatedAt: Date.now() },
      { id: `c1_s1_${yesterdayStr}_st4`, studentId: 'st4', classId: 'c1', subjectId: 's1', date: yesterdayStr, status: 'late', updatedAt: Date.now() },
    ];
    for (const att of yesterdayAttendance) {
      await this.saveAttendanceRecord(att);
    }

    // 5. Seed some past attendance (last 5 days) for nice trends
    const statuses: ('present' | 'absent' | 'late' | 'leave')[] = ['present', 'present', 'present', 'present', 'absent', 'late', 'leave'];
    for (let i = 2; i <= 6; i++) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - i);
      const pastDateStr = pastDate.toISOString().split('T')[0];
      
      // Seed MATH-101 (s1) for c1
      for (const st of defaultStudents.filter(s => s.classId === 'c1')) {
        const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
        await this.saveAttendanceRecord({
          id: `c1_s1_${pastDateStr}_${st.id}`,
          studentId: st.id,
          classId: 'c1',
          subjectId: 's1',
          date: pastDateStr,
          status: randStatus,
          updatedAt: Date.now()
        });
      }
    }

    // 6. Seed default active session
    const activeSession: AcademicSession = {
      id: 'sess1',
      name: '2026-2027 Academic Year',
      isActive: true,
    };
    await this.saveSession(activeSession);

    // 7. Seed demo users and teacher assignments
    await this.seedDemoUsers();

    await this.addLog('Database Seeding', 'Initial system data successfully provisioned for the application demonstration.');
    return true;
  }

  /**
   * Seeds demo users for RBAC testing (called separately if users are missing)
   */
  private async seedDemoUsers(): Promise<void> {
    // Seed default users for RBAC prototype (LOCAL DEVELOPMENT ONLY)
    // ⚠️ WARNING: This is for UI testing only. Not secure authentication.
    const defaultUsers: User[] = [
      {
        id: 'u1',
        username: 'principal',
        role: 'principal',
        createdAt: Date.now(),
      },
      {
        id: 'u2',
        username: 'admin',
        role: 'administrator',
        createdAt: Date.now(),
      },
      {
        id: 'u3',
        username: 'teacher1',
        role: 'teacher',
        teacherId: 't1', // Will be created when teachers module adds teachers
        createdAt: Date.now(),
      },
      {
        id: 'u4',
        username: 'parent1',
        role: 'parent',
        linkedStudentIds: ['st1', 'st2'], // Linked to Alexander and Sophia
        createdAt: Date.now(),
      },
    ];
    for (const user of defaultUsers) {
      await this.saveUser(user);
    }

    // Seed sample teacher assignments (for teacher access control)
    const defaultAssignments: TeacherAssignment[] = [
      {
        id: 'ta1',
        teacherId: 't1',
        classId: 'c1', // Grade 10-A
        subjectId: 's1', // Mathematics
        academicYear: '2026-2027',
        assignedAt: Date.now(),
      },
      {
        id: 'ta2',
        teacherId: 't1',
        classId: 'c2', // Grade 10-B
        subjectId: 's1', // Mathematics
        academicYear: '2026-2027',
        assignedAt: Date.now(),
      },
    ];
    for (const assignment of defaultAssignments) {
      await this.saveTeacherAssignment(assignment);
    }
  }

  // --- CRUD for Fee Categories ---
  async getFeeCategories(): Promise<FeeCategory[]> {
    const store = await this.getStore('feeCategories');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: FeeCategory, b: FeeCategory) => 
          a.name.localeCompare(b.name)
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveFeeCategory(category: FeeCategory): Promise<void> {
    const store = await this.getStore('feeCategories', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(category);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFeeCategory(id: string): Promise<void> {
    const store = await this.getStore('feeCategories', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Fee Charges ---
  async getFeeCharges(): Promise<FeeCharge[]> {
    const store = await this.getStore('feeCharges');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: FeeCharge, b: FeeCharge) => 
          b.createdAt - a.createdAt
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveFeeCharge(charge: FeeCharge): Promise<void> {
    const store = await this.getStore('feeCharges', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(charge);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFeeCharge(id: string): Promise<void> {
    const store = await this.getStore('feeCharges', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Payments ---
  async getPayments(): Promise<Payment[]> {
    const store = await this.getStore('payments');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: Payment, b: Payment) => 
          b.createdAt - a.createdAt
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async savePayment(payment: Payment): Promise<void> {
    const store = await this.getStore('payments', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(payment);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePayment(id: string): Promise<void> {
    const store = await this.getStore('payments', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Fee Reminders ---
  async getFeeReminders(): Promise<FeeReminder[]> {
    const store = await this.getStore('feeReminders');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: FeeReminder, b: FeeReminder) => 
          b.sentAt - a.sentAt
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveFeeReminder(reminder: FeeReminder): Promise<void> {
    const store = await this.getStore('feeReminders', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(reminder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFeeReminder(id: string): Promise<void> {
    const store = await this.getStore('feeReminders', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Users (RBAC) ---
  async getUsers(): Promise<User[]> {
    const store = await this.getStore('users');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const store = await this.getStore('users');
    return new Promise((resolve, reject) => {
      const index = store.index('username');
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveUser(user: User): Promise<void> {
    const store = await this.getStore('users', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(id: string): Promise<void> {
    const store = await this.getStore('users', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- CRUD for Teacher Assignments (RBAC) ---
  async getTeacherAssignments(): Promise<TeacherAssignment[]> {
    const store = await this.getStore('teacherAssignments');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTeacherAssignmentsByTeacherId(teacherId: string): Promise<TeacherAssignment[]> {
    const store = await this.getStore('teacherAssignments');
    return new Promise((resolve, reject) => {
      const index = store.index('teacherId');
      const request = index.getAll(teacherId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTeacherAssignment(assignment: TeacherAssignment): Promise<void> {
    const store = await this.getStore('teacherAssignments', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(assignment);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTeacherAssignment(id: string): Promise<void> {
    const store = await this.getStore('teacherAssignments', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all database tables
  async resetDatabase(): Promise<void> {
    const db = await this.init();
    const allStores = ['students', 'teachers', 'classes', 'subjects', 'attendance', 'sessions', 'logs', 'settings', 'notifications', 'homework', 'announcements', 'results', 'examinations', 'studentLogins', 'feeCategories', 'feeCharges', 'payments', 'feeReminders', 'users', 'teacherAssignments', 'whatsappOutbox', 'whatsappInbox', 'syncState'];
    const stores = allStores.filter(s => db.objectStoreNames.contains(s));
    const transaction = db.transaction(stores, 'readwrite');
    stores.forEach((storeName) => {
      transaction.objectStore(storeName).clear();
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ── WhatsApp Outbox ────────────────────────────────────────────────────────
  async getWhatsAppOutbox(statusFilter?: string[]): Promise<any[]> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('whatsappOutbox')) return [];
    const store = await this.getStore('whatsappOutbox');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let items = request.result || [];
        if (statusFilter && statusFilter.length > 0) {
          items = items.filter((i: any) => statusFilter.includes(i.status));
        }
        resolve(items.sort((a: any, b: any) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveWhatsAppOutboxItem(item: any): Promise<void> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('whatsappOutbox')) return;
    const store = await this.getStore('whatsappOutbox', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getWhatsAppOutboxItemByDedupeKey(dedupeKey: string): Promise<any | null> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('whatsappOutbox')) return null;
    const store = await this.getStore('whatsappOutbox');
    return new Promise((resolve) => {
      const index = store.index('dedupeKey');
      const request = index.get(dedupeKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  // ── WhatsApp Inbox ─────────────────────────────────────────────────────────
  async getWhatsAppInbox(): Promise<any[]> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('whatsappInbox')) return [];
    const store = await this.getStore('whatsappInbox');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result || []).sort((a: any, b: any) => b.receivedAt - a.receivedAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveWhatsAppInboundMessage(msg: any): Promise<void> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('whatsappInbox')) return;
    const store = await this.getStore('whatsappInbox', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(msg);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnreadWhatsAppInboxCount(): Promise<number> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('whatsappInbox')) return 0;
    const store = await this.getStore('whatsappInbox');
    return new Promise((resolve) => {
      try {
        const index = store.index('read');
        const request = index.count(IDBKeyRange.only(false));
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => resolve(0);
      } catch { resolve(0); }
    });
  }

  // ── SyncState ──────────────────────────────────────────────────────────────
  async getSyncState(key: string): Promise<number | string | null> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('syncState')) return null;
    const store = await this.getStore('syncState');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as any)?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async setSyncState(key: string, value: number | string): Promise<void> {
    const db = await this.init();
    if (!db.objectStoreNames.contains('syncState')) return;
    const store = await this.getStore('syncState', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbInstance = new SAMSIndexedDB();
