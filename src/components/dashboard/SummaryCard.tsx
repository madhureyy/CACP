import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  accentColor = 'text-teal-400' 
}) => {
  return (
    <div className="bg-white rounded-xl p-6 hover:bg-slate-50 transition-colors duration-200 border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className={`w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm text-slate-500 font-medium mb-1">{title}</h3>
          <div className="text-3xl font-bold text-slate-900">{value}</div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};
