import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Users, CheckCircle2, AlertCircle, Clock, Download, Lock } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export const Reports: React.FC = () => {
  const { projects, users, currentUser } = useAppContext();
  const isManager = currentUser?.role === 'manager';

  const [dateRange, setDateRange] = useState('month');
  const [selectedUser, setSelectedUser] = useState(isManager ? 'all' : (currentUser?.id || 'all'));

  const getDateRangeStart = () => {
    const now = new Date();
    if (dateRange === 'week') { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; }
    if (dateRange === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return `${now.getFullYear()}-01-01`;
  };
  const rangeStart = getDateRangeStart();

  // Lọc dự án theo role
  const visibleProjects = isManager
    ? projects
    : projects.filter(p => p.stages.some(s => s.assigneeId === currentUser?.id));

  const allStages = visibleProjects.flatMap(p => p.stages.map(s => ({ ...s, projectCode: p.code, projectName: p.name })));
  const rangeStages = allStages.filter(s => !s.deadline || s.deadline >= rangeStart);
  const filteredStages = selectedUser === 'all' ? rangeStages : rangeStages.filter(s => s.assigneeId === selectedUser);

  const completedCount = filteredStages.filter(s => s.status === 'completed').length;
  const overdueCount   = filteredStages.filter(s => s.status === 'overdue').length;
  const inProgCount    = filteredStages.filter(s => s.status === 'in_progress').length;
  const pendingCount   = filteredStages.filter(s => s.status === 'pending').length;

  const statusData = [
    { name: 'Hoàn thành',      value: completedCount, color: '#10b981' },
    { name: 'Đang thực hiện',  value: inProgCount,    color: '#3b82f6' },
    { name: 'Chờ xử lý',       value: pendingCount,   color: '#94a3b8' },
    { name: 'Quá hạn',         value: overdueCount,   color: '#ef4444' },
  ];

  const employeePerformance = users.filter(u => u.role === 'employee').map(user => {
    const st = allStages.filter(s => s.assigneeId === user.id);
    return {
      name: user.name.split(' ').pop(),
      'Hoàn thành': st.filter(s => s.status === 'completed').length,
      'Quá hạn':    st.filter(s => s.status === 'overdue').length,
      'Đang làm':   st.filter(s => s.status === 'in_progress').length,
    };
  });

  const projectProgress = visibleProjects.map(p => ({
    name: p.code,
    'Tiến độ (%)': Math.round((p.stages.filter(s => s.status === 'completed').length / p.stages.length) * 100),
  }));

  // Phát sinh: chỉ manager xem chi tiết
  const issueDetails = isManager
    ? visibleProjects.flatMap(p =>
        (p.issues || []).filter(i => !i.isResolved).map(i => ({
          project: p.code, stage: p.stages.find(s => s.assigneeId === i.reportedById)?.name || '—',
          reporter: i.reportedBy, date: formatDate(i.createdAt), note: i.note,
        }))
      )
    : [];

  const exportCSV = () => {
    const rows = [
      ['Mã DA', 'Tên giai đoạn', 'Người phụ trách', 'Hạn chót', 'Trạng thái'],
      ...visibleProjects.flatMap(p =>
        p.stages.map(s => {
          const u = users.find(x => x.id === s.assigneeId);
          return [p.code, s.name, u?.name || '', s.deadline, s.status];
        })
      ),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `bao-cao-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo & Thống kê</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isManager ? 'Toàn công ty' : `Dữ liệu của bạn: ${currentUser?.name}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isManager && (
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="all">Tất cả nhân viên</option>
              {users.filter(u => u.role === 'employee').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm nay</option>
          </select>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Download size={15} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Hoàn thành', value: completedCount, icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
          { label: 'Đang thực hiện', value: inProgCount, icon: Clock, bg: 'bg-blue-100', color: 'text-blue-600' },
          { label: 'Quá hạn', value: overdueCount, icon: AlertCircle, bg: 'bg-red-100', color: 'text-red-600' },
          { label: 'Tổng công việc', value: filteredStages.length, icon: Users, bg: 'bg-indigo-100', color: 'text-indigo-600' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${kpi.bg} ${kpi.color} rounded-lg`}><Icon size={18} /></div>
                <span className="text-sm font-medium text-slate-600">{kpi.label}</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Tỷ lệ hoàn thành</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Tiến độ dự án (%)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgress} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Tiến độ (%)" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hiệu suất nhân viên — chỉ manager */}
      {isManager ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Hiệu suất nhân viên</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeePerformance} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend />
                <Bar dataKey="Hoàn thành" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Đang làm"   stackId="a" fill="#3b82f6" />
                <Bar dataKey="Quá hạn"   stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 flex items-center gap-3 text-slate-400">
          <Lock size={20} /><span className="text-sm">Biểu đồ hiệu suất nhân viên chỉ dành cho Quản lý.</span>
        </div>
      )}

      {/* Phát sinh chi tiết — chỉ manager */}
      {isManager && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> Phát sinh chưa xử lý
          </h3>
          {issueDetails.length === 0 ? (
            <p className="text-slate-400 text-sm italic text-center py-4">Không có phát sinh nào đang chờ xử lý.</p>
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
      )}
    </div>
  );
};
