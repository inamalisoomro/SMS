/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';

// Secret key initialization for token signing
function getAppSecret(): string {
  let secret = localStorage.getItem('sams_qr_secret');
  if (!secret) {
    secret = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) + '-' + Date.now().toString(36);
    localStorage.setItem('sams_qr_secret', secret);
  }
  return secret;
}

// Generate an opaque, unique signed token for student QR codes
// Never encodes plain student name or roll number!
export function generateStudentQRToken(studentId?: string): string {
  const secret = getAppSecret();
  const rawId = studentId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  const randSalt = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36);
  
  // Simple fast hash of secret + rawId + salt
  let hash = 0;
  const combined = `${secret}:${rawId}:${randSalt}:${time}`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
  }
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sams_tok_${hashHex}_${randSalt}_${time}`;
}

// Generate valid standard ISO/IEC 18004 QR Code as base64 Data URL
export async function generateQRCodeDataURL(value: string): Promise<string> {
  try {
    return await QRCode.toDataURL(value, {
      margin: 1,
      width: 300,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

// Generate valid standard ISO QR Code as raw SVG string
export async function generateQRCodeSVGString(value: string): Promise<string> {
  try {
    return await QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR SVG string:', err);
    return '';
  }
}

// Synthesized audio feedback for QR Attendance Scanning (offline Web Audio API)
export function playScanSound(type: 'success' | 'duplicate' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc1.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5

      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime + 0.08);
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } else if (type === 'duplicate') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio contexts can be restricted by browser until first user action
  }
}

// Utility for CSV Export
export function exportToCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Simple CSV Parser (handles comma-separated text, basic double quotes)
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip newline part of crlf
      }
      row.push(currentValue.trim());
      if (row.length > 0 && row.some(val => val !== '')) {
        lines.push(row);
      }
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (currentValue !== '' || row.length > 0) {
    row.push(currentValue.trim());
    if (row.some(val => val !== '')) {
      lines.push(row);
    }
  }

  return lines;
}

// Generate a clean offline barcode using standard 3of9 or simple industrial pattern
export function generateBarcodeSVG(value: string): string {
  // Simple representation: alternate black and white lines
  // Let's seed a simple deterministic sequence of line widths based on the characters
  const cleanVal = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  let bits = '101001101101'; // Start character (thin black, thin white, thin black, wide white, wide black, thin white, wide black, thin white, thin black...)
  
  const charPatterns: { [key: string]: string } = {
    '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101',
    '7': '101001011011', '8': '110100101101', '9': '101100101101',
    '0': '101001101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101',
    'F': '101101100101', 'G': '101010011011', 'H': '110101001101',
    'I': '101101001101', 'J': '101011001101', 'S': '101101101101',
    'T': '101010110011', 'M': '110110110101', '-': '101001101101'
  };

  for (let i = 0; i < cleanVal.length; i++) {
    const char = cleanVal[i];
    bits += charPatterns[char] || '101001101011';
  }
  bits += '101001101101'; // Stop character

  let svgHtml = `<svg viewBox="0 0 ${bits.length * 2} 60" class="w-full h-full" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`;
  svgHtml += `<rect width="100%" height="100%" fill="transparent" />`;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      svgHtml += `<rect x="${i * 2}" y="2" width="2" height="46" fill="currentColor" />`;
    }
  }
  // Add label under the barcode
  svgHtml += `<text x="50%" y="56" font-family="monospace" font-size="6" font-weight="bold" text-anchor="middle" fill="currentColor">${value}</text>`;
  svgHtml += `</svg>`;

  return svgHtml;
}

// Generate a gorgeous high-fidelity vector QR Code SVG procedurally
// Features authentic QR structure: 3 major alignment corners, grid lines, and central identifier.
export function generateQRCodeSVG(value: string): string {
  // We'll build a 21x21 QR Matrix (Version 1)
  const size = 21;
  const grid = Array(size).fill(0).map(() => Array(size).fill(false));

  // Helper to draw finder pattern
  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isCenter) {
          if (x + r < size && y + c < size) {
            grid[x + r][y + c] = true;
          }
        }
      }
    }
  };

  // Draw 3 primary finder patterns
  drawFinder(0, 0); // Top-left
  drawFinder(14, 0); // Bottom-left
  drawFinder(0, 14); // Top-right

  // Draw timing patterns (alternating pixels)
  for (let i = 8; i < 13; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Draw alignment pattern (for styling/looks)
  grid[15][15] = true;
  grid[14][15] = true;
  grid[15][14] = true;
  grid[16][15] = true;
  grid[15][16] = true;

  // Hash-based deterministic pseudorandom matrix filling for data content
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Linear Congruential Generator seed
  let seed = Math.abs(hash);
  const lcg = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Fill the rest of the matrix with pseudorandom modules, avoiding finder/timing zones
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Avoid Finder Patterns
      const isTopLeftFinder = r < 8 && c < 8;
      const isBottomLeftFinder = r > 12 && c < 8;
      const isTopRightFinder = r < 8 && c > 12;
      const isTimingPattern = r === 6 || c === 6;

      if (!isTopLeftFinder && !isBottomLeftFinder && !isTopRightFinder && !isTimingPattern) {
        // Deterministic dot generation
        grid[r][c] = lcg() > 0.45;
      }
    }
  }

  // Render to beautiful SVG
  const cellSize = 10;
  const padding = 15;
  const totalSize = size * cellSize + padding * 2;

  let svgHtml = `<svg viewBox="0 0 ${totalSize} ${totalSize}" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">`;
  svgHtml += `<rect width="100%" height="100%" fill="white" rx="12" />`; // standard white QR background

  // Draw QR points as rounded squares / high quality dots
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        const x = padding + c * cellSize;
        const y = padding + r * cellSize;
        
        // Special styling for Finder corners (make them sharp and distinct)
        const isFinderArea = (r < 7 && c < 7) || (r > 13 && c < 7) || (r < 7 && c > 13);
        if (isFinderArea) {
          svgHtml += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#1e293b" />`;
        } else {
          // Inner data dots - styled beautifully with slightly rounded corners
          svgHtml += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${cellSize - 1}" height="${cellSize - 1}" rx="2.5" fill="#334155" />`;
        }
      }
    }
  }

  // Draw center brand accent (e.g. mini SAMS graduation-cap look or visual dot)
  const cx = totalSize / 2;
  const cy = totalSize / 2;
  svgHtml += `<rect x="${cx - 15}" y="${cy - 15}" width="30" height="30" rx="6" fill="#0f172a" stroke="white" stroke-width="3" />`;
  // Simple graduation cap line drawing
  svgHtml += `<path d="${cx - 8} ${cy - 2} L ${cx} ${cy - 7} L ${cx + 8} ${cy - 2} L ${cx} ${cy + 3} Z" fill="#6366f1" />`;
  svgHtml += `<path d="${cx - 4} ${cy} L ${cx - 4} ${cy + 5} Q ${cx} ${cy + 8} ${cx + 4} ${cy + 5} L ${cx + 4} ${cy}" fill="none" stroke="#6366f1" stroke-width="1.5" />`;
  svgHtml += `<line x1="${cx + 8}" y1="${cy - 2}" x2="${cx + 8}" y2="${cy + 4}" stroke="#6366f1" stroke-width="1.5" />`;
  
  svgHtml += `</svg>`;
  return svgHtml;
}

