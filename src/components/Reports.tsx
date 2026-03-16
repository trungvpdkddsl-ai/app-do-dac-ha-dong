import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, CheckCircle2, AlertCircle, Clock, Download, Lock,
  TrendingUp, Filter, Search, FileSpreadsheet, ChevronDown,
  CalendarClock, UserCheck, Layers, ArrowUpRight,
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
type SlaLabel = 'on_time' | 'overdue_done' | 'running_late' | 'on_track';

interface FlatStage {
  employeeName: string;
  employeeId: string;
  projectLabel: string;
  projectCode: string;
  stageName: string;
  stageStatus: string;
  deadline: string;
  completedAt?: string;
  sla: SlaLabel;
}

// ─────────────────────────────────────────────
//  SLA EVALUATION
// ─────────────────────────────────────────────
function evaluateSla(status: string, deadline: string, completedAt?: string): SlaLabel {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl    = new Date(deadline); dl.setHours(0, 0, 0, 0);
  if (status === 'completed') {
    if (!completedAt) return 'on_time';
    const done = new Date(completedAt); done.setHours(0, 0, 0, 0);
    return done <= dl ? 'on_time' : 'overdue_done';
  }
  return today > dl ? 'running_late' : 'on_track';
}

const SLA_META: Record<SlaLabel, { label: string; bg: string; text: string; dot: string }> = {
  on_time:      { label: 'Đúng hạn',     bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue_done: { label: 'Quá hạn',      bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  running_late: { label: 'Đang trễ hạn', bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400'  },
  on_track:     { label: 'Trong hạn',    bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
};

const STATUS_LABEL: Record<string, string> = {
  completed:   'Hoàn thành',
  in_progress: 'Đang làm',
  pending:     'Chờ xử lý',
  overdue:     'Quá hạn',
  returned:    'Trả lại',
};

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────
export const Reports: React.FC = () => {
  const { projects, users, currentUser } = useAppContext();
  const isManager = currentUser?.role === 'manager';

  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterSla, setFilterSla]           = useState<string>('all');
  const [searchTerm, setSearchTerm]         = useState('');
  const [dateRange, setDateRange]           = useState('all');

  // ── Visible projects ─────────────────────────
  const visibleProjects = isManager
    ? projects
    : projects.filter(p => p.stages.some(s => s.assigneeId === currentUser?.id));

  // ── Data Transformation ──────────────────────
  const flatStages: FlatStage[] = useMemo(() => {
    const rows: FlatStage[] = [];
    for (const project of visibleProjects) {
      for (const stage of project.stages) {
        if (!stage.assigneeId) continue;
        const employee = users.find(u => u.id === stage.assigneeId);
        if (!employee) continue;
        const projectLabel = project.name || project.client || project.code;
        rows.push({
          employeeName: employee.name,
          employeeId:   employee.id,
          projectLabel,
          projectCode:  project.code,
          stageName:    stage.name,
          stageStatus:  stage.status,
          deadline:     stage.deadline,
          completedAt:  stage.completedAt,
          sla:          evaluateSla(stage.status, stage.deadline, stage.completedAt),
        });
      }
    }
    return rows;
  }, [visibleProjects, users]);

  // ── Date range filter ────────────────────────
  const getDateRangeStart = (): string | null => {
    const now = new Date();
    if (dateRange === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; }
    if (dateRange === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (dateRange === 'year')  return `${now.getFullYear()}-01-01`;
    return null;
  };
  const rangeStart = getDateRangeStart();

  // ── Filtered table data ──────────────────────
  const tableData = useMemo(() => {
    return flatStages.filter(row => {
      if (!isManager && row.employeeId !== currentUser?.id) return false;
      if (filterAssignee !== 'all' && row.employeeId !== filterAssignee) return false;
      if (filterSla !== 'all' && row.sla !== filterSla) return false;
      if (rangeStart && row.deadline < rangeStart) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!row.employeeName.toLowerCase().includes(q) &&
            !row.projectLabel.toLowerCase().includes(q) &&
            !row.stageName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [flatStages, filterAssignee, filterSla, rangeStart, searchTerm, isManager, currentUser]);

  // ── KPI ──────────────────────────────────────
  const totalCount       = tableData.length;
  const onTimeCount      = tableData.filter(r => r.sla === 'on_time').length;
  const overdueDoneCount = tableData.filter(r => r.sla === 'overdue_done').length;
  const runningLateCount = tableData.filter(r => r.sla === 'running_late').length;
  const onTrackCount     = tableData.filter(r => r.sla === 'on_track').length;
  const onTimeRate       = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0;

  // ── Chart data ───────────────────────────────
  const slaChartData = [
    { name: 'Đúng hạn',  value: onTimeCount,      color: '#10b981' },
    { name: 'Quá hạn',   value: overdueDoneCount, color: '#ef4444' },
    { name: 'Đang trễ',  value: runningLateCount, color: '#f97316' },
    { name: 'Trong hạn', value: onTrackCount,     color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const employeePerf = users
    .filter(u => u.role !== 'manager')
    .map(u => {
      const st = flatStages.filter(r => r.employeeId === u.id);
      return {
        name: u.name.split(' ').pop() || u.name,
        'Đúng hạn':  st.filter(r => r.sla === 'on_time').length,
        'Quá hạn':   st.filter(r => r.sla === 'overdue_done').length,
        'Đang trễ':  st.filter(r => r.sla === 'running_late').length,
        'Trong hạn': st.filter(r => r.sla === 'on_track').length,
      };
    });

  // ── Export CSV ───────────────────────────────
  const exportCSV = () => {
    const headers = ['Nhân viên','Dự án','Mã DA','Giai đoạn','Trạng thái','Hạn chót','Ngày hoàn thành','Đánh giá SLA'];
    const rows = tableData.map(r => [
      r.employeeName,
      r.projectLabel,
      r.projectCode,
      r.stageName,
      STATUS_LABEL[r.stageStatus] || r.stageStatus,
      r.deadline    ? formatDate(r.deadline)    : '',
      r.completedAt ? formatDate(r.completedAt) : '',
      SLA_META[r.sla].label,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-sla-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={24} /> Báo cáo &amp; Thống kê
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isManager
              ? 'Toàn bộ dự án — đánh giá tiến độ SLA theo từng giai đoạn'
              : `Dữ liệu của bạn: ${currentUser?.name}`}
          </p>
        </div>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 shadow-sm">
          <option value="all">Tất cả thời gian</option>
          <option value="week">7 ngày gần đây</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm nay</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'Tổng công việc', value: totalCount,       icon: Layers,       bg: 'bg-indigo-50',  iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-600',  sub: `${visibleProjects.length} dự án`,     trend: null },
          { label: 'Đúng hạn',       value: onTimeCount,      icon: CheckCircle2, bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', sub: `${onTimeRate}% tỷ lệ đạt`,            trend: onTimeRate },
          { label: 'Quá hạn',        value: overdueDoneCount, icon: AlertCircle,  bg: 'bg-red-50',     iconBg: 'bg-red-100',     iconColor: 'text-red-600',     sub: 'Đã hoàn thành muộn',                  trend: null },
          { label: 'Đang trễ hạn',   value: runningLateCount, icon: CalendarClock, bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600',  sub: 'Chưa xong, đã quá deadline',          trend: null },
        ] as const).map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`${kpi.bg} p-5 rounded-2xl border border-slate-200 shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 ${kpi.iconBg} ${kpi.iconColor} rounded-xl`}><Icon size={18} /></div>
                {kpi.trend !== null && (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                    <ArrowUpRight size={11} />{kpi.trend}%
                  </div>
                )}
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mb-0.5">{kpi.value}</div>
              <div className="text-sm font-semibold text-slate-700">{kpi.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
            <UserCheck size={16} className="text-indigo-500" /> Phân bổ chất lượng SLA
          </h3>
          <p className="text-xs text-slate-400 mb-4">Tỷ lệ đúng hạn / quá hạn của toàn bộ giai đoạn đang hiển thị</p>
          <div className="h-56">
            {slaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slaChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {slaChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        {isManager ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" /> Hiệu suất nhân viên
            </h3>
            <p className="text-xs text-slate-400 mb-4">Tổng hợp đánh giá SLA theo từng người</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerf} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="Đúng hạn"  fill="#10b981" stackId="a" radius={[0,0,3,3]} />
                  <Bar dataKey="Trong hạn" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="Đang trễ"  fill="#f97316" stackId="a" />
                  <Bar dataKey="Quá hạn"   fill="#ef4444" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Lock size={28} />
            <span className="text-sm text-center">Biểu đồ hiệu suất nhân viên<br/>chỉ dành cho Quản lý.</span>
          </div>
        )}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
            <FileSpreadsheet size={17} className="text-indigo-500" />
            Bảng chi tiết giai đoạn
            <span className="ml-1 text-xs font-normal text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{tableData.length} dòng</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 w-40 bg-white" />
            </div>
            {/* Filter Assignee */}
            {isManager && (
              <div className="relative">
                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                  className="pl-8 pr-7 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none cursor-pointer">
                  <option value="all">Tất cả nhân viên</option>
                  {users.filter(u => u.role !== 'manager').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            {/* Filter SLA */}
            <div className="relative">
              <select value={filterSla} onChange={e => setFilterSla(e.target.value)}
                className="pl-3 pr-7 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none cursor-pointer">
                <option value="all">Tất cả đánh giá</option>
                <option value="on_time">✅ Đúng hạn</option>
                <option value="overdue_done">❌ Quá hạn</option>
                <option value="running_late">⚠️ Đang trễ hạn</option>
                <option value="on_track">🔵 Trong hạn</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {/* Export */}
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <Download size={14} /> Xuất Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {tableData.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không có dữ liệu phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                  <th className="px-4 py-3 whitespace-nowrap">Nhân viên</th>
                  <th className="px-4 py-3">Dự án</th>
                  <th className="px-4 py-3">Giai đoạn</th>
                  <th className="px-4 py-3 whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-3 whitespace-nowrap">Hạn chót</th>
                  <th className="px-4 py-3 whitespace-nowrap">Hoàn thành</th>
                  <th className="px-4 py-3 whitespace-nowrap">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tableData.map((row, i) => {
                  const sla = SLA_META[row.sla];
                  const isLate = row.sla === 'overdue_done' || row.sla === 'running_late';
                  return (
                    <tr key={i} className={`transition-colors hover:bg-slate-50 ${isLate ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {row.employeeName.charAt(row.employeeName.length - 1)}
                          </div>
                          <span className="font-medium text-slate-800 whitespace-nowrap">{row.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-800 truncate" title={row.projectLabel}>{row.projectLabel}</div>
                        <div className="text-xs text-slate-400 font-mono">{row.projectCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{row.stageName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                          ${row.stageStatus === 'completed'   ? 'bg-emerald-100 text-emerald-700' :
                            row.stageStatus === 'in_progress' ? 'bg-blue-100 text-blue-700'       :
                            row.stageStatus === 'overdue'     ? 'bg-red-100 text-red-700'         :
                            row.stageStatus === 'returned'    ? 'bg-amber-100 text-amber-700'     :
                            'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABEL[row.stageStatus] || row.stageStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {row.deadline ? formatDate(row.deadline) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {row.completedAt ? formatDate(row.completedAt) : <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${sla.bg} ${sla.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sla.dot} flex-shrink-0`}></span>
                          {sla.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table footer summary */}
        {tableData.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Hiển thị <strong>{tableData.length}</strong> giai đoạn</span>
            <div className="flex flex-wrap items-center gap-4">
              {(Object.entries(SLA_META) as [SlaLabel, typeof SLA_META[SlaLabel]][]).map(([key, meta]) => {
                const count = tableData.filter(r => r.sla === key).length;
                if (!count) return null;
                return (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                    {meta.label}: <strong>{count}</strong>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Phát sinh chưa xử lý — chỉ manager */}
      {isManager && (() => {
        const issueDetails = visibleProjects.flatMap(p =>
          (p.issues || []).filter(i => !i.isResolved).map(i => ({
            project: p.code, reporter: i.reportedBy,
            date: formatDate(i.createdAt), note: i.note,
          }))
        );
        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" /> Phát sinh chưa xử lý
              {issueDetails.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{issueDetails.length}</span>
              )}
            </h3>
            {issueDetails.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-4">✅ Không có phát sinh nào đang chờ xử lý.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                      <th className="p-3 rounded-l-lg">Dự án</th>
                      <th className="p-3">Người báo</th>
                      <th className="p-3">Ngày</th>
                      <th className="p-3 rounded-r-lg">Nội dung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issueDetails.map((iss, i) => (
                      <tr key={i} className="hover:bg-amber-50 transition-colors">
                        <td className="p-3 font-mono text-xs text-slate-600">{iss.project}</td>
                        <td className="p-3 font-medium text-slate-800">{iss.reporter}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{iss.date}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{iss.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
};
