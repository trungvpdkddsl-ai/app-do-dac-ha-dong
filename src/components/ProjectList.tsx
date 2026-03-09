import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Search, Filter, MapPin, Calendar, ChevronRight, CheckCircle2 } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';
import { ProjectDetail } from './ProjectDetail';

import { ProcedureType, ProjectStage } from '../types';

export const ProjectList: React.FC = () => {
  const { projects, currentUser, addProject } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    client: '',
    location: '',
    phone: '',
    procedureType: 'Cấp lần đầu' as ProcedureType
  });

  const generateProjectName = (procedureType: ProcedureType) => {
    const abbreviations: Record<string, string> = {
      'Cấp lần đầu': 'CLD',
      'Cấp đổi': 'CD',
      'Thừa kế': 'TK',
      'Tặng cho': 'TC',
      'Chuyển nhượng': 'CN',
      'Chỉ đo đạc': 'CDD'
    };
    
    const abbr = abbreviations[procedureType] || 'DA';
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    
    return `${abbr}-${dd}${mm}${yyyy}`;
  };

  const calculateDeadline = (procedureType: ProcedureType) => {
    const today = new Date();
    let daysToAdd = 0;
    
    if (['Cấp lần đầu', 'Cấp đổi'].includes(procedureType)) {
      daysToAdd = 20;
    } else if (procedureType === 'Chỉ đo đạc') {
      daysToAdd = 2;
    } else if (['Thừa kế', 'Chuyển nhượng', 'Tặng cho'].includes(procedureType)) {
      daysToAdd = 10;
    }
    
    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split('T')[0];
  };

  const getStageSLA = (stageName: string): number => {
    if (stageName.includes('đo') && !stageName.includes('trích đo')) return 2;
    if (stageName.includes('trích đo')) return 1;
    if (stageName.includes('hồ sơ') && !stageName.includes('Nộp')) return 2;
    if (stageName.includes('Nộp hồ sơ')) return 1;
    return 1;
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectName = generateProjectName(newProject.procedureType);
    const deadline = calculateDeadline(newProject.procedureType);
    
    // Generate project code DA-YYYY-XXX
    const year = new Date().getFullYear();
    const existingProjectsThisYear = projects.filter(p => p.code.startsWith(`DA-${year}`));
    const nextNumber = existingProjectsThisYear.length + 1;
    const projectCode = `DA-${year}-${nextNumber.toString().padStart(3, '0')}`;
    
    let stages: ProjectStage[] = [];
    
    const getInitialStageDeadline = (stageName: string) => {
      const today = new Date();
      today.setDate(today.getDate() + getStageSLA(stageName));
      return today.toISOString().split('T')[0];
    };

    if (newProject.procedureType === 'Chỉ đo đạc') {
      stages = [
        { id: `s${Date.now()}-1`, name: 'Giao cho nhân viên đo', assigneeId: '', deadline: getInitialStageDeadline('Giao cho nhân viên đo'), status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-2`, name: 'Hoàn thiện trích đo', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-3`, name: 'Kết thúc', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
      ];
    } else if (['Cấp lần đầu', 'Cấp đổi'].includes(newProject.procedureType)) {
      stages = [
        { id: `s${Date.now()}-1`, name: 'Giao cho nhân viên đo', assigneeId: '', deadline: getInitialStageDeadline('Giao cho nhân viên đo'), status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-2`, name: 'Hoàn thiện trích đo', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-3`, name: 'Hoàn thiện hồ sơ', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-4`, name: 'Nộp hồ sơ', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-5`, name: 'Kết thúc', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
      ];
    } else {
      stages = [
        { id: `s${Date.now()}-1`, name: 'Làm hồ sơ', assigneeId: '', deadline: getInitialStageDeadline('Làm hồ sơ'), status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-2`, name: 'Nộp hồ sơ', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
        { id: `s${Date.now()}-3`, name: 'Kết thúc', assigneeId: '', deadline: deadline, status: 'pending' as const, attachments: [] },
      ];
    }
    
    const project = {
      id: `p${Date.now()}`,
      code: projectCode,
      name: projectName,
      client: newProject.client,
      location: newProject.location,
      phone: newProject.phone,
      procedureType: newProject.procedureType,
      startDate: new Date().toISOString().split('T')[0],
      overallDeadline: deadline,
      status: 'active' as const,
      hasIssue: false,
      issues: [],
      stages
    };
    
    addProject(project);
    setIsCreateModalOpen(false);
    setNewProject({ client: '', location: '', phone: '', procedureType: 'Cấp lần đầu' });
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedProject) {
    return <ProjectDetail projectId={selectedProject} onBack={(msg?: string) => {
      setSelectedProject(null);
      if (msg) {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      {successMessage && (
        <div className="mb-4 bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dự án đo đạc</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Quản lý danh sách các dự án và tiến độ thực hiện.</p>
        </div>
        
        {currentUser.role === 'manager' && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Tạo dự án mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-slate-50/50 shrink-0">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, mã dự án..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-sm"
            />
          </div>
          <button className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50">
            <Filter size={16} />
            Lọc
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-[800px]">
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
                        <div className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                          {project.name}
                          {project.hasIssue && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600" title="Có phát sinh">
                              <span className="text-xs font-bold">!</span>
                            </span>
                          )}
                        </div>
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
                <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-900">Không tìm thấy dự án nào</p>
                <p className="mt-1">Thử thay đổi từ khóa tìm kiếm.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Tạo dự án mới</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại thủ tục</label>
                  <select 
                    required
                    value={newProject.procedureType}
                    onChange={e => setNewProject({...newProject, procedureType: e.target.value as ProcedureType})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  >
                    <option value="Cấp lần đầu">Cấp lần đầu</option>
                    <option value="Cấp đổi">Cấp đổi</option>
                    <option value="Thừa kế">Thừa kế</option>
                    <option value="Tặng cho">Tặng cho</option>
                    <option value="Chuyển nhượng">Chuyển nhượng</option>
                    <option value="Chỉ đo đạc">Chỉ đo đạc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên Khách hàng</label>
                  <input 
                    type="text" 
                    required
                    value={newProject.client}
                    onChange={e => setNewProject({...newProject, client: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Nhập tên khách hàng"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                  <input 
                    type="text" 
                    required
                    value={newProject.location}
                    onChange={e => setNewProject({...newProject, location: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Nhập địa chỉ dự án"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                  <input 
                    type="tel" 
                    required
                    value={newProject.phone}
                    onChange={e => setNewProject({...newProject, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Nhập số điện thoại liên hệ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót (Tự động tính)</label>
                  <input 
                    type="date" 
                    readOnly
                    value={calculateDeadline(newProject.procedureType)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
