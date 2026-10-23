import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  ASSET_TYPE_COLORS, 
  REGION_LABELS,
  GRID_CARBON_INTENSITY,
  ENERGY_PER_GB_MONTH_KWH 
} from '../config/constants';


const formatBytes = (gb: number): string => {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
};

const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;
const formatDate = (date: Date): string => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// We define ACTION_COLORS inline if it's not exported from constants as specified by types, but let's assume it is.
const ACTION_COLORS: Record<string, string> = {
  'Delete': 'text-red-400 print:text-red-700',
  'Archive': 'text-yellow-400 print:text-yellow-700',
  'Move Offline': 'text-blue-400 print:text-blue-700',
  'Keep': 'text-green-400 print:text-green-700'
};

const ReportScreen: React.FC = () => {
  const { files, summaryStats, region, provider } = useAppContext();

  const handlePrint = () => {
    window.print();
  };

  const carbonByAssetType = useMemo(() => {
    const data: Record<string, number> = {};
    files.forEach(file => {
      data[file.assetType] = (data[file.assetType] || 0) + file.annualCarbonKg;
    });
    return Object.entries(data).map(([type, carbon]) => ({ type, carbon }));
  }, [files]);

  const topRecommendations = useMemo(() => {
    return [...files]
      .filter(f => f.recommendedAction !== 'Keep')
      .sort((a, b) => b.annualCarbonKg - a.annualCarbonKg)
      .slice(0, 10);
  }, [files]);

  return (
    <div className="min-h-screen bg-carbon-900 text-slate-100 print:bg-white print:text-black font-sans">
      {/* Top Bar - No Print */}
      <div className="print:hidden max-w-4xl mx-auto p-4 flex justify-between items-center mb-6">
        <Link 
          to="/" 
          className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
        <button 
          onClick={handlePrint}
          className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-colors"
        >
          Download Report
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 print:p-0">
        
        {/* Report Header */}
        <header className="border-b border-carbon-700 print:border-gray-300 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-white print:text-black mb-2">Sustainability Report</h1>
          <h2 className="text-xl text-teal-400 print:text-teal-700 mb-4">Cinematic Asset Carbon Profiler</h2>
          <div className="grid grid-cols-2 text-sm text-slate-400 print:text-gray-600 gap-2">
            <div><strong>Generated:</strong> {formatDate(new Date())}</div>
            <div><strong>Provider:</strong> {provider}</div>
            <div><strong>Region:</strong> {REGION_LABELS[region] || region}</div>
          </div>
        </header>

        {/* Executive Summary */}
        <section className="mb-10">
          <h3 className="text-xl font-bold mb-4 print:text-black">Executive Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl p-6">
              <div className="text-sm text-slate-400 print:text-gray-500 mb-1">Total Storage Used</div>
              <div className="text-3xl font-bold text-white print:text-black">{formatBytes(summaryStats.totalStorageGB)}</div>
            </div>
            <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl p-6">
              <div className="text-sm text-slate-400 print:text-gray-500 mb-1">Total File Count</div>
              <div className="text-3xl font-bold text-white print:text-black">{summaryStats.totalFileCount.toLocaleString()}</div>
            </div>
            <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl p-6">
              <div className="text-sm text-slate-400 print:text-gray-500 mb-1">Estimated Monthly Cost</div>
              <div className="text-3xl font-bold text-white print:text-black">{formatCurrency(summaryStats.estimatedMonthlyCost)}</div>
            </div>
            <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl p-6">
              <div className="text-sm text-slate-400 print:text-gray-500 mb-1">Estimated Annual Carbon Footprint</div>
              <div className="text-3xl font-bold text-teal-400 print:text-teal-700">{summaryStats.estimatedAnnualCarbonKg.toFixed(1)} kg CO₂e</div>
            </div>
          </div>
          <div className="bg-teal-900/30 print:bg-teal-50 border border-teal-800 print:border-teal-200 rounded-xl p-5 text-teal-100 print:text-teal-900">
            <strong>Impact Potential:</strong> By following the recommended cleanup actions, you could save {formatCurrency(summaryStats.potentialMonthlySavings)}/month and reduce your carbon footprint by {summaryStats.potentialCarbonSavingsKg.toFixed(1)} kg CO₂e/year.
          </div>
        </section>

        {/* Carbon Impact by Asset Type */}
        <section className="mb-10 page-break-inside-avoid">
          <h3 className="text-xl font-bold mb-4 print:text-black">Carbon Impact by Asset Type</h3>
          <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={carbonByAssetType} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <XAxis 
                    type="number" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8' }} 
                    className="print:hidden" 
                  />
                  {/* Print-specific axis styles are tricky with Recharts, relying on standard text colors */}
                  <YAxis 
                    dataKey="type" 
                    type="category" 
                    stroke="#94a3b8" 
                    width={130} 
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#F8FAFC' }}
                    itemStyle={{ color: '#F8FAFC' }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)} kg CO₂e`, 'Carbon']}
                  />
                  <Bar dataKey="carbon" radius={[0, 4, 4, 0]}>
                    {carbonByAssetType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ASSET_TYPE_COLORS[entry.type] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Top 10 Cleanup Recommendations */}
        <section className="mb-10 page-break-inside-avoid">
          <h3 className="text-xl font-bold mb-4 print:text-black">Top 10 Cleanup Recommendations</h3>
          <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-carbon-900 print:bg-gray-100 text-slate-300 print:text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Filename</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Size</th>
                    <th className="px-4 py-3 font-semibold">Age (mo)</th>
                    <th className="px-4 py-3 font-semibold">Monthly Cost</th>
                    <th className="px-4 py-3 font-semibold">Annual CO₂e</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-carbon-700 print:divide-gray-200">
                  {topRecommendations.map((file) => (
                    <tr key={file.id} className="hover:bg-carbon-700/50 print:hover:bg-transparent">
                      <td className="px-4 py-3 truncate max-w-[200px]" title={file.filename}>{file.filename}</td>
                      <td className="px-4 py-3 text-slate-300 print:text-gray-600">{file.assetType}</td>
                      <td className="px-4 py-3">{formatBytes(file.sizeGB)}</td>
                      <td className="px-4 py-3">{file.ageMonths}</td>
                      <td className="px-4 py-3">{formatCurrency(file.monthlyCost)}</td>
                      <td className="px-4 py-3">{file.annualCarbonKg.toFixed(2)} kg</td>
                      <td className={`px-4 py-3 font-medium ${ACTION_COLORS[file.recommendedAction] || ''}`}>
                        {file.recommendedAction}
                      </td>
                    </tr>
                  ))}
                  {topRecommendations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400 print:text-gray-500">
                        No cleanup recommendations found. Great job!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Methodology Note */}
        <section className="mb-10 page-break-inside-avoid">
          <h3 className="text-xl font-bold mb-4 print:text-black">Methodology</h3>
          <div className="bg-carbon-800 print:bg-white print:border print:border-gray-200 rounded-xl p-6 text-sm text-slate-300 print:text-gray-700 space-y-4">
            <p>
              Carbon footprint is estimated using: <br/>
              <code className="bg-carbon-900 print:bg-gray-100 px-2 py-1 rounded text-teal-400 print:text-teal-700 font-mono mt-1 inline-block">
                Storage (GB) × Energy per GB ({ENERGY_PER_GB_MONTH_KWH} kWh) × Grid Carbon Intensity (gCO₂e/kWh) × 12 months / 1000
              </code>
            </p>
            <p>
              Current Region: <strong>{REGION_LABELS[region] || region}</strong> <br/>
              Grid Carbon Intensity: <strong>{GRID_CARBON_INTENSITY[region]} gCO₂e/kWh</strong>
            </p>
            <p className="text-slate-400 print:text-gray-500 italic text-xs mt-4">
              * Disclaimer: These are estimates based on published energy consumption data and regional grid carbon intensity factors. Actual emissions may vary.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-carbon-700 print:border-gray-300 pt-6 mt-12 text-center text-sm text-slate-500 print:text-gray-500 pb-8 print:pb-0">
          <p>Generated by Cinematic Asset Carbon Profiler on {formatDate(new Date())}</p>
          <p className="mt-1">Ramdeo Baba University • Computer Science Engineering • IDEA Lab</p>
        </footer>

      </div>
    </div>
  );
};

export default ReportScreen;
