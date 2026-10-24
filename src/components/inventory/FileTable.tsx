import React from 'react';
import { FileEntry } from '../../types';
import { ASSET_TYPE_BADGE_COLORS, ACTION_COLORS, FLAG_BADGE_COLORS, DELETE_AGE_MONTHS } from '../../config/constants';

interface FileTableProps {
  files: FileEntry[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileTable: React.FC<FileTableProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortField,
  sortDirection,
  onSort,
  currentPage,
  pageSize,
  onPageChange
}) => {
  const currentFiles = files.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(files.length / pageSize) || 1;
  const allSelected = currentFiles.length > 0 && currentFiles.every(f => selectedIds.has(f.id));

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 text-slate-300 opacity-0 group-hover:opacity-100">▲</span>;
    return <span className="ml-1 text-teal-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  const getFlags = (file: FileEntry): string[] => {
    const flags: string[] = [];
    if (file.isDuplicate) flags.push('Duplicate');
    if (file.ageMonths >= DELETE_AGE_MONTHS) flags.push('Old');
    if (file.flaggedForReview) flags.push('Unused');
    return flags;
  };

  const headers = [
    { key: 'filename', label: 'Filename', sortable: true },
    { key: 'assetType', label: 'Type', sortable: true },
    { key: 'flags', label: 'Flags', sortable: false },
    { key: 'sizeBytes', label: 'Size', sortable: true },
    { key: 'ageMonths', label: 'Age', sortable: true },
    { key: 'monthlyCost', label: 'Monthly Cost', sortable: true },
    { key: 'annualCarbonKg', label: 'CO₂e/yr', sortable: true },
    { key: 'recommendedAction', label: 'Action', sortable: true }
  ];

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded"
                />
              </th>
              {headers.map(h => (
                <th
                  key={h.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider select-none ${h.sortable ? 'cursor-pointer group hover:text-slate-700' : ''}`}
                  onClick={h.sortable ? () => onSort(h.key) : undefined}
                >
                  <div className="flex items-center">
                    {h.label}
                    {h.sortable && <SortIcon field={h.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentFiles.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">
                  No files match your filters
                </td>
              </tr>
            ) : (
              currentFiles.map((file) => {
                const isSelected = selectedIds.has(file.id);
                const typeColor = ASSET_TYPE_BADGE_COLORS[file.assetType] || { bg: 'bg-slate-100', text: 'text-slate-600' };
                const actionColor = ACTION_COLORS[file.recommendedAction] || { bg: 'bg-slate-100', text: 'text-slate-600' };
                const flags = getFlags(file);

                return (
                  <tr
                    key={file.id}
                    className={`transition-colors hover:bg-slate-50 ${isSelected ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'border-l-2 border-l-transparent'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(file.id)}
                        className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      <div className="truncate max-w-sm font-mono font-medium" title={file.filename}>{file.filename}</div>
                      {file.uvgSequenceName && (
                        <div className="text-xs text-teal-700 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold px-1.5 py-0.2 rounded bg-teal-50 border border-teal-200">UVG: {file.uvgSequenceName}</span>
                          {file.uvgResolution && <span className="text-slate-500">• {file.uvgResolution}</span>}
                          {file.uvgFps && <span className="text-slate-500">• {file.uvgFps}fps</span>}
                          {file.uvgMotion && <span className="text-slate-400 hidden sm:inline">• {file.uvgMotion}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor.bg} ${typeColor.text}`}>
                        {file.assetType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {flags.map(flag => {
                            const flagColor = FLAG_BADGE_COLORS[flag] || { bg: 'bg-slate-100', text: 'text-slate-600' };
                            return (
                              <span
                                key={flag}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${flagColor.bg} ${flagColor.text}`}
                              >
                                {flag}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {file.ageMonths} months
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      ${file.monthlyCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="font-medium text-slate-700">
                        {file.annualCarbonKg < 0.1 ? file.annualCarbonKg.toFixed(3) : file.annualCarbonKg.toFixed(2)} kg
                      </div>
                      <div className="text-xs text-slate-400">
                        {(file.annualCarbonKg * 1000).toFixed(0)} g CO₂e
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionColor.bg} ${actionColor.text}`}>
                        {file.recommendedAction}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {files.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages} ({files.length} items)
          </span>
          <div className="flex space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