// ==================== LOGO MANAGEMENT UTILITIES ====================

/**
 * Validates if the file is a valid image type
 * @param file - File to validate
 * @returns true if valid image, false otherwise
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG images only.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit. Please choose a smaller image.'
    };
  }

  return { valid: true };
}

/**
 * Resize image to a maximum dimension while maintaining aspect ratio
 * @param file - Image file to resize
 * @param maxDimension - Maximum width/height (default: 512px)
 * @returns Promise resolving to base64 encoded resized image
 */
export function resizeAndEncodeImage(file: File, maxDimension: number = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 (JPEG for smaller file size, PNG for transparency)
        const mimeType = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp'
          ? 'image/png'
          : 'image/jpeg';
        const quality = 0.9;
        
        const base64 = canvas.toDataURL(mimeType, quality);
        resolve(base64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Update the browser favicon dynamically
 * @param logoData - Base64 encoded image string or emoji
 */
export function updateFavicon(logoData: string) {
  // Remove existing favicon links
  const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
  existingFavicons.forEach(link => link.remove());
  
  // If it's an emoji, convert to canvas-based favicon
  if (logoData.length <= 4 && !logoData.startsWith('data:')) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#4f46e5'; // indigo background
      ctx.fillRect(0, 0, 64, 64);
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(logoData, 32, 34);
      
      const faviconUrl = canvas.toDataURL('image/png');
      addFaviconLink(faviconUrl);
    }
  } else if (logoData.startsWith('data:')) {
    // Use the uploaded image directly
    addFaviconLink(logoData);
  }
}

