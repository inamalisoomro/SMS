/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Role-Based Access Control (RBAC) Permission System
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * This is a LOCAL PROTOTYPE for UI permissions only.
 * Client-side role checks CANNOT provide real security.
 * 
 * For production deployment, you MUST implement:
 * - Secure backend authentication
 * - Server-side authorization checks
 * - Verified user identity and role
 * - Session management with secure tokens
 * - API endpoint permission validation
 */

import { UserRole, Permission, User, TeacherAssignment } from './types';

// ==================== ROLE-PERMISSION MATRIX ====================

/**
 * Defines which permissions each role has.
 * This is the single source of truth for role capabilities.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  principal: [
    // Dashboard & Overview
    'view_dashboard',
    
    // Student Management
    'view_students',
    'manage_students',
    
    // Teacher Management
    'view_teachers',
    'manage_teachers',
    
    // Class & Subject Management
    'view_classes',
    'manage_classes',
    'view_subjects',
    'manage_subjects',
    
    // Attendance
    'view_attendance',
    'mark_attendance',
    
    // Reports & Analytics
    'view_reports',
    'view_analytics',
    
    // Announcements
    'view_announcements',
    'manage_announcements',
    
    // Examinations & Results
    'view_examinations',
    'manage_examinations',
    'enter_marks',
    'publish_results',
    'view_results',
    
    // Fee Management
    'view_fees',
    'manage_fees',
    
    // Settings & System
    'view_settings',
    'manage_settings',
    'backup_restore',
    
    // Parent Portal (can view to understand what parents see)
    'view_parent_portal'
  ],
  
  administrator: [
    // Dashboard & Overview
    'view_dashboard',
    
    // Student Management
    'view_students',
    'manage_students',
    
    // Teacher Management
    'view_teachers',
    'manage_teachers',
    
    // Class & Subject Management
    'view_classes',
    'manage_classes',
    'view_subjects',
    'manage_subjects',
    
    // Attendance
    'view_attendance',
    'mark_attendance',
    
    // Reports & Analytics
    'view_reports',
    'view_analytics',
    
    // Announcements
    'view_announcements',
    'manage_announcements',
    
    // Examinations & Results
    'view_examinations',
    'manage_examinations',
    'enter_marks',
    'publish_results',
    'view_results',
    
    // Fee Management
    'view_fees',
    'manage_fees',
    
    // Limited Settings (no backup/restore or critical system changes)
    'view_settings',
    // Note: 'manage_settings' excluded - cannot change EmailJS, school branding without Principal
    // Note: 'backup_restore' excluded - cannot restore database without Principal
  ],
  
  teacher: [
    // Dashboard (limited view)
    'view_dashboard',
    
    // Student Management (view only for assigned classes)
    'view_students',
    // Note: 'manage_students' excluded - teachers cannot register/delete students
    
    // View Classes & Subjects (for assigned classes only)
    'view_classes',
    'view_subjects',
    
    // Attendance (for assigned classes only)
    'view_attendance',
    'mark_attendance',
    
    // Reports (for assigned classes only)
    'view_reports',
    
    // Announcements (view only)
    'view_announcements',
    
    // Examinations (view for assigned classes)
    'view_examinations',
    // Enter marks for assigned classes/subjects only
    'enter_marks',
    // View results for assigned classes
    'view_results',
    
    // Note: Teachers CANNOT:
    // - Delete students or teachers
    // - Manage classes/subjects globally
    // - Publish results (principal/admin only)
    // - Manage fees
    // - Change system settings
    // - Backup/restore database
    // - View parent portal
  ],
  
  parent: [
    // Parent Portal only
    'view_parent_portal',
    
    // Note: Parents CANNOT:
    // - Access any administrative modules
    // - View dashboard, students, teachers, classes
    // - Mark attendance
    // - Enter marks or publish results
    // - Manage fees
    // - View settings or system functions
    // 
    // Parents can only view their linked children's data:
    // - Attendance history
    // - Published results
    // - Relevant announcements
    // - Fee information
  ]
};

// ==================== PERMISSION CHECK FUNCTIONS ====================

/**
 * Check if a user has a specific permission.
 * @param user - The current user (or null if no user logged in)
 * @param permission - The permission to check
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has ANY of the specified permissions.
 * @param user - The current user
 * @param permissions - Array of permissions to check
 * @returns true if user has at least one permission
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has ALL of the specified permissions.
 * @param user - The current user
 * @param permissions - Array of permissions to check
 * @returns true if user has all permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a specific role.
 * @param role - The user role
 * @returns Array of permissions for that role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

// ==================== TEACHER ASSIGNMENT CHECKS ====================

/**
 * Check if a teacher is assigned to a specific class.
 * @param user - The current user (must be a teacher)
 * @param classId - The class ID to check
 * @param assignments - Array of teacher assignments
 * @returns true if teacher is assigned to the class
 */
export function isTeacherAssignedToClass(
  user: User | null,
  classId: string,
  assignments: TeacherAssignment[]
): boolean {
  if (!user || user.role !== 'teacher' || !user.teacherId) return false;
  return assignments.some(
    assignment => assignment.teacherId === user.teacherId && assignment.classId === classId
  );
}

/**
 * Check if a teacher is assigned to a specific subject.
 * @param user - The current user (must be a teacher)
 * @param subjectId - The subject ID to check
 * @param assignments - Array of teacher assignments
 * @returns true if teacher is assigned to the subject
 */
