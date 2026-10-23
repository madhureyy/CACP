import { FileEntry, AssetType, RecommendedAction } from '../types';
import {
  GCS_PRICE_PER_GB_MONTH,
  DELETE_AGE_MONTHS,
  ARCHIVE_AGE_MONTHS,
  LARGE_FILE_THRESHOLD_GB,
} from '../config/constants';

interface UVGSequenceDef {
  name: string;
  resolution: string;
  fps: number;
  frames: number;
  durationSec: number;
  size8bitGiB: number;
  size10bitGiB: number;
  motion: string;
  texture: string;
  contrast: string;
}

export const UVG_SEQUENCES: UVGSequenceDef[] = [
  { name: 'Beauty', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 3.87, size10bitGiB: 3.98, motion: 'Slow / plenty', texture: 'Complex', contrast: 'High' },
  { name: 'Bosphorus', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 2.66, size10bitGiB: 2.67, motion: 'Slow / plenty', texture: 'Complex', contrast: 'Low' },
  { name: 'CityAlley', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 3.16, size10bitGiB: 3.28, motion: 'Slow / little', texture: 'Complex', contrast: 'High' },
  { name: 'FlowerFocus', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 3.46, size10bitGiB: 3.51, motion: 'Slow / little', texture: 'Smooth', contrast: 'Low' },
  { name: 'FlowerKids', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 2.87, size10bitGiB: 2.98, motion: 'Slow / plenty', texture: 'Complex', contrast: 'High' },
  { name: 'FlowerPan', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 4.05, size10bitGiB: 4.18, motion: 'Slow / little', texture: 'Complex', contrast: 'Low' },
  { name: 'HoneyBee', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 3.51, size10bitGiB: 3.60, motion: 'Fast / little', texture: 'Complex', contrast: 'Low' },
  { name: 'Jockey', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 3.22, size10bitGiB: 3.27, motion: 'Fast / plenty', texture: 'Smooth', contrast: 'High' },
  { name: 'Lips', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 3.13, size10bitGiB: 3.18, motion: 'Slow / little', texture: 'Smooth', contrast: 'High' },
  { name: 'RaceNight', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 3.20, size10bitGiB: 3.27, motion: 'Fast / plenty', texture: 'Smooth', contrast: 'High' },
  { name: 'ReadySetGo', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 3.06, size10bitGiB: 3.13, motion: 'Fast / plenty', texture: 'Complex', contrast: 'High' },
  { name: 'RiverBank', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 3.15, size10bitGiB: 3.25, motion: 'Slow / little', texture: 'Complex', contrast: 'High' },
  { name: 'ShakeNDry', resolution: '3840x2160', fps: 120, frames: 300, durationSec: 2.5, size8bitGiB: 1.75, size10bitGiB: 1.75, motion: 'Slow / plenty', texture: 'Complex', contrast: 'Low' },
  { name: 'SunBath', resolution: '3840x2160', fps: 50, frames: 300, durationSec: 6.0, size8bitGiB: 1.85, size10bitGiB: 1.90, motion: 'Slow / plenty', texture: 'Smooth', contrast: 'High' },
  { name: 'Twilight', resolution: '3840x2160', fps: 50, frames: 600, durationSec: 12.0, size8bitGiB: 3.10, size10bitGiB: 3.20, motion: 'Slow / little', texture: 'Smooth', contrast: 'High' },
  { name: 'YachtRide', resolution: '3840x2160', fps: 120, frames: 600, durationSec: 5.0, size8bitGiB: 2.68, size10bitGiB: 2.62, motion: 'Fast / plenty', texture: 'Complex', contrast: 'High' },
];

