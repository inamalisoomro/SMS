/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Download, 
  Upload, 
  QrCode, 
  X,
  CreditCard,
  Printer,
  ChevronDown,
  Layers,
  Camera,
  Droplet,
  FileText,
  Loader2
} from 'lucide-react';
import { Student, Class, AppSettings } from '../types';
import { exportToCSV, parseCSV, generateStudentQRToken } from '../utils';
import { downloadBatchCardsPDF } from '../utils/idCardExport';
import StudentCard from './StudentCard';

interface StudentsViewProps {
  students: Student[];
  classes: Class[];
  settings: AppSettings;
  onAddStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onImportStudents: (students: Omit<Student, 'id'>[]) => Promise<void>;
  onReissueToken: (studentId: string) => Promise<Student | undefined | void>;
}

export default function StudentsView({
  students,
  classes,
  settings,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportStudents,
  onReissueToken,
}: StudentsViewProps) {
  // Navigation & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBatchCardsModalOpen, setIsBatchCardsModalOpen] = useState(false);
  const [batchClassFilter, setBatchClassFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Batch Export PDF states
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formParentEmail, setFormParentEmail] = useState('');
  const [formSecondaryParentEmail, setFormSecondaryParentEmail] = useState('');
  const [formFatherName, setFormFatherName] = useState('');
  const [formMotherName, setFormMotherName] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formDob, setFormDob] = useState('2010-01-01');
  const [formAdmissionDate, setFormAdmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCardValidUntil, setFormCardValidUntil] = useState('2027-06-30');
  const [formPhoto, setFormPhoto] = useState<string | undefined>(undefined);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Filter lists
  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.includes(searchQuery);
    
    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    const matchesSection = selectedSection === 'all' || s.section === selectedSection;

    return matchesSearch && matchesClass && matchesSection;
  });

  // Unique sections list for filtering
  const sections = Array.from(new Set(students.map(s => s.section))).sort();

  // Helper: Open add student modal
  const handleOpenAddModal = () => {
    const nextNum = students.length + 1;
    const paddedNum = String(nextNum).padStart(3, '0');
    setFormStudentId(`ST-2026-${paddedNum}`);
    setFormName('');
    setFormRoll('');
    setFormClassId(classes[0]?.id || '');
    setFormSection(classes[0]?.section || 'A');
    setFormContact('');
    setFormEmail('');
    setFormParentEmail('');
    setFormSecondaryParentEmail('');
    setFormFatherName('');
    setFormMotherName('');
    setFormBloodGroup('O+');
    setFormDob('2010-01-01');
    setFormAdmissionDate(new Date().toISOString().split('T')[0]);
    setFormCardValidUntil('2027-06-30');
    setFormPhoto(undefined);
    setIsAddModalOpen(true);
  };

  // Helper: Open edit student modal
  const handleOpenEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormStudentId(student.studentId);
    setFormName(student.name);
    setFormRoll(student.rollNumber);
    setFormClassId(student.classId);
    setFormSection(student.section);
    setFormContact(student.contactNumber);
    setFormEmail(student.email || '');
    setFormParentEmail(student.parentEmail || '');
    setFormSecondaryParentEmail(student.secondaryParentEmail || '');
    setFormFatherName(student.fatherName || '');
    setFormMotherName(student.motherName || '');
    setFormBloodGroup(student.bloodGroup || 'O+');
    setFormDob(student.dateOfBirth || '2010-01-01');
    setFormAdmissionDate(student.admissionDate || new Date().toISOString().split('T')[0]);
    setFormCardValidUntil(student.cardValidUntil || '2027-06-30');
    setFormPhoto(student.photo);
    setIsEditModalOpen(true);
  };

  // Helper: Open Digital ID Card Modal
  const handleOpenCardModal = (student: Student) => {
    setSelectedStudent(student);
    setIsCardModalOpen(true);
  };

  // Photo change handler
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form submission: Add student
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRoll || !formClassId || !formSection || !formContact) return;

    await onAddStudent({
      studentId: formStudentId,
      name: formName,
      rollNumber: formRoll,
      classId: formClassId,
      section: formSection,
      contactNumber: formContact,
      email: formEmail || undefined,
      parentEmail: formParentEmail || undefined,
      secondaryParentEmail: formSecondaryParentEmail || undefined,
      fatherName: formFatherName || undefined,
      motherName: formMotherName || undefined,
      bloodGroup: formBloodGroup,
      dateOfBirth: formDob,
      admissionDate: formAdmissionDate,
      cardValidUntil: formCardValidUntil,
      photo: formPhoto,
      qrToken: generateStudentQRToken(),
      cardIssuedAt: new Date().toISOString().split('T')[0],
    });

    setIsAddModalOpen(false);
  };

  // Form submission: Edit student
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !formName || !formRoll || !formClassId || !formSection || !formContact) return;

    await onUpdateStudent({
      ...selectedStudent,
      studentId: formStudentId,
      name: formName,
      rollNumber: formRoll,
      classId: formClassId,
      section: formSection,
      contactNumber: formContact,
      email: formEmail || undefined,
      parentEmail: formParentEmail || undefined,
      secondaryParentEmail: formSecondaryParentEmail || undefined,
      fatherName: formFatherName || undefined,
      motherName: formMotherName || undefined,
      bloodGroup: formBloodGroup,
      dateOfBirth: formDob,
      admissionDate: formAdmissionDate,
      cardValidUntil: formCardValidUntil,
      photo: formPhoto,
    });

    setIsEditModalOpen(false);
    setSelectedStudent(null);
  };

  // CSV Import Trigger
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length <= 1) return;

      const headers = parsed[0].map(h => h.toLowerCase().trim());
      const studentsToImport: Omit<Student, 'id'>[] = [];

      const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('fullname');
      const rollIdx = headers.indexOf('roll') !== -1 ? headers.indexOf('roll') : headers.indexOf('rollnumber');
      const classIdx = headers.indexOf('class');
      const secIdx = headers.indexOf('section');
      const contactIdx = headers.indexOf('contact') !== -1 ? headers.indexOf('contact') : headers.indexOf('contactnumber');
      const emailIdx = headers.indexOf('email');
      const fatherIdx = headers.indexOf('father') !== -1 ? headers.indexOf('father') : headers.indexOf('fathername');
      const bloodIdx = headers.indexOf('blood') !== -1 ? headers.indexOf('blood') : headers.indexOf('bloodgroup');

      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        if (row.length < 2) continue;

        const name = row[nameIdx] || '';
        const roll = row[rollIdx] || `${i}`;
        const classIdOrName = row[classIdx] || '';
        const section = row[secIdx] || 'A';
        const contact = row[contactIdx] || '+1 555-0000';
        const email = emailIdx !== -1 ? row[emailIdx] : '';
        const fatherName = fatherIdx !== -1 ? row[fatherIdx] : undefined;
        const bloodGroup = bloodIdx !== -1 ? row[bloodIdx] : 'O+';

        const matchedClass = classes.find(c => c.name.toLowerCase() === classIdOrName.toLowerCase() || c.id === classIdOrName);
        const resolvedClassId = matchedClass ? matchedClass.id : (classes[0]?.id || 'c1');
        const studentId = `ST-2026-${String(students.length + studentsToImport.length + 1).padStart(3, '0')}`;

        if (name) {
          studentsToImport.push({
            studentId,
            name,
            rollNumber: roll,
            classId: resolvedClassId,
            section,
            contactNumber: contact,
            email: email || undefined,
            fatherName,
            bloodGroup,
            qrToken: generateStudentQRToken(),
            cardValidUntil: '2027-06-30',
            cardIssuedAt: new Date().toISOString().split('T')[0],
          });
        }
      }

      if (studentsToImport.length > 0) {
        await onImportStudents(studentsToImport);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // CSV Export Trigger
  const handleCSVExport = () => {
    const headers = ['Student ID', 'Full Name', 'Roll Number', 'Class Name', 'Section', 'Contact Number', 'Email', 'Blood Group', 'Father Name'];
    const rows = filteredStudents.map(s => {
      const cls = classes.find(c => c.id === s.classId);
      return [
        s.studentId,
        s.name,
        s.rollNumber,
        cls ? cls.name : 'Unknown',
        s.section,
        s.contactNumber,
        s.email || '',
        s.bloodGroup || 'O+',
        s.fatherName || '',
      ];
    });
    exportToCSV(headers, rows, `SAMS_Student_Directory_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Single card print trigger
  const handlePrintCard = () => {
    window.print();
  };

  // Batch students for batch modal
  const batchStudents = batchClassFilter === 'all'
    ? students
    : students.filter(s => s.classId === batchClassFilter);

  // Batch 8-Up A4 PDF Export trigger
  const handleExportBatchPDF = async () => {
    if (batchStudents.length === 0) return;
    setIsExportingBatch(true);
    try {
      await downloadBatchCardsPDF(batchStudents, classes, settings, (current, total) => {
        setBatchProgress({ current, total });
      });
    } catch (err) {
      console.error('Failed to export batch cards PDF:', err);
    } finally {
      setIsExportingBatch(false);
      setBatchProgress(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Search and Main Filters Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
            Students Directory & ID Center
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain digital student records, generate CR80 smart identity passes with secure QR tokens, and batch print badges.
          </p>
        </div>

        {/* Directory Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout switches */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white/40 dark:bg-slate-900/40 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold font-sans transition-all ${
                viewMode === 'table' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold font-sans transition-all ${
                viewMode === 'grid' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Pass Cards
            </button>
          </div>

          {/* Batch Print ID Passes */}
          <button
            onClick={() => setIsBatchCardsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold transition-all"
            title="Batch print student ID passes for an entire class"
          >
            <Layers size={13} />
            <span>Batch Print Passes</span>
          </button>

          {/* Import/Export buttons */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload size={12} className="text-slate-400" />
            <span>Import CSV</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVImport}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={handleCSVExport}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={12} className="text-slate-400" />
            <span>Export CSV</span>
          </button>

          {/* Add Student button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Plus size={13} />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Roster Filters Grid */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3 rounded-xl shadow-xs flex flex-col md:flex-row gap-2.5">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, student ID, or roll number..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-all font-sans"
          />
        </div>

        <div className="flex gap-2">
          {/* Class selection filter */}
          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-all font-sans font-semibold"
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Section filter */}
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-all font-sans font-semibold"
            >
              <option value="all">All Sections</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Directory Content Display */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-xl py-10 text-center">
          <Search size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-slate-500 dark:text-slate-400 font-sans text-xs">No student records found matching the query.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Student ID</th>
                  <th className="px-4 py-2.5">Full Name</th>
                  <th className="px-4 py-2.5">Roll</th>
                  <th className="px-4 py-2.5">Class</th>
                  <th className="px-4 py-2.5">Blood</th>
                  <th className="px-4 py-2.5">Contact Phone</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredStudents.map((student) => {
                  const studentClass = classes.find(c => c.id === student.classId);
                  const firstLetter = student.name.charAt(0);
                  return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 text-slate-700 dark:text-slate-300 font-sans text-xs transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {student.studentId}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {student.photo ? (
                            <img
                              src={student.photo}
                              alt={student.name}
                              className="w-7 h-7 rounded-full object-cover border border-indigo-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                              {firstLetter}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{student.email || 'No email registered'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-medium">
                        #{student.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {studentClass ? `${studentClass.name} - ${studentClass.section}` : `Sect. ${student.section}`}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-rose-500 font-bold">
                        {student.bloodGroup || 'O+'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {student.contactNumber}
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCardModal(student)}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          title="Generate & View ID Card"
                        >
                          <QrCode size={12} />
                          <span>ID Card</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors inline-block"
                          title="Edit Info"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteStudent(student.id)}
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
      ) : (
        /* Badge Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredStudents.map((student) => {
            const studentClass = classes.find(c => c.id === student.classId);
            return (
              <div 
                key={student.id}
                className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-3.5 rounded-xl shadow-xs hover:shadow transition-all flex flex-col items-center text-center group"
              >
                {/* Visual Avatar */}
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.name}
                    className="w-13 h-13 rounded-full object-cover border-2 border-indigo-400/60 shadow"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-base shadow">
                    {student.name.charAt(0)}
                  </div>
                )}
                
                <h3 className="font-sans font-bold text-xs text-slate-800 dark:text-slate-100 mt-2.5 truncate max-w-full">
                  {student.name}
                </h3>
                <p className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                  {student.studentId}
                </p>

                <div className="w-full border-t border-slate-100 dark:border-slate-800 my-2.5" />

                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs font-sans w-full text-left text-slate-500 dark:text-slate-400 px-0.5">
                  <div>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Class</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block text-[11px]">
                      {studentClass ? studentClass.name : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Roll</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                      #{student.rollNumber}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Blood</span>
                    <span className="font-mono font-bold text-rose-500 block text-[11px]">
                      {student.bloodGroup || 'O+'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Contact</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 block truncate text-[10px]">
                      {student.contactNumber}
                    </span>
                  </div>
                </div>

                <div className="w-full border-t border-slate-100 dark:border-slate-800 my-2.5" />

                <div className="flex justify-center gap-1.5 w-full">
                  <button
                    onClick={() => handleOpenCardModal(student)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold transition-all"
                  >
                    <QrCode size={11} /> Pass
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(student)}
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-all"
                  >
                    <Edit size={11} />
                  </button>
                  <button
                    onClick={() => onDeleteStudent(student.id)}
                    className="px-2 py-1 rounded hover:bg-rose-500/5 border border-rose-100 dark:border-rose-950/20 text-rose-500 text-[11px] font-semibold transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTER STUDENT (ADD) */}
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-xl p-5 relative z-10 shadow-xl overflow-y-auto max-h-[92vh]"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute right-3.5 top-3.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Plus size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Register New Student</h3>
                  <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">
                    Add pupil record with photo and auto-generated secure QR attendance token
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5">
                {/* Photo Upload preview row */}
                <div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  {formPhoto ? (
                    <img
                      src={formPhoto}
                      alt="Student Preview"
                      className="w-14 h-14 object-cover rounded-lg border-2 border-indigo-400/60 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Camera size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Student Photo</span>
                    <span className="text-[10px] text-slate-400 block">Recommended square or portrait photo for CR80 card</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Choose Photo
                      </button>
                      {formPhoto && (
                        <button
                          type="button"
                          onClick={() => setFormPhoto(undefined)}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Johnathan Miller"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Student ID *</label>
                    <input
                      type="text"
                      required
                      value={formStudentId}
                      onChange={(e) => setFormStudentId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Roll Number *</label>
                    <input
                      type="text"
                      required
                      value={formRoll}
                      onChange={(e) => setFormRoll(e.target.value)}
                      placeholder="e.g. 05"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Class *</label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Section *</label>
                    <input
                      type="text"
                      required
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      placeholder="e.g. A"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Blood Group</label>
                    <select
                      value={formBloodGroup}
                      onChange={(e) => setFormBloodGroup(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Card Valid Until</label>
                    <input
                      type="date"
                      value={formCardValidUntil}
                      onChange={(e) => setFormCardValidUntil(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Father / Guardian Name</label>
                    <input
                      type="text"
                      value={formFatherName}
                      onChange={(e) => setFormFatherName(e.target.value)}
                      placeholder="e.g. Robert Miller"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Mother Name</label>
                    <input
                      type="text"
                      value={formMotherName}
                      onChange={(e) => setFormMotherName(e.target.value)}
                      placeholder="e.g. Sarah Miller"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Contact Number *</label>
                    <input
                      type="text"
                      required
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      placeholder="e.g. +1 555-0100"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. john@school.edu"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  {/* Parent Email Fields for Notifications */}
                  <div className="col-span-2 border-t border-slate-200 dark:border-slate-800 pt-3 mt-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      📧 Parent Email (For Notifications)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Primary Parent Email</label>
                        <input
                          type="email"
                          value={formParentEmail}
                          onChange={(e) => setFormParentEmail(e.target.value)}
                          placeholder="father@example.com"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5">Homework, results, certificates</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Secondary Parent Email</label>
                        <input
                          type="email"
                          value={formSecondaryParentEmail}
                          onChange={(e) => setFormSecondaryParentEmail(e.target.value)}
                          placeholder="mother@example.com (optional)"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5">Optional second parent</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-sans font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow-xs"
                  >
                    Register Student & Issue Pass
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT STUDENT */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditModalOpen(false); setSelectedStudent(null); }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-xl p-5 relative z-10 shadow-xl overflow-y-auto max-h-[92vh]"
            >
              <button 
                onClick={() => { setIsEditModalOpen(false); setSelectedStudent(null); }}
                className="absolute right-3.5 top-3.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Edit size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Edit Student Profile</h3>
                  <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">Update identity records for {selectedStudent?.name}</p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                {/* Photo Upload preview row */}
                <div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  {formPhoto ? (
                    <img
                      src={formPhoto}
                      alt="Student Preview"
                      className="w-14 h-14 object-cover rounded-lg border-2 border-indigo-400/60 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Camera size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Student Photo</span>
                    <span className="text-[10px] text-slate-400 block">Update card portrait photo</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Change Photo
                      </button>
                      {formPhoto && (
                        <button
                          type="button"
                          onClick={() => setFormPhoto(undefined)}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Student ID *</label>
                    <input
                      type="text"
                      required
                      value={formStudentId}
                      onChange={(e) => setFormStudentId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Roll Number *</label>
                    <input
                      type="text"
                      required
                      value={formRoll}
                      onChange={(e) => setFormRoll(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Class *</label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Section *</label>
                    <input
                      type="text"
                      required
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Blood Group</label>
                    <select
                      value={formBloodGroup}
                      onChange={(e) => setFormBloodGroup(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Card Valid Until</label>
                    <input
                      type="date"
                      value={formCardValidUntil}
                      onChange={(e) => setFormCardValidUntil(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Father / Guardian Name</label>
                    <input
                      type="text"
                      value={formFatherName}
                      onChange={(e) => setFormFatherName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Contact Number *</label>
                    <input
                      type="text"
                      required
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsEditModalOpen(false); setSelectedStudent(null); }}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-sans font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SINGLE STUDENT CR80 ID CARD */}
      <AnimatePresence>
        {isCardModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsCardModalOpen(false); setSelectedStudent(null); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-lg p-5 relative z-10 shadow-2xl flex flex-col items-center"
            >
              <button 
                onClick={() => { setIsCardModalOpen(false); setSelectedStudent(null); }}
                className="absolute right-3.5 top-3.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>

              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
                <CreditCard size={15} className="text-indigo-500" />
                <span>Student Smart Pass & QR Identity Badge</span>
              </h3>

              {/* Render CR80 Standard Card */}
              <StudentCard
                student={selectedStudent}
                settings={settings}
                studentClass={classes.find(c => c.id === selectedStudent.classId)}
                onReissueToken={async (id) => {
                  const updated = await onReissueToken(id);
                  if (updated) {
                    setSelectedStudent(updated);
                  } else {
                    const fresh = students.find(s => s.id === id);
                    if (fresh) setSelectedStudent(fresh);
                  }
                }}
              />

              <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setIsCardModalOpen(false); setSelectedStudent(null); }}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BATCH CARDS PRINT GENERATOR */}
      <AnimatePresence>
        {isBatchCardsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBatchCardsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-4xl p-5 relative z-10 shadow-2xl flex flex-col max-h-[94vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Layers size={16} />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      Batch Student Passes Generator
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Standard CR80 dimensions, printable 8-up grid ready for plastic card or paper badge cutting
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Class Filter */}
                  <select
                    value={batchClassFilter}
                    onChange={(e) => setBatchClassFilter(e.target.value)}
                    className="pl-2 pr-6 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Classes ({students.length})</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.section} ({students.filter(s => s.classId === c.id).length})
                      </option>
                    ))}
                  </select>

                  {/* 8-Up A4 PDF Export */}
                  <button
                    onClick={handleExportBatchPDF}
                    disabled={isExportingBatch || batchStudents.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                    title="Export 8-Up A4 PDF sheet for batch printing"
                  >
                    {isExportingBatch ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>
                          {batchProgress
                            ? `Generating (${batchProgress.current}/${batchProgress.total})...`
                            : 'Rendering PDF...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText size={12} />
                        <span>Export 8-Up A4 PDF</span>
                      </>
                    )}
                  </button>

                  {/* Direct Sheet Print */}
                  <button
                    onClick={() => window.print()}
                    disabled={isExportingBatch || batchStudents.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all"
                  >
                    <Printer size={12} />
                    <span>Print Sheet</span>
                  </button>

                  <button 
                    onClick={() => setIsBatchCardsModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Grid of Student Cards for preview & print */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div id="printable-batch-area" className="grid grid-cols-1 md:grid-cols-2 gap-4 place-items-center">
                  {batchStudents.map(student => (
                    <div key={student.id} className="scale-[0.92] origin-top">
                      <StudentCard
                        student={student}
                        settings={settings}
                        studentClass={classes.find(c => c.id === student.classId)}
                        interactive={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
