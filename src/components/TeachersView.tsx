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
  GraduationCap,
  Mail,
  Phone,
  Award,
  ArrowLeft
} from 'lucide-react';
import { Teacher } from '../types';

interface TeachersViewProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
  onUpdateTeacher: (teacher: Teacher) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  onNavigate?: (tab: string) => void;
}

export default function TeachersView({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onNavigate,
}: TeachersViewProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Form states
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSubjectSpecialization, setFormSubjectSpecialization] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formAddress, setFormAddress] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');

  // Filter lists
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teacherId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subjectSpecialization && t.subjectSpecialization.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Helper: Open add teacher modal
  const handleOpenAddModal = () => {
    const nextNum = teachers.length + 1;
    const paddedNum = String(nextNum).padStart(3, '0');
    setFormTeacherId(`TCH-2026-${paddedNum}`);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormSubjectSpecialization('');
    setFormQualification('');
    setFormExperience('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormAddress('');
    setFormEmergencyContact('');
    setIsAddModalOpen(true);
  };

  // Helper: Open edit teacher modal
  const handleOpenEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormTeacherId(teacher.teacherId);
    setFormName(teacher.name);
    setFormEmail(teacher.email);
    setFormPhone(teacher.phone);
    setFormSubjectSpecialization(teacher.subjectSpecialization || '');
    setFormQualification(teacher.qualification || '');
    setFormExperience(teacher.experience || '');
    setFormJoiningDate(teacher.joiningDate || new Date().toISOString().split('T')[0]);
    setFormAddress(teacher.address || '');
    setFormEmergencyContact(teacher.emergencyContact || '');
    setIsEditModalOpen(true);
  };

  // Form submission: Add teacher
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPhone) return;

    await onAddTeacher({
      teacherId: formTeacherId,
      name: formName,
      email: formEmail,
      phone: formPhone,
      subjectSpecialization: formSubjectSpecialization || undefined,
      qualification: formQualification || undefined,
      experience: formExperience || undefined,
      joiningDate: formJoiningDate,
      address: formAddress || undefined,
      emergencyContact: formEmergencyContact || undefined,
      registeredAt: Date.now(), // Set registration timestamp
    });

    setIsAddModalOpen(false);
  };

  // Form submission: Edit teacher
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !formName || !formEmail || !formPhone) return;

    await onUpdateTeacher({
      ...selectedTeacher,
      teacherId: formTeacherId,
      name: formName,
      email: formEmail,
      phone: formPhone,
      subjectSpecialization: formSubjectSpecialization || undefined,
      qualification: formQualification || undefined,
      experience: formExperience || undefined,
      joiningDate: formJoiningDate,
      address: formAddress || undefined,
      emergencyContact: formEmergencyContact || undefined,
      // Preserve original registeredAt - do not update on edit
    });

    setIsEditModalOpen(false);
    setSelectedTeacher(null);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Search and Main Filters Area */}
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
              Teacher Directory
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage teaching staff records and contact information.
            </p>
          </div>
        </div>

        {/* Directory Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Teacher button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus size={13} />
            <span>Register Teacher</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3 rounded-xl shadow-xs">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, teacher ID, email, or subject..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-all font-sans"
          />
        </div>
      </div>

      {/* Directory Content Display */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
          <GraduationCap size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">No teacher records found matching the query.</p>
          <button
            onClick={handleOpenAddModal}
            className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
          >
            Register your first teacher
          </button>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Teacher ID</th>
                  <th className="px-4 py-2.5">Full Name</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Qualification</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredTeachers.map((teacher) => {
                  const firstLetter = teacher.name.charAt(0);
                  return (
                    <tr 
                      key={teacher.id} 
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 text-slate-700 dark:text-slate-300 font-sans text-xs transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {teacher.teacherId}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {firstLetter}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{teacher.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Mail size={8} /> {teacher.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {teacher.subjectSpecialization || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {teacher.qualification || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1 text-[10px]">
                          <Phone size={10} />
                          {teacher.phone}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(teacher)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors inline-block"
                          title="Edit Info"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteTeacher(teacher.id)}
                          className="p-1 rounded bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 transition-colors inline-block"
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER TEACHER (ADD) */}
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
                      <GraduationCap size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Register New Teacher</h3>
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
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher ID *</label>
                      <input
                        type="text"
                        required
                        value={formTeacherId}
                        onChange={(e) => setFormTeacherId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Dr. Jane Smith"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="teacher@school.edu"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+1 555-0100"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject Specialization</label>
                      <input
                        type="text"
                        value={formSubjectSpecialization}
                        onChange={(e) => setFormSubjectSpecialization(e.target.value)}
                        placeholder="e.g. Mathematics"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Qualification</label>
                      <input
                        type="text"
                        value={formQualification}
                        onChange={(e) => setFormQualification(e.target.value)}
                        placeholder="e.g. M.Ed., Ph.D."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Experience (years)</label>
                      <input
                        type="text"
                        value={formExperience}
                        onChange={(e) => setFormExperience(e.target.value)}
                        placeholder="e.g. 5 years"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={formJoiningDate}
                        onChange={(e) => setFormJoiningDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Residential address"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={formEmergencyContact}
                      onChange={(e) => setFormEmergencyContact(e.target.value)}
                      placeholder="Emergency phone number"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                    />
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
                      className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all"
                    >
                      Register Teacher
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT TEACHER */}
      <AnimatePresence>
        {isEditModalOpen && selectedTeacher && (
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
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Edit Teacher</h3>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher ID *</label>
                      <input
                        type="text"
                        required
                        value={formTeacherId}
                        onChange={(e) => setFormTeacherId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject Specialization</label>
                      <input
                        type="text"
                        value={formSubjectSpecialization}
                        onChange={(e) => setFormSubjectSpecialization(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Qualification</label>
                      <input
                        type="text"
                        value={formQualification}
                        onChange={(e) => setFormQualification(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Experience (years)</label>
                      <input
                        type="text"
                        value={formExperience}
                        onChange={(e) => setFormExperience(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={formJoiningDate}
                        onChange={(e) => setFormJoiningDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={formEmergencyContact}
                      onChange={(e) => setFormEmergencyContact(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                    />
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
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition-all"
                    >
                      Save Changes
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