export function isTeacherAssignedToSubject(
  user: User | null,
  subjectId: string,
  assignments: TeacherAssignment[]
): boolean {
  if (!user || user.role !== 'teacher' || !user.teacherId) return false;
  return assignments.some(
    assignment => assignment.teacherId === user.teacherId && assignment.subjectId === subjectId
  );
}

/**
 * Check if a teacher is assigned to a specific class-subject combination.
 * @param user - The current user (must be a teacher)
 * @param classId - The class ID
 * @param subjectId - The subject ID
 * @param assignments - Array of teacher assignments
 * @returns true if teacher is assigned to teach this subject to this class
 */
export function isTeacherAssignedToClassSubject(
  user: User | null,
  classId: string,
  subjectId: string,
  assignments: TeacherAssignment[]
): boolean {
  if (!user || user.role !== 'teacher' || !user.teacherId) return false;
  return assignments.some(
    assignment =>
      assignment.teacherId === user.teacherId &&
      assignment.classId === classId &&
      assignment.subjectId === subjectId
  );
}

/**
 * Get all class IDs assigned to a teacher.
 * @param user - The current user (must be a teacher)
 * @param assignments - Array of teacher assignments
 * @returns Array of class IDs
 */
export function getTeacherAssignedClassIds(
  user: User | null,
  assignments: TeacherAssignment[]
): string[] {
  if (!user || user.role !== 'teacher' || !user.teacherId) return [];
  const classIds = assignments
    .filter(assignment => assignment.teacherId === user.teacherId)
    .map(assignment => assignment.classId);
  return Array.from(new Set(classIds)); // Remove duplicates
}

/**
 * Get all subject IDs assigned to a teacher.
 * @param user - The current user (must be a teacher)
 * @param assignments - Array of teacher assignments
 * @returns Array of subject IDs
 */
export function getTeacherAssignedSubjectIds(
  user: User | null,
  assignments: TeacherAssignment[]
): string[] {
  if (!user || user.role !== 'teacher' || !user.teacherId) return [];
  const subjectIds = assignments
    .filter(assignment => assignment.teacherId === user.teacherId)
    .map(assignment => assignment.subjectId);
  return Array.from(new Set(subjectIds)); // Remove duplicates
}

// ==================== PARENT ACCESS CHECKS ====================

/**
 * Check if a parent has access to a specific student's data.
 * @param user - The current user (must be a parent)
 * @param studentId - The student ID to check
 * @returns true if parent is linked to this student
 */
export function isParentLinkedToStudent(
  user: User | null,
  studentId: string
): boolean {
  if (!user || user.role !== 'parent') return false;
  return user.linkedStudentIds?.includes(studentId) ?? false;
}

/**
 * Get all student IDs linked to a parent.
 * @param user - The current user (must be a parent)
 * @returns Array of student IDs
 */
export function getParentLinkedStudentIds(user: User | null): string[] {
  if (!user || user.role !== 'parent') return [];
  return user.linkedStudentIds ?? [];
}

// ==================== PERMISSION ERROR MESSAGES ====================

/**
 * Get a user-friendly error message for a permission denial.
 * @param permission - The denied permission
 * @param userRole - The current user's role (optional)
 * @returns Error message string
 */
export function getPermissionDeniedMessage(
  permission: Permission,
  userRole?: UserRole
): string {
  const roleText = userRole ? ` as ${userRole}` : '';
  
  switch (permission) {
    case 'manage_students':
      return `You do not have permission${roleText} to register or delete students. Contact your Principal or Administrator.`;
    case 'manage_teachers':
      return `You do not have permission${roleText} to register or delete teachers. Contact your Principal or Administrator.`;
    case 'manage_classes':
      return `You do not have permission${roleText} to create or delete classes. Contact your Principal or Administrator.`;
    case 'manage_subjects':
      return `You do not have permission${roleText} to create or delete subjects. Contact your Principal or Administrator.`;
    case 'publish_results':
      return `You do not have permission${roleText} to publish examination results. Only Principal and Administrator can publish results.`;
    case 'manage_fees':
      return `You do not have permission${roleText} to manage fee records. Contact your Principal or Administrator.`;
    case 'manage_settings':
      return `You do not have permission${roleText} to change school settings. Only Principal can modify system settings.`;
    case 'backup_restore':
      return `You do not have permission${roleText} to backup or restore the database. Only Principal can perform this action.`;
    case 'mark_attendance':
      return `You do not have permission${roleText} to mark attendance for this class. Teachers can only mark attendance for assigned classes.`;
    case 'enter_marks':
      return `You do not have permission${roleText} to enter marks for this class or subject. Teachers can only enter marks for assigned classes.`;
    default:
      return `You do not have permission${roleText} to perform this action. Contact your administrator.`;
  }
}

// ==================== ROLE DISPLAY HELPERS ====================

/**
 * Get display name for a role.
 * @param role - The user role
 * @returns Formatted role name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'principal':
      return 'Principal';
    case 'administrator':
      return 'Administrator';
    case 'teacher':
      return 'Teacher';
    case 'parent':
      return 'Parent';
  }
}

/**
 * Get icon name for a role (Lucide React icon names).
 * @param role - The user role
 * @returns Icon name
 */
export function getRoleIcon(role: UserRole): string {
  switch (role) {
    case 'principal':
      return 'Crown';
    case 'administrator':
      return 'Shield';
    case 'teacher':
      return 'GraduationCap';
    case 'parent':
      return 'Users';
  }
}

// ==================== VALIDATION ====================

/**
 * Check if a role string is valid.
 * @param role - The role string to validate
 * @returns true if valid role
 */
export function isValidRole(role: string): role is UserRole {
  return ['principal', 'administrator', 'teacher', 'parent'].includes(role);
}
