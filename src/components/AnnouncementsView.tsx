/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone, Plus, Send, Trash2, Calendar, AlertCircle, Users, CheckCircle, Loader2 } from 'lucide-react';
import { Announcement, Student, Class, AppSettings } from '../types';
import { sendAnnouncementNotification } from '../notificationHelper';
import { emailService } from '../emailService';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  students: Student[];
  classes: Class[];
  settings: AppSettings;
  onAddAnnouncement: (announcement: Omit<Announcement, 'id'>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  triggerToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function AnnouncementsView({
  announcements,
  students,
  classes,
  settings,
  onAddAnnouncement,
  onDeleteAnnouncement,
  triggerToast
}: AnnouncementsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'general' | 'urgent' | 'event' | 'holiday'>('general');
  const [targetAudience, setTargetAudience] = useState<'all' | 'class'>('all');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      triggerToast('error', 'Please fill in all fields');
      return;
    }

    setIsSending(true);

    try {
      // Create announcement
      const announcement: Omit<Announcement, 'id'> = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetAudience,
        classIds: targetAudience === 'class' ? selectedClassIds : undefined,
        publishedDate: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
      };

      await onAddAnnouncement(announcement);

      // Send email notifications if configured
      if (emailService.isConfigured()) {
        // Get recipients based on target audience
        let recipients: Array<{ email: string; name: string; studentId?: string }> = [];
        
        if (targetAudience === 'all') {
          // All parents
          students.forEach(student => {
            if (student.parentEmail) {
              recipients.push({
                email: student.parentEmail,
                name: student.fatherName || student.motherName || 'Parent',
                studentId: student.id
              });
            }
            if (student.secondaryParentEmail) {
              recipients.push({
                email: student.secondaryParentEmail,
                name: student.motherName || student.fatherName || 'Parent',
                studentId: student.id
              });
            }
          });
        } else if (targetAudience === 'class' && selectedClassIds.length > 0) {
          // Selected classes only
          students
            .filter(s => selectedClassIds.includes(s.classId))
            .forEach(student => {
              if (student.parentEmail) {
                recipients.push({
                  email: student.parentEmail,
                  name: student.fatherName || student.motherName || 'Parent',
                  studentId: student.id
                });
              }
              if (student.secondaryParentEmail) {
                recipients.push({
                  email: student.secondaryParentEmail,
                  name: student.motherName || student.fatherName || 'Parent',
                  studentId: student.id
                });
              }
            });
        }

        // Remove duplicates
        recipients = recipients.filter((r, i, arr) => 
          arr.findIndex(x => x.email === r.email) === i
        );

        if (recipients.length > 0) {
          const result = await sendAnnouncementNotification(
            { id: 'temp', ...announcement } as Announcement,
            recipients,
            settings
          );
          
          triggerToast('success', 
            `Announcement posted! Emails sent: ${result.sent}, Failed: ${result.failed}`
          );
        } else {
          triggerToast('info', 'Announcement posted (no parent emails found)');
        }
      } else {
        triggerToast('success', 'Announcement posted!');
      }

      // Reset form
      setTitle('');
      setMessage('');
      setType('general');
      setTargetAudience('all');
      setSelectedClassIds([]);
      setIsModalOpen(false);
    } catch (error) {
      triggerToast('error', 'Failed to post announcement');
    } finally {
      setIsSending(false);
    }
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const typeColors = {
    general: 'bg-blue-500/10 text-blue-600 border-blue-200',
    urgent: 'bg-red-500/10 text-red-600 border-red-200',
    event: 'bg-purple-500/10 text-purple-600 border-purple-200',
    holiday: 'bg-green-500/10 text-green-600 border-green-200'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
            School Announcements
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Post announcements and notify parents via email
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-sans font-semibold text-sm shadow transition-all"
        >
          <Plus size={16} /> Post Announcement
        </button>
      </div>

      {/* Email Config Warning */}
      {!emailService.isConfigured() && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Email not configured.</strong> Announcements will be saved but emails won't be sent. 
            Go to Settings to configure EmailJS.
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
            <Megaphone size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No announcements yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
            >
              Post your first announcement
            </button>
          </div>
        ) : (
          announcements.map(announcement => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeColors[announcement.type]}`}>
                      {announcement.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(announcement.publishedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
                    {announcement.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                    {announcement.message}
                  </p>
                  {announcement.targetAudience === 'class' && announcement.classIds && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <Users size={12} />
                      Sent to: {announcement.classIds.map(id => {
                        const cls = classes.find(c => c.id === id);
                        return cls ? `${cls.name}-${cls.section}` : '';
                      }).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDeleteAnnouncement(announcement.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="text-indigo-600" size={24} />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Post Announcement
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['general', 'urgent', 'event', 'holiday'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                          type === t 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sports Day Announcement"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your announcement message..."
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 resize-none"
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Send To
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setTargetAudience('all')}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                        targetAudience === 'all'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      All Parents
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('class')}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                        targetAudience === 'class'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Specific Classes
                    </button>
                  </div>

                  {targetAudience === 'class' && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      {classes.map(cls => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.id)}
                          className={`px-3 py-2 text-xs font-semibold rounded border transition-all ${
                            selectedClassIds.includes(cls.id)
                              ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                          }`}
                        >
                          {cls.name}-{cls.section}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSending}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Post & Send Emails
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
