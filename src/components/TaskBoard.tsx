import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Clock, CheckCircle2, AlertCircle, Map, Circle, Paperclip, Settings, Check } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export const TaskBoard: React.FC = () => {
  const { projects, currentUser, updateProjectStage } = useAppContext();
  
  const [visibleColumns, setVisibleColumns] = useState({
    pending: true,
    in_progress: true,
    overdue: true,
    completed: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy tất cả các task được giao cho user hiện tại
  const myTasks = projects.flatMap(p => 
    p.stages
      .filter(s => s.assigneeId === currentUser.id)
      .map(s => ({ ...s, projectId: p.id, projectName: p.name, projectCode: p.code }))
  );

  const pendingTasks = myTasks.filter(t => t.status === 'pending');
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress');
  const overdueTasks = myTasks.filter(t => t.status === 'overdue');
  const completedTasks = myTasks.filter(t => t.status === 'completed');

  const handleStatusChange = (projectId: string, stageId: string, newStatus: any) => {
    updateProjectStage(projectId, stageId, newStatus);
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const Column = ({ title, tasks, icon: Icon, colorClass }: any) => (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col h-full min-w-[320px] max-w-sm flex-1 shrink-0">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <Icon size={18} className={colorClass} />
          {title}
          <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full ml-2">
            {tasks.length}
          </span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {tasks.map((task: any) => (
          <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {task.projectCode}
              </span>
              {task.status === 'overdue' && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                  <AlertCircle size={12} /> Quá hạn
                </span>
              )}
            </div>
            
            <h4 className="font-bold text-slate-900 mb-1 leading-tight">{task.name}</h4>
            <div className="text-xs text-slate-500 mb-4 line-clamp-2 flex items-start gap-1.5">
              <Map size={14} className="shrink-0 mt-0.5" />
              {task.projectName}
            </div>
            
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock size={14} className={task.status === 'overdue' ? 'text-red-500' : ''} />
                  <span className={task.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                    {formatDate(task.deadline)}
                  </span>
                </div>
                {task.attachments && task.attachments.length > 0 && (
                  <div className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md flex items-center gap-1" title="Tài liệu đính kèm">
                    <Paperclip size={12} />
                    <span>{task.attachments.length}</span>
                  </div>
                )}
              </div>
              
              {/* Actions based on current status */}
              {task.status === 'pending' && (
                <button 
                  onClick={() => handleStatusChange(task.projectId, task.id, 'in_progress')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Bắt đầu
                </button>
              )}
              {(task.status === 'in_progress' || task.status === 'overdue') && (
                <button 
                  onClick={() => handleStatusChange(task.projectId, task.id, 'completed')}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Hoàn thành
                </button>
              )}
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-sm">Không có công việc</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Công việc của tôi</h1>
          <p className="text-slate-500 mt-1">Quản lý và cập nhật tiến độ các công việc được giao.</p>
        </div>
        
        <div className="relative" ref={settingsRef}>
          <button 
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Settings size={16} />
            Tùy chỉnh cột
          </button>
          
          {showColumnSettings && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hiển thị cột</h4>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button 
                  onClick={() => toggleColumn('pending')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2"><Circle size={14} className="text-slate-400" /> Chờ xử lý</span>
                  {visibleColumns.pending && <Check size={16} className="text-indigo-600" />}
                </button>
                <button 
                  onClick={() => toggleColumn('in_progress')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2"><Clock size={14} className="text-blue-500" /> Đang thực hiện</span>
                  {visibleColumns.in_progress && <Check size={16} className="text-indigo-600" />}
                </button>
                <button 
                  onClick={() => toggleColumn('overdue')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2"><AlertCircle size={14} className="text-red-500" /> Quá hạn</span>
                  {visibleColumns.overdue && <Check size={16} className="text-indigo-600" />}
                </button>
                <button 
                  onClick={() => toggleColumn('completed')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Đã hoàn thành</span>
                  {visibleColumns.completed && <Check size={16} className="text-indigo-600" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 overflow-x-auto pb-4 custom-scrollbar">
        {visibleColumns.pending && <Column title="Chờ xử lý" tasks={pendingTasks} icon={Circle} colorClass="text-slate-400" />}
        {visibleColumns.in_progress && <Column title="Đang thực hiện" tasks={inProgressTasks} icon={Clock} colorClass="text-blue-500" />}
        {visibleColumns.overdue && <Column title="Quá hạn" tasks={overdueTasks} icon={AlertCircle} colorClass="text-red-500" />}
        {visibleColumns.completed && <Column title="Đã hoàn thành" tasks={completedTasks} icon={CheckCircle2} colorClass="text-emerald-500" />}
        
        {!Object.values(visibleColumns).some(Boolean) && (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <Settings size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-600">Chưa chọn cột hiển thị</p>
            <p className="text-sm mt-1">Vui lòng chọn ít nhất một cột từ menu Tùy chỉnh cột.</p>
          </div>
        )}
      </div>
    </div>
  );
};
