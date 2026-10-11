/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  AlertTriangle, 
  Search,
  CheckCircle,
  GraduationCap,
  ArrowLeft,
  Info,
  Calendar,
  Users
} from 'lucide-react';
import { Student, Class, AttendanceRecord } from '../types';
import { getAttendanceStats } from '../utils';

interface AnalyticsViewProps {
  students: Student[];
  classes: Class[];
  attendance: AttendanceRecord[];
  onNavigate?: (tab: string) => void;
}

export default function AnalyticsView({
  students,
  classes,
  attendance,
  onNavigate
}: AnalyticsViewProps) {
  const [studentSearch, setStudentSearch] = useState('');

  // --- ANALYTICS CALCULATIONS ---

  // 1. Line Chart: Last 7 Days Attendance Trend
  const trendData = useMemo(() => {
    const uniqueDates = Array.from(new Set(attendance.map(r => r.date)))
      .sort()
      .slice(-7);

    return uniqueDates.map(dateStr => {
      const dayRecords = attendance.filter(r => r.date === dateStr);
      const stats = getAttendanceStats(dayRecords);
      
      // Format date label
      const d = new Date(dateStr + 'T00:00:00');
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

      return { 
        label, 
        value: stats.percentage || 0, 
        date: dateStr,
        total: stats.total
      };
    });
  }, [attendance]);

  // 2. Pie Chart: Overall Status Distribution
  const overallStats = useMemo(() => getAttendanceStats(attendance), [attendance]);

  const pieSegments = useMemo(() => {
    if (overallStats.total === 0) return [];
    
    const total = overallStats.total;
    return [
      { label: 'Present', count: overallStats.present, percentage: (overallStats.present / total) * 100, color: '#10b981' },
      { label: 'Absent', count: overallStats.absent, percentage: (overallStats.absent / total) * 100, color: '#ef4444' },
      { label: 'Late', count: overallStats.late, percentage: (overallStats.late / total) * 100, color: '#f59e0b' },
      { label: 'Leave', count: overallStats.leave, percentage: (overallStats.leave / total) * 100, color: '#6366f1' }
    ].filter(seg => seg.count > 0);
  }, [overallStats]);

  // 3. Class-wise Averages (Bar Chart)
  const classAverages = useMemo(() => {
    return classes.map(cls => {
      const classRecords = attendance.filter(r => r.classId === cls.id);
      const stats = getAttendanceStats(classRecords);

      return {
        label: `${cls.name}-${cls.section}`,
        value: stats.percentage || 0,
        totalCount: stats.total,
        hasRecords: stats.total > 0
      };
    }).filter(item => item.hasRecords); // Only show classes with records
  }, [classes, attendance]);

  // 4. Student Metrics with Risk Analysis
  const studentMetrics = useMemo(() => {
    return students.map(st => {
      const stRecords = attendance.filter(r => r.studentId === st.id);
      const stats = getAttendanceStats(stRecords);

      const cls = classes.find(c => c.id === st.classId);

      return {
        ...st,
        className: cls ? `${cls.name}-${cls.section}` : 'N/A',
        stats
      };
    }).filter(m => m.stats.total > 0); // Only show students with records
  }, [students, attendance, classes]);

  const filteredStudentMetrics = useMemo(() => {
    return studentMetrics
      .filter(m => 
        m.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        m.studentId.toLowerCase().includes(studentSearch.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by percentage (low to high), then by name
        const aPerc = a.stats.percentage !== null ? a.stats.percentage : 100;
        const bPerc = b.stats.percentage !== null ? b.stats.percentage : 100;
        return aPerc - bPerc;
      });
  }, [studentMetrics, studentSearch]);

  // Risk count (< 75%)
  const studentsAtRisk = useMemo(() => {
    return studentMetrics.filter(m => 
      m.stats.percentage !== null && m.stats.percentage < 75
    );
  }, [studentMetrics]);

  // --- SVG DRAWING HELPERS ---

  // Donut chart segment drawing
  const drawDonutSegment = (startPercent: number, endPercent: number, color: string) => {
    const startAngle = (startPercent / 100) * 360 - 90;
    const endAngle = (endPercent / 100) * 360 - 90;

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    const cx = 80;
    const cy = 80;
    const outerRadius = 65;
    const innerRadius = 45;

    const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
    const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
    const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
    const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    const pathData = [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
      'Z'
    ].join(' ');

    return <path d={pathData} fill={color} stroke="white" strokeWidth="1" className="transition-all duration-300 hover:opacity-80" />;
  };

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
              Visual Analytics Dashboard
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive charts and trends for attendance patterns and performance analysis
            </p>
          </div>
        </div>

        {/* Risk Status Indicator */}
        {studentsAtRisk.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold">
            <AlertTriangle size={14} />
            <span>{studentsAtRisk.length} Student(s) below 75% attendance</span>
          </div>
        )}
      </div>

      {/* Overall Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Total Records</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{overallStats.total}</div>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-3 rounded-xl">
          <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-1">Present</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{overallStats.present}</div>
        </div>
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/50 p-3 rounded-xl">
          <div className="text-[9px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold mb-1">Absent</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{overallStats.absent}</div>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3 rounded-xl">
          <div className="text-[9px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">Late</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{overallStats.late}</div>
        </div>
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 p-3 rounded-xl relative group">
          <div className="text-[9px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold mb-1 flex items-center gap-1">
            Attendance % <Info size={10} className="cursor-help" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {overallStats.percentage !== null ? `${overallStats.percentage}%` : 'N/A'}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <strong>Formula:</strong> (Present + Late) / (Present + Absent + Late) × 100
            <br />
            <em className="text-slate-300">Leave excluded</em>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 1. LINE CHART: TREND */}
        <div className="lg:col-span-8 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm min-h-[300px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">7-Day Attendance Trend</h3>
            </div>
            <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">Daily Rate %</span>
          </div>

          {trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Calendar size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No attendance data available</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Start marking attendance to see trends</p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-48 px-2">
              {trendData.map((point, idx) => {
                const maxHeight = 160;
                const height = (point.value / 100) * maxHeight;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    {/* Bar */}
                    <div className="relative flex-1 flex items-end w-full justify-center">
                      <div 
                        className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-300 group-hover:from-indigo-700 group-hover:to-indigo-500 relative"
                        style={{ height: `${height}px` }}
                      >
                        {/* Percentage label on hover */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {point.value}%
                        </div>
                      </div>
                    </div>
                    {/* Date label */}
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-semibold">{point.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. PIE/DONUT CHART: STATUS DISTRIBUTION */}
        <div className="lg:col-span-4 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm min-h-[300px]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <PieIcon size={16} className="text-indigo-500" />
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Status Distribution</h3>
          </div>

          {pieSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <PieIcon size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No data to display</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* SVG Donut */}
              <svg width="160" height="160" viewBox="0 0 160 160" className="mb-4">
                {(() => {
                  let cumulativePercent = 0;
                  return pieSegments.map((segment, idx) => {
                    const startPercent = cumulativePercent;
                    cumulativePercent += segment.percentage;
                    return (
                      <g key={idx}>
                        {drawDonutSegment(startPercent, cumulativePercent, segment.color)}
                      </g>
                    );
                  });
                })()}
                {/* Center text */}
                <text x="80" y="75" textAnchor="middle" className="text-xs font-bold fill-slate-700 dark:fill-slate-300">
                  {overallStats.total}
                </text>
                <text x="80" y="90" textAnchor="middle" className="text-[10px] fill-slate-400">
                  Records
                </text>
              </svg>

              {/* Legend */}
              <div className="w-full space-y-1.5">
                {pieSegments.map((segment, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{segment.label}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {segment.count} ({segment.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. CLASS-WISE BAR CHART */}
        <div className="lg:col-span-12 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Class-wise Attendance Comparison</h3>
            </div>
            <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">Attendance Rate %</span>
          </div>

          {classAverages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <GraduationCap size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No class attendance data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classAverages.map((cls, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cls.label}</span>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{cls.value}%</span>
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        cls.value >= 90 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                        cls.value >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                        cls.value >= 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                        'bg-gradient-to-r from-rose-500 to-rose-400'
                      }`}
                      style={{ width: `${cls.value}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                        {cls.totalCount} records
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. STUDENT LIST WITH SEARCH */}
        <div className="lg:col-span-12 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Student Attendance Performance</h3>
            </div>
            
            {/* Search */}
            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>

          {filteredStudentMetrics.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
                {studentSearch ? 'No students found matching your search' : 'No student attendance records'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Student</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Class</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Sessions</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold text-center">Present</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold text-center">Absent</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold text-center">Late</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Rate</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredStudentMetrics.map(student => {
                    const percentage = student.stats.percentage !== null ? student.stats.percentage : 0;
                    const isAtRisk = percentage < 75;
                    
                    return (
                      <tr key={student.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/20 ${isAtRisk ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{student.studentId}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{student.className}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">{student.stats.total}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{student.stats.present}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-rose-600 dark:text-rose-400">{student.stats.absent}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">{student.stats.late}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-mono font-bold ${
                            percentage >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                            percentage >= 75 ? 'text-blue-600 dark:text-blue-400' :
                            percentage >= 60 ? 'text-amber-600 dark:text-amber-400' :
                            'text-rose-600 dark:text-rose-400'
                          }`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isAtRisk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                              <AlertTriangle size={10} />
                              At Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                              <CheckCircle size={10} />
                              Good
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
