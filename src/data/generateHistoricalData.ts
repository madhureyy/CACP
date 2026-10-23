import { HistoricalDataPoint } from '../types';

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

const prng = mulberry32(999);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateHistoricalData(): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  
  let currentYear = 2024;
  let currentMonthIndex = 2; // March (0-indexed)
  
  let currentStorage = 215; // Starting roughly at 200 GB
  let currentFileCount = 45;

  // 30 months from March 2024 -> August 2026
  for (let i = 0; i < 30; i++) {
    const monthLabel = `${MONTHS[currentMonthIndex]} ${currentYear}`;
    
    data.push({
      month: monthLabel,
      storageGB: Math.round(currentStorage),
      fileCount: Math.round(currentFileCount)
    });
    
    // Non-linear growth: more files added over time as project scales
    // Base monthly storage addition increases over time
    const storageGrowthRate = 40 + (i * 1.5);
    // Add random noise (-5% to +10%)
    const noiseFactor = 0.95 + (prng() * 0.15);
    
    currentStorage += (storageGrowthRate * noiseFactor);
    
    // File count grows proportionally but with some randomness
    const fileGrowth = (storageGrowthRate / 15) * (0.8 + prng() * 0.4);
    currentFileCount += fileGrowth;

    // Advance month
    currentMonthIndex++;
    if (currentMonthIndex > 11) {
      currentMonthIndex = 0;
      currentYear++;
    }
  }

  return data;
}
