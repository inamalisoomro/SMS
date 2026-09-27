/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Download, 
  Upload, 
  QrCode, 
  X,
  CreditCard,
  Printer,
  ChevronDown,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { Student, Class } from '../types';
import { exportToCSV, parseCSV, generateBarcodeSVG, generateQRCodeSVG } from '../utils';

interface StudentsViewProps {
  students: Student[];
  classes: Class[];
  onAddStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onImportStudents: (students: Omit<Student, 'id'>[]) => Promise<void>;
}

export default function StudentsView({
  students,
  classes,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportStudents
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStudentId, setFormStudentId] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Generate an automatic student ID based on existing length
    const nextNum = students.length + 1;
    const paddedNum = String(nextNum).padStart(3, '0');
    setFormStudentId(`ST-2026-${paddedNum}`);
    setFormName('');
    setFormRoll('');
    setFormClassId(classes[0]?.id || '');
    setFormSection(classes[0]?.section || 'A');
    setFormContact('');
    setFormEmail('');
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
    setIsEditModalOpen(true);
  };

  // Helper: Open Digital ID Card Modal
  const handleOpenCardModal = (student: Student) => {
    setSelectedStudent(student);
    setIsCardModalOpen(true);
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
      email: formEmail || undefined
    });

    setIsAddModalOpen(false);
  };

  // Form submission: Edit student
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !formName || !formRoll || !formClassId || !formSection || !formContact) return;

    await onUpdateStudent({
      id: selectedStudent.id,
      studentId: formStudentId,
      name: formName,
      rollNumber: formRoll,
      classId: formClassId,
      section: formSection,
      contactNumber: formContact,
      email: formEmail || undefined
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
      if (parsed.length <= 1) return; // Empty file or headers only

      const headers = parsed[0].map(h => h.toLowerCase().trim());
      const studentsToImport: Omit<Student, 'id'>[] = [];

      // Find indices based on headers
      const nameIdx = headers.indexOf('name');
      const rollIdx = headers.indexOf('roll') !== -1 ? headers.indexOf('roll') : headers.indexOf('rollnumber');
      const classIdx = headers.indexOf('class'); // expecting a class ID or name
      const secIdx = headers.indexOf('section');
      const contactIdx = headers.indexOf('contact') !== -1 ? headers.indexOf('contact') : headers.indexOf('contactnumber');
      const emailIdx = headers.indexOf('email');

      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        if (row.length < 2) continue; // Skip incomplete lines

        const name = row[nameIdx] || '';
        const roll = row[rollIdx] || `${i}`;
        let classId = row[classIdx] || '';
        const section = row[secIdx] || 'A';
        const contact = row[contactIdx] || '+1 555-0000';
        const email = emailIdx !== -1 ? row[emailIdx] : '';

        // Match class name to classId if applicable
        const matchedClass = classes.find(c => c.name.toLowerCase() === classId.toLowerCase() || c.id === classId);
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
            email: email || undefined
          });
        }
      }

      if (studentsToImport.length > 0) {
        await onImportStudents(studentsToImport);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // CSV Export Trigger
  const handleCSVExport = () => {
    const headers = ['Student ID', 'Full Name', 'Roll Number', 'Class Name', 'Section', 'Contact Number', 'Email'];
    const rows = filteredStudents.map(s => {
      const cls = classes.find(c => c.id === s.classId);
      return [
        s.studentId,
        s.name,
        s.rollNumber,
        cls ? cls.name : 'Unknown',
        s.section,
        s.contactNumber,
        s.email || ''
      ];
    });
    exportToCSV(headers, rows, `SAMS_Student_Directory_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Trigger browser print for Badge Modal
  const handlePrintBadge = () => {
    const printContent = document.getElementById('student-id-card-print-area');
    if (!printContent) return;

    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=100,top=100,width=600,height=800');

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Student ID Badge - ${selectedStudent?.name}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f1f5f9;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              background: #ffffff;
              width: 320px;
              height: 500px;
              border-radius: 16px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              border: 1px solid #e2e8f0;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              text-align: center;
              position: relative;
            }
            .card-header {
              background-color: #4f46e5;
              color: white;
              padding: 24px 16px;
            }
            .school-logo {
              font-size: 24px;
              margin-bottom: 4px;
            }
            .school-name {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .card-body {
              padding: 24px;
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .avatar {
              width: 90px;
              height: 90px;
              border-radius: 50%;
              background: linear-gradient(135deg, #6366f1, #a855f7);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: bold;
              margin-top: -50px;
              border: 4px stroke white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .name {
              font-size: 18px;
              font-weight: bold;
              color: #1e293b;
              margin: 12px 0 4px 0;
            }
            .title {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 16px;
            }
            .info-grid {
              width: 100%;
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 8px;
              margin-bottom: 24px;
              font-size: 11px;
              text-align: left;
            }
            .info-label {
              color: #64748b;
              font-weight: bold;
            }
            .info-value {
              color: #1e293b;
              font-weight: 600;
            }
            .barcode-container {
              width: 140px;
              height: 45px;
              margin-bottom: 12px;
            }
            .qr-container {
              width: 80px;
              height: 80px;
              position: absolute;
              bottom: 15px;
              right: 15px;
            }
            @media print {
              body {
                background: none;
              }
              .card {
                box-shadow: none;
                border: 1px solid #cbd5e1;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Search and Main Filters Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
            Students Directory
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain digital student records, print individual identification badges, and batch export database rosters.
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
              Badge Grid
            </button>
          </div>

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
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all"
          >
            <Plus size={13} />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Roster Filters Grid */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 p-3 rounded-xl shadow-sm flex flex-col md:flex-row gap-2.5">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, ID, or roll number..."
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
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Student ID</th>
                  <th className="px-4 py-2.5">Full Name</th>
                  <th className="px-4 py-2.5">Roll</th>
                  <th className="px-4 py-2.5">Class</th>
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
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {firstLetter}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{student.email || 'No email registered'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-medium">
                        {student.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {studentClass ? `${studentClass.name} - ${studentClass.section}` : `Sect. ${student.section}`}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {student.contactNumber}
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCardModal(student)}
                          className="p-1 rounded bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="View Digital Badge"
                        >
                          <QrCode size={12} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                          title="Edit Info"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-1 rounded bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 transition-colors"
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
                className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-3.5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col items-center text-center group"
              >
                {/* Visual Header Grid Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow">
                  {student.name.charAt(0)}
                </div>
                
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
                  <div className="col-span-2">
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Contact</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate text-[10px]">
                      {student.contactNumber}
                    </span>
                  </div>
                </div>

                <div className="w-full border-t border-slate-100 dark:border-slate-800 my-2.5" />

                <div className="flex justify-center gap-1.5 w-full">
                  <button
                    onClick={() => handleOpenCardModal(student)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-all"
                  >
                    <QrCode size={11} /> Badge
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(student)}
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-all"
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
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-lg p-4.5 relative z-10 shadow-xl overflow-y-auto max-h-[95vh]"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Plus size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Register New Student</h3>
                  <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">Add a new pupil to the digital attendance grid</p>
                </div>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
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
                      placeholder="ST-2026-XYZ"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
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
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
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
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
                    />
                  </div>

                  <div className="col-span-2">
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

                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. john.doe@school.edu"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                    />
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
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow shadow-indigo-600/15"
                  >
                    Register Student
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
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-lg p-4.5 relative z-10 shadow-xl overflow-y-auto max-h-[95vh]"
            >
              <button 
                onClick={() => { setIsEditModalOpen(false); setSelectedStudent(null); }}
                className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Edit size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Edit Student Record</h3>
                  <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">Update file logs for {selectedStudent?.name}</p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
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
                      placeholder="ST-2026-XYZ"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
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
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
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
                      className="w-full px-3 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
                    />
                  </div>

                  <div className="col-span-2">
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

                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. john.doe@school.edu"
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
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs shadow shadow-indigo-600/15"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DIGITAL ID BADGE CARD */}
      <AnimatePresence>
        {isCardModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsCardModalOpen(false); setSelectedStudent(null); }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl w-full max-w-sm p-4 relative z-10 shadow-xl flex flex-col items-center"
            >
              <button 
                onClick={() => { setIsCardModalOpen(false); setSelectedStudent(null); }}
                className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>

              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
                <CreditCard size={15} className="text-indigo-500" /> Digital ID Badge
              </h3>

              {/* ID Badge Container (Target of Window Printing) */}
              <div 
                id="student-id-card-print-area" 
                className="w-full flex justify-center mb-4"
              >
                <div className="card w-[290px] h-[450px] bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col text-center relative font-sans">
                  {/* Card Header Background banner */}
                  <div className="bg-indigo-600 text-white py-5 px-4">
                    <span className="text-xl block mb-0.5">🎓</span>
                    <span className="font-bold text-xs uppercase tracking-wider block">SAMS ACADEMY</span>
                    <span className="text-[9px] text-indigo-200 uppercase tracking-widest font-semibold font-mono">Student ID Card</span>
                  </div>

                  {/* Card Body content */}
                  <div className="p-5 flex-1 flex flex-col items-center justify-between">
                    {/* Floating Avatar */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl -mt-14 border-4 border-white shadow-md">
                      {selectedStudent.name.charAt(0)}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-800 mt-2">{selectedStudent.name}</h4>
                      <p className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase font-mono">{selectedStudent.studentId}</p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="w-full grid grid-cols-2 gap-y-1.5 gap-x-2 text-left text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Class</span>
                        <span className="font-bold text-slate-700 truncate block">
                          {classes.find(c => c.id === selectedStudent.classId)?.name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Section</span>
                        <span className="font-bold text-slate-700 block">
                          {selectedStudent.section}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Roll No.</span>
                        <span className="font-bold text-slate-700 block font-mono">
                          #{selectedStudent.rollNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Contact</span>
                        <span className="font-bold text-slate-700 block truncate font-mono">
                          {selectedStudent.contactNumber}
                        </span>
                      </div>
                    </div>

                    {/* Barcode vector asset */}
                    <div className="w-[180px] h-[44px] flex items-center justify-center text-slate-800 mt-3 overflow-hidden">
                      <div 
                        dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(selectedStudent.studentId) }} 
                        className="w-full h-full"
                      />
                    </div>

                    {/* QR Code vector overlayed floating at the bottom right inside print badge, or kept separately */}
                    <div className="absolute bottom-3 right-3 w-12 h-12 border border-slate-200 rounded-lg p-0.5 bg-white shadow-sm overflow-hidden">
                      <div 
                        dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(selectedStudent.studentId) }} 
                        className="w-full h-full text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Action */}
              <div className="flex gap-2 w-full mt-1">
                <button
                  onClick={() => { setIsCardModalOpen(false); setSelectedStudent(null); }}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-sans font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintBadge}
                  className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer size={12} />
                  <span>Print Badge</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
