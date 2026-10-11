/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  CheckSquare, 
  Database,
  Calendar,
  ArrowRight,
  BookOpen,
  Megaphone,
  Mail,
  MailX,
  TrendingUp,
  UserPlus,
  UserCheck,
  FileText,
  Award,
  FileBadge,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Student, Class, Subject, AttendanceRecord, ActivityLog, Teacher, Examination, Result, FeeCharge, Payment } from '../types';

interface DashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  logs: ActivityLog[];
  announcements: any[];
  examinations?: Examination[];
  results?: Result[];
  feeCharges?: FeeCharge[];
  payments?: Payment[];
  onNavigate: (tab: string) => void;
  triggerBackup: () => void;
}

export default function DashboardView({
  students,
  teachers,
  classes,
  subjects,
  attendance,
  logs,
  announcements,
  examinations = [],
  results = [],
  feeCharges = [],
  payments = [],
  onNavigate,
  triggerBackup
}: DashboardViewProps) {
  // Get today's date in local YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStart = new Date(todayStr).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  // Calculate stats
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;
  const totalSubjects = subjects.length;
  const totalAnnouncements = announcements.length;

  // Students Registered Today
  const studentsRegisteredToday = useMemo(() => {
    return students.filter(s => {
      if (!s.registeredAt) return false;
      return s.registeredAt >= todayStart && s.registeredAt < todayEnd;
    }).length;
  }, [students, todayStart, todayEnd]);

  // Teachers Registered Today
  const teachersRegisteredToday = useMemo(() => {
    return teachers.filter(t => {
      if (!t.registeredAt) return false;
      return t.registeredAt >= todayStart && t.registeredAt < todayEnd;
    }).length;
  }, [teachers, todayStart, todayEnd]);

  // Today's attendance records
  const todayRecords = attendance.filter(r => r.date === todayStr);
  const presentToday = todayRecords.filter(r => r.status === 'present').length;
  const absentToday = todayRecords.filter(r => r.status === 'absent').length;
  const lateToday = todayRecords.filter(r => r.status === 'late').length;
  const leaveToday = todayRecords.filter(r => r.status === 'leave').length;

  const totalMarkedToday = todayRecords.length;
  // Attendance rate formula: (Present + Late) / (Present + Absent + Late) × 100
  // Excludes approved leave from calculation
  const applicableToday = presentToday + absentToday + lateToday;
  const attendanceRateToday = applicableToday > 0 
    ? Math.round(((presentToday + lateToday) / applicableToday) * 100) 
    : 0;

  // Email Statistics (from announcements)
  const emailStats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    announcements.forEach(ann => {
      if (ann.emailsSent) sent += ann.emailsSent;
      if (ann.emailsFailed) failed += ann.emailsFailed;
    });
    return { sent, failed };
  }, [announcements]);

  // Examination Statistics
  const totalExaminations = examinations.length;
  const publishedResults = useMemo(() => {
    return results.filter(r => !r.isDraft).length;
  }, [results]);
  const draftResults = useMemo(() => {
    return results.filter(r => r.isDraft).length;
  }, [results]);

  // Fee Statistics
  const feeStats = useMemo(() => {
    let totalOutstanding = 0;
    let totalCollected = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    feeCharges.forEach(charge => {
      const netCharge = charge.amount - charge.discount;
      const chargePayments = payments.filter(p => p.feeChargeId === charge.id && !p.isVoided);
      const totalPaid = chargePayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, netCharge - totalPaid);
      
      totalOutstanding += balance;
      
      if (balance > 0 && charge.dueDate < today) {
        totalOverdue += balance;
        overdueCount++;
      }
    });
    
    payments.filter(p => !p.isVoided).forEach(payment => {
      totalCollected += payment.amount;
    });
    
    return {
      totalOutstanding,
      totalCollected,
      totalOverdue,
      overdueCount,
    };
  }, [feeCharges, payments]);

  // Recent logs
  const recentLogs = logs.slice(0, 4);

  // Class-wise submission tracker for today
  const classSubmissionStatus = classes.map(cls => {
    const classRecords = todayRecords.filter(r => r.classId === cls.id);
    const isSubmitted = classRecords.length > 0;
    const classStudentCount = students.filter(s => s.classId === cls.id).length;
    
    return {
      ...cls,
      isSubmitted,
      studentCount: classStudentCount,
      presentCount: classRecords.filter(r => r.status === 'present').length,
    };
  });

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 max-w-7xl mx-auto"
    >
      {/* Top Banner Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
            Dashboard Overview
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time local metrics and quick administrative operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 font-mono text-[10px] text-slate-600 dark:text-slate-400 shadow-sm flex items-center gap-2">
            <Calendar size={12} className="text-indigo-500" />
            <span>TODAY: {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid - 8 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Students */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('students')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Total Students</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{totalStudents}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Registered pupils</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:scale-105 transition-transform duration-300">
              <Users size={22} />
            </div>
          </div>
        </motion.div>

        {/* Students Registered Today */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('students')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Registered Today</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{studentsRegisteredToday}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">New registrations</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <UserPlus size={22} />
            </div>
          </div>
        </motion.div>

        {/* Total Teachers */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('teachers')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Total Teachers</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{totalTeachers}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Registered instructors</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center text-violet-500 dark:text-violet-400 group-hover:scale-105 transition-transform duration-300">
              <UserCheck size={22} />
            </div>
          </div>
        </motion.div>

        {/* Teachers Registered Today */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('teachers')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Teachers Today</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{teachersRegisteredToday}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">New hires</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/20 flex items-center justify-center text-fuchsia-500 dark:text-fuchsia-400 group-hover:scale-105 transition-transform duration-300">
              <UserPlus size={22} />
            </div>
          </div>
        </motion.div>

        {/* Total Classes */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('classes')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Active Classes</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{totalClasses}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">With sections</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-transform duration-300">
              <GraduationCap size={22} />
            </div>
          </div>
        </motion.div>

        {/* Total Subjects */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('subjects')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Subjects</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{totalSubjects}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Course catalog</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 flex items-center justify-center text-cyan-500 dark:text-cyan-400 group-hover:scale-105 transition-transform duration-300">
              <BookOpen size={22} />
            </div>
          </div>
        </motion.div>

        {/* Today's Attendance Rate */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-3.5">
            {/* Circular SVG Gauge */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500 transition-all duration-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${attendanceRateToday}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-sans font-bold text-sm text-slate-700 dark:text-slate-200">
                {attendanceRateToday}%
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Attendance Today</span>
              <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">
                {totalMarkedToday > 0 ? `${totalMarkedToday} marked` : 'No data'}
              </h3>
              <p className="font-sans text-[9px] text-slate-400 dark:text-slate-500">Present/late/leave rate</p>
            </div>
          </div>
        </motion.div>

        {/* Announcements */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('announcements')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Announcements</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{totalAnnouncements}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Posted messages</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-purple-500 dark:text-purple-400 group-hover:scale-105 transition-transform duration-300">
              <Megaphone size={22} />
            </div>
          </div>
        </motion.div>

        {/* Total Examinations */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('examinations')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Examinations</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{totalExaminations}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Total exams</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform duration-300">
              <FileText size={22} />
            </div>
          </div>
        </motion.div>

        {/* Published Results */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('examinations')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Published Results</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{publishedResults}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Visible to parents</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <Award size={22} />
            </div>
          </div>
        </motion.div>

        {/* Draft Results */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('marks')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Draft Results</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">{draftResults}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Not yet published</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-transform duration-300">
              <FileBadge size={22} />
            </div>
          </div>
        </motion.div>

        {/* Outstanding Fees */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('fees')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Outstanding Balance</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">${feeStats.totalOutstanding.toFixed(0)}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">Pending payments</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 dark:text-orange-400 group-hover:scale-105 transition-transform duration-300">
              <DollarSign size={22} />
            </div>
          </div>
        </motion.div>

        {/* Total Collected */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('fees')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Total Collected</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">${feeStats.totalCollected.toFixed(0)}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">All payments</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <DollarSign size={22} />
            </div>
          </div>
        </motion.div>

        {/* Overdue Amount */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          onClick={() => onNavigate('fees')}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Overdue Amount</span>
              <h3 className="font-sans font-bold text-3xl text-slate-800 dark:text-slate-100">${feeStats.totalOverdue.toFixed(0)}</h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium">{feeStats.overdueCount} past due</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform duration-300">
              <AlertCircle size={22} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Today's Attendance Detail Row */}
      {totalMarkedToday > 0 && (
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle size={14} />
            </div>
            <div>
              <p className="font-sans text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Present</p>
              <h4 className="font-sans font-bold text-xs text-slate-700 dark:text-slate-200">{presentToday} Students</h4>
            </div>
          </div>
          <div className="bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/10 dark:border-rose-500/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
              <XCircle size={14} />
            </div>
            <div>
              <p className="font-sans text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Absent</p>
              <h4 className="font-sans font-bold text-xs text-slate-700 dark:text-slate-200">{absentToday} Students</h4>
            </div>
          </div>
          <div className="bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock size={14} />
            </div>
            <div>
              <p className="font-sans text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Late</p>
              <h4 className="font-sans font-bold text-xs text-slate-700 dark:text-slate-200">{lateToday} Students</h4>
            </div>
          </div>
          <div className="bg-indigo-500/5 dark:bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-500/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Calendar size={14} />
            </div>
            <div>
              <p className="font-sans text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">On Leave</p>
              <h4 className="font-sans font-bold text-xs text-slate-700 dark:text-slate-200">{leaveToday} Students</h4>
            </div>
          </div>
        </motion.div>
      )}

      {/* Email Statistics Row */}
      {(emailStats.sent > 0 || emailStats.failed > 0) && (
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/10 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Mail size={18} />
              </div>
              <div>
                <p className="font-sans text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Emails Sent</p>
                <h4 className="font-sans font-bold text-2xl text-slate-700 dark:text-slate-200">{emailStats.sent}</h4>
              </div>
            </div>
            <TrendingUp size={20} className="text-emerald-500/30" />
          </div>
          <div className="bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/10 dark:border-rose-500/10 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <MailX size={18} />
              </div>
              <div>
                <p className="font-sans text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Emails Failed</p>
                <h4 className="font-sans font-bold text-2xl text-slate-700 dark:text-slate-200">{emailStats.failed}</h4>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Core Split Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Class Overview */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-5 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm flex flex-col min-h-[300px]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800/40 mb-3.5">
            <div>
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Class Overview</h3>
              <p className="font-sans text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Today's attendance by class</p>
            </div>
            <button 
              onClick={() => onNavigate('attendance')}
              className="text-xs font-sans font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Mark <ArrowRight size={10} />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[280px] pr-1">
            {classSubmissionStatus.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <p className="text-slate-400 dark:text-slate-500 text-xs">No classes registered yet.</p>
                <button 
                  onClick={() => onNavigate('classes')}
                  className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create a Class
                </button>
              </div>
            ) : (
              classSubmissionStatus.map((cls) => (
                <div 
                  key={cls.id}
                  className="flex items-center justify-between p-2 px-3 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${
                      cls.isSubmitted 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500'
                    }`}>
                      {cls.name.match(/\d+/) || cls.name.charAt(0)}{cls.section}
                    </div>
                    <div>
                      <h4 className="font-sans font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {cls.name}-{cls.section}
                      </h4>
                      <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">
                        {cls.studentCount} students
                        {cls.isSubmitted && ` • ${cls.presentCount} present`}
                      </p>
                    </div>
                  </div>
                  <div>
                    {cls.isSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans text-[10px] font-semibold">
                        <CheckCircle size={8} /> Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-sans text-[10px] font-semibold">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* System Activity Log */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-7 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm flex flex-col min-h-[300px]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800/40 mb-3.5">
            <div>
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Recent Activity</h3>
              <p className="font-sans text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">System audit trail</p>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[240px] pr-1">
            {recentLogs.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-[11px] text-center py-6">No logged activities.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="text-[11px] border-b border-slate-100 dark:border-slate-850 pb-1.5 last:border-none">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px] text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-mono text-[8px] text-slate-400 dark:text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-sans text-slate-400 dark:text-slate-500 text-[9px] mt-0.5 leading-tight">
                    {log.details}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Grid: Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Actions Panel */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-5 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm"
        >
          <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs pb-2 border-b border-slate-200/40 dark:border-slate-800/40 mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('attendance')}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all font-sans font-medium text-[11px] text-center"
            >
              <CheckSquare size={18} />
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-all font-sans font-medium text-[11px] text-center text-slate-700 dark:text-slate-300"
            >
              <Plus size={18} className="text-slate-500" />
              <span>Add Student</span>
            </button>
            <button
              onClick={() => onNavigate('announcements')}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-all font-sans font-medium text-[11px] text-center text-slate-700 dark:text-slate-300"
            >
              <Megaphone size={18} className="text-slate-500" />
              <span>Announcement</span>
            </button>
            <button
              onClick={triggerBackup}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-all font-sans font-medium text-[11px] text-center text-slate-700 dark:text-slate-300"
            >
              <Database size={18} className="text-slate-500" />
              <span>Export Data</span>
            </button>
          </div>
        </motion.div>

        {/* Spacer */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-7"
        />
      </div>
    </motion.div>
  );
}

