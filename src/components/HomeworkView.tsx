/**
 * HomeworkView.tsx — Homework CRUD + WhatsApp / Email notify
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpenCheck, Plus, Trash2, Edit, Send, X, Check,
  Calendar, Loader2, AlertCircle, ChevronDown,
} from 'lucide-react';
import { Homework, Student, Class, Subject, AppSettings } from '../types';
import { dbInstance } from '../database';
import { dispatch } from '../whatsapp/notificationDispatcher';
import { buildHomeworkParams } from '../whatsapp/payloadBuilders';
import { sendHomeworkNotification } from '../notificationHelper';

interface HomeworkViewProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  settings: AppSettings;
  triggerToast: (type: 'success'|'error'|'info', msg: string) => void;
}

export default function HomeworkView({ students, classes, subjects, settings, triggerToast }: HomeworkViewProps) {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Homework | null>(null);
  const [deletedCache, setDeletedCache] = useState<Homework | null>(null);
  const [notifySheet, setNotifySheet] = useState<Homework | null>(null);
  const [sending, setSending] = useState(false);

  // Filters
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formClassId, setFormClassId] = useState(classes[0]?.id ?? '');
  const [formSubjectId, setFormSubjectId] = useState(subjects[0]?.id ?? '');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formAssignedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    setHomework(await dbInstance.getHomework() as Homework[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFormTitle(''); setFormDesc('');
    setFormClassId(classes[0]?.id ?? '');
    setFormSubjectId(subjects[0]?.id ?? '');
    const d = new Date(); d.setDate(d.getDate() + 7);
    setFormTitle('');
    setEditItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formClassId || !formSubjectId) return;
    if (editItem) {
      const updated: Homework = { ...editItem, title: formTitle.trim(), description: formDesc.trim(), classId: formClassId, subjectId: formSubjectId, dueDate: formDueDate };
      await dbInstance.saveHomework(updated);
      await dbInstance.addLog('Homework Updated', `Updated: ${formTitle}`);
      triggerToast('success', 'Homework updated');
    } else {
      const hw: Homework = {
        id: crypto.randomUUID(), title: formTitle.trim(), description: formDesc.trim(),
        classId: formClassId, subjectId: formSubjectId, dueDate: formDueDate,
        assignedDate: formAssignedDate, createdBy: 'Admin', createdAt: Date.now(),
      };
      await dbInstance.saveHomework(hw);
      await dbInstance.addLog('Homework Added', `Added: ${formTitle}`);
      triggerToast('success', 'Homework added');
    }
    resetForm(); setIsModalOpen(false); await load();
  };

  const handleDelete = async (hw: Homework) => {
    await dbInstance.deleteHomework(hw.id);
    await dbInstance.addLog('Homework Deleted', `Deleted: ${hw.title}`);
    setDeletedCache(hw); await load();
    triggerToast('info', `"${hw.title}" deleted`, );
  };

  const handleUndo = async () => {
    if (!deletedCache) return;
    await dbInstance.saveHomework(deletedCache);
    await dbInstance.addLog('Action Undone', `Restored: ${deletedCache.title}`);
    setDeletedCache(null); await load();
    triggerToast('success', 'Homework restored');
  };

  const handleNotify = async (hw: Homework, channels: ('email'|'whatsapp')[]) => {
    setSending(true);
    const classStudents = students.filter(s => s.classId === hw.classId);
    const subjectObj = subjects.find(s => s.id === hw.subjectId);
    const className = (() => { const c = classes.find(c => c.id === hw.classId); return c ? `${c.name}-${c.section}` : 'Class'; })();
    let totalQueued = 0;
    try {
      if (channels.includes('email')) {
        const r = await sendHomeworkNotification(hw, classStudents, className, subjectObj?.name ?? 'Subject', settings);
        if (r.sent > 0) triggerToast('success', `Email sent to ${r.sent} parent${r.sent > 1 ? 's' : ''}`);
      }
      if (channels.includes('whatsapp') && settings.whatsappEnabled) {
        const params = buildHomeworkParams({ student: { name: '{{student}}' } as Student, homework: hw, subjectName: subjectObj?.name ?? 'Subject', schoolName: settings.schoolName });
        for (const student of classStudents) {
          const p = buildHomeworkParams({ student, homework: hw, subjectName: subjectObj?.name ?? 'Subject', schoolName: settings.schoolName });
          const r = await dispatch({ type: 'homework', channels: ['whatsapp'], targets: [{ student }], template: 'homework_assigned', params: p, dedupeKeySeed: `hw_${hw.id}`, settings });
          totalQueued += r.whatsappQueued;
        }
        if (totalQueued > 0) triggerToast('success', `${totalQueued} WhatsApp notification${totalQueued > 1 ? 's' : ''} queued`);
      }
      await dbInstance.addLog('Homework Notified', `Sent notifications for: ${hw.title}`);
    } catch (err) {
      triggerToast('error', 'Notification failed');
    } finally {
      setSending(false); setNotifySheet(null);
    }
  };

  const filtered = homework.filter(h =>
    (classFilter === 'all' || h.classId === classFilter) &&
    (subjectFilter === 'all' || h.subjectId === subjectFilter)
  ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const inputCls = "w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight flex items-center gap-2">
            <BookOpenCheck size={20} className="text-indigo-500" /> Homework
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage assignments and notify parents</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all">
          <Plus size={13} /> Add Homework
        </button>
      </div>

      {deletedCache && (
        <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs">
          <span className="text-indigo-700 dark:text-indigo-300">"{deletedCache.title}" was deleted.</span>
          <button onClick={handleUndo} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Undo</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Filter by class">
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
        </select>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Filter by subject">
          <option value="all">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
          <BookOpenCheck size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-slate-400">No homework yet. Click "Add Homework" to create one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(hw => {
            const cls = classes.find(c => c.id === hw.classId);
            const sub = subjects.find(s => s.id === hw.subjectId);
            const overdue = new Date(hw.dueDate) < new Date() && new Date(hw.dueDate).toISOString().split('T')[0] !== new Date().toISOString().split('T')[0];
            return (
              <motion.div key={hw.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{hw.title}</h3>
                    {overdue && <span className="px-1.5 py-0.5 text-[8px] font-bold bg-rose-100 text-rose-600 rounded-full uppercase">Overdue</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 line-clamp-2">{hw.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>{cls ? `${cls.name}-${cls.section}` : '?'}</span>
                    <span>·</span><span>{sub?.name ?? '?'}</span>
                    <span>·</span><span>Due: <strong className={overdue ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}>{new Date(hw.dueDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setNotifySheet(hw)} className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-[9px] font-bold hover:bg-green-100 transition-colors" aria-label="Notify parents">
                    <Send size={10} /> Notify
                  </button>
                  <button onClick={() => { setEditItem(hw); setFormTitle(hw.title); setFormDesc(hw.description); setFormClassId(hw.classId); setFormSubjectId(hw.subjectId); setIsModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-lg transition-colors" aria-label="Edit"><Edit size={13} /></button>
                  <button onClick={() => handleDelete(hw)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-400 rounded-lg transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{editItem ? 'Edit Homework' : 'Add Homework'}</h3>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Close"><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Title *</label>
                  <input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Chapter 5 Review Questions" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Description</label>
                  <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} placeholder="Assignment details..." className={`${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Class *</label>
                    <select value={formClassId} onChange={e => setFormClassId(e.target.value)} className={inputCls} aria-label="Select class">
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Subject *</label>
                    <select value={formSubjectId} onChange={e => setFormSubjectId(e.target.value)} className={inputCls} aria-label="Select subject">
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Due Date *</label>
                    <input type="date" required value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                    <Check size={12} /> {editItem ? 'Update' : 'Add Homework'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notify Sheet */}
      <AnimatePresence>
        {notifySheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Notify Parents</h3>
                <button onClick={() => setNotifySheet(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Close"><X size={16} /></button>
              </div>
              <p className="text-xs text-slate-500">Homework: <strong>{notifySheet.title}</strong></p>
              {(() => {
                const cls = classes.find(c => c.id === notifySheet.classId);
                const classStudents = students.filter(s => s.classId === notifySheet.classId);
                const withEmail = classStudents.filter(s => s.parentEmail).length;
                const withWA = classStudents.filter(s => s.whatsappOptIn && s.parentWhatsApp).length;
                return (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{classStudents.length} students in {cls ? `${cls.name}-${cls.section}` : 'class'}</p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <p className="text-lg font-bold text-emerald-600">{withEmail}</p>
                        <p className="text-[9px] text-slate-400">Email parents</p>
                      </div>
                      <div className="p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{withWA}</p>
                        <p className="text-[9px] text-slate-400">WhatsApp parents</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => handleNotify(notifySheet, ['email'])} disabled={sending || withEmail === 0} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Email
                      </button>
                      <button onClick={() => handleNotify(notifySheet, ['whatsapp'])} disabled={sending || withWA === 0 || !settings.whatsappEnabled} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} WhatsApp
                      </button>
                      <button onClick={() => handleNotify(notifySheet, ['email','whatsapp'])} disabled={sending} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Both
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
