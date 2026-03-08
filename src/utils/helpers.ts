export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
    case 'pending': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'active': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'planning': return 'bg-amber-100 text-amber-800 border-amber-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Hoàn thành';
    case 'in_progress': return 'Đang thực hiện';
    case 'overdue': return 'Quá hạn';
    case 'pending': return 'Chờ xử lý';
    case 'active': return 'Đang triển khai';
    case 'planning': return 'Đang lên kế hoạch';
    default: return status;
  }
};
