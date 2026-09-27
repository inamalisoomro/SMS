/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  AlertTriangle, 
  Search,
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { Student, Class, AttendanceRecord } from '../types';

interface AnalyticsViewProps {
  students: Student[];
  classes: Class[];
  attendance: AttendanceRecord[];
}

export default function AnalyticsView({
  students,
  classes,
  attendance
}: AnalyticsViewProps) {
  const [studentSearch, setStudentSearch] = useState('');

  // --- ANALYTICS CALCULATIONS ---

  // 1. Line Chart: Last 7 Days Attendance Trend
  // Get list of last 7 unique dates where attendance was recorded
  const uniqueDates = Array.from(new Set(attendance.map(r => r.date)))
    .sort()
    .slice(-7);

  const trendData = uniqueDates.map(dateStr => {
    const dayRecords = attendance.filter(r => r.date === dateStr);
    const present = dayRecords.filter(r => r.status === 'present').length;
    const late = dayRecords.filter(r => r.status === 'late').length;
    const leave = dayRecords.filter(r => r.status === 'leave').length;
    const total = dayRecords.length;

    const rate = total > 0 ? Math.round(((present + late + leave) / total) * 100) : 0;
    
    // Formatting date label like "Jul 17"
    const d = new Date(dateStr);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

    return { label, value: rate, date: dateStr };
  });

  // 2. Pie Chart: Overall Status Ratio
  const totalRecordsCount = attendance.length;
  const presentCount = attendance.filter(r => r.status === 'present').length;
  const absentCount = attendance.filter(r => r.status === 'absent').length;
  const lateCount = attendance.filter(r => r.status === 'late').length;
  const leaveCount = attendance.filter(r => r.status === 'leave').length;

  const presentPercentage = totalRecordsCount > 0 ? Math.round((presentCount / totalRecordsCount) * 100) : 0;
  const absentPercentage = totalRecordsCount > 0 ? Math.round((absentCount / totalRecordsCount) * 100) : 0;
  const latePercentage = totalRecordsCount > 0 ? Math.round((lateCount / totalRecordsCount) * 100) : 0;
  const leavePercentage = totalRecordsCount > 0 ? Math.round((leaveCount / totalRecordsCount) * 100) : 0;

  // 3. Class-wise Averages (Vertical Bar Chart)
  const classAverages = classes.map(cls => {
    const classRecords = attendance.filter(r => r.classId === cls.id);
    const present = classRecords.filter(r => r.status === 'present').length;
    const late = classRecords.filter(r => r.status === 'late').length;
    const leave = classRecords.filter(r => r.status === 'leave').length;
    const total = classRecords.length;

    const rate = total > 0 ? Math.round(((present + late + leave) / total) * 100) : 0;

    return {
      label: `${cls.name}-${cls.section}`,
      value: rate,
      totalCount: total
    };
  });

  // 4. Student Attendance List & Attendance Risk Warnings
  const studentMetrics = students.map(st => {
    const stRecords = attendance.filter(r => r.studentId === st.id);
    const total = stRecords.length;
    const present = stRecords.filter(r => r.status === 'present').length;
    const late = stRecords.filter(r => r.status === 'late').length;
    const leave = stRecords.filter(r => r.status === 'leave').length;

    const rate = total > 0 ? Math.round(((present + late + leave) / total) * 100) : 100; // default to 100 if no classes recorded

    const cls = classes.find(c => c.id === st.classId);

    return {
      ...st,
      className: cls ? `${cls.name}-${cls.section}` : 'N/A',
      rate,
      totalClasses: total
    };
  });

  const filteredStudentMetrics = studentMetrics.filter(m => 
    m.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    m.studentId.toLowerCase().includes(studentSearch.toLowerCase())
  ).sort((a, b) => a.rate - b.rate); // low attendance rates first

  // Risk count (< 75%)
  const studentsAtRisk = studentMetrics.filter(m => m.rate < 75 && m.totalClasses > 0);

  // --- SVG DRAWING HELPERS ---

  // Donut chart path drawing (Sector ring)
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

    return <path d={pathData} fill={color} stroke="white" strokeWidth="1" className="transition-all duration-300 hover:opacity-90 cursor-pointer" />;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Upper Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
            Visual Analytics Dashboard
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time biometric insights, attendance trend mapping, and classroom performance audits.
          </p>
        </div>

        {/* Risk Status Indicator */}
        {studentsAtRisk.length > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 rounded-lg text-xs font-semibold shadow-inner">
            <AlertTriangle size={13} />
            <span>{studentsAtRisk.length} Student(s) below 75% attendance threshold!</span>
          </div>
        )}
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* 1. LINE CHART: TREND MAPPING */}
        <div className="lg:col-span-8 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={15} className="text-indigo-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Attendance Trend (Last 7 Sessions)</h3>
            </div>
            <span className="font-mono text-[9px] text-slate-400">DAILY OVERALL RATE %</span>
          </div>

          <div className="flex-1 flex items-end justify-center w-full pb-1 relative min-h-[170px]">
            {trendData.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8 font-sans">Insufficient data to render trend. Submit attendance across multiple days.</p>
            ) : (
              <div className="w-full h-full flex flex-col justify-between">
                {/* Visual SVG Drawing Area */}
                <div className="flex-1 w-full relative">
                  <svg className="w-full h-full min-h-[140px]" viewBox="0 0 500 150" preserveAspectRatio="none">
                    {/* Grid Y-lines */}
                    {[20, 50, 80, 110, 140].map((y, idx) => (
                      <line key={idx} x1="30" y1={y} x2="490" y2={y} stroke="#f1f5f9" className="dark:stroke-slate-800/40" strokeWidth="1" />
                    ))}

                    {/* Chart Path Line drawing */}
                    {(() => {
                      const points = trendData.map((d, idx) => {
                        const x = 30 + (idx * 450) / (trendData.length - 1);
                        // map 0-100 percentage to 140-20 Y coordinates
                        const y = 140 - (d.value / 100) * 120;
                        return { x, y };
                      });

                      const pathD = points.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, '');

                      const areaD = points.length > 0 
                        ? `${pathD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`
                        : '';

                      return (
                        <>
                          {/* Gradient filled area under line */}
                          <defs>
                            <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path d={areaD} fill="url(#trend-grad)" />

                          {/* Smooth stroke path */}
                          <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Data dots */}
                          {points.map((p, idx) => (
                            <g key={idx} className="group/dot cursor-pointer">
                              <circle cx={p.x} cy={p.y} r="3.5" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
                              <circle cx={p.x} cy={p.y} r="7" fill="#4f46e5" className="opacity-0 group-hover/dot:opacity-20 transition-all duration-200" />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* X labels */}
                <div className="flex justify-between font-sans text-[9px] text-slate-400 font-semibold px-[25px] pt-1">
                  {trendData.map((d, idx) => (
                    <div key={idx} className="text-center w-14 truncate">
                      {d.label}
                      <span className="block font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. PIE CHART: OVERALL DISTRIBUTION */}
        <div className="lg:col-span-4 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
            <div className="flex items-center gap-1.5">
              <PieIcon size={15} className="text-violet-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Status Share (Overall)</h3>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {totalRecordsCount === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8 font-sans">No logs saved yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                {/* Circular SVG Donut */}
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 160 160">
                    {(() => {
                      // Pie shares mapping
                      const shares = [
                        { val: presentPercentage, color: '#10b981' }, // emerald-500
                        { val: absentPercentage, color: '#f43f5e' }, // rose-500
                        { val: latePercentage, color: '#f59e0b' }, // amber-500
                        { val: leavePercentage, color: '#6366f1' } // indigo-500
                      ].filter(s => s.val > 0);

                      let accumulated = 0;
                      return shares.map((segment, idx) => {
                        const start = accumulated;
                        const end = accumulated + segment.val;
                        accumulated = end;
                        return (
                          <g key={idx}>
                            {drawDonutSegment(start, end, segment.color)}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                  {/* Inner text block */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="font-mono font-bold text-base text-slate-800 dark:text-slate-100">{totalRecordsCount}</span>
                    <span className="text-[8px] uppercase font-mono text-slate-400 font-semibold mt-0.5">Logs</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-sans w-full px-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-emerald-500 flex-shrink-0" />
                    <span className="text-slate-500 truncate">PRESENT: <strong className="text-slate-700 dark:text-slate-300 font-mono">{presentPercentage}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-rose-500 flex-shrink-0" />
                    <span className="text-slate-500 truncate">ABSENT: <strong className="text-slate-700 dark:text-slate-300 font-mono">{absentPercentage}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-amber-500 flex-shrink-0" />
                    <span className="text-slate-500 truncate">LATE: <strong className="text-slate-700 dark:text-slate-300 font-mono">{latePercentage}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-indigo-500 flex-shrink-0" />
                    <span className="text-slate-500 truncate">LEAVE: <strong className="text-slate-700 dark:text-slate-300 font-mono">{leavePercentage}%</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. CLASS-WISE AVERAGES BAR CHART */}
        <div className="lg:col-span-4 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
            <div className="flex items-center gap-1.5">
              <GraduationCap size={15} className="text-amber-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Class Averages</h3>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2.5">
            {classAverages.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8 font-sans">No classes registered.</p>
            ) : (
              classAverages.map((cls, idx) => (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="font-sans font-semibold">{cls.label}</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{cls.value}% Avg</span>
                  </div>
                  {/* Bar background track */}
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 overflow-hidden relative border border-slate-200/20">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cls.value}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${
                        cls.value >= 85 
                          ? 'bg-emerald-500' 
                          : cls.value >= 75 
                          ? 'bg-amber-500' 
                          : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. STUDENT ATTENDANCE DIRECTORY & AT-RISK ANALYSIS */}
        <div className="lg:col-span-8 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm flex flex-col min-h-[280px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={15} className="text-indigo-500" />
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Student Attendance Ledger</h3>
            </div>
            
            {/* Inner search query */}
            <div className="relative max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search pupil..."
                className="pl-7 pr-2.5 py-1 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[200px] pr-1 space-y-2">
            {filteredStudentMetrics.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8 font-sans">No search results found.</p>
            ) : (
              filteredStudentMetrics.map((st) => (
                <div 
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-900/10"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-sans font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                        {st.name}
                      </h4>
                      <p className="font-sans text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                        ID: {st.studentId} • Class {st.className}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className={`font-mono text-[11px] font-bold ${
                        st.rate >= 85 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : st.rate >= 75 
                          ? 'text-amber-500' 
                          : 'text-rose-500'
                      }`}>
                        {st.rate}%
                      </span>
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-medium font-mono">{st.totalClasses} classes</span>
                    </div>

                    {/* Status dot warning code */}
                    {st.rate < 75 && st.totalClasses > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" title="At Risk! Attendance below 75%" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-500/30 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
