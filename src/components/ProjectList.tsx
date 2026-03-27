import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Search, Filter, MapPin, Navigation, Calendar, ChevronRight, CheckCircle2, User as UserIcon, Star } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';
import { ProjectDetail } from './ProjectDetail';
import { ProcedureType, ProjectStage } from '../types';

type ProjectListProps = {
  initialProjectId?: string | null;
  onProjectOpened?: () => void;
};

export const ProjectList: React.FC<ProjectListProps> = ({ initialProjectId, onProjectOpened }) => {
  const { projects, users, currentUser, addProject, updateProjectInfo } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(initialProjectId || null);

  // Phân quyền xem thông tin nhạy cảm (SĐT, Google Maps)
  // Đã mở khóa cho toàn bộ nhân viên theo yêu cầu
  const canViewSensitiveInfo = true;

  // Mở ngay chi tiết dự án nếu được navigate từ TaskBoard / notification
  React.useEffect(() => {
    if (initialProjectId) {
      setSelectedProject(initialProjectId);
      onProjectOpened?.();
    }
  }, [initialProjectId]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProcedure, setFilterProcedure] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    client: '',
    location: '',
    phone: '',
    mapUrl: '',
    procedureType: 'Cấp lần đầu' as ProcedureType,
    redBookName: '',       // Tên trên bìa đỏ
    contactPhone: '',      // SĐT liên hệ chung
    // Thông tin pháp lý chủ sử dụng đất
    customerFullName: '',
    customerDob: '',
    customerIdNumber: '',
    customerIdIssueDate: '',
    customerIdIssuePlace: '',
    customerAddress: '',
    ownerId: currentUser?.username || currentUser?.id || '',
    collaborator: '',
    isUrgent: false,
  });

  // ── YÊU CẦU 1: Tên dự án theo cú pháp [Viết tắt]-[DDMMYYYY]-[Khách hàng]-[Địa chỉ] ──
  const generateProjectName = (procedureType: ProcedureType, client: string, location: string) => {
    const abbreviations: Record<string, string> = {
      'Cấp lần đầu': 'CLD',
      'Cấp đổi': 'CD',
      'Thừa kế': 'TK',
      'Tặng cho': 'TC',
      'Chuyển nhượng': 'CN',
      'Chỉ đo đạc': 'CDD',
      'Tách thửa': 'TT',
      'Đính chính': 'DC',
      'Chuyển mục đích sử dụng đất': 'CMD',
    };
    const abbr = abbreviations[procedureType] || 'DA';
    const today = new Date();
    const dd   = String(today.getDate()).padStart(2, '0');
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    // Chuẩn hoá: bỏ ký tự đặc biệt, giữ chữ và số
    const safeClient   = (client || '').trim();
    const safeLocation = (location || '').trim();
    return `${abbr}-${dd}${mm}${yyyy}-${safeClient}-${safeLocation}`;
  };

  const calculateDeadline = (procedureType: ProcedureType) => {
    const today = new Date();
    let daysToAdd = 0;
    if (['Cấp lần đầu', 'Cấp đổi', 'Tách thửa'].includes(procedureType)) daysToAdd = 20;
    else if (procedureType === 'Chỉ đo đạc') daysToAdd = 2;
    else if (['Thừa kế', 'Chuyển nhượng', 'Tặng cho'].includes(procedureType)) daysToAdd = 10;
    else if (procedureType === 'Đính chính') daysToAdd = 7;
    else if (procedureType === 'Chuyển mục đích sử dụng đất') daysToAdd = 15;
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
    // YÊU CẦU 1: Tên dự án đầy đủ
    const projectName = generateProjectName(newProject.procedureType, newProject.client, newProject.location);
    const deadline    = calculateDeadline(newProject.procedureType);

    // ID ẩn — vẫn giữ code DA-YYYY-XXX nhưng KHÔNG hiển thị trên UI
    const year = new Date().getFullYear();
    const existingProjectsThisYear = projects.filter(p => p.code.startsWith(`DA-${year}`));
    const nextNumber  = existingProjectsThisYear.length + 1;
    const projectCode = `DA-${year}-${nextNumber.toString().padStart(3, '0')}`;

    const getInitialStageDeadline = (stageName: string) => {
      const d = new Date(); d.setDate(d.getDate() + getStageSLA(stageName));
      return d.toISOString().split('T')[0];
    };
    const uid = () => crypto.randomUUID();

    // ── YÊU CẦU 4: Thêm "Nộp hồ sơ" và "Trả kết quả hồ sơ" vào cuối mỗi quy trình ──
    let stages: ProjectStage[] = [];
    const stageNopHoSo   = { id: uid(), name: 'Nộp hồ sơ',          assigneeIds: [], deadline: deadline, status: 'pending' as const, attachments: [] };
    const stageTraKetQua = { id: uid(), name: 'Trả kết quả hồ sơ',   assigneeIds: [], deadline: deadline, status: 'pending' as const, attachments: [] };

    if (newProject.procedureType === 'Chỉ đo đạc') {
      stages = [
        { id: uid(), name: 'Giao cho nhân viên đo',  assigneeIds: [currentUser.id], deadline: getInitialStageDeadline('Giao cho nhân viên đo'), status: 'in_progress' as const, attachments: [] },
        { id: uid(), name: 'Hoàn thiện trích đo',    assigneeIds: [], deadline: deadline, status: 'pending' as const, attachments: [] },
        stageTraKetQua,
      ];
    } else if (['Cấp lần đầu', 'Cấp đổi', 'Tách thửa'].includes(newProject.procedureType)) {
      stages = [
        { id: uid(), name: 'Giao cho nhân viên đo',  assigneeIds: [currentUser.id], deadline: getInitialStageDeadline('Giao cho nhân viên đo'), status: 'in_progress' as const, attachments: [] },
        { id: uid(), name: 'Hoàn thiện trích đo',    assigneeIds: [], deadline: deadline, status: 'pending' as const, attachments: [] },
        { id: uid(), name: 'Hoàn thiện hồ sơ',       assigneeIds: [], deadline: deadline, status: 'pending' as const, attachments: [] },
        stageNopHoSo,
        stageTraKetQua,
      ];
    } else if (newProject.procedureType === 'Đính chính') {
      stages = [
        { id: uid(), name: 'Nội nghiệp xử lý hồ sơ', assigneeIds: [currentUser.id], deadline: getInitialStageDeadline('Nội nghiệp xử lý hồ sơ'), status: 'in_progress' as const, attachments: [] },
        stageNopHoSo,
        stageTraKetQua,
      ];
    } else if (newProject.procedureType === 'Chuyển mục đích sử dụng đất') {
      stages = [
        { id: uid(), name: 'Nội nghiệp xử lý hồ sơ', assigneeIds: [currentUser.id], deadline: getInitialStageDeadline('Nội nghiệp xử lý hồ sơ'), status: 'in_progress' as const, attachments: [] },
        stageNopHoSo,
        { id: uid(), name: 'Nhận và Trả kết quả',     assigneeIds: [], deadline: deadline, status: 'pending' as const, attachments: [] },
      ];
    } else {
      // Thừa kế, Tặng cho, Chuyển nhượng
      stages = [
        { id: uid(), name: 'Làm hồ sơ', assigneeIds: [currentUser.id], deadline: getInitialStageDeadline('Làm hồ sơ'), status: 'in_progress' as const, attachments: [] },
        stageNopHoSo,
        stageTraKetQua,
      ];
    }

    const project = {
      id: `p${Date.now()}`,
      code: projectCode,
      name: projectName,
      client: newProject.client,
      location: newProject.location,
      phone: newProject.phone,
      mapUrl: newProject.mapUrl.trim() || undefined,
      procedureType: newProject.procedureType,
      redBookName: newProject.redBookName.trim() || undefined,
      contactPhone: newProject.contactPhone.trim() || undefined,
      startDate: new Date().toISOString().split('T')[0],
      overallDeadline: deadline,
      status: 'active' as const,
      hasIssue: false,
      issues: [],
      stages,
      customerInfo: {
        fullName: newProject.customerFullName.trim(),
        dob: newProject.customerDob,
        idNumber: newProject.customerIdNumber.trim(),
        idIssueDate: newProject.customerIdIssueDate,
        idIssuePlace: newProject.customerIdIssuePlace.trim(),
        address: newProject.customerAddress.trim(),
      },
      ownerId: newProject.ownerId,
      collaborator: newProject.collaborator.trim() || undefined,
      isPriority: false,
      isUrgent: (newProject as any).isUrgent || false,
    };

    addProject(project);
    setIsCreateModalOpen(false);
    setNewProject({ client: '', location: '', phone: '', mapUrl: '', procedureType: 'Cấp lần đầu', redBookName: '', contactPhone: '', customerFullName: '', customerDob: '', customerIdNumber: '', customerIdIssueDate: '', customerIdIssuePlace: '', customerAddress: '', ownerId: currentUser?.username || currentUser?.id || '', collaborator: '', isUrgent: false });
    setSuccessMessage(`Đã tạo dự án: ${projectName}`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const filteredProjects = projects.filter(p => {
    if (currentUser.role !== 'manager') {
      if (!p.stages.some(s => s.assigneeIds?.includes(currentUser.id))) return false;
    }
    const matchSearch = searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone || '').includes(searchTerm);
    const matchStatus    = filterStatus === 'all' || p.status === filterStatus;
    const matchProcedure = filterProcedure === 'all' || p.procedureType === filterProcedure;
    return matchSearch && matchStatus && matchProcedure;
  }).sort((a, b) => {
    const aUrgent = a.isPriority || a.isUrgent;
    const bUrgent = b.isPriority || b.isUrgent;
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return 0;
  });

  if (selectedProject) {
    return <ProjectDetail projectId={selectedProject} onBack={(msg?: string) => {
      setSelectedProject(null);
      if (msg) { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000); }
    }} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      {successMessage && (
        <div className="mb-4 bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
          <CheckCircle2 size={18} />{successMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dự án đo đạc</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Quản lý danh sách các dự án và tiến độ thực hiện.</p>
        </div>
        {currentUser.role === 'manager' && (
          <button onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Plus size={18} /> Tạo dự án mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search & Filter */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-slate-50/50 shrink-0">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Tìm theo tên, khách hàng, địa chỉ..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div className="relative">
            <button onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full sm:w-auto px-4 py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors ${(filterStatus !== 'all' || filterProcedure !== 'all') ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-700'}`}>
              <Filter size={16} /> Lọc {(filterStatus !== 'all' || filterProcedure !== 'all') ? '•' : ''}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Trạng thái</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500">
                    <option value="all">Tất cả</option>
                    <option value="active">Đang triển khai</option>
                    <option value="planning">Lên kế hoạch</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="on_hold">Tạm dừng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loại thủ tục</label>
                  <select value={filterProcedure} onChange={e => setFilterProcedure(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500">
                    <option value="all">Tất cả</option>
                    {['Cấp lần đầu','Cấp đổi','Tách thửa','Thừa kế','Tặng cho','Chuyển nhượng','Chỉ đo đạc','Đính chính','Chuyển mục đích sử dụng đất'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => { setFilterStatus('all'); setFilterProcedure('all'); setIsFilterOpen(false); }}
                  className="w-full text-xs text-slate-500 hover:text-red-500 text-center pt-1">Xóa bộ lọc</button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-[700px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  {/* YÊU CẦU 1: Bỏ cột "Mã DA" */}
                  <th className="p-4 pl-6">Tên dự án</th>
                  <th className="p-4">Khách hàng</th>
                  <th className="p-4">Đang xử lý</th>{/* YÊU CẦU 2 */}
                  <th className="p-4">Tiến độ</th>
                  <th className="p-4">Giai đoạn</th>
                  <th className="p-4">Hạn chót</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map(project => {
                  const completedStages = project.stages.filter(s => s.status === 'completed').length;
                  const progress = Math.round((completedStages / project.stages.length) * 100);

                  // Deadline
                  const today    = new Date(); today.setHours(0,0,0,0);
                  const deadline = new Date(project.overallDeadline); deadline.setHours(0,0,0,0);
                  const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diffDays < 0 || project.stages.some(s => s.status === 'overdue');
                  const isUrgent  = !isOverdue && diffDays <= 1;
                  const hasIssue  = project.hasIssue;

                  const rowColor = hasIssue || isOverdue ? 'border-l-4 border-l-red-500 bg-red-50/40'
                    : isUrgent ? 'border-l-4 border-l-amber-400 bg-amber-50/40'
                    : 'border-l-4 border-l-emerald-400';
                  const progressColor = hasIssue || isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';
                  const deadlineBadge = hasIssue || isOverdue
                    ? <span className="text-xs font-semibold text-red-600">🔴 Quá hạn</span>
                    : isUrgent ? <span className="text-xs font-semibold text-amber-600">🟡 Còn 1 ngày</span>
                    : <span className="text-xs font-semibold text-emerald-600">🟢 Còn {diffDays} ngày</span>;

                  // ── YÊU CẦU 2: Người đang xử lý (stage in_progress) ──
                  const activeStage = project.stages.find(s => s.status === 'in_progress' || s.status === 'overdue');
                  const handlerUsers = activeStage ? users.filter(u => activeStage.assigneeIds?.includes(u.id)) : [];

                  return (
                    <tr key={project.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${rowColor}`}
                      onClick={() => setSelectedProject(project.id)}>
                      {/* YÊU CẦU 1: Không có cột Mã DA */}
                      <td className="p-4 pl-6">
                        {project.ownerId && (
                          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                            Chủ hồ sơ: {users.find(u => u.username === project.ownerId || u.id === project.ownerId)?.name || project.ownerId}
                          </div>
                        )}
                        <div className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateProjectInfo(project.id, { isPriority: !project.isPriority });
                            }}
                            className={`p-1 -ml-1 rounded-full hover:bg-slate-200 transition-colors ${project.isPriority ? 'text-amber-500' : 'text-slate-300'}`}
                            title={project.isPriority ? "Bỏ ưu tiên" : "Đánh dấu ưu tiên"}
                          >
                            <Star size={16} fill={project.isPriority ? "currentColor" : "none"} />
                          </button>
                          {project.name}
                          {(project.isPriority || project.isUrgent) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">🔥 GẤP</span>
                          )}
                          {project.hasIssue && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">! Phát sinh</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} />{project.location}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        <div className="font-medium">{project.client}</div>
                        {project.phone && (
                          canViewSensitiveInfo
                            ? <div className="text-xs text-slate-400">{project.phone}</div>
                            : <div className="text-xs text-slate-300 italic">*** (Bảo mật)</div>
                        )}
                      </td>
                      {/* YÊU CẦU 2: Cột người xử lý */}
                      <td className="p-4">
                        {handlerUsers.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {handlerUsers.map(u => (
                                <div key={u.id} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0" title={u.name}>
                                  {u.name.charAt(0)}
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-800">
                                {handlerUsers.length === 1 ? handlerUsers[0].name : `${handlerUsers.length} người`}
                              </div>
                              <div className="text-[10px] text-slate-400">{activeStage?.name}</div>
                            </div>
                          </div>
                        ) : project.status === 'completed' ? (
                          <span className="text-xs text-emerald-600 font-medium">✓ Hoàn thành</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic flex items-center gap-1"><UserIcon size={12} /> Chưa giao</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-20">
                            <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-slate-600 w-8">{progress}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          if (project.status === 'completed')
                            return <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-100 text-emerald-800 border-emerald-200">✓ Hoàn thành</span>;
                          if (activeStage) {
                            const isOver = activeStage.status === 'overdue';
                            return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${isOver ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                              {isOver ? '⚠️ ' : '⚙️ '}{activeStage.name}
                            </span>;
                          }
                          const nextPending = project.stages.find(s => s.status === 'pending');
                          if (nextPending)
                            return <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">⏳ {nextPending.name}</span>;
                          return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>{getStatusLabel(project.status)}</span>;
                        })()}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" />{formatDate(project.overallDeadline)}</div>
                          {deadlineBadge}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {project.mapUrl && canViewSensitiveInfo && (
                            <a
                              href={project.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                            >
                              <Navigation size={13} /> Chỉ đường
                            </a>
                          )}
                          <button className="text-slate-400 group-hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50">
                            <ChevronRight size={20} />
                          </button>
                        </div>
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
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateProject} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Preview tên dự án */}
                {(newProject.client || newProject.location) && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="text-xs text-indigo-500 font-semibold uppercase mb-1">Tên dự án sẽ được tạo</div>
                    <div className="text-sm font-bold text-indigo-800 break-words">
                      {generateProjectName(newProject.procedureType, newProject.client || '...', newProject.location || '...')}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại thủ tục</label>
                  <select required value={newProject.procedureType}
                    onChange={e => setNewProject({...newProject, procedureType: e.target.value as ProcedureType})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    {['Cấp lần đầu','Cấp đổi','Tách thửa','Thừa kế','Tặng cho','Chuyển nhượng','Chỉ đo đạc','Đính chính','Chuyển mục đích sử dụng đất'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách hồ sơ (Sale/Chủ hồ sơ)</label>
                  <select required value={newProject.ownerId}
                    onChange={e => setNewProject({...newProject, ownerId: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">-- Chọn người phụ trách --</option>
                    {users.map(u => (
                      <option key={u.username || u.id} value={u.username || u.id}>{u.name} ({u.department})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nguồn gốc CTV / Giới thiệu</label>
                  <input type="text" value={newProject.collaborator}
                    onChange={e => setNewProject({...newProject, collaborator: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Nhập tên CTV hoặc nguồn giới thiệu..." />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={(newProject as any).isUrgent}
                      onChange={e => setNewProject({...newProject, isUrgent: e.target.checked} as any)}
                      className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                      🔥 Đánh dấu Hồ sơ GẤP
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên Khách hàng</label>
                  <input type="text" required value={newProject.client}
                    onChange={e => setNewProject({...newProject, client: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                  <input type="text" required value={newProject.location}
                    onChange={e => setNewProject({...newProject, location: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Hà Đông, Hà Nội" />
                </div>
                {canViewSensitiveInfo && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                    <input type="tel" value={newProject.phone}
                      onChange={e => setNewProject({...newProject, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0912 345 678" />
                  </div>
                )}
                {canViewSensitiveInfo && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                      <Navigation size={14} className="text-emerald-500" /> Link Google Maps
                      <span className="text-slate-400 font-normal text-xs">(không bắt buộc)</span>
                    </label>
                    <input type="url" value={newProject.mapUrl}
                      onChange={e => setNewProject({...newProject, mapUrl: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="https://maps.google.com/..." />
                    <p className="text-xs text-slate-400 mt-1">Dán link chia sẻ từ Google Maps để nhân viên ngoại nghiệp dẫn đường.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót (Tự động tính)</label>
                  <input type="date" readOnly value={calculateDeadline(newProject.procedureType)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 outline-none cursor-not-allowed" />
                </div>

                {/* ── Tên bìa đỏ & SĐT liên hệ ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tên trên bìa đỏ
                    </label>
                    <input type="text" value={newProject.redBookName}
                      onChange={e => setNewProject({...newProject, redBookName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Nguyễn Văn A" />
                    <p className="text-xs text-slate-400 mt-1">Tên ghi trên Giấy chứng nhận QSDĐ</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input type="tel" value={newProject.contactPhone}
                      onChange={e => setNewProject({...newProject, contactPhone: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0912 345 678" />
                    <p className="text-xs text-slate-400 mt-1">Hiển thị cho cả Nội nghiệp & Ngoại nghiệp</p>
                  </div>
                </div>

                {/* ── Thông tin pháp lý chủ sử dụng đất ── */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-sm font-bold text-slate-800">Thông tin chủ sử dụng đất</h3>
                    <span className="text-xs text-slate-400 font-normal">(dùng để xuất hồ sơ pháp lý)</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Họ và tên</label>
                      <input type="text" value={newProject.customerFullName}
                        onChange={e => setNewProject({...newProject, customerFullName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                        placeholder="Nguyễn Văn A" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Ngày sinh</label>
                        <input type="date" value={newProject.customerDob}
                          onChange={e => setNewProject({...newProject, customerDob: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Số CCCD</label>
                        <input type="text" value={newProject.customerIdNumber}
                          onChange={e => setNewProject({...newProject, customerIdNumber: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                          placeholder="012345678901" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Ngày cấp</label>
                        <input type="date" value={newProject.customerIdIssueDate}
                          onChange={e => setNewProject({...newProject, customerIdIssueDate: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Nơi cấp</label>
                        <input type="text" value={newProject.customerIdIssuePlace}
                          onChange={e => setNewProject({...newProject, customerIdIssuePlace: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                          placeholder="Cục CSQLHC về TTXH" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Địa chỉ thường trú</label>
                      <input type="text" value={newProject.customerAddress}
                        onChange={e => setNewProject({...newProject, customerAddress: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                <button type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
