import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const Reports: React.FC = () => {
  const { projects, users } = useAppContext();
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'
  const [selectedUser, setSelectedUser] = useState('all');

  // Tính toán dữ liệu báo cáo
  const allStages = projects.flatMap(p => p.stages);
  
  // Lọc theo user nếu có
  const filteredStages = selectedUser === 'all' 
    ? allStages 
    : allStages.filter(s => s.assigneeId === selectedUser);

  const completedCount = filteredStages.filter(s => s.status === 'completed').length;
  const overdueCount = filteredStages.filter(s => s.status === 'overdue').length;
  const inProgressCount = filteredStages.filter(s => s.status === 'in_progress').length;
  const pendingCount = filteredStages.filter(s => s.status === 'pending').length;

  // Dữ liệu cho biểu đồ tròn (Trạng thái công việc)
  const statusData = [
    { name: 'Hoàn thành', value: completedCount, color: '#10b981' },
    { name: 'Đang thực hiện', value: inProgressCount, color: '#3b82f6' },
    { name: 'Chờ xử lý', value: pendingCount, color: '#94a3b8' },
    { name: 'Quá hạn', value: overdueCount, color: '#ef4444' },
  ];

  // Dữ liệu cho biểu đồ cột (Hiệu suất nhân viên)
  const employeePerformance = users.filter(u => u.role === 'employee').map(user => {
    const userStages = allStages.filter(s => s.assigneeId === user.id);
    return {
      name: user.name.split(' ').pop(), // Lấy tên cuối
      'Hoàn thành': userStages.filter(s => s.status === 'completed').length,
      'Quá hạn': userStages.filter(s => s.status === 'overdue').length,
      'Đang làm': userStages.filter(s => s.status === 'in_progress').length,
    };
  });

  // Dữ liệu tiến độ dự án
  const projectProgress = projects.map(p => {
    const completed = p.stages.filter(s => s.status === 'completed').length;
    const total = p.stages.length;
    return {
      name: p.code,
      'Tiến độ (%)': Math.round((completed / total) * 100),
    };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo & Thống kê</h1>
          <p className="text-slate-500 mt-1">Phân tích hiệu suất và tiến độ công việc.</p>
        </div>
        
        <div className="flex gap-4">
          <select 
            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">Tất cả nhân viên</option>
            {users.filter(u => u.role === 'employee').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          
          <select 
            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm nay</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
            <h3 className="font-medium text-slate-600">Hoàn thành</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900">{completedCount}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock size={20} /></div>
            <h3 className="font-medium text-slate-600">Đang thực hiện</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900">{inProgressCount}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={20} /></div>
            <h3 className="font-medium text-slate-600">Quá hạn</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900">{overdueCount}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Users size={20} /></div>
            <h3 className="font-medium text-slate-600">Tổng công việc</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900">{filteredStages.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Biểu đồ trạng thái */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Tỷ lệ hoàn thành công việc</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ tiến độ dự án */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Tiến độ các dự án (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgress} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="Tiến độ (%)" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Biểu đồ hiệu suất nhân viên */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <h3 className="font-bold text-slate-900 mb-6">Hiệu suất nhân viên</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={employeePerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Hoàn thành" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Đang làm" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Quá hạn" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
