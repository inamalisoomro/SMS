/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Edit,
  Trash2,
  Receipt,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Eye,
  CreditCard,
  X
} from 'lucide-react';
import { FeeCategory, FeeCharge, Payment, Student, AppSettings } from '../types';

interface FeesViewProps {
  feeCategories: FeeCategory[];
  feeCharges: FeeCharge[];
  payments: Payment[];
  students: Student[];
  settings: AppSettings;
  onAddFeeCategory: (category: Omit<FeeCategory, 'id'>) => Promise<void>;
  onUpdateFeeCategory: (category: FeeCategory) => Promise<void>;
  onDeleteFeeCategory: (id: string) => Promise<void>;
  onAddFeeCharge: (charge: Omit<FeeCharge, 'id'>) => Promise<void>;
  onUpdateFeeCharge: (charge: FeeCharge) => Promise<void>;
  onDeleteFeeCharge: (id: string) => Promise<void>;
  onRecordPayment: (payment: Omit<Payment, 'id' | 'receiptNumber'>) => Promise<string>;
  onVoidPayment: (paymentId: string, reason: string) => Promise<void>;
  onSendFeeReminder: (studentId: string, feeChargeIds: string[]) => Promise<void>;
  onNavigate?: (tab: string) => void;
  onViewReceipt?: (paymentId: string) => void;
  calculateFeeBalance: (feeChargeId: string) => { netCharge: number; totalPaid: number; balance: number };
}

