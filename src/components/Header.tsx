import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, LogOut } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAppContext();

  if (!currentUser) return null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm dự án, công việc..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <NotificationDropdown />

        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-slate-900">{currentUser.name}</div>
            <div className="text-xs text-slate-500">{currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</div>
          </div>
          
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover"
          />
          
          <button 
            onClick={logout}
            className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

