/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
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
  Copy
} from 'lucide-react';
import { AppSettings } from '../types';
import { validateImageFile, resizeAndEncodeImage } from '../utils';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onExportDatabase: () => void;
  onImportDatabase: (file: File) => Promise<boolean>;
  onResetDatabase: () => Promise<void>;
}

export default function SettingsView({
  settings,
  onSaveSettings,
  onExportDatabase,
  onImportDatabase,
  onResetDatabase
}: SettingsViewProps) {
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [schoolLogo, setSchoolLogo] = useState(settings.schoolLogo);
  const [schoolLogoImage, setSchoolLogoImage] = useState(settings.schoolLogoImage || '');
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [schoolAddress, setSchoolAddress] = useState(settings.schoolAddress || '100 Campus Parkway, Education District');
  const [schoolPhone, setSchoolPhone] = useState(settings.schoolPhone || '+1 (555) 019-2834');
  const [activeTheme, setActiveTheme] = useState(settings.theme);

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

  // Refs
  const importFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Logo emojis palette
  const logoPalette = ['🎓', '🏫', '🏛️', '🌟', '📚', '⚡', '🦁', '🦅', '🎯', '💡'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      schoolName: schoolName.trim(),
      schoolLogo,
      schoolLogoImage,
      academicYear,
      schoolAddress: schoolAddress.trim(),
      schoolPhone: schoolPhone.trim(),
      theme: activeTheme
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleEmailConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = await onImportDatabase(file);
    if (success) {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleResetExecute = async () => {
    setIsResetting(true);
    await onResetDatabase();
    setIsResetting(false);
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h2 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">
          System Settings & Control Panel
        </h2>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Customize school brand tags, configure operational interface preferences, and run administrative database tasks.
        </p>
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
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-sans font-bold text-xs shadow transition-all flex items-center justify-center gap-1"
              >
                {isSaved ? <Check size={12} /> : null}
                <span>{isSaved ? 'Settings Saved Successfully' : 'Apply Settings Changes'}</span>
              </button>
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
              All SAMS databases are offline stored inside the browser's IndexedDB. Export records into JSON arrays to prevent hardware loss.
            </p>

            <div className="space-y-1.5">
              {/* Export Trigger */}
              <button
                onClick={onExportDatabase}
                className="w-full flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Download size={13} className="text-slate-400" />
                  <span>Download JSON Database</span>
                </div>
                <span className="font-mono text-[8px] text-slate-400 font-bold uppercase">EXPORT</span>
              </button>

              {/* Import Trigger */}
              <button
                onClick={() => importFileRef.current?.click()}
                className="w-full flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Upload size={13} className="text-slate-400" />
                  <span>Restore JSON Database</span>
                </div>
                <span className="font-mono text-[8px] text-slate-400 font-bold uppercase">RESTORE</span>
              </button>
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

            {isResetConfirmOpen ? (
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
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
