/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, X, User, Key, AlertCircle } from 'lucide-react';
import { Student } from '../types';

interface StudentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onLogin: (studentId: string) => void;
}

export default function StudentLoginModal({
  isOpen,
  onClose,
  students,
  onLogin
}: StudentLoginModalProps) {
  const [studentId, setStudentId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Find student by student ID and roll number
    const student = students.find(
      s => s.studentId === studentId.trim() && s.rollNumber === rollNumber.trim()
    );

    if (!student) {
      setError('Invalid Student ID or Roll Number');
      setIsLoading(false);
      return;
    }

    // Successful login
    onLogin(student.id);
    
    // Reset form
    setStudentId('');
    setRollNumber('');
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LogIn size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Student Login</h3>
                <p className="text-sm text-white/80">Enter your credentials</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          {/* Student ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Student ID
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g., ST-2026-001"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Roll Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Roll Number
            </label>
            <div className="relative">
              <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g., 25"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Login activity is recorded on this device for attendance tracking purposes.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              <LogIn size={16} />
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
