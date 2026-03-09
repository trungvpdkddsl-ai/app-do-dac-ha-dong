import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  ArrowLeft, MapPin, Calendar, User as UserIcon, CheckCircle2, Circle, Clock,
  AlertCircle, Paperclip, Upload, MessageSquareWarning, ChevronDown, Trash2,
  RotateCcw, X, Info
} from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';
import { StageStatus, Attachment, STAGE_NOP_HO_SO, STAGE_TRA_KET_QUA } from '../types';

type ProjectDetailProps = {
  projectId: string;
  onBack: (msg?: string) => void;
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const {
    projects, users, currentUser,
    updateProjectStage, updateProjectStageAppointment, addAttachment,
    reportIssue, resolveIssue,
    updateProjectStageAssignee, deleteProject,
    handoffStage, returnStage,
  } = useAppContext();

  const project = projects.find(p => p.id === projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStageId, setUploadingStageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [issueNote, setIssueNote] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [assigningStageId, setAssigningStageId] = useState<string | null>(null);

  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Handoff modal (chuyển tiếp)
  const [handoffModal, setHandoffModal] = useState<{
    currentStageId: string; nextStageId: string; nextStageName: string; selectedAssigneeId: string;
    overrideDeadline?: string; // Dùng cho giai đoạn "Trả kết quả hồ sơ" — deadline = ngày hẹn
  } | null>(null);

  // Return modal (trả lại bước trước)
  const [returnModal, setReturnModal] = useState<{
    currentStageId: string; prevStageId: string; prevStageName: string; returnNote: string;
  } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // YÊU CẦU 4: Modal nhập ngày hẹn trả kết quả (khi hoàn thành giai đoạn "Nộp hồ sơ")
  const [appointmentModal, setAppointmentModal] = useState<{
    stageId: string; stageIndex: number; appointmentDate: string;
  } | null>(null);

  if (!currentUser) return null;

  if (!project) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center text-slate-500">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <p>Không tìm thấy dự án.</p>
          <button onClick={() => onBack()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Quay lại</button>
        </div>
      </div>
    );
  }

  const completedStages = project.stages.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedStages / project.stages.length) * 100);
  const hasPendingIssue = (project.issues || []).some(i => !i.isResolved);

  // Tính deadline status
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(project.overallDeadline); deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const deadlineStyle = hasPendingIssue
    ? 'text-slate-500 italic'
    : diffDays < 0
    ? 'text-red-600 font-bold'
    : diffDays <= 1
    ? 'text-amber-600 font-bold'
    : 'text-emerald-600 font-semibold';

  const deadlineLabel = hasPendingIssue
    ? '⏸ Đang tạm dừng (có phát sinh)'
    : diffDays < 0
    ? `🔴 Quá hạn ${Math.abs(diffDays)} ngày`
    : diffDays <= 1
    ? `🟡 Còn ${diffDays} ngày`
    : `🟢 Còn ${diffDays} ngày`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingStageId) return;
    setIsUploading(true); setUploadMsg(null);
    try {
      const base64Data = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
      });

      const GAS_URL = 'https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec';
      const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'uploadFile', fileName: file.name, mimeType: file.type, data: base64Data }),
      });

      if (!resp.ok) throw new Error('GAS trả lỗi HTTP ' + resp.status);
      const r = await resp.json();
      // GAS trả về viewUrl (dạng /view) hoặc url — đây là permanent Google Drive URL
      const driveUrl: string = r.viewUrl || r.url || '';
      if (!driveUrl) throw new Error('Không nhận được URL từ server');

      // Chuẩn hoá: đảm bảo URL Drive dạng /view để mở trực tiếp, không bị chặn CORS
      let finalUrl = driveUrl;
      if (finalUrl.includes('drive.google.com')) {
        const m = finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m) finalUrl = `https://drive.google.com/file/d/${m[1]}/view?usp=sharing`;
      }

      const att: Attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        url: finalUrl,          // ← luôn là permanent Drive URL, không bao giờ blob://
        type: file.type.startsWith('image/') ? 'image' : 'document',
        uploadedBy: currentUser?.id || 'unknown',
        uploadedAt: new Date().toISOString(),
      };
      addAttachment(projectId, uploadingStageId, att);
      setUploadMsg({ type: 'success', text: `✅ Đã tải lên: ${file.name}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setUploadMsg({ type: 'error', text: `❌ Không thể tải lên: ${msg}` });
    } finally {
      setIsUploading(false); setUploadingStageId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadMsg(null), 4000);
    }
  };

  const getStageSLA = (name: string) => {
    if (name.includes('đo') && !name.includes('trích')) return 2;
    if (name.includes('trích đo')) return 1;
    if (name.includes('hồ sơ') && !name.includes('Nộp')) return 2;
    if (name.includes('Nộp hồ sơ')) return 1;
    return 1;
  };

  const getFilteredUsers = (stageName: string) =>
    users.filter(u => {
      if (u.role === 'manager') return true;
      if (stageName.includes('đo') || stageName.includes('trích')) return u.department === 'Ngoại nghiệp';
      if (stageName.includes('hồ sơ') || stageName.includes('Nội nghiệp')) return u.department === 'Nội nghiệp';
      return true;
    });

  const handleCompleteStage = (stageId: string, index: number) => {
    const stage  = project.stages[index];
    const isLast = index === project.stages.length - 1;

    // YÊU CẦU 4a: Giai đoạn "Nộp hồ sơ" → bắt buộc nhập ngày hẹn trả kết quả
    if (stage.name === STAGE_NOP_HO_SO) {
      setAppointmentModal({ stageId, stageIndex: index, appointmentDate: '' });
      return;
    }

    // YÊU CẦU 4b: Giai đoạn "Trả kết quả hồ sơ" → hoàn thành toàn bộ dự án
    if (stage.name === STAGE_TRA_KET_QUA || isLast) {
      updateProjectStage(projectId, stageId, 'completed');
      return;
    }

    // Các giai đoạn khác → chuyển tiếp bình thường
    const next = project.stages[index + 1];
    setHandoffModal({ currentStageId: stageId, nextStageId: next.id, nextStageName: next.name, selectedAssigneeId: '' });
  };

  // Xác nhận ngày hẹn và chuyển tiếp giai đoạn "Nộp hồ sơ"
  const confirmAppointment = () => {
    if (!appointmentModal?.appointmentDate) return;
    const { stageId, stageIndex, appointmentDate } = appointmentModal;

    // Bước 1: Lưu appointmentDate vào stage "Nộp hồ sơ"
    //         + cập nhật deadline stage "Trả kết quả hồ sơ" = appointmentDate
    //         + cập nhật overallDeadline dự án = appointmentDate
    //         + gọi saveProject lên GAS (trong updateProjectStageAppointment)
    updateProjectStageAppointment(projectId, stageId, appointmentDate);

    // Bước 2: Mở HandoffModal để chọn người thực hiện "Trả kết quả hồ sơ"
    //         overrideDeadline = appointmentDate để confirmHandoff KHÔNG tính lại SLA
    const next = project.stages[stageIndex + 1];
    if (next) {
      setHandoffModal({
        currentStageId: stageId,
        nextStageId: next.id,
        nextStageName: next.name,
        selectedAssigneeId: '',
        overrideDeadline: appointmentDate, // deadline cố định = ngày hẹn giấy hẹn
      });
    } else {
      // Không có stage tiếp theo → hoàn thành luôn
      updateProjectStage(projectId, stageId, 'completed');
    }
    setAppointmentModal(null);
  };

  const handleReturnStage = (stageId: string, index: number) => {
    if (index === 0) return; // Không trả được nếu là bước đầu
    const prev = project.stages[index - 1];
    setReturnModal({ currentStageId: stageId, prevStageId: prev.id, prevStageName: prev.name, returnNote: '' });
  };

  const confirmHandoff = () => {
    if (!handoffModal?.selectedAssigneeId) return;
    // Nếu có overrideDeadline (từ ngày hẹn "Nộp hồ sơ") → dùng đó, không tính SLA
    let deadline: string;
    if (handoffModal.overrideDeadline) {
      deadline = handoffModal.overrideDeadline;
    } else {
      const sla = getStageSLA(handoffModal.nextStageName);
      const d = new Date(); d.setDate(d.getDate() + sla);
      deadline = d.toISOString().split('T')[0];
    }
    handoffStage(projectId, handoffModal.currentStageId, handoffModal.nextStageId, handoffModal.selectedAssigneeId, deadline);
    setHandoffModal(null);
  };

  const confirmReturn = () => {
    if (!returnModal?.returnNote.trim()) return;
    returnStage(projectId, returnModal.currentStageId, returnModal.prevStageId, returnModal.returnNote.trim());
    setReturnModal(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col overflow-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => onBack()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>
        {currentUser?.role === 'manager' && (
          <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium">
            <Trash2 size={16} /> Xóa dự án
          </button>
        )}
      </div>

      {/* Project header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded">{project.code}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>{getStatusLabel(project.status)}</span>
              {project.procedureType && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{project.procedureType}</span>
              )}
              {project.hasIssue && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                  <AlertCircle size={12} /> Có phát sinh
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Tiến độ</div>
            <div className="text-3xl font-bold text-indigo-600">{progress}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500 mb-1">Khách hàng</div>
            <div className="font-medium">{project.client}</div>
            {project.phone && <div className="text-sm text-slate-500">{project.phone}</div>}
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin size={12} /> Địa điểm</div>
            <div className="font-medium">{project.location}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Hạn chót</div>
            <div className={deadlineStyle}>{formatDate(project.overallDeadline)}</div>
            <div className={`text-xs mt-0.5 ${deadlineStyle}`}>{deadlineLabel}</div>
            {hasPendingIssue && project.originalDeadline && (
              <div className="text-xs text-slate-400 mt-0.5">Gốc: {formatDate(project.originalDeadline)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Xử lý phát sinh */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareWarning className="text-amber-500" size={20} /> Xử lý phát sinh
            {hasPendingIssue && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⏸ Deadline tạm dừng</span>}
          </h2>
          <button
            onClick={() => setIsReportingIssue(!isReportingIssue)}
            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <AlertCircle size={14} /> Báo cáo phát sinh
          </button>
        </div>

        {isReportingIssue && (
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nội dung phát sinh</label>
            <textarea
              value={issueNote} onChange={e => setIssueNote(e.target.value)}
              placeholder="Nhập chi tiết phát sinh..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-y min-h-[80px] mb-3"
            />
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mb-3">
              <Info size={12} /> Khi báo cáo phát sinh, thời gian đếm ngược sẽ <strong>tạm dừng</strong> cho đến khi bấm "Kết thúc phát sinh".
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsReportingIssue(false); setIssueNote(''); }} className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors">Hủy</button>
              <button onClick={() => { if (!issueNote.trim()) return; reportIssue(projectId, issueNote.trim()); setIssueNote(''); setIsReportingIssue(false); }}
                disabled={!issueNote.trim()}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm rounded-lg transition-colors">
                Lưu báo cáo
              </button>
            </div>
          </div>
        )}

        {(project.issues || []).length > 0 ? (
          <div className="space-y-3">
            {project.issues!.map(issue => (
              <div key={issue.id} className={`p-4 rounded-xl border ${issue.isResolved ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${issue.isResolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-semibold text-sm text-slate-800">{issue.reportedBy}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${issue.isResolved ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                      {issue.isResolved ? '✓ Đã xử lý' : '⏸ Đang tạm dừng'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(issue.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3 pl-4 border-l-2 border-amber-300">{issue.note}</p>

                {issue.isResolved && issue.resolutionNote && (
                  <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-200 mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-emerald-800">✓ Xử lý bởi: {issue.resolvedBy}</span>
                      {issue.resolvedAt && <span className="text-emerald-600">{formatDate(issue.resolvedAt)}</span>}
                    </div>
                    {issue.pausedDays !== undefined && (
                      <p className="text-xs text-emerald-700 mb-1">⏱ Đã tạm dừng: {issue.pausedDays} ngày → deadline được cộng thêm.</p>
                    )}
                    <p className="text-sm text-emerald-800 pl-3 border-l-2 border-emerald-400">{issue.resolutionNote}</p>
                  </div>
                )}

                {!issue.isResolved && (
                  resolvingIssueId === issue.id ? (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Ghi chú xử lý</label>
                      <textarea
                        value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                        placeholder="Mô tả cách đã xử lý..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y min-h-[70px] mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!resolutionNote.trim()) return;
                            await resolveIssue(projectId, issue.id, resolutionNote.trim());
                            setResolvingIssueId(null); setResolutionNote('');
                          }}
                          disabled={!resolutionNote.trim()}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-medium rounded-lg"
                        >
                          ✓ Kết thúc phát sinh
                        </button>
                        <button onClick={() => { setResolvingIssueId(null); setResolutionNote(''); }}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-xs rounded-lg">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setResolvingIssueId(issue.id); setResolutionNote(''); }}
                      className="mt-2 px-3 py-1.5 bg-white border border-emerald-400 text-emerald-700 hover:bg-emerald-50 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                    >
                      ✏️ Ghi nhận xử lý & Kết thúc phát sinh
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
            Chưa có phát sinh nào được ghi nhận.
          </div>
        )}
      </div>

      {/* Quy trình giai đoạn */}
      <h2 className="text-lg font-bold text-slate-900 mb-4">Quy trình thực hiện</h2>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
      {uploadMsg && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium ${uploadMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {uploadMsg.text}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {project.stages.map((stage, index) => {
          const assignee = users.find(u => u.id === stage.assigneeId);
          const isAssignee = currentUser?.id === stage.assigneeId;
          const canEdit = currentUser?.role === 'manager' || isAssignee;
          const prevStage = index > 0 ? project.stages[index - 1] : null;
          const isLocked = prevStage !== null && prevStage.status !== 'completed';
          const canAct = canEdit && !isLocked && stage.status !== 'completed';

          // Màu border theo deadline của stage
          const sDeadline = new Date(stage.deadline); sDeadline.setHours(0, 0, 0, 0);
          const sDiff = Math.ceil((sDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const stageBorder = stage.status === 'completed'
            ? 'border-emerald-200 bg-emerald-50'
            : stage.status === 'overdue' || stage.status === 'returned'
            ? 'border-red-200 bg-red-50'
            : sDiff <= 1
            ? 'border-amber-200 bg-amber-50'
            : isLocked
            ? 'border-slate-200 bg-slate-50 opacity-70'
            : 'border-blue-200 bg-blue-50';

          let StatusIcon = Circle;
          if (stage.status === 'completed') StatusIcon = CheckCircle2;
          else if (stage.status === 'in_progress') StatusIcon = Clock;
          else if (stage.status === 'overdue' || stage.status === 'returned') StatusIcon = AlertCircle;

          const iconColor =
            stage.status === 'completed' ? 'text-emerald-500' :
            stage.status === 'in_progress' ? 'text-blue-500' :
            stage.status === 'overdue' || stage.status === 'returned' ? 'text-red-500' :
            'text-slate-300';

          return (
            <div key={stage.id} className={`rounded-2xl border p-5 transition-all ${stageBorder}`}>
              <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <StatusIcon size={22} className={iconColor} />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Giai đoạn {index + 1}</div>
                    <h3 className="font-bold text-slate-900">{stage.name}</h3>
                  </div>
                  {isLocked && (
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">🔒 Chờ bước trước</span>
                  )}
                  {stage.status === 'returned' && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">↩ Bị trả lại</span>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border bg-white ${getStatusColor(stage.status)}`}>
                  {getStatusLabel(stage.status)}
                </span>
              </div>

              {/* Hiển thị ngày hẹn nếu là giai đoạn Nộp hồ sơ và đã nhập */}
              {stage.appointmentDate && (
                <div className="mb-3 p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700 flex items-center gap-2">
                  📅 Ngày hẹn trả kết quả: <strong>{formatDate(stage.appointmentDate)}</strong>
                </div>
              )}
              {stage.returnNote && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  ↩ Lý do trả lại: {stage.returnNote}
                </div>
              )}

              {/* Assignee + Deadline */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative">
                  {assignee ? (
                    <button
                      onClick={() => canEdit && !isLocked ? setAssigningStageId(assigningStageId === stage.id ? null : stage.id) : undefined}
                      disabled={isLocked}
                      className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border ${canEdit && !isLocked ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default'} border-slate-200 text-sm`}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {assignee.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{assignee.name}</span>
                      {canEdit && !isLocked && <ChevronDown size={14} className="text-slate-400" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => canEdit && !isLocked ? setAssigningStageId(assigningStageId === stage.id ? null : stage.id) : undefined}
                      disabled={isLocked}
                      className={`flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-dashed text-slate-500 text-sm ${canEdit && !isLocked ? 'hover:border-indigo-400 hover:text-indigo-600 cursor-pointer' : 'cursor-default'}`}
                    >
                      <UserIcon size={15} /> Chọn người thực hiện
                    </button>
                  )}
                  {assigningStageId === stage.id && canEdit && !isLocked && (
                    <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20 max-h-60 overflow-y-auto">
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase border-b border-slate-100 mb-1">Chọn nhân viên</div>
                      {getFilteredUsers(stage.name).map(user => (
                        <button key={user.id} onClick={() => { updateProjectStageAssignee(projectId, stage.id, user.id); setAssigningStageId(null); }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm ${assignee?.id === user.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-slate-400">{user.department}</div>
                          </div>
                          {assignee?.id === user.id && <CheckCircle2 size={14} className="ml-auto text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-sm ${
                  stage.status === 'overdue' ? 'border-red-200 text-red-600' :
                  sDiff <= 1 ? 'border-amber-200 text-amber-600' : 'border-slate-200 text-slate-500'
                }`}>
                  <Calendar size={14} />
                  Hạn: {formatDate(stage.deadline)}
                  {stage.status !== 'completed' && sDiff <= 1 && sDiff >= 0 && <span className="ml-1 text-xs font-bold text-amber-600">⚠️</span>}
                  {stage.status !== 'completed' && sDiff < 0 && <span className="ml-1 text-xs font-bold text-red-600">!</span>}
                </div>
              </div>

              {/* Tài liệu đính kèm */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Paperclip size={15} /> Tài liệu ({stage.attachments?.length || 0})
                  </span>
                  {canEdit && !isLocked && (
                    <button onClick={() => { setUploadingStageId(stage.id); fileInputRef.current?.click(); }}
                      disabled={isUploading}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <Upload size={13} /> Tải lên
                    </button>
                  )}
                </div>
                {(stage.attachments || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {stage.attachments!.map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:border-indigo-300 flex items-center gap-1 truncate max-w-[200px]"
                        title={att.name}
                      >
                        <Paperclip size={11} className="shrink-0" />
                        <span className="truncate">{att.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {canAct && stage.status !== 'pending' || (canAct && stage.status === 'pending' && assignee) ? (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/60">
                  {(stage.status === 'pending' || stage.status === 'returned') && !isLocked && assignee && (
                    <button onClick={() => updateProjectStage(projectId, stage.id, 'in_progress')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                      <Clock size={13} /> Bắt đầu
                    </button>
                  )}
                  {stage.status === 'in_progress' && (
                    <>
                      <button onClick={() => handleCompleteStage(stage.id, index)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                        <CheckCircle2 size={13} /> Hoàn thành → Chuyển tiếp
                      </button>
                      {index > 0 && (
                        <button onClick={() => handleReturnStage(stage.id, index)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                          <RotateCcw size={13} /> Trả lại bước trước
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Appointment Modal - YÊU CẦU 4: Ngày hẹn trả kết quả */}
      {appointmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2">
                📅 Ngày hẹn trả kết quả
              </h3>
              <button onClick={() => setAppointmentModal(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Nhập <strong>ngày hẹn trả kết quả</strong> theo giấy hẹn của cơ quan nhà nước.<br/>
              Thông tin này sẽ được lưu vào dự án để theo dõi.
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ngày hẹn trả kết quả <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={appointmentModal.appointmentDate}
              onChange={e => setAppointmentModal({ ...appointmentModal, appointmentDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-5"
            />
            <div className="flex gap-3">
              <button onClick={() => setAppointmentModal(null)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">Hủy</button>
              <button onClick={confirmAppointment} disabled={!appointmentModal.appointmentDate}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-medium">
                Xác nhận & Chuyển tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handoff Modal */}
      {handoffModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">Chuyển tiếp công việc</h3>
              <button onClick={() => setHandoffModal(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Chọn nhân viên thực hiện bước tiếp theo: <strong className="text-slate-900">"{handoffModal.nextStageName}"</strong>
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto mb-5">
              {getFilteredUsers(handoffModal.nextStageName).map(u => (
                <button key={u.id}
                  onClick={() => setHandoffModal({ ...handoffModal, selectedAssigneeId: u.id })}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    handoffModal.selectedAssigneeId === u.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">{u.name.charAt(0)}</div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.department}</div>
                  </div>
                  {handoffModal.selectedAssigneeId === u.id && <CheckCircle2 size={16} className="ml-auto text-indigo-600" />}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setHandoffModal(null)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">Hủy</button>
              <button onClick={confirmHandoff} disabled={!handoffModal.selectedAssigneeId}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-medium">
                Xác nhận chuyển tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2">
                <RotateCcw size={18} /> Trả lại bước trước
              </h3>
              <button onClick={() => setReturnModal(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Hồ sơ sẽ được trả về bước: <strong className="text-slate-900">"{returnModal.prevStageName}"</strong>
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú / Lý do trả lại <span className="text-red-500">*</span></label>
            <textarea
              value={returnModal.returnNote}
              onChange={e => setReturnModal({ ...returnModal, returnNote: e.target.value })}
              placeholder="Nhập lý do cần sửa hoặc bổ sung..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-y min-h-[100px] mb-5"
            />
            <div className="flex gap-3">
              <button onClick={() => setReturnModal(null)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">Hủy</button>
              <button onClick={confirmReturn} disabled={!returnModal.returnNote.trim()}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-medium">
                Xác nhận trả lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-700 mb-3">Xóa dự án?</h3>
            <p className="text-sm text-slate-600 mb-5">Hành động này không thể hoàn tác. Dữ liệu dự án sẽ bị xóa vĩnh viễn.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">Hủy</button>
              <button onClick={() => { deleteProject(projectId); onBack('Đã xóa dự án thành công'); }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium">
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
