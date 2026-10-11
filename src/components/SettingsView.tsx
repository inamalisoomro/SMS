/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Trash2, 
  Database, 
  Upload, 
  Download, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  Image as ImageIcon,
  X,
  Mail,
  Copy,
  ArrowLeft,
  Lock,
  FileJson,
  Eye,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  GitMerge,
  Replace
} from 'lucide-react';
import { AppSettings, User, RestoreResult, ValidationResult } from '../types';
import { validateImageFile, resizeAndEncodeImage, validateBackup, previewBackup } from '../utils';
import { hasPermission } from '../permissions';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onExportDatabase: (includeAppSettings: boolean) => Promise<void>;
  onImportDatabase: (file: File, restoreAppSettings: boolean, createRecoveryBackup: boolean) => Promise<RestoreResult>;
  onMergeBackup: (file: File, mergeAppSettings: boolean) => Promise<RestoreResult>;
  onResetDatabase: () => Promise<void>;
  onNavigate?: (tab: string) => void;
  currentUser: User | null;
}

export default function SettingsView({
  settings,
  onSaveSettings,
  onExportDatabase,
  onImportDatabase,
  onMergeBackup,
  onResetDatabase,
  onNavigate,
  currentUser
}: SettingsViewProps) {
  // Permission checks
  const canManageSettings = currentUser ? hasPermission(currentUser, 'manage_settings') : false;
  const canBackupRestore = currentUser ? hasPermission(currentUser, 'backup_restore') : false;
  const canViewSettings = currentUser ? hasPermission(currentUser, 'view_settings') : false;

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [schoolLogo, setSchoolLogo] = useState(settings.schoolLogo);
  const [schoolLogoImage, setSchoolLogoImage] = useState(settings.schoolLogoImage || '');
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [schoolAddress, setSchoolAddress] = useState(settings.schoolAddress || '100 Campus Parkway, Education District');
  const [schoolPhone, setSchoolPhone] = useState(settings.schoolPhone || '+1 (555) 019-2834');
  const [activeTheme, setActiveTheme] = useState(settings.theme);
  const [currency, setCurrency] = useState(settings.currency || '$');

  // EmailJS Configuration
  const [emailJsServiceId, setEmailJsServiceId] = useState(settings.emailJsServiceId || '');
  const [emailJsTemplateId, setEmailJsTemplateId] = useState(settings.emailJsTemplateId || '');
  const [emailJsPublicKey, setEmailJsPublicKey] = useState(settings.emailJsPublicKey || '');
  const [emailConfigSaved, setEmailConfigSaved] = useState(false);

  // Form submit status
  const [isSaved, setIsSaved] = useState(false);

  // Logo upload states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');

  // Reset verification
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Backup/Restore workflow states
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [backupValidation, setBackupValidation] = useState<ValidationResult | null>(null);
  const [backupPreview, setBackupPreview] = useState<any>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [includeSettings, setIncludeSettings] = useState(false);
  const [createRecoveryBackup, setCreateRecoveryBackup] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Refs
  const importFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Logo emojis palette
  const logoPalette = ['🎓', '🏫', '🏛️', '🌟', '📚', '⚡', '🦁', '🦅', '🎯', '💡'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return; // Extra safety check

    await onSaveSettings({
      schoolName: schoolName.trim(),
      schoolLogo,
      schoolLogoImage,
      academicYear,
      schoolAddress: schoolAddress.trim(),
      schoolPhone: schoolPhone.trim(),
      theme: activeTheme,
      currency: currency.trim() || '$'
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleEmailConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return; // Extra safety check
    
    // Validate all three fields are present
    const serviceId = emailJsServiceId.trim();
    const templateId = emailJsTemplateId.trim();
    const publicKey = emailJsPublicKey.trim();

    if (!serviceId || !templateId || !publicKey) {
      // Show error - use the parent's toast system via a custom event or callback
      // For now, we'll just prevent submission
      alert('Please fill in all EmailJS configuration fields (Service ID, Template ID, and Public Key)');
      return;
    }

    await onSaveSettings({
      emailJsServiceId: serviceId,
      emailJsTemplateId: templateId,
      emailJsPublicKey: publicKey
    });

    setEmailConfigSaved(true);
    setTimeout(() => setEmailConfigSaved(false), 3000);
  };

  const handleCopyExampleConfig = async () => {
    const exampleConfig = {
      serviceId: "service_example123",
      templateId: "template_example456",
      publicKey: "public_key_example789"
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(exampleConfig, null, 2));
      // Show success feedback
      alert('Example configuration copied to clipboard!');
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploadError('');
    setIsUploadingLogo(true);

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setLogoUploadError(validation.error || 'Invalid file');
        setIsUploadingLogo(false);
        return;
      }

      // Resize and encode
      const base64Image = await resizeAndEncodeImage(file, 512);
      setSchoolLogoImage(base64Image);
      setLogoUploadError('');
    } catch (error) {
      console.error('Logo upload error:', error);
      setLogoUploadError('Failed to process image. Please try another file.');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileRef.current) {
        logoFileRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setSchoolLogoImage('');
    setLogoUploadError('');
  };

  // New backup workflow handlers
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedBackupFile(file);
    
    // Read and validate file
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const validation = validateBackup(content);
      setBackupValidation(validation);

      const preview = previewBackup(content);
      setBackupPreview(preview);

      setShowBackupModal(true);
    };
    reader.readAsText(file);

    // Reset file input
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  const handleExportWithOptions = async (includeAppSettings: boolean) => {
    await onExportDatabase(includeAppSettings);
    setShowExportOptions(false);
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackupFile || !backupValidation?.isValid) return;

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      let result: RestoreResult;
      
      if (restoreMode === 'replace') {
        result = await onImportDatabase(selectedBackupFile, includeSettings, createRecoveryBackup);
      } else {
        result = await onMergeBackup(selectedBackupFile, includeSettings);
      }

      setRestoreResult(result);
      
      if (result.success) {
        // Close modal after a brief delay to show success
        setTimeout(() => {
          handleCloseBackupModal();
        }, 3000);
      }
    } catch (err) {
      setRestoreResult({
        success: false,
        mode: restoreMode,
        recordsRestored: 0,
        errors: ['Unexpected error during restore operation.'],
        warnings: [],
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCloseBackupModal = () => {
    setShowBackupModal(false);
    setSelectedBackupFile(null);
    setBackupValidation(null);
    setBackupPreview(null);
    setRestoreResult(null);
    setRestoreMode('replace');
    setIncludeSettings(false);
    setCreateRecoveryBackup(true);
  };

  const handleResetExecute = async () => {
    setIsResetting(true);
    await onResetDatabase();
    setIsResetting(false);
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
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
            System Settings & Control Panel
          </h2>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize school brand tags, configure operational interface preferences, and run administrative database tasks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        {/* BRANDING FORM */}
        <div className="md:col-span-7 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Settings size={14} />
            </div>
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">School Profile & Aesthetics</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* School Name */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Institution Name *</label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. SAMS Academy"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
              />
            </div>

            {/* Academic Session */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Academic Term Year *</label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans font-mono"
              />
            </div>

            {/* Currency Symbol */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Currency Symbol (Fee Management)</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g. $, €, £, ₹, ¥"
                maxLength={5}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
              />
              <p className="text-[8px] text-slate-400 mt-1">Used for displaying fee amounts, payments, and receipts</p>
            </div>

            {/* School Address & Contact for ID Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Campus Address (ID Card Footer)</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="e.g. 100 Campus Parkway"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">Institution Phone Number</label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-sans"
                />
              </div>
            </div>

            {/* Logo Emoji Palette */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">School Logo / Icon</label>
              
              {/* Custom Logo Upload Section */}
              <div className="mb-3 p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={14} className="text-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Custom Logo Upload</span>
                </div>
                
                {schoolLogoImage ? (
                  // Logo Preview
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-lg border-2 border-indigo-500/30 bg-white dark:bg-slate-900 p-1 flex items-center justify-center overflow-hidden">
                      <img 
                        src={schoolLogoImage} 
                        alt="School Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">✓ Custom logo uploaded</p>
                      <p className="text-[8px] text-slate-400 mb-2">This logo will appear in sidebar, favicon, certificates & ID cards</p>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                      >
                        <X size={10} /> Remove Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  // Upload Button
                  <div>
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingLogo ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span className="text-xs font-semibold">Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span className="text-xs font-semibold">Upload School Logo</span>
                        </>
                      )}
                    </button>
                    <p className="text-[8px] text-slate-400 mt-1 text-center">PNG, JPG, GIF, WEBP, SVG • Max 5MB • Recommended: 512x512px</p>
                  </div>
                )}
                
                {logoUploadError && (
                  <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded text-[9px] text-rose-600 dark:text-rose-400 flex items-start gap-1">
                    <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                    <span>{logoUploadError}</span>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={logoFileRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                />
              </div>

              {/* Emoji Fallback Option */}
              <div className="mb-1">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-mono">Or use emoji fallback:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                {logoPalette.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSchoolLogo(emoji)}
                    className={`text-lg p-1.5 rounded-lg border transition-all ${
                      schoolLogo === emoji 
                        ? 'border-indigo-600 bg-indigo-500/10 scale-105 shadow-sm' 
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Toggle */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">User Interface Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTheme('light')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeTheme === 'light'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 font-bold'
                      : 'border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Sun size={12} /> Light Theme
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTheme('dark')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeTheme === 'dark'
                      ? 'border-indigo-500 bg-indigo-950/20 text-indigo-400 font-bold'
                      : 'border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:bg-slate-900/50'
                  }`}
                >
                  <Moon size={12} /> Dark Theme
                </button>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-1">
              {canManageSettings ? (
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-sans font-bold text-xs shadow transition-all flex items-center justify-center gap-1"
                >
                  {isSaved ? <Check size={12} /> : null}
                  <span>{isSaved ? 'Settings Saved Successfully' : 'Apply Settings Changes'}</span>
                </button>
              ) : (
                <div className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg font-sans font-bold text-xs flex items-center justify-center gap-1.5">
                  <Lock size={12} />
                  <span>Read-only Access (Principal Only)</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* EMAIL CONFIGURATION FORM */}
        <div className="md:col-span-12 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Mail size={14} />
            </div>
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">School Management System — Email Settings</h3>
          </div>

          {!emailJsServiceId && !emailJsTemplateId && !emailJsPublicKey && (
            <div className="mb-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>EmailJS is not configured.</strong> Enter your Service ID, Template ID, and Public Key to enable email notifications for parents.
              </p>
            </div>
          )}

          <form onSubmit={handleEmailConfigSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Service ID */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">
                  Service ID *
                </label>
                <input
                  type="text"
                  value={emailJsServiceId}
                  onChange={(e) => setEmailJsServiceId(e.target.value)}
                  placeholder="Enter your EmailJS Service ID"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 font-mono"
                />
              </div>

              {/* Template ID */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">
                  Template ID *
                </label>
                <input
                  type="text"
                  value={emailJsTemplateId}
                  onChange={(e) => setEmailJsTemplateId(e.target.value)}
                  placeholder="Enter your EmailJS Template ID"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 font-mono"
                />
              </div>

              {/* Public Key */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase font-mono tracking-wider">
                  Public Key *
                </label>
                <input
                  type="text"
                  value={emailJsPublicKey}
                  onChange={(e) => setEmailJsPublicKey(e.target.value)}
                  placeholder="Enter your EmailJS Public Key"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-sans font-bold text-xs shadow transition-all flex items-center justify-center gap-1"
              >
                {emailConfigSaved ? <Check size={12} /> : null}
                <span>{emailConfigSaved ? 'Email Settings Saved' : 'Save Email Configuration'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyExampleConfig}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-sans font-semibold text-xs transition-all flex items-center gap-1.5"
              >
                <Copy size={12} />
                <span>Copy example configuration</span>
              </button>
            </div>

            {/* Info Text */}
            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Sign up for free at <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">emailjs.com</a> to get your credentials. Free tier includes 200 emails/month.
            </p>
          </form>
        </div>

        {/* DATABASE PANEL */}
        <div className="md:col-span-5 space-y-3.5">
          
          {/* Backups Card */}
          <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                <Database size={14} />
              </div>
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Backup & Restore</h3>
            </div>
            
            <p className="text-slate-400 dark:text-slate-500 text-[10px] leading-relaxed mb-3">
              Export all 20 database stores to JSON with validation, preview, and safe restore modes. <strong className="text-amber-500">Store backups securely</strong> - they may contain sensitive data.
            </p>

            <div className="space-y-1.5">
              {/* Export with Options */}
              {canBackupRestore ? (
                showExportOptions ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Export Options</span>
                      <button
                        onClick={() => setShowExportOptions(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleExportWithOptions(false)}
                        className="w-full flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/40 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors"
                      >
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">Database Only</span>
                        <ShieldAlert size={11} className="text-emerald-500" />
                      </button>
                      <button
                        onClick={() => handleExportWithOptions(true)}
                        className="w-full flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">Database + Settings</span>
                          <span className="text-[8px] text-amber-600 dark:text-amber-400">Includes EmailJS credentials</span>
                        </div>
                        <AlertTriangle size={11} className="text-amber-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowExportOptions(true)}
                    className="w-full flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Download size={13} className="text-slate-400" />
                      <span>Export Backup</span>
                    </div>
                    <span className="font-mono text-[8px] text-emerald-500 font-bold uppercase">v2.0</span>
                  </button>
                )
              ) : (
                <div className="w-full flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/20 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-2">
                    <Lock size={13} />
                    <span>Export Backup</span>
                  </div>
                  <span className="font-mono text-[8px] text-slate-400 font-bold uppercase">RESTRICTED</span>
                </div>
              )}

              {/* Import/Restore Trigger */}
              {canBackupRestore ? (
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="w-full flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Upload size={13} className="text-slate-400" />
                    <span>Import & Restore Backup</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Replace size={10} className="text-blue-500" />
                    <GitMerge size={10} className="text-purple-500" />
                  </div>
                </button>
              ) : (
                <div className="w-full flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/20 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-2">
                    <Lock size={13} />
                    <span>Import & Restore Backup</span>
                  </div>
                  <span className="font-mono text-[8px] text-slate-400 font-bold uppercase">RESTRICTED</span>
                </div>
              )}
              <input
                type="file"
                ref={importFileRef}
                onChange={handleImportFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Destructive Administration */}
          <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
                <Trash2 size={14} />
              </div>
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xs">Destructive Actions</h3>
            </div>

            <p className="text-slate-400 dark:text-slate-500 text-[10px] leading-relaxed mb-3">
              Perform structural purges of student rosters, catalogs, and logs. This process is irreversible!
            </p>

            {canBackupRestore ? (
              isResetConfirmOpen ? (
                <div className="p-2.5 bg-rose-500/5 border border-rose-500/15 rounded-lg space-y-2.5">
                  <div className="flex items-start gap-1.5 text-[10px] text-rose-600 dark:text-rose-400 leading-relaxed">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <strong>CRITICAL PREVIEW WARNING:</strong> This action will erase all IndexedDB tables. Ensure backups are saved before continuing!
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsResetConfirmOpen(false)}
                      className="flex-1 py-1 text-[9px] font-semibold border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetExecute}
                      disabled={isResetting}
                      className="flex-1 py-1 text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-md flex items-center justify-center gap-1"
                    >
                      {isResetting ? <RefreshCw size={9} className="animate-spin" /> : null}
                      <span>CONFIRM PURGE</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full py-1.5 border border-rose-500/20 bg-rose-500/5 text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all text-xs font-bold"
                >
                Reset System Database
              </button>
              )
            ) : (
              <div className="w-full py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/20 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                <Lock size={12} />
                <span>Reset Restricted (Principal Only)</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Backup Preview & Restore Modal */}
      <AnimatePresence>
        {showBackupModal && backupValidation && backupPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseBackupModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <FileJson size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Backup Preview & Restore</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedBackupFile?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseBackupModal}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Validation Status */}
                <div className={`p-4 rounded-xl border-2 ${
                  backupValidation.isValid
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {backupValidation.isValid ? (
                      <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-sm mb-1">
                        {backupValidation.isValid ? 'Validation Passed' : 'Validation Failed'}
                      </h3>
                      <div className="text-xs space-y-1">
                        <p>Format: <strong>{backupValidation.detectedFormatVersion}</strong> {backupValidation.isLegacyFormat && '(Legacy)'}</p>
                        <p>
                          Issues: <span className="text-rose-600 dark:text-rose-400 font-semibold">{backupValidation.errorCount} errors</span>, 
                          <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">{backupValidation.warningCount} warnings</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validation Issues */}
                  {backupValidation.issues.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current/10 space-y-1 max-h-32 overflow-y-auto">
                      {backupValidation.issues.slice(0, 10).map((issue, idx) => (
                        <div key={idx} className="text-[10px] flex items-start gap-1.5">
                          <span className={`font-bold ${
                            issue.severity === 'error' ? 'text-rose-600' :
                            issue.severity === 'warning' ? 'text-amber-600' :
                            'text-blue-600'
                          }`}>
                            [{issue.severity.toUpperCase()}]
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">{issue.message}</span>
                        </div>
                      ))}
                      {backupValidation.issues.length > 10 && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          +{backupValidation.issues.length - 10} more issues...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Backup Metadata */}
                {backupPreview.backupDate && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-100">Backup Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Created:</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {backupPreview.backupDate.toLocaleString()}
                        </p>
                      </div>
                      {backupPreview.dbSchemaVersion && (
                        <div>
                          <span className="text-slate-500">DB Version:</span>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {backupPreview.dbSchemaVersion}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Includes Settings:</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {backupPreview.includesAppSettings ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Record Counts */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm mb-3 text-slate-800 dark:text-slate-100">Record Counts</h3>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {Object.entries(backupPreview.recordCounts).map(([store, count]) => (
                      typeof count === 'number' && count > 0 && (
                        <div key={store} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-400 capitalize">{store}:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{count}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Restore Result (if available) */}
                {restoreResult && (
                  <div className={`p-4 rounded-xl border-2 ${
                    restoreResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      {restoreResult.success ? (
                        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-2">
                          {restoreResult.success ? 'Restore Successful!' : 'Restore Failed'}
                        </h3>
                        <p className="text-xs mb-2">
                          Mode: <strong className="capitalize">{restoreResult.mode}</strong> • 
                          Records: <strong>{restoreResult.recordsRestored}</strong>
                        </p>
                        
                        {restoreResult.mergeResult && (
                          <div className="text-xs space-y-1 mb-2">
                            <p>Inserted: <strong className="text-emerald-600">{restoreResult.mergeResult.inserted}</strong></p>
                            <p>Updated: <strong className="text-blue-600">{restoreResult.mergeResult.updated}</strong></p>
                            {restoreResult.mergeResult.conflicts.length > 0 && (
                              <p>Conflicts: <strong className="text-amber-600">{restoreResult.mergeResult.conflicts.length}</strong></p>
                            )}
                          </div>
                        )}

                        {restoreResult.errors.length > 0 && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 space-y-0.5">
                            {restoreResult.errors.map((err, idx) => (
                              <p key={idx}>• {err}</p>
                            ))}
                          </div>
                        )}

                        {restoreResult.warnings.length > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 space-y-0.5 mt-2">
                            {restoreResult.warnings.map((warn, idx) => (
                              <p key={idx}>• {warn}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Restore Options (only show if validation passed and not yet restored) */}
                {backupValidation.isValid && !restoreResult && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-bold text-sm mb-3 text-slate-800 dark:text-slate-100">Restore Mode</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setRestoreMode('replace')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            restoreMode === 'replace'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Replace size={16} className="text-blue-500" />
                            <span className="text-xs font-bold">Replace</span>
                          </div>
                          <p className="text-[9px] text-slate-600 dark:text-slate-400">
                            Clear DB and restore all records
                          </p>
                        </button>
                        <button
                          onClick={() => setRestoreMode('merge')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            restoreMode === 'merge'
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <GitMerge size={16} className="text-purple-500" />
                            <span className="text-xs font-bold">Merge</span>
                          </div>
                          <p className="text-[9px] text-slate-600 dark:text-slate-400">
                            Update existing, insert new
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h3 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-100">Options</h3>
                      
                      <label className="flex items-center gap-2 text-xs cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={includeSettings}
                          onChange={(e) => setIncludeSettings(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700"
                        />
                        <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                          Restore app settings {backupPreview.includesAppSettings && '(includes EmailJS)'}
                        </span>
                      </label>

                      {restoreMode === 'replace' && (
                        <label className="flex items-center gap-2 text-xs cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={createRecoveryBackup}
                            onChange={(e) => setCreateRecoveryBackup(e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700"
                          />
                          <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            Create recovery backup (recommended)
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={handleCloseBackupModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  {restoreResult?.success ? 'Close' : 'Cancel'}
                </button>

                {backupValidation.isValid && !restoreResult && (
                  <button
                    onClick={handleRestoreBackup}
                    disabled={isRestoring}
                    className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Restoring...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Restore Backup</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
