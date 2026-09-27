/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Student, AppSettings, Class } from '../types';
import { generateQRCodeDataURL } from '../utils';
import { 
  downloadSingleCardPNG, 
  downloadSingleCardPDF, 
  printSingleCard 
} from '../utils/idCardExport';
import { 
  Printer, 
  RefreshCw, 
  ShieldCheck, 
  Download, 
  FileText, 
  Droplet, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface StudentCardProps {
  student: Student;
  settings: AppSettings;
  studentClass?: Class;
  onReissueToken?: (studentId: string) => Promise<any>;
  onPrint?: () => void;
  interactive?: boolean;
}

export default function StudentCard({
  student,
  settings,
  studentClass,
  onReissueToken,
  interactive = true,
}: StudentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isReissuing, setIsReissuing] = useState(false);
  const [showReissueConfirm, setShowReissueConfirm] = useState(false);
  const [reissueSuccessMessage, setReissueSuccessMessage] = useState<string | null>(null);
  const [exportingState, setExportingState] = useState<'print' | 'png' | 'pdf' | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (student.qrToken) {
      generateQRCodeDataURL(student.qrToken).then((url) => {
        if (isMounted) setQrDataUrl(url);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [student.qrToken]);

  const handleConfirmReissue = async () => {
    if (!onReissueToken) return;
    try {
      setIsReissuing(true);
      await onReissueToken(student.id);
      setShowReissueConfirm(false);
      setReissueSuccessMessage('New QR code generated! The old physical card is now expired.');
      setTimeout(() => setReissueSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to reissue token:', err);
    } finally {
      setIsReissuing(false);
    }
  };

  const handlePrint = async () => {
    if (!cardRef.current) return;
    setExportingState('print');
    try {
      await printSingleCard(cardRef.current, student.name);
    } finally {
      setExportingState(null);
    }
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    setExportingState('png');
    try {
      await downloadSingleCardPNG(cardRef.current, student.name);
    } finally {
      setExportingState(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setExportingState('pdf');
    try {
      await downloadSingleCardPDF(cardRef.current, student);
    } finally {
      setExportingState(null);
    }
  };

  const classNameStr = studentClass ? `${studentClass.name} - Sec ${studentClass.section}` : `Section ${student.section}`;
  const schoolAddr = settings.schoolAddress || '100 Campus Parkway, Education District';
  const schoolPhone = settings.schoolPhone || '+1 (555) 019-2834';

  return (
    <div className="flex flex-col items-center w-full max-w-[480px]">
      {/* CR80 Standard Ratio Card Container (3.375" x 2.125" / ~1.588 ratio) */}
      <div
        ref={cardRef}
        id={`student-card-${student.id}`}
        className="student-cr80-card relative w-[460px] h-[288px] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl overflow-hidden border border-slate-700/60 font-sans flex flex-col justify-between select-none print:shadow-none print:border print:border-slate-400 print:w-[3.375in] print:h-[2.125in]"
        style={{
          aspectRatio: '1.588 / 1',
        }}
      >
        {/* Subtle decorative security background patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full border-4 border-indigo-400/40" />
          <div className="absolute -right-4 -top-4 w-36 h-36 rounded-full border border-indigo-400/30" />
          <div className="absolute left-1/3 -bottom-16 w-56 h-56 rounded-full border-2 border-indigo-400/20" />
          <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        {/* 1. Header Section */}
        <div className="relative z-10 px-4 py-2.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-slate-900/90 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg shadow-sm">
              {settings.schoolLogo || '🎓'}
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-white leading-tight font-sans">
                {settings.schoolName || 'SAMS ACADEMY'}
              </h4>
              <p className="text-[8px] font-mono uppercase tracking-widest text-indigo-200">
                Official Student Identity Pass
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/25 px-2 py-0.5 rounded border border-white/10">
            <ShieldCheck size={11} className="text-emerald-400" />
            <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-300 font-semibold">
              VERIFIED
            </span>
          </div>
        </div>

        {/* 2. Middle Content Section (Photo, Details, QR) */}
        <div className="relative z-10 px-4 py-2.5 flex-1 flex gap-3.5 items-center">
          {/* Student Photo / Avatar */}
          <div className="flex flex-col items-center">
            {student.photo ? (
              <img
                src={student.photo}
                alt={student.name}
                crossOrigin="anonymous"
                className="w-19 h-22 object-cover rounded-lg border-2 border-indigo-400/50 shadow-md bg-slate-800"
              />
            ) : (
              <div className="w-19 h-22 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 border-2 border-indigo-300/40 shadow-md flex flex-col items-center justify-center text-white">
                <span className="text-2xl font-black">{student.name.charAt(0)}</span>
                <span className="text-[8px] font-mono uppercase tracking-wider text-indigo-100/80 mt-1 font-semibold">
                  STUDENT
                </span>
              </div>
            )}

            {/* Blood group pill */}
            <div className="mt-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded text-[8px] font-mono text-rose-300 font-bold">
              <Droplet size={8} className="text-rose-400 fill-rose-400" />
              <span>{student.bloodGroup || 'O+'}</span>
            </div>
          </div>

          {/* Student Detailed Information */}
          <div className="flex-1 space-y-1">
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight leading-tight truncate max-w-[190px]">
                {student.name}
              </h3>
              <p className="font-mono text-[9px] font-semibold text-indigo-300 tracking-wider">
                ID: {student.studentId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] pt-0.5">
              <div>
                <span className="text-slate-400 text-[8px] block uppercase font-mono tracking-wider">Class & Sec</span>
                <span className="font-semibold text-slate-100 truncate block">{classNameStr}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[8px] block uppercase font-mono tracking-wider">Roll No.</span>
                <span className="font-mono font-bold text-amber-300">#{student.rollNumber}</span>
              </div>

              {student.fatherName && (
                <div className="col-span-2">
                  <span className="text-slate-400 text-[8px] block uppercase font-mono tracking-wider">Guardian</span>
                  <span className="font-medium text-slate-200 truncate block text-[8.5px]">{student.fatherName}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400 text-[8px] block uppercase font-mono tracking-wider">Contact</span>
                <span className="font-mono text-slate-200 text-[8px] block truncate">{student.contactNumber}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[8px] block uppercase font-mono tracking-wider">Expires</span>
                <span className="font-mono font-semibold text-indigo-300 text-[8px] block">
                  {student.cardValidUntil || '2027-06-30'}
                </span>
              </div>
            </div>
          </div>

          {/* Secure QR Code Section */}
          <div className="flex flex-col items-center justify-center pl-1 border-l border-slate-700/50">
            <div className="w-20 h-20 p-1 bg-white rounded-lg shadow-inner flex items-center justify-center overflow-hidden">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Secure QR Code" 
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
              )}
            </div>
            <span className="text-[7px] font-mono text-indigo-300 tracking-widest uppercase mt-1 font-bold">
              SCAN TO MARK
            </span>
          </div>
        </div>

        {/* 3. Footer Bar */}
        <div className="relative z-10 px-4 py-1.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[8px] text-slate-400 font-mono">
          <div className="truncate max-w-[260px]">
            <span>{schoolAddr}</span>
          </div>
          <div>
            <span>Tel: {schoolPhone}</span>
          </div>
        </div>
      </div>

      {/* Success Notification Message */}
      {reissueSuccessMessage && (
        <div className="w-full mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          <span className="font-medium text-[11px]">{reissueSuccessMessage}</span>
        </div>
      )}

      {/* Reissue Confirmation Banner (In-App Modal to avoid iframe window.confirm blocks) */}
      {showReissueConfirm && (
        <div className="w-full mt-3 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold">Reissue ID Pass for {student.name}?</p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                This will immediately generate a brand new cryptographically-hashed QR token. Any previously printed physical card will be permanently invalidated.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowReissueConfirm(false)}
              disabled={isReissuing}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReissue}
              disabled={isReissuing}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={12} className={isReissuing ? 'animate-spin' : ''} />
              <span>{isReissuing ? 'Invalidating & Reissuing...' : 'Yes, Reissue Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Controls outside the printed card */}
      {interactive && !showReissueConfirm && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full print:hidden">
          {/* Direct Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={exportingState !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            title="Send card to printer"
          >
            <Printer size={13} className={exportingState === 'print' ? 'animate-bounce' : ''} />
            <span>{exportingState === 'print' ? 'Preparing Print...' : 'Print Card'}</span>
          </button>

          {/* Download PNG Button */}
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={exportingState !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            title="Download high-resolution 300 DPI PNG"
          >
            <Download size={13} />
            <span>{exportingState === 'png' ? 'Generating...' : 'Save PNG'}</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={exportingState !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            title="Download standard CR80 PDF"
          >
            <FileText size={13} />
            <span>{exportingState === 'pdf' ? 'Creating PDF...' : 'CR80 PDF'}</span>
          </button>

          {/* Reissue Button */}
          {onReissueToken && (
            <button
              type="button"
              onClick={() => setShowReissueConfirm(true)}
              disabled={isReissuing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
              title="Regenerate QR token if physical card is lost or stolen"
            >
              <RefreshCw size={12} className={isReissuing ? 'animate-spin' : ''} />
              <span>Reissue Card (New QR)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