/**
 * Helper to add favicon link to document head
 */
function addFaviconLink(href: string) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  document.head.appendChild(link);
  
  // Also add apple-touch-icon for iOS
  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = href;
  document.head.appendChild(appleLink);
}

/**
 * Convert a File object to base64 string
 * @param file - File to convert
 * @returns Promise resolving to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// ==================== GRADE CALCULATION UTILITIES ====================

/**
 * Calculate grade based on percentage using standard grading scale
 * @param percentage - Percentage score (0-100)
 * @returns Grade letter (A, B, C, D, F)
 */
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 75) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 45) return 'D';
  return 'F';
}

/**
 * Get grade color class for Tailwind CSS
 * @param grade - Grade letter
 * @returns Tailwind color classes
 */
export function getGradeColorClass(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400';
    case 'B':
      return 'bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400';
    case 'C':
      return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400';
    case 'D':
      return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400';
    case 'F':
      return 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
}

/**
 * Get grade description/remarks
 * @param grade - Grade letter
 * @returns Human-readable grade description
 */
export function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A':
      return 'Excellent';
    case 'B':
      return 'Good';
    case 'C':
      return 'Satisfactory';
    case 'D':
      return 'Needs Improvement';
    case 'F':
      return 'Unsatisfactory';
    default:
      return 'Not Graded';
  }
}

/**
 * Calculate overall grade from subject grades
 * @param subjectGrades - Array of grade letters
 * @returns Overall grade letter
 */
export function calculateOverallGrade(subjectGrades: string[]): string {
  if (subjectGrades.length === 0) return 'F';
  
  // Convert grades to numeric values
  const gradeValues: { [key: string]: number } = {
    'A': 95,
    'B': 82.5,
    'C': 67.5,
    'D': 52.5,
    'F': 22.5
  };
  
  const totalValue = subjectGrades.reduce((sum, grade) => {
    return sum + (gradeValues[grade] || 0);
  }, 0);
  
  const averagePercentage = totalValue / subjectGrades.length;
  return calculateGrade(averagePercentage);
}

/**
 * Get grading scale configuration
 * @returns Array of grade scale definitions
 */
export function getGradingScale(): Array<{ grade: string; min: number; max: number; description: string }> {
  return [
    { grade: 'A', min: 90, max: 100, description: 'Excellent' },
    { grade: 'B', min: 75, max: 89, description: 'Good' },
    { grade: 'C', min: 60, max: 74, description: 'Satisfactory' },
    { grade: 'D', min: 45, max: 59, description: 'Needs Improvement' },
    { grade: 'F', min: 0, max: 44, description: 'Unsatisfactory' }
  ];
}

// ==================== FEE CALCULATION UTILITIES ====================

/**
 * Calculate fee balance for a specific fee charge
 * @param feeChargeId - ID of the fee charge
 * @param feeCharge - The fee charge object
 * @param payments - Array of all payments
 * @returns Object with netCharge, totalPaid, and balance
 */
