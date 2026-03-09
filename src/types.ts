export type User = {
  id: string;
  username?: string;
  password?: string;
  name: string;
  role: 'manager' | 'employee';
  avatar: string;
  department: string;
  fcmToken?: string;
};

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'returned';

export type Attachment = {
  id: string;
  name: string;
  url: string;
  fileId?: string;     // Google Drive File ID — dùng để xóa file trên Drive
  type: 'image' | 'document';
  uploadedBy: string;
  uploadedAt: string;
};

export type ProjectStage = {
  id: string;
  name: string;
  assigneeId: string;
  deadline: string;
  status: StageStatus;
  completedAt?: string;
  returnNote?: string;
  attachments?: Attachment[];
  // Dành riêng cho giai đoạn "Nộp hồ sơ"
  appointmentDate?: string; // Ngày hẹn trả kết quả theo giấy hẹn
};

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';

export type ProcedureType =
  | 'Cấp lần đầu' | 'Cấp đổi' | 'Thừa kế' | 'Tặng cho'
  | 'Chuyển nhượng' | 'Chỉ đo đạc' | 'Tách thửa' | 'Đính chính';

export type ProjectIssue = {
  id: string;
  note: string;
  createdAt: string;
  reportedBy: string;
  reportedById: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedById?: string;
  resolvedAt?: string;
  isResolved?: boolean;
  pausedDeadlineAt?: string;
  resumedAt?: string;
  pausedDays?: number;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  phone?: string;
  procedureType?: ProcedureType;
  startDate: string;
  overallDeadline: string;
  originalDeadline?: string;
  status: ProjectStatus;
  stages: ProjectStage[];
  hasIssue?: boolean;
  issues?: ProjectIssue[];
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'deadline' | 'progress' | 'return';
  isRead: boolean;
  createdAt: string;
  linkTo?: { projectId: string; stageId?: string };
};

// Tên giai đoạn đặc biệt có logic riêng
export const STAGE_NOP_HO_SO   = 'Nộp hồ sơ';
export const STAGE_TRA_KET_QUA = 'Trả kết quả hồ sơ';
