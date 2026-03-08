import React from 'react';
import { LayoutDashboard, Map, CheckSquare, Users, Settings, BarChart2 } from 'lucide-react';

type SidebarProps = {
  currentView: string;
  setCurrentView: (view: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'projects', label: 'Dự án đo đạc', icon: Map },
    { id: 'tasks', label: 'Công việc của tôi', icon: CheckSquare },
    { id: 'reports', label: 'Báo cáo & Thống kê', icon: BarChart2 },
    { id: 'team', label: 'Nhân sự', icon: Users },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 text-white">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Map size={20} className="text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">GeoTask Pro</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors">
          <Settings size={20} className="text-slate-400" />
          Cài đặt
        </button>
      </div>
    </div>
  );
};
