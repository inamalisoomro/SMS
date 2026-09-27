/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Student, AppSettings, Class } from '../types';
import { generateQRCodeDataURL } from '../utils';

// Helper to trigger a browser file download from a data URL or blob
export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Capture a card DOM element and download as a high-resolution PNG (300+ DPI)
 */
export async function downloadSingleCardPNG(
  cardElement: HTMLElement,
  studentName: string
): Promise<boolean> {
  try {
    const canvas = await html2canvas(cardElement, {
      scale: 3, // High DPI (crisp for print)
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    triggerDownload(dataUrl, `${safeName}_ID_Card.png`);
    return true;
  } catch (err) {
    console.error('Error generating card PNG:', err);
    return false;
  }
}

/**
 * Capture a single student card and export as a CR80 standard sized PDF (3.375" x 2.125" / 85.6mm x 54mm)
 */
export async function downloadSingleCardPDF(
  cardElement: HTMLElement,
  student: Student
): Promise<boolean> {
  try {
    const canvas = await html2canvas(cardElement, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    // CR80 dimensions in millimeters: 85.6mm x 53.98mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
    const safeName = student.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeName}_CR80_ID_Card.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating card PDF:', err);
    return false;
  }
}

/**
 * Direct print for a single card using an isolated invisible iframe to bypass modal backdrop issues
 */
export async function printSingleCard(
  cardElement: HTMLElement,
  studentName: string
): Promise<boolean> {
  try {
    const canvas = await html2canvas(cardElement, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);

    // Create an invisible iframe for isolated printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-1000';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return true;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${studentName} - Student ID Badge</title>
          <style>
            @page {
              size: 3.375in 2.125in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            img {
              width: 3.375in;
              height: 2.125in;
              object-fit: contain;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="Student ID Card" />
        </body>
      </html>
    `);
    doc.close();

    // Allow iframe to render image then trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print blocked, falling back to window.print', e);
        window.print();
      }
      // Clean up iframe after print dialog completes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }, 400);

    return true;
  } catch (err) {
    console.error('Error preparing print:', err);
    window.print();
    return false;
  }
}

/**
 * Render an off-screen card element for a student to capture into canvas
 */
async function renderCardToDataUrl(
  student: Student,
  settings: AppSettings,
  studentClass?: Class
): Promise<string> {
  const qrDataUrl = student.qrToken ? await generateQRCodeDataURL(student.qrToken) : '';
  const classNameStr = studentClass ? `${studentClass.name} - Sec ${studentClass.section}` : `Section ${student.section}`;
  const schoolAddr = settings.schoolAddress || '100 Campus Parkway, Education District';
  const schoolPhone = settings.schoolPhone || '+1 (555) 019-2834';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '460px';
  container.style.height = '288px';
  container.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';

  container.innerHTML = `
    <div style="width: 460px; height: 288px; background: linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%); color: white; border-radius: 16px; border: 1px solid rgba(51, 65, 85, 0.8); display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-sizing: border-box;">
      <!-- Header -->
      <div style="padding: 10px 16px; background: linear-gradient(90deg, #4338ca 0%, #4f46e5 50%, #0f172a 100%); border-bottom: 1px solid rgba(99, 102, 241, 0.3); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            ${settings.schoolLogo || '🎓'}
          </div>
          <div>
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; line-height: 1.2;">
              ${settings.schoolName || 'SAMS ACADEMY'}
            </div>
            <div style="font-family: monospace; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #c7d2fe;">
              Official Student Identity Pass
            </div>
          </div>
        </div>
        <div style="background: rgba(0, 0, 0, 0.4); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.15); font-family: monospace; font-size: 8px; color: #6ee7b7; font-weight: 700; letter-spacing: 1px;">
          ✓ VERIFIED
        </div>
      </div>

      <!-- Middle -->
      <div style="padding: 10px 16px; flex: 1; display: flex; gap: 14px; align-items: center;">
        <!-- Photo & Blood Group -->
        <div style="display: flex; flex-direction: column; align-items: center;">
          ${
            student.photo
              ? `<img src="${student.photo}" style="width: 76px; height: 88px; object-fit: cover; border-radius: 8px; border: 2px solid rgba(129, 140, 248, 0.5); background: #1e293b;" />`
              : `<div style="width: 76px; height: 88px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border: 2px solid rgba(165, 180, 252, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
                  <span style="font-size: 26px; font-weight: 900;">${student.name.charAt(0)}</span>
                  <span style="font-family: monospace; font-size: 8px; letter-spacing: 1px; color: #e0e7ff; margin-top: 4px;">STUDENT</span>
                </div>`
          }
          <div style="margin-top: 6px; padding: 2px 6px; background: rgba(244, 63, 94, 0.2); border: 1px solid rgba(244, 63, 94, 0.4); border-radius: 4px; font-family: monospace; font-size: 8px; color: #fda4af; font-weight: bold;">
            🩸 ${student.bloodGroup || 'O+'}
          </div>
        </div>

        <!-- Details -->
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 15px; color: #ffffff; line-height: 1.2;">
            ${student.name}
          </div>
          <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #a5b4fc; margin-bottom: 6px;">
            ID: ${student.studentId}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9px;">
            <div>
              <span style="color: #94a3b8; font-size: 8px; text-transform: uppercase; font-family: monospace; display: block;">Class</span>
              <span style="font-weight: 600; color: #f1f5f9;">${classNameStr}</span>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 8px; text-transform: uppercase; font-family: monospace; display: block;">Roll No</span>
              <span style="font-family: monospace; font-weight: 800; color: #fde047;">#${student.rollNumber}</span>
            </div>
            ${
              student.fatherName
                ? `<div style="grid-column: span 2;">
                    <span style="color: #94a3b8; font-size: 8px; text-transform: uppercase; font-family: monospace; display: block;">Guardian</span>
                    <span style="color: #e2e8f0; font-size: 8.5px;">${student.fatherName}</span>
                  </div>`
                : ''
            }
            <div>
              <span style="color: #94a3b8; font-size: 8px; text-transform: uppercase; font-family: monospace; display: block;">Contact</span>
              <span style="font-family: monospace; color: #e2e8f0; font-size: 8px;">${student.contactNumber}</span>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 8px; text-transform: uppercase; font-family: monospace; display: block;">Expires</span>
              <span style="font-family: monospace; color: #a5b4fc; font-size: 8px; font-weight: 600;">${student.cardValidUntil || '2027-06-30'}</span>
            </div>
          </div>
        </div>

        <!-- QR Code -->
        <div style="display: flex; flex-direction: column; align-items: center; padding-left: 8px; border-left: 1px solid rgba(51, 65, 85, 0.6);">
          <div style="width: 80px; height: 80px; padding: 4px; background: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 72px; height: 72px; object-fit: contain;" />` : ''}
          </div>
          <span style="font-family: monospace; font-size: 7px; color: #c7d2fe; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; font-weight: 700;">
            SCAN TO MARK
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 6px 16px; background: rgba(3, 7, 18, 0.9); border-top: 1px solid rgba(30, 41, 59, 0.8); display: flex; align-items: center; justify-content: space-between; font-size: 8px; color: #94a3b8; font-family: monospace;">
        <div>${schoolAddr}</div>
        <div>Tel: ${schoolPhone}</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });
    return canvas.toDataURL('image/png', 0.95);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Export Batch Cards as an 8-up A4 printable PDF
 * Exactly matches the spec: "multiple students' cards laid out 8-up on an A4 page, exported as PDF via jsPDF"
 * Standard A4: 210mm x 297mm
 * CR80 Card: 85.6mm x 54.0mm
 * 2 columns x 4 rows = 8 cards per page
 */
export async function downloadBatchCardsPDF(
  students: Student[],
  classes: Class[],
  settings: AppSettings,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  if (students.length === 0) return false;

  try {
    // Standard A4 portrait in millimeters
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cardW = 85.6; // CR80 standard width
    const cardH = 54.0; // CR80 standard height

    // Margins to center 2 columns and 4 rows on 210mm x 297mm A4 page
    // Total cards width = 85.6 * 2 = 171.2mm -> Left margin = (210 - 171.2) / 3 ≈ 12.9mm
    // Total cards height = 54 * 4 = 216.0mm -> Top margin = (297 - 216) / 5 ≈ 16.2mm
    const marginX = 12.9;
    const marginY = 14.0;
    const gapX = 13.0;
    const gapY = 14.0;

    const cardsPerPage = 8;
    const totalStudents = students.length;

    for (let i = 0; i < totalStudents; i++) {
      if (onProgress) {
        onProgress(i + 1, totalStudents);
      }

      const student = students[i];
      const studentClass = classes.find((c) => c.id === student.classId);
      const cardImgData = await renderCardToDataUrl(student, settings, studentClass);

      const pageIndex = Math.floor(i / cardsPerPage);
      const slotIndex = i % cardsPerPage;

      if (slotIndex === 0 && pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const col = slotIndex % 2; // 0 or 1
      const row = Math.floor(slotIndex / 2); // 0, 1, 2, or 3

      const posX = marginX + col * (cardW + gapX);
      const posY = marginY + row * (cardH + gapY);

      // Draw subtle cutting border guide
      pdf.setDrawColor(200, 205, 215);
      pdf.setLineWidth(0.2);
      pdf.rect(posX - 0.5, posY - 0.5, cardW + 1, cardH + 1);

      // Place high-res card image
      pdf.addImage(cardImgData, 'PNG', posX, posY, cardW, cardH);
    }

    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`Student_ID_Cards_Batch_8Up_${timestamp}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate batch cards PDF:', err);
    return false;
  }
}