export default function FeesView({
  feeCategories,
  feeCharges,
  payments,
  students,
  settings,
  onAddFeeCategory,
  onUpdateFeeCategory,
  onDeleteFeeCategory,
  onAddFeeCharge,
  onUpdateFeeCharge,
  onDeleteFeeCharge,
  onRecordPayment,
  onVoidPayment,
  onSendFeeReminder,
  onNavigate,
  onViewReceipt,
  calculateFeeBalance
}: FeesViewProps) {
  // View states
  const [activeView, setActiveView] = useState<'overview' | 'categories' | 'charges' | 'payments'>('overview');
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue'>('all');
  const [filterStudent, setFilterStudent] = useState<string>('');
  
  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [editingCharge, setEditingCharge] = useState<FeeCharge | null>(null);
  const [selectedFeeCharge, setSelectedFeeCharge] = useState<FeeCharge | null>(null);
  
  // Form states - Category
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  
  // Form states - Charge
  const [chargeStudentId, setChargeStudentId] = useState('');
  const [chargeCategoryId, setChargeCategoryId] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDiscount, setChargeDiscount] = useState('0');
  const [chargeFeePeriod, setChargeFeePeriod] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState('');
  const [chargeRemarks, setChargeRemarks] = useState('');
  
  // Form states - Payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'bank_transfer' | 'online' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const currency = settings.currency || '$';

  // Calculate statistics
  const statistics = useMemo(() => {
    let totalOutstanding = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    const studentsWithDues = new Set<string>();
    let overdueCount = 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    feeCharges.forEach(charge => {
      const { balance } = calculateFeeBalance(charge.id);
      totalOutstanding += balance;
      
      if (balance > 0) {
        studentsWithDues.add(charge.studentId);
        
        if (charge.dueDate < today) {
          totalOverdue += balance;
          overdueCount++;
        }
      }
    });
    
    payments.filter(p => !p.isVoided).forEach(payment => {
      totalPaid += payment.amount;
    });
    
    const thisMonth = new Date().toISOString().slice(0, 7);
    const paymentsThisMonth = payments.filter(p => 
      !p.isVoided && p.paymentDate.startsWith(thisMonth)
    ).reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalOutstanding,
      totalPaid,
      totalOverdue,
      studentsWithDues: studentsWithDues.size,
      paymentsThisMonth,
      overdueCount
    };
  }, [feeCharges, payments, calculateFeeBalance]);

  // Filtered charges
  const filteredCharges = useMemo(() => {
    return feeCharges.filter(charge => {
      // Status filter
      if (filterStatus !== 'all' && charge.status !== filterStatus) return false;
      
      // Student filter
      if (filterStudent && charge.studentId !== filterStudent) return false;
      
      // Search filter
      if (searchQuery) {
        const student = students.find(s => s.id === charge.studentId);
        const searchLower = searchQuery.toLowerCase();
        const matchStudent = student?.name.toLowerCase().includes(searchLower) || 
                           student?.studentId.toLowerCase().includes(searchLower);
        const matchCategory = charge.categoryName.toLowerCase().includes(searchLower);
        const matchPeriod = charge.feePeriod.toLowerCase().includes(searchLower);
        
        if (!matchStudent && !matchCategory && !matchPeriod) return false;
      }
      
      return true;
    });
  }, [feeCharges, filterStatus, filterStudent, searchQuery, students]);

  // Handle category save
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    
    try {
      if (editingCategory) {
        await onUpdateFeeCategory({
          ...editingCategory,
          name: categoryName.trim(),
          description: categoryDescription.trim()
        });
      } else {
        await onAddFeeCategory({
          name: categoryName.trim(),
          description: categoryDescription.trim(),
          isActive: true,
          createdAt: Date.now()
        });
      }
      
      resetCategoryForm();
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
  };

  const handleEditCategory = (category: FeeCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setIsCategoryModalOpen(true);
  };

  // Handle charge save
  const handleSaveCharge = async () => {
    if (!chargeStudentId || !chargeCategoryId || !chargeAmount || !chargeDueDate) return;
    
    const amount = parseFloat(chargeAmount);
    const discount = parseFloat(chargeDiscount);
    
    if (isNaN(amount) || amount <= 0) return;
    if (isNaN(discount) || discount < 0 || discount > amount) return;
    
    try {
      const category = feeCategories.find(c => c.id === chargeCategoryId);
      if (!category) return;
      
      const today = new Date().toISOString().split('T')[0];
      const status: FeeCharge['status'] = chargeDueDate < today ? 'overdue' : 'unpaid';
      
      if (editingCharge) {
        await onUpdateFeeCharge({
          ...editingCharge,
          studentId: chargeStudentId,
          categoryId: chargeCategoryId,
          categoryName: category.name,
          amount,
          discount,
          feePeriod: chargeFeePeriod.trim(),
          dueDate: chargeDueDate,
          status,
          remarks: chargeRemarks.trim(),
          updatedAt: Date.now()
        });
      } else {
        await onAddFeeCharge({
          studentId: chargeStudentId,
          categoryId: chargeCategoryId,
          categoryName: category.name,
          academicYear: settings.academicYear,
          feePeriod: chargeFeePeriod.trim(),
          amount,
          discount,
          dueDate: chargeDueDate,
          status,
          remarks: chargeRemarks.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      resetChargeForm();
      setIsChargeModalOpen(false);
    } catch (error) {
      console.error('Error saving charge:', error);
    }
  };

  const resetChargeForm = () => {
    setChargeStudentId('');
    setChargeCategoryId('');
    setChargeAmount('');
    setChargeDiscount('0');
    setChargeFeePeriod('');
    setChargeDueDate('');
    setChargeRemarks('');
    setEditingCharge(null);
  };

  const handleEditCharge = (charge: FeeCharge) => {
    setEditingCharge(charge);
    setChargeStudentId(charge.studentId);
    setChargeCategoryId(charge.categoryId);
    setChargeAmount(charge.amount.toString());
    setChargeDiscount(charge.discount.toString());
    setChargeFeePeriod(charge.feePeriod);
    setChargeDueDate(charge.dueDate);
    setChargeRemarks(charge.remarks || '');
    setIsChargeModalOpen(true);
  };

  // Handle payment
  const handleRecordPayment = async () => {
    if (!selectedFeeCharge || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    const { balance } = calculateFeeBalance(selectedFeeCharge.id);
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    
    if (amount > balance) {
      if (!confirm(`Payment amount (${currency}${amount}) exceeds outstanding balance (${currency}${balance.toFixed(2)}). Continue?`)) {
        return;
      }
    }
    
    try {
      await onRecordPayment({
        feeChargeId: selectedFeeCharge.id,
        studentId: selectedFeeCharge.studentId,
        amount,
        paymentDate,
        paymentMethod,
        referenceNumber: paymentReference.trim(),
        notes: paymentNotes.trim(),
        createdAt: Date.now(),
        isVoided: false
      });
      
      resetPaymentForm();
      setIsPaymentModalOpen(false);
      setSelectedFeeCharge(null);
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setPaymentNotes('');
  };

  const openPaymentModal = (charge: FeeCharge) => {
    const { balance } = calculateFeeBalance(charge.id);
    setSelectedFeeCharge(charge);
    setPaymentAmount(balance.toFixed(2));
    setIsPaymentModalOpen(true);
  };

  // Get status badge
  const getStatusBadge = (status: FeeCharge['status']) => {
    const badges = {
      unpaid: { label: 'Unpaid', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      partially_paid: { label: 'Partial', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
      paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
      overdue: { label: 'Overdue', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' }
    };
    
    const badge = badges[status];
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
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
              Fee Management
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage fee structures, charges, payments, and student balances
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetCategoryForm();
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => {
              resetChargeForm();
              setIsChargeModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-all"
          >
            <Plus size={14} />
            <span>Add Fee Charge</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Outstanding Balance
              </span>
              <h3 className="font-sans font-bold text-2xl text-rose-600 dark:text-rose-400">
                {currency}{statistics.totalOutstanding.toFixed(2)}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">
                {statistics.studentsWithDues} students with dues
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
              <AlertCircle size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Total Collected
              </span>
              <h3 className="font-sans font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                {currency}{statistics.totalPaid.toFixed(2)}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">
                All time payments
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <CheckCircle size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-sans text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Overdue Amount
              </span>
              <h3 className="font-sans font-bold text-2xl text-amber-600 dark:text-amber-400">
                {currency}{statistics.totalOverdue.toFixed(2)}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 dark:text-slate-500">
                {statistics.overdueCount} overdue charges
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Clock size={20} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'categories', label: 'Categories' },
          { id: 'charges', label: 'Fee Charges' },
          { id: 'payments', label: 'Payments' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex-1 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeView === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      {activeView === 'charges' && (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.rollNumber})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden">
        {activeView === 'overview' && (
          <div className="p-6">
            <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">
              Fee Management Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg">
                <h4 className="font-sans font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                  Quick Actions
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>• Create fee categories for different types of charges</li>
                  <li>• Assign fees to students with due dates</li>
                  <li>• Record payments and generate receipts</li>
                  <li>• Track outstanding balances and overdue fees</li>
                  <li>• Send fee reminders to parents via email</li>
                </ul>
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg">
                <h4 className="font-sans font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                  This Month
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Payments Received:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currency}{statistics.paymentsThisMonth.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Active Categories:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {feeCategories.filter(c => c.isActive).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Total Charges:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {feeCharges.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'categories' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {feeCategories.map(category => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg border border-slate-200/40 dark:border-slate-800/40"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100">
                        {category.name}
                      </h4>
                      {category.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      category.isActive 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded transition-colors"
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${category.name}"?`)) {
                          onDeleteFeeCategory(category.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </motion.div>
              ))}
              
              {feeCategories.length === 0 && (
                <div className="col-span-full text-center py-10">
                  <DollarSign size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    No fee categories yet. Create one to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'charges' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/40 dark:border-slate-800/40">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredCharges.map(charge => {
                  const student = students.find(s => s.id === charge.studentId);
                  const { netCharge, totalPaid, balance } = calculateFeeBalance(charge.id);
                  
                  return (
                    <tr key={charge.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                        <div className="font-medium">{student?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-500">
                          {student?.rollNumber}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                        {charge.categoryName}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                        {charge.feePeriod}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono text-slate-700 dark:text-slate-300">
                        {currency}{netCharge.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {currency}{totalPaid.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {currency}{balance.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-slate-700 dark:text-slate-300">
                        {new Date(charge.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {getStatusBadge(charge.status)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {balance > 0 && (
                            <button
                              onClick={() => openPaymentModal(charge)}
                              className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditCharge(charge)}
                            className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Edit Charge"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete this fee charge?`)) {
                                onDeleteFeeCharge(charge.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors"
                            title="Delete Charge"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredCharges.length === 0 && (
              <div className="text-center py-10">
                <DollarSign size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-slate-400 dark:text-slate-500 text-xs">
                  {searchQuery || filterStatus !== 'all' || filterStudent 
                    ? 'No fee charges match your filters.' 
                    : 'No fee charges yet. Create one to get started.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeView === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/40 dark:border-slate-800/40">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {payments.slice(0, 50).map(payment => {
                  const student = students.find(s => s.id === payment.studentId);
                  
                  return (
                    <tr key={payment.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                      payment.isVoided ? 'opacity-50' : ''
                    }`}>
                      <td className="px-3 py-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {payment.receiptNumber}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                        {student?.name || 'Unknown'}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {currency}{payment.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 capitalize">
                        {payment.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-slate-700 dark:text-slate-300">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {payment.isVoided ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                            Voided
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {onViewReceipt && !payment.isVoided && (
                            <button
                              onClick={() => onViewReceipt(payment.id)}
                              className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                              title="View Receipt"
                            >
                              <Receipt size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {payments.length === 0 && (
              <div className="text-center py-10">
                <Receipt size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-slate-400 dark:text-slate-500 text-xs">
                  No payments recorded yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">
                  {editingCategory ? 'Edit Category' : 'Add Fee Category'}
                </h3>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    resetCategoryForm();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Tuition Fee, Transport Fee"
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Brief description of this fee category"
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    resetCategoryForm();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={!categoryName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Charge Modal */}
      <AnimatePresence>
        {isChargeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">
                  {editingCharge ? 'Edit Fee Charge' : 'Add Fee Charge'}
                </h3>
                <button
                  onClick={() => {
                    setIsChargeModalOpen(false);
                    resetChargeForm();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Student *
                  </label>
                  <select
                    value={chargeStudentId}
                    onChange={(e) => setChargeStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select Student</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.rollNumber})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Fee Category *
                  </label>
                  <select
                    value={chargeCategoryId}
                    onChange={(e) => setChargeCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {feeCategories.filter(c => c.isActive).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Discount ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={chargeDiscount}
                    onChange={(e) => setChargeDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Fee Period *
                  </label>
                  <input
                    type="text"
                    value={chargeFeePeriod}
                    onChange={(e) => setChargeFeePeriod(e.target.value)}
                    placeholder="e.g., Q1 2026, January 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={chargeDueDate}
                    onChange={(e) => setChargeDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={chargeRemarks}
                    onChange={(e) => setChargeRemarks(e.target.value)}
                    placeholder="Additional notes"
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsChargeModalOpen(false);
                    resetChargeForm();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCharge}
                  disabled={!chargeStudentId || !chargeCategoryId || !chargeAmount || !chargeDueDate}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  {editingCharge ? 'Update' : 'Create'} Charge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedFeeCharge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">
                  Record Payment
                </h3>
                <button
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    resetPaymentForm();
                    setSelectedFeeCharge(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Student:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {students.find(s => s.id === selectedFeeCharge.studentId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Fee:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedFeeCharge.categoryName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Outstanding:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {currency}{calculateFeeBalance(selectedFeeCharge.id).balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Payment Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Cheque #, Transaction ID, etc."
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Additional payment details"
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    resetPaymentForm();
                    setSelectedFeeCharge(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || !paymentDate}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Record Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