export function calculateFeeBalance(
  feeChargeId: string,
  feeCharge: { amount: number; discount: number },
  payments: Array<{ feeChargeId: string; amount: number; isVoided: boolean }>
): { netCharge: number; totalPaid: number; balance: number } {
  const netCharge = feeCharge.amount - feeCharge.discount;
  
  const totalPaid = payments
    .filter(p => p.feeChargeId === feeChargeId && !p.isVoided)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const balance = Math.max(0, netCharge - totalPaid);
  
  return { netCharge, totalPaid, balance };
}

/**
 * Update fee charge status based on payments
 * @param feeCharge - Fee charge to update
 * @param balance - Current balance
 * @returns Updated status
 */
export function calculateFeeStatus(
  feeCharge: { amount: number; discount: number; dueDate: string },
  balance: number
): 'paid' | 'partially_paid' | 'unpaid' | 'overdue' {
  const netCharge = feeCharge.amount - feeCharge.discount;
  const today = new Date().toISOString().split('T')[0];
  
  if (balance === 0) {
    return 'paid';
  } else if (balance < netCharge) {
    return 'partially_paid';
  } else if (feeCharge.dueDate < today) {
    return 'overdue';
  } else {
    return 'unpaid';
  }
}

/**
 * Generate unique receipt number
 * @param prefix - Receipt prefix (default: 'REC')
 * @param year - Year (default: current year)
 * @param sequence - Sequence number
 * @returns Formatted receipt number
 */
export function generateReceiptNumber(
  prefix: string = 'REC',
  year?: number,
  sequence?: number
): string {
  const currentYear = year || new Date().getFullYear();
  const seq = sequence || Math.floor(Math.random() * 9999) + 1;
  return `${prefix}-${currentYear}-${seq.toString().padStart(4, '0')}`;
}

/**
 * Validate payment amount
 * @param amount - Payment amount
 * @param balance - Outstanding balance
 * @returns Validation result
 */
export function validatePaymentAmount(
  amount: number,
  balance: number
): { valid: boolean; error?: string } {
  if (isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: 'Payment amount must be a valid number' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than zero' };
  }
  
  if (amount > balance * 1.1) {
    // Allow 10% overpayment for rounding/advance payment
    return { valid: false, error: `Payment amount exceeds outstanding balance by more than 10%` };
  }
  
  return { valid: true };
}

/**
 * Format currency amount
 * @param amount - Amount to format
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = '$'): string {
  return `${currency}${amount.toFixed(2)}`;
}

// ==================== ATTENDANCE CALCULATIONS ====================

/**
 * Calculate attendance percentage using the standard formula:
 * Attendance % = (Present + Late) / (Present + Absent + Late) × 100
 * 
 * Approved leave records are excluded from both numerator and denominator.
 * This reflects actual attendance vs. expected attendance.
 * 
 * @param present - Count of present records
 * @param absent - Count of absent records
 * @param late - Count of late records
 * @param leave - Count of leave records (not used in calculation, for reference)
 * @returns Attendance percentage (0-100) or null if no applicable records
 */
export function calculateAttendancePercentage(
  present: number,
  absent: number,
  late: number,
  leave: number
): number | null {
  // Denominator: Present + Absent + Late (excludes approved leave)
  const denominator = present + absent + late;
  
  // Handle zero denominator (no attendance records or only leave records)
  if (denominator === 0) {
    return null;
  }
  
  // Numerator: Present + Late (students who attended, even if late)
  const numerator = present + late;
  
  // Calculate percentage
  const percentage = (numerator / denominator) * 100;
  
  return Math.round(percentage);
}

/**
 * Get attendance statistics summary for a set of attendance records
 * @param records - Array of attendance records to analyze
 * @returns Object with counts and calculated percentage
 */
export function getAttendanceStats(records: { status: 'present' | 'absent' | 'late' | 'leave' }[]) {
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const leave = records.filter(r => r.status === 'leave').length;
  const total = records.length;
  
  const percentage = calculateAttendancePercentage(present, absent, late, leave);
  
  return {
    present,
    absent,
    late,
    leave,
    total,
    percentage,
    hasRecords: total > 0
  };
}

