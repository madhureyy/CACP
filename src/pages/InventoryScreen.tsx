import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { FilterBar } from '../components/inventory/FilterBar';
import { FileTable } from '../components/inventory/FileTable';
import { Toast } from '../components/ui/Toast';
import { AssetType, RecommendedAction, FileEntry } from '../types';

export const InventoryScreen: React.FC = () => {
  const { files, flagMultipleForReview } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | 'All'>('All');
  const [selectedAction, setSelectedAction] = useState<RecommendedAction | 'All'>('All');
  
  const [sortField, setSortField] = useState<keyof FileEntry | string>('monthlyCost');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchSearch = f.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = selectedAssetType === 'All' || f.assetType === selectedAssetType;
      const matchAction = selectedAction === 'All' || f.recommendedAction === selectedAction;
      return matchSearch && matchType && matchAction;
    });
  }, [files, searchQuery, selectedAssetType, selectedAction]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let valA: any = a[sortField as keyof FileEntry];
      let valB: any = b[sortField as keyof FileEntry];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });
  }, [filteredFiles, sortField, sortDirection]);

  // Selected totals
  const selectedFilesData = files.filter(f => selectedIds.has(f.id));
  const totalMonthlySavings = selectedFilesData.reduce((acc, f) => acc + f.monthlyCost, 0);
  const totalCarbonSavings = selectedFilesData.reduce((acc, f) => acc + f.annualCarbonKg, 0);

  const handleToggleSelect = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleToggleSelectAll = () => {
    const currentFiles = sortedFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const allCurrentSelected = currentFiles.length > 0 && currentFiles.every(f => selectedIds.has(f.id));
    
    const newSelection = new Set(selectedIds);
    if (allCurrentSelected) {
      currentFiles.forEach(f => newSelection.delete(f.id));
    } else {
      currentFiles.forEach(f => newSelection.add(f.id));
    }
    setSelectedIds(newSelection);
  };

  const handleFlagForReview = () => {
    if (selectedIds.size === 0) return;
    flagMultipleForReview(Array.from(selectedIds));
    setToastMessage(`Flagged ${selectedIds.size} files for review`);
    setToastVisible(true);
    setSelectedIds(new Set());
  };

  return (
    <div className="p-8 overflow-y-auto w-full h-full space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900">UVG 4K Asset Inventory</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
            UVG 4K Dataset
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Cataloging raw 4K/8K YUV masters, encodes, cache, and duplicate variants from the Ultra Video Group (UVG) dataset
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm border border-gray-200">
        <div className="text-slate-700 font-medium">
          <span className="text-teal-600 font-bold">{selectedIds.size}</span> files selected
        </div>
        <div className="text-slate-500 text-sm md:text-base text-center">
          Selected files would save <span className="text-teal-600 font-semibold">${totalMonthlySavings.toFixed(2)}/month</span> and <span className="text-teal-600 font-semibold">{totalCarbonSavings.toFixed(2)} kg CO₂e/year</span>
        </div>
        <button
          disabled={selectedIds.size === 0}
          onClick={handleFlagForReview}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          Flag for Review
        </button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
        selectedAssetType={selectedAssetType}
        onAssetTypeChange={(t) => { setSelectedAssetType(t); setCurrentPage(1); }}
        selectedAction={selectedAction}
        onActionChange={(a) => { setSelectedAction(a); setCurrentPage(1); }}
      />

      <FileTable
        files={sortedFiles}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        sortField={sortField as string}
        sortDirection={sortDirection}
        onSort={handleSort}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <Toast
        message={toastMessage}
        type="success"
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
};
