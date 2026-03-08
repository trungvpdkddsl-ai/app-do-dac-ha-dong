import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Map, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';

export const Dashboard: React.FC = () => {
  const { projects, currentUser } = useAppContext();

  if (!currentUser) return null;

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  // Lấy tất cả các giai đoạn (công việc)
  const allStages = projects.flatMap(p => p.stages.map(s => ({ ...s, projectName: p.name, projectCode: p.code })));
  
  const myTasks = allStages.filter(s => s.assigneeId === currentUser.id);
  const myPendingTasks = myTasks.filter(s => s.status === 'pending' || s.status === 'in_progress');
  const overdueTasks = allStages.filter(s => s.status === 'overdue');

  const stats = [
    { label: 'Dự án đang chạy', value: activeProjects, icon: Map, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Dự án hoàn thành', value: completedProjects, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Công việc của tôi', value: myPendingTasks.length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Công việc quá hạn', value: overdueTasks.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-slate-500 mt-1">Xin chào {currentUser.name}, chúc bạn một ngày làm việc hiệu quả.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <Icon size={24} className={stat.color} />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm font-medium text-slate-500">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Dự án gần đây</h2>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">Xem tất cả</button>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.slice(0, 5).map(project => (
              <div key={project.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-xs font-mono text-slate-500 mb-1">{project.code}</div>
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Map size={14} />
                    <span className="truncate max-w-[200px]">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Công việc cần làm</h2>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">Xem tất cả</button>
          </div>
          <div className="divide-y divide-slate-100">
            {myPendingTasks.length > 0 ? myPendingTasks.slice(0, 5).map(task => (
              <div key={task.id} className="p-6 hover:bg-slate-50 transition-colors flex gap-4">
                <div className="mt-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    task.status === 'in_progress' ? 'border-blue-500' : 'border-slate-300'
                  }`}>
                    {task.status === 'in_progress' && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{task.name}</h3>
                  <div className="text-sm text-slate-500 mt-1">{task.projectName}</div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      Hạn: {formatDate(task.deadline)}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 size={48} className="mx-auto text-slate-300 mb-3" />
                <p>Bạn không có công việc nào đang chờ xử lý.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
