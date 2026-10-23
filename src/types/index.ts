export type AssetType = 'RAW Image' | '4K Video' | '8K Video' | 'AE/CapCut Project' | 'AE/CapCut Cache' | 'Duplicate/Old Version' | 'Other';

export type RecommendedAction = 'Delete' | 'Archive' | 'Move Offline' | 'Keep';

export type Region = 'US' | 'EU' | 'Asia' | 'India';

export type CloudProvider = 'gcs' | 'azure';

export interface FileEntry {
  id: string;
  filename: string;
  path: string;
  extension: string;
  sizeBytes: number;
  sizeGB: number;
  createdAt: Date;
  ageMonths: number;
  assetType: AssetType;
  recommendedAction: RecommendedAction;
  monthlyCost: number;       // in USD
  annualCarbonKg: number;    // in kg CO2e — computed dynamically based on region
  isDuplicate: boolean;
  baseFilename?: string;     // for duplicates, the base name without version suffix
  flaggedForReview: boolean;
  uvgSequenceName?: string;
  uvgResolution?: string;
  uvgFps?: number;
  uvgFrames?: number;
  uvgMotion?: string;
  uvgTexture?: string;
  uvgContrast?: string;
}

export interface SummaryStats {
  totalStorageGB: number;
  totalFileCount: number;
  estimatedMonthlyCost: number;
  estimatedAnnualCarbonKg: number;
  potentialMonthlySavings: number;
  potentialCarbonSavingsKg: number;
}

export interface AssetTypeBreakdown {
  type: AssetType;
  count: number;
  totalSizeGB: number;
  color: string;
}

export interface HistoricalDataPoint {
  month: string;           // 'Jan 2024', 'Feb 2024', etc.
  storageGB: number;
  fileCount: number;
}
