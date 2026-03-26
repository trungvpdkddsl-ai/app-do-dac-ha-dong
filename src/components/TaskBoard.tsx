import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Clock, CheckCircle2, AlertCircle, Map as MapIcon, Circle, Paperclip, ExternalLink, Settings, Check } from 'lucide-react';
import { formatDate } from '../utils/helpers';

type TaskBoardProps = {
  onNavigateToProject?: (projectId: string) => void;
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ onNavigateToProject }) => {
  const { projects, currentUser, users } = useAppContext();
  const [visibleColumns, setVisibleColumns] = useState({ in_progress: true, overdue: true, completed: true });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowColumnSettings(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const myTasks = projects.flatMap(p =>
    p.stages
      .filter(s => s.assigneeIds?.includes(currentUser.id))
      .map(s => ({ ...s, projectId: p.id, projectName: p.name, projectCode: p.code, ownerId: p.ownerId, isPriority: p.isPriority }))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison

  const inProgressTasks = myTasks.filter(t => {
    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);
    return t.status === 'in_progress' && deadline >= today;
  });

  const overdueTasks = myTasks.filter(t => {
    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);
    return t.status !== 'completed' && deadline < today;
  });

  const completedTasks  = myTasks.filter(t => t.status === 'completed');

  const toggleColumn = (key: keyof typeof visibleColumns) =>
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));

  // ── YÊU CẦU 3: TaskCard chỉ có nút "Xem chi tiết", không có nút thao tác nhanh ──
  const TaskCard: React.FC<{ task: typeof myTasks[0] }> = ({ task }) => {
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0 || task.status === 'overdue';
    const isUrgent  = !isOverdue && (diffDays === 0 || diffDays === 1);

    return (
      <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex flex-col gap-1">
            {task.ownerId && (
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Chủ hồ sơ: {users.find(u => u.username === task.ownerId || u.id === task.ownerId)?.name || task.ownerId}
              </span>
            )}
            <div className="flex items-center gap-2">
              {task.isPriority && (
                <span className="text-[10px] md:text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                  🔥 GẤP
                </span>
              )}
              {task.status === 'overdue' && (
                <span className="text-[10px] md:text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                  <AlertCircle size={12} /> Quá hạn
                </span>
              )}
              {task.status === 'completed' && (
                <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Hoàn thành
                </span>
              )}
            </div>
          </div>
        </div>

        <h4 className="font-bold text-slate-900 mb-1 leading-tight text-sm md:text-base">{task.name}</h4>
        <div className="text-[10px] md:text-xs text-slate-500 mb-3 flex items-start gap-1.5">
          <MapIcon size={14} className="shrink-0 mt-0.5" />
          <span className="line-clamp-2">{task.projectName}</span>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1.5">
              <Clock size={14} className={task.status === 'overdue' ? 'text-red-500' : ''} />
              <span className={task.status === 'overdue' ? 'text-red-600 font-medium' : ''}>{formatDate(task.deadline)}</span>
            </div>
            {task.attachments && task.attachments.length > 0 && (
              <div className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <Paperclip size={12} /> {task.attachments.length}
              </div>
            )}
          </div>
          <div className={`text-[10px] px-2 py-0.5 rounded font-medium w-fit ${
            isOverdue ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {isOverdue ? '🔴 Quá hạn' : isUrgent ? '🟡 Còn 1 ngày' : `🟢 Còn ${diffDays} ngày`}
          </div>

          {/* YÊU CẦU 3: CHỈ có nút Xem chi tiết, không có Hoàn thành / Bắt đầu */}
          {onNavigateToProject && (
            <button
              onClick={() => onNavigateToProject(task.projectId)}
              className="w-full mt-1 text-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={13} /> Xem chi tiết hồ sơ
            </button>
          )}
        </div>
      </div>
    );
  };

  const Column = ({ title, tasks, icon: Icon, colorClass }: { title: string; tasks: typeof myTasks; icon: React.ElementType; colorClass: string }) => (
    <div className="bg-slate-50 rounded-2xl p-3 md:p-4 border border-slate-200 flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3 md:mb-4 px-1 md:px-2 shrink-0">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base">
          <Icon size={18} className={colorClass} />
          {title}
          <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full ml-1">{tasks.length}</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        {tasks.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-xs md:text-sm">Không có công việc</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Công việc của tôi</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            Nhấn <strong>"Xem chi tiết hồ sơ"</strong> để thực hiện thao tác hoàn thành, chuyển tiếp, trả lại...
          </p>
        </div>
        <div className="relative w-full sm:w-auto" ref={settingsRef}>
          <button onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Settings size={16} /> Tùy chỉnh cột
          </button>
          {showColumnSettings && (
            <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hiển thị cột</h4>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {[
                  { key: 'in_progress' as const,  label: 'Đang thực hiện',  icon: Clock,       color: 'text-blue-500'  },
                  { key: 'overdue' as const,      label: 'Quá hạn',          icon: AlertCircle, color: 'text-red-500'   },
                  { key: 'completed' as const,    label: 'Đã hoàn thành',   icon: CheckCircle2, color: 'text-emerald-500' },
                ].map(({ key, label, icon: Icon, color }) => (
                  <button key={key} onClick={() => toggleColumn(key)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                    <span className="flex items-center gap-2"><Icon size={14} className={color} /> {label}</span>
                    {visibleColumns[key] && <Check size={16} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 md:gap-6 flex-1 min-h-0 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
        {visibleColumns.in_progress && <div className="snap-center shrink-0 w-[85vw] sm:w-[300px]"><Column title="Đang thực hiện" tasks={inProgressTasks}  icon={Clock}       colorClass="text-blue-500"    /></div>}
        {visibleColumns.overdue    && <div className="snap-center shrink-0 w-[85vw] sm:w-[300px]"><Column title="Quá hạn"        tasks={overdueTasks}    icon={AlertCircle} colorClass="text-red-500"     /></div>}
        {visibleColumns.completed  && <div className="snap-center shrink-0 w-[85vw] sm:w-[300px]"><Column title="Đã hoàn thành" tasks={completedTasks}  icon={CheckCircle2} colorClass="text-emerald-500" /></div>}
        {!Object.values(visibleColumns).some(Boolean) && (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <Settings size={40} className="text-slate-300 mb-4" />
            <p className="text-base font-medium text-slate-600">Chưa chọn cột hiển thị</p>
          </div>
        )}
      </div>
    </div>
  );
};
