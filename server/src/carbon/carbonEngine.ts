import { execFile } from 'child_process';
import path from 'path';

export type Region = 'US' | 'EU' | 'Asia' | 'India';
export type CloudProvider = 'gcs' | 'azure';

export const GRID_CARBON_INTENSITY: Record<Region, number> = {
  'US': 390.0,
  'EU': 275.0,
  'Asia': 510.0,
  'India': 710.0,
};

export const STORAGE_PRICING: Record<CloudProvider, Record<string, number>> = {
  gcs: {
    Standard: 0.020,
    Nearline: 0.010,
    Coldline: 0.004,
    Archive: 0.0012,
  },
  azure: {
    Hot: 0.018,
    Cool: 0.010,
    Cold: 0.0036,
    Archive: 0.00099,
  },
};

export const PROVIDER_PUE: Record<CloudProvider, number> = {
  gcs: 1.10,
  azure: 1.12,
};

export const ENERGY_STORAGE_KWH_PER_GB_MONTH = 0.0010;
export const EMBODIED_CARBON_KG_PER_GB_YEAR = 0.0144;
export const NETWORK_TRANSFER_KWH_PER_GB = 0.0200;

export interface StorageCalculationParams {
  sizeGB: number;
  months?: number;
  region?: Region;
  provider?: CloudProvider;
  tier?: string;
  monthlyEgressGB?: number;
  includeEmbodied?: boolean;
}

export interface StorageCalculationResult {
  sizeGB: number;
  months: number;
  region: Region;
  provider: string;
  storageTier: string;
  pue: number;
  gridIntensityGPerKwh: number;
  operationalEnergyKwh: number;
  operationalCarbonKg: number;
  embodiedCarbonKg: number;
  egressCarbonKg: number;
  totalCarbonKg: number;
  annualCarbonKg: number;
  monthlyCostUSD: number;
  totalCostUSD: number;
  equivalents: {
    treeSeedlingsToOffsetAnnual: number;
    kmDrivenPassengerCar: number;
    smartphonesCharged: number;
  };
}

/**
 * Native Node.js calculation engine matching scientific methodology
 */
export function calculateStorageEmissions(params: StorageCalculationParams): StorageCalculationResult {
  const sizeGB = Math.max(0, params.sizeGB);
  const months = params.months ?? 12;
  const region: Region = params.region && GRID_CARBON_INTENSITY[params.region] ? params.region : 'US';
  const provider: CloudProvider = params.provider === 'azure' ? 'azure' : 'gcs';
  const storageTier = params.tier || (provider === 'azure' ? 'Hot' : 'Standard');
  const includeEmbodied = params.includeEmbodied !== false;
  const monthlyEgressGB = params.monthlyEgressGB || 0;

  const gridIntensity = GRID_CARBON_INTENSITY[region];
  const pue = PROVIDER_PUE[provider];

  // 1. Operational Energy (kWh)
  const operationalEnergyKwh = sizeGB * ENERGY_STORAGE_KWH_PER_GB_MONTH * months * pue;

  // 2. Operational Carbon (kg CO2e)
  const operationalCarbonKg = (operationalEnergyKwh * gridIntensity) / 1000.0;

  // 3. Embodied Carbon (kg CO2e)
  const embodiedCarbonKg = includeEmbodied
    ? sizeGB * (EMBODIED_CARBON_KG_PER_GB_YEAR / 12.0) * months
    : 0;

  // 4. Egress Energy & Carbon
  const egressEnergyKwh = monthlyEgressGB * months * NETWORK_TRANSFER_KWH_PER_GB * pue;
  const egressCarbonKg = (egressEnergyKwh * gridIntensity) / 1000.0;

  // 5. Totals & Annualized
  const totalCarbonKg = operationalCarbonKg + embodiedCarbonKg + egressCarbonKg;
  const annualCarbonKg = months > 0 ? (totalCarbonKg / months) * 12.0 : 0;

  // 6. Costs
  const providerPrices = STORAGE_PRICING[provider] || STORAGE_PRICING.gcs;
  const unitPrice = providerPrices[storageTier] ?? (provider === 'azure' ? 0.018 : 0.020);
  const monthlyCostUSD = sizeGB * unitPrice;
  const totalCostUSD = monthlyCostUSD * months;

  // Equivalents
  const treeSeedlingsToOffsetAnnual = annualCarbonKg / 20.0;
  const kmDrivenPassengerCar = totalCarbonKg / 0.192;
  const smartphonesCharged = (operationalEnergyKwh + egressEnergyKwh) / 0.012;

  return {
    sizeGB: Number(sizeGB.toFixed(3)),
    months: Number(months.toFixed(1)),
    region,
    provider: provider.toUpperCase(),
    storageTier,
    pue,
    gridIntensityGPerKwh: gridIntensity,
    operationalEnergyKwh: Number(operationalEnergyKwh.toFixed(4)),
    operationalCarbonKg: Number(operationalCarbonKg.toFixed(4)),
    embodiedCarbonKg: Number(embodiedCarbonKg.toFixed(4)),
    egressCarbonKg: Number(egressCarbonKg.toFixed(4)),
    totalCarbonKg: Number(totalCarbonKg.toFixed(4)),
    annualCarbonKg: Number(annualCarbonKg.toFixed(4)),
    monthlyCostUSD: Number(monthlyCostUSD.toFixed(2)),
    totalCostUSD: Number(totalCostUSD.toFixed(2)),
    equivalents: {
      treeSeedlingsToOffsetAnnual: Number(treeSeedlingsToOffsetAnnual.toFixed(2)),
      kmDrivenPassengerCar: Number(kmDrivenPassengerCar.toFixed(1)),
      smartphonesCharged: Math.round(smartphonesCharged),
    },
  };
}

/**
 * Execute the standalone Python Carbon Engine for cross-verification or CLI integration
 */
export function runPythonCarbonEngine(
  action: 'calculate' | 'uvg' | 'regions',
  extraArgs: Record<string, string | number> = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(process.cwd(), 'carbon_engine.py');
    const args = ['--action', action, '--json'];

    for (const [key, val] of Object.entries(extraArgs)) {
      args.push(`--${key}`, String(val));
    }

    execFile('python', [pythonScript, ...args], (error, stdout, stderr) => {
      if (error) {
        // Fallback to native Node calculation if python execution fails in non-python environment
        console.warn('Python carbon engine invocation fallback:', stderr || error.message);
        if (action === 'calculate') {
          return resolve(calculateStorageEmissions({
            sizeGB: Number(extraArgs.size_gb || 100),
            region: (extraArgs.region as Region) || 'US',
            provider: (extraArgs.provider as CloudProvider) || 'gcs',
            months: Number(extraArgs.months || 12),
          }));
        }
        return reject(error);
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Python engine output: ${stdout}`));
      }
    });
  });
}
