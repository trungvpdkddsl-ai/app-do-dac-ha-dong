import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  AlarmClock, ChevronDown, ChevronUp, X,
  AlertTriangle, Flame, Clock, CheckCircle2,
} from 'lucide-react';
import { Project, ProjectStage } from '../types';

// ── Kiểu một mục nhắc nhở ─────────────────────────────────────
type ReminderItem = {
  severity: 'overdue' | 'urgent' | 'warning';  // Quá hạn | Khẩn cấp | Sắp hết hạn
  projectCode: string;
  projectName: string;
  projectId:   string;
  stageName:   string;
  deadline:    string;
  daysLeft:    number; // âm = quá hạn
  assigneeName: string;
};

const TODAY = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function calcDaysLeft(deadlineStr: string): number {
  const dl = new Date(deadlineStr);
  dl.setHours(0, 0, 0, 0);
  return Math.round((dl.getTime() - TODAY().getTime()) / 86_400_000);
}

function getSeverity(days: number): ReminderItem['severity'] | null {
  if (days < 0)  return 'overdue';   // Quá hạn
  if (days === 0) return 'urgent';   // Hôm nay — khẩn cấp
  if (days <= 1)  return 'warning';  // Còn 1 ngày — sắp hết hạn
  return null;
}

// ── Config hiển thị theo severity ────────────────────────────
const SEVERITY_CONFIG = {
  overdue: {
    label:     'Quá hạn',
    icon:      <AlertTriangle size={12} />,
    rowBg:     'bg-red-50 border-red-200',
    badge:     'bg-red-100 text-red-700 border-red-200',
    dot:       'bg-red-500',
    textColor: 'text-red-700',
  },
  urgent: {
    label:     'Hôm nay',
    icon:      <Flame size={12} />,
    rowBg:     'bg-orange-50 border-orange-200',
    badge:     'bg-orange-100 text-orange-700 border-orange-200',
    dot:       'bg-orange-500',
    textColor: 'text-orange-700',
  },
  warning: {
    label:     'Sắp hết hạn',
    icon:      <Clock size={12} />,
    rowBg:     'bg-amber-50 border-amber-200',
    badge:     'bg-amber-100 text-amber-700 border-amber-200',
    dot:       'bg-amber-400',
    textColor: 'text-amber-700',
  },
};

// ── Main component ─────────────────────────────────────────────
export const ReminderPanel: React.FC<{ onNavigateToProject?: (id: string) => void }> = ({
  onNavigateToProject,
}) => {
  const { projects, users, currentUser } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Tính danh sách nhắc nhở từ tất cả projects
  const reminders = useMemo<ReminderItem[]>(() => {
    if (!currentUser) return [];
    const items: ReminderItem[] = [];

    for (const p of projects) {
      if (p.status === 'completed') continue;

      for (const stage of p.stages) {
        if (stage.status === 'completed') continue;
        if (stage.status === 'pending')   continue;
        if (!stage.deadline) continue;

        // Employee chỉ thấy giai đoạn được giao cho mình
        if (currentUser.role === 'employee' && stage.assigneeId !== currentUser.id) continue;

        const days = calcDaysLeft(stage.deadline);
        const severity = getSeverity(days);
        if (!severity) continue;

        const assignee = users.find(u => u.id === stage.assigneeId);
        items.push({
          severity,
          projectCode:  p.code,
          projectName:  p.name,
          projectId:    p.id,
          stageName:    stage.name,
          deadline:     stage.deadline,
          daysLeft:     days,
          assigneeName: assignee?.name || 'Chưa phân công',
        });
      }
    }

    // Sắp xếp: quá hạn → khẩn cấp → sắp hết hạn, trong mỗi nhóm: hạn sớm nhất lên đầu
    const order = { overdue: 0, urgent: 1, warning: 2 };
    return items.sort((a, b) =>
      order[a.severity] - order[b.severity] || a.daysLeft - b.daysLeft
    );
  }, [projects, users, currentUser]);

  // Ẩn hoàn toàn nếu không có gì cần nhắc
  if (isDismissed || reminders.length === 0) {
    if (isDismissed) {
      // Hiện nút khôi phục nhỏ
      return (
        <button
          onClick={() => setIsDismissed(false)}
          className="fixed bottom-4 right-4 z-40 w-11 h-11 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all hover:scale-110"
          title="Hiện bảng nhắc nhở"
        >
          <AlarmClock size={20} />
        </button>
      );
    }
    return null;
  }

  const overdueCount = reminders.filter(r => r.severity === 'overdue').length;
  const urgentCount  = reminders.filter(r => r.severity === 'urgent').length;
  const warningCount = reminders.filter(r => r.severity === 'warning').length;

  const formatDeadline = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const formatDaysLeft = (days: number) => {
    if (days < 0)  return `Quá ${Math.abs(days)} ngày`;
    if (days === 0) return 'Hôm nay';
    return `Còn ${days} ngày`;
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-72 sm:w-80 shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
      style={{ maxHeight: isExpanded ? '420px' : 'auto' }}
    >
      {/* ── Header của panel ── */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <AlarmClock size={15} className="text-amber-400" />
          <span className="text-xs font-bold tracking-wide">NHẮC NHỞ ƯU TIÊN</span>
          {/* Summary badges */}
          <div className="flex items-center gap-1 ml-1">
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full leading-none">
                {overdueCount}
              </span>
            )}
            {urgentCount > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-full leading-none">
                {urgentCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-400 text-white text-[9px] font-bold rounded-full leading-none">
                {warningCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            title="Ẩn bảng nhắc nhở"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Danh sách nhắc nhở ── */}
      {isExpanded && (
        <div className="bg-white overflow-y-auto" style={{ maxHeight: '360px' }}>
          {reminders.map((item, idx) => {
            const cfg = SEVERITY_CONFIG[item.severity];
            return (
              <div
                key={`${item.projectId}-${item.stageName}-${idx}`}
                className={`px-3 py-2.5 border-b border-slate-100 last:border-0 cursor-pointer hover:brightness-95 transition-all ${cfg.rowBg}`}
                onClick={() => onNavigateToProject?.(item.projectId)}
              >
                <div className="flex items-start gap-2">
                  {/* Dot chỉ mức độ */}
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`}></div>

                  <div className="flex-1 min-w-0">
                    {/* Project code + stage */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.projectCode}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
                        {cfg.icon && <span className="inline-flex mr-0.5 align-middle">{cfg.icon}</span>}
                        {cfg.label}
                      </span>
                    </div>

                    {/* Tên giai đoạn */}
                    <p className="text-xs font-medium text-slate-800 mt-0.5 leading-snug truncate" title={item.stageName}>
                      {item.stageName}
                    </p>

                    {/* Người thực hiện */}
                    {currentUser?.role === 'manager' && (
                      <p className="text-[10px] text-slate-500 truncate">{item.assigneeName}</p>
                    )}

                    {/* Deadline + đếm ngược */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">
                        HN: {formatDeadline(item.deadline)}
                      </span>
                      <span className={`text-[10px] font-bold ${cfg.textColor}`}>
                        {formatDaysLeft(item.daysLeft)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer tổng kết */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-slate-400" />
            <span className="text-[10px] text-slate-400">
              {reminders.length} việc cần xử lý
              {overdueCount > 0 && ` · ${overdueCount} quá hạn`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
