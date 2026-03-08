import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, MapPin, Calendar, User as UserIcon, CheckCircle2, Circle, Clock, AlertCircle, Paperclip, FileText, Image as ImageIcon, Upload, MessageSquareWarning } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';
import { StageStatus, Attachment } from '../types';

type ProjectDetailProps = {
  projectId: string;
  onBack: () => void;
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const { projects, users, currentUser, updateProjectStage, addAttachment, reportIssue } = useAppContext();
  const project = projects.find(p => p.id === projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStageId, setUploadingStageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [issueNote, setIssueNote] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);

  if (!project) return null;

  const completedStages = project.stages.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedStages / project.stages.length) * 100);

  const handleStatusChange = (stageId: string, newStatus: StageStatus) => {
    updateProjectStage(projectId, stageId, newStatus);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingStageId) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
      
      const payload = {
        fileName: file.name,
        mimeType: file.type,
        data: base64Data,
        folderId: '1Sw91t5o-m8fwZsbGpJw8Yex_WzV8etCx'
      };

      const response = await fetch('https://script.google.com/macros/s/AKfycbzKueqCnPonJ1MsFzQpQDk7ihgnVVQyNHMUyc_dx6AocsDu1jW1zf6Gr9VgqMD4D00/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });

      let resultUrl = '';
      try {
        const result = await response.json();
        resultUrl = result.url || result.link || '';
      } catch (e) {
        console.warn('Could not parse JSON response from Google Apps Script', e);
      }

      if (response.ok) {
        const newAttachment: Attachment = {
          id: `att-${Date.now()}`,
          name: file.name,
          url: resultUrl || URL.createObjectURL(file), // Fallback to local URL if script doesn't return one
          type: file.type.startsWith('image/') ? 'image' : 'document',
          uploadedBy: currentUser.id,
          uploadedAt: new Date().toISOString()
        };
        
        addAttachment(projectId, uploadingStageId, newAttachment);
        setUploadMessage({ type: 'success', text: 'Tải lên thành công!' });
      } else {
        throw new Error('Upload failed with status ' + response.status);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage({ type: 'error', text: 'Lỗi: Không thể tải lên file.' });
    } finally {
      setIsUploading(false);
      setUploadingStageId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Clear message after 3 seconds
      setTimeout(() => setUploadMessage(null), 3000);
    }
  };

  const triggerUpload = (stageId: string) => {
    if (isUploading) return;
    setUploadingStageId(stageId);
    fileInputRef.current?.click();
  };

  const handleReportIssue = () => {
    if (!issueNote.trim()) return;
    reportIssue(projectId, issueNote);
    setIssueNote('');
    setIsReportingIssue(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col overflow-auto">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 w-fit"
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                {project.code}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
              {project.hasIssue && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-600 border-red-200 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Có phát sinh
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-slate-500 mb-1">Tiến độ tổng thể</div>
            <div className="text-2xl font-bold text-indigo-600">{progress}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-sm text-slate-500 mb-1">Khách hàng</div>
            <div className="font-medium text-slate-900">{project.client}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1 flex items-center gap-1.5">
              <MapPin size={14} /> Địa điểm
            </div>
            <div className="font-medium text-slate-900">{project.location}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1 flex items-center gap-1.5">
              <Calendar size={14} /> Thời gian
            </div>
            <div className="font-medium text-slate-900">
              {formatDate(project.startDate)} - {formatDate(project.overallDeadline)}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-6">Tổng quan các giai đoạn</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {project.stages.map((stage, index) => {
          const assignee = users.find(u => u.id === stage.assigneeId);
          return (
            <div key={`summary-${stage.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm font-bold text-slate-700 leading-tight">{index + 1}. {stage.name}</span>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${stage.status === 'completed' ? 'bg-emerald-500' : stage.status === 'in_progress' ? 'bg-blue-500' : stage.status === 'overdue' ? 'bg-red-500' : 'bg-slate-300'}`} title={getStatusLabel(stage.status)}></div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <UserIcon size={14} />
                  <span className="truncate max-w-[120px] font-medium">{assignee?.name}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                  <Paperclip size={14} />
                  <span className="font-medium">{stage.attachments?.length || 0}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Issue Tracking Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareWarning className="text-amber-500" />
            Xử lý phát sinh
          </h2>
          <button 
            onClick={() => setIsReportingIssue(!isReportingIssue)}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <AlertCircle size={16} />
            Báo cáo phát sinh
          </button>
        </div>

        {isReportingIssue && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú phát sinh</label>
            <textarea 
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              placeholder="Nhập chi tiết vấn đề phát sinh..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all min-h-[100px] resize-y mb-3"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setIsReportingIssue(false);
                  setIssueNote('');
                }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleReportIssue}
                disabled={!issueNote.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Lưu báo cáo
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              Lưu ý: Báo cáo phát sinh sẽ tự động cộng thêm 7 ngày vào hạn chót tổng thể của dự án.
            </p>
          </div>
        )}

        {project.issues && project.issues.length > 0 ? (
          <div className="space-y-4">
            {project.issues.map(issue => (
              <div key={issue.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-amber-900">{issue.reportedBy}</div>
                  <div className="text-xs text-amber-700">{formatDate(issue.createdAt)}</div>
                </div>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{issue.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chưa có phát sinh nào được ghi nhận.
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-6">Quy trình thực hiện</h2>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {project.stages.map((stage, index) => {
          const assignee = users.find(u => u.id === stage.assigneeId);
          const isAssignee = currentUser.id === stage.assigneeId;
          const canEdit = currentUser.role === 'manager' || isAssignee;
          
          let StatusIcon = Circle;
          let iconColor = 'text-slate-300';
          let bgColor = 'bg-white';
          
          if (stage.status === 'completed') {
            StatusIcon = CheckCircle2;
            iconColor = 'text-emerald-500';
            bgColor = 'bg-emerald-50';
          } else if (stage.status === 'in_progress') {
            StatusIcon = Clock;
            iconColor = 'text-blue-500';
            bgColor = 'bg-blue-50';
          } else if (stage.status === 'overdue') {
            StatusIcon = AlertCircle;
            iconColor = 'text-red-500';
            bgColor = 'bg-red-50';
          }

          return (
            <div key={stage.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Timeline dot */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <StatusIcon size={24} className={iconColor} />
              </div>
              
              {/* Card */}
              <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl border border-slate-200 shadow-sm transition-all ${bgColor}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Giai đoạn {index + 1}</div>
                    <h3 className="text-lg font-bold text-slate-900">{stage.name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border bg-white ${getStatusColor(stage.status)}`}>
                    {getStatusLabel(stage.status)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm mb-6">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <img src={assignee?.avatar} alt="" className="w-6 h-6 rounded-full" />
                    <span className="font-medium text-slate-700">{assignee?.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Calendar size={14} />
                    <span>Hạn: {formatDate(stage.deadline)}</span>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Paperclip size={16} />
                      Tài liệu đính kèm ({stage.attachments?.length || 0})
                    </h4>
                    {canEdit && (
                      <button 
                        onClick={() => triggerUpload(stage.id)}
                        disabled={isUploading}
                        className={`text-xs font-medium flex items-center gap-1 ${
                          isUploading && uploadingStageId === stage.id 
                            ? 'text-slate-400 cursor-not-allowed' 
                            : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                      >
                        {isUploading && uploadingStageId === stage.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            Đang tải lên...
                          </>
                        ) : (
                          <>
                            <Upload size={14} /> Tải lên
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {stage.attachments && stage.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stage.attachments.map(att => (
                        <a 
                          key={att.id} 
                          href={att.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group/att"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            att.type === 'image' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {att.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate group-hover/att:text-indigo-600 transition-colors">
                              {att.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(att.uploadedAt)}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic bg-white/50 p-3 rounded-xl border border-dashed border-slate-300 text-center">
                      Chưa có tài liệu nào được đính kèm.
                    </div>
                  )}
                </div>

                {canEdit && stage.status !== 'completed' && (
                  <div className="flex gap-2 pt-4 border-t border-slate-200/60">
                    {stage.status === 'pending' && (
                      <button 
                        onClick={() => handleStatusChange(stage.id, 'in_progress')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Bắt đầu làm
                      </button>
                    )}
                    {(stage.status === 'in_progress' || stage.status === 'overdue') && (
                      <button 
                        onClick={() => handleStatusChange(stage.id, 'completed')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Đánh dấu hoàn thành
                      </button>
                    )}
                  </div>
                )}
                
                {stage.status === 'completed' && stage.completedAt && (
                  <div className="pt-4 border-t border-slate-200/60 text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={16} />
                    Hoàn thành ngày {formatDate(stage.completedAt)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uploadMessage && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 ${
          uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {uploadMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{uploadMessage.text}</span>
        </div>
      )}
    </div>
  );
};
