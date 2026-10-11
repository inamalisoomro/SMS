/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Parent Portal Preview - LOCAL DEVELOPMENT ONLY
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * This is a LOCAL PREVIEW for development and testing purposes only.
 * It uses browser-local IndexedDB data and has NO real authentication.
 * 
 * For production use, you MUST implement:
 * - Secure backend with shared database
 * - Real authentication (OAuth, SSO, etc.)
 * - Parent-child relationship verification
 * - Session management and authorization
 * - Encrypted data transmission (HTTPS)
 * - Access control and audit logging
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Calendar,
  BookOpen,
  FileText,
  Award,
  DollarSign,
  Megaphone,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  GraduationCap,
  Phone,
  Mail,
  Hash,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import {
  Student,
  Class,
  Subject,
  AttendanceRecord,
  Result,
  Examination,
  AppSettings,
  FeeCharge,
  Payment,
  FeeCategory
} from '../types';
import { getAttendanceStats, calculateFeeBalance, calculateGrade } from '../utils';

interface ParentPortalViewProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  results: Result[];
  examinations: Examination[];
  announcements: any[];
  feeCharges: FeeCharge[];
  payments: Payment[];
  feeCategories: FeeCategory[];
  settings: AppSettings;
}

export default function ParentPortalView({
  students,
  classes,
  subjects,
  attendance,
  results,
  examinations,
  announcements,
  feeCharges,
  payments,
  feeCategories,
  settings
}: ParentPortalViewProps) {
  // Selected student (simulating parent viewing their child)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showSecurityWarning, setShowSecurityWarning] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'attendance' | 'results' | 'announcements' | 'fees'>('overview');

  // Date range for attendance
  const [attendanceDateRange, setAttendanceDateRange] = useState<'all' | '7days' | '30days' | 'month'>('30days');

  // Get selected student
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Get student's class
  const studentClass = useMemo(() => {
    if (!selectedStudent) return null;
    return classes.find(c => c.id === selectedStudent.classId);
  }, [selectedStudent, classes]);

  // Filter attendance by date range
  const filteredAttendance = useMemo(() => {
    if (!selectedStudent) return [];
    
    const studentAttendance = attendance.filter(a => a.studentId === selectedStudent.id);
    
    if (attendanceDateRange === 'all') return studentAttendance;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    if (attendanceDateRange === '7days') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (attendanceDateRange === '30days') {
      cutoffDate.setDate(now.getDate() - 30);
    } else if (attendanceDateRange === 'month') {
      cutoffDate.setMonth(now.getMonth());
      cutoffDate.setDate(1);
    }
    
    return studentAttendance.filter(a => {
      const attDate = new Date(a.date + 'T00:00:00');
      return attDate >= cutoffDate;
    });
  }, [selectedStudent, attendance, attendanceDateRange]);

  // Get attendance statistics
  const attendanceStats = useMemo(() => {
    return getAttendanceStats(filteredAttendance);
  }, [filteredAttendance]);

  // Get published results only (no drafts)
  const publishedResults = useMemo(() => {
    if (!selectedStudent) return [];
    return results.filter(r => r.studentId === selectedStudent.id && !r.isDraft)
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  }, [selectedStudent, results]);

  // Get relevant announcements (class-specific or all)
  const relevantAnnouncements = useMemo(() => {
    if (!selectedStudent) return [];
    
    return announcements.filter(ann => {
      // Show 'all' announcements
      if (ann.targetAudience === 'all') return true;
      
      // Show class-specific announcements if student's class is targeted
      if (ann.targetAudience === 'specific_classes' || ann.targetAudience === 'class') {
        return ann.targetClassIds?.includes(selectedStudent.classId);
      }
      
      return false;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedStudent, announcements]);

  // Get fee information
  const studentFeeCharges = useMemo(() => {
    if (!selectedStudent) return [];
    return feeCharges.filter(fc => fc.studentId === selectedStudent.id)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [selectedStudent, feeCharges]);

  const totalOutstanding = useMemo(() => {
    return studentFeeCharges.reduce((sum, charge) => {
      const { balance } = calculateFeeBalance(charge.id, charge, payments);
      return sum + balance;
    }, 0);
  }, [studentFeeCharges, payments]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get subject name
  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  // Section navigation items
  const sections = [
    { id: 'overview' as const, label: 'Overview', icon: User },
    { id: 'attendance' as const, label: 'Attendance', icon: Calendar },
    { id: 'results' as const, label: 'Results', icon: Award },
    { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
    { id: 'fees' as const, label: 'Fees', icon: DollarSign }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* SECURITY WARNING BANNER */}
      {showSecurityWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-sans font-bold text-amber-900 dark:text-amber-100 text-sm mb-1 flex items-center gap-2">
                <Lock size={14} />
                Local Preview Only - Not Production Ready
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                This is a <strong>development preview</strong> using browser-local data only. It does NOT have secure authentication
                and cannot be accessed from other devices. Parents on their own devices cannot use this view.
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                <strong>For production deployment, you MUST implement:</strong>
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 ml-4 mb-2">
                <li>• Secure backend with shared database (not IndexedDB)</li>
                <li>• Real authentication system (OAuth, SSO, or similar)</li>
                <li>• Parent account registration and email verification</li>
                <li>• Parent-child relationship verification by school admin</li>
                <li>• Session management and role-based authorization</li>
                <li>• HTTPS encryption for all data transmission</li>
              </ul>
              <button
                onClick={() => setShowSecurityWarning(false)}
                className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
              >
                I understand - hide this warning
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight flex items-center gap-2">
              <Shield size={20} className="text-indigo-500" />
              Parent Portal Preview
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1">
              Local development preview • View your child's academic information
            </p>
          </div>

          {/* Student Selector - Clearly marked as preview selector */}
          <div className="flex-shrink-0">
            <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-bold">
              ⚠️ Preview Mode - Select Child
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setActiveSection('overview');
              }}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-medium min-w-[250px]"
            >
              <option value="">-- Select a Student --</option>
              {students.map(student => {
                const cls = classes.find(c => c.id === student.classId);
                return (
                  <option key={student.id} value={student.id}>
                    {student.name} ({cls ? `${cls.name}-${cls.section}` : 'No Class'})
                  </option>
                );
              })}
            </select>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
              This selector simulates parent login - not real authentication
            </p>
          </div>
        </div>
      </div>

      {/* No Student Selected State */}
      {!selectedStudent && (
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-12 rounded-xl text-center">
          <Eye size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="font-sans font-bold text-slate-700 dark:text-slate-300 text-lg mb-2">
            Select a Student to Preview
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            Choose a student from the dropdown above to preview what their parent would see in a production parent portal.
          </p>
        </div>
      )}

      {/* Student Selected - Show Portal Content */}
      {selectedStudent && (
        <>
          {/* Section Navigation Tabs */}
          <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl overflow-hidden">
            <div className="flex overflow-x-auto">
              {sections.map(section => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors flex-shrink-0 border-b-2 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon size={16} />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Content */}
          <AnimatePresence mode="wait">
            {/* OVERVIEW SECTION */}
            {activeSection === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Student Profile Card */}
                <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-xl">
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
                    <User size={18} className="text-indigo-500" />
                    Student Profile
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Photo and Name */}
                    <div className="flex items-center gap-4">
                      {selectedStudent.photo ? (
                        <img
                          src={selectedStudent.photo}
                          alt={selectedStudent.name}
                          className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-2 border-indigo-500">
                          <User size={32} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl">
                          {selectedStudent.name}
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Roll No: {selectedStudent.rollNumber}
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg">
                        <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-1">Class</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {studentClass ? `${studentClass.name}-${studentClass.section}` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg">
                        <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-1">Student ID</p>
                        <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {selectedStudent.studentId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="flex items-start gap-3">
                      <Phone size={16} className="text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-0.5">Contact</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{selectedStudent.contactNumber}</p>
                      </div>
                    </div>

                    {selectedStudent.email && (
                      <div className="flex items-start gap-3">
                        <Mail size={16} className="text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-0.5">Email</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{selectedStudent.email}</p>
                        </div>
                      </div>
                    )}

                    {selectedStudent.bloodGroup && (
                      <div className="flex items-start gap-3">
                        <Hash size={16} className="text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-0.5">Blood Group</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{selectedStudent.bloodGroup}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar size={16} className="text-emerald-500" />
                      <span className="text-[9px] font-mono uppercase text-slate-400">Attendance</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {attendanceStats.percentage !== null ? `${attendanceStats.percentage}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {attendanceStats.total} records
                    </p>
                  </div>

                  <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <Award size={16} className="text-blue-500" />
                      <span className="text-[9px] font-mono uppercase text-slate-400">Results</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {publishedResults.length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Published
                    </p>
                  </div>

                  <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <Megaphone size={16} className="text-purple-500" />
                      <span className="text-[9px] font-mono uppercase text-slate-400">Announcements</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {relevantAnnouncements.length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Active
                    </p>
                  </div>

                  <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <DollarSign size={16} className={totalOutstanding > 0 ? 'text-rose-500' : 'text-emerald-500'} />
                      <span className="text-[9px] font-mono uppercase text-slate-400">Fee Balance</span>
                    </div>
                    <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {settings.currency || '$'}{totalOutstanding.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {totalOutstanding > 0 ? 'Outstanding' : 'Paid'}
                    </p>
                  </div>
                </div>

                {/* School Info */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200/50 dark:border-indigo-800/50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-2xl">
                      {settings.schoolLogoImage ? (
                        <img src={settings.schoolLogoImage} alt="School Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        settings.schoolLogo || '🎓'
                      )}
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-indigo-900 dark:text-indigo-100">
                        {settings.schoolName}
                      </h4>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        Academic Year: {settings.academicYear}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ATTENDANCE SECTION */}
            {activeSection === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Attendance Summary */}
                <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                      <Calendar size={18} className="text-indigo-500" />
                      Attendance History
                    </h3>

                    {/* Date Range Filter */}
                    <div className="flex gap-2">
                      {[
                        { value: '7days' as const, label: 'Last 7 Days' },
                        { value: '30days' as const, label: 'Last 30 Days' },
                        { value: 'month' as const, label: 'This Month' },
                        { value: 'all' as const, label: 'All Time' }
                      ].map(range => (
                        <button
                          key={range.value}
                          onClick={() => setAttendanceDateRange(range.value)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            attendanceDateRange === range.value
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg">
                      <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-1">Total Sessions</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{attendanceStats.total}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg">
                      <p className="text-[9px] font-mono uppercase text-emerald-600 dark:text-emerald-400 mb-1">Present</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{attendanceStats.present}</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg">
                      <p className="text-[9px] font-mono uppercase text-rose-600 dark:text-rose-400 mb-1">Absent</p>
                      <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{attendanceStats.absent}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                      <p className="text-[9px] font-mono uppercase text-amber-600 dark:text-amber-400 mb-1">Late</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{attendanceStats.late}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg relative group">
                      <p className="text-[9px] font-mono uppercase text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                        Percentage <Info size={10} className="cursor-help" />
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {attendanceStats.percentage !== null ? `${attendanceStats.percentage}%` : 'N/A'}
                      </p>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <strong>Formula:</strong> (Present + Late) / (Present + Absent + Late) × 100
                        <br />
                        <em className="text-slate-300">Leave excluded</em>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Records Table */}
                  {filteredAttendance.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No attendance records found</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try selecting a different date range</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Date</th>
                            <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Subject</th>
                            <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Status</th>
                            <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {filteredAttendance.map(record => (
                            <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                              <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{formatDate(record.date)}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{getSubjectName(record.subjectId)}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  record.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                                  record.status === 'absent' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                                  record.status === 'late' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                }`}>
                                  {record.status === 'present' && <CheckCircle size={10} />}
                                  {record.status === 'absent' && <XCircle size={10} />}
                                  {record.status === 'late' && <Clock size={10} />}
                                  {record.status === 'leave' && <FileText size={10} />}
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">
                                {record.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* RESULTS SECTION */}
            {activeSection === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-xl">
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
                    <Award size={18} className="text-indigo-500" />
                    Published Examination Results
                  </h3>

                  {publishedResults.length === 0 ? (
                    <div className="text-center py-8">
                      <Award size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No results published yet</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Results will appear here once published by the school</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {publishedResults.map(result => {
                        const exam = examinations.find(e => e.id === result.examinationId);
                        return (
                          <div
                            key={result.id}
                            className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-4 rounded-lg"
                          >
                            {/* Result Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-base">
                                  {result.examName}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {result.academicYear} • Published on {result.publishedAt ? formatTimestamp(result.publishedAt) : 'N/A'}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                  {result.percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                  Grade: {result.overallGrade}
                                </div>
                              </div>
                            </div>

                            {/* Overall Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-white dark:bg-slate-900 p-2 rounded text-center">
                                <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Obtained</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{result.totalObtained}</p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2 rounded text-center">
                                <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Total Marks</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{result.totalMaxMarks}</p>
                              </div>
                              {result.rank && (
                                <div className="bg-white dark:bg-slate-900 p-2 rounded text-center">
                                  <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Rank</p>
                                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{result.rank}</p>
                                </div>
                              )}
                            </div>

                            {/* Subject-wise Breakdown */}
                            <div className="space-y-2">
                              <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold mb-2">Subject Details:</p>
                              {result.subjects.map((subj, idx) => {
                                const percentage = (subj.marksObtained / subj.totalMarks) * 100;
                                return (
                                  <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{subj.subjectName}</span>
                                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        {subj.marksObtained}/{subj.totalMarks} ({percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            percentage >= 90 ? 'bg-emerald-500' :
                                            percentage >= 75 ? 'bg-blue-500' :
                                            percentage >= 60 ? 'bg-amber-500' :
                                            'bg-rose-500'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      {subj.grade && (
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{subj.grade}</span>
                                      )}
                                    </div>
                                    {subj.remarks && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{subj.remarks}"</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Overall Remarks */}
                            {result.remarks && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800/30">
                                <p className="text-[9px] font-mono uppercase text-blue-600 dark:text-blue-400 mb-1 font-bold">Overall Remarks:</p>
                                <p className="text-sm text-blue-900 dark:text-blue-100 italic">"{result.remarks}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ANNOUNCEMENTS SECTION */}
            {activeSection === 'announcements' && (
              <motion.div
                key="announcements"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-xl">
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-lg mb-4 flex items-center gap-2">
                    <Megaphone size={18} className="text-indigo-500" />
                    School Announcements
                  </h3>

                  {relevantAnnouncements.length === 0 ? (
                    <div className="text-center py-8">
                      <Megaphone size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No announcements available</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Check back later for updates</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {relevantAnnouncements.map(announcement => (
                        <div
                          key={announcement.id}
                          className={`p-4 rounded-lg border-l-4 ${
                            announcement.type === 'urgent'
                              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500'
                              : announcement.type === 'event'
                              ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                              : announcement.type === 'holiday'
                              ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-500'
                              : 'bg-slate-50 dark:bg-slate-950/40 border-slate-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  announcement.type === 'urgent'
                                    ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                    : announcement.type === 'event'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : announcement.type === 'holiday'
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {announcement.type}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatTimestamp(announcement.createdAt)}
                                </span>
                              </div>
                              <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-base">
                                {announcement.title}
                              </h4>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {announcement.message}
                          </p>
                          {announcement.targetAudience !== 'all' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                              <GraduationCap size={12} />
                              Class-specific announcement
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* FEES SECTION */}
            {activeSection === 'fees' && (
              <motion.div
                key="fees"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                      <DollarSign size={18} className="text-indigo-500" />
                      Fee Information
                    </h3>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Outstanding</p>
                      <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {settings.currency || '$'}{totalOutstanding.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {studentFeeCharges.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No fee charges recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentFeeCharges.map(charge => {
                        const { balance, totalPaid } = calculateFeeBalance(charge.id, charge, payments);
                        const chargePayments = payments.filter(p => p.feeChargeId === charge.id && !p.isVoided);
                        const netAmount = charge.amount - charge.discount;
                        
                        return (
                          <div key={charge.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
                            {/* Charge Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200">
                                  {charge.categoryName}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {charge.feePeriod} • Due: {formatDate(charge.dueDate)}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                charge.status === 'paid'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                  : charge.status === 'partially_paid'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  : charge.status === 'overdue'
                                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {charge.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>

                            {/* Amount Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                              <div className="bg-white dark:bg-slate-900 p-2 rounded">
                                <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Original</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                  {settings.currency || '$'}{charge.amount.toFixed(2)}
                                </p>
                              </div>
                              {charge.discount > 0 && (
                                <div className="bg-white dark:bg-slate-900 p-2 rounded">
                                  <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Discount</p>
                                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    -{settings.currency || '$'}{charge.discount.toFixed(2)}
                                  </p>
                                </div>
                              )}
                              <div className="bg-white dark:bg-slate-900 p-2 rounded">
                                <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Paid</p>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {settings.currency || '$'}{totalPaid.toFixed(2)}
                                </p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2 rounded">
                                <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Balance</p>
                                <p className={`text-sm font-bold ${balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {settings.currency || '$'}{balance.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Payment History */}
                            {chargePayments.length > 0 && (
                              <div>
                                <p className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 mb-2 font-bold">Payment History:</p>
                                <div className="space-y-1">
                                  {chargePayments.map(payment => (
                                    <div key={payment.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded text-xs">
                                      <span className="text-slate-600 dark:text-slate-400">
                                        {formatDate(payment.paymentDate)} • {payment.paymentMethod.replace('_', ' ')}
                                      </span>
                                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                        +{settings.currency || '$'}{payment.amount.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {charge.remarks && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                                Note: {charge.remarks}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
