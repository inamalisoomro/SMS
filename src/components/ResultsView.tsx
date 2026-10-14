/**
 * ResultsView.tsx — Results CRUD + WhatsApp / Email notify
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Plus, Trash2, Edit, Send, X, Check, Loader2 } from 'lucide-react';
import { Result, Student, Class, Subject, AppSettings } from '../types';
import { dbInstance } from '../database';
import { dispatch } from '../whatsapp/notificationDispatcher';
import { buildResultParams } from '../whatsapp/payloadBuilders';
import { sendResultNotification } from '../notificationHelper';

interface ResultsViewProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  settings: AppSettings;
  triggerToast: (type: 'success'|'error'|'info', msg: string) => void;
}

function calcGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

export default function ResultsView({ students, classes, subjects, settings, triggerToast }: ResultsViewProps) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Result | null>(null);
  const [deletedCache, setDeletedCache] = useState<Result | null>(null);
  const [notifyItem, setNotifyItem] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);

  // Filters
  const [classFilter, setClassFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [formStudentId, setFormStudentId] = useState('');
  const [formExamName, setFormExamName] = useState('');
  const [formExamDate, setFormExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSubjectScores, setFormSubjectScores] = useState<{subjectId:string; obtained:number; total:number}[]>(
    subjects.slice(0, 3).map(s => ({ subjectId: s.id, obtained: 0, total: 100 }))
  );
  const [formRemarks, setFormRemarks] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setResults(await dbInstance.getResults() as Result[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === formStudentId);
    if (!student || !formExamName.trim()) return;
    const subjectDetails = formSubjectScores.map(ss => {
      const sub = subjects.find(s => s.id === ss.subjectId);
      return { subjectId: ss.subjectId, subjectName: sub?.name ?? '', marksObtained: ss.obtained, totalMarks: ss.total, grade: calcGrade((ss.obtained / Math.max(ss.total, 1)) * 100) };
    });
    const totalObtained = subjectDetails.reduce((a, s) => a + s.marksObtained, 0);
    const totalMaxMarks = subjectDetails.reduce((a, s) => a + s.totalMarks, 0);
    const percentage = totalMaxMarks > 0 ? (totalObtained / totalMaxMarks) * 100 : 0;
    const result: Result = {
      id: editItem?.id ?? crypto.randomUUID(),
      studentId: formStudentId,
      classId: student.classId,
      examinationId: '',
      examName: formExamName.trim(),
      examDate: formExamDate,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      subjects: subjectDetails,
      totalObtained, totalMaxMarks,
      percentage,
      overallGrade: calcGrade(percentage),
      isDraft: false,
      remarks: formRemarks || undefined,
      publishedAt: Date.now(),
      createdAt: editItem ? (editItem as any).createdAt ?? Date.now() : Date.now(),
      updatedAt: Date.now(),
    };
    await dbInstance.saveResult(result);
    await dbInstance.addLog(editItem ? 'Result Updated' : 'Result Published', `${formExamName} for ${student.name}`);
    triggerToast('success', editItem ? 'Result updated' : 'Result published');
    setIsModalOpen(false); setEditItem(null); await load();
  };

  const handleDelete = async (r: Result) => {
    await dbInstance.deleteResult(r.id);
    await dbInstance.addLog('Result Deleted', `Deleted result for student ${r.studentId}`);
    setDeletedCache(r); await load();
    triggerToast('info', 'Result deleted');
  };

  const handleUndo = async () => {
    if (!deletedCache) return;
    await dbInstance.saveResult(deletedCache);
    setDeletedCache(null); await load();
    triggerToast('success', 'Result restored');
  };

  const handleNotify = async (result: Result, channels: ('email'|'whatsapp')[]) => {
    const student = students.find(s => s.id === result.studentId);
    if (!student) return;
    setSending(true);
    try {
      if (channels.includes('email')) {
        await sendResultNotification(student, result, settings);
        triggerToast('success', 'Email notification sent');
      }
      if (channels.includes('whatsapp') && settings.whatsappEnabled) {
        const firstSubject = result.subjects[0];
        const params = buildResultParams({
          student, result, subjectName: firstSubject?.subjectName ?? 'Exam',
          marks: `${result.totalObtained}/${result.totalMaxMarks} (${result.percentage.toFixed(1)}%)`,
          schoolName: settings.schoolName,
        });
        const r = await dispatch({ type: 'result', channels: ['whatsapp'], targets: [{ student }], template: 'result_published', params, dedupeKeySeed: `result_${result.id}`, settings });
        if (r.whatsappQueued > 0) triggerToast('success', 'WhatsApp notification queued');
        else triggerToast('info', 'Parent has no WhatsApp consent');
      }
    } catch { triggerToast('error', 'Notification failed'); }
    finally { setSending(false); setNotifyItem(null); }
  };

  const filtered = results.filter(r => {
    const student = students.find(s => s.id === r.studentId);
    const matchClass = classFilter === 'all' || student?.classId === classFilter;
    const matchSearch = !searchQuery || student?.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.examName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchSearch;
  });

  const inputCls = "w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" /> Results
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Publish exam results and notify parents</p>
        </div>
        <button onClick={() => { setEditItem(null); setFormStudentId(''); setFormExamName(''); setFormRemarks(''); setFormSubjectScores(subjects.slice(0,3).map(s => ({ subjectId: s.id, obtained: 0, total: 100 }))); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow">
          <Plus size={13} /> Add Result
        </button>
      </div>

      {deletedCache && (
        <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs">
          <span className="text-indigo-700 dark:text-indigo-300">Result was deleted.</span>
          <button onClick={handleUndo} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Undo</button>
        </div>
      )}

      <div className="flex gap-2">
        <input type="text" placeholder="Search student or exam…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" />
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Filter by class">
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
          <Trophy size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-slate-400">No results yet. Click "Add Result" to publish one.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>{['Student','Exam','Grade','Marks %','Published','Actions'].map(h => <th key={h} className="text-left px-3 py-2 text-[9px] font-mono uppercase text-slate-400">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filtered.map(r => {
                const student = students.find(s => s.id === r.studentId);
                const pct = r.percentage;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20">
                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{student?.name ?? r.studentId}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.examName}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}>{r.grade}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.totalObtained}/{r.totalMaxMarks} ({pct.toFixed(1)}%)</td>
                    <td className="px-3 py-2 text-slate-400">{new Date(r.publishedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setNotifyItem(r)} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded text-[9px] font-bold hover:bg-green-100 transition-colors" aria-label="Notify parent">
                          <Send size={9} /> Notify
                        </button>
                        <button onClick={() => handleDelete(r)} className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-400 rounded transition-colors" aria-label="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{editItem ? 'Edit Result' : 'Publish Result'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Close"><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Student *</label>
                  <select required value={formStudentId} onChange={e => setFormStudentId(e.target.value)} className={inputCls} aria-label="Select student">
                    <option value="">Select student…</option>
                    {students.map(s => {
                      const c = classes.find(cl => cl.id === s.classId);
                      return <option key={s.id} value={s.id}>{s.name} — {c ? `${c.name}-${c.section}` : ''}</option>;
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Exam Name *</label>
                    <input type="text" required value={formExamName} onChange={e => setFormExamName(e.target.value)} placeholder="e.g. Mid-Term 2026" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Exam Date</label>
                    <input type="date" value={formExamDate} onChange={e => setFormExamDate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                {/* Subject scores */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Subject Scores</label>
                  <div className="space-y-1.5">
                    {formSubjectScores.map((ss, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={ss.subjectId} onChange={e => { const n = [...formSubjectScores]; n[i] = {...n[i], subjectId: e.target.value}; setFormSubjectScores(n); }} className={`flex-1 ${inputCls}`} aria-label="Subject">
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="number" min={0} max={ss.total} value={ss.obtained} onChange={e => { const n=[...formSubjectScores]; n[i]={...n[i],obtained:+e.target.value}; setFormSubjectScores(n); }} className="w-16 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 focus:outline-none" placeholder="Got" aria-label="Obtained marks" />
                        <span className="text-slate-400 text-xs">/</span>
                        <input type="number" min={1} value={ss.total} onChange={e => { const n=[...formSubjectScores]; n[i]={...n[i],total:+e.target.value}; setFormSubjectScores(n); }} className="w-16 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 focus:outline-none" placeholder="Max" aria-label="Total marks" />
                        <button type="button" onClick={() => setFormSubjectScores(prev => prev.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500" aria-label="Remove subject"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setFormSubjectScores(prev => [...prev, { subjectId: subjects[0]?.id ?? '', obtained: 0, total: 100 }])} className="mt-1.5 text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">+ Add subject</button>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Remarks</label>
                  <input type="text" value={formRemarks} onChange={e => setFormRemarks(e.target.value)} placeholder="Optional teacher remarks" className={inputCls} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"><Check size={12} className="inline mr-1" />Publish</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notify Modal */}
      <AnimatePresence>
        {notifyItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Notify Parent</h3>
                <button onClick={() => setNotifyItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Close"><X size={16} /></button>
              </div>
              {(() => {
                const student = students.find(s => s.id === notifyItem.studentId);
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Student: <strong>{student?.name}</strong></p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Exam: <strong>{notifyItem.examName}</strong> — Grade: <strong>{notifyItem.grade}</strong></p>
                    <div className="flex gap-2">
                      <button onClick={() => handleNotify(notifyItem, ['email'])} disabled={sending || !student?.parentEmail} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Email
                      </button>
                      <button onClick={() => handleNotify(notifyItem, ['whatsapp'])} disabled={sending || !settings.whatsappEnabled || !student?.whatsappOptIn} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1">
                        {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} WhatsApp
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
