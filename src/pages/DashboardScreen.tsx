import React from 'react';
import { useAppContext } from '../context/AppContext';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { Region } from '../types';
import { REGION_LABELS, GRID_CARBON_INTENSITY } from '../config/constants';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const formatBytes = (gb: number): string => {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
};

const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const RADIAN = Math.PI / 180;

// Renders the % label centered inside each slice. Tiny slices (below the
// threshold) are skipped entirely — the legend + tooltip already identify
// them, and cramming text onto a sliver just causes overlap.
const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent || percent < 0.03) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
      style={{ pointerEvents: 'none' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const DashboardScreen: React.FC = () => {
  const {
    provider, region, summaryStats, assetTypeBreakdown, historicalData,
    setRegion
  } = useAppContext();

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegion(e.target.value as Region);
  };

  const getProviderName = () => {
    switch (provider) {
      case 'gcs': return 'Google Cloud Storage';
      case 'azure': return 'Azure Blob Storage';
      default: return 'Storage Provider';
    }
  };

  const pieData = assetTypeBreakdown.map(item => ({
    name: item.type,
    value: item.totalSizeGB,
    color: item.color,
  })).filter(item => item.value > 0);

  // Example insight calculations
  const duplicateFiles = assetTypeBreakdown.find(a => a.type === 'Duplicate');
  const cacheFiles = assetTypeBreakdown.find(a => a.type === 'AE/CapCut Cache');
  const duplicateGB = duplicateFiles ? duplicateFiles.totalSizeGB : 0;
  const duplicateCount = duplicateFiles ? duplicateFiles.count : 0;
  const cacheGB = cacheFiles ? cacheFiles.totalSizeGB : 0;
  const largestFileSizeGB = summaryStats.totalStorageGB > 0 ? (summaryStats.totalStorageGB * 0.05) : 0;

  return (
    <div className="p-8 overflow-y-auto w-full h-full text-slate-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impact Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connected to {getProviderName()} • Profiling <span className="font-semibold text-teal-600">UVG 4K Video Dataset</span>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Storage Region</span>
            <select
              value={region}
              onChange={handleRegionChange}
              className="bg-transparent text-slate-900 border-none outline-none text-sm font-medium focus:ring-0 cursor-pointer appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              {(Object.keys(REGION_LABELS) as Region[]).map((key) => (
                <option key={key} value={key} className="text-slate-900">
                  {REGION_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Grid Intensity</span>
            <span className="text-sm font-medium text-teal-600">
              {GRID_CARBON_INTENSITY[region]} <span className="text-xs text-slate-500">gCO₂e/kWh</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard
          title="Total Storage"
          value={formatBytes(summaryStats.totalStorageGB)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        />
        <SummaryCard
          title="Total Files"
          value={formatNumber(summaryStats.totalFileCount)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <SummaryCard
          title="Monthly Cost"
          value={formatCurrency(summaryStats.estimatedMonthlyCost)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryCard
          title="Annual CO₂e"
          value={`${summaryStats.estimatedAnnualCarbonKg.toFixed(1)} kg`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          }
        />
        <SummaryCard
          title="Potential Savings"
          value={`${formatCurrency(summaryStats.potentialMonthlySavings)}/mo`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-96">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Storage by Asset Type</h2>
          <div className="flex-grow relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a' }}
                  formatter={(value: any, name: any) => [`${formatBytes(value)}`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={48}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: '16px', fontSize: '12px', lineHeight: '1.6rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total, typical of a donut chart */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '48px' }}>
              <div className="text-center">
                <div className="text-xl font-bold text-slate-900">{formatBytes(summaryStats.totalStorageGB)}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-96">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Storage Growth (Last 30 Months)</h2>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historicalData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickMargin={10}
                  interval={2}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${value}G`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  formatter={(value: any, name: any) => [
                    name === 'storageGB' ? formatBytes(value) : formatNumber(value), 
                    name === 'storageGB' ? 'Storage' : 'Files'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="storageGB" 
                  stroke="#0D9488" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorStorage)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 border-l-4 border-l-teal-500 rounded-lg p-4 flex items-start gap-3 shadow-sm">
            <div className="bg-teal-50 p-2 rounded-full text-teal-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 text-sm font-medium">{formatNumber(duplicateCount)} duplicate files detected</p>
              <p className="text-slate-600 text-xs mt-1">Wasting approximately {formatBytes(duplicateGB)} of storage and increasing carbon footprint.</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 border-l-4 border-l-teal-500 rounded-lg p-4 flex items-start gap-3 shadow-sm">
            <div className="bg-teal-50 p-2 rounded-full text-teal-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 text-sm font-medium">{formatBytes(cacheGB)} of old cache files</p>
              <p className="text-slate-600 text-xs mt-1">Found temporary simulation data older than 90 days that can be safely deleted.</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 border-l-4 border-l-teal-500 rounded-lg p-4 flex items-start gap-3 shadow-sm">
            <div className="bg-teal-50 p-2 rounded-full text-teal-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 text-sm font-medium">Largest Asset Class</p>
              <p className="text-slate-600 text-xs mt-1"><span className="text-teal-600 font-mono">4K/8K Video</span> consuming {formatBytes(largestFileSizeGB * 12)}.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