/**
 * Calculate fee statistics
 * @param feeCharges - Array of fee charges
 * @param payments - Array of payments
 * @param calculateBalance - Balance calculation function
 * @returns Fee statistics object
 */
export function calculateFeeStatistics(
  feeCharges: Array<any>,
  payments: Array<any>,
  calculateBalance: (feeChargeId: string) => { balance: number }
): {
  totalOutstanding: number;
  totalPaid: number;
  totalOverdue: number;
  studentsWithDues: number;
  paymentsThisMonth: number;
  overdueCount: number;
} {
  let totalOutstanding = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  const studentsWithDues = new Set<string>();
  let overdueCount = 0;
  
  const today = new Date().toISOString().split('T')[0];
  
  feeCharges.forEach(charge => {
    const { balance } = calculateBalance(charge.id);
    totalOutstanding += balance;
    
    if (balance > 0) {
      studentsWithDues.add(charge.studentId);
      
      if (charge.dueDate < today) {
        totalOverdue += balance;
        overdueCount++;
      }
    }
  });
  
  payments.filter(p => !p.isVoided).forEach(payment => {
    totalPaid += payment.amount;
  });
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paymentsThisMonth = payments.filter(p => 
    !p.isVoided && p.paymentDate.startsWith(thisMonth)
  ).reduce((sum, p) => sum + p.amount, 0);
  
  return {
    totalOutstanding,
    totalPaid,
    totalOverdue,
    studentsWithDues: studentsWithDues.size,
    paymentsThisMonth,
    overdueCount
  };
}

// ==================== BACKUP VALIDATION UTILITIES ====================

import type { ValidationResult, ValidationIssue, BackupData, BackupMetadata } from './types';

/**
 * Comprehensive backup validation function
 * Validates JSON syntax, format version, structure, record shapes, IDs, and referential integrity
 * @param fileContent - Raw file content string
 * @returns ValidationResult with detailed issues
 */
