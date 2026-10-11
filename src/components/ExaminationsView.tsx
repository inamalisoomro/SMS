/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  X,
  FileText,
  Calendar,
  BookOpen,
  GraduationCap,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Examination, Class, Subject } from '../types';

interface ExaminationsViewProps {
  examinations: Examination[];
  classes: Class[];
  subjects: Subject[];
  academicYear: string;
  onAddExamination: (examination: Omit<Examination, 'id'>) => Promise<void>;
  onUpdateExamination: (examination: Examination) => Promise<void>;
  onDeleteExamination: (id: string) => Promise<void>;
  onNavigate?: (tab: string) => void;
  onNavigateToMarks?: (examinationId: string) => void;
}

export default function ExaminationsView({
  examinations,
  classes,
  subjects,
  academicYear,
  onAddExamination,
  onUpdateExamination,
  onDeleteExamination,
  onNavigate,
  onNavigateToMarks
}: ExaminationsViewProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExamination, setSelectedExamination] = useState<Examination | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formExamDate, setFormExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formMaxMarks, setFormMaxMarks] = useState('100');
  const [formDescription, setFormDescription] = useState('');
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);

  // Filter examinations
  const filteredExaminations = examinations.filter(exam => {
    const matchesSearch = 
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.academicYear.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Helper: Open add modal
  const handleOpenAddModal = () => {
    setFormName('');
    setFormExamDate(new Date().toISOString().split('T')[0]);
    setFormMaxMarks('100');
    setFormDescription('');
    setFormClassIds([]);
    setFormSubjectIds([]);
    setIsAddModalOpen(true);
  };

  // Helper: Open edit modal
  const handleOpenEditModal = (examination: Examination) => {
    setSelectedExamination(examination);
    setFormName(examination.name);
    setFormExamDate(examination.examDate);
    setFormMaxMarks(examination.maxMarks.toString());
    setFormDescription(examination.description || '');
    setFormClassIds(examination.classIds);
    setFormSubjectIds(examination.subjectIds);
    setIsEditModalOpen(true);
  };

  // Form submission: Add examination
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || formClassIds.length === 0 || formSubjectIds.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    await onAddExamination({
      name: formName,
      academicYear: academicYear,
      examDate: formExamDate,
      classIds: formClassIds,
      subjectIds: formSubjectIds,
      maxMarks: parseInt(formMaxMarks) || 100,
      description: formDescription || undefined,
      createdAt: Date.now()
    });

    setIsAddModalOpen(false);
  };

  // Form submission: Edit examination
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamination || !formName || formClassIds.length === 0 || formSubjectIds.length === 0) return;

    await onUpdateExamination({
      ...selectedExamination,
      name: formName,
      examDate: formExamDate,
      classIds: formClassIds,
      subjectIds: formSubjectIds,
      maxMarks: parseInt(formMaxMarks) || 100,
      description: formDescription || undefined
    });

    setIsEditModalOpen(false);
    setSelectedExamination(null);
  };

  // Toggle class selection
  const toggleClass = (classId: string) => {
    setFormClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    setFormSubjectIds(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
              Examinations Management
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create and manage examinations, define marks structure, and control result publishing.
            </p>
          </div>
        </div>

        {/* Add Examination button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus size={13} />
            <span>Create Examination</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3 rounded-xl shadow-xs">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by exam name or academic year..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-all font-sans"
          />
        </div>
      </div>

      {/* Examinations List */}
      {filteredExaminations.length === 0 ? (
        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
          <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            {searchQuery ? 'No examinations found matching your search.' : 'No examinations created yet. Click "Create Examination" to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredExaminations.map((exam) => {
            const examClasses = classes.filter(c => exam.classIds.includes(c.id));
            const examSubjects = subjects.filter(s => exam.subjectIds.includes(s.id));
            
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {exam.name}
                    </h3>
                    <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {exam.academicYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigateToMarks && onNavigateToMarks(exam.id)}
                      className="p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Enter Marks"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(exam)}
                      className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                      title="Edit Examination"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteExamination(exam.id)}
                      className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete Examination"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400 font-mono">
                      {new Date(exam.examDate).toLocaleDateString()}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Max: {exam.maxMarks} marks
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs">
                    <GraduationCap size={12} className="text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">Classes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {examClasses.map(cls => (
                          <span key={cls.id} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-medium">
                            {cls.name}-{cls.section}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs">
                    <BookOpen size={12} className="text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">Subjects:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {examSubjects.map(subj => (
                          <span key={subj.id} className="px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded text-[10px] font-medium">
                            {subj.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {exam.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
                      {exam.description}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD EXAMINATION */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Plus size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Create New Examination</h3>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Examination Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g., Midterm Exam, Final Exam"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Exam Date
                      </label>
                      <input
                        type="date"
                        value={formExamDate}
                        onChange={(e) => setFormExamDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Max Marks (per subject)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formMaxMarks}
                        onChange={(e) => setFormMaxMarks(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Optional exam description"
                        rows={2}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 resize-none"
                      />
                    </div>
                  </div>

                  {/* Select Classes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Select Classes * (at least one)
                    </label>
                    {classes.length === 0 ? (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span>No classes available. Create classes first.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800/80">
                        {classes.map(cls => (
                          <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formClassIds.includes(cls.id)}
                              onChange={() => toggleClass(cls.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {cls.name}-{cls.section}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Select Subjects */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Select Subjects * (at least one)
                    </label>
                    {subjects.length === 0 ? (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span>No subjects available. Create subjects first.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800/80">
                        {subjects.map(subj => (
                          <label key={subj.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formSubjectIds.includes(subj.id)}
                              onChange={() => toggleSubject(subj.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {subj.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formClassIds.length === 0 || formSubjectIds.length === 0}
                      className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow transition-all"
                    >
                      Create Examination
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT EXAMINATION */}
      <AnimatePresence>
        {isEditModalOpen && selectedExamination && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Edit size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Edit Examination</h3>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-3">
                  {/* Same form fields as Add modal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Examination Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g., Midterm Exam, Final Exam"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Exam Date
                      </label>
                      <input
                        type="date"
                        value={formExamDate}
                        onChange={(e) => setFormExamDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Max Marks (per subject)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formMaxMarks}
                        onChange={(e) => setFormMaxMarks(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Optional exam description"
                        rows={2}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 resize-none"
                      />
                    </div>
                  </div>

                  {/* Select Classes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Select Classes * (at least one)
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800/80">
                      {classes.map(cls => (
                        <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formClassIds.includes(cls.id)}
                            onChange={() => toggleClass(cls.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {cls.name}-{cls.section}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Select Subjects */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Select Subjects * (at least one)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800/80">
                      {subjects.map(subj => (
                        <label key={subj.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formSubjectIds.includes(subj.id)}
                            onChange={() => toggleSubject(subj.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {subj.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formClassIds.length === 0 || formSubjectIds.length === 0}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow transition-all"
                    >
                      Update Examination
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
