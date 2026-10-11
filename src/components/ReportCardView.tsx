/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Printer, 
  Award,
  Calendar,
  User,
  Hash,
  BookOpen,
  BarChart3,
  FileText,
  School
} from 'lucide-react';
import { Result, Student, AppSettings, Examination, Class } from '../types';

interface ReportCardViewProps {
  result: Result;
  student: Student;
  examination: Examination;
  settings: AppSettings;
  classes: Class[];
  onNavigate?: (tab: string) => void;
  calculateGrade: (percentage: number) => string;
}

export default function ReportCardView({
  result,
  student,
  examination,
  settings,
  classes,
  onNavigate,
  calculateGrade
}: ReportCardViewProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  // Get student's class
  const studentClass = useMemo(() => {
    return classes.find(c => c.id === student.classId);
  }, [classes, student.classId]);

  const className = studentClass ? `${studentClass.name}-${studentClass.section}` : 'Unknown Class';

  // Format date
  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle print
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMarks = result.totalObtained;
    const maxMarks = result.totalMaxMarks;
    const percentage = result.percentage;
    const grade = result.overallGrade;
    
    // Calculate highest and lowest subject scores
    let highest = { name: '', percentage: 0 };
    let lowest = { name: '', percentage: 100 };
    
    result.subjects.forEach(subj => {
      const subjPercentage = (subj.marksObtained / subj.totalMarks) * 100;
      if (subjPercentage > highest.percentage) {
        highest = { name: subj.subjectName, percentage: subjPercentage };
      }
      if (subjPercentage < lowest.percentage) {
        lowest = { name: subj.subjectName, percentage: subjPercentage };
      }
    });

    return { totalMarks, maxMarks, percentage, grade, highest, lowest };
  }, [result]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header - Hide on print */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('marks')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Back to Marks Entry"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
              Student Report Card
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {student.name} - {examination.name}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold shadow transition-all disabled:cursor-not-allowed"
        >
          <Printer size={16} />
          <span>{isPrinting ? 'Preparing...' : 'Print Report Card'}</span>
        </button>
      </div>

      {/* Report Card Container */}
      <div className="bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-800 print:border-slate-300 rounded-xl print:rounded-none shadow-lg print:shadow-none overflow-hidden">
        {/* School Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 print:from-indigo-600 print:to-purple-600 text-white print:text-white p-6 print:p-8 text-center border-b-4 border-amber-400">
          <div className="flex items-center justify-center gap-3 mb-2">
            {settings.schoolLogoImage ? (
              <img 
                src={settings.schoolLogoImage} 
                alt="School Logo" 
                className="w-12 h-12 print:w-14 print:h-14 object-contain bg-white rounded-full p-1"
              />
            ) : (
              <div className="text-4xl print:text-5xl">{settings.schoolLogo}</div>
            )}
            <h1 className="font-sans font-bold text-2xl print:text-3xl tracking-tight">
              {settings.schoolName}
            </h1>
          </div>
          {settings.schoolAddress && (
            <p className="text-sm print:text-base text-indigo-100 print:text-indigo-100 mb-1">
              {settings.schoolAddress}
            </p>
          )}
          {settings.schoolPhone && (
            <p className="text-sm print:text-base text-indigo-100 print:text-indigo-100">
              {settings.schoolPhone}
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-indigo-400/30">
            <h2 className="font-sans font-bold text-xl print:text-2xl">
              STUDENT REPORT CARD
            </h2>
            <p className="text-sm print:text-base text-indigo-100 print:text-indigo-100 mt-1">
              Academic Year: {settings.academicYear}
            </p>
          </div>
        </div>

        {/* Student Information */}
        <div className="p-6 print:p-8 bg-slate-50 dark:bg-slate-950/30 print:bg-slate-50 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/30 print:bg-indigo-100 rounded-lg">
                <User size={18} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
              </div>
              <div>
                <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                  Student Name
                </p>
                <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                  {student.name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 print:bg-emerald-100 rounded-lg">
                <Hash size={18} className="text-emerald-600 dark:text-emerald-400 print:text-emerald-600" />
              </div>
              <div>
                <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                  Roll Number
                </p>
                <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 font-mono mt-0.5">
                  {student.rollNumber}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-950/30 print:bg-cyan-100 rounded-lg">
                <School size={18} className="text-cyan-600 dark:text-cyan-400 print:text-cyan-600" />
              </div>
              <div>
                <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                  Class
                </p>
                <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                  {className}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/30 print:bg-amber-100 rounded-lg">
                <FileText size={18} className="text-amber-600 dark:text-amber-400 print:text-amber-600" />
              </div>
              <div>
                <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                  Examination
                </p>
                <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                  {examination.name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950/30 print:bg-purple-100 rounded-lg">
                <Calendar size={18} className="text-purple-600 dark:text-purple-400 print:text-purple-600" />
              </div>
              <div>
                <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                  Exam Date
                </p>
                <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                  {formatDate(examination.examDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/30 print:bg-rose-100 rounded-lg">
                <Calendar size={18} className="text-rose-600 dark:text-rose-400 print:text-rose-600" />
              </div>
              <div>
                <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                  Published On
                </p>
                <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                  {result.publishedAt ? formatDate(result.publishedAt) : 'Not Published'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        <div className="p-6 print:p-8">
          <div className="flex items-center gap-2 mb-4 print:mb-6">
            <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
            <h3 className="font-sans font-bold text-lg print:text-xl text-slate-800 dark:text-slate-100 print:text-slate-800">
              Subject-wise Performance
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 print:bg-slate-100">
                  <th className="text-left px-4 py-3 print:py-4 text-xs print:text-sm font-bold text-slate-600 dark:text-slate-300 print:text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 dark:border-slate-700 print:border-slate-400">
                    Subject
                  </th>
                  <th className="text-center px-4 py-3 print:py-4 text-xs print:text-sm font-bold text-slate-600 dark:text-slate-300 print:text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 dark:border-slate-700 print:border-slate-400">
                    Marks Obtained
                  </th>
                  <th className="text-center px-4 py-3 print:py-4 text-xs print:text-sm font-bold text-slate-600 dark:text-slate-300 print:text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 dark:border-slate-700 print:border-slate-400">
                    Total Marks
                  </th>
                  <th className="text-center px-4 py-3 print:py-4 text-xs print:text-sm font-bold text-slate-600 dark:text-slate-300 print:text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 dark:border-slate-700 print:border-slate-400">
                    Percentage
                  </th>
                  <th className="text-center px-4 py-3 print:py-4 text-xs print:text-sm font-bold text-slate-600 dark:text-slate-300 print:text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 dark:border-slate-700 print:border-slate-400">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.subjects.map((subject, index) => {
                  const percentage = (subject.marksObtained / subject.totalMarks) * 100;
                  return (
                    <tr 
                      key={subject.subjectId}
                      className={`border-b border-slate-200 dark:border-slate-800 print:border-slate-300 ${
                        index % 2 === 0 ? 'bg-white dark:bg-slate-900 print:bg-white' : 'bg-slate-50/50 dark:bg-slate-950/30 print:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-4 py-3 print:py-4 text-sm print:text-base text-slate-700 dark:text-slate-300 print:text-slate-800 font-medium">
                        {subject.subjectName}
                      </td>
                      <td className="px-4 py-3 print:py-4 text-center text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                        {subject.marksObtained}
                      </td>
                      <td className="px-4 py-3 print:py-4 text-center text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                        {subject.totalMarks}
                      </td>
                      <td className="px-4 py-3 print:py-4 text-center text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                        {percentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 print:py-4 text-center">
                        <span className={`inline-block px-3 py-1 print:px-4 print:py-1.5 rounded-full text-sm print:text-base font-bold ${
                          percentage >= 90 ? 'bg-emerald-100 text-emerald-700 print:bg-emerald-100 print:text-emerald-700' :
                          percentage >= 75 ? 'bg-cyan-100 text-cyan-700 print:bg-cyan-100 print:text-cyan-700' :
                          percentage >= 60 ? 'bg-amber-100 text-amber-700 print:bg-amber-100 print:text-amber-700' :
                          percentage >= 45 ? 'bg-orange-100 text-orange-700 print:bg-orange-100 print:text-orange-700' :
                          'bg-rose-100 text-rose-700 print:bg-rose-100 print:text-rose-700'
                        }`}>
                          {subject.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 dark:bg-indigo-950/20 print:bg-indigo-50">
                  <td className="px-4 py-4 print:py-5 text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 uppercase">
                    Total
                  </td>
                  <td className="px-4 py-4 print:py-5 text-center text-lg print:text-xl font-bold text-indigo-700 dark:text-indigo-400 print:text-indigo-700">
                    {stats.totalMarks}
                  </td>
                  <td className="px-4 py-4 print:py-5 text-center text-lg print:text-xl font-bold text-indigo-700 dark:text-indigo-400 print:text-indigo-700">
                    {stats.maxMarks}
                  </td>
                  <td className="px-4 py-4 print:py-5 text-center text-lg print:text-xl font-bold text-indigo-700 dark:text-indigo-400 print:text-indigo-700">
                    {stats.percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-4 print:py-5 text-center">
                    <span className="inline-block px-4 py-1.5 print:px-5 print:py-2 rounded-full text-base print:text-lg font-bold bg-indigo-600 text-white print:bg-indigo-600 print:text-white">
                      {stats.grade}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="p-6 print:p-8 bg-slate-50 dark:bg-slate-950/30 print:bg-slate-50 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
          <div className="flex items-center gap-2 mb-4 print:mb-6">
            <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
            <h3 className="font-sans font-bold text-lg print:text-xl text-slate-800 dark:text-slate-100 print:text-slate-800">
              Performance Summary
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-6">
            <div className="bg-white dark:bg-slate-900 print:bg-white border border-emerald-200 dark:border-emerald-800 print:border-emerald-300 rounded-lg p-4 print:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-emerald-600 dark:text-emerald-400 print:text-emerald-600" />
                <p className="text-xs print:text-sm font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-600 uppercase tracking-wide">
                  Highest Score
                </p>
              </div>
              <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                {stats.highest.name}
              </p>
              <p className="text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1">
                {stats.highest.percentage.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 print:bg-white border border-amber-200 dark:border-amber-800 print:border-amber-300 rounded-lg p-4 print:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-amber-600 dark:text-amber-400 print:text-amber-600" />
                <p className="text-xs print:text-sm font-semibold text-amber-600 dark:text-amber-400 print:text-amber-600 uppercase tracking-wide">
                  Needs Improvement
                </p>
              </div>
              <p className="text-base print:text-lg font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                {stats.lowest.name}
              </p>
              <p className="text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1">
                {stats.lowest.percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {result.remarks && (
            <div className="mt-4 print:mt-6 bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-800 print:border-slate-300 rounded-lg p-4 print:p-5">
              <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide mb-2">
                Teacher's Remarks
              </p>
              <p className="text-sm print:text-base text-slate-700 dark:text-slate-300 print:text-slate-800 leading-relaxed">
                {result.remarks}
              </p>
            </div>
          )}
        </div>

        {/* Grading Scale Reference */}
        <div className="p-6 print:p-8 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 bg-white dark:bg-slate-900 print:bg-white">
          <h4 className="text-xs print:text-sm font-bold text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase tracking-wide mb-3 print:mb-4">
            Grading Scale
          </h4>
          <div className="flex flex-wrap gap-2 print:gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-6 print:w-10 print:h-7 bg-emerald-100 print:bg-emerald-100 rounded"></span>
              <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">A (90-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-6 print:w-10 print:h-7 bg-cyan-100 print:bg-cyan-100 rounded"></span>
              <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">B (75-89%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-6 print:w-10 print:h-7 bg-amber-100 print:bg-amber-100 rounded"></span>
              <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">C (60-74%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-6 print:w-10 print:h-7 bg-orange-100 print:bg-orange-100 rounded"></span>
              <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">D (45-59%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-6 print:w-10 print:h-7 bg-rose-100 print:bg-rose-100 rounded"></span>
              <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">F (Below 45%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 print:p-8 bg-slate-100 dark:bg-slate-950/50 print:bg-slate-100 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
          <p className="text-center text-xs print:text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">
            This is an official document generated by {settings.schoolName} Student Attendance Management System.
          </p>
          <p className="text-center text-xs print:text-sm text-slate-400 dark:text-slate-500 print:text-slate-500 mt-1">
            Generated on {formatDate(Date.now())}
          </p>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:text-white {
            color: white !important;
          }
          
          .print\\:border-slate-300 {
            border-color: #cbd5e1 !important;
          }
          
          .print\\:from-indigo-600 {
            --tw-gradient-from: #4f46e5 !important;
          }
          
          .print\\:to-purple-600 {
            --tw-gradient-to: #9333ea !important;
          }
        }
      `}</style>
    </div>
  );
}
