/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Save, 
  Send, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  FileText,
  Users,
  BookOpen,
  Award,
  Eye
} from 'lucide-react';
import { Examination, Result, Student, Class, Subject } from '../types';

interface MarksEntryViewProps {
  examinations: Examination[];
  results: Result[];
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  onSaveResult: (result: Omit<Result, 'id'>) => Promise<void>;
  onPublishResults: (examinationId: string, classId: string) => Promise<void>;
  onNavigate?: (tab: string) => void;
  onViewReportCard?: (studentId: string, resultId: string) => void;
  calculateGrade: (percentage: number) => string;
}

interface StudentMarks {
  studentId: string;
  marks: { [subjectId: string]: string }; // String for input, converted to number on save
  remarks: string;
}

export default function MarksEntryView({
  examinations,
  results,
  students,
  classes,
  subjects,
  onSaveResult,
  onPublishResults,
  onNavigate,
  onViewReportCard,
  calculateGrade
}: MarksEntryViewProps) {
  // Selection states
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Marks entry state
  const [studentMarks, setStudentMarks] = useState<{ [studentId: string]: StudentMarks }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Get selected examination
  const selectedExam = examinations.find(e => e.id === selectedExamId);

  // Get classes for selected exam
  const availableClasses = useMemo(() => {
    if (!selectedExam) return [];
    return classes.filter(c => selectedExam.classIds.includes(c.id));
  }, [selectedExam, classes]);

  // Get subjects for selected exam
  const examSubjects = useMemo(() => {
    if (!selectedExam) return [];
    return subjects.filter(s => selectedExam.subjectIds.includes(s.id));
  }, [selectedExam, subjects]);

  // Get students for selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => s.classId === selectedClassId).sort((a, b) => 
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
    );
  }, [selectedClassId, students]);

  // Load existing results when exam/class selected
  useMemo(() => {
    if (!selectedExamId || !selectedClassId) {
      setStudentMarks({});
      return;
    }

    const newMarks: { [studentId: string]: StudentMarks } = {};
    
    classStudents.forEach(student => {
      const existingResult = results.find(
        r => r.examinationId === selectedExamId && r.studentId === student.id && r.classId === selectedClassId
      );

      if (existingResult) {
        // Load existing marks
        const marksObj: { [subjectId: string]: string } = {};
        existingResult.subjects.forEach(subj => {
          marksObj[subj.subjectId] = subj.marksObtained.toString();
        });
        newMarks[student.id] = {
          studentId: student.id,
          marks: marksObj,
          remarks: existingResult.remarks || ''
        };
      } else {
        // Initialize empty marks
        const marksObj: { [subjectId: string]: string } = {};
        examSubjects.forEach(subj => {
          marksObj[subj.id] = '';
        });
        newMarks[student.id] = {
          studentId: student.id,
          marks: marksObj,
          remarks: ''
        };
      }
    });

    setStudentMarks(newMarks);
  }, [selectedExamId, selectedClassId, classStudents, results, examSubjects]);

  // Update marks for a student and subject
  const handleMarksChange = (studentId: string, subjectId: string, value: string) => {
    // Validate: only allow numbers and empty
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0)) return;
    
    // Validate: don't exceed max marks
    if (selectedExam && value !== '' && Number(value) > selectedExam.maxMarks) return;

    setStudentMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: {
          ...prev[studentId]?.marks,
          [subjectId]: value
        }
      }
    }));
  };

  // Update remarks for a student
  const handleRemarksChange = (studentId: string, value: string) => {
    setStudentMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value
      }
    }));
  };

  // Calculate total and percentage for a student
  const calculateStudentTotal = (studentId: string) => {
    const marks = studentMarks[studentId];
    if (!marks || !selectedExam) return { total: 0, maxTotal: 0, percentage: 0 };

    let total = 0;
    let count = 0;
    examSubjects.forEach(subj => {
      const mark = marks.marks[subj.id];
      if (mark && mark !== '') {
        total += Number(mark);
        count++;
      }
    });

    const maxTotal = examSubjects.length * selectedExam.maxMarks;
    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

    return { total, maxTotal, percentage: Math.round(percentage * 100) / 100 };
  };

  // Check if results are already published
  const areResultsPublished = useMemo(() => {
    if (!selectedExamId || !selectedClassId) return false;
    const classResults = results.filter(
      r => r.examinationId === selectedExamId && r.classId === selectedClassId
    );
    return classResults.length > 0 && classResults.every(r => !r.isDraft);
  }, [results, selectedExamId, selectedClassId]);

  // Save as draft
  const handleSaveDraft = async () => {
    if (!selectedExam || !selectedClassId) return;

    setIsSaving(true);
    try {
      for (const student of classStudents) {
        const marks = studentMarks[student.id];
        if (!marks) continue;

        // Check if at least one subject has marks
        const hasAnyMarks = examSubjects.some(subj => {
          const mark = marks.marks[subj.id];
          return mark && mark !== '';
        });

        if (!hasAnyMarks) continue; // Skip if no marks entered

        const { total, maxTotal, percentage } = calculateStudentTotal(student.id);

        const resultData: Omit<Result, 'id'> = {
          studentId: student.id,
          classId: selectedClassId,
          examinationId: selectedExam.id,
          examName: selectedExam.name,
          examDate: selectedExam.examDate,
          academicYear: selectedExam.academicYear,
          subjects: examSubjects.map(subj => ({
            subjectId: subj.id,
            subjectName: subj.name,
            marksObtained: Number(marks.marks[subj.id] || 0),
            totalMarks: selectedExam.maxMarks,
            grade: calculateGrade((Number(marks.marks[subj.id] || 0) / selectedExam.maxMarks) * 100)
          })),
          totalObtained: total,
          totalMaxMarks: maxTotal,
          percentage,
          overallGrade: calculateGrade(percentage),
          remarks: marks.remarks,
          isDraft: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await onSaveResult(resultData);
      }

      alert('Marks saved as draft successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save marks. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Publish results
  const handlePublish = async () => {
    if (!selectedExam || !selectedClassId) return;

    // Validate: all students should have all subject marks
    let missingMarks = false;
    for (const student of classStudents) {
      const marks = studentMarks[student.id];
      if (!marks) {
        missingMarks = true;
        break;
      }
      for (const subj of examSubjects) {
        const mark = marks.marks[subj.id];
        if (!mark || mark === '') {
          missingMarks = true;
          break;
        }
      }
      if (missingMarks) break;
    }

    if (missingMarks) {
      if (!confirm('Some students have missing marks. Do you want to publish results with incomplete data?')) {
        return;
      }
    }

    if (!confirm('Are you sure you want to publish these results? Published results will be visible to students and parents.')) {
      return;
    }

    setIsSaving(true);
    try {
      // First save all results as non-draft
      for (const student of classStudents) {
        const marks = studentMarks[student.id];
        if (!marks) continue;

        const { total, maxTotal, percentage } = calculateStudentTotal(student.id);

        const resultData: Omit<Result, 'id'> = {
          studentId: student.id,
          classId: selectedClassId,
          examinationId: selectedExam.id,
          examName: selectedExam.name,
          examDate: selectedExam.examDate,
          academicYear: selectedExam.academicYear,
          subjects: examSubjects.map(subj => ({
            subjectId: subj.id,
            subjectName: subj.name,
            marksObtained: Number(marks.marks[subj.id] || 0),
            totalMarks: selectedExam.maxMarks,
            grade: calculateGrade((Number(marks.marks[subj.id] || 0) / selectedExam.maxMarks) * 100)
          })),
          totalObtained: total,
          totalMaxMarks: maxTotal,
          percentage,
          overallGrade: calculateGrade(percentage),
          remarks: marks.remarks,
          isDraft: false,
          publishedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await onSaveResult(resultData);
      }

      // Trigger publish action (will send emails if configured)
      await onPublishResults(selectedExam.id, selectedClassId);

      alert('Results published successfully! Email notifications will be sent to parents.');
    } catch (error) {
      console.error('Error publishing results:', error);
      alert('Failed to publish results. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('examinations')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Back to Examinations"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
              Marks Entry
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter and manage student examination marks. Save as draft or publish results.
            </p>
          </div>
        </div>
      </div>

      {/* Selection Panel */}
      <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Select Examination */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Select Examination *
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setSelectedClassId('');
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
            >
              <option value="">-- Select Examination --</option>
              {examinations.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Select Class */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Select Class *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={!selectedExamId}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Select Class --</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}-{cls.section}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedExam && selectedClassId && (
          <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-indigo-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Exam:</strong> {selectedExam.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award size={12} className="text-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Max Marks:</strong> {selectedExam.maxMarks} per subject
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Students:</strong> {classStudents.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-cyan-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Subjects:</strong> {examSubjects.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Message */}
      {selectedExamId && selectedClassId && areResultsPublished && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            Results have been published for this examination and class. You can still edit marks and re-publish.
          </span>
        </div>
      )}

      {/* Marks Entry Table */}
      {selectedExamId && selectedClassId ? (
        classStudents.length === 0 ? (
          <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
            <Users size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-slate-400 dark:text-slate-500 text-xs">
              No students found in this class.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/40 dark:border-slate-800/40">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50/50 dark:bg-slate-950/50">
                        Roll
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[150px]">
                        Student Name
                      </th>
                      {examSubjects.map(subj => (
                        <th key={subj.id} className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[80px]">
                          <div>{subj.name}</div>
                          <div className="text-[9px] font-normal text-slate-400 mt-0.5">/{selectedExam?.maxMarks}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[80px]">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[80px]">
                        %
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[60px]">
                        Grade
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[150px]">
                        Remarks
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[60px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {classStudents.map((student) => {
                      const marks = studentMarks[student.id];
                      const { total, maxTotal, percentage } = calculateStudentTotal(student.id);
                      const grade = calculateGrade(percentage);
                      const existingResult = results.find(
                        r => r.examinationId === selectedExamId && r.studentId === student.id && r.classId === selectedClassId
                      );

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 sticky left-0 bg-white/75 dark:bg-slate-900/75">
                            {student.rollNumber}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {student.name}
                          </td>
                          {examSubjects.map(subj => (
                            <td key={subj.id} className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={selectedExam?.maxMarks}
                                value={marks?.marks[subj.id] || ''}
                                onChange={(e) => handleMarksChange(student.id, subj.id, e.target.value)}
                                placeholder="0"
                                className="w-16 px-1.5 py-1 text-xs text-center bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-xs text-center font-bold text-slate-700 dark:text-slate-300">
                            {total}/{maxTotal}
                          </td>
                          <td className="px-3 py-2 text-xs text-center font-bold text-slate-700 dark:text-slate-300">
                            {percentage.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              percentage >= 90 ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                              percentage >= 75 ? 'bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400' :
                              percentage >= 60 ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                              percentage >= 45 ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' :
                              'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                            }`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={marks?.remarks || ''}
                              onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                              placeholder="Optional remarks"
                              className="w-full px-1.5 py-1 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {existingResult && !existingResult.isDraft && onViewReportCard && (
                              <button
                                onClick={() => onViewReportCard(student.id, existingResult.id)}
                                className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                                title="View Report Card"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-semibold shadow transition-all disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save as Draft'}</span>
              </button>
              <button
                onClick={handlePublish}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-bold shadow transition-all disabled:cursor-not-allowed"
              >
                <Send size={16} />
                <span>{isSaving ? 'Publishing...' : areResultsPublished ? 'Re-publish Results' : 'Publish Results'}</span>
              </button>
            </div>

            {/* Help Text */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/40 dark:border-indigo-800/40 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
                <p className="font-semibold">Tips:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li><strong>Save as Draft:</strong> Save your progress without publishing. Drafts are not visible to students/parents.</li>
                  <li><strong>Publish Results:</strong> Make results visible and send email notifications to parents (if EmailJS is configured).</li>
                  <li>Marks are automatically validated (0 to {selectedExam?.maxMarks} per subject).</li>
                  <li>Grades are calculated automatically based on percentage.</li>
                </ul>
              </div>
            </div>
          </>
        )
      ) : (
        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
          <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            Select an examination and class to begin entering marks.
          </p>
        </div>
      )}
    </div>
  );
}
