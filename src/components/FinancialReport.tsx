import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, Download, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

export const FinancialReport: React.FC = () => {
  const { projects, currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  if (!currentUser || (currentUser.role !== 'manager' && currentUser.username !== 'trung91hn')) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-slate-500">
        <p className="text-lg font-medium">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  // Lọc dự án theo từ khóa
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.client.toLowerCase().includes(term) ||
        (p.collaborator && p.collaborator.toLowerCase().includes(term))
      );
    });
  }, [projects, searchTerm]);

  // Tính tổng
  const totals = useMemo(() => {
    return filteredProjects.reduce(
      (acc, p) => {
        const fee = p.surveyFee || 0;
        const advance = p.advancePayment || 0;
        const remaining = p.isFeeCollected ? 0 : Math.max(0, fee - advance);
        
        acc.totalFee += fee;
        acc.totalAdvance += advance;
        acc.totalRemaining += remaining;
        return acc;
      },
      { totalFee: 0, totalAdvance: 0, totalRemaining: 0 }
    );
  }, [filteredProjects]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" />
            Báo cáo Tài chính
          </h1>
          <p className="text-slate-500 mt-1">Theo dõi doanh thu, tạm ứng và công nợ của các dự án</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm dự án..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Download size={16} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng tiền trích đo</p>
          <p className="text-2xl font-bold text-slate-900">{totals.totalFee.toLocaleString('vi-VN')} đ</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng đã tạm ứng</p>
          <p className="text-2xl font-bold text-emerald-600">{totals.totalAdvance.toLocaleString('vi-VN')} đ</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng còn phải thu</p>
          <p className="text-2xl font-bold text-amber-600">{totals.totalRemaining.toLocaleString('vi-VN')} đ</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Mã DA</th>
                <th className="px-4 py-3 font-medium">Tên dự án</th>
                <th className="px-4 py-3 font-medium">Khách hàng</th>
                <th className="px-4 py-3 font-medium">Nguồn CTV</th>
                <th className="px-4 py-3 font-medium text-right">Tiền trích đo</th>
                <th className="px-4 py-3 font-medium text-right">Tạm ứng</th>
                <th className="px-4 py-3 font-medium text-right">Còn phải thu</th>
                <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Không tìm thấy dự án nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredProjects.map(p => {
                  const fee = p.surveyFee || 0;
                  const advance = p.advancePayment || 0;
                  const remaining = p.isFeeCollected ? 0 : Math.max(0, fee - advance);
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-indigo-600">{p.code}</td>
                      <td className="px-4 py-3 text-slate-900 max-w-[200px] truncate" title={p.name}>{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.client}</td>
                      <td className="px-4 py-3 text-slate-600">{p.collaborator || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{fee.toLocaleString('vi-VN')} đ</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{advance.toLocaleString('vi-VN')} đ</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-600">{remaining.toLocaleString('vi-VN')} đ</td>
                      <td className="px-4 py-3 text-center">
                        {p.isFeeCollected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                            <CheckCircle2 size={12} /> Đã thu đủ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                            <AlertCircle size={12} /> Chưa thu đủ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredProjects.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right">Tổng cộng:</td>
                  <td className="px-4 py-3 text-right">{totals.totalFee.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{totals.totalAdvance.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-right text-amber-600">{totals.totalRemaining.toLocaleString('vi-VN')} đ</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
