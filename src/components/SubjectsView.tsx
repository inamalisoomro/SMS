/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit, BookOpen, X } from 'lucide-react';
import { Subject } from '../types';

interface SubjectsViewProps {
  subjects: Subject[];
  onAddSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  onUpdateSubject: (subject: Subject) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}

export default function SubjectsView({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject
}: SubjectsViewProps) {
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // Submit new subject
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    await onAddSubject({
      name: formName.trim(),
      code: formCode.trim().toUpperCase() || undefined
    });

    setFormName('');
    setFormCode('');
  };

  // Submit edit subject
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editName) return;

    await onUpdateSubject({
      id: editingSubject.id,
      name: editName.trim(),
      code: editCode.trim().toUpperCase() || undefined
    });

    setEditingSubject(null);
  };

  const startEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditCode(subject.code || '');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
          Subjects & Courses
        </h2>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Catalog registered lecture courses, academic syllabi, and administrative course tags.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ADD SUBJECT PANEL */}
        <div className="lg:col-span-4 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Plus size={14} />
            </div>
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Register New Course</h3>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Course Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Course Code (Optional)</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. MATH-101"
                className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow transition-all mt-1 flex items-center justify-center gap-1.5"
            >
              <Plus size={12} /> Catalog Subject
            </button>
          </form>
        </div>

        {/* SUBJECTS DIRECTORY */}
        <div className="lg:col-span-8 space-y-3.5">
          {subjects.length === 0 ? (
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
              <BookOpen size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
              <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">No courses cataloged in this term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {subjects.map((subj) => (
                <div 
                  key={subj.id}
                  className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl shadow-sm flex items-center justify-between group hover:shadow transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-xs shadow-inner">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {subj.name}
                      </h4>
                      <p className="font-mono text-[9px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                        {subj.code || 'NO-CODE'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 bg-slate-50/50 dark:bg-slate-900/40 rounded-lg p-0.5 border border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => startEdit(subj)}
                      className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Course"
                    >
                      <Edit size={11} />
                    </button>
                    <button
                      onClick={() => onDeleteSubject(subj.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT SUBJECT */}
      <AnimatePresence>
        {editingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSubject(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-sm p-4.5 relative z-10 shadow-xl"
            >
              <button 
                onClick={() => setEditingSubject(null)}
                className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Edit size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Edit Course Details</h3>
                  <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">Modify registered details</p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Course Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Course Code</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
                  />
                </div>

                <div className="pt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSubject(null)}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-sans font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow shadow-indigo-600/15"
                  >
                    Save Course
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
