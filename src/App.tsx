/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbInstance } from './database';
import { Student, Class, Subject, AttendanceRecord, AppSettings, ActivityLog, Teacher, Examination, Result, FeeCategory, FeeCharge, Payment, FeeReminder, User, TeacherAssignment, Permission, BackupMetadata, BackupData, ValidationResult, ValidationIssue, RestoreMode, RestorePreview, MergeResult, RestoreResult } from './types';
import { generateStudentQRToken, calculateGrade, calculateFeeBalance as utilCalculateFeeBalance, calculateFeeStatus, generateReceiptNumber, validatePaymentAmount, validateBackup, previewBackup } from './utils';
import { hasPermission, getPermissionDeniedMessage } from './permissions';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentsView from './components/StudentsView';
import TeachersView from './components/TeachersView';
import ClassesView from './components/ClassesView';
import SubjectsView from './components/SubjectsView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import AnnouncementsView from './components/AnnouncementsView';
import ExaminationsView from './components/ExaminationsView';
import MarksEntryView from './components/MarksEntryView';
import ReportCardView from './components/ReportCardView';
import FeesView from './components/FeesView';
import ReceiptView from './components/ReceiptView';
import ParentPortalView from './components/ParentPortalView';
import { RoleSelectorCompact } from './components/RoleSelector';
import { 
  Bell, 
  X, 
  Trash2, 
  Database, 
  History, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateFavicon } from './utils';

