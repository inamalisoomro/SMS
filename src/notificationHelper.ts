/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { emailService, emailTemplates } from './emailService';
import { EmailNotification, Student, Homework, Announcement, Result, AppSettings } from './types';
import { dbInstance } from './database';

export async function sendHomeworkNotification(
  homework: Homework,
  students: Student[],
  className: string,
  subjectName: string,
  settings: AppSettings
): Promise<{ sent: number; failed: number }> {
  if (!emailService.isConfigured()) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  for (const student of students) {
    const emails = [student.parentEmail, student.secondaryParentEmail].filter(Boolean);
    
    for (const email of emails) {
      try {
        const message = emailService.replaceVariables(emailTemplates.homework.message, {
          parentName: student.fatherName || student.motherName || 'Parent',
          studentName: student.name,
          className,
          homeworkTitle: homework.title,
          homeworkDescription: homework.description,
          subjectName,
          dueDate: new Date(homework.dueDate).toLocaleDateString(),
          schoolName: settings.schoolName,
          academicYear: settings.academicYear
        });

        const notification: EmailNotification = {
          id: crypto.randomUUID(),
          type: 'homework',
          recipientEmail: email!,
          recipientName: student.fatherName || student.motherName || 'Parent',
          studentId: student.id,
          classId: student.classId,
          subject: emailService.replaceVariables(emailTemplates.homework.subject, { homeworkTitle: homework.title }),
          htmlContent: '',
          plainTextContent: message,
          status: 'pending',
          createdAt: Date.now()
        };

        await dbInstance.saveNotification(notification);
        const result = await emailService.sendEmail(notification);
        
        notification.status = result.success ? 'sent' : 'failed';
        if (result.success) {
          notification.sentAt = Date.now();
          sent++;
        } else {
          notification.failureReason = result.error;
          failed++;
        }
        await dbInstance.saveNotification(notification);
      } catch (error) {
        failed++;
      }
    }
  }

  return { sent, failed };
}