export function generateMockFiles(): FileEntry[] {
  const files: FileEntry[] = [];
  const now = new Date('2026-09-01T00:00:00Z');

  const getRecommendedAction = (
    assetType: AssetType,
    ageMonths: number,
    sizeGB: number,
    isDuplicate: boolean
  ): RecommendedAction => {
    if (assetType === 'AE/CapCut Cache' || (isDuplicate && assetType === 'Duplicate/Old Version')) {
      return 'Delete';
    }
    if (sizeGB > LARGE_FILE_THRESHOLD_GB && ageMonths > DELETE_AGE_MONTHS) {
      return 'Delete';
    }
    if (ageMonths > ARCHIVE_AGE_MONTHS && ageMonths <= DELETE_AGE_MONTHS) {
      return 'Archive';
    }
    if (sizeGB > 5 && ageMonths <= ARCHIVE_AGE_MONTHS) {
      return 'Move Offline';
    }
    return 'Keep';
  };

  const createEntry = (params: {
    id: string;
    filename: string;
    path: string;
    extension: string;
    sizeGB: number;
    ageMonths: number;
    assetType: AssetType;
    isDuplicate?: boolean;
    baseFilename?: string;
    seq?: UVGSequenceDef;
  }): FileEntry => {
    const { id, filename, path, extension, sizeGB, ageMonths, assetType, isDuplicate = false, baseFilename, seq } = params;
    const sizeBytes = Math.round(sizeGB * 1024 * 1024 * 1024);
    const createdAt = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000);
    const recommendedAction = getRecommendedAction(assetType, ageMonths, sizeGB, isDuplicate);
    const flaggedForReview = !isDuplicate && ageMonths >= ARCHIVE_AGE_MONTHS && sizeGB >= LARGE_FILE_THRESHOLD_GB;

    return {
      id,
      filename,
      path,
      extension,
      sizeBytes,
      sizeGB: Number(sizeGB.toFixed(3)),
      createdAt,
      ageMonths,
      assetType,
      recommendedAction,
      monthlyCost: Number((sizeGB * GCS_PRICE_PER_GB_MONTH).toFixed(2)),
      annualCarbonKg: 0,
      isDuplicate,
      baseFilename,
      flaggedForReview,
      uvgSequenceName: seq?.name,
      uvgResolution: seq?.resolution,
      uvgFps: seq?.fps,
      uvgFrames: seq?.frames,
      uvgMotion: seq?.motion,
      uvgTexture: seq?.texture,
      uvgContrast: seq?.contrast,
    };
  };

  // 1. Official UVG 4K 8-bit YUV Raw Master Sequences (16 files)
  UVG_SEQUENCES.forEach((seq, idx) => {
    const ageMonths = ((idx * 2) % 20) + 1;
    files.push(
      createEntry({
        id: `uvg_official_8bit_${seq.name.toLowerCase()}`,
        filename: `${seq.name}_3840x2160_${seq.fps}fps_8bit_raw.yuv`,
        path: `/UVG_4K_Dataset/${seq.name}_3840x2160_${seq.fps}fps_8bit_raw.yuv`,
        extension: '.yuv',
        sizeGB: seq.size8bitGiB,
        ageMonths,
        assetType: '4K Video',
        seq,
      })
    );
  });

  // 2. Official UVG 4K 10-bit YUV Raw Masters / High Dynamic Range (16 files)
  UVG_SEQUENCES.forEach((seq, idx) => {
    const ageMonths = ((idx * 3) % 22) + 2;
    files.push(
      createEntry({
        id: `uvg_official_10bit_${seq.name.toLowerCase()}`,
        filename: `${seq.name}_3840x2160_${seq.fps}fps_10bit_raw.yuv`,
        path: `/UVG_4K_Dataset/10Bit_Masters/${seq.name}_3840x2160_${seq.fps}fps_10bit_raw.yuv`,
        extension: '.yuv',
        sizeGB: seq.size10bitGiB,
        ageMonths,
        assetType: seq.size10bitGiB > 4.0 ? '8K Video' : '4K Video',
        seq,
      })
    );
  });

  // 3. Simulated Inventory Variant Copies from UVG Dataset CSV (20 files)
  const duplicateVariants = [
    { name: 'Beauty', bit: '8BIT', size: 3.87 },
    { name: 'Beauty', bit: '10BIT', size: 3.98 },
    { name: 'Bosphorus', bit: '8BIT', size: 2.66 },
    { name: 'Bosphorus', bit: '10BIT', size: 2.67 },
    { name: 'CityAlley', bit: '8BIT', size: 3.16 },
    { name: 'CityAlley', bit: '10BIT', size: 3.28 },
    { name: 'FlowerFocus', bit: '8BIT', size: 3.46 },
    { name: 'FlowerFocus', bit: '10BIT', size: 3.51 },
    { name: 'FlowerKids', bit: '8BIT', size: 2.87 },
    { name: 'FlowerKids', bit: '10BIT', size: 2.98 },
    { name: 'FlowerPan', bit: '8BIT', size: 4.05 },
    { name: 'FlowerPan', bit: '10BIT', size: 4.18 },
    { name: 'HoneyBee', bit: '8BIT', size: 3.51 },
    { name: 'HoneyBee', bit: '10BIT', size: 3.60 },
    { name: 'Jockey', bit: '8BIT', size: 3.22 },
    { name: 'Jockey', bit: '10BIT', size: 3.27 },
    { name: 'Lips', bit: '8BIT', size: 3.13 },
    { name: 'Lips', bit: '10BIT', size: 3.18 },
    { name: 'RaceNight', bit: '8BIT', size: 3.20 },
    { name: 'RaceNight', bit: '10BIT', size: 3.27 },
  ];

  duplicateVariants.forEach((variant, idx) => {
    const seq = UVG_SEQUENCES.find(s => s.name === variant.name);
    const ageMonths = (idx % 14) + 6;
    files.push(
      createEntry({
        id: `uvg_dup_${variant.name.toLowerCase()}_${variant.bit.toLowerCase()}`,
        filename: `${variant.name}_${variant.bit}_inventory_copy.yuv`,
        path: `/UVG_4K_Dataset/Inventory_Copies/${variant.name}_${variant.bit}_inventory_copy.yuv`,
        extension: '.yuv',
        sizeGB: variant.size,
        ageMonths,
        assetType: 'Duplicate/Old Version',
        isDuplicate: true,
        baseFilename: `${variant.name}_3840x2160_raw`,
        seq,
      })
    );
  });

  // 4. UVG Benchmark Video Encodes (ProRes / HEVC) (16 files)
  UVG_SEQUENCES.forEach((seq, idx) => {
    const isProRes = idx % 2 === 0;
    const ext = isProRes ? '.mov' : '.mp4';
    const tag = isProRes ? 'ProRes422HQ' : 'HEVC_Main10';
    const sizeGB = isProRes ? Number((seq.size8bitGiB * 0.45).toFixed(2)) : Number((seq.size8bitGiB * 0.12).toFixed(2));
    const ageMonths = ((idx * 3) % 18) + 1;

    files.push(
      createEntry({
        id: `uvg_encode_${seq.name.toLowerCase()}`,
        filename: `${seq.name}_4K_${tag}${ext}`,
        path: `/UVG_4K_Dataset/Encodes/${seq.name}_4K_${tag}${ext}`,
        extension: ext,
        sizeGB,
        ageMonths,
        assetType: '4K Video',
        seq,
      })
    );
  });

  // 5. UVG Sequence Conforms & Motion Analysis Projects (10 files)
  UVG_SEQUENCES.slice(0, 10).forEach((seq, idx) => {
    const isAep = idx % 2 === 0;
    const ext = isAep ? '.aep' : '.prproj';
    const tool = isAep ? 'MotionVFX' : 'GradingConform';
    const sizeGB = Number((1.2 + (idx * 0.25)).toFixed(2));
    const ageMonths = (idx % 12) + 2;

    files.push(
      createEntry({
        id: `uvg_project_${seq.name.toLowerCase()}`,
        filename: `UVG_${seq.name}_4K_${tool}${ext}`,
        path: `/UVG_4K_Dataset/Projects/UVG_${seq.name}_4K_${tool}${ext}`,
        extension: ext,
        sizeGB,
        ageMonths,
        assetType: 'AE/CapCut Project',
        seq,
      })
    );
  });

  // 6. UVG Audio/Video Peak & Render Cache Files (12 files)
  UVG_SEQUENCES.slice(0, 12).forEach((seq, idx) => {
    const ext = ['.cfa', '.pek', '.tmp'][idx % 3];
    const sizeGB = Number((0.45 + (idx * 0.18)).toFixed(3));
    const ageMonths = (idx % 10) + 1;

    files.push(
      createEntry({
        id: `uvg_cache_${seq.name.toLowerCase()}`,
        filename: `UVG_${seq.name}_4K_RenderCache_${idx + 1}${ext}`,
        path: `/UVG_4K_Dataset/Cache/UVG_${seq.name}_4K_RenderCache_${idx + 1}${ext}`,
        extension: ext,
        sizeGB,
        ageMonths,
        assetType: 'AE/CapCut Cache',
        seq,
      })
    );
  });

  // 7. UVG Extracted High-Resolution Reference Stills / Plates (10 files)
  UVG_SEQUENCES.slice(0, 10).forEach((seq, idx) => {
    const ext = ['.CR2', '.ARW', '.NEF'][idx % 3];
    const sizeGB = Number((0.045 + (idx * 0.005)).toFixed(4));
    const ageMonths = (idx % 8) + 1;

    files.push(
      createEntry({
        id: `uvg_plate_${seq.name.toLowerCase()}`,
        filename: `UVG_${seq.name}_Frame001_ReferencePlate${ext}`,
        path: `/UVG_4K_Dataset/KeyframePlates/UVG_${seq.name}_Frame001_ReferencePlate${ext}`,
        extension: ext,
        sizeGB,
        ageMonths,
        assetType: 'RAW Image',
        seq,
      })
    );
  });

  return files;
}
