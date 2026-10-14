/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Role Selector Component - LOCAL PROTOTYPE ONLY
 * 
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * This component is for UI/UX testing and development ONLY.
 * It is NOT a secure authentication system.
 * 
 * This dropdown does NOT:
 * - Verify user identity
 * - Check passwords
 * - Provide secure authentication
 * - Protect against unauthorized access
 * - Work across devices or browsers
 * 
 * For production deployment, you MUST replace this with:
 * - Real authentication system (OAuth, SAML, custom backend auth)
 * - Secure session management with encrypted tokens
 * - Server-side role verification
 * - Password hashing and secure credential storage
 * - Multi-factor authentication (recommended)
 */

import React from 'react';
import { User } from '../types';
import { getRoleDisplayName, getRoleIcon } from '../permissions';
import { Crown, Shield, GraduationCap, Users, AlertTriangle, Lock } from 'lucide-react';

interface RoleSelectorProps {
  currentUser: User | null;
  availableUsers: User[];
  onUserChange: (user: User) => void;
  className?: string;
}

export default function RoleSelector({
  currentUser,
  availableUsers,
  onUserChange,
  className = ''
}: RoleSelectorProps) {
  const getRoleIconComponent = (role: string) => {
    switch (role) {
      case 'principal':
        return Crown;
      case 'administrator':
        return Shield;
      case 'teacher':
        return GraduationCap;
      case 'parent':
        return Users;
      default:
        return Shield;
    }
  };

  const Icon = currentUser ? getRoleIconComponent(currentUser.role) : Lock;

  return (
    <div className={`relative ${className}`}>
      {/* Warning Badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <div className="bg-amber-500 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
          <AlertTriangle size={8} />
          DEV
        </div>
      </div>

      <div className="relative">
        <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-bold">
          ⚠️ Prototype Mode
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon size={16} className="text-slate-400" />
          </div>
          <select
            value={currentUser?.id || ''}
            onChange={(e) => {
              const user = availableUsers.find(u => u.id === e.target.value);
              if (user) onUserChange(user);
            }}
            className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-slate-900 border-2 border-amber-500/50 dark:border-amber-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-300 font-medium cursor-pointer appearance-none"
          >
            {!currentUser && <option value="">-- Select Role --</option>}
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {getRoleDisplayName(user.role)} - {user.username}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
          This is NOT secure authentication - UI testing only
        </p>
      </div>
    </div>
  );
}

/**
 * Compact inline variant for header/navbar - Professional clean version
 */
export function RoleSelectorCompact({
  currentUser,
  availableUsers,
  onUserChange,
  className = ''
}: RoleSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const getRoleIconComponent = (role: string) => {
    switch (role) {
      case 'principal':
        return Crown;
      case 'administrator':
        return Shield;
      case 'teacher':
        return GraduationCap;
      case 'parent':
        return Users;
      default:
        return Shield;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'principal':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30';
      case 'administrator':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30';
      case 'teacher':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';
      case 'parent':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30';
    }
  };

  const Icon = currentUser ? getRoleIconComponent(currentUser.role) : Lock;
  const currentRoleColor = currentUser ? getRoleColor(currentUser.role) : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.role-selector-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectRole = (user: User) => {
    onUserChange(user);
    setIsOpen(false);
  };

  return (
    <div className={`relative role-selector-container ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          border transition-all duration-200
          bg-white dark:bg-slate-800
          border-slate-200 dark:border-slate-700
          hover:border-slate-300 dark:hover:border-slate-600
          hover:shadow-sm
          ${isOpen ? 'shadow-md border-slate-300 dark:border-slate-600' : ''}
        `}
      >
        {/* Role Icon */}
        <div className={`p-1 rounded ${currentRoleColor}`}>
          <Icon size={14} />
        </div>

        {/* Role Name */}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {currentUser ? getRoleDisplayName(currentUser.role) : 'Select Role'}
        </span>

        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Switch Role</span>
              <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">Dev Mode</span>
            </div>
          </div>

          {/* Role List */}
          <div className="py-1">
            {availableUsers.map((user) => {
              const UserIcon = getRoleIconComponent(user.role);
              const isSelected = currentUser?.id === user.id;
              const roleColor = getRoleColor(user.role);

              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectRole(user)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2
                    transition-colors duration-150
                    ${isSelected 
                      ? 'bg-slate-100 dark:bg-slate-700/50' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }
                  `}
                >
                  {/* Icon */}
                  <div className={`p-1.5 rounded ${roleColor}`}>
                    <UserIcon size={16} />
                  </div>

                  {/* Role Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {getRoleDisplayName(user.role)}
                      </span>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {user.username}
                    </span>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800/50">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <AlertTriangle size={10} className="inline mr-1" />
              Prototype mode - Not production authentication
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
