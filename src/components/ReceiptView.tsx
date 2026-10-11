/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  Printer,
  Download,
  CheckCircle,
  Calendar,
  User,
  Hash,
  CreditCard,
  FileText,
  School,
  DollarSign
} from 'lucide-react';
import { Payment, FeeCharge, Student, AppSettings } from '../types';

interface ReceiptViewProps {
  payment: Payment;
  feeCharge: FeeCharge;
  student: Student;
  settings: AppSettings;
  onNavigate?: (tab: string) => void;
  calculateFeeBalance: (feeChargeId: string) => { netCharge: number; totalPaid: number; balance: number };
}

export default function ReceiptView({
  payment,
  feeCharge,
  student,
  settings,
  onNavigate,
  calculateFeeBalance
}: ReceiptViewProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const currency = settings.currency || '$';
  const { balance } = calculateFeeBalance(feeCharge.id);

  // Format date
  const formatDate = (dateStr: string | number) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle print
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Get payment method display name
  const getPaymentMethodLabel = (method: Payment['paymentMethod']) => {
    const labels: Record<Payment['paymentMethod'], string> = {
      cash: 'Cash',
      cheque: 'Cheque',
      bank_transfer: 'Bank Transfer',
      online: 'Online Payment',
      other: 'Other'
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header - Hide on print */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('fees')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Back to Fee Management"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
              Payment Receipt
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receipt #{payment.receiptNumber}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold shadow transition-all disabled:cursor-not-allowed"
        >
          <Printer size={16} />
          <span>{isPrinting ? 'Preparing...' : 'Print Receipt'}</span>
        </button>
      </div>

      {/* Receipt Container */}
      <div className="bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-800 print:border-slate-300 rounded-xl print:rounded-none shadow-lg print:shadow-none overflow-hidden">
        {/* School Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 print:from-indigo-600 print:to-purple-600 text-white print:text-white p-6 print:p-8 text-center border-b-4 border-emerald-400">
          <div className="flex items-center justify-center gap-3 mb-2">
            {settings.schoolLogoImage ? (
              <img 
                src={settings.schoolLogoImage} 
                alt="School Logo" 
                className="w-12 h-12 print:w-14 print:h-14 object-contain bg-white rounded-full p-1"
              />
            ) : (
              <div className="text-4xl print:text-5xl">{settings.schoolLogo}</div>
            )}
            <h1 className="font-sans font-bold text-2xl print:text-3xl tracking-tight">
              {settings.schoolName}
            </h1>
          </div>
          {settings.schoolAddress && (
            <p className="text-sm print:text-base text-indigo-100 print:text-indigo-100 mb-1">
              {settings.schoolAddress}
            </p>
          )}
          {settings.schoolPhone && (
            <p className="text-sm print:text-base text-indigo-100 print:text-indigo-100">
              {settings.schoolPhone}
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-indigo-400/30">
            <h2 className="font-sans font-bold text-xl print:text-2xl">
              FEE PAYMENT RECEIPT
            </h2>
            <p className="text-sm print:text-base text-indigo-100 print:text-indigo-100 mt-1">
              Academic Year: {settings.academicYear}
            </p>
          </div>
        </div>

        {/* Receipt Status Badge */}
        <div className="p-4 print:p-6 bg-emerald-50 dark:bg-emerald-950/20 print:bg-emerald-50 border-b border-emerald-200 dark:border-emerald-800 print:border-emerald-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {payment.isVoided ? (
              <>
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-sans font-bold text-base print:text-lg text-rose-700 dark:text-rose-400 print:text-rose-700 uppercase tracking-wide">
                  VOIDED RECEIPT
                </span>
              </>
            ) : (
              <>
                <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 print:text-emerald-600" />
                <span className="font-sans font-bold text-base print:text-lg text-emerald-700 dark:text-emerald-400 print:text-emerald-700 uppercase tracking-wide">
                  PAYMENT RECEIVED
                </span>
              </>
            )}
          </div>
          <p className="text-xs print:text-sm text-emerald-700 dark:text-emerald-300 print:text-emerald-700">
            Receipt Number: <span className="font-mono font-bold">{payment.receiptNumber}</span>
          </p>
        </div>

        {/* Receipt Details */}
        <div className="p-6 print:p-8">
          {/* Student Information */}
          <div className="mb-6 print:mb-8">
            <h3 className="font-sans font-bold text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3 print:mb-4 flex items-center gap-2">
              <User size={16} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/30 print:bg-indigo-100 rounded-lg">
                  <User size={16} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                    Student Name
                  </p>
                  <p className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                    {student.name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 print:bg-emerald-100 rounded-lg">
                  <Hash size={16} className="text-emerald-600 dark:text-emerald-400 print:text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                    Student ID / Roll Number
                  </p>
                  <p className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 font-mono mt-0.5">
                    {student.studentId} / {student.rollNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-950/30 print:bg-cyan-100 rounded-lg">
                  <School size={16} className="text-cyan-600 dark:text-cyan-400 print:text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                    Class
                  </p>
                  <p className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                    {student.section ? `${student.classId} - ${student.section}` : student.classId}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/30 print:bg-amber-100 rounded-lg">
                  <Calendar size={16} className="text-amber-600 dark:text-amber-400 print:text-amber-600" />
                </div>
                <div>
                  <p className="text-xs print:text-sm font-semibold text-slate-500 dark:text-slate-400 print:text-slate-500 uppercase tracking-wide">
                    Receipt Date
                  </p>
                  <p className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 mt-0.5">
                    {formatDate(payment.paymentDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Details */}
          <div className="mb-6 print:mb-8">
            <h3 className="font-sans font-bold text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3 print:mb-4 flex items-center gap-2">
              <FileText size={16} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
              Fee Details
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950/30 print:bg-slate-50 rounded-lg p-4 print:p-5 border border-slate-200 dark:border-slate-800 print:border-slate-200">
              <div className="space-y-2 print:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                    Fee Category:
                  </span>
                  <span className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                    {feeCharge.categoryName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                    Fee Period:
                  </span>
                  <span className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                    {feeCharge.feePeriod}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                    Original Amount:
                  </span>
                  <span className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                    {currency}{feeCharge.amount.toFixed(2)}
                  </span>
                </div>
                {feeCharge.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                      Discount Applied:
                    </span>
                    <span className="text-sm print:text-base font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-600">
                      -{currency}{feeCharge.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 print:pt-3 border-t border-slate-300 dark:border-slate-700 print:border-slate-300">
                  <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-bold uppercase">
                    Net Charge:
                  </span>
                  <span className="text-base print:text-lg font-bold text-indigo-600 dark:text-indigo-400 print:text-indigo-600">
                    {currency}{(feeCharge.amount - feeCharge.discount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-6 print:mb-8">
            <h3 className="font-sans font-bold text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3 print:mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
              Payment Information
            </h3>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 print:bg-emerald-50 rounded-lg p-4 print:p-5 border border-emerald-200 dark:border-emerald-800 print:border-emerald-200">
              <div className="space-y-2 print:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                    Payment Method:
                  </span>
                  <span className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </span>
                </div>
                {payment.referenceNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                      Reference Number:
                    </span>
                    <span className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800 font-mono">
                      {payment.referenceNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                    Payment Date:
                  </span>
                  <span className="text-sm print:text-base font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
                    {formatDate(payment.paymentDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 print:pt-3 border-t border-emerald-300 dark:border-emerald-700 print:border-emerald-300">
                  <span className="text-sm print:text-base text-emerald-700 dark:text-emerald-300 print:text-emerald-700 font-bold uppercase">
                    Amount Paid:
                  </span>
                  <span className="text-xl print:text-2xl font-bold text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                    {currency}{payment.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Information */}
          <div className="mb-6 print:mb-8">
            <h3 className="font-sans font-bold text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3 print:mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
              Outstanding Balance
            </h3>
            <div className={`rounded-lg p-4 print:p-5 border ${
              balance > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20 print:bg-amber-50 border-amber-200 dark:border-amber-800 print:border-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/20 print:bg-emerald-50 border-emerald-200 dark:border-emerald-800 print:border-emerald-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm print:text-base font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 print:text-slate-700">
                  Remaining Balance:
                </span>
                <span className={`text-2xl print:text-3xl font-bold ${
                  balance > 0 
                    ? 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                    : 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                }`}>
                  {currency}{balance.toFixed(2)}
                </span>
              </div>
              {balance === 0 && (
                <p className="text-xs print:text-sm text-emerald-700 dark:text-emerald-300 print:text-emerald-700 mt-2 text-center font-semibold">
                  ✓ FULLY PAID - No outstanding balance
                </p>
              )}
              {balance > 0 && (
                <p className="text-xs print:text-sm text-amber-700 dark:text-amber-300 print:text-amber-700 mt-2 text-center font-semibold">
                  Please settle the remaining balance by {formatDate(feeCharge.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Payment Notes */}
          {payment.notes && (
            <div className="mb-6 print:mb-8">
              <h3 className="font-sans font-bold text-sm print:text-base text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3 print:mb-4">
                Additional Notes
              </h3>
              <div className="bg-slate-50 dark:bg-slate-950/30 print:bg-slate-50 rounded-lg p-4 print:p-5 border border-slate-200 dark:border-slate-800 print:border-slate-200">
                <p className="text-xs print:text-sm text-slate-700 dark:text-slate-300 print:text-slate-700 leading-relaxed">
                  {payment.notes}
                </p>
              </div>
            </div>
          )}

          {/* Void Information */}
          {payment.isVoided && (
            <div className="mb-6 print:mb-8 bg-rose-50 dark:bg-rose-950/20 print:bg-rose-50 border border-rose-200 dark:border-rose-800 print:border-rose-200 rounded-lg p-4 print:p-5">
              <h3 className="font-sans font-bold text-sm print:text-base text-rose-700 dark:text-rose-400 print:text-rose-700 uppercase tracking-wider mb-2">
                ⚠ Voided Receipt
              </h3>
              <p className="text-xs print:text-sm text-rose-600 dark:text-rose-300 print:text-rose-600 mb-2">
                This receipt has been voided and is no longer valid.
              </p>
              {payment.voidedAt && (
                <p className="text-xs print:text-sm text-rose-600 dark:text-rose-300 print:text-rose-600">
                  Voided on: {formatDate(payment.voidedAt)}
                </p>
              )}
              {payment.voidReason && (
                <p className="text-xs print:text-sm text-rose-600 dark:text-rose-300 print:text-rose-600 mt-1">
                  Reason: {payment.voidReason}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 print:p-8 bg-slate-100 dark:bg-slate-950/50 print:bg-slate-100 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
          <div className="text-center mb-4">
            <p className="text-xs print:text-sm text-slate-600 dark:text-slate-400 print:text-slate-600 font-semibold mb-2">
              Important Information
            </p>
            <p className="text-xs print:text-sm text-slate-500 dark:text-slate-400 print:text-slate-500">
              • This is an official receipt generated by {settings.schoolName}
            </p>
            <p className="text-xs print:text-sm text-slate-500 dark:text-slate-400 print:text-slate-500">
              • Please retain this receipt for your records
            </p>
            <p className="text-xs print:text-sm text-slate-500 dark:text-slate-400 print:text-slate-500">
              • For any queries, please contact the school administration
            </p>
          </div>
          <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
            <p className="text-xs print:text-sm text-slate-500 dark:text-slate-400 print:text-slate-500">
              Generated on {formatDate(Date.now())} by {settings.schoolName} Fee Management System
            </p>
            {!payment.isVoided && (
              <p className="text-xs print:text-sm text-slate-400 dark:text-slate-500 print:text-slate-500 mt-1">
                Receipt #{payment.receiptNumber} | Valid Official Document
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:text-white {
            color: white !important;
          }
          
          .print\\:border-slate-300 {
            border-color: #cbd5e1 !important;
          }
          
          .print\\:from-indigo-600 {
            --tw-gradient-from: #4f46e5 !important;
          }
          
          .print\\:to-purple-600 {
            --tw-gradient-to: #9333ea !important;
          }
        }
      `}</style>
    </div>
  );
}
