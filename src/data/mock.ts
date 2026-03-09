import { User, Project, Notification } from '../types';

export const mockUsers: User[] = [
  { id: 'admin', username: 'trung91hn', password: '3041991', name: 'Quản lý (Admin)', role: 'manager', department: 'Ban Giám Đốc', avatar: 'https://i.pravatar.cc/150?u=admin' },
  { id: 'u1', username: 'manager', password: 'password', name: 'Nguyễn Văn Quản Lý', role: 'manager', department: 'Ban Giám Đốc', avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', username: 'khaosat', password: 'password', name: 'Trần Khảo Sát', role: 'employee', department: 'Ngoại nghiệp', avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', username: 'xuly', password: 'password', name: 'Lê Xử Lý', role: 'employee', department: 'Nội nghiệp', avatar: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', username: 'bientap', password: 'password', name: 'Phạm Biên Tập', role: 'employee', department: 'Nội nghiệp', avatar: 'https://i.pravatar.cc/150?u=u4' },
  { id: 'u5', username: 'toan', password: 'toan123', name: 'Toàn', role: 'employee', department: 'Ngoại nghiệp', avatar: 'https://i.pravatar.cc/150?u=u5' },
  { id: 'u5', username: 'kiemtra', password: 'password', name: 'Hoàng Kiểm Tra', role: 'employee', department: 'Nội nghiệp', avatar: 'https://i.pravatar.cc/150?u=u5' },
];

export const defaultStages = [
  'Khảo sát thực địa',
  'Xử lý số liệu',
  'Biên tập bản đồ',
  'Kiểm tra chất lượng',
  'Bàn giao & Nghiệm thu'
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    code: 'DA-2023-001',
    name: 'Đo đạc lập bản đồ địa chính xã Bình Minh',
    client: 'UBND Huyện Thanh Oai',
    location: 'Xã Bình Minh, Huyện Thanh Oai, Hà Nội',
    startDate: '2023-10-01',
    overallDeadline: '2023-12-31',
    status: 'active',
    procedureType: 'Cấp lần đầu',
    hasIssue: false,
    issues: [],
    stages: [
      { 
        id: 's1-1', name: 'Khảo sát thực địa', assigneeId: 'u2', deadline: '2023-10-15', status: 'completed', completedAt: '2023-10-14',
        attachments: [
          { id: 'a1', name: 'BanDoHienTrang.pdf', url: '#', type: 'document', uploadedBy: 'u2', uploadedAt: '2023-10-14T10:00:00Z' },
          { id: 'a2', name: 'AnhThucDia_01.jpg', url: 'https://picsum.photos/seed/survey1/800/600', type: 'image', uploadedBy: 'u2', uploadedAt: '2023-10-14T10:05:00Z' }
        ]
      },
      { id: 's1-2', name: 'Xử lý số liệu', assigneeId: 'u3', deadline: '2023-10-30', status: 'in_progress', attachments: [] },
      { id: 's1-3', name: 'Biên tập bản đồ', assigneeId: 'u4', deadline: '2023-11-20', status: 'pending', attachments: [] },
      { id: 's1-4', name: 'Kiểm tra chất lượng', assigneeId: 'u5', deadline: '2023-12-10', status: 'pending', attachments: [] },
      { id: 's1-5', name: 'Bàn giao & Nghiệm thu', assigneeId: 'u1', deadline: '2023-12-31', status: 'pending', attachments: [] },
    ]
  },
  {
    id: 'p2',
    code: 'DA-2023-002',
    name: 'Đo đạc hiện trạng khu đất dự án KĐT Mới',
    client: 'Công ty CP Đầu tư Bất Động Sản',
    location: 'Quận 2, TP.HCM',
    startDate: '2023-11-01',
    overallDeadline: '2023-11-30',
    status: 'active',
    procedureType: 'Chỉ đo đạc',
    hasIssue: false,
    issues: [],
    stages: [
      { id: 's2-1', name: 'Khảo sát thực địa', assigneeId: 'u2', deadline: '2023-11-10', status: 'overdue', attachments: [] },
      { id: 's2-2', name: 'Xử lý số liệu', assigneeId: 'u3', deadline: '2023-11-15', status: 'pending', attachments: [] },
      { id: 's2-3', name: 'Biên tập bản đồ', assigneeId: 'u4', deadline: '2023-11-22', status: 'pending', attachments: [] },
      { id: 's2-4', name: 'Kiểm tra chất lượng', assigneeId: 'u5', deadline: '2023-11-28', status: 'pending', attachments: [] },
    ]
  },
  {
    id: 'p3',
    code: 'DA-2023-003',
    name: 'Đo vẽ bản đồ địa hình 1/500 khu công nghiệp',
    client: 'Ban Quản lý KCN',
    location: 'Bình Dương',
    startDate: '2023-09-01',
    overallDeadline: '2023-10-31',
    status: 'completed',
    procedureType: 'Cấp đổi',
    hasIssue: false,
    issues: [],
    stages: [
      { id: 's3-1', name: 'Khảo sát thực địa', assigneeId: 'u2', deadline: '2023-09-15', status: 'completed', completedAt: '2023-09-14', attachments: [] },
      { id: 's3-2', name: 'Xử lý số liệu', assigneeId: 'u3', deadline: '2023-09-30', status: 'completed', completedAt: '2023-09-28', attachments: [] },
      { id: 's3-3', name: 'Biên tập bản đồ', assigneeId: 'u4', deadline: '2023-10-15', status: 'completed', completedAt: '2023-10-12', attachments: [] },
      { id: 's3-4', name: 'Kiểm tra chất lượng', assigneeId: 'u5', deadline: '2023-10-25', status: 'completed', completedAt: '2023-10-24', attachments: [] },
      { id: 's3-5', name: 'Bàn giao & Nghiệm thu', assigneeId: 'u1', deadline: '2023-10-31', status: 'completed', completedAt: '2023-10-30', attachments: [] },
    ]
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u2',
    title: 'Công việc mới được giao',
    message: 'Bạn đã được giao nhiệm vụ "Khảo sát thực địa" trong dự án DA-2023-002.',
    type: 'assignment',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    linkTo: { projectId: 'p2', stageId: 's2-1' }
  },
  {
    id: 'n2',
    userId: 'u1',
    title: 'Cập nhật tiến độ',
    message: 'Trần Khảo Sát đã hoàn thành "Khảo sát thực địa" trong dự án DA-2023-001.',
    type: 'progress',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    linkTo: { projectId: 'p1', stageId: 's1-1' }
  },
  {
    id: 'n3',
    userId: 'u2',
    title: 'Cảnh báo quá hạn',
    message: 'Nhiệm vụ "Khảo sát thực địa" trong dự án DA-2023-002 đã quá hạn.',
    type: 'deadline',
    isRead: false,
    createdAt: new Date().toISOString(),
    linkTo: { projectId: 'p2', stageId: 's2-1' }
  }
];