export function validateBackup(fileContent: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  let parsed: any;
  let isLegacyFormat = false;
  let detectedFormatVersion = 'unknown';
  let metadata: BackupMetadata | undefined;

  // Step 1: JSON Syntax Validation
  try {
    parsed = JSON.parse(fileContent);
  } catch (err) {
    issues.push({
      severity: 'error',
      message: `Invalid JSON syntax: ${err instanceof Error ? err.message : 'Unable to parse file'}`,
    });
    return {
      isValid: false,
      issues,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      isLegacyFormat: false,
      detectedFormatVersion: 'invalid',
    };
  }

  // Step 2: Format Version Detection
  if (parsed.metadata?.backupFormatVersion) {
    detectedFormatVersion = parsed.metadata.backupFormatVersion;
    metadata = parsed.metadata;
    isLegacyFormat = false;
  } else if (parsed.version === '1.0' && parsed.exportedAt) {
    detectedFormatVersion = '1.0';
    isLegacyFormat = true;
    issues.push({
      severity: 'info',
      message: 'Legacy backup format (v1.0) detected. Missing metadata section.',
    });
  } else {
    issues.push({
      severity: 'error',
      message: 'Unknown backup format. Missing both metadata.backupFormatVersion and legacy version marker.',
    });
    return {
      isValid: false,
      issues,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      isLegacyFormat: false,
      detectedFormatVersion: 'unknown',
    };
  }

  // Step 3: Validate Required Top-Level Structure
  const requiredCoreStores = ['students', 'classes', 'subjects', 'attendance'];
  const allStores = [
    'students', 'teachers', 'classes', 'subjects', 'attendance', 'sessions',
    'logs', 'settings', 'notifications', 'homework', 'announcements', 'results',
    'studentLogins', 'examinations', 'feeCategories', 'feeCharges', 'payments',
    'feeReminders', 'users', 'teacherAssignments'
  ];

  for (const store of requiredCoreStores) {
    if (!parsed[store]) {
      issues.push({
        severity: 'error',
        store,
        message: `Required store '${store}' is missing from backup.`,
      });
    } else if (!Array.isArray(parsed[store])) {
      issues.push({
        severity: 'error',
        store,
        message: `Store '${store}' must be an array.`,
      });
    }
  }

  // Check for optional stores and warn if missing (v2.0 format only)
  if (!isLegacyFormat) {
    for (const store of allStores) {
      if (!requiredCoreStores.includes(store) && !parsed[store]) {
        issues.push({
          severity: 'warning',
          store,
          message: `Optional store '${store}' is missing. This may indicate an incomplete backup.`,
        });
      }
    }
  }

  // Step 4: Validate Record Shapes and Required Fields
  const validateRecords = (storeName: string, records: any[], requiredFields: string[]) => {
    if (!Array.isArray(records)) return;

    const seenIds = new Set<string>();
    
    records.forEach((record, index) => {
      // Check required fields
      for (const field of requiredFields) {
        if (record[field] === undefined || record[field] === null || record[field] === '') {
          issues.push({
            severity: 'error',
            store: storeName,
            recordId: record.id || `index-${index}`,
            field,
            message: `Record at index ${index} is missing required field '${field}'.`,
          });
        }
      }

      // Check for duplicate IDs
      if (record.id) {
        if (seenIds.has(record.id)) {
          issues.push({
            severity: 'error',
            store: storeName,
            recordId: record.id,
            message: `Duplicate ID '${record.id}' found in store '${storeName}'.`,
          });
        }
        seenIds.add(record.id);
      } else {
        issues.push({
          severity: 'error',
          store: storeName,
          recordId: `index-${index}`,
          message: `Record at index ${index} is missing 'id' field.`,
        });
      }

      // Validate numeric fields
      const numericFields: { [key: string]: string[] } = {
        attendance: ['updatedAt'],
        logs: ['timestamp'],
        students: ['registeredAt'],
        teachers: ['registeredAt'],
        results: ['totalObtained', 'totalMaxMarks', 'percentage', 'createdAt', 'updatedAt'],
        examinations: ['maxMarks', 'createdAt'],
        feeCategories: ['createdAt'],
        feeCharges: ['amount', 'discount', 'createdAt', 'updatedAt'],
        payments: ['amount', 'createdAt'],
        feeReminders: ['sentAt'],
        users: ['createdAt'],
        teacherAssignments: ['assignedAt'],
        notifications: ['createdAt'],
        homework: ['createdAt'],
        announcements: ['createdAt'],
        studentLogins: ['loginAt'],
      };

      if (numericFields[storeName]) {
        for (const field of numericFields[storeName]) {
          if (record[field] !== undefined && (typeof record[field] !== 'number' || isNaN(record[field]))) {
            issues.push({
              severity: 'error',
              store: storeName,
              recordId: record.id,
              field,
              message: `Field '${field}' must be a valid number.`,
            });
          }
        }
      }

      // Validate date fields (YYYY-MM-DD format)
      const dateFields: { [key: string]: string[] } = {
        attendance: ['date'],
        feeCharges: ['dueDate'],
        payments: ['paymentDate'],
        examinations: ['examDate'],
        results: ['examDate'],
        homework: ['dueDate', 'assignedDate'],
        announcements: ['publishedDate'],
      };

      if (dateFields[storeName]) {
        for (const field of dateFields[storeName]) {
          if (record[field] && !/^\d{4}-\d{2}-\d{2}$/.test(record[field])) {
            issues.push({
              severity: 'warning',
              store: storeName,
              recordId: record.id,
              field,
              message: `Field '${field}' should be in YYYY-MM-DD format.`,
            });
          }
        }
      }
    });
  };

  // Validate each store
  if (parsed.students) validateRecords('students', parsed.students, ['id', 'name', 'studentId', 'classId']);
  if (parsed.teachers) validateRecords('teachers', parsed.teachers, ['id', 'name', 'teacherId', 'email']);
  if (parsed.classes) validateRecords('classes', parsed.classes, ['id', 'name', 'section']);
  if (parsed.subjects) validateRecords('subjects', parsed.subjects, ['id', 'name']);
  if (parsed.attendance) validateRecords('attendance', parsed.attendance, ['id', 'studentId', 'classId', 'subjectId', 'date', 'status']);
  if (parsed.examinations) validateRecords('examinations', parsed.examinations, ['id', 'name', 'examDate']);
  if (parsed.results) validateRecords('results', parsed.results, ['id', 'studentId', 'examinationId']);
  if (parsed.feeCategories) validateRecords('feeCategories', parsed.feeCategories, ['id', 'name']);
  if (parsed.feeCharges) validateRecords('feeCharges', parsed.feeCharges, ['id', 'studentId', 'categoryId', 'amount']);
  if (parsed.payments) validateRecords('payments', parsed.payments, ['id', 'feeChargeId', 'studentId', 'amount']);
  if (parsed.users) validateRecords('users', parsed.users, ['id', 'username', 'role']);

  // Step 5: Referential Integrity Checks
  if (parsed.students && parsed.classes) {
    const classIds = new Set(parsed.classes.map((c: any) => c.id));
    parsed.students.forEach((student: any, index: number) => {
      if (student.classId && !classIds.has(student.classId)) {
        issues.push({
          severity: 'warning',
          store: 'students',
          recordId: student.id,
          field: 'classId',
          message: `Student references non-existent class '${student.classId}'.`,
        });
      }
    });
  }

  if (parsed.attendance && parsed.students && parsed.classes && parsed.subjects) {
    const studentIds = new Set(parsed.students.map((s: any) => s.id));
    const classIds = new Set(parsed.classes.map((c: any) => c.id));
    const subjectIds = new Set(parsed.subjects.map((s: any) => s.id));

    parsed.attendance.forEach((att: any) => {
      if (att.studentId && !studentIds.has(att.studentId)) {
        issues.push({
          severity: 'warning',
          store: 'attendance',
          recordId: att.id,
          field: 'studentId',
          message: `Attendance record references non-existent student '${att.studentId}'.`,
        });
      }
      if (att.classId && !classIds.has(att.classId)) {
        issues.push({
          severity: 'warning',
          store: 'attendance',
          recordId: att.id,
          field: 'classId',
          message: `Attendance record references non-existent class '${att.classId}'.`,
        });
      }
      if (att.subjectId && !subjectIds.has(att.subjectId)) {
        issues.push({
          severity: 'warning',
          store: 'attendance',
          recordId: att.id,
          field: 'subjectId',
          message: `Attendance record references non-existent subject '${att.subjectId}'.`,
        });
      }
    });
  }

  if (parsed.feeCharges && parsed.students) {
    const studentIds = new Set(parsed.students.map((s: any) => s.id));
    parsed.feeCharges.forEach((charge: any) => {
      if (charge.studentId && !studentIds.has(charge.studentId)) {
        issues.push({
          severity: 'warning',
          store: 'feeCharges',
          recordId: charge.id,
          field: 'studentId',
          message: `Fee charge references non-existent student '${charge.studentId}'.`,
        });
      }
    });
  }

  if (parsed.payments && parsed.feeCharges && parsed.students) {
    const feeChargeIds = new Set(parsed.feeCharges.map((fc: any) => fc.id));
    const studentIds = new Set(parsed.students.map((s: any) => s.id));
    
    parsed.payments.forEach((payment: any) => {
      if (payment.feeChargeId && !feeChargeIds.has(payment.feeChargeId)) {
        issues.push({
          severity: 'warning',
          store: 'payments',
          recordId: payment.id,
          field: 'feeChargeId',
          message: `Payment references non-existent fee charge '${payment.feeChargeId}'.`,
        });
      }
      if (payment.studentId && !studentIds.has(payment.studentId)) {
        issues.push({
          severity: 'warning',
          store: 'payments',
          recordId: payment.id,
          field: 'studentId',
          message: `Payment references non-existent student '${payment.studentId}'.`,
        });
      }
    });
  }

  if (parsed.teacherAssignments && parsed.teachers && parsed.classes && parsed.subjects) {
    const teacherIds = new Set(parsed.teachers.map((t: any) => t.id));
    const classIds = new Set(parsed.classes.map((c: any) => c.id));
    const subjectIds = new Set(parsed.subjects.map((s: any) => s.id));

    parsed.teacherAssignments.forEach((assignment: any) => {
      if (assignment.teacherId && !teacherIds.has(assignment.teacherId)) {
        issues.push({
          severity: 'warning',
          store: 'teacherAssignments',
          recordId: assignment.id,
          field: 'teacherId',
          message: `Assignment references non-existent teacher '${assignment.teacherId}'.`,
        });
      }
      if (assignment.classId && !classIds.has(assignment.classId)) {
        issues.push({
          severity: 'warning',
          store: 'teacherAssignments',
          recordId: assignment.id,
          field: 'classId',
          message: `Assignment references non-existent class '${assignment.classId}'.`,
        });
      }
      if (assignment.subjectId && !subjectIds.has(assignment.subjectId)) {
        issues.push({
          severity: 'warning',
          store: 'teacherAssignments',
          recordId: assignment.id,
          field: 'subjectId',
          message: `Assignment references non-existent subject '${assignment.subjectId}'.`,
        });
      }
    });
  }

  // Step 6: Metadata Validation (v2.0 format)
  if (!isLegacyFormat && metadata) {
    if (!metadata.createdAt || typeof metadata.createdAt !== 'number') {
      issues.push({
        severity: 'warning',
        message: 'Backup metadata is missing valid createdAt timestamp.',
      });
    }

    if (!metadata.dbSchemaVersion || typeof metadata.dbSchemaVersion !== 'number') {
      issues.push({
        severity: 'warning',
        message: 'Backup metadata is missing valid dbSchemaVersion.',
      });
    }

    if (metadata.recordCounts) {
      // Verify record counts match actual data
      for (const store of allStores) {
        if (parsed[store] && Array.isArray(parsed[store])) {
          const actualCount = parsed[store].length;
          const metadataCount = metadata.recordCounts[store as keyof typeof metadata.recordCounts];
          
          if (metadataCount !== actualCount) {
            issues.push({
              severity: 'warning',
              store,
              message: `Metadata reports ${metadataCount} records but actual count is ${actualCount}.`,
            });
          }
        }
      }
    }
  }

  // Calculate issue counts
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
    isLegacyFormat,
    detectedFormatVersion,
    metadata,
  };
}

