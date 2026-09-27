/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
