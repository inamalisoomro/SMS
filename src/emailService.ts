/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import emailjs from '@emailjs/browser';
import { EmailNotification, NotificationType } from './types';

/**
 * Email Service for handling notification delivery to parents
 * Uses EmailJS for client-side email sending (no backend needed, free tier: 200 emails/month)
 * Sign up at: https://www.emailjs.com/
 */
export class EmailService {
  private serviceId: string = '';
  private templateId: string = '';
  private publicKey: string = '';
  private fromName: string = '';

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const settings = localStorage.getItem('sams_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.serviceId = parsed.emailJsServiceId || '';
        this.templateId = parsed.emailJsTemplateId || '';
        this.publicKey = parsed.emailJsPublicKey || '';
        this.fromName = parsed.schoolName || 'School Management System';
      }
    } catch (e) {
      // Silent fail - config not available
    }
  }

  // Reload configuration from localStorage (call this after settings are saved)
  reloadConfig(): void {
    this.loadConfig();
  }

  isConfigured(): boolean {
    // Reload to ensure we have latest config
    this.loadConfig();
    return !!(this.serviceId && this.templateId && this.publicKey);
  }

  async sendEmail(notification: EmailNotification): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const templateParams = {
        to_email: notification.recipientEmail,
        to_name: notification.recipientName,
        from_name: this.fromName,
        subject: notification.subject,
        message: notification.plainTextContent || '',
      };

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams,
        {
          publicKey: this.publicKey,
        }
      );

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('EmailJS send failed:', {
        status: error?.status,
        text: error?.text,
      });

      return {
        success: false,
        error: error?.text || error?.message || 'EmailJS failed to send the email',
      };
    }
  }

  async sendTestEmail(toEmail: string, toName: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      id: `test-${Date.now()}`,
      type: 'general',
      recipientEmail: toEmail,
      recipientName: toName,
      subject: 'Test Email - SAMS',
      htmlContent: '',
      plainTextContent: `Hello ${toName},\n\nThis is a test email from SAMS. Configuration is working!\n\nBest regards,\nSAMS Team`,
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  replaceVariables(template: string, vars: Record<string, string>): string {
    let result = template;
    Object.keys(vars).forEach(key => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), vars[key]);
    });
    return result;
  }
}

export const emailService = new EmailService();

// Simple email templates
export const emailTemplates: Record<NotificationType, { subject: string; message: string }> = {
  homework: {
    subject: 'New Homework: {{homeworkTitle}}',
    message: `Dear {{parentName}},\n\nNew homework for {{studentName}} in {{className}}.\n\nTitle: {{homeworkTitle}}\nSubject: {{subjectName}}\nDue: {{dueDate}}\n\nDescription:\n{{homeworkDescription}}\n\nBest regards,\n{{schoolName}}`
  },
  certificate: {
    subject: 'Certificate: {{certificateTitle}}',
    message: `Dear {{parentName}},\n\nCertificate issued to {{studentName}}.\n\nTitle: {{certificateTitle}}\nDescription: {{certificateDescription}}\nDate: {{issueDate}}\n\nBest regards,\n{{schoolName}}`
  },
  result: {
    subject: 'Results: {{examName}}',
    message: `Dear {{parentName}},\n\nResults for {{studentName}}:\n\nExam: {{examName}}\nPercentage: {{percentage}}%\nGrade: {{grade}}\nMarks: {{totalObtained}}/{{totalMaxMarks}}\n\nBest regards,\n{{schoolName}}`
  },
  announcement: {
    subject: '{{announcementType}}: {{announcementTitle}}',
    message: `Dear {{parentName}},\n\n{{announcementTitle}}\n\n{{announcementMessage}}\n\nPublished: {{publishDate}}\n\nBest regards,\n{{schoolName}}`
  },
  attendance_alert: {
    subject: 'Attendance Alert - {{studentName}}',
    message: `Dear {{parentName}},\n\nAttendance alert for {{studentName}}:\n\nDate: {{date}}\nStatus: {{attendanceStatus}}\nCurrent: {{attendancePercentage}}%\n\n{{alertMessage}}\n\nBest regards,\n{{schoolName}}`
  },
  fee_reminder: {
    subject: 'Fee Reminder',
    message: `Dear {{parentName}},\n\nFee reminder for {{studentName}}:\n\nAmount: {{amountDue}}\nDue: {{dueDate}}\n\nBest regards,\n{{schoolName}}`
  },
  event: {
    subject: 'Event: {{eventTitle}}',
    message: `Dear {{parentName}},\n\n{{eventTitle}}\n\n{{eventDescription}}\n\nWhen: {{eventDateTime}}\nVenue: {{eventVenue}}\n\nBest regards,\n{{schoolName}}`
  },
  general: {
    subject: '{{messageTitle}}',
    message: `Dear {{parentName}},\n\n{{messageContent}}\n\nBest regards,\n{{schoolName}}`
  }
};