export async function sendCertificateNotification(
  student: Student,
  certificateTitle: string,
  certificateDescription: string,
  issueDate: string,
  settings: AppSettings
): Promise<boolean> {
  if (!emailService.isConfigured()) return false;

  const emails = [student.parentEmail, student.secondaryParentEmail].filter(Boolean);
  if (emails.length === 0) return false;

  for (const email of emails) {
    try {
      const message = emailService.replaceVariables(emailTemplates.certificate.message, {
        parentName: student.fatherName || student.motherName || 'Parent',
        studentName: student.name,
        certificateTitle,
        certificateDescription,
        issueDate,
        schoolName: settings.schoolName,
        academicYear: settings.academicYear
      });

      const notification: EmailNotification = {
        id: crypto.randomUUID(),
        type: 'certificate',
        recipientEmail: email!,
        recipientName: student.fatherName || student.motherName || 'Parent',
        studentId: student.id,
        subject: emailService.replaceVariables(emailTemplates.certificate.subject, { certificateTitle }),
        htmlContent: '',
        plainTextContent: message,
        status: 'pending',
        createdAt: Date.now()
      };

      await dbInstance.saveNotification(notification);
      const result = await emailService.sendEmail(notification);
      
      notification.status = result.success ? 'sent' : 'failed';
      if (result.success) notification.sentAt = Date.now();
      else notification.failureReason = result.error;
      
      await dbInstance.saveNotification(notification);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  return false;
}

export async function sendResultNotification(
  student: Student,
  result: Result,
  settings: AppSettings
): Promise<boolean> {
  if (!emailService.isConfigured()) return false;

  const emails = [student.parentEmail, student.secondaryParentEmail].filter(Boolean);
  if (emails.length === 0) return false;

  for (const email of emails) {
    try {
      const message = emailService.replaceVariables(emailTemplates.result.message, {
        parentName: student.fatherName || student.motherName || 'Parent',
        studentName: student.name,
        examName: result.examName,
        percentage: result.percentage.toFixed(2),
        grade: result.grade,
        totalObtained: result.totalObtained.toString(),
        totalMaxMarks: result.totalMaxMarks.toString(),
        schoolName: settings.schoolName,
        academicYear: settings.academicYear
      });

      const notification: EmailNotification = {
        id: crypto.randomUUID(),
        type: 'result',
        recipientEmail: email!,
        recipientName: student.fatherName || student.motherName || 'Parent',
        studentId: student.id,
        subject: emailService.replaceVariables(emailTemplates.result.subject, { examName: result.examName }),
        htmlContent: '',
        plainTextContent: message,
        status: 'pending',
        createdAt: Date.now()
      };

      await dbInstance.saveNotification(notification);
      const sendResult = await emailService.sendEmail(notification);
      
      notification.status = sendResult.success ? 'sent' : 'failed';
      if (sendResult.success) notification.sentAt = Date.now();
      else notification.failureReason = sendResult.error;
      
      await dbInstance.saveNotification(notification);
      return sendResult.success;
    } catch (error) {
      return false;
    }
  }

  return false;
}

export async function sendAnnouncementNotification(
  announcement: Announcement,
  recipients: Array<{ email: string; name: string; studentId?: string }>,
  settings: AppSettings
): Promise<{ sent: number; failed: number }> {
  if (!emailService.isConfigured()) {
    console.warn('Email service not configured. Configure EmailJS in Settings to send emails.');
    return { sent: 0, failed: 0 };
  }

  console.log(`Sending announcement to ${recipients.length} recipients...`);

  let sent = 0, failed = 0;

  for (const recipient of recipients) {
    // Validate email before sending
    if (!recipient.email || !recipient.email.includes('@')) {
      console.warn('Skipping invalid email:', recipient.email);
      failed++;
      continue;
    }

    try {
      const message = emailService.replaceVariables(emailTemplates.announcement.message, {
        parentName: recipient.name,
        announcementTitle: announcement.title,
        announcementMessage: announcement.message,
        publishDate: new Date(announcement.publishedDate).toLocaleDateString(),
        schoolName: settings.schoolName,
        academicYear: settings.academicYear
      });

      const notification: EmailNotification = {
        id: crypto.randomUUID(),
        type: 'announcement',
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        studentId: recipient.studentId,
        subject: emailService.replaceVariables(emailTemplates.announcement.subject, {
          announcementType: announcement.type.toUpperCase(),
          announcementTitle: announcement.title
        }),
        htmlContent: '',
        plainTextContent: message,
        status: 'pending',
        createdAt: Date.now()
      };

      await dbInstance.saveNotification(notification);
      const result = await emailService.sendEmail(notification);
      
      notification.status = result.success ? 'sent' : 'failed';
      if (result.success) {
        notification.sentAt = Date.now();
        sent++;
      } else {
        notification.failureReason = result.error;
        failed++;
        console.error('Failed to send announcement email:', result.error);
      }
      await dbInstance.saveNotification(notification);
      
      // Rate limiting: wait 1 second between emails to respect EmailJS limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Exception sending announcement email:', error);
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendAttendanceAlert(
  student: Student,
  date: string,
  status: string,
  attendancePercentage: number,
  settings: AppSettings
): Promise<boolean> {
  if (!emailService.isConfigured()) return false;

  const emails = [student.parentEmail, student.secondaryParentEmail].filter(Boolean);
  if (emails.length === 0) return false;

  let alertMessage = '';
  if (attendancePercentage < 75) {
    alertMessage = 'Attendance below 75%. Please ensure regular attendance.';
  } else if (status === 'absent') {
    alertMessage = 'Your child was absent today. Please contact school if this is an error.';
  } else if (status === 'late') {
    alertMessage = 'Your child arrived late today. Please ensure timely arrival.';
  }

  for (const email of emails) {
    try {
      const message = emailService.replaceVariables(emailTemplates.attendance_alert.message, {
        parentName: student.fatherName || student.motherName || 'Parent',
        studentName: student.name,
        date: new Date(date).toLocaleDateString(),
        attendanceStatus: status.toUpperCase(),
        attendancePercentage: attendancePercentage.toFixed(1),
        alertMessage,
        schoolName: settings.schoolName,
        academicYear: settings.academicYear
      });

      const notification: EmailNotification = {
        id: crypto.randomUUID(),
        type: 'attendance_alert',
        recipientEmail: email!,
        recipientName: student.fatherName || student.motherName || 'Parent',
        studentId: student.id,
        subject: emailService.replaceVariables(emailTemplates.attendance_alert.subject, { studentName: student.name }),
        htmlContent: '',
        plainTextContent: message,
        status: 'pending',
        createdAt: Date.now()
      };

      await dbInstance.saveNotification(notification);
      const result = await emailService.sendEmail(notification);
      
      notification.status = result.success ? 'sent' : 'failed';
      if (result.success) notification.sentAt = Date.now();
      else notification.failureReason = result.error;
      
      await dbInstance.saveNotification(notification);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  return false;
}
