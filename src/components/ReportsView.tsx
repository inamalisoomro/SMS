/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Calendar, 
  Users, 
  GraduationCap, 
  Search, 
  Printer, 
  Download, 
  Check, 
  X, 
  Clock, 
  UserMinus,
  ChevronDown,
  ArrowLeft,
  Filter,
  Info,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Student, Class, Subject, AttendanceRecord, AttendanceStatus } from '../types';
import { exportToCSV, calculateAttendancePercentage, getAttendanceStats } from '../utils';

interface ReportsViewProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  onNavigate?: (tab: string) => void;
}

type ReportType = 'summary' | 'daily' | 'student' | 'class' | 'dateRange';
type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export default function ReportsView({
  students,
  classes,
  subjects,
  attendance,
  onNavigate
}: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('summary');

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Other filters
  const [filterClassId, setFilterClassId] = useState('all');
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Apply date preset
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      case 'last7':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        setStartDate(last7.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      case 'last30':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        setStartDate(last30.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      case 'thisMonth':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      case 'all':
        // Don't apply date filtering
        break;
    }
  };

  // Filter attendance records
  const filteredRecords = useMemo(() => {
    return attendance.filter(record => {
      // Date filter
      if (datePreset !== 'all') {
        if (record.date < startDate || record.date > endDate) return false;
      }
      
      // Class filter
      if (filterClassId !== 'all' && record.classId !== filterClassId) return false;
      
      // Subject filter
      if (filterSubjectId !== 'all' && record.subjectId !== filterSubjectId) return false;
      
      // Status filter
      if (filterStatus !== 'all' && record.status !== filterStatus) return false;
      
      return true;
    });
  }, [attendance, datePreset, startDate, endDate, filterClassId, filterSubjectId, filterStatus]);

  // Calculate overall statistics
  const overallStats = useMemo(() => getAttendanceStats(filteredRecords), [filteredRecords]);

  // Helper: Get status badge
  const renderStatusBadge = (status: AttendanceStatus | undefined) => {
    if (!status) return <span className="text-slate-300 dark:text-slate-600 font-bold font-mono text-xs">-</span>;
    switch (status) {
      case 'present':
        return <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs" title="Present">P</span>;
      case 'absent':
        return <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs" title="Absent">A</span>;
      case 'late':
        return <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs" title="Late">L</span>;
      case 'leave':
        return <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs" title="Leave">E</span>;
    }
  };

  // --- REPORT DATA CALCULATIONS ---

  // 1. Daily Class Summary (unique students per day)
  const dailyClassData = useMemo(() => {
    if (!startDate) return [];
    
    const classObj = classes.find(c => c.id === filterClassId);
    if (!classObj && filterClassId !== 'all') return [];

    // Get records for the date
    const dateRecords = filteredRecords.filter(r => r.date === startDate);
    
    // Group by student to count each student once per day
    const studentMap = new Map<string, {
      student: Student;
      statuses: AttendanceStatus[];
      present: boolean;
      absent: boolean;
      late: boolean;
      leave: boolean;
    }>();

    dateRecords.forEach(record => {
      const student = students.find(s => s.id === record.studentId);
      if (!student) return;

      if (!studentMap.has(record.studentId)) {
        studentMap.set(record.studentId, {
          student,
          statuses: [],
          present: false,
          absent: false,
          late: false,
          leave: false
        });
      }

      const entry = studentMap.get(record.studentId)!;
      entry.statuses.push(record.status);
      
      // Track if student had any of these statuses across subjects
      if (record.status === 'present') entry.present = true;
      if (record.status === 'absent') entry.absent = true;
      if (record.status === 'late') entry.late = true;
      if (record.status === 'leave') entry.leave = true;
    });

    // Determine each student's day status (priority: present > late > leave > absent)
    const uniqueStudents = Array.from(studentMap.values()).map(entry => {
      let dayStatus: AttendanceStatus;
      if (entry.present) dayStatus = 'present';
      else if (entry.late) dayStatus = 'late';
      else if (entry.leave) dayStatus = 'leave';
      else dayStatus = 'absent';

      return {
        ...entry.student,
        dayStatus,
        subjectCount: entry.statuses.length
      };
    });

    // Calculate daily stats
    const present = uniqueStudents.filter(s => s.dayStatus === 'present').length;
    const absent = uniqueStudents.filter(s => s.dayStatus === 'absent').length;
    const late = uniqueStudents.filter(s => s.dayStatus === 'late').length;
    const leave = uniqueStudents.filter(s => s.dayStatus === 'leave').length;

    return {
      students: uniqueStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })),
      stats: { present, absent, late, leave, total: uniqueStudents.length }
    };
  }, [filteredRecords, startDate, filterClassId, classes, students]);

  // 2. Student Report
  const studentReportData = useMemo(() => {
    if (!selectedStudentId) return null;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;

    const studentRecords = filteredRecords.filter(r => r.studentId === selectedStudentId);
    const stats = getAttendanceStats(studentRecords);

    // Subject-wise breakdown
    const subjectBreakdown = subjects.map(subject => {
      const subjectRecords = studentRecords.filter(r => r.subjectId === subject.id);
      return {
        subject,
        stats: getAttendanceStats(subjectRecords)
      };
    }).filter(item => item.stats.total > 0);

    // Date-wise records
    const dateRecords = studentRecords
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(record => ({
        ...record,
        class: classes.find(c => c.id === record.classId),
        subject: subjects.find(s => s.id === record.subjectId)
      }));

    return {
      student,
      stats,
      subjectBreakdown,
      dateRecords
    };
  }, [selectedStudentId, filteredRecords, students, subjects, classes]);

  // 3. Class Report
  const classReportData = useMemo(() => {
    const classStudents = filterClassId === 'all' 
      ? students 
      : students.filter(s => s.classId === filterClassId);

    return classStudents.map(student => {
      const studentRecords = filteredRecords.filter(r => r.studentId === student.id);
      const stats = getAttendanceStats(studentRecords);

      return {
        ...student,
        stats
      };
    }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
  }, [filteredRecords, filterClassId, students]);

  // --- CSV EXPORT ---
  const exportCSVReport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `AttendanceReport_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (activeReport === 'summary' || activeReport === 'dateRange') {
      headers = ['Date', 'Class', 'Subject', 'Student ID', 'Student Name', 'Roll No', 'Status', 'Notes'];
      rows = filteredRecords.map(r => {
        const student = students.find(s => s.id === r.studentId);
        const cls = classes.find(c => c.id === r.classId);
        const subj = subjects.find(s => s.id === r.subjectId);
        return [
          escapeCSV(r.date),
          escapeCSV(cls ? `${cls.name}-${cls.section}` : 'N/A'),
          escapeCSV(subj?.name || 'N/A'),
          escapeCSV(student?.studentId || ''),
          escapeCSV(student?.name || ''),
          escapeCSV(student?.rollNumber || ''),
          escapeCSV(r.status),
          escapeCSV(r.notes || '')
        ];
      });
    } else if (activeReport === 'daily' && dailyClassData.students) {
      headers = ['Roll No', 'Student ID', 'Name', 'Date', 'Day Status', 'Subjects Marked'];
      const cls = classes.find(c => c.id === filterClassId);
      rows = dailyClassData.students.map(s => [
        escapeCSV(s.rollNumber),
        escapeCSV(s.studentId),
        escapeCSV(s.name),
        escapeCSV(startDate),
        escapeCSV(s.dayStatus),
        escapeCSV(s.subjectCount)
      ]);
      filename = `DailyAttendance_${cls?.name || 'All'}_${startDate}.csv`;
    } else if (activeReport === 'class') {
      headers = ['Roll No', 'Student ID', 'Name', 'Total Records', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %'];
      rows = classReportData.map(s => [
        escapeCSV(s.rollNumber),
        escapeCSV(s.studentId),
        escapeCSV(s.name),
        escapeCSV(s.stats.total),
        escapeCSV(s.stats.present),
        escapeCSV(s.stats.absent),
        escapeCSV(s.stats.late),
        escapeCSV(s.stats.leave),
        escapeCSV(s.stats.percentage !== null ? `${s.stats.percentage}%` : 'N/A')
      ]);
    } else if (activeReport === 'student' && studentReportData) {
      headers = ['Date', 'Class', 'Subject', 'Status', 'Notes'];
      rows = studentReportData.dateRecords.map(r => [
        escapeCSV(r.date),
        escapeCSV(r.class ? `${r.class.name}-${r.class.section}` : 'N/A'),
        escapeCSV(r.subject?.name || 'N/A'),
        escapeCSV(r.status),
        escapeCSV(r.notes || '')
      ]);
      filename = `StudentAttendance_${studentReportData.student.studentId}_${new Date().toISOString().split('T')[0]}.csv`;
    }

    exportToCSV(headers, rows, filename);
  };

  // --- PRINT ---
  const printReport = () => {
    window.print();
  };

  // Fuzzy search students
  const studentCandidates = students.filter(s => 
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
    s.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  // Set default student if none selected
  if (activeReport === 'student' && !selectedStudentId && students.length > 0) {
    setSelectedStudentId(students[0].id);
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
              Attendance Reports & Analysis
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive attendance tracking with date ranges, filters, and detailed breakdowns
            </p>
          </div>
        </div>

        {/* Export Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSVReport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap border-b border-slate-200/40 dark:border-slate-800/40 gap-1">
        {[
          { id: 'summary', label: 'Summary', icon: TrendingUp },
          { id: 'daily', label: 'Daily Class', icon: Calendar },
          { id: 'class', label: 'Class Report', icon: GraduationCap },
          { id: 'student', label: 'Student Report', icon: Users },
          { id: 'dateRange', label: 'Date Range', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveReport(tab.id as ReportType);
                if (tab.id === 'student' && !selectedStudentId && students.length > 0) {
                  setSelectedStudentId(students[0].id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 font-sans text-xs font-semibold border-b-2 transition-all ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Panel */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3.5 rounded-xl shadow-sm space-y-3">
        {/* Date Preset Pills */}
        <div>
          <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1.5">Time Period</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => applyDatePreset(preset.id as DatePreset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  datePreset === preset.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range (show if custom or specific report types) */}
        {(datePreset === 'custom' || activeReport === 'daily' || activeReport === 'dateRange') && (
          <div className="flex flex-wrap gap-2.5">
            <div className="space-y-1">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                {activeReport === 'daily' ? 'Select Date' : 'Start Date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (datePreset !== 'custom') setDatePreset('custom');
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
              />
            </div>
            {activeReport !== 'daily' && (
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (datePreset !== 'custom') setDatePreset('custom');
                  }}
                  className="px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
                />
              </div>
            )}
          </div>
        )}

        {/* Other Filters */}
        <div className="flex flex-wrap gap-2.5">
          {/* Class Filter */}
          {activeReport !== 'student' && (
            <div className="space-y-1">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Class</label>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject Filter */}
          {activeReport !== 'student' && (
            <div className="space-y-1">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Subject</label>
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
              >
                <option value="all">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AttendanceStatus | 'all')}
              className="px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          {/* Student Search (for student report) */}
          {activeReport === 'student' && (
            <>
              <div className="space-y-1 flex-1 max-w-xs">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Search Student</label>
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Name or ID..."
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold max-w-xs"
                >
                  {studentCandidates.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {(activeReport === 'summary' || activeReport === 'dateRange') && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl">
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Total Records</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{overallStats.total}</div>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-3 rounded-xl">
            <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1">
              <Check size={10} /> Present
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{overallStats.present}</div>
          </div>
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/50 p-3 rounded-xl">
            <div className="text-[9px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold mb-1 flex items-center gap-1">
              <X size={10} /> Absent
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{overallStats.absent}</div>
          </div>
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3 rounded-xl">
            <div className="text-[9px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1 flex items-center gap-1">
              <Clock size={10} /> Late
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{overallStats.late}</div>
          </div>
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/50 p-3 rounded-xl">
            <div className="text-[9px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold mb-1 flex items-center gap-1">
              <UserMinus size={10} /> Leave
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{overallStats.leave}</div>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 p-3 rounded-xl relative group">
            <div className="text-[9px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold mb-1 flex items-center gap-1">
              Attendance % <Info size={10} className="cursor-help" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallStats.percentage !== null ? `${overallStats.percentage}%` : 'N/A'}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <strong>Formula:</strong> (Present + Late) / (Present + Absent + Late) × 100
              <br />
              <em>Leave records excluded from calculation</em>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm p-4 print:shadow-none">
        
        {/* SUMMARY / DATE RANGE REPORT */}
        {(activeReport === 'summary' || activeReport === 'dateRange') && (
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm pb-2 border-b border-slate-200 dark:border-slate-800">
              {activeReport === 'summary' ? 'Attendance Summary' : 'Date Range Attendance Records'}
            </h3>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No attendance records found</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Date</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Student</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Class</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Subject</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Status</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredRecords.slice(0, 100).map((record, idx) => {
                      const student = students.find(s => s.id === record.studentId);
                      const cls = classes.find(c => c.id === record.classId);
                      const subj = subjects.find(s => s.id === record.subjectId);
                      return (
                        <tr key={`${record.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{record.date}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{student?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{student?.studentId}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{cls ? `${cls.name}-${cls.section}` : 'N/A'}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{subj?.name || 'N/A'}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-center">{renderStatusBadge(record.status)}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-400 dark:text-slate-500 italic text-[11px]">{record.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRecords.length > 100 && (
                  <p className="text-center text-xs text-slate-400 mt-3">Showing first 100 of {filteredRecords.length} records. Export CSV for full data.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* DAILY CLASS REPORT */}
        {activeReport === 'daily' && (
          <div className="space-y-3">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Daily Class Attendance</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                <div>Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{startDate}</span></div>
                <div>Class: <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {filterClassId === 'all' ? 'All Classes' : classes.find(c => c.id === filterClassId)?.name + '-' + classes.find(c => c.id === filterClassId)?.section}
                </span></div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  <Info size={10} className="inline mr-1" />
                  Each student counted once per day (highest priority status across subjects)
                </p>
              </div>
            </div>

            {/* Daily Stats */}
            {dailyClassData.students && dailyClassData.students.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Present</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{dailyClassData.stats.present}</div>
                </div>
                <div className="text-center p-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-bold">Absent</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{dailyClassData.stats.absent}</div>
                </div>
                <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">Late</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{dailyClassData.stats.late}</div>
                </div>
                <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Leave</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{dailyClassData.stats.leave}</div>
                </div>
              </div>
            )}

            {!dailyClassData.students || dailyClassData.students.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No attendance recorded for this date</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Select a different date or class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Roll</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Student ID</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Name</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Day Status</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Subjects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {dailyClassData.students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className="px-3 py-2 font-mono text-slate-500">{student.rollNumber}</td>
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{student.studentId}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{student.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center">{renderStatusBadge(student.dayStatus)}</div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-500">{student.subjectCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CLASS REPORT */}
        {activeReport === 'class' && (
          <div className="space-y-3">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Class Performance Report</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Class: <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {filterClassId === 'all' ? 'All Classes' : classes.find(c => c.id === filterClassId)?.name + '-' + classes.find(c => c.id === filterClassId)?.section}
                </span>
              </div>
            </div>

            {classReportData.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No students found</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try selecting a different class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Roll</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Student ID</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Name</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Total</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold text-center">Present</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold text-center">Absent</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold text-center">Late</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold text-center">Leave</th>
                      <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {classReportData.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className="px-3 py-2 font-mono text-slate-500">{student.rollNumber}</td>
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{student.studentId}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{student.name}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">{student.stats.total}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{student.stats.present}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-rose-600 dark:text-rose-400">{student.stats.absent}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">{student.stats.late}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">{student.stats.leave}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-mono font-bold ${
                            student.stats.percentage === null ? 'text-slate-400' :
                            student.stats.percentage >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                            student.stats.percentage >= 75 ? 'text-blue-600 dark:text-blue-400' :
                            student.stats.percentage >= 60 ? 'text-amber-600 dark:text-amber-400' :
                            'text-rose-600 dark:text-rose-400'
                          }`}>
                            {student.stats.percentage !== null ? `${student.stats.percentage}%` : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STUDENT REPORT */}
        {activeReport === 'student' && studentReportData && (
          <div className="space-y-4">
            {/* Student Header */}
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-lg">{studentReportData.student.name}</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                <div>Student ID: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{studentReportData.student.studentId}</span></div>
                <div>Roll No: <span className="font-semibold text-slate-700 dark:text-slate-300">{studentReportData.student.rollNumber}</span></div>
                <div>Class: <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {(() => {
                    const cls = classes.find(c => c.id === studentReportData.student.classId);
                    return cls ? `${cls.name}-${cls.section}` : 'N/A';
                  })()}
                </span></div>
              </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Total</div>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{studentReportData.stats.total}</div>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Present</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{studentReportData.stats.present}</div>
              </div>
              <div className="text-center p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-800">
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase mb-1">Absent</div>
                <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{studentReportData.stats.absent}</div>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase mb-1">Late</div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{studentReportData.stats.late}</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase mb-1">Leave</div>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{studentReportData.stats.leave}</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 relative group">
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-1 flex items-center justify-center gap-1">
                  Rate <Info size={10} className="cursor-help" />
                </div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {studentReportData.stats.percentage !== null ? `${studentReportData.stats.percentage}%` : 'N/A'}
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  (Present + Late) / (Present + Absent + Late) × 100
                </div>
              </div>
            </div>

            {/* Subject-wise Breakdown */}
            {studentReportData.subjectBreakdown.length > 0 && (
              <div>
                <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm mb-2 flex items-center gap-2">
                  <GraduationCap size={16} />
                  Subject-wise Breakdown
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Subject</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Total</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold text-center">Present</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold text-center">Absent</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold text-center">Late</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold text-center">Leave</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {studentReportData.subjectBreakdown.map(item => (
                        <tr key={item.subject.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                          <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">{item.subject.name}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">{item.stats.total}</td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-600 dark:text-emerald-400">{item.stats.present}</td>
                          <td className="px-3 py-2 text-center font-mono text-rose-600 dark:text-rose-400">{item.stats.absent}</td>
                          <td className="px-3 py-2 text-center font-mono text-amber-600 dark:text-amber-400">{item.stats.late}</td>
                          <td className="px-3 py-2 text-center font-mono text-indigo-600 dark:text-indigo-400">{item.stats.leave}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.stats.percentage !== null ? `${item.stats.percentage}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Date-wise History */}
            <div>
              <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Attendance History
              </h4>
              
              {studentReportData.dateRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  No attendance records found for the selected period
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Date</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Class</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Subject</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Status</th>
                        <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {studentReportData.dateRecords.map((record, idx) => (
                        <tr key={`${record.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{record.date}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                            {record.class ? `${record.class.name}-${record.class.section}` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{record.subject?.name || 'N/A'}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-center">{renderStatusBadge(record.status)}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-400 dark:text-slate-500 italic text-[11px]">{record.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
