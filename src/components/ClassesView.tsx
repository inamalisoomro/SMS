/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit, GraduationCap, Users, X, Info } from 'lucide-react';
import { Class, Student } from '../types';

interface ClassesViewProps {
  classes: Class[];
  students: Student[];
  onAddClass: (cls: Omit<Class, 'id'>) => Promise<void>;
  onUpdateClass: (cls: Class) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
}

export default function ClassesView({
  classes,
  students,
  onAddClass,
  onUpdateClass,
  onDeleteClass
}: ClassesViewProps) {
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('');
  
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editName, setEditName] = useState('');
  const [editSection, setEditSection] = useState('');

  // Submit new class
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSection) return;

    await onAddClass({
      name: formName.trim(),
      section: formSection.trim().toUpperCase()
    });

    setFormName('');
    setFormSection('');
  };

  // Submit edit class
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editName || !editSection) return;

    await onUpdateClass({
      id: editingClass.id,
      name: editName.trim(),
      section: editSection.trim().toUpperCase()
    });

    setEditingClass(null);
  };

  const startEdit = (cls: Class) => {
    setEditingClass(cls);
    setEditName(cls.name);
    setEditSection(cls.section);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
          Classes & Sections Management
        </h2>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Add new structural courses, divisions, and map designated academic sections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ADD CLASS PANEL */}
        <div className="lg:col-span-4 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Plus size={14} />
            </div>
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Register New Class</h3>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Class Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Grade 10"
                className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Section *</label>
              <input
                type="text"
                required
                value={formSection}
                onChange={(e) => setFormSection(e.target.value)}
                placeholder="e.g. A"
                maxLength={3}
                className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow transition-all mt-1 flex items-center justify-center gap-1.5"
            >
              <Plus size={12} /> Add Classroom
            </button>
          </form>
        </div>

        {/* ACTIVE CLASSES LIST */}
        <div className="lg:col-span-8 space-y-3.5">
          {classes.length === 0 ? (
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
              <GraduationCap size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
              <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">No classes registered in this academic session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {classes.map((cls) => {
                // Count students in this class
                const enrolledCount = students.filter(s => s.classId === cls.id).length;
                return (
                  <div 
                    key={cls.id}
                    className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl shadow-sm flex items-center justify-between group hover:shadow transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shadow-inner">
                        {cls.name.match(/\d+/) || cls.name.charAt(0)}{cls.section}
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {cls.name}
                        </h4>
                        <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Users size={10} className="text-slate-400" />
                          <span>{enrolledCount} Students Enrolled</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 bg-slate-50/50 dark:bg-slate-900/40 rounded-lg p-0.5 border border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => startEdit(cls)}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Class"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteClass(cls.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT CLASS */}
      <AnimatePresence>
        {editingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingClass(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-sm p-4.5 relative z-10 shadow-xl"
            >
              <button 
                onClick={() => setEditingClass(null)}
                className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Edit size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Edit Classroom</h3>
                  <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">Modify registered details</p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Class Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Section *</label>
                  <input
                    type="text"
                    required
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
                  />
                </div>

                <div className="pt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingClass(null)}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-sans font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow shadow-indigo-600/15"
                  >
                    Save Details
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
