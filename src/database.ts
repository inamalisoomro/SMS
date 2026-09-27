/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Class, Subject, AttendanceRecord, AcademicSession, ActivityLog } from './types';

const DB_NAME = 'SAMS_DB';
const DB_VERSION = 1;

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
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveStudent(student: Student): Promise<void> {
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

  async addLog(action: string, details: string): Promise<void> {
    const store = await this.getStore('logs', 'readwrite');
    const log: ActivityLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      action,
      details,
      timestamp: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Seed default data if database is empty
  async seedIfEmpty(): Promise<boolean> {
    const students = await this.getStudents();
    if (students.length > 0) return false; // Already seeded

    console.log('Seeding initial SAMS data to IndexedDB...');

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
      { id: 'st1', studentId: 'ST-2026-001', name: 'Alexander Wright', rollNumber: '01', classId: 'c1', section: 'A', contactNumber: '+1 555-0101', email: 'alex.wright@school.edu' },
      { id: 'st2', studentId: 'ST-2026-002', name: 'Sophia Martinez', rollNumber: '02', classId: 'c1', section: 'A', contactNumber: '+1 555-0102', email: 'sophia.m@school.edu' },
      { id: 'st3', studentId: 'ST-2026-003', name: 'Liam Gallagher', rollNumber: '03', classId: 'c1', section: 'A', contactNumber: '+1 555-0103', email: 'liam.g@school.edu' },
      { id: 'st4', studentId: 'ST-2026-004', name: 'Emma Watson', rollNumber: '04', classId: 'c1', section: 'A', contactNumber: '+1 555-0104', email: 'emma.w@school.edu' },
      
      { id: 'st5', studentId: 'ST-2026-005', name: 'Benjamin Carter', rollNumber: '01', classId: 'c2', section: 'B', contactNumber: '+1 555-0105', email: 'ben.carter@school.edu' },
      { id: 'st6', studentId: 'ST-2026-006', name: 'Olivia Rose', rollNumber: '02', classId: 'c2', section: 'B', contactNumber: '+1 555-0106', email: 'olivia.rose@school.edu' },
      
      { id: 'st7', studentId: 'ST-2026-007', name: 'Ethan Hunt', rollNumber: '01', classId: 'c3', section: 'A', contactNumber: '+1 555-0107', email: 'ethan.hunt@school.edu' },
      { id: 'st8', studentId: 'ST-2026-008', name: 'Ava Duvernay', rollNumber: '02', classId: 'c3', section: 'A', contactNumber: '+1 555-0108', email: 'ava.d@school.edu' },
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

    await this.addLog('Database Seeding', 'Initial system data successfully provisioned for the application demonstration.');
    return true;
  }

  // Clear all database tables
  async resetDatabase(): Promise<void> {
    const db = await this.init();
    const stores = ['students', 'classes', 'subjects', 'attendance', 'sessions', 'logs'];
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
}

export const dbInstance = new SAMSIndexedDB();
