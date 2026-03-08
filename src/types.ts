export type User = {
  id: string;
  username?: string;
  password?: string;
  name: string;
  role: 'manager' | 'employee';
  avatar: string;
  department: string;
};

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document';
  uploadedBy: string;
  uploadedAt: string;
};

export type ProjectStage = {
  id: string;
  name: string;
  assigneeId: string;
  deadline: string; // ISO string YYYY-MM-DD
  status: StageStatus;
  completedAt?: string;
  attachments?: Attachment[];
};

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';

export type Project = {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  startDate: string;
  overallDeadline: string;
  status: ProjectStatus;
  stages: ProjectStage[];
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'deadline' | 'progress';
  isRead: boolean;
  createdAt: string;
  linkTo?: { projectId: string; stageId?: string };
};

