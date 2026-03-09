import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Map, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';

export const Dashboard: React.FC = () => {
  const { projects, currentUser } = useAppContext();

  if (!currentUser) return null;

  const isManager = currentUser.role === 'manager';

  // Nhân viên chỉ thấy dự án được giao
  const visibleProjects = isManager
    ? projects
    : projects.filter(p => p.stages.some(s => s.assigneeId === currentUser.id));

  const activeProjects   = visibleProjects.filter(p => p.status === 'active').length;
  const completedProjects = visibleProjects.filter(p => p.status === 'completed').length;
  
  const allStages = visibleProjects.flatMap(p => p.stages.map(s => ({ ...s, projectName: p.name, projectCode: p.code })));
  
  const myTasks        = allStages.filter(s => s.assigneeId === currentUser.id);
  const myPendingTasks = myTasks.filter(s => s.status === 'pending' || s.status === 'in_progress');
  // Manager thấy tất cả quá hạn, nhân viên chỉ thấy của mình
  const overdueTasks   = isManager
    ? allStages.filter(s => s.status === 'overdue')
    : myTasks.filter(s => s.status === 'overdue');

  const stats = [
    { label: 'Dự án đang chạy', value: activeProjects, icon: Map, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Dự án hoàn thành', value: completedProjects, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Công việc của tôi', value: myPendingTasks.length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Công việc quá hạn', value: overdueTasks.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Xin chào {currentUser.name}, chúc bạn một ngày làm việc hiệu quả.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                <Icon size={20} className={`md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl md:text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs md:text-sm font-medium text-slate-500 truncate">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Dự án gần đây</h2>
            <button className="text-xs md:text-sm text-indigo-600 font-medium hover:text-indigo-700">Xem tất cả</button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {visibleProjects.slice(0, 5).map(project => (
              <div key={project.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors min-w-[300px]">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-slate-500 mb-1">{project.code}</div>
                    <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs md:text-sm text-slate-500 mt-3 md:mt-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Map size={14} className="shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock size={14} />
                    <span>Hạn: {formatDate(project.overallDeadline)}</span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Tiến độ</span>
                    <span className="font-medium text-slate-700">
                      {Math.round((project.stages.filter(s => s.status === 'completed').length / project.stages.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${(project.stages.filter(s => s.status === 'completed').length / project.stages.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Công việc cần làm</h2>
            <button className="text-xs md:text-sm text-indigo-600 font-medium hover:text-indigo-700">Xem tất cả</button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {myPendingTasks.length > 0 ? myPendingTasks.slice(0, 5).map(task => (
              <div key={task.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors flex gap-3 md:gap-4 min-w-[300px]">
                <div className="mt-1 shrink-0">
                  <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center ${
                    task.status === 'in_progress' ? 'border-blue-500' : 'border-slate-300'
                  }`}>
                    {task.status === 'in_progress' && <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-blue-500 rounded-full"></div>}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base truncate">{task.name}</h3>
                  <div className="text-xs md:text-sm text-slate-500 mt-1 truncate">{task.projectName}</div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 md:mt-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      Hạn: {formatDate(task.deadline)}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 size={40} className="mx-auto text-slate-300 mb-3 md:w-12 md:h-12" />
                <p className="text-sm md:text-base">Bạn không có công việc nào đang chờ xử lý.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
