import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Map, CheckCircle2, AlertCircle, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';

type DashboardProps = {
  onNavigate: (view: string, projectId?: string) => void;
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { projects, currentUser } = useAppContext();

  if (!currentUser) return null;

  const isManager = currentUser.role === 'manager';

  // Nhân viên chỉ thấy dự án được giao
  const visibleProjects = isManager
    ? projects
    : projects.filter(p => p.stages.some(s => s.assigneeId === currentUser.id));

  const completedProjects = visibleProjects.filter(p => p.status === 'completed').length;
  const activeProjectsList = visibleProjects.filter(p => p.status === 'active');
  
  const allStages = projects.flatMap(p => p.stages.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectCode: p.code })));
  
  const myTasks        = allStages.filter(s => s.assigneeId === currentUser.id);
  const myPendingTasks = myTasks.filter(s => s.status === 'pending' || s.status === 'in_progress');
  // Manager thấy tất cả quá hạn, nhân viên chỉ thấy của mình
  const overdueTasks   = isManager
    ? allStages.filter(s => s.status === 'overdue')
    : myTasks.filter(s => s.status === 'overdue');
  
  const overdueProjects = activeProjectsList.filter(p => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(p.overallDeadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() < today.getTime();
  });

  const warningProjects = activeProjectsList.filter(p => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(p.overallDeadline);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  });

  const stats = [
    { label: 'Dự án đang chạy', value: activeProjectsList.length, icon: Map, color: 'text-indigo-600', bg: 'bg-indigo-100' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Hồ sơ quá hạn */}
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-red-100 bg-red-50 flex justify-between items-center shrink-0">
            <h2 className="text-base md:text-lg font-bold text-red-700 flex items-center gap-2">
              <AlertCircle size={18} /> Hồ sơ quá hạn
            </h2>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs md:text-sm text-red-600 font-medium hover:text-red-700 flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {overdueProjects.slice(0, 5).map(project => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const deadline = new Date(project.overallDeadline);
              deadline.setHours(0, 0, 0, 0);
              const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const hasIssue = project.hasIssue;

              return (
                <div key={project.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors min-w-[300px] border-l-4 border-l-red-500">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-500 mb-1">{project.code}</div>
                      <h3 className="font-semibold text-slate-900 truncate flex items-center gap-2">
                        {project.name}
                        {hasIssue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Phát sinh</span>}
                      </h3>
                    </div>
                    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                      Quá {Math.abs(diffDays)} ngày
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
                  <button
                    onClick={() => onNavigate('projects', project.id)}
                    className="mt-4 w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Xem chi tiết
                  </button>
                </div>
              );
            })}
            {overdueProjects.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
                <p className="text-sm">Không có hồ sơ quá hạn.</p>
              </div>
            )}
          </div>
        </div>

        {/* Hồ sơ sắp đến hạn */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-amber-100 bg-amber-50 flex justify-between items-center shrink-0">
            <h2 className="text-base md:text-lg font-bold text-amber-700 flex items-center gap-2">
              <Clock size={18} /> Hồ sơ sắp đến hạn
            </h2>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs md:text-sm text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {warningProjects.slice(0, 5).map(project => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const deadline = new Date(project.overallDeadline);
              deadline.setHours(0, 0, 0, 0);
              const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const hasIssue = project.hasIssue;

              return (
                <div key={project.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors min-w-[300px] border-l-4 border-l-amber-400">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-500 mb-1">{project.code}</div>
                      <h3 className="font-semibold text-slate-900 truncate flex items-center gap-2">
                        {project.name}
                        {hasIssue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Phát sinh</span>}
                      </h3>
                    </div>
                    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      {diffDays === 0 ? 'Hôm nay' : `Còn ${diffDays} ngày`}
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
                  <button
                    onClick={() => onNavigate('projects', project.id)}
                    className="mt-4 w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Xem chi tiết
                  </button>
                </div>
              );
            })}
            {warningProjects.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
                <p className="text-sm">Không có hồ sơ sắp đến hạn.</p>
              </div>
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Công việc cần làm</h2>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs md:text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {myPendingTasks.length > 0 ? myPendingTasks.slice(0, 5).map(task => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const deadline = new Date(task.deadline);
              deadline.setHours(0, 0, 0, 0);
              const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0 || task.status === 'overdue';
              const isUrgent = !isOverdue && (diffDays === 0 || diffDays === 1);
              return (
                <div key={task.id} className={`p-4 md:p-6 hover:bg-slate-50 transition-colors flex gap-3 md:gap-4 min-w-[300px] border-l-4 ${
                  isOverdue ? 'border-l-red-400' : isUrgent ? 'border-l-amber-400' : 'border-l-emerald-400'
                }`}>
                  <div className="mt-1 shrink-0">
                    <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center ${
                      isOverdue ? 'border-red-500' : isUrgent ? 'border-amber-500' : 'border-emerald-500'
                    }`}>
                      {task.status === 'in_progress' && <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${
                        isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></div>}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm md:text-base truncate">{task.name}</h3>
                    <div className="text-xs md:text-sm text-slate-500 mt-1 truncate">{task.projectName}</div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 md:mt-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-medium ${
                        isOverdue ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOverdue ? '🔴 Quá hạn' : isUrgent ? '🟡 Còn 1 ngày' : `🟢 Còn ${diffDays} ngày`}
                      </span>
                      <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        Hạn: {formatDate(task.deadline)}
                      </span>
                    </div>
                    {/* YÊU CẦU 3: Nút xem chi tiết */}
                    <button
                      onClick={() => onNavigate('projects', task.projectId)}
                      className="mt-2 w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={12} /> Xem chi tiết hồ sơ
                    </button>
                  </div>
                </div>
              );
            }) : (
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
