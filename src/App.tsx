/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbInstance } from './database';
import { Student, Class, Subject, AttendanceRecord, AppSettings, ActivityLog } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentsView from './components/StudentsView';
import ClassesView from './components/ClassesView';
import SubjectsView from './components/SubjectsView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
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

export default function App() {
  // DB and Load States
  const [dbReady, setDbReady] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Navigation and UI States
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Undo delete cache
  const [deletedCache, setDeletedCache] = useState<{
    type: 'student' | 'class' | 'subject';
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
      schoolName: 'SAMS Academy',
      schoolLogo: '🎓',
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

  // Fetch all tables from IndexedDB
  const loadAllData = async () => {
    try {
      const s = await dbInstance.getStudents();
      const c = await dbInstance.getClasses();
      const sub = await dbInstance.getSubjects();
      const att = await dbInstance.getAttendance();
      const l = await dbInstance.getLogs();

      setStudents(s);
      setClasses(c);
      setSubjects(sub);
      setAttendance(att);
      setLogs(l);
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

  // --- THEME TOGGLE HELPER ---
  const handleToggleTheme = async () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    await handleSaveSettings({ theme: newTheme });
  };

  // --- SAVE SETTINGS ---
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('sams_settings', JSON.stringify(updated));

    if (newSettings.theme) {
      document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
    }

    await dbInstance.addLog('Settings Configured', 'Institution branded identity settings parameters modified.');
    await loadAllData();
  };

  // --- REGISTER STUDENT ---
  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const newStudent = { id, ...studentData };
      await dbInstance.saveStudent(newStudent);
      await dbInstance.addLog('Student Registered', `Enrolled pupil ${studentData.name} (${studentData.studentId}).`);
      await loadAllData();
      triggerToast('success', `${studentData.name} enrolled in system directory.`);
    } catch (err) {
      triggerToast('error', 'Failed to register student record.');
    }
  };

  // --- EDIT STUDENT ---
  const handleUpdateStudent = async (student: Student) => {
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
    try {
      const student = students.find((s) => s.id === id);
      if (!student) return;

      await dbInstance.deleteStudent(id);
      await dbInstance.addLog('Student Deleted', `Removed pupil ${student.name} from directory.`);
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

  // --- ADD CLASS ---
  const handleAddClass = async (classData: Omit<Class, 'id'>) => {
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
  const handleExportDatabase = () => {
    try {
      const backupData = {
        students,
        classes,
        subjects,
        attendance,
        logs,
        version: '1.0',
        exportedAt: Date.now(),
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      dbInstance.addLog('Database Export', 'Successfully generated and downloaded a complete JSON system backup.');
      triggerToast('success', 'Complete database backup generated successfully.');
    } catch (err) {
      triggerToast('error', 'Failed to generate database backup.');
    }
  };

  // --- JSON DATABASE RESTORE (IMPORT) ---
  const handleImportDatabase = async (file: File): Promise<boolean> => {
    try {
      const reader = new FileReader();
      const loadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
      });

      reader.readAsText(file);
      const jsonStr = await loadPromise;
      const parsed = JSON.parse(jsonStr);

      if (!parsed.students || !parsed.classes || !parsed.subjects || !parsed.attendance) {
        triggerToast('error', 'Restore failed: Missing core tables in backup JSON file.');
        return false;
      }

      // Clear DB and write imported entries
      await dbInstance.resetDatabase();

      for (const st of parsed.students) await dbInstance.saveStudent(st);
      for (const c of parsed.classes) await dbInstance.saveClass(c);
      for (const sub of parsed.subjects) await dbInstance.saveSubject(sub);
      for (const att of parsed.attendance) await dbInstance.saveAttendanceRecord(att);
      
      // Seed audit log
      await dbInstance.addLog('Database Restored', 'System collections populated from imported JSON backup sheet.');
      
      await loadAllData();
      triggerToast('success', 'System databases successfully restored from file backup!');
      return true;
    } catch (err) {
      triggerToast('error', 'Restore failed: File parsing error.');
      return false;
    }
  };

  // --- SYSTEM RESET ---
  const handleResetDatabase = async () => {
    try {
      await dbInstance.resetDatabase();
      localStorage.removeItem('sams_settings');
      setSettings({
        schoolName: 'SAMS Academy',
        schoolLogo: '🎓',
        theme: 'light',
        academicYear: '2026-2027',
      });
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
            classes={classes}
            attendance={attendance}
            logs={logs}
            onNavigate={(tab) => setCurrentTab(tab)}
            triggerBackup={handleExportDatabase}
          />
        );
      case 'students':
        return (
          <StudentsView
            students={students}
            classes={classes}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImportStudents}
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
          />
        );
      case 'subjects':
        return (
          <SubjectsView
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
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
          />
        );
      case 'reports':
        return (
          <ReportsView
            students={students}
            classes={classes}
            subjects={subjects}
            attendance={attendance}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            students={students}
            classes={classes}
            attendance={attendance}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onExportDatabase={handleExportDatabase}
            onImportDatabase={handleImportDatabase}
            onResetDatabase={handleResetDatabase}
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
      />

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-3.5 md:p-5 relative h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
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
