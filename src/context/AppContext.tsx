import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  FileEntry,
  Region,
  CloudProvider,
  SummaryStats,
  AssetTypeBreakdown,
  HistoricalDataPoint,
} from '../types';
import {
  ENERGY_PER_GB_MONTH_KWH,
  GRID_CARBON_INTENSITY,
  ASSET_TYPE_COLORS,
  GCS_PRICE_PER_GB_MONTH,
  AZURE_PRICE_PER_GB_MONTH,
} from '../config/constants';
import { generateMockFiles } from '../data/generateMockFiles';
import { generateHistoricalData } from '../data/generateHistoricalData';

interface AppContextValue {
  // Auth State
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;

  // State
  isConnected: boolean;
  isScanning: boolean;
  provider: CloudProvider;
  region: Region;
  files: FileEntry[];
  historicalData: HistoricalDataPoint[];

  // Actions
  connect: (provider: CloudProvider) => Promise<void>;
  setRegion: (region: Region) => void;
  toggleFlagForReview: (fileId: string) => void;
  flagMultipleForReview: (fileIds: string[]) => void;

  // Computed
  summaryStats: SummaryStats;
  assetTypeBreakdown: AssetTypeBreakdown[];
  flaggedFiles: FileEntry[];
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [provider, setProviderState] = useState<CloudProvider>('gcs');
  const [region, setRegionState] = useState<Region>('US');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('cacp_token', data.token);
          setIsAuthenticated(true);
          return true;
        }
      }
    } catch {
      // Backend offline, fallback to demo credentials
    }

    if (email === 'demo@example.com' && pass === 'password123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const register = async (email: string, pass: string, name: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('cacp_token', data.token);
          setIsAuthenticated(true);
          return true;
        }
      }
    } catch {
      // Backend offline
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('cacp_token');
    setIsAuthenticated(false);
    setIsConnected(false);
    setFiles([]);
  };

  const recalculateFiles = (currentFiles: FileEntry[], currentRegion: Region, currentProvider: CloudProvider): FileEntry[] => {
    return currentFiles.map(file => {
      const annualCarbonKg = (file.sizeGB * ENERGY_PER_GB_MONTH_KWH * GRID_CARBON_INTENSITY[currentRegion] * 12) / 1000;
      const pricePerGb = currentProvider === 'gcs' ? GCS_PRICE_PER_GB_MONTH : AZURE_PRICE_PER_GB_MONTH;
      const monthlyCost = file.sizeGB * pricePerGb;
      
      return {
        ...file,
        annualCarbonKg,
        monthlyCost
      };
    });
  };

  const connect = async (newProvider: CloudProvider) => {
    setIsScanning(true);
    setProviderState(newProvider);

    try {
      await fetch('/api/cloud/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      });

      const [filesRes, histRes] = await Promise.all([
        fetch(`/api/files?region=${region}&provider=${newProvider}`),
        fetch(`/api/carbon/historical?region=${region}&provider=${newProvider}`),
      ]);

      if (filesRes.ok && histRes.ok) {
        const filesData = await filesRes.json();
        const histData = await histRes.json();

        const parsedFiles: FileEntry[] = filesData.files.map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
        }));

        setFiles(parsedFiles);
        setHistoricalData(histData);
        setIsConnected(true);
        setIsScanning(false);
        return;
      }
    } catch (err) {
      console.warn('Backend unavailable, using local mock/dataset simulation:', err);
    }

    // Fallback simulation
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockFiles = generateMockFiles();
    const mockHistory = generateHistoricalData();
    
    setFiles(recalculateFiles(mockFiles, region, newProvider));
    setHistoricalData(mockHistory);
    setIsConnected(true);
    setIsScanning(false);
  };

  const setRegion = (newRegion: Region) => {
    setRegionState(newRegion);
    // Recalculate immediately for instant UI responsiveness
    setFiles(prevFiles => recalculateFiles(prevFiles, newRegion, provider));

    // Synchronize with API if online
    fetch(`/api/files?region=${newRegion}&provider=${provider}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.files) {
          setFiles(data.files.map((f: any) => ({ ...f, createdAt: new Date(f.createdAt) })));
        }
      })
      .catch(() => {});

    fetch(`/api/carbon/historical?region=${newRegion}&provider=${provider}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && Array.isArray(data)) {
          setHistoricalData(data);
        }
      })
      .catch(() => {});
  };

  const toggleFlagForReview = (fileId: string) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId 
          ? { ...file, flaggedForReview: !file.flaggedForReview } 
          : file
      )
    );

    fetch(`/api/files/${fileId}/flag`, { method: 'POST' }).catch(() => {});
  };

  const flagMultipleForReview = (fileIds: string[]) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        fileIds.includes(file.id)
          ? { ...file, flaggedForReview: true }
          : file
      )
    );

    fetch('/api/files/bulk-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds, flagged: true }),
    }).catch(() => {});
  };

  const summaryStats: SummaryStats = useMemo(() => {
    return files.reduce(
      (acc, file) => {
        acc.totalStorageGB += file.sizeGB;
        acc.totalFileCount += 1;
        acc.estimatedMonthlyCost += file.monthlyCost;
        acc.estimatedAnnualCarbonKg += file.annualCarbonKg;
        
        if (file.recommendedAction !== 'Keep') {
          acc.potentialMonthlySavings += file.monthlyCost;
          acc.potentialCarbonSavingsKg += file.annualCarbonKg;
        }
        
        return acc;
      },
      {
        totalStorageGB: 0,
        totalFileCount: 0,
        estimatedMonthlyCost: 0,
        estimatedAnnualCarbonKg: 0,
        potentialMonthlySavings: 0,
        potentialCarbonSavingsKg: 0,
      }
    );
  }, [files]);

  const assetTypeBreakdown: AssetTypeBreakdown[] = useMemo(() => {
    const breakdownMap = files.reduce((acc, file) => {
      if (!acc[file.assetType]) {
        acc[file.assetType] = {
          type: file.assetType,
          totalSizeGB: 0,
          count: 0,
          color: ASSET_TYPE_COLORS[file.assetType] || '#8884d8',
        };
      }
      acc[file.assetType].totalSizeGB += file.sizeGB;
      acc[file.assetType].count += 1;
      return acc;
    }, {} as Record<string, AssetTypeBreakdown>);
    
    return Object.values(breakdownMap).sort((a, b) => b.totalSizeGB - a.totalSizeGB);
  }, [files]);

  const flaggedFiles = useMemo(() => files.filter(f => f.flaggedForReview), [files]);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        login,
        register,
        logout,
        isConnected,
        isScanning,
        provider,
        region,
        files,
        historicalData,
        connect,
        setRegion,
        toggleFlagForReview,
        flagMultipleForReview,
        summaryStats,
        assetTypeBreakdown,
        flaggedFiles,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
