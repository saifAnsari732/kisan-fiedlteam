import React from 'react';
import { User } from '../types';
import { LogOut } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-none sticky top-0 z-30 shadow-2xs">
      {/* Brand Logo with Geometric Accent */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center shadow-xs">
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
        {user ? (
          <button
            id="logout-btn"
            onClick={onLogout}
            className="bg-slate-100 hover:bg-red-50 hover:text-red-700 active:bg-red-100 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 hover:border-red-200"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-red-600" />
            <span className="text-[11px]">Logout</span>
          </button>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Field Portal
          </span>
        )}
      </div>
    </header>
  );
};



