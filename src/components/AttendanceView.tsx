/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  GraduationCap, 
  BookOpen, 
  Check, 
  X, 
  Clock, 
  UserMinus, 
  CheckSquare, 
  AlertCircle,
  ChevronDown,
  QrCode,
  ListFilter,
  Camera,
  Sparkles,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Student, Class, Subject, AttendanceRecord, AttendanceStatus } from '../types';
import QRScannerAttendance from './QRScannerAttendance';

interface AttendanceViewProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => Promise<void>;
}

export default function AttendanceView({
  students,
  classes,
  subjects,
  attendance,
  onSaveAttendance,
}: AttendanceViewProps) {
  // Mode selection: 'manual' | 'qr_scanner'
  const [activeMode, setActiveMode] = useState<'manual' | 'qr_scanner'>('manual');

  // Selector states
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Local state for the attendance sheet
  const [sheetRecords, setSheetRecords] = useState<{
    [studentId: string]: { status: AttendanceStatus; notes: string; markedVia?: 'manual' | 'qr_scan' };
  }>({});
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  // Set default selectors on load
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [classes, subjects, selectedClassId, selectedSubjectId]);

  // Filter students enrolled in the selected class
  const classStudents = students
    .filter(s => s.classId === selectedClassId)
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  // Load existing attendance if it exists for this Class + Subject + Date
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate) return;

    // Filter DB attendance for this composite match
    const matchingRecords = attendance.filter(
      r => r.classId === selectedClassId && r.subjectId === selectedSubjectId && r.date === selectedDate
    );

    const newSheet: typeof sheetRecords = {};
    
    if (matchingRecords.length > 0) {
      setIsAlreadySubmitted(true);
      matchingRecords.forEach(rec => {
        newSheet[rec.studentId] = {
          status: rec.status,
          notes: rec.notes || '',
          markedVia: rec.markedVia || 'manual',
        };
      });
      // For any student in class not yet in matching records:
      classStudents.forEach(student => {
        if (!newSheet[student.id]) {
          newSheet[student.id] = {
            status: 'present',
            notes: '',
            markedVia: 'manual',
          };
        }
      });
    } else {
      setIsAlreadySubmitted(false);
      // Default to "present" for all students in the class
      classStudents.forEach(student => {
        newSheet[student.id] = {
          status: 'present',
          notes: '',
          markedVia: 'manual',
        };
      });
    }

    setSheetRecords(newSheet);
  }, [selectedClassId, selectedSubjectId, selectedDate, attendance, students]);

  // Toggle status for a single student
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setSheetRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        markedVia: 'manual',
      },
    }));
  };

  // Update notes for a single student
  const handleNotesChange = (studentId: string, notes: string) => {
    setSheetRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  // Bulk actions
  const handleMarkAll = (status: AttendanceStatus) => {
    const updatedSheet = { ...sheetRecords };
    classStudents.forEach(st => {
      updatedSheet[st.id] = {
        ...updatedSheet[st.id],
        status,
        markedVia: 'manual',
      };
    });
    setSheetRecords(updatedSheet);
  };

  // Submit and save manual attendance
  const handleSaveSubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate) return;

    const recordsToSave: AttendanceRecord[] = classStudents.map(student => {
      const studentSheet = sheetRecords[student.id] || { status: 'present', notes: '', markedVia: 'manual' };
      return {
        id: `${selectedClassId}_${selectedSubjectId}_${selectedDate}_${student.id}`,
        studentId: student.id,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        date: selectedDate,
        status: studentSheet.status,
        notes: studentSheet.notes || undefined,
        markedVia: studentSheet.markedVia || 'manual',
        updatedAt: Date.now(),
      };
    });

    await onSaveAttendance(recordsToSave);
  };

  // Handler for QR Scanner instant marking
  const handleSingleQRMark = async (record: AttendanceRecord) => {
    await onSaveAttendance([record]);
    // update local sheet record as well
    setSheetRecords(prev => ({
      ...prev,
      [record.studentId]: {
        status: record.status,
        notes: record.notes || '',
        markedVia: 'qr_scan',
      },
    }));
  };

  // Stats calculation
  const totalInClass = classStudents.length;
  const presentCount = classStudents.filter(s => sheetRecords[s.id]?.status === 'present').length;
  const absentCount = classStudents.filter(s => sheetRecords[s.id]?.status === 'absent').length;
  const lateCount = classStudents.filter(s => sheetRecords[s.id]?.status === 'late').length;
  const leaveCount = classStudents.filter(s => sheetRecords[s.id]?.status === 'leave').length;
  const attendanceRate = totalInClass > 0 ? Math.round(((presentCount + lateCount) / totalInClass) * 100) : 0;

  // UI calculations
  const classObj = classes.find(c => c.id === selectedClassId);
  const subjectObj = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* View Title & Mode Switching Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight flex items-center gap-2">
            <span>Roster Entry & Attendance</span>
            {activeMode === 'qr_scanner' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                QR Scanner Active
              </span>
            )}
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log student attendance using manual checkboxes or instant webcam QR code scanning with audio feedback.
          </p>
        </div>

        {/* Mode Toggle Controls */}
        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white/40 dark:bg-slate-900/40 p-0.5">
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-sans transition-all ${
              activeMode === 'manual'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ListFilter size={13} />
            <span>Manual Roster Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('qr_scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-sans transition-all ${
              activeMode === 'qr_scanner'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <QrCode size={13} />
            <span>Live QR Scanner</span>
          </button>
        </div>
      </div>

      {/* Selectors Grid (Shared between both modes) */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3.5 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Date Picker */}
        <div className="space-y-1">
          <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider">
            Attendance Date
          </label>
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-semibold"
            />
          </div>
        </div>

        {/* Class Selector */}
        <div className="space-y-1">
          <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider">
            Select Class
          </label>
          <div className="relative">
            <GraduationCap size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="appearance-none w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-semibold"
            >
              <option value="" disabled>Choose class...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Subject Selector */}
        <div className="space-y-1">
          <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider">
            Select Subject
          </label>
          <div className="relative">
            <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="appearance-none w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-semibold"
            >
              <option value="" disabled>Choose subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code || 'No Code'})</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Real-time Class Attendance Metrics Bar */}
      {selectedClassId && selectedSubjectId && classStudents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">Total</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200">{totalInClass}</span>
            </div>
            <Users size={16} className="text-slate-400" />
          </div>

          <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-semibold">Present</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{presentCount}</span>
            </div>
            <Check size={16} className="text-emerald-500" />
          </div>

          <div className="bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 block font-semibold">Absent</span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">{absentCount}</span>
            </div>
            <X size={16} className="text-rose-500" />
          </div>

          <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 block font-semibold">Late</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{lateCount}</span>
            </div>
            <Clock size={16} className="text-amber-500" />
          </div>

          <div className="col-span-2 sm:col-span-1 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block font-semibold">Rate</span>
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{attendanceRate}%</span>
            </div>
            <Sparkles size={16} className="text-indigo-500" />
          </div>
        </div>
      )}

      {/* VIEW CONDITIONAL: LIVE QR SCANNER OR MANUAL SHEET */}
      {activeMode === 'qr_scanner' ? (
        <QRScannerAttendance
          students={students}
          classes={classes}
          subjects={subjects}
          attendance={attendance}
          selectedDate={selectedDate}
          selectedClassId={selectedClassId}
          selectedSubjectId={selectedSubjectId}
          onMarkAttendance={handleSingleQRMark}
        />
      ) : (
        /* MANUAL ROSTER SHEET VIEW */
        <div className="space-y-4">
          {/* Submission indicator & Bulk Action buttons */}
          {selectedClassId && selectedSubjectId && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 bg-white/40 dark:bg-slate-900/10 px-4 py-2.5 rounded-xl border border-slate-200/30 dark:border-slate-800/20 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[11px]">
                {isAlreadySubmitted ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-sans font-semibold text-slate-600 dark:text-slate-400">
                      Attendance records exist for <strong className="text-slate-800 dark:text-slate-200">{classObj?.name} - Section {classObj?.section}</strong> in <strong className="text-slate-800 dark:text-slate-200">{subjectObj?.name}</strong>. Entering <strong className="text-amber-500 uppercase">Edit Mode</strong>.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-sans font-semibold text-slate-600 dark:text-slate-400">
                      New attendance sheet for <strong className="text-slate-800 dark:text-slate-200">{classObj?.name} - Section {classObj?.section}</strong> in <strong className="text-slate-800 dark:text-slate-200">{subjectObj?.name}</strong> on <strong className="text-slate-800 dark:text-slate-200">{selectedDate}</strong>.
                    </span>
                  </>
                )}
              </div>

              {/* Bulk actions */}
              {classStudents.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleMarkAll('present')}
                    className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded text-[10px] font-semibold hover:bg-emerald-500/20 transition-all"
                  >
                    All Present
                  </button>
                  <button
                    onClick={() => handleMarkAll('absent')}
                    className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded text-[10px] font-semibold hover:bg-rose-500/20 transition-all"
                  >
                    All Absent
                  </button>
                  <button
                    onClick={() => setActiveMode('qr_scanner')}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 shadow-xs transition-all ml-1"
                  >
                    <QrCode size={11} />
                    <span>Scan Pass</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Roster Sheet */}
          {!selectedClassId || !selectedSubjectId ? (
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
              <CheckSquare size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
              <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">
                Please select a class and course subject to initiate the roster entry.
              </p>
            </div>
          ) : classStudents.length === 0 ? (
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
              <AlertCircle size={32} className="mx-auto text-amber-500/75 mb-1.5" />
              <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">No students currently registered in this class.</p>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">Please register students under the "Students Directory" first.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 font-mono text-[9px] font-semibold uppercase tracking-wider">
                        <th className="px-4 py-2 w-14">Roll</th>
                        <th className="px-4 py-2">Student Details</th>
                        <th className="px-4 py-2 text-center w-[300px]">Attendance Status Toggle</th>
                        <th className="px-4 py-2">Remarks / Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {classStudents.map((student) => {
                        const studentSheet = sheetRecords[student.id] || { status: 'present', notes: '', markedVia: 'manual' };
                        const currentStatus = studentSheet.status;
                        const firstLetter = student.name.charAt(0);
                        const isQR = studentSheet.markedVia === 'qr_scan';

                        return (
                          <tr 
                            key={student.id}
                            className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 text-slate-700 dark:text-slate-300 font-sans text-xs transition-all"
                          >
                            {/* Roll number */}
                            <td className="px-4 py-2 font-mono font-bold text-slate-600 dark:text-slate-400 text-xs">
                              {student.rollNumber}
                            </td>

                            {/* Name and visual tag */}
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6.5 h-6.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                  {firstLetter}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{student.name}</p>
                                    {isQR && (
                                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-mono font-bold">
                                        <QrCode size={8} /> QR
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[9px] text-slate-400 dark:text-slate-500">{student.studentId}</p>
                                </div>
                              </div>
                            </td>

                            {/* Button control status */}
                            <td className="px-4 py-2 text-center">
                              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-950 p-0.5 border border-slate-200/50 dark:border-slate-800/50 gap-0.5">
                                {/* Present Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'present')}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                  }`}
                                >
                                  <Check size={9} />
                                  <span>Present</span>
                                </button>

                                {/* Absent Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'absent')}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                    currentStatus === 'absent'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                  }`}
                                >
                                  <X size={9} />
                                  <span>Absent</span>
                                </button>

                                {/* Late Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'late')}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                    currentStatus === 'late'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                  }`}
                                >
                                  <Clock size={9} />
                                  <span>Late</span>
                                </button>

                                {/* Leave Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'leave')}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                    currentStatus === 'leave'
                                      ? 'bg-violet-500 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                  }`}
                                >
                                  <UserMinus size={9} />
                                  <span>Leave</span>
                                </button>
                              </div>
                            </td>

                            {/* Remarks Note */}
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={studentSheet.notes}
                                onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                placeholder="e.g. medical, bus, scanned..."
                                className="w-full px-2 py-1 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-slate-400">
                  {presentCount} present, {lateCount} late, {absentCount} absent, {leaveCount} on leave
                </span>

                <button
                  onClick={handleSaveSubmit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <CheckSquare size={14} />
                  <span>Submit Attendance Sheet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
