import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { loadUVGDataset, UVGSequenceRecord } from '../dataset/uvgParser';
import { calculateStorageEmissions } from '../carbon/carbonEngine';

let db: DatabaseSync | null = null;

const DB_PATH = path.resolve(process.cwd(), 'cacp.sqlite');

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT DEFAULT 'local',
      avatar TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cloud_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      bucket_name TEXT NOT NULL,
      region TEXT DEFAULT 'US',
      is_connected INTEGER DEFAULT 1,
      last_synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      bucket TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      extension TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      size_gb REAL NOT NULL,
      created_at TEXT NOT NULL,
      age_months INTEGER NOT NULL,
      asset_type TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      monthly_cost REAL NOT NULL,
      annual_carbon_kg REAL NOT NULL,
      is_duplicate INTEGER DEFAULT 0,
      base_filename TEXT,
      flagged_for_review INTEGER DEFAULT 0,
      uvg_sequence_name TEXT,
      uvg_motion TEXT,
      uvg_texture TEXT,
      uvg_contrast TEXT,
      uvg_fps REAL,
      uvg_frames INTEGER,
      uvg_resolution TEXT
    );

    CREATE TABLE IF NOT EXISTS uvg_dataset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_name TEXT NOT NULL,
      record_type TEXT NOT NULL,
      resolution TEXT NOT NULL,
      width_px INTEGER,
      height_px INTEGER,
      frame_rate_fps REAL,
      frame_count INTEGER,
      duration_seconds REAL,
      bit_depth_options TEXT,
      motion TEXT,
      texture TEXT,
      contrast TEXT,
      scene_description TEXT,
      format_family TEXT,
      size_8bit_yuv_gib REAL,
      size_10bit_yuv_gib REAL,
      file_size_note TEXT,
      license_note TEXT,
      official_source_url TEXT
    );

    CREATE TABLE IF NOT EXISTS historical_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      month TEXT NOT NULL,
      storage_gb REAL NOT NULL,
      file_count INTEGER NOT NULL,
      cost REAL NOT NULL,
      carbon_kg REAL NOT NULL
    );
  `);

  seedData(database);
}

function seedData(database: DatabaseSync): void {
  // 1. Seed demo user
  const userCheck = database.prepare('SELECT id FROM users WHERE email = ?').all('demo@example.com');
  let userId = 'user_demo_1';
  if (userCheck.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);
    database.prepare(`
      INSERT INTO users (id, email, password_hash, name, provider, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      'demo@example.com',
      passwordHash,
      'Alex Mercer (Production Lead)',
      'local',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
      new Date().toISOString()
    );
  } else {
    userId = (userCheck[0] as any).id;
  }

  // 2. Seed UVG dataset records
  const uvgCheck = database.prepare('SELECT count(*) as count FROM uvg_dataset').all();
  const uvgCount = (uvgCheck[0] as any)?.count || 0;

  let uvgRecords: UVGSequenceRecord[] = [];
  if (uvgCount === 0) {
    uvgRecords = loadUVGDataset();
    const insertUvg = database.prepare(`
      INSERT INTO uvg_dataset (
        sequence_name, record_type, resolution, width_px, height_px,
        frame_rate_fps, frame_count, duration_seconds, bit_depth_options,
        motion, texture, contrast, scene_description, format_family,
        size_8bit_yuv_gib, size_10bit_yuv_gib, file_size_note, license_note, official_source_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const rec of uvgRecords) {
      insertUvg.run(
        rec.sequence_name,
        rec.record_type,
        rec.resolution,
        rec.width_px,
        rec.height_px,
        rec.frame_rate_fps,
        rec.frame_count,
        rec.duration_seconds,
        rec.bit_depth_options,
        rec.motion,
        rec.texture,
        rec.contrast,
        rec.scene_description,
        rec.format_family,
        rec.size_8bit_yuv_gib,
        rec.size_10bit_yuv_gib,
        rec.file_size_note,
        rec.license_note,
        rec.official_source_url
      );
    }
  }

  // 3. Seed files if empty
  const fileCheck = database.prepare('SELECT count(*) as count FROM files').all();
  const fileCount = (fileCheck[0] as any)?.count || 0;

  if (fileCount === 0) {
    seedFilesFromUVGAndCreatives(database, userId);
  }

  // 4. Seed historical snapshots if empty
  const historyCheck = database.prepare('SELECT count(*) as count FROM historical_snapshots').all();
  const historyCount = (historyCheck[0] as any)?.count || 0;
  if (historyCount === 0) {
    seedHistoricalData(database, userId);
  }
}

function seedFilesFromUVGAndCreatives(database: DatabaseSync, userId: string): void {
  const uvgRows = database.prepare('SELECT * FROM uvg_dataset').all() as any[];
  const insertFile = database.prepare(`
    INSERT INTO files (
      id, user_id, provider, bucket, filename, path, extension,
      size_bytes, size_gb, created_at, age_months, asset_type,
      recommended_action, monthly_cost, annual_carbon_kg, is_duplicate,
      base_filename, flagged_for_review, uvg_sequence_name, uvg_motion,
      uvg_texture, uvg_contrast, uvg_fps, uvg_frames, uvg_resolution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date('2026-09-01T00:00:00Z');

  // Helper for recommendation
  const getAction = (assetType: string, ageMonths: number, sizeGB: number, isDuplicate: boolean): string => {
    if (assetType === 'AE/CapCut Cache' || (isDuplicate && assetType === 'Duplicate/Old Version')) return 'Delete';
    if (sizeGB > 5 && ageMonths > 18) return 'Delete';
    if (ageMonths > 12 && ageMonths <= 18) return 'Archive';
    if (sizeGB > 5 && ageMonths <= 12) return 'Move Offline';
    return 'Keep';
  };

  // Seed UVG official sequences as primary 4K / 8K Video assets
  uvgRows.forEach((seq, idx) => {
    const rawGib = seq.size_8bit_yuv_gib || seq.size_10bit_yuv_gib || (seq.frame_rate_fps === 120 ? 3.5 : 2.8);
    const sizeBytes = Math.round(rawGib * 1024 * 1024 * 1024 * 1.07374);
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);

    const ageMonths = ((idx * 3) % 24) + 1;
    const createdAt = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const isDup = seq.record_type === 'simulated_inventory_variant';
    const assetType = isDup ? 'Duplicate/Old Version' : (rawGib > 10 ? '8K Video' : '4K Video');
    const action = getAction(assetType, ageMonths, sizeGB, isDup);

    const emissions = calculateStorageEmissions({ sizeGB, region: 'US', provider: 'gcs' });
    const flagged = !isDup && ageMonths >= 12 && sizeGB >= 3.0 ? 1 : 0;

    insertFile.run(
      `uvg_file_${idx + 1}`,
      userId,
      'gcs',
      'cacp-production-assets',
      `${seq.sequence_name}_4K_raw.yuv`,
      `/UVG_Dataset/${seq.sequence_name}_4K_raw.yuv`,
      '.yuv',
      sizeBytes,
      Number(sizeGB.toFixed(3)),
      createdAt,
      ageMonths,
      assetType,
      action,
      emissions.monthlyCostUSD,
      emissions.annualCarbonKg,
      isDup ? 1 : 0,
      isDup ? seq.sequence_name.replace(/_\d+BIT_inventory_copy$/, '') : null,
      flagged,
      seq.sequence_name,
      seq.motion,
      seq.texture,
      seq.contrast,
      seq.frame_rate_fps,
      seq.frame_count,
      seq.resolution
    );
  });

  // Seed UVG Benchmark Encodes (ProRes / HEVC) for official sequences
  uvgRows.filter(r => r.record_type === 'official_sequence_metadata').forEach((seq, idx) => {
    const isProRes = idx % 2 === 0;
    const ext = isProRes ? '.mov' : '.mp4';
    const tag = isProRes ? 'ProRes422HQ' : 'HEVC_Main10';
    const rawGib = seq.size_8bit_yuv_gib || (seq.frame_rate_fps === 120 ? 3.5 : 2.8);
    const sizeGB = isProRes ? Number((rawGib * 0.45).toFixed(2)) : Number((rawGib * 0.12).toFixed(2));
    const sizeBytes = Math.round(sizeGB * 1024 * 1024 * 1024);
    const ageMonths = ((idx * 2) % 18) + 1;
    const createdAt = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const action = getAction('4K Video', ageMonths, sizeGB, false);
    const emissions = calculateStorageEmissions({ sizeGB, region: 'US', provider: 'gcs' });

    insertFile.run(
      `uvg_encode_${idx + 1}`,
      userId,
      'gcs',
      'cacp-production-assets',
      `${seq.sequence_name}_4K_${tag}${ext}`,
      `/UVG_Dataset/Encodes/${seq.sequence_name}_4K_${tag}${ext}`,
      ext,
      sizeBytes,
      sizeGB,
      createdAt,
      ageMonths,
      '4K Video',
      action,
      emissions.monthlyCostUSD,
      emissions.annualCarbonKg,
      0,
      null,
      0,
      seq.sequence_name,
      seq.motion,
      seq.texture,
      seq.contrast,
      seq.frame_rate_fps,
      seq.frame_count,
      seq.resolution
    );
  });

  // Seed UVG Sequence Conforms & VFX Projects
  uvgRows.filter(r => r.record_type === 'official_sequence_metadata').slice(0, 10).forEach((seq, idx) => {
    const isAep = idx % 2 === 0;
    const ext = isAep ? '.aep' : '.prproj';
    const tool = isAep ? 'MotionVFX' : 'GradingConform';
    const sizeGB = Number((1.2 + (idx * 0.25)).toFixed(2));
    const sizeBytes = Math.round(sizeGB * 1024 * 1024 * 1024);
    const ageMonths = (idx % 12) + 2;
    const createdAt = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const action = getAction('AE/CapCut Project', ageMonths, sizeGB, false);
    const emissions = calculateStorageEmissions({ sizeGB, region: 'US', provider: 'gcs' });

    insertFile.run(
      `uvg_project_${idx + 1}`,
      userId,
      'gcs',
      'cacp-production-assets',
      `UVG_${seq.sequence_name}_4K_${tool}${ext}`,
      `/UVG_Dataset/Projects/UVG_${seq.sequence_name}_4K_${tool}${ext}`,
      ext,
      sizeBytes,
      sizeGB,
      createdAt,
      ageMonths,
      'AE/CapCut Project',
      action,
      emissions.monthlyCostUSD,
      emissions.annualCarbonKg,
      0,
      null,
      0,
      seq.sequence_name,
      seq.motion,
      seq.texture,
      seq.contrast,
      seq.frame_rate_fps,
      seq.frame_count,
      seq.resolution
    );
  });

  // Seed UVG Cache Files
  uvgRows.filter(r => r.record_type === 'official_sequence_metadata').slice(0, 12).forEach((seq, idx) => {
    const ext = ['.cfa', '.pek', '.tmp'][idx % 3];
    const sizeGB = Number((0.45 + (idx * 0.18)).toFixed(3));
    const sizeBytes = Math.round(sizeGB * 1024 * 1024 * 1024);
    const ageMonths = (idx % 10) + 1;
    const createdAt = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const action = getAction('AE/CapCut Cache', ageMonths, sizeGB, false);
    const emissions = calculateStorageEmissions({ sizeGB, region: 'US', provider: 'gcs' });

    insertFile.run(
      `uvg_cache_${idx + 1}`,
      userId,
      'gcs',
      'cacp-production-assets',
      `UVG_${seq.sequence_name}_4K_RenderCache_${idx + 1}${ext}`,
      `/UVG_Dataset/Cache/UVG_${seq.sequence_name}_4K_RenderCache_${idx + 1}${ext}`,
      ext,
      sizeBytes,
      sizeGB,
      createdAt,
      ageMonths,
      'AE/CapCut Cache',
      action,
      emissions.monthlyCostUSD,
      emissions.annualCarbonKg,
      0,
      null,
      1,
      seq.sequence_name,
      seq.motion,
      seq.texture,
      seq.contrast,
      seq.frame_rate_fps,
      seq.frame_count,
      seq.resolution
    );
  });

  // Seed UVG Keyframe Reference Plates
  uvgRows.filter(r => r.record_type === 'official_sequence_metadata').slice(0, 10).forEach((seq, idx) => {
    const ext = ['.CR2', '.ARW', '.NEF'][idx % 3];
    const sizeGB = Number((0.045 + (idx * 0.005)).toFixed(4));
    const sizeBytes = Math.round(sizeGB * 1024 * 1024 * 1024);
    const ageMonths = (idx % 8) + 1;
    const createdAt = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const action = getAction('RAW Image', ageMonths, sizeGB, false);
    const emissions = calculateStorageEmissions({ sizeGB, region: 'US', provider: 'gcs' });

    insertFile.run(
      `uvg_plate_${idx + 1}`,
      userId,
      'gcs',
      'cacp-production-assets',
      `UVG_${seq.sequence_name}_Frame001_Plate${ext}`,
      `/UVG_Dataset/KeyframePlates/UVG_${seq.sequence_name}_Frame001_Plate${ext}`,
      ext,
      sizeBytes,
      sizeGB,
      createdAt,
      ageMonths,
      'RAW Image',
      action,
      emissions.monthlyCostUSD,
      emissions.annualCarbonKg,
      0,
      null,
      0,
      seq.sequence_name,
      seq.motion,
      seq.texture,
      seq.contrast,
      seq.frame_rate_fps,
      seq.frame_count,
      seq.resolution
    );
  });
}

function seedHistoricalData(database: DatabaseSync, userId: string): void {
  const insertHistory = database.prepare(`
    INSERT INTO historical_snapshots (id, user_id, month, storage_gb, file_count, cost, carbon_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const months = [
    'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024',
    'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
    'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025',
    'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026'
  ];

  let currentGB = 85.0;
  let fileCount = 42;

  months.forEach((month, idx) => {
    // Growth pattern
    const growthGB = 8.5 + (idx * 1.8) + (Math.sin(idx) * 3);
    const addedFiles = 4 + (idx % 6);
    currentGB += growthGB;
    fileCount += addedFiles;

    const emissions = calculateStorageEmissions({ sizeGB: currentGB, region: 'US', provider: 'gcs' });

    insertHistory.run(
      `hist_${idx + 1}`,
      userId,
      month,
      Number(currentGB.toFixed(1)),
      fileCount,
      emissions.monthlyCostUSD,
      emissions.annualCarbonKg
    );
  });
}
