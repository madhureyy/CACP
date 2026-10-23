import React from 'react';
import { AssetType, RecommendedAction } from '../../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedAssetType: AssetType | 'All';
  onAssetTypeChange: (type: AssetType | 'All') => void;
  selectedAction: RecommendedAction | 'All';
  onActionChange: (action: RecommendedAction | 'All') => void;
}

const ASSET_TYPES: (AssetType | 'All')[] = [
  'All',
  'RAW Image',
  '4K Video',
  '8K Video',
  'AE/CapCut Project',
  'AE/CapCut Cache',
  'Duplicate',
  'Old Version',
  'Other'
];

const ACTIONS: (RecommendedAction | 'All')[] = [
  'All',
  'Delete',
  'Archive',
  'Move Offline',
  'Keep'
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedAssetType,
  onAssetTypeChange,
  selectedAction,
  onActionChange
}) => {
  return (
    <div className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-4 border border-gray-200 shadow-sm">
      {/* Search */}
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
        />
      </div>

      {/* Asset Type */}
      <div className="w-full md:w-48">
        <select
          value={selectedAssetType}
          onChange={(e) => onAssetTypeChange(e.target.value as AssetType | 'All')}
          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white text-slate-900"
        >
          {ASSET_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Action */}
      <div className="w-full md:w-48">
        <select
          value={selectedAction}
          onChange={(e) => onActionChange(e.target.value as RecommendedAction | 'All')}
          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white text-slate-900"
        >
          {ACTIONS.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
