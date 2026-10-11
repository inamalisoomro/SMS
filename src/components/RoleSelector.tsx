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
 * Compact inline variant for header/navbar
 */
export function RoleSelectorCompact({
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
    <div className={`relative group ${className}`}>
      {/* Compact selector */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 rounded-lg">
        <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <Icon size={14} className="text-amber-700 dark:text-amber-300 flex-shrink-0" />
        <select
          value={currentUser?.id || ''}
          onChange={(e) => {
            const user = availableUsers.find(u => u.id === e.target.value);
            if (user) onUserChange(user);
          }}
          className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer appearance-none pr-6"
        >
          {!currentUser && <option value="">Role</option>}
          {availableUsers.map(user => (
            <option key={user.id} value={user.id}>
              {getRoleDisplayName(user.role)}
            </option>
          ))}
        </select>
        <svg className="w-3 h-3 text-amber-600 dark:text-amber-400 absolute right-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-amber-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="flex items-center gap-1 mb-1">
          <Lock size={10} />
          <strong>Development Mode Only</strong>
        </div>
        This selector is NOT secure authentication. For production, implement real backend auth with verified user identity.
      </div>
    </div>
  );
}
