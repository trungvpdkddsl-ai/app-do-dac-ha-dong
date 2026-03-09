export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':   return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'overdue':     return 'bg-red-100 text-red-800 border-red-200';
    case 'returned':    return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'pending':     return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'active':      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'planning':    return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'on_hold':     return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:            return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':   return 'Hoàn thành';
    case 'in_progress': return 'Đang thực hiện';
    case 'overdue':     return 'Quá hạn';
    case 'returned':    return 'Bị trả lại';
    case 'pending':     return 'Chờ xử lý';
    case 'active':      return 'Đang triển khai';
    case 'planning':    return 'Đang lên kế hoạch';
    case 'on_hold':     return 'Tạm dừng';
    default:            return status;
  }
};

/** Tính số ngày còn lại đến deadline. Âm = quá hạn */
export const getDaysUntilDeadline = (deadlineStr: string): number => {
  if (!deadlineStr) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr); deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/** Trả về class màu cho deadline badge */
export const getDeadlineColorClass = (days: number, hasPendingIssue = false): string => {
  if (hasPendingIssue) return 'text-slate-400';
  if (days < 0) return 'text-red-600 font-bold';
  if (days <= 1) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
};
