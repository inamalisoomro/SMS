/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { Student, Class, Subject, AttendanceRecord, AttendanceStatus } from '../types';
import { exportToCSV } from '../utils';

interface ReportsViewProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
}

type ReportType = 'daily' | 'monthly' | 'student' | 'class';

export default function ReportsView({
  students,
  classes,
  subjects,
  attendance
}: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('daily');

  // Filter configurations
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterClassId, setFilterClassId] = useState(classes[0]?.id || '');
  const [filterSubjectId, setFilterSubjectId] = useState(subjects[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // 0-11
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper: Get status icon/color
  const renderStatusBadge = (status: AttendanceStatus | undefined) => {
    if (!status) return <span className="text-slate-300 dark:text-slate-800 font-bold font-mono">-</span>;
    switch (status) {
      case 'present':
        return <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs" title="Present">P</span>;
      case 'absent':
        return <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs" title="Absent">A</span>;
      case 'late':
        return <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs" title="Late">L</span>;
      case 'leave':
        return <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs" title="Leave">E</span>;
    }
  };

  // --- REPORT GENERATION LOGIC ---

  // 1. Daily Report Logic
  const dailyRecords = attendance.filter(
    r => r.date === filterDate && r.classId === filterClassId && r.subjectId === filterSubjectId
  );
  const dailyReportData = students
    .filter(s => s.classId === filterClassId)
    .map(student => {
      const record = dailyRecords.find(r => r.studentId === student.id);
      return {
        ...student,
        status: record?.status,
        notes: record?.notes || ''
      };
    }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  // 2. Monthly Report Logic
  // Get days in selected month (assuming year 2026)
  const currentYear = 2026;
  const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
  const monthDaysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthlyClassStudents = students
    .filter(s => s.classId === filterClassId)
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  // Matrix of student attendance for each day of selected month
  const monthlyMatrix = monthlyClassStudents.map(student => {
    const studentRecords = attendance.filter(
      r => r.studentId === student.id && r.subjectId === filterSubjectId && new Date(r.date).getMonth() === selectedMonth && new Date(r.date).getFullYear() === currentYear
    );

    const dayStatus: { [day: number]: AttendanceStatus | undefined } = {};
    studentRecords.forEach(rec => {
      const dayNum = new Date(rec.date).getDate();
      dayStatus[dayNum] = rec.status;
    });

    // Calculate percentage for the month
    const totalDaysRecorded = Object.keys(dayStatus).length;
    const presentCount = Object.values(dayStatus).filter(s => s === 'present' || s === 'late' || s === 'leave').length;
    const percentage = totalDaysRecorded > 0 ? Math.round((presentCount / totalDaysRecorded) * 100) : 0;

    return {
      ...student,
      dayStatus,
      percentage,
      totalDaysRecorded
    };
  });

  // 3. Student Personal Report Logic
  const activeStudent = students.find(s => s.id === selectedStudentId);
  const studentRecordsAll = attendance.filter(r => r.studentId === selectedStudentId);
  const totalStudentSessions = studentRecordsAll.length;
  const studentPresent = studentRecordsAll.filter(r => r.status === 'present').length;
  const studentAbsent = studentRecordsAll.filter(r => r.status === 'absent').length;
  const studentLate = studentRecordsAll.filter(r => r.status === 'late').length;
  const studentLeave = studentRecordsAll.filter(r => r.status === 'leave').length;
  
  const studentPercentage = totalStudentSessions > 0
    ? Math.round(((studentPresent + studentLate + studentLeave) / totalStudentSessions) * 100)
    : 0;

  // 4. Class Report Logic
  const classStudentsList = students.filter(s => s.classId === filterClassId);
  const classReportData = classStudentsList.map(student => {
    const records = attendance.filter(r => r.studentId === student.id && r.subjectId === filterSubjectId);
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const leave = records.filter(r => r.status === 'leave').length;

    const rate = total > 0 ? Math.round(((present + late + leave) / total) * 100) : 0;

    return {
      ...student,
      total,
      present,
      absent,
      late,
      leave,
      rate
    };
  }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  // --- EXPORT FUNCTIONS ---

  const exportCSVReport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReport === 'daily') {
      headers = ['Roll No', 'Student ID', 'Name', 'Date', 'Class', 'Subject', 'Status', 'Notes'];
      const clsObj = classes.find(c => c.id === filterClassId);
      const subjObj = subjects.find(s => s.id === filterSubjectId);
      rows = dailyReportData.map(d => [
        d.rollNumber,
        d.studentId,
        d.name,
        filterDate,
        clsObj ? `${clsObj.name}-${clsObj.section}` : '',
        subjObj ? subjObj.name : '',
        d.status || 'Unmarked',
        d.notes
      ]);
    } else if (activeReport === 'class') {
      headers = ['Roll No', 'Student ID', 'Name', 'Total Classes', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %'];
      rows = classReportData.map(c => [
        c.rollNumber,
        c.studentId,
        c.name,
        String(c.total),
        String(c.present),
        String(c.absent),
        String(c.late),
        String(c.leave),
        `${c.rate}%`
      ]);
    } else if (activeReport === 'monthly') {
      headers = ['Student ID', 'Name', ...monthDaysArray.map(d => `Day ${d}`), 'Monthly Rate %'];
      rows = monthlyMatrix.map(m => [
        m.studentId,
        m.name,
        ...monthDaysArray.map(d => m.dayStatus[d] || '-'),
        `${m.percentage}%`
      ]);
    } else if (activeReport === 'student' && activeStudent) {
      headers = ['Date', 'Class', 'Subject', 'Status', 'Remarks'];
      rows = studentRecordsAll.map(r => {
        const cls = classes.find(c => c.id === r.classId);
        const sub = subjects.find(s => s.id === r.subjectId);
        return [
          r.date,
          cls ? `${cls.name}-${cls.section}` : '',
          sub ? sub.name : '',
          r.status,
          r.notes || ''
        ];
      });
    }

    exportToCSV(headers, rows, filename);
  };

  const printReportSheet = () => {
    const element = document.getElementById('report-panel-print-container');
    if (!element) return;

    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=100,top=100,width=900,height=800');

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report Print</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #1e293b;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
              color: #1e293b;
            }
            .header p {
              margin: 4px 0 0 0;
              font-size: 11px;
              color: #64748b;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
              font-size: 11px;
              background-color: #f8fafc;
              padding: 12px;
              border-radius: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Fuzzy search student candidates
  const studentCandidates = students.filter(s => 
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
    s.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Upper Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
            Academic Reports Hub
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analyze historical records, compile monthly dashboards, and print export-ready PDF data.
          </p>
        </div>

        {/* Global Export Trigger Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSVReport}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={12} className="text-slate-400" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={printReportSheet}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all"
          >
            <Printer size={12} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Report Module Selectors */}
      <div className="flex flex-wrap border-b border-slate-200/40 dark:border-slate-800/40 gap-1">
        {[
          { id: 'daily', label: 'Daily Roster', icon: FileText },
          { id: 'monthly', label: 'Monthly Matrix Calendar', icon: Calendar },
          { id: 'class', label: 'Classroom Ledger', icon: GraduationCap },
          { id: 'student', label: 'Pupil Dossier', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveReport(tab.id as ReportType);
                if (tab.id === 'student' && students.length > 0 && !selectedStudentId) {
                  setSelectedStudentId(students[0].id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs font-semibold border-b-2 transition-all ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Contextual Filters Row */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3 rounded-xl shadow-sm flex flex-wrap gap-2.5 items-end">
        
        {/* Date Selector (Only for Daily) */}
        {activeReport === 'daily' && (
          <div className="space-y-1">
            <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Roster Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold font-sans"
            />
          </div>
        )}

        {/* Month Selector (Only for Monthly) */}
        {activeReport === 'monthly' && (
          <div className="space-y-1">
            <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="appearance-none px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold font-sans"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m} 2026</option>
              ))}
            </select>
          </div>
        )}

        {/* Global Class Selector (Not for Student Dossier) */}
        {activeReport !== 'student' && (
          <div className="space-y-1">
            <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Filter Class</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="appearance-none px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold font-sans"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} - Sec {c.section}</option>
              ))}
            </select>
          </div>
        )}

        {/* Global Subject Selector (Not for Student Dossier) */}
        {activeReport !== 'student' && (
          <div className="space-y-1">
            <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Subject / Course</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="appearance-none px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold font-sans"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Student Dossier Selectors (Only for Student) */}
        {activeReport === 'student' && (
          <div className="flex gap-2 flex-1 items-end">
            <div className="space-y-1 flex-1 max-w-xs relative">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Search Student</label>
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Type name to filter list..."
                className="w-full px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold font-sans"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Select Candidate</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-semibold max-w-xs font-sans"
              >
                {studentCandidates.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* PRINT-READY EXPORT AREA */}
      <div 
        id="report-panel-print-container" 
        className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm p-4.5 overflow-hidden"
      >
        
        {/* DAILY REPORT RENDER */}
        {activeReport === 'daily' && (
          <div className="space-y-3">
            <div className="header border-b border-indigo-100 dark:border-slate-800 pb-3 mb-3">
              <h1 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">
                Daily Attendance Ledger
              </h1>
              <div className="meta-grid grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans text-slate-500 dark:text-slate-400 mt-1.5">
                <div>DATE: <strong className="text-slate-700 dark:text-slate-300">{filterDate}</strong></div>
                <div>CLASS: <strong className="text-slate-700 dark:text-slate-300">{classes.find(c => c.id === filterClassId)?.name || 'N/A'}-{classes.find(c => c.id === filterClassId)?.section || ''}</strong></div>
                <div>COURSE: <strong className="text-slate-700 dark:text-slate-300">{subjects.find(s => s.id === filterSubjectId)?.name || 'N/A'}</strong></div>
                <div>STATUS: <strong className="text-emerald-500">{dailyRecords.length > 0 ? 'COMPLETED' : 'PENDING'}</strong></div>
              </div>
            </div>

            {dailyReportData.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8 font-sans">No enrolled student records found in selected class.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-sans text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/10 text-slate-400 dark:text-slate-500 uppercase font-mono text-[9px] font-semibold tracking-wider">
                      <th className="px-3 py-2 w-16">Roll</th>
                      <th className="px-3 py-2 w-32">Student ID</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2 text-center w-28">Status</th>
                      <th className="px-3 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {dailyReportData.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 text-xs">
                        <td className="px-3 py-2 font-mono font-bold text-slate-500">{d.rollNumber}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{d.studentId}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{d.name}</td>
                        <td className="px-3 py-2 flex justify-center">{renderStatusBadge(d.status)}</td>
                        <td className="px-3 py-2 text-slate-400 dark:text-slate-500 italic text-[11px]">{d.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MONTHLY REPORT MATRIX */}
        {activeReport === 'monthly' && (
          <div className="space-y-3">
            <div className="header border-b border-indigo-100 dark:border-slate-800 pb-3 mb-3">
              <h1 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">
                Monthly Roster Attendance Ledger Matrix
              </h1>
              <div className="meta-grid grid grid-cols-3 gap-3 text-xs font-sans text-slate-500 dark:text-slate-400 mt-1.5">
                <div>MONTH: <strong className="text-slate-700 dark:text-slate-300">{months[selectedMonth]} 2026</strong></div>
                <div>CLASS: <strong className="text-slate-700 dark:text-slate-300">{classes.find(c => c.id === filterClassId)?.name || 'N/A'}-{classes.find(c => c.id === filterClassId)?.section || ''}</strong></div>
                <div>COURSE: <strong className="text-slate-700 dark:text-slate-300">{subjects.find(s => s.id === filterSubjectId)?.name || 'N/A'}</strong></div>
              </div>
            </div>

            {monthlyMatrix.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8 font-sans">No enrolled students.</p>
            ) : (
              <div className="overflow-x-auto select-none">
                <table className="w-full text-left border-collapse text-xs font-sans text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 uppercase font-mono text-[8px] font-bold">
                      <th className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800">Student Name</th>
                      {monthDaysArray.map(day => (
                        <th key={day} className="p-0.5 text-center border border-slate-200 dark:border-slate-800 w-5 text-[8px]">{day}</th>
                      ))}
                      <th className="px-2.5 py-1.5 text-center border border-slate-200 dark:border-slate-800 w-14">Monthly %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {monthlyMatrix.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 text-xs">
                        <td className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 truncate max-w-[120px]">{m.name}</td>
                        {monthDaysArray.map(day => (
                          <td key={day} className="p-0.5 text-center border border-slate-200 dark:border-slate-800 font-semibold font-mono">
                            <div className="flex justify-center items-center">
                              {renderStatusBadge(m.dayStatus[day])}
                            </div>
                          </td>
                        ))}
                        <td className="px-2.5 py-1.5 text-center font-mono font-bold border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                          {m.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CLASS LEDGER REPORT */}
        {activeReport === 'class' && (
          <div className="space-y-3">
            <div className="header border-b border-indigo-100 dark:border-slate-800 pb-3 mb-3">
              <h1 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">
                Term Performance Classroom Ledger
              </h1>
              <div className="meta-grid grid grid-cols-2 gap-3 text-xs font-sans text-slate-500 dark:text-slate-400 mt-1.5">
                <div>CLASS: <strong className="text-slate-700 dark:text-slate-300">{classes.find(c => c.id === filterClassId)?.name || 'N/A'}-{classes.find(c => c.id === filterClassId)?.section || ''}</strong></div>
                <div>COURSE: <strong className="text-slate-700 dark:text-slate-300">{subjects.find(s => s.id === filterSubjectId)?.name || 'N/A'}</strong></div>
              </div>
            </div>

            {classReportData.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8 font-sans">No records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-sans text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/10 text-slate-400 dark:text-slate-500 uppercase font-mono text-[9px] font-semibold tracking-wider">
                      <th className="px-3 py-2 w-16">Roll</th>
                      <th className="px-3 py-2 w-32">Student ID</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2 text-center">Enrolled Lectures</th>
                      <th className="px-3 py-2 text-center text-emerald-500">Present</th>
                      <th className="px-3 py-2 text-center text-rose-500">Absent</th>
                      <th className="px-3 py-2 text-center text-amber-500">Late</th>
                      <th className="px-3 py-2 text-center text-indigo-500">Leave</th>
                      <th className="px-3 py-2 text-right">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {classReportData.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 text-xs">
                        <td className="px-3 py-2 font-mono font-bold text-slate-500">{c.rollNumber}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{c.studentId}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="px-3 py-2 text-center font-mono">{c.total}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{c.present}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-rose-500">{c.absent}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-amber-500">{c.late}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-indigo-500">{c.leave}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STUDENT DOSSIER INDIVIDUAL REPORT */}
        {activeReport === 'student' && activeStudent && (
          <div className="space-y-3">
            <div className="header border-b border-indigo-100 dark:border-slate-800 pb-3 mb-3">
              <h1 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">
                Individual Student Dossier Report
              </h1>
              <div className="meta-grid grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans text-slate-500 dark:text-slate-400 mt-1.5">
                <div>STUDENT: <strong className="text-slate-700 dark:text-slate-300">{activeStudent.name}</strong></div>
                <div>STUDENT ID: <strong className="text-slate-700 dark:text-slate-300 font-mono">{activeStudent.studentId}</strong></div>
                <div>CLASS: <strong className="text-slate-700 dark:text-slate-300">{classes.find(c => c.id === activeStudent.classId)?.name || 'N/A'}-{classes.find(c => c.id === activeStudent.classId)?.section || ''}</strong></div>
                <div>ROLL NO: <strong className="text-slate-700 dark:text-slate-300">#{activeStudent.rollNumber}</strong></div>
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-2 rounded-lg text-center">
                <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Overall Rate</span>
                <span className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">{studentPercentage}%</span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-2 rounded-lg text-center">
                <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Present</span>
                <span className="text-base font-mono font-bold text-emerald-500 block mt-0.5">{studentPresent}</span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-2 rounded-lg text-center">
                <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Absent</span>
                <span className="text-base font-mono font-bold text-rose-500 block mt-0.5">{studentAbsent}</span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-2 rounded-lg text-center">
                <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Late</span>
                <span className="text-base font-mono font-bold text-amber-500 block mt-0.5">{studentLate}</span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-2 rounded-lg text-center">
                <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">On Leave</span>
                <span className="text-base font-mono font-bold text-indigo-500 block mt-0.5">{studentLeave}</span>
              </div>
            </div>

            {/* Student Records List */}
            <div className="pt-1">
              <h3 className="font-sans font-bold text-slate-700 dark:text-slate-300 text-xs mb-2">Historical Attendance Records Log ({totalStudentSessions} Sessions)</h3>
              {studentRecordsAll.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8 font-sans">No sessions registered for this candidate.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans text-slate-700 dark:text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/10 text-slate-400 dark:text-slate-500 uppercase font-mono text-[9px] font-semibold tracking-wider">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Class/Sec</th>
                        <th className="px-3 py-2">Subject / Course Name</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {studentRecordsAll.map(r => {
                        const cl = classes.find(c => c.id === r.classId);
                        const sub = subjects.find(s => s.id === r.subjectId);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 text-xs">
                            <td className="px-3 py-2 font-mono font-medium">{r.date}</td>
                            <td className="px-3 py-2 font-mono">{cl ? `${cl.name}-${cl.section}` : '-'}</td>
                            <td className="px-3 py-2 font-semibold">{sub ? sub.name : '-'}</td>
                            <td className="px-3 py-2 flex justify-center">{renderStatusBadge(r.status)}</td>
                            <td className="px-3 py-2 text-slate-400 dark:text-slate-500 italic text-[11px]">{r.notes || '-'}</td>
                          </tr>
                        );
                      })}
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
