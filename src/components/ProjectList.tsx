import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Search, Filter, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';
import { ProjectDetail } from './ProjectDetail';

export const ProjectList: React.FC = () => {
  const { projects, currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedProject) {
    return <ProjectDetail projectId={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dự án đo đạc</h1>
          <p className="text-slate-500 mt-1">Quản lý danh sách các dự án và tiến độ thực hiện.</p>
        </div>
        
        {currentUser.role === 'manager' && (
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
            <Plus size={18} />
            Tạo dự án mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, mã dự án..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-sm"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2 hover:bg-slate-50">
            <Filter size={16} />
            Lọc
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 pl-6">Mã DA</th>
                <th className="p-4">Tên dự án</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4">Tiến độ</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Hạn chót</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map(project => {
                const completedStages = project.stages.filter(s => s.status === 'completed').length;
                const progress = Math.round((completedStages / project.stages.length) * 100);
                
                return (
                  <tr 
                    key={project.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <td className="p-4 pl-6">
                      <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {project.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 mb-1">{project.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={12} />
                        {project.location}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{project.client}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                          <div 
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-8">{progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {formatDate(project.overallDeadline)}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button className="text-slate-400 group-hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredProjects.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <Map size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-900">Không tìm thấy dự án nào</p>
              <p className="mt-1">Thử thay đổi từ khóa tìm kiếm.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
