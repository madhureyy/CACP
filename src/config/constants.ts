import { Region } from '../types';

// === STORAGE PRICING (USD per GB per month) ===
export const GCS_PRICE_PER_GB_MONTH = 0.020;   // Google Cloud Storage Standard
export const AZURE_PRICE_PER_GB_MONTH = 0.018;  // Azure Blob Storage Hot Tier

// === ENERGY CONSUMPTION ===
// Estimated energy to store 1 GB for 1 month in a data centre (kWh)
// Based on published estimates from IEA, Shift Project, and cloud provider sustainability reports
export const ENERGY_PER_GB_MONTH_KWH = 0.001;

// === GRID CARBON INTENSITY by Region (gCO2e per kWh) ===
// Sources: IEA Electricity Maps, EPA eGRID, European Environment Agency
export const GRID_CARBON_INTENSITY: Record<Region, number> = {
  'US': 390,    // US average grid
  'EU': 275,    // EU average grid (lower due to renewables)
  'Asia': 510,  // Asia-Pacific average (coal-heavy grids)
  'India': 710, // India grid (high coal share)
};

export const REGION_LABELS: Record<Region, string> = {
  'US': 'United States',
  'EU': 'European Union',
  'Asia': 'Asia-Pacific',
  'India': 'India',
};

// === FILE CLASSIFICATION ===
export const RAW_IMAGE_EXTENSIONS = ['.cr2', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2'];
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.mxf', '.prores'];
export const AE_PROJECT_EXTENSIONS = ['.aep', '.aepx', '.prproj', '.mogrt'];
export const CAPCUT_EXTENSIONS = ['.capcut'];
export const CACHE_EXTENSIONS = ['.cfa', '.pek', '.bak', '.tmp'];

// Size thresholds for video classification (in bytes)
export const FOUR_K_MIN_SIZE = 2 * 1024 * 1024 * 1024;      // 2 GB
export const EIGHT_K_MIN_SIZE = 12 * 1024 * 1024 * 1024;     // 12 GB

// === DUPLICATE DETECTION ===
export const VERSION_SUFFIXES = ['_v1', '_v2', '_v3', '_v4', '_v5', '_final', '_Final', '_FINAL', '_FINAL2', '_Final_FINAL', '_final_v2', '_export', '_old', '_backup', '_copy'];

// === RECOMMENDATION THRESHOLDS ===
export const DELETE_AGE_MONTHS = 18;          // Files older than 18 months → suggest Delete
export const ARCHIVE_AGE_MONTHS = 12;         // Files 12-18 months → suggest Archive
export const LARGE_FILE_THRESHOLD_GB = 5;      // Files > 5GB get extra attention

// === ASSET TYPE COLORS for charts ===
export const ASSET_TYPE_COLORS: Record<string, string> = {
  'RAW Image': '#0D9488',
  '4K Video': '#2DD4BF',
  '8K Video': '#F59E0B',
  'AE/CapCut Project': '#8B5CF6',
  'AE/CapCut Cache': '#EC4899',
  'Duplicate/Old Version': '#F87171',
  'Other': '#64748B',
};

// === ACTION BADGE COLORS (light theme: solid pastel bg + dark text for contrast) ===
export const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  'Delete': { bg: 'bg-red-100', text: 'text-red-700' },
  'Archive': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Move Offline': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Keep': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

// === ASSET TYPE BADGE COLORS (light theme: solid pastel bg + dark text for contrast) ===
export const ASSET_TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'RAW Image': { bg: 'bg-teal-100', text: 'text-teal-700' },
  '4K Video': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  '8K Video': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'AE/CapCut Project': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'AE/CapCut Cache': { bg: 'bg-pink-100', text: 'text-pink-700' },
  'Duplicate/Old Version': { bg: 'bg-red-100', text: 'text-red-700' },
  'Other': { bg: 'bg-slate-100', text: 'text-slate-600' },
};

// === FLAG BADGE COLORS (Duplicate / Old / Unused, shown in the inventory table) ===
export const FLAG_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Duplicate': { bg: 'bg-rose-100', text: 'text-rose-700' },
  'Old': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Unused': { bg: 'bg-slate-200', text: 'text-slate-600' },
};
