import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { provider, region } = useAppContext();

  return (
    <aside className="w-64 bg-carbon-800 flex flex-col h-full border-r border-carbon-700">
      {/* Logo Area */}
      <div className="p-6 border-b border-carbon-700 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 5.52 0 10-4.48 10-10C22 6.48 17.52 2 12 2z" opacity="0.2" fill="currentColor"/>
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            <path d="M12 8v8"/>
            <path d="M8 12c2 0 4-2 4-2s2 2 4 2"/>
          </svg>
          <div>
            <h1 className="text-slate-100 font-bold tracking-wide">Carbon Profiler</h1>
            <p className="text-teal-400 text-xs">Cinematic Asset Analyzer</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 flex flex-col gap-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 px-4 transition-colors ${
              isActive
                ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-500 rounded-r-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-carbon-700/50 border-l-4 border-transparent'
            }`
          }
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 px-4 transition-colors ${
              isActive
                ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-500 rounded-r-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-carbon-700/50 border-l-4 border-transparent'
            }`
          }
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          File Inventory
        </NavLink>
        <NavLink
          to="/report"
          className={({ isActive }) =>
            `flex items-center gap-3 py-3 px-4 transition-colors ${
              isActive
                ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-500 rounded-r-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-carbon-700/50 border-l-4 border-transparent'
            }`
          }
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Report
        </NavLink>
      </nav>

      {/* Bottom Area */}
      <div className="p-4 border-t border-carbon-700 bg-carbon-900/50">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Connected Environment</p>
          <p className="text-sm text-slate-300 font-medium capitalize">{provider || 'Local'} Provider</p>
          <p className="text-xs text-slate-400">{region || 'us-east-1'}</p>
        </div>
      </div>
    </aside>
  );
};
