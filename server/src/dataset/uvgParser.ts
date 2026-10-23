import fs from 'fs';
import path from 'path';

export interface UVGSequenceRecord {
  dataset_name: string;
  record_type: 'official_sequence_metadata' | 'simulated_inventory_variant';
  sequence_name: string;
  resolution: string;
  width_px: number;
  height_px: number;
  frame_rate_fps: number;
  frame_count: number;
  duration_seconds: number;
  bit_depth_options: string;
  motion: string;
  texture: string;
  contrast: string;
  scene_description: string;
  format_family: string;
  size_8bit_yuv_gib: number | null;
  size_10bit_yuv_gib: number | null;
  file_size_note: string;
  license_note: string;
  official_source_url: string;
}

/**
 * Robust CSV parser that handles quotes, commas, and escapes
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function loadUVGDataset(csvPath?: string): UVGSequenceRecord[] {
  const targetPath = csvPath || path.resolve(process.cwd(), 'UVG_4K_video_dataset.csv');
  if (!fs.existsSync(targetPath)) {
    console.warn(`UVG dataset CSV not found at ${targetPath}`);
    return [];
  }

  const rawContent = fs.readFileSync(targetPath, 'utf-8');
  const rows = parseCSV(rawContent);

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const records: UVGSequenceRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const rowObj: any = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index] || '';
    });

    const size8Bit = rowObj['size_8bit_yuv_gib'] ? parseFloat(rowObj['size_8bit_yuv_gib']) : null;
    const size10Bit = rowObj['size_10bit_yuv_gib'] ? parseFloat(rowObj['size_10bit_yuv_gib']) : null;

    records.push({
      dataset_name: rowObj['dataset_name'] || 'UVG 4K Video Dataset',
      record_type: (rowObj['record_type'] || 'official_sequence_metadata') as any,
      sequence_name: rowObj['sequence_name'],
      resolution: rowObj['resolution'] || '3840x2160',
      width_px: parseInt(rowObj['width_px'], 10) || 3840,
      height_px: parseInt(rowObj['height_px'], 10) || 2160,
      frame_rate_fps: parseFloat(rowObj['frame_rate_fps']) || 50,
      frame_count: parseInt(rowObj['frame_count'], 10) || 600,
      duration_seconds: parseFloat(rowObj['duration_seconds']) || 12.0,
      bit_depth_options: rowObj['bit_depth_options'] || '8-bit and 10-bit',
      motion: rowObj['motion'] || 'Normal',
      texture: rowObj['texture'] || 'Normal',
      contrast: rowObj['contrast'] || 'Normal',
      scene_description: rowObj['scene_description'] || '',
      format_family: rowObj['format_family'] || 'YUV raw',
      size_8bit_yuv_gib: isNaN(size8Bit as number) ? null : size8Bit,
      size_10bit_yuv_gib: isNaN(size10Bit as number) ? null : size10Bit,
      file_size_note: rowObj['file_size_note'] || '',
      license_note: rowObj['license_note'] || '',
      official_source_url: rowObj['official_source_url'] || 'https://tie-ultravideo.rd.tuni.fi/dataset.html',
    });
  }

  return records;
}
