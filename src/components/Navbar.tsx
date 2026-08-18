import React from 'react';
import { User } from '../types';
import { LogOut, Database } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  dbStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, dbStatus }) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-3.5 flex items-center justify-between flex-none sticky top-0 z-30">
      {/* Brand Logo with Geometric Accent */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center shadow-xs">
          <div className="w-3.5 h-3.5 bg-white rounded-xs"></div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-none">
            Client<span className="text-indigo-600">Reports</span>
          </h1>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
            Field Mobile
          </span>
        </div>
      </div>

      {/* User Status & Logout */}
      <div className="flex items-center gap-2">
        {dbStatus && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full border border-slate-200 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">{dbStatus}</span>
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-2">
            <button
              id="logout-btn"
              onClick={onLogout}
              className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 p-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px]">Logout</span>
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Internal Portal
          </span>
        )}
      </div>
    </header>
  );
};