/**
 * Preview backup file contents without modifying database
 * @param fileContent - Raw file content string
 * @returns RestorePreview with metadata and validation
 */
export function previewBackup(fileContent: string): any {
  const validation = validateBackup(fileContent);
  
  if (!validation.isValid) {
    return {
      backupDate: null,
      backupFormatVersion: validation.detectedFormatVersion,
      dbSchemaVersion: null,
      recordCounts: {},
      includesAppSettings: false,
      validation,
    };
  }

  const parsed = JSON.parse(fileContent);
  
  // Extract metadata
  let backupDate: Date | null = null;
  let dbSchemaVersion: number | null = null;
  
  if (parsed.metadata?.createdAt) {
    backupDate = new Date(parsed.metadata.createdAt);
    dbSchemaVersion = parsed.metadata.dbSchemaVersion || null;
  } else if (parsed.exportedAt) {
    backupDate = new Date(parsed.exportedAt);
  }

  // Count records
  const recordCounts: any = {};
  const stores = [
    'students', 'teachers', 'classes', 'subjects', 'attendance', 'sessions',
    'logs', 'settings', 'notifications', 'homework', 'announcements', 'results',
    'studentLogins', 'examinations', 'feeCategories', 'feeCharges', 'payments',
    'feeReminders', 'users', 'teacherAssignments'
  ];

  for (const store of stores) {
    recordCounts[store] = Array.isArray(parsed[store]) ? parsed[store].length : 0;
  }

  return {
    backupDate,
    backupFormatVersion: validation.detectedFormatVersion,
    dbSchemaVersion,
    recordCounts,
    includesAppSettings: !!parsed.appSettings,
    validation,
  };
}