export default function App() {
  // DB and Load States
  const [dbReady, setDbReady] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [feeCharges, setFeeCharges] = useState<FeeCharge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [feeReminders, setFeeReminders] = useState<FeeReminder[]>([]);

  // RBAC States
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  // Navigation and UI States
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Examination routing state
  const [selectedExaminationId, setSelectedExaminationId] = useState<string>('');
  const [selectedResultForReport, setSelectedResultForReport] = useState<{ studentId: string; resultId: string } | null>(null);

  // Fee management routing state
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<{ paymentId: string; feeChargeId: string; studentId: string } | null>(null);

  // Undo delete cache
  const [deletedCache, setDeletedCache] = useState<{
    type: 'student' | 'teacher' | 'class' | 'subject';
    data: any;
  } | null>(null);

  // Custom Toasts Queue State
  const [toasts, setToasts] = useState<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    action?: { label: string; onClick: () => void };
  }[]>([]);

  // Application Settings State (LocalStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const cached = localStorage.getItem('sams_settings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Ensure default properties are set
        if (parsed.schoolName && parsed.schoolLogo && parsed.theme && parsed.academicYear) {
          return parsed;
        }
      } catch (e) {
        // Fallback below
      }
    }
    return {
      schoolName: 'SHAAL Academy',
      schoolLogo: '🎓',
      schoolLogoImage: undefined,
      theme: 'light',
      academicYear: '2026-2027'
    };
  });

  // Initialize DB on component mount
  useEffect(() => {
    async function initDB() {
      try {
        await dbInstance.init();
        await dbInstance.seedIfEmpty();
        await loadAllData();
        setDbReady(true);
      } catch (err) {
        console.error('Failed to boot local database:', err);
        triggerToast('error', 'Critical storage failure! IndexedDB blocked.');
      }
    }
    initDB();
  }, []);

  // Update theme class on HTML document on settings load or change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Update favicon when logo changes
  useEffect(() => {
    const logoToUse = settings.schoolLogoImage || settings.schoolLogo;
    updateFavicon(logoToUse);
  }, [settings.schoolLogoImage, settings.schoolLogo]);

  // Fetch all tables from IndexedDB
  const loadAllData = async () => {
    try {
      const s = await dbInstance.getStudents();
      const t = await dbInstance.getTeachers();
      const c = await dbInstance.getClasses();
      const sub = await dbInstance.getSubjects();
      const att = await dbInstance.getAttendance();
      const l = await dbInstance.getLogs();
      const ann = await dbInstance.getAnnouncements();
      const exams = await dbInstance.getExaminations();
      const res = await dbInstance.getResults();
      const feeCats = await dbInstance.getFeeCategories();
      const feeChgs = await dbInstance.getFeeCharges();
      const pmts = await dbInstance.getPayments();
      const feeRems = await dbInstance.getFeeReminders();
      const u = await dbInstance.getUsers();
      const ta = await dbInstance.getTeacherAssignments();

      setStudents(s);
      setTeachers(t);
      setClasses(c);
      setSubjects(sub);
      setAttendance(att);
      setLogs(l);
      setAnnouncements(ann);
      setExaminations(exams);
      setResults(res);
      setFeeCategories(feeCats);
      setFeeCharges(feeChgs);
      setPayments(pmts);
      setFeeReminders(feeRems);
      setUsers(u);
      setTeacherAssignments(ta);
      
      // Auto-select first user if none selected (for prototype convenience)
      if (!currentUser && u.length > 0) {
        setCurrentUser(u[0]);
      }
    } catch (err) {
      console.error('Failed to load active collections:', err);
      triggerToast('error', 'Failed to retrieve active database logs.');
    }
  };

  // --- REUSABLE TOAST TRIGGER ---
  const triggerToast = (
    type: 'success' | 'error' | 'info',
    message: string,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- PERMISSION CHECK HELPER ---
  const checkPermission = (permission: Permission, context?: { classId?: string; subjectId?: string }): boolean => {
    if (!currentUser) {
      triggerToast('error', 'No user selected. Please select a role from the header.');
      return false;
    }

    const hasAccess = hasPermission(currentUser, permission);
    
    if (!hasAccess) {
      triggerToast('error', getPermissionDeniedMessage(permission, currentUser.role));
    }
    
    return hasAccess;
  };

  // --- GET USER CONTEXT FOR AUDIT LOGGING ---
  const getUserContext = () => {
    if (!currentUser) return undefined;
    return {
      userId: currentUser.id,
      userRole: currentUser.role,
      username: currentUser.username
    };
  };

  // --- THEME TOGGLE HELPER ---
  const handleToggleTheme = async () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    await handleSaveSettings({ theme: newTheme });
  };

  // --- SAVE SETTINGS ---
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    if (!checkPermission('manage_settings')) return;

    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('sams_settings', JSON.stringify(updated));

    if (newSettings.theme) {
      document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
    }

    // Update favicon if logo changed
    if (newSettings.schoolLogoImage !== undefined || newSettings.schoolLogo) {
      const logoToUse = newSettings.schoolLogoImage || updated.schoolLogoImage || updated.schoolLogo;
      updateFavicon(logoToUse);
    }

    await dbInstance.addLog('Settings Configured', 'Institution branded identity settings parameters modified.', getUserContext());
    await loadAllData();
  };

  // --- REGISTER STUDENT ---
  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    if (!checkPermission('manage_students')) return;

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newStudent = { id, ...studentData };
      await dbInstance.saveStudent(newStudent);
      await dbInstance.addLog('Student Registered', `Enrolled pupil ${studentData.name} (${studentData.studentId}).`, getUserContext());
      await loadAllData();
      triggerToast('success', `${studentData.name} enrolled in system directory.`);
    } catch (err) {
      triggerToast('error', 'Failed to register student record.');
    }
  };

  // --- EDIT STUDENT ---
  const handleUpdateStudent = async (student: Student) => {
    if (!checkPermission('manage_students')) return;

    try {
      await dbInstance.saveStudent(student);
      await dbInstance.addLog('Student Modified', `Updated log files for student ${student.name}.`);
      await loadAllData();
      triggerToast('success', `${student.name}'s file records updated.`);
    } catch (err) {
      triggerToast('error', 'Failed to update student record.');
    }
  };

  // --- DELETE STUDENT & UNDO CACHE ---
  const handleDeleteStudent = async (id: string) => {
    if (!checkPermission('manage_students')) return;

    try {
      const student = students.find((s) => s.id === id);
      if (!student) return;

      await dbInstance.deleteStudent(id);
      await dbInstance.addLog('Student Deleted', `Removed pupil ${student.name} from directory.`, getUserContext());
      setDeletedCache({ type: 'student', data: student });
      await loadAllData();

      triggerToast('info', `${student.name} removed from roster directory.`, {
        label: 'Undo Delete',
        onClick: handleUndoDelete,
      });
    } catch (err) {
      triggerToast('error', 'Failed to delete student.');
    }
  };

  // --- REISSUE STUDENT DIGITAL CARD (NEW QR TOKEN) ---
  const handleReissueStudentToken = async (studentId: string): Promise<Student | undefined> => {
    try {
      const student = students.find((s) => s.id === studentId);
      if (!student) return undefined;

      const newToken = generateStudentQRToken(student.id);
      const updatedStudent: Student = {
        ...student,
        qrToken: newToken,
        cardIssuedAt: new Date().toISOString().split('T')[0],
      };

      await dbInstance.saveStudent(updatedStudent);
      await dbInstance.addLog(
        'Pass Reissued',
        `Re-generated secure QR token for pupil ${student.name}. Previous physical pass invalidated.`
      );
      await loadAllData();
      triggerToast('success', `New ID pass generated for ${student.name}! Old QR pass is now expired.`);
      return updatedStudent;
    } catch (err) {
      triggerToast('error', 'Failed to reissue student digital pass.');
      return undefined;
    }
  };

  // --- REGISTER TEACHER ---
  const handleAddTeacher = async (teacherData: Omit<Teacher, 'id'>) => {
    if (!checkPermission('manage_teachers')) return;

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newTeacher = { id, ...teacherData };
      await dbInstance.saveTeacher(newTeacher);
      await dbInstance.addLog('Teacher Registered', `Enrolled instructor ${teacherData.name} (${teacherData.teacherId}).`);
      await loadAllData();
      triggerToast('success', `${teacherData.name} enrolled in teacher directory.`);
    } catch (err) {
      triggerToast('error', 'Failed to register teacher record.');
    }
  };

  // --- EDIT TEACHER ---
  const handleUpdateTeacher = async (teacher: Teacher) => {
    if (!checkPermission('manage_teachers')) return;

    try {
      await dbInstance.saveTeacher(teacher);
      await dbInstance.addLog('Teacher Modified', `Updated log files for teacher ${teacher.name}.`);
      await loadAllData();
      triggerToast('success', `${teacher.name}'s file records updated.`);
    } catch (err) {
      triggerToast('error', 'Failed to update teacher record.');
    }
  };

  // --- DELETE TEACHER & UNDO CACHE ---
  const handleDeleteTeacher = async (id: string) => {
    if (!checkPermission('manage_teachers')) return;

    try {
      const teacher = teachers.find((t) => t.id === id);
      if (!teacher) return;

      await dbInstance.deleteTeacher(id);
      await dbInstance.addLog('Teacher Deleted', `Removed instructor ${teacher.name} from directory.`, getUserContext());
      setDeletedCache({ type: 'teacher', data: teacher });
      await loadAllData();

      triggerToast('info', `${teacher.name} removed from roster directory.`, {
        label: 'Undo Delete',
        onClick: handleUndoDelete,
      });
    } catch (err) {
      triggerToast('error', 'Failed to delete teacher.');
    }
  };

  // --- ADD CLASS ---
  const handleAddClass = async (classData: Omit<Class, 'id'>) => {
    if (!checkPermission('manage_classes')) return;

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newClass = { id, ...classData };
      await dbInstance.saveClass(newClass);
      await dbInstance.addLog('Class Registered', `Created Grade Class ${classData.name} - Section ${classData.section}.`);
      await loadAllData();
      triggerToast('success', `${classData.name}-${classData.section} registered successfully.`);
    } catch (err) {
      triggerToast('error', 'Failed to create class room.');
    }
  };

  // --- EDIT CLASS ---
  const handleUpdateClass = async (cls: Class) => {
    if (!checkPermission('manage_classes')) return;

    try {
      await dbInstance.saveClass(cls);
      await dbInstance.addLog('Class Modified', `Updated classroom profile for ${cls.name}-${cls.section}.`);
      await loadAllData();
      triggerToast('success', `${cls.name} classroom profile updated.`);
    } catch (err) {
      triggerToast('error', 'Failed to update class details.');
    }
  };

  // --- DELETE CLASS & CACHE ---
  const handleDeleteClass = async (id: string) => {
    if (!checkPermission('manage_classes')) return;

    try {
      const cls = classes.find((c) => c.id === id);
      if (!cls) return;

      await dbInstance.deleteClass(id);
      await dbInstance.addLog('Class Deleted', `Removed class ${cls.name}-${cls.section} from active directory.`);
      setDeletedCache({ type: 'class', data: cls });
      await loadAllData();

      triggerToast('info', `${cls.name}-${cls.section} removed from records.`, {
        label: 'Undo Delete',
        onClick: handleUndoDelete,
      });
    } catch (err) {
      triggerToast('error', 'Failed to remove class catalog.');
    }
  };

  // --- ADD SUBJECT ---
  const handleAddSubject = async (subjectData: Omit<Subject, 'id'>) => {
    if (!checkPermission('manage_subjects')) return;

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newSubject = { id, ...subjectData };
      await dbInstance.saveSubject(newSubject);
      await dbInstance.addLog('Course Cataloged', `Added subject course ${subjectData.name} (${subjectData.code || 'No Code'}).`);
      await loadAllData();
      triggerToast('success', `${subjectData.name} course cataloged successfully.`);
    } catch (err) {
      triggerToast('error', 'Failed to catalog course.');
    }
  };

  // --- EDIT SUBJECT ---
  const handleUpdateSubject = async (subject: Subject) => {
    if (!checkPermission('manage_subjects')) return;

    try {
      await dbInstance.saveSubject(subject);
      await dbInstance.addLog('Course Modified', `Modified catalog details for course ${subject.name}.`);
      await loadAllData();
      triggerToast('success', `${subject.name} catalog entries updated.`);
    } catch (err) {
      triggerToast('error', 'Failed to update course details.');
    }
  };

  // --- DELETE SUBJECT & CACHE ---
  const handleDeleteSubject = async (id: string) => {
    if (!checkPermission('manage_subjects')) return;

    try {
      const subj = subjects.find((s) => s.id === id);
      if (!subj) return;

      await dbInstance.deleteSubject(id);
      await dbInstance.addLog('Course Deleted', `Removed course ${subj.name} from syllabus catalog.`);
      setDeletedCache({ type: 'subject', data: subj });
      await loadAllData();

      triggerToast('info', `${subj.name} removed from catalog list.`, {
        label: 'Undo Delete',
        onClick: handleUndoDelete,
      });
    } catch (err) {
      triggerToast('error', 'Failed to remove course.');
    }
  };

  // --- SUBMIT DAILY ATTENDANCE SHEET ---
  const handleSaveAttendance = async (records: AttendanceRecord[]) => {
    try {
      await dbInstance.saveAttendanceRecords(records);
      const dateSample = records[0]?.date || 'Today';
      const clObj = classes.find((c) => c.id === records[0]?.classId);
      const sbObj = subjects.find((s) => s.id === records[0]?.subjectId);
      
      const displayDetails = clObj && sbObj 
        ? `${clObj.name}-${clObj.section} for ${sbObj.name}` 
        : 'Roster Sheet';

      await dbInstance.addLog(
        'Attendance Filed',
        `Submitted roster attendance logs for ${displayDetails} on ${dateSample}.`
      );
      await loadAllData();
      triggerToast('success', `Roster attendance successfully submitted for ${dateSample}!`);
    } catch (err) {
      triggerToast('error', 'Failed to submit roster entries.');
    }
  };

  // --- ADD ANNOUNCEMENT ---
  const handleAddAnnouncement = async (announcement: any) => {
    try {
      const id = crypto.randomUUID();
      await dbInstance.saveAnnouncement({ id, ...announcement });
      await dbInstance.addLog('Announcement Posted', `Posted: ${announcement.title}`);
      await loadAllData();
    } catch (err) {
      triggerToast('error', 'Failed to post announcement');
    }
  };

  // --- DELETE ANNOUNCEMENT ---
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await dbInstance.deleteAnnouncement(id);
      await dbInstance.addLog('Announcement Deleted', 'Announcement removed');
      await loadAllData();
      triggerToast('success', 'Announcement deleted');
    } catch (err) {
      triggerToast('error', 'Failed to delete announcement');
    }
  };

  // --- ADD EXAMINATION ---
  const handleAddExamination = async (examinationData: Omit<Examination, 'id'>) => {
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newExamination = { id, ...examinationData };
      await dbInstance.saveExamination(newExamination);
      await dbInstance.addLog('Examination Created', `Created examination ${examinationData.name} for ${examinationData.academicYear}.`);
      await loadAllData();
      triggerToast('success', `${examinationData.name} examination created successfully.`);
    } catch (err) {
      triggerToast('error', 'Failed to create examination.');
    }
  };

  // --- EDIT EXAMINATION ---
  const handleUpdateExamination = async (examination: Examination) => {
    try {
      await dbInstance.saveExamination(examination);
      await dbInstance.addLog('Examination Modified', `Updated examination ${examination.name}.`);
      await loadAllData();
      triggerToast('success', `${examination.name} examination updated.`);
    } catch (err) {
      triggerToast('error', 'Failed to update examination.');
    }
  };

  // --- DELETE EXAMINATION ---
  const handleDeleteExamination = async (id: string) => {
    try {
      const exam = examinations.find((e) => e.id === id);
      if (!exam) return;

      // Check if there are results for this exam
      const examResults = results.filter(r => r.examinationId === id);
      if (examResults.length > 0) {
        if (!confirm(`This examination has ${examResults.length} result(s). Deleting it will also delete all associated results. Continue?`)) {
          return;
        }
        // Delete all associated results
        for (const result of examResults) {
          await dbInstance.deleteResult(result.id);
        }
      }

      await dbInstance.deleteExamination(id);
      await dbInstance.addLog('Examination Deleted', `Removed examination ${exam.name} from records.`);
      await loadAllData();
      triggerToast('success', `${exam.name} examination deleted.`);
    } catch (err) {
      triggerToast('error', 'Failed to delete examination.');
    }
  };

  // --- SAVE RESULT (DRAFT OR PUBLISHED) ---
  const handleSaveResult = async (resultData: Omit<Result, 'id'>) => {
    try {
      // Check if result already exists for this student and examination
      const existing = results.find(
        r => r.studentId === resultData.studentId && r.examinationId === resultData.examinationId && r.classId === resultData.classId
      );

      let resultId: string;
      if (existing) {
        // Update existing result
        resultId = existing.id;
        await dbInstance.saveResult({ id: existing.id, ...resultData });
      } else {
        // Create new result
        resultId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        await dbInstance.saveResult({ id: resultId, ...resultData });
      }

      await loadAllData();
    } catch (err) {
      console.error('Failed to save result:', err);
      throw err;
    }
  };

  // --- PUBLISH RESULTS WITH EMAIL NOTIFICATION ---
  const handlePublishResults = async (examinationId: string, classId: string) => {
    if (!checkPermission('publish_results')) return;

    try {
      const classResults = results.filter(
        r => r.examinationId === examinationId && r.classId === classId && !r.isDraft
      );

      if (classResults.length === 0) {
        triggerToast('error', 'No results to publish.');
        return;
      }

      // Check if EmailJS is configured
      if (!settings.emailJsServiceId || !settings.emailJsTemplateId || !settings.emailJsPublicKey) {
        triggerToast('info', 'Results published! EmailJS not configured - no notifications sent.');
        await dbInstance.addLog(
          'Results Published',
          `Published ${classResults.length} results without email notifications (EmailJS not configured).`
        );
        return;
      }

      // Import EmailJS dynamically
      const emailjs = await import('@emailjs/browser');
      emailjs.init(settings.emailJsPublicKey);

      // Send email notifications to parents
      let sentCount = 0;
      let failedCount = 0;

      for (const result of classResults) {
        const student = students.find(s => s.id === result.studentId);
        if (!student) continue;

        const examination = examinations.find(e => e.id === result.examinationId);
        if (!examination) continue;

        // Check if student has parent email
        const parentEmails = [student.parentEmail, student.secondaryParentEmail].filter(Boolean);
        if (parentEmails.length === 0) continue;

        // Prepare email data
        const emailData = {
          to_email: parentEmails.join(','),
          student_name: student.name,
          exam_name: examination.name,
          total_obtained: result.totalObtained,
          total_marks: result.totalMaxMarks,
          percentage: result.percentage.toFixed(2),
          overall_grade: result.overallGrade,
          school_name: settings.schoolName,
          academic_year: settings.academicYear,
          remarks: result.remarks || 'Keep up the good work!',
        };

        try {
          await emailjs.send(
            settings.emailJsServiceId,
            settings.emailJsTemplateId,
            emailData
          );
          sentCount++;
        } catch (emailErr) {
          console.error('Failed to send email for student:', student.name, emailErr);
          failedCount++;
        }
      }

      await dbInstance.addLog(
        'Results Published',
        `Published ${classResults.length} results. Emails sent: ${sentCount}, Failed: ${failedCount}.`,
        getUserContext()
      );

      if (sentCount > 0) {
        triggerToast('success', `Results published! ${sentCount} email notification(s) sent to parents.`);
      } else {
        triggerToast('info', `Results published! No emails sent (no parent emails configured).`);
      }
    } catch (err) {
      console.error('Failed to publish results:', err);
      await dbInstance.addLog('Results Published', 'Published results without email notifications (email service error).', getUserContext());
      triggerToast('info', 'Results published! Email notifications failed - check EmailJS configuration.');
    }
  };

  // --- FEE CATEGORY MANAGEMENT ---
  const handleAddFeeCategory = async (categoryData: Omit<FeeCategory, 'id'>) => {
    if (!checkPermission('manage_fees')) return;

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newCategory = { id, ...categoryData };
      await dbInstance.saveFeeCategory(newCategory);
      await dbInstance.addLog('Fee Category Created', `Created fee category ${categoryData.name}.`);
      await loadAllData();
      triggerToast('success', `${categoryData.name} fee category created.`);
    } catch (err) {
      triggerToast('error', 'Failed to create fee category.');
    }
  };

  const handleUpdateFeeCategory = async (category: FeeCategory) => {
    if (!checkPermission('manage_fees')) return;

    try {
      await dbInstance.saveFeeCategory(category);
      await dbInstance.addLog('Fee Category Modified', `Updated fee category ${category.name}.`);
      await loadAllData();
      triggerToast('success', `${category.name} fee category updated.`);
    } catch (err) {
      triggerToast('error', 'Failed to update fee category.');
    }
  };

  const handleDeleteFeeCategory = async (id: string) => {
    if (!checkPermission('manage_fees')) return;

    try {
      const category = feeCategories.find((c) => c.id === id);
      if (!category) return;

      // Check if category is used in fee charges
      const usedInCharges = feeCharges.filter(fc => fc.feeCategoryId === id);
      if (usedInCharges.length > 0) {
        if (!confirm(`This category is used in ${usedInCharges.length} fee charge(s). Continue deleting?`)) {
          return;
        }
      }

      await dbInstance.deleteFeeCategory(id);
      await dbInstance.addLog('Fee Category Deleted', `Removed fee category ${category.name}.`, getUserContext());
      await loadAllData();
      triggerToast('success', `${category.name} fee category deleted.`);
    } catch (err) {
      triggerToast('error', 'Failed to delete fee category.');
    }
  };

  // --- FEE CHARGE MANAGEMENT ---
  const handleAddFeeCharge = async (chargeData: Omit<FeeCharge, 'id'>) => {
    if (!checkPermission('manage_fees')) return;

    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newCharge = { id, ...chargeData };
      await dbInstance.saveFeeCharge(newCharge);
      
      const student = students.find(s => s.id === chargeData.studentId);
      await dbInstance.addLog('Fee Charge Created', `Created fee charge for ${student?.name || 'student'} - ${chargeData.categoryName}.`);
      await loadAllData();
      triggerToast('success', `Fee charge created successfully.`);
    } catch (err) {
      triggerToast('error', 'Failed to create fee charge.');
    }
  };

  const handleUpdateFeeCharge = async (charge: FeeCharge) => {
    if (!checkPermission('manage_fees')) return;

    try {
      await dbInstance.saveFeeCharge(charge);
      await dbInstance.addLog('Fee Charge Modified', `Updated fee charge ${charge.categoryName}.`);
      await loadAllData();
      triggerToast('success', `Fee charge updated successfully.`);
    } catch (err) {
      triggerToast('error', 'Failed to update fee charge.');
    }
  };

  const handleDeleteFeeCharge = async (id: string) => {
    if (!checkPermission('manage_fees')) return;

    try {
      const charge = feeCharges.find((c) => c.id === id);
      if (!charge) return;

      // Check if there are payments for this charge
      const chargePayments = payments.filter(p => p.feeChargeId === id);
      if (chargePayments.length > 0) {
        if (!confirm(`This fee charge has ${chargePayments.length} payment(s). Deleting it will also delete all associated payments. Continue?`)) {
          return;
        }
        // Delete all associated payments
        for (const payment of chargePayments) {
          await dbInstance.deletePayment(payment.id);
        }
      }

      await dbInstance.deleteFeeCharge(id);
      await dbInstance.addLog('Fee Charge Deleted', `Removed fee charge ${charge.categoryName}.`);
      await loadAllData();
      triggerToast('success', `Fee charge deleted.`);
    } catch (err) {
      triggerToast('error', 'Failed to delete fee charge.');
    }
  };

  // --- PAYMENT RECORDING ---
  const handleRecordPayment = async (paymentData: Omit<Payment, 'id' | 'receiptNumber'>): Promise<string> => {
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      
      // Get current year's payment count for receipt number generation
      const currentYear = new Date().getFullYear();
      const yearPayments = payments.filter(p => p.receiptNumber.includes(`-${currentYear}-`));
      const sequence = yearPayments.length + 1;
      
      const receiptNumber = generateReceiptNumber('REC', currentYear, sequence);
      
      // Validate payment amount
      const charge = feeCharges.find(c => c.id === paymentData.feeChargeId);
      if (charge) {
        const { balance } = utilCalculateFeeBalance(paymentData.feeChargeId, charge, payments);
        const validation = validatePaymentAmount(paymentData.amount, balance);
        
        if (!validation.valid) {
          triggerToast('error', validation.error || 'Invalid payment amount.');
          throw new Error(validation.error || 'Invalid payment amount');
        }
      }

      const newPayment: Payment = { 
        id, 
        receiptNumber,
        ...paymentData 
      };
      
      await dbInstance.savePayment(newPayment);
      
      // Update fee charge status
      if (charge) {
        const { balance } = utilCalculateFeeBalance(charge.id, charge, [...payments, newPayment]);
        const newStatus = calculateFeeStatus(charge, balance);
        const updatedCharge = { ...charge, status: newStatus };
        await dbInstance.saveFeeCharge(updatedCharge);
      }
      
      const student = students.find(s => s.id === paymentData.studentId);
      await dbInstance.addLog('Payment Recorded', `Recorded payment ${receiptNumber} for ${student?.name || 'student'} - Amount: ${settings.currency || '$'}${paymentData.amount.toFixed(2)}.`);
      await loadAllData();
      triggerToast('success', `Payment recorded successfully! Receipt #${receiptNumber}`);
      
      return receiptNumber;
    } catch (err) {
      console.error('Payment recording error:', err);
      triggerToast('error', 'Failed to record payment.');
      throw err;
    }
  };

  // --- VOID PAYMENT ---
  const handleVoidPayment = async (paymentId: string, voidReason: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      const voidedPayment: Payment = {
        ...payment,
        isVoided: true,
        voidedAt: new Date().toISOString().split('T')[0],
        voidReason,
      };

      await dbInstance.savePayment(voidedPayment);
      
      // Update fee charge status
      const charge = feeCharges.find(c => c.id === payment.feeChargeId);
      if (charge) {
        const remainingPayments = payments.filter(p => p.id !== paymentId);
        const { balance } = utilCalculateFeeBalance(charge.id, charge, remainingPayments);
        const newStatus = calculateFeeStatus(charge, balance);
        const updatedCharge = { ...charge, status: newStatus };
        await dbInstance.saveFeeCharge(updatedCharge);
      }

      await dbInstance.addLog('Payment Voided', `Voided payment ${payment.receiptNumber}. Reason: ${voidReason}`);
      await loadAllData();
      triggerToast('info', `Payment ${payment.receiptNumber} has been voided.`);
    } catch (err) {
      triggerToast('error', 'Failed to void payment.');
    }
  };

  // --- SEND FEE REMINDER ---
  const handleSendFeeReminder = async (studentId: string, feeChargeIds: string[]) => {
    try {
      const student = students.find(s => s.id === studentId);
      
      if (!student) {
        triggerToast('error', 'Student not found.');
        return;
      }

      // Check if EmailJS is configured
      if (!settings.emailJsServiceId || !settings.emailJsTemplateId || !settings.emailJsPublicKey) {
        triggerToast('error', 'EmailJS not configured. Please configure in Settings.');
        return;
      }

      const parentEmails = [student.parentEmail, student.secondaryParentEmail].filter(Boolean);
      if (parentEmails.length === 0) {
        triggerToast('error', 'No parent email configured for this student.');
        return;
      }

      // Gather fee details for all charges
      const feeDetails = feeChargeIds.map(id => {
        const charge = feeCharges.find(c => c.id === id);
        if (!charge) return null;
        const { balance } = utilCalculateFeeBalance(id, charge, payments);
        return {
          category: charge.categoryName,
          period: charge.feePeriod,
          amount: charge.amount,
          discount: charge.discount,
          balance,
          dueDate: charge.dueDate
        };
      }).filter(Boolean);

      if (feeDetails.length === 0) {
        triggerToast('error', 'No valid fee charges found.');
        return;
      }

      // Calculate total balance
      const totalBalance = feeDetails.reduce((sum, fee) => sum + (fee?.balance || 0), 0);

      // Import EmailJS dynamically
      const emailjs = await import('@emailjs/browser');
      emailjs.init(settings.emailJsPublicKey);

      // Create fee list for email
      const feeList = feeDetails.map(fee => 
        `${fee?.category} (${fee?.period}): ${settings.currency || '$'}${fee?.balance.toFixed(2)}`
      ).join('\n');

      const emailData = {
        to_email: parentEmails.join(','),
        parent_name: student.parentName || 'Parent/Guardian',
        student_name: student.name,
        fee_list: feeList,
        total_balance: totalBalance.toFixed(2),
        school_name: settings.schoolName,
        currency: settings.currency || '$',
      };

      await emailjs.send(
        settings.emailJsServiceId,
        settings.emailJsTemplateId,
        emailData
      );

      // Save reminder record
      const reminderId = crypto.randomUUID();
      const reminder: FeeReminder = {
        id: reminderId,
        studentId,
        feeChargeIds,
        sentAt: Date.now(),
        sentTo: parentEmails,
        reminderType: 'general',
        emailStatus: 'sent'
      };
      await dbInstance.saveFeeReminder(reminder);

      await dbInstance.addLog('Fee Reminder Sent', `Sent fee reminder to ${student.name}'s parent(s) for ${feeChargeIds.length} fee charge(s).`);
      await loadAllData();
      triggerToast('success', `Fee reminder sent successfully to ${parentEmails.length} email(s)!`);
    } catch (err) {
      console.error('Fee reminder error:', err);
      triggerToast('error', 'Failed to send fee reminder. Check EmailJS configuration.');
    }
  };

  // --- CALCULATE FEE BALANCE WRAPPER ---
  const calculateFeeBalanceWrapper = (feeChargeId: string) => {
    const charge = feeCharges.find(c => c.id === feeChargeId);
    if (!charge) {
      return { netCharge: 0, totalPaid: 0, balance: 0 };
    }
    return utilCalculateFeeBalance(feeChargeId, charge, payments);
  };

  // --- CSV BATCH IMPORT ---
  const handleImportStudents = async (importedList: Omit<Student, 'id'>[]) => {
    try {
      for (const st of importedList) {
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        await dbInstance.saveStudent({ id, ...st });
      }
      await dbInstance.addLog(
        'Batch CSV Import',
        `Successfully batch registered ${importedList.length} pupil profiles into local directory.`
      );
      await loadAllData();
      triggerToast('success', `Roster imported! ${importedList.length} students enrolled.`);
    } catch (err) {
      triggerToast('error', 'Failed to process batch roster import.');
    }
  };

  // --- ACTIONS UNDO ---
  const handleUndoDelete = async () => {
    if (!deletedCache) return;

    const { type, data } = deletedCache;
    try {
      if (type === 'student') {
        await dbInstance.saveStudent(data);
        await dbInstance.addLog('Action Undone', `Restored deleted pupil ${data.name} to directory.`);
      } else if (type === 'teacher') {
        await dbInstance.saveTeacher(data);
        await dbInstance.addLog('Action Undone', `Restored deleted teacher ${data.name} to directory.`);
      } else if (type === 'class') {
        await dbInstance.saveClass(data);
        await dbInstance.addLog('Action Undone', `Restored deleted class ${data.name}-${data.section}.`);
      } else if (type === 'subject') {
        await dbInstance.saveSubject(data);
        await dbInstance.addLog('Action Undone', `Restored deleted course ${data.name}.`);
      }

      setDeletedCache(null);
      await loadAllData();
      triggerToast('success', 'Roster deletion successfully undone!');
    } catch (err) {
      triggerToast('error', 'Failed to restore deleted record cache.');
    }
  };

  // --- JSON DATABASE BACKUP (EXPORT) ---
  const handleExportDatabase = async (includeAppSettings: boolean = false) => {
    if (!checkPermission('backup_restore')) return;

    try {
      // Fetch all stores from IndexedDB
      const [
        studentsData,
        teachersData,
        classesData,
        subjectsData,
        attendanceData,
        sessionsData,
        logsData,
        settingsData,
        notificationsData,
        homeworkData,
        announcementsData,
        resultsData,
        studentLoginsData,
        examinationsData,
        feeCategoriesData,
        feeChargesData,
        paymentsData,
        feeRemindersData,
        usersData,
        teacherAssignmentsData,
      ] = await Promise.all([
        dbInstance.getStudents(),
        dbInstance.getTeachers(),
        dbInstance.getClasses(),
        dbInstance.getSubjects(),
        dbInstance.getAttendance(),
        dbInstance.getSessions(),
        dbInstance.getLogs(),
        dbInstance.getAllSchools(), // settings store
        dbInstance.getNotifications(),
        dbInstance.getHomework(),
        dbInstance.getAnnouncements(),
        dbInstance.getResults(),
        dbInstance.getStudentLoginRecords(),
        dbInstance.getExaminations(),
        dbInstance.getFeeCategories(),
        dbInstance.getFeeCharges(),
        dbInstance.getPayments(),
        dbInstance.getFeeReminders(),
        dbInstance.getUsers(),
        dbInstance.getTeacherAssignments(),
      ]);

      // Create metadata
      const metadata: BackupMetadata = {
        backupFormatVersion: '2.0',
        appVersion: '1.0.0', // from package.json
        dbSchemaVersion: 8, // Current DB_VERSION
        createdAt: Date.now(),
        recordCounts: {
          students: studentsData.length,
          teachers: teachersData.length,
          classes: classesData.length,
          subjects: subjectsData.length,
          attendance: attendanceData.length,
          sessions: sessionsData.length,
          logs: logsData.length,
          settings: settingsData.length,
          notifications: notificationsData.length,
          homework: homeworkData.length,
          announcements: announcementsData.length,
          results: resultsData.length,
          studentLogins: studentLoginsData.length,
          examinations: examinationsData.length,
          feeCategories: feeCategoriesData.length,
          feeCharges: feeChargesData.length,
          payments: paymentsData.length,
          feeReminders: feeRemindersData.length,
          users: usersData.length,
          teacherAssignments: teacherAssignmentsData.length,
        },
      };

      // Build backup data with all 20 stores
      const backupData: BackupData = {
        metadata,
        students: studentsData,
        teachers: teachersData,
        classes: classesData,
        subjects: subjectsData,
        attendance: attendanceData,
        sessions: sessionsData,
        logs: logsData,
        settings: settingsData,
        notifications: notificationsData,
        homework: homeworkData,
        announcements: announcementsData,
        results: resultsData,
        studentLogins: studentLoginsData,
        examinations: examinationsData,
        feeCategories: feeCategoriesData,
        feeCharges: feeChargesData,
        payments: paymentsData,
        feeReminders: feeRemindersData,
        users: usersData,
        teacherAssignments: teacherAssignmentsData,
        // Legacy format compatibility markers
        version: '1.0',
        exportedAt: Date.now(),
      };

      // Optionally include localStorage settings (with EmailJS credentials)
      if (includeAppSettings) {
        backupData.appSettings = settings;
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      link.download = `SAMS_Backup_v2_${timestamp}.json`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const settingsNote = includeAppSettings ? ' (including app settings)' : '';
      await dbInstance.addLog(
        'Database Export',
        `Complete JSON backup created with ${Object.values(metadata.recordCounts).reduce((a, b) => a + b, 0)} total records across 20 stores${settingsNote}.`,
        getUserContext()
      );
      triggerToast('success', `Backup exported successfully with all ${Object.keys(metadata.recordCounts).length} stores.`);
    } catch (err) {
      console.error('Export failed:', err);
      triggerToast('error', 'Failed to generate database backup.');
    }
  };

  // --- JSON DATABASE RESTORE (IMPORT) - REPLACE MODE ---
  const handleImportDatabase = async (
    file: File,
    restoreAppSettings: boolean = false,
    createRecoveryBackup: boolean = true
  ): Promise<RestoreResult> => {
    if (!checkPermission('backup_restore')) {
      return {
        success: false,
        mode: 'replace',
        recordsRestored: 0,
        errors: ['Permission denied: backup_restore permission required.'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let recordsRestored = 0;
    let recoveryBackupData: any = null;

    try {
      // Step 1: Read and validate file
      const reader = new FileReader();
      const loadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
      });

      reader.readAsText(file);
      const jsonStr = await loadPromise;

      // Step 2: Validate backup before any modifications
      const validation = validateBackup(jsonStr);
      
      if (!validation.isValid) {
        const errorMessages = validation.issues
          .filter(i => i.severity === 'error')
          .map(i => i.message);
        
        return {
          success: false,
          mode: 'replace',
          recordsRestored: 0,
          errors: ['Validation failed. Cannot restore invalid backup.', ...errorMessages],
          warnings: validation.issues.filter(i => i.severity === 'warning').map(i => i.message),
        };
      }

      const parsed = JSON.parse(jsonStr);

      // Step 3: Create recovery backup of current data (if requested)
      if (createRecoveryBackup) {
        try {
          const [
            currentStudents,
            currentTeachers,
            currentClasses,
            currentSubjects,
            currentAttendance,
            currentSessions,
            currentLogs,
            currentSettings,
            currentNotifications,
            currentHomework,
            currentAnnouncements,
            currentResults,
            currentStudentLogins,
            currentExaminations,
            currentFeeCategories,
            currentFeeCharges,
            currentPayments,
            currentFeeReminders,
            currentUsers,
            currentTeacherAssignments,
          ] = await Promise.all([
            dbInstance.getStudents(),
            dbInstance.getTeachers(),
            dbInstance.getClasses(),
            dbInstance.getSubjects(),
            dbInstance.getAttendance(),
            dbInstance.getSessions(),
            dbInstance.getLogs(),
            dbInstance.getAllSchools(),
            dbInstance.getNotifications(),
            dbInstance.getHomework(),
            dbInstance.getAnnouncements(),
            dbInstance.getResults(),
            dbInstance.getStudentLoginRecords(),
            dbInstance.getExaminations(),
            dbInstance.getFeeCategories(),
            dbInstance.getFeeCharges(),
            dbInstance.getPayments(),
            dbInstance.getFeeReminders(),
            dbInstance.getUsers(),
            dbInstance.getTeacherAssignments(),
          ]);

          recoveryBackupData = {
            metadata: {
              backupFormatVersion: '2.0',
              appVersion: '1.0.0',
              dbSchemaVersion: 8,
              createdAt: Date.now(),
              recordCounts: {
                students: currentStudents.length,
                teachers: currentTeachers.length,
                classes: currentClasses.length,
                subjects: currentSubjects.length,
                attendance: currentAttendance.length,
                sessions: currentSessions.length,
                logs: currentLogs.length,
                settings: currentSettings.length,
                notifications: currentNotifications.length,
                homework: currentHomework.length,
                announcements: currentAnnouncements.length,
                results: currentResults.length,
                studentLogins: currentStudentLogins.length,
                examinations: currentExaminations.length,
                feeCategories: currentFeeCategories.length,
                feeCharges: currentFeeCharges.length,
                payments: currentPayments.length,
                feeReminders: currentFeeReminders.length,
                users: currentUsers.length,
                teacherAssignments: currentTeacherAssignments.length,
              },
            },
            students: currentStudents,
            teachers: currentTeachers,
            classes: currentClasses,
            subjects: currentSubjects,
            attendance: currentAttendance,
            sessions: currentSessions,
            logs: currentLogs,
            settings: currentSettings,
            notifications: currentNotifications,
            homework: currentHomework,
            announcements: currentAnnouncements,
            results: currentResults,
            studentLogins: currentStudentLogins,
            examinations: currentExaminations,
            feeCategories: currentFeeCategories,
            feeCharges: currentFeeCharges,
            payments: currentPayments,
            feeReminders: currentFeeReminders,
            users: currentUsers,
            teacherAssignments: currentTeacherAssignments,
          };

          // Auto-download recovery backup
          const recoveryJson = JSON.stringify(recoveryBackupData, null, 2);
          const blob = new Blob([recoveryJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          link.download = `SAMS_Recovery_Before_Restore_${timestamp}.json`;
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          warnings.push('Recovery backup created and downloaded automatically.');
        } catch (err) {
          warnings.push('Failed to create recovery backup, but continuing with restore.');
        }
      }

      // Step 4: Clear database (transaction-safe)
      try {
        await dbInstance.resetDatabase();
      } catch (err) {
        errors.push('Failed to clear database. Restore aborted.');
        return {
          success: false,
          mode: 'replace',
          recordsRestored: 0,
          errors,
          warnings,
        };
      }

      // Step 5: Restore all stores with transaction-safe approach
      // Restore in order of dependencies (classes before students, etc.)
      try {
        // Core entities first
        if (parsed.classes) {
          for (const item of parsed.classes) {
            await dbInstance.saveClass(item);
            recordsRestored++;
          }
        }

        if (parsed.subjects) {
          for (const item of parsed.subjects) {
            await dbInstance.saveSubject(item);
            recordsRestored++;
          }
        }

        if (parsed.sessions) {
          for (const item of parsed.sessions) {
            await dbInstance.saveSession(item);
            recordsRestored++;
          }
        }

        // Teachers and students
        if (parsed.teachers) {
          for (const item of parsed.teachers) {
            await dbInstance.saveTeacher(item);
            recordsRestored++;
          }
        }

        if (parsed.students) {
          for (const item of parsed.students) {
            await dbInstance.saveStudent(item);
            recordsRestored++;
          }
        }

        // Dependent data
        if (parsed.attendance) {
          for (const item of parsed.attendance) {
            await dbInstance.saveAttendanceRecord(item);
            recordsRestored++;
          }
        }

        if (parsed.examinations) {
          for (const item of parsed.examinations) {
            await dbInstance.saveExamination(item);
            recordsRestored++;
          }
        }

        if (parsed.results) {
          for (const item of parsed.results) {
            await dbInstance.saveResult(item);
            recordsRestored++;
          }
        }

        if (parsed.homework) {
          for (const item of parsed.homework) {
            await dbInstance.saveHomework(item);
            recordsRestored++;
          }
        }

        if (parsed.announcements) {
          for (const item of parsed.announcements) {
            await dbInstance.saveAnnouncement(item);
            recordsRestored++;
          }
        }

        if (parsed.notifications) {
          for (const item of parsed.notifications) {
            await dbInstance.saveNotification(item);
            recordsRestored++;
          }
        }

        if (parsed.studentLogins) {
          for (const item of parsed.studentLogins) {
            await dbInstance.saveStudentLoginRecord(item);
            recordsRestored++;
          }
        }

        // Fee management
        if (parsed.feeCategories) {
          for (const item of parsed.feeCategories) {
            await dbInstance.saveFeeCategory(item);
            recordsRestored++;
          }
        }

        if (parsed.feeCharges) {
          for (const item of parsed.feeCharges) {
            await dbInstance.saveFeeCharge(item);
            recordsRestored++;
          }
        }

        if (parsed.payments) {
          for (const item of parsed.payments) {
            await dbInstance.savePayment(item);
            recordsRestored++;
          }
        }

        if (parsed.feeReminders) {
          for (const item of parsed.feeReminders) {
            await dbInstance.saveFeeReminder(item);
            recordsRestored++;
          }
        }

        // RBAC
        if (parsed.users) {
          for (const item of parsed.users) {
            await dbInstance.saveUser(item);
            recordsRestored++;
          }
        }

        if (parsed.teacherAssignments) {
          for (const item of parsed.teacherAssignments) {
            await dbInstance.saveTeacherAssignment(item);
            recordsRestored++;
          }
        }

        // Settings store (IndexedDB, not localStorage)
        if (parsed.settings) {
          for (const item of parsed.settings) {
            await dbInstance.saveSettings(item, item.id || 'default');
            recordsRestored++;
          }
        }

        // Logs last
        if (parsed.logs) {
          for (const item of parsed.logs) {
            // Skip adding logs directly, will add one restore log instead
          }
        }

      } catch (err) {
        errors.push(`Restore partially failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        errors.push('Database may be in an inconsistent state. Consider restoring from recovery backup.');
        
        return {
          success: false,
          mode: 'replace',
          recordsRestored,
          errors,
          warnings,
        };
      }

      // Step 6: Restore localStorage settings if requested
      if (restoreAppSettings && parsed.appSettings) {
        try {
          localStorage.setItem('sams_settings', JSON.stringify(parsed.appSettings));
          setSettings(parsed.appSettings);
          if (parsed.appSettings.schoolLogo) {
            updateFavicon(parsed.appSettings.schoolLogo);
          }
          warnings.push('Application settings (including EmailJS credentials) restored from backup.');
        } catch (err) {
          warnings.push('Failed to restore application settings from backup.');
        }
      }

      // Step 7: Add restore log
      await dbInstance.addLog(
        'Database Restored',
        `Successfully restored ${recordsRestored} records from backup file (${validation.detectedFormatVersion} format).`,
        getUserContext()
      );

      // Step 8: Reload application data
      await loadAllData();

      triggerToast('success', `Database restored successfully! ${recordsRestored} records imported.`);

      return {
        success: true,
        mode: 'replace',
        recordsRestored,
        errors,
        warnings,
      };

    } catch (err) {
      errors.push(`Unexpected error during restore: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      return {
        success: false,
        mode: 'replace',
        recordsRestored,
        errors,
        warnings,
      };
    }
  };

  // --- JSON DATABASE MERGE (IMPORT) - MERGE MODE ---
  const handleMergeBackup = async (
    file: File,
    mergeAppSettings: boolean = false
  ): Promise<RestoreResult> => {
    if (!checkPermission('backup_restore')) {
      return {
        success: false,
        mode: 'merge',
        recordsRestored: 0,
        errors: ['Permission denied: backup_restore permission required.'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let recordsRestored = 0;
    const mergeResult: MergeResult = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      conflicts: [],
    };

    try {
      // Step 1: Read and validate file
      const reader = new FileReader();
      const loadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
      });

      reader.readAsText(file);
      const jsonStr = await loadPromise;

      // Step 2: Validate backup
      const validation = validateBackup(jsonStr);
      
      if (!validation.isValid) {
        const errorMessages = validation.issues
          .filter(i => i.severity === 'error')
          .map(i => i.message);
        
        return {
          success: false,
          mode: 'merge',
          recordsRestored: 0,
          mergeResult,
          errors: ['Validation failed. Cannot merge invalid backup.', ...errorMessages],
          warnings: validation.issues.filter(i => i.severity === 'warning').map(i => i.message),
        };
      }

      const parsed = JSON.parse(jsonStr);

      // Step 3: Get current data from database
      const [
        currentStudents,
        currentTeachers,
        currentClasses,
        currentSubjects,
        currentAttendance,
        currentSessions,
        currentNotifications,
        currentHomework,
        currentAnnouncements,
        currentResults,
        currentStudentLogins,
        currentExaminations,
        currentFeeCategories,
        currentFeeCharges,
        currentPayments,
        currentFeeReminders,
        currentUsers,
        currentTeacherAssignments,
      ] = await Promise.all([
        dbInstance.getStudents(),
        dbInstance.getTeachers(),
        dbInstance.getClasses(),
        dbInstance.getSubjects(),
        dbInstance.getAttendance(),
        dbInstance.getSessions(),
        dbInstance.getNotifications(),
        dbInstance.getHomework(),
        dbInstance.getAnnouncements(),
        dbInstance.getResults(),
        dbInstance.getStudentLoginRecords(),
        dbInstance.getExaminations(),
        dbInstance.getFeeCategories(),
        dbInstance.getFeeCharges(),
        dbInstance.getPayments(),
        dbInstance.getFeeReminders(),
        dbInstance.getUsers(),
        dbInstance.getTeacherAssignments(),
      ]);

      // Helper function to merge a store
      const mergeStore = async (
        storeName: string,
        backupRecords: any[],
        currentRecords: any[],
        saveFunction: (record: any) => Promise<void>,
        compareFields?: string[] // Fields to check for conflicts beyond ID
      ) => {
        if (!backupRecords || !Array.isArray(backupRecords)) return;

        const currentIds = new Set(currentRecords.map(r => r.id));
        
        for (const record of backupRecords) {
          try {
            if (currentIds.has(record.id)) {
              // ID exists - update (overwrite with backup data)
              const existingRecord = currentRecords.find(r => r.id === record.id);
              
              // Check for conflicts if compareFields specified
              if (compareFields && existingRecord) {
                let hasConflict = false;
                for (const field of compareFields) {
                  if (existingRecord[field] !== record[field]) {
                    hasConflict = true;
                    break;
                  }
                }
                
                if (hasConflict) {
                  mergeResult.conflicts.push({
                    store: storeName,
                    recordId: record.id,
                    existingRecord,
                    incomingRecord: record,
                    reason: `Conflicting values in fields: ${compareFields.join(', ')}`,
                  });
                }
              }
              
              await saveFunction(record);
              mergeResult.updated++;
              recordsRestored++;
            } else {
              // New ID - insert
              await saveFunction(record);
              mergeResult.inserted++;
              recordsRestored++;
            }
          } catch (err) {
            errors.push(`Failed to merge record ${record.id} in ${storeName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            mergeResult.skipped++;
          }
        }
      };

      // Step 4: Merge all stores (in dependency order)
      try {
        // Core entities
        await mergeStore('classes', parsed.classes, currentClasses, 
          (r) => dbInstance.saveClass(r), ['name', 'section']);
        
        await mergeStore('subjects', parsed.subjects, currentSubjects, 
          (r) => dbInstance.saveSubject(r), ['name']);
        
        await mergeStore('sessions', parsed.sessions, currentSessions, 
          (r) => dbInstance.saveSession(r), ['name', 'isActive']);

        // Teachers and Students
        await mergeStore('teachers', parsed.teachers, currentTeachers, 
          (r) => dbInstance.saveTeacher(r), ['teacherId', 'name', 'email']);
        
        await mergeStore('students', parsed.students, currentStudents, 
          (r) => dbInstance.saveStudent(r), ['studentId', 'name', 'classId']);

        // Dependent data
        await mergeStore('attendance', parsed.attendance, currentAttendance, 
          (r) => dbInstance.saveAttendanceRecord(r));
        
        await mergeStore('examinations', parsed.examinations, currentExaminations, 
          (r) => dbInstance.saveExamination(r), ['name', 'examDate']);
        
        await mergeStore('results', parsed.results, currentResults, 
          (r) => dbInstance.saveResult(r), ['studentId', 'examinationId']);
        
        await mergeStore('homework', parsed.homework, currentHomework, 
          (r) => dbInstance.saveHomework(r));
        
        await mergeStore('announcements', parsed.announcements, currentAnnouncements, 
          (r) => dbInstance.saveAnnouncement(r));
        
        await mergeStore('notifications', parsed.notifications, currentNotifications, 
          (r) => dbInstance.saveNotification(r));
        
        await mergeStore('studentLogins', parsed.studentLogins, currentStudentLogins, 
          (r) => dbInstance.saveStudentLoginRecord(r));

        // Fee management
        await mergeStore('feeCategories', parsed.feeCategories, currentFeeCategories, 
          (r) => dbInstance.saveFeeCategory(r), ['name']);
        
        await mergeStore('feeCharges', parsed.feeCharges, currentFeeCharges, 
          (r) => dbInstance.saveFeeCharge(r), ['studentId', 'categoryId', 'amount']);
        
        await mergeStore('payments', parsed.payments, currentPayments, 
          (r) => dbInstance.savePayment(r), ['receiptNumber', 'feeChargeId']);
        
        await mergeStore('feeReminders', parsed.feeReminders, currentFeeReminders, 
          (r) => dbInstance.saveFeeReminder(r));

        // RBAC
        await mergeStore('users', parsed.users, currentUsers, 
          (r) => dbInstance.saveUser(r), ['username', 'role']);
        
        await mergeStore('teacherAssignments', parsed.teacherAssignments, currentTeacherAssignments, 
          (r) => dbInstance.saveTeacherAssignment(r), ['teacherId', 'classId', 'subjectId']);

      } catch (err) {
        errors.push(`Merge operation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        return {
          success: false,
          mode: 'merge',
          recordsRestored,
          mergeResult,
          errors,
          warnings,
        };
      }

      // Step 5: Merge localStorage settings if requested
      if (mergeAppSettings && parsed.appSettings) {
        try {
          const currentSettings = settings;
          const mergedSettings = { ...currentSettings, ...parsed.appSettings };
          localStorage.setItem('sams_settings', JSON.stringify(mergedSettings));
          setSettings(mergedSettings);
          if (mergedSettings.schoolLogo) {
            updateFavicon(mergedSettings.schoolLogo);
          }
          warnings.push('Application settings merged with backup data.');
        } catch (err) {
          warnings.push('Failed to merge application settings.');
        }
      }

      // Step 6: Add merge log
      await dbInstance.addLog(
        'Database Merged',
        `Merged backup data: ${mergeResult.inserted} inserted, ${mergeResult.updated} updated, ${mergeResult.skipped} skipped, ${mergeResult.conflicts.length} conflicts detected.`,
        getUserContext()
      );

      // Step 7: Reload application data
      await loadAllData();

      if (mergeResult.conflicts.length > 0) {
        warnings.push(`${mergeResult.conflicts.length} conflicts detected during merge. Backup data took precedence.`);
      }

      triggerToast('success', `Backup merged successfully! ${mergeResult.inserted} new, ${mergeResult.updated} updated.`);

      return {
        success: true,
        mode: 'merge',
        recordsRestored,
        mergeResult,
        errors,
        warnings,
      };

    } catch (err) {
      errors.push(`Unexpected error during merge: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      return {
        success: false,
        mode: 'merge',
        recordsRestored,
        mergeResult,
        errors,
        warnings,
      };
    }
  };

  // --- SYSTEM RESET ---
  const handleResetDatabase = async () => {
    if (!checkPermission('backup_restore')) return;

    try {
      await dbInstance.resetDatabase();
      localStorage.removeItem('sams_settings');
      const defaultSettings = {
        schoolName: 'SHAAL Academy',
        schoolLogo: '🎓',
        schoolLogoImage: undefined,
        theme: 'light' as const,
        academicYear: '2026-2027',
      };
      setSettings(defaultSettings);
      updateFavicon(defaultSettings.schoolLogo);
      await dbInstance.seedIfEmpty();
      await loadAllData();
      triggerToast('success', 'System tables purged and reset to standard demonstration values.');
    } catch (err) {
      triggerToast('error', 'Failed to purge database stores.');
    }
  };

  // --- RENDER ROUTER CONTROLLER ---
  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            students={students}
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            attendance={attendance}
            logs={logs}
            announcements={announcements}
            examinations={examinations}
            results={results}
            feeCharges={feeCharges}
            payments={payments}
            onNavigate={(tab) => setCurrentTab(tab)}
            triggerBackup={handleExportDatabase}
          />
        );
      case 'students':
        return (
          <StudentsView
            students={students}
            classes={classes}
            settings={settings}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImportStudents}
            onReissueToken={handleReissueStudentToken}
            onNavigate={(tab) => setCurrentTab(tab)}
            currentUser={currentUser}
            teacherAssignments={teacherAssignments}
          />
        );
      case 'teachers':
        return (
          <TeachersView
            teachers={teachers}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'classes':
        return (
          <ClassesView
            classes={classes}
            students={students}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'subjects':
        return (
          <SubjectsView
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'attendance':
        return (
          <AttendanceView
            students={students}
            classes={classes}
            subjects={subjects}
            attendance={attendance}
            onSaveAttendance={handleSaveAttendance}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'reports':
        return (
          <ReportsView
            students={students}
            classes={classes}
            subjects={subjects}
            attendance={attendance}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            students={students}
            classes={classes}
            attendance={attendance}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'announcements':
        return (
          <AnnouncementsView
            announcements={announcements}
            students={students}
            classes={classes}
            settings={settings}
            onAddAnnouncement={handleAddAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            triggerToast={triggerToast}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onExportDatabase={handleExportDatabase}
            onImportDatabase={handleImportDatabase}
            onMergeBackup={handleMergeBackup}
            onResetDatabase={handleResetDatabase}
            onNavigate={(tab) => setCurrentTab(tab)}
            currentUser={currentUser}
          />
        );
      case 'parent-portal':
        return (
          <ParentPortalView
            students={students}
            classes={classes}
            subjects={subjects}
            attendance={attendance}
            results={results}
            examinations={examinations}
            announcements={announcements}
            feeCharges={feeCharges}
            payments={payments}
            feeCategories={feeCategories}
            settings={settings}
          />
        );
      case 'examinations':
        return (
          <ExaminationsView
            examinations={examinations}
            classes={classes}
            subjects={subjects}
            academicYear={settings.academicYear}
            onAddExamination={handleAddExamination}
            onUpdateExamination={handleUpdateExamination}
            onDeleteExamination={handleDeleteExamination}
            onNavigate={(tab) => setCurrentTab(tab)}
            onNavigateToMarks={(examId) => {
              setSelectedExaminationId(examId);
              setCurrentTab('marks');
            }}
          />
        );
      case 'marks':
        return (
          <MarksEntryView
            examinations={examinations}
            results={results}
            students={students}
            classes={classes}
            subjects={subjects}
            onSaveResult={handleSaveResult}
            onPublishResults={handlePublishResults}
            onNavigate={(tab) => setCurrentTab(tab)}
            onViewReportCard={(studentId, resultId) => {
              setSelectedResultForReport({ studentId, resultId });
              setCurrentTab('reportcard');
            }}
            calculateGrade={calculateGrade}
          />
        );
      case 'reportcard':
        if (!selectedResultForReport) {
          return <div className="p-8 text-center">No report card selected</div>;
        }
        const selectedResult = results.find(r => r.id === selectedResultForReport.resultId);
        const selectedStudent = students.find(s => s.id === selectedResultForReport.studentId);
        const selectedExam = selectedResult ? examinations.find(e => e.id === selectedResult.examinationId) : undefined;
        
        if (!selectedResult || !selectedStudent || !selectedExam) {
          return <div className="p-8 text-center">Report card data not found</div>;
        }
        
        return (
          <ReportCardView
            result={selectedResult}
            student={selectedStudent}
            examination={selectedExam}
            settings={settings}
            classes={classes}
            onNavigate={(tab) => setCurrentTab(tab)}
            calculateGrade={calculateGrade}
          />
        );
      case 'fees':
        return (
          <FeesView
            feeCategories={feeCategories}
            feeCharges={feeCharges}
            payments={payments}
            students={students}
            settings={settings}
            onAddFeeCategory={handleAddFeeCategory}
            onUpdateFeeCategory={handleUpdateFeeCategory}
            onDeleteFeeCategory={handleDeleteFeeCategory}
            onAddFeeCharge={handleAddFeeCharge}
            onUpdateFeeCharge={handleUpdateFeeCharge}
            onDeleteFeeCharge={handleDeleteFeeCharge}
            onRecordPayment={handleRecordPayment}
            onVoidPayment={handleVoidPayment}
            onSendFeeReminder={handleSendFeeReminder}
            calculateFeeBalance={calculateFeeBalanceWrapper}
            onNavigate={(tab) => setCurrentTab(tab)}
            onViewReceipt={(paymentId) => {
              const payment = payments.find(p => p.id === paymentId);
              if (payment) {
                setSelectedPaymentForReceipt({ 
                  paymentId, 
                  feeChargeId: payment.feeChargeId, 
                  studentId: payment.studentId 
                });
                setCurrentTab('receipt');
              }
            }}
          />
        );
      case 'receipt':
        if (!selectedPaymentForReceipt) {
          return <div className="p-8 text-center">No receipt selected</div>;
        }
        const selectedPayment = payments.find(p => p.id === selectedPaymentForReceipt.paymentId);
        const selectedFeeCharge = feeCharges.find(fc => fc.id === selectedPaymentForReceipt.feeChargeId);
        const receiptStudent = students.find(s => s.id === selectedPaymentForReceipt.studentId);
        
        if (!selectedPayment || !selectedFeeCharge || !receiptStudent) {
          return <div className="p-8 text-center">Receipt data not found</div>;
        }
        
        return (
          <ReceiptView
            payment={selectedPayment}
            feeCharge={selectedFeeCharge}
            student={receiptStudent}
            settings={settings}
            onNavigate={(tab) => setCurrentTab(tab)}
            calculateFeeBalance={calculateFeeBalanceWrapper}
          />
        );
      default:
        return <div className="p-8 text-center">Section under development</div>;
    }
  };

  // Loading Splash Screen
  if (!dbReady) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-100 z-50">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">🎓</div>
          <h1 className="font-sans font-bold text-lg tracking-wide">Student Attendance System</h1>
          <p className="font-sans text-xs text-slate-400 font-medium">Booting offline-first secure IndexedDB engine...</p>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto mt-2">
            <div className="h-full bg-indigo-500 animate-[pulse_1.5s_infinite] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${
      settings.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* SIDEBAR PANEL */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        settings={settings}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        unreadNotifications={logs.length}
        onOpenNotifications={() => setNotificationsOpen(true)}
        toggleTheme={handleToggleTheme}
        currentUser={currentUser}
        teacherAssignments={teacherAssignments}
      />

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        {/* Role Selector Header (Local Prototype) */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-3.5 md:px-5 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {settings.schoolName || 'SAMS School'}
              </h1>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {settings.academicYear}
              </span>
            </div>
            <RoleSelectorCompact
              currentUser={currentUser}
              availableUsers={users}
              onUserChange={(user) => {
                setCurrentUser(user);
                // Navigate to appropriate default tab for role
                if (user.role === 'parent') {
                  setCurrentTab('parent-portal');
                } else if (user.role === 'teacher') {
                  setCurrentTab('attendance');
                } else {
                  setCurrentTab('dashboard');
                }
              }}
            />
          </div>
        </div>

        <div className="p-3.5 md:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* TOAST SYSTEM ALERTS QUEUE */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-full p-4 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200/50 dark:border-slate-800/80 flex items-start gap-3 justify-between"
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                  toast.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : toast.type === 'error' 
                    ? 'bg-rose-500/10 text-rose-500' 
                    : 'bg-indigo-500/10 text-indigo-500'
                }`}>
                  {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                </div>
                <div>
                  <p className="font-sans text-xs font-semibold text-slate-800 dark:text-slate-100 leading-normal">
                    {toast.message}
                  </p>
                  {toast.action && (
                    <button
                      onClick={() => {
                        toast.action?.onClick();
                        removeToast(toast.id);
                      }}
                      className="mt-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SLIDE-OUT DRAWER: ACTIVITY LOGS */}
      <AnimatePresence>
        {notificationsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotificationsOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 relative z-10 shadow-2xl flex flex-col h-full"
            >
              <button
                onClick={() => setNotificationsOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-base">Activity Auditing Logs</h3>
                  <p className="font-sans text-[11px] text-slate-400 dark:text-slate-500">Chronological history of roster actions</p>
                </div>
              </div>

              {/* Logs List scrollable area */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {logs.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-20 font-sans">No administrative actions logged.</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs p-3.5 border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl"
                    >
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase font-sans tracking-wide text-[10px] bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          {log.action}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-sans text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-1.5">
                        {log.details}
                      </p>
                      <span className="font-mono text-[8px] text-slate-400 dark:text-slate-500 block text-right mt-1.5 uppercase">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
