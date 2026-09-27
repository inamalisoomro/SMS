/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckSquare, 
  FileBarChart2, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Bell,
  Activity
} from 'lucide-react';
import { AppSettings } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  settings: AppSettings;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  toggleTheme: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  settings,
  isOpen,
  setIsOpen,
  unreadNotifications,
  onOpenNotifications,
  toggleTheme
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Take Attendance', icon: CheckSquare },
    { id: 'students', label: 'Students Directory', icon: Users },
    { id: 'classes', label: 'Classes & Sections', icon: GraduationCap },
    { id: 'subjects', label: 'Subjects List', icon: BookOpen },
    { id: 'reports', label: 'Reports Hub', icon: FileBarChart2 },
    { id: 'analytics', label: 'Visual Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setIsOpen(false); // Close sidebar on mobile after tap
  };

  return (
    <>
      {/* Mobile Header Overlay Trigger */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{settings.schoolLogo || '🎓'}</span>
          <h1 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-base truncate max-w-[200px]">
            {settings.schoolName || 'SAMS School'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenNotifications} 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar Navigation Panel */}
      <aside 
        className={`fixed md:sticky top-0 left-0 bottom-0 w-56 md:w-60 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-r border-slate-200/50 dark:border-slate-800/50 p-3.5 flex flex-col h-screen z-50 transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding - Desktop */}
        <div className="hidden md:flex items-center justify-between pb-3.5 mb-2.5 border-b border-slate-200/40 dark:border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-xl shadow-inner shadow-indigo-200/50 dark:shadow-none">
              {settings.schoolLogo || '🎓'}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate w-36">
                {settings.schoolName || 'SAMS School'}
              </h1>
              <p className="font-mono text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase mt-0.5">
                {settings.academicYear || '2026-2027'}
              </p>
            </div>
          </div>
          <button 
            onClick={onOpenNotifications} 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative transition-colors"
            title="System Activities"
          >
            <Activity size={16} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto pr-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:shadow-indigo-500/10' 
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800/40 space-y-1.5">
          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              {settings.theme === 'dark' ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-500" />}
              <span>{settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 ${
              settings.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform duration-200 transform ${
                settings.theme === 'dark' ? 'translate-x-3' : 'translate-x-0'
              }`} />
            </div>
          </button>

          {/* Offline/PWA System Badge */}
          <div className="flex items-center gap-2 px-3 py-1 text-[9px] font-mono text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span>LOCAL SECURE ENGINE</span>
          </div>
        </div>
      </aside>
    </>
  );
}
