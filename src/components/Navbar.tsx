import React from 'react';
import { User } from '../types';
import { LogOut } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="h-14 bg-white border-b border-stone-200 px-4 flex items-center justify-between flex-none sticky top-0 z-30 shadow-2xs">
      {/* Brand Logo with Geometric Accent */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-rose-600 rounded flex items-center justify-center shadow-xs">
          <div className="w-3.5 h-3.5 bg-white rounded-xs"></div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-stone-800 tracking-tight leading-none">
            Client<span className="text-rose-600">Reports</span>
          </h1>
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest leading-none mt-0.5">
            Field Mobile
          </span>
        </div>
      </div>

      {/* User Status & Logout */}
      <div className="flex items-center gap-2">
        {dbStatus && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-stone-50 text-stone-600 rounded-full border border-stone-200 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span className="font-semibold text-stone-700">{dbStatus}</span>
          </div>
        )}

        {user ? (
          <button
            id="logout-btn"
            onClick={onLogout}
            className="bg-stone-100 hover:bg-red-50 hover:text-red-700 active:bg-red-100 text-stone-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-200 hover:border-red-200"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-stone-500 hover:text-red-600" />
            <span className="text-[11px]">Logout</span>
          </button>
        ) : (
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            Field Portal
          </span>
        )}
      </div>
    </header>
  );
};



