import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, LogOut, Menu } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

type HeaderProps = {
  toggleSidebar: () => void;
};

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { currentUser, logout, isSyncing } = useAppContext();

  if (!currentUser) return null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm dự án, công việc..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        {isSyncing && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 hidden sm:flex">
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            Đang đồng bộ...
          </div>
        )}
        <NotificationDropdown />

        <div className="flex items-center gap-3 pl-2 sm:pl-6 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-slate-900">{currentUser.name}</div>
            <div className="text-xs text-slate-500">{currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</div>
          </div>
          
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-slate-100 object-cover"
          />
          
          <button 
            onClick={logout}
            className="ml-1 sm:ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

