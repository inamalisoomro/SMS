/**
 * MessagesView.tsx — WhatsApp Center: Outbox, Inbox, Templates, Stats, Composer
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Inbox, LayoutList, BarChart3, PenSquare,
  RefreshCw, Loader2, Search, Filter, Send, X, Check,
  CheckCheck, Clock, AlertCircle, Eye, Download, RotateCcw,
  XCircle, CheckCircle, Copy, ChevronRight, Users, Phone,
} from 'lucide-react';
import {
  WhatsAppOutboxItem, WhatsAppInboundMessage, Student, Class,
  AppSettings, WhatsAppOutboxStatus,
} from '../types';
import { dbInstance } from '../database';
import { retryMessage, cancelMessage } from '../whatsapp/outbox';
import { sendTextReply, fetchTemplates, fetchDiagnostics, simulateMockInbound } from '../whatsapp/apiClient';
import { CLIENT_TEMPLATES, SAMPLE_PARAMS, renderTemplatePreview } from '../whatsapp/templates';
import { dispatch } from '../whatsapp/notificationDispatcher';
import { useWhatsApp } from '../whatsapp/useWhatsApp';
import { exportToCSV } from '../utils';
import { validateAndNormalisePhone, formatPhoneForDisplay } from '../whatsapp/phone';

interface MessagesViewProps {
  students: Student[];
  classes: Class[];
  settings: AppSettings;
  triggerToast: (type: 'success'|'error'|'info', msg: string) => void;
}

type TabId = 'outbox' | 'inbox' | 'templates' | 'stats' | 'composer';

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: WhatsAppOutboxStatus }) {
  const map: Record<WhatsAppOutboxStatus, { label: string; cls: string }> = {
    queued:    { label: 'Queued',    cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
    sending:   { label: 'Sending',   cls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
    accepted:  { label: 'Accepted',  cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    sent:      { label: 'Sent',      cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' },
    delivered: { label: 'Delivered', cls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
    read:      { label: 'Read',      cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    failed:    { label: 'Failed',    cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
    cancelled: { label: 'Cancelled', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-400' },
    opted_out: { label: 'Opted out', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    invalid:   { label: 'Invalid',   cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${cls}`}>{label}</span>;
}

// ── Delivery icon ─────────────────────────────────────────────────────────────
function DeliveryIcon({ status }: { status: WhatsAppOutboxStatus }) {
  if (status === 'read') return <CheckCheck size={12} className="text-emerald-500" />;
  if (status === 'delivered') return <CheckCheck size={12} className="text-sky-400" />;
  if (status === 'sent') return <Check size={12} className="text-sky-400" />;
  if (status === 'failed') return <XCircle size={12} className="text-rose-500" />;
  if (status === 'queued' || status === 'sending' || status === 'accepted') return <Clock size={12} className="text-slate-400 animate-pulse" />;
  return null;
}

export default function MessagesView({ students, classes, settings, triggerToast }: MessagesViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('outbox');
  const [outbox, setOutbox] = useState<WhatsAppOutboxItem[]>([]);
  const [inbox, setInbox] = useState<WhatsAppInboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<WhatsAppOutboxItem | null>(null);
  const [selectedInbound, setSelectedInbound] = useState<WhatsAppInboundMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string,unknown> | null>(null);
  const [templateApprovals, setTemplateApprovals] = useState<Record<string,string>>({});

  // Composer
  const [composerType, setComposerType] = useState('fee_reminder');
  const [composerRecipientMode, setComposerRecipientMode] = useState<'all'|'class'|'individual'>('all');
  const [composerClassId, setComposerClassId] = useState('');
  const [composerStudentId, setComposerStudentId] = useState('');
  const [composerParams, setComposerParams] = useState<string[]>([]);
  const [composerPreview, setComposerPreview] = useState('');
  const [composerSending, setComposerSending] = useState(false);

  const { refresh: refreshWA } = useWhatsApp();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, i] = await Promise.all([
        dbInstance.getWhatsAppOutbox(),
        dbInstance.getWhatsAppInbox(),
      ]);
      setOutbox(o);
      setInbox(i);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'templates' || activeTab === 'stats') {
      fetchTemplates().then(r => {
        if (r.ok) {
          const map: Record<string,string> = {};
          r.data.templates.forEach(t => { map[t.name] = t.approvalStatus; });
          setTemplateApprovals(map);
        }
      });
      fetchDiagnostics().then(r => {
        if (r.ok) setDiagnostics(r.data as unknown as Record<string,unknown>);
      });
    }
  }, [activeTab]);

  // Build composer params based on type
  useEffect(() => {
    const def = CLIENT_TEMPLATES[composerType];
    if (def) {
      const defaults = SAMPLE_PARAMS[composerType] ?? Array(def.paramCount).fill('');
      // Override school name with actual school name
      const params = [...defaults];
      if (params.length > 0) params[0] = settings.schoolName;
      setComposerParams(params);
    }
  }, [composerType, settings.schoolName]);

  useEffect(() => {
    setComposerPreview(renderTemplatePreview(composerType, composerParams));
  }, [composerType, composerParams]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRetry = async (id: string) => {
    await retryMessage(id);
    await load();
    await refreshWA();
    triggerToast('success', 'Message re-queued for retry');
  };

  const handleCancel = async (id: string) => {
    await cancelMessage(id);
    await load();
    await refreshWA();
    triggerToast('info', 'Message cancelled');
  };

  const handleMarkRead = async (msg: WhatsAppInboundMessage) => {
    await dbInstance.saveWhatsAppInboundMessage({ ...msg, read: true });
    await load();
    await refreshWA();
  };

  const handleSendReply = async () => {
    if (!selectedInbound || !replyText.trim()) return;
    setSendingReply(true);
    const r = await sendTextReply(selectedInbound.from, replyText.trim());
    setSendingReply(false);
    if (r.ok) { triggerToast('success', 'Reply sent'); setReplyText(''); }
    else triggerToast('error', `Reply failed: ${(r as {message:string}).message}`);
  };

  const handleComposerSend = async () => {
    const def = CLIENT_TEMPLATES[composerType];
    if (!def) return;
    const targetStudents = composerRecipientMode === 'all'
      ? students
      : composerRecipientMode === 'class'
        ? students.filter(s => s.classId === composerClassId)
        : students.filter(s => s.id === composerStudentId);

    if (targetStudents.length === 0) { triggerToast('error', 'No recipients selected'); return; }
    setComposerSending(true);
    try {
      const result = await dispatch({
        type: def.notificationType,
        channels: ['whatsapp'],
        targets: targetStudents.map(s => ({ student: s })),
        template: composerType,
        params: composerParams,
        dedupeKeySeed: `composer_${composerType}_${Date.now()}`,
        settings,
      });
      triggerToast('success', `${result.whatsappQueued} message${result.whatsappQueued !== 1 ? 's' : ''} queued`);
      await load();
      await refreshWA();
    } finally { setComposerSending(false); }
  };

  const handleExportCSV = () => {
    const headers = ['Recipient', 'Type', 'Template', 'Status', 'Phone', 'Created', 'Updated'];
    const rows = filteredOutbox.map(item => [
      item.recipientName,
      item.type,
      item.template,
      item.status,
      item.to,
      new Date(item.createdAt).toLocaleString(),
      new Date(item.updatedAt).toLocaleString(),
    ]);
    exportToCSV(headers, rows, `WhatsApp_Outbox_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredOutbox = outbox.filter(item => {
    const matchSearch = !searchQuery || item.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    total: outbox.length,
    sent: outbox.filter(i => ['sent','delivered','read','accepted'].includes(i.status)).length,
    delivered: outbox.filter(i => ['delivered','read'].includes(i.status)).length,
    read: outbox.filter(i => i.status === 'read').length,
    failed: outbox.filter(i => i.status === 'failed').length,
    queued: outbox.filter(i => ['queued','sending'].includes(i.status)).length,
  };

  const deliveredPct = stats.sent > 0 ? Math.round(stats.delivered / stats.sent * 100) : 0;
  const readPct = stats.delivered > 0 ? Math.round(stats.read / stats.delivered * 100) : 0;

  // Last 7 days volume
  const volumeByDay: {date: string; count: number}[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const count = outbox.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === ds).length;
    volumeByDay.push({ date: d.toLocaleDateString('en', { weekday: 'short' }), count });
  }
  const maxVol = Math.max(...volumeByDay.map(d => d.count), 1);

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'outbox', label: 'Outbox', icon: <LayoutList size={13} />, badge: stats.queued || undefined },
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={13} />, badge: inbox.filter(m => !m.read).length || undefined },
    { id: 'templates', label: 'Templates', icon: <MessageSquare size={13} /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 size={13} /> },
    { id: 'composer', label: 'Compose', icon: <PenSquare size={13} /> },
  ];

  if (!settings.whatsappEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <MessageSquare size={40} className="text-slate-300 dark:text-slate-700" />
        <h3 className="font-sans font-bold text-slate-600 dark:text-slate-400">WhatsApp is disabled</h3>
        <p className="text-xs text-slate-400">Enable it in Settings → WhatsApp to use this feature.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight flex items-center gap-2">
            <MessageSquare size={20} className="text-green-500" /> WhatsApp Center
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage outbox, read parent replies, view templates and stats</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" aria-label="Refresh">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            {tab.icon}{tab.label}
            {tab.badge ? <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
      )}

      {!loading && (
        <>
          {/* ── OUTBOX TAB ───────────────────────────────────────────────── */}
          {activeTab === 'outbox' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-36">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search recipient…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Filter by status">
                  <option value="all">All Statuses</option>
                  {(['queued','sending','accepted','sent','delivered','read','failed','cancelled','opted_out','invalid'] as WhatsAppOutboxStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Filter by type">
                  <option value="all">All Types</option>
                  {['attendance_alert','homework','result','announcement','fee_reminder','event','certificate','general'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
                <button onClick={handleExportCSV} className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" aria-label="Export CSV">
                  <Download size={12} /> Export
                </button>
              </div>

              {/* Table */}
              {filteredOutbox.length === 0 ? (
                <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <MessageSquare size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-slate-400 text-sm">No messages yet</p>
                  <p className="text-slate-400 text-xs mt-1">Submit attendance or use the Composer to send messages</p>
                </div>
              ) : (
                <div className="bg-white/75 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/50 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          {['Recipient', 'Type', 'Template', 'Status', 'Created'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[9px] font-mono uppercase text-slate-400">{h}</th>
                          ))}
                          <th className="px-3 py-2 text-[9px] font-mono uppercase text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredOutbox.map(item => (
                          <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 cursor-pointer">
                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{item.recipientName}</td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.type.replace(/_/g,' ')}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{item.template}</td>
                            <td className="px-3 py-2"><StatusChip status={item.status} /></td>
                            <td className="px-3 py-2 text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <DeliveryIcon status={item.status} />
                                {item.status === 'failed' && (
                                  <button onClick={() => handleRetry(item.id)} className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline" aria-label="Retry">Retry</button>
                                )}
                                {(item.status === 'queued' || item.status === 'failed') && (
                                  <button onClick={() => handleCancel(item.id)} className="text-[9px] font-bold text-slate-400 hover:text-rose-500" aria-label="Cancel">Cancel</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detail drawer */}
              <AnimatePresence>
                {selectedItem && (
                  <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedItem(null)}>
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}
                      onClick={e => e.stopPropagation()}
                      className="bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 w-full max-w-md p-6 overflow-y-auto shadow-2xl flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Message Detail</h3>
                        <button onClick={() => setSelectedItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Close"><X size={16} /></button>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center gap-2"><StatusChip status={selectedItem.status} /></div>
                        <div><span className="text-slate-400">Recipient:</span> <strong>{selectedItem.recipientName}</strong></div>
                        <div><span className="text-slate-400">Phone:</span> <span className="font-mono">{formatPhoneForDisplay(selectedItem.to)}</span></div>
                        <div><span className="text-slate-400">Template:</span> <span className="font-mono">{selectedItem.template}</span></div>
                        <div><span className="text-slate-400">Type:</span> {selectedItem.type}</div>
                        <div><span className="text-slate-400">Message ID:</span> <span className="font-mono text-[9px] break-all">{selectedItem.messageId ?? '—'}</span></div>
                        {selectedItem.error && (
                          <div className="p-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                            <p className="text-rose-600 dark:text-rose-400 font-semibold mb-1">Error</p>
                            <p className="text-rose-500 dark:text-rose-300">{selectedItem.error}</p>
                            {selectedItem.retryable && <p className="text-[9px] text-slate-400 mt-1">This error is retryable.</p>}
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-slate-400 text-[9px] font-mono uppercase tracking-wider mb-1.5">Preview</p>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg">
                            {renderTemplatePreview(selectedItem.template, selectedItem.params)}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Timeline</p>
                          {(['queued','sending','accepted','sent','delivered','read'] as WhatsAppOutboxStatus[]).map(s => {
                            const current = ['queued','sending','accepted','sent','delivered','read','failed'].indexOf(selectedItem.status);
                            const step = ['queued','sending','accepted','sent','delivered','read'].indexOf(s);
                            const done = current >= step;
                            return (
                              <div key={s} className={`flex items-center gap-2 ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                {done ? <CheckCircle size={10} /> : <Clock size={10} />}
                                <span className="text-[10px] capitalize">{s}</span>
                              </div>
                            );
                          })}
                        </div>
                        {selectedItem.status === 'failed' && (
                          <button onClick={() => { handleRetry(selectedItem.id); setSelectedItem(null); }} className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                            <RotateCcw size={12} /> Retry Message
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── INBOX TAB ────────────────────────────────────────────────── */}
          {activeTab === 'inbox' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Message list */}
              <div className="space-y-2">
                {inbox.length === 0 ? (
                  <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <Inbox size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-slate-400 text-sm">No parent replies yet</p>
                    {settings.whatsappGatewayUrl?.includes('localhost') && (
                      <button onClick={async () => {
                        const r = await simulateMockInbound('+923001234567', 'Hello, is the school open tomorrow?');
                        if (r.ok) { triggerToast('info', 'Mock reply simulated'); await load(); } else triggerToast('error', (r as {message:string}).message);
                      }} className="mt-3 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                        Simulate a parent reply (mock mode)
                      </button>
                    )}
                  </div>
                ) : inbox.map(msg => {
                  const student = students.find(s => s.parentWhatsApp === msg.from || s.secondaryParentWhatsApp === msg.from);
                  const windowOpen = msg.replyWindowEndsAt > Date.now();
                  return (
                    <div key={msg.id} onClick={() => { setSelectedInbound(msg); handleMarkRead(msg); }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${!msg.read ? 'border-l-4 border-l-indigo-500 border-slate-200 dark:border-slate-700 bg-indigo-50/30 dark:bg-indigo-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'} hover:shadow-sm`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm flex-shrink-0">
                            {student ? student.name[0] : '?'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{student?.name ?? formatPhoneForDisplay(msg.from)}</p>
                            {student && <p className="text-[9px] text-slate-400">{classes.find(c => c.id === student.classId)?.name} — {student.section}</p>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[9px] text-slate-400">{new Date(msg.receivedAt).toLocaleString()}</p>
                          {windowOpen
                            ? <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold">Window open</span>
                            : <span className="text-[8px] text-slate-400">Window closed</span>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{msg.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Detail + reply panel */}
              {selectedInbound ? (
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  {(() => {
                    const student = students.find(s => s.parentWhatsApp === selectedInbound.from || s.secondaryParentWhatsApp === selectedInbound.from);
                    const windowOpen = selectedInbound.replyWindowEndsAt > Date.now();
                    const minsLeft = Math.max(0, Math.round((selectedInbound.replyWindowEndsAt - Date.now()) / 60000));
                    return (
                      <>
                        {student && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{student.name}</p>
                            <p className="text-[9px] text-slate-400">{classes.find(c => c.id === student.classId)?.name} · {student.section}</p>
                            <p className="text-[9px] font-mono text-slate-400 mt-1">{formatPhoneForDisplay(selectedInbound.from)}</p>
                            {!student.whatsappOptIn && <p className="text-[9px] text-amber-500 mt-1">⚠ Student is currently opted out</p>}
                          </div>
                        )}
                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-lg">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Message</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedInbound.text}</p>
                          <p className="text-[9px] text-slate-400 mt-2">{new Date(selectedInbound.receivedAt).toLocaleString()}</p>
                        </div>
                        {windowOpen ? (
                          <div className="space-y-2">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Reply window: {minsLeft < 60 ? `${minsLeft} min` : `${Math.round(minsLeft/60)} hr`} remaining</p>
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Type your reply…"
                              rows={3}
                              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900/50 resize-none"
                              aria-label="Reply text"
                            />
                            <button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                              {sendingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Reply
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">Reply window closed. You can only send template messages now.</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400">Select a message to view</p>
                </div>
              )}
            </div>
          )}

          {/* ── TEMPLATES TAB ────────────────────────────────────────────── */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Object.values(CLIENT_TEMPLATES).map(def => {
                const approvalStatus = templateApprovals[def.name] ?? (settings.whatsappGatewayUrl?.includes('localhost') ? 'APPROVED' : 'UNKNOWN');
                return (
                  <div key={def.name} className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">{def.name}</p>
                        <p className="text-[9px] text-slate-400">{def.category} · {def.language} · {def.paramCount} params</p>
                      </div>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase ${approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-600' : approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {approvalStatus}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                      {renderTemplatePreview(def.name, SAMPLE_PARAMS[def.name] ?? [])}
                    </p>
                    <button onClick={() => navigator.clipboard.writeText(def.body).then(() => triggerToast('success', 'Template text copied!')).catch(() => {})} className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline" aria-label="Copy template">
                      <Copy size={10} /> Copy template text
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── STATS TAB ────────────────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Rate cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Sent', value: stats.sent, cls: 'text-indigo-600' },
                  { label: 'Delivered %', value: `${deliveredPct}%`, cls: 'text-teal-600' },
                  { label: 'Read %', value: `${readPct}%`, cls: 'text-emerald-600' },
                  { label: 'Failed', value: stats.failed, cls: stats.failed > 0 ? 'text-rose-600' : 'text-slate-600' },
                ].map(c => (
                  <div key={c.label} className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold ${c.cls}`}>{c.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Volume chart — last 7 days */}
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-4">Messages per Day (Last 7 Days)</p>
                <div className="flex items-end gap-2 h-24">
                  {volumeByDay.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[8px] text-slate-400">{d.count > 0 ? d.count : ''}</span>
                      <div className="w-full bg-indigo-500/10 dark:bg-indigo-900/30 rounded-t" style={{ height: `${Math.max(4, (d.count / maxVol) * 80)}px` }}>
                        <div className="w-full h-full bg-indigo-500 rounded-t opacity-80" />
                      </div>
                      <span className="text-[9px] text-slate-400">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily cap gauge */}
              {diagnostics && (
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Daily Cap Usage</p>
                    <p className="text-xs text-slate-500">{(diagnostics as {dailyUsage?:number}).dailyUsage ?? 0} / {(diagnostics as {dailyCap?:number}).dailyCap ?? 500}</p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((diagnostics as {dailyUsage?:number}).dailyUsage ?? 0) / ((diagnostics as {dailyCap?:number}).dailyCap ?? 500) * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Failure reasons */}
              {stats.failed > 0 && (
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">Top Failure Reasons</p>
                  {Object.entries(
                    outbox.filter(i => i.status === 'failed' && i.error).reduce((acc, i) => {
                      const key = (i.error ?? 'Unknown').slice(0, 60);
                      acc[key] = (acc[key] ?? 0) + 1;
                      return acc;
                    }, {} as Record<string,number>)
                  ).sort(([,a],[,b]) => (b as number) - (a as number)).slice(0, 5).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 flex-1 mr-2">{reason}</p>
                      <span className="text-[10px] font-bold text-rose-500">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPOSER TAB ─────────────────────────────────────────────── */}
          {activeTab === 'composer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: config */}
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Quick Message Composer</p>

                {/* Type */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Message Type</label>
                  <select value={composerType} onChange={e => setComposerType(e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Message type">
                    {['fee_reminder','event_notice','certificate_issued','announcement_notice','optin_welcome'].map(t => (
                      <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Recipients</label>
                  <div className="flex gap-2 mb-2">
                    {(['all','class','individual'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setComposerRecipientMode(m)} className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border transition-all ${composerRecipientMode === m ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  {composerRecipientMode === 'class' && (
                    <select value={composerClassId} onChange={e => setComposerClassId(e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Select class">
                      <option value="">Select class…</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                    </select>
                  )}
                  {composerRecipientMode === 'individual' && (
                    <select value={composerStudentId} onChange={e => setComposerStudentId(e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none" aria-label="Select student">
                      <option value="">Select student…</option>
                      {students.filter(s => s.whatsappOptIn).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Params */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-1">Variables</label>
                  <div className="space-y-1.5">
                    {(CLIENT_TEMPLATES[composerType]?.paramLabels ?? []).map((label, i) => (
                      <div key={i}>
                        <label className="block text-[9px] text-slate-400 mb-0.5">{label}</label>
                        <input
                          type="text"
                          value={composerParams[i] ?? ''}
                          onChange={e => {
                            const newParams = [...composerParams];
                            newParams[i] = e.target.value;
                            setComposerParams(newParams);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send button */}
                <button onClick={handleComposerSend} disabled={composerSending} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {composerSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Send to {composerRecipientMode === 'all' ? students.filter(s => s.whatsappOptIn).length : composerRecipientMode === 'class' ? students.filter(s => s.classId === composerClassId && s.whatsappOptIn).length : composerStudentId ? 1 : 0} parent{composerRecipientMode !== 'individual' ? 's' : ''}
                </button>
              </div>

              {/* Right: preview */}
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-3">Message Preview</p>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{composerPreview}</p>
                </div>
                <p className="text-[9px] text-slate-400 mt-2">This is how the message will appear on WhatsApp</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
