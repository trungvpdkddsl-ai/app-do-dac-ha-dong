import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, User, StageStatus, Notification, Attachment, STAGE_TRA_KET_QUA } from '../types';
import { mockProjects, mockUsers, mockNotifications } from '../data/mock';
import { getGasUrl } from '../config';
import { requestNotificationPermission, onForegroundMessage, showLocalNotification } from '../utils/firebase';


const LS_PROJECTS         = 'geotask_projects';
const LS_NOTIFS           = 'geotask_notifications';
const LS_USER             = 'geotask_current_user';
const LS_LOCAL_USERS      = 'geotask_local_users'; // Thêm lưu trữ user đăng ký offline
const LS_OVERDUE_NOTIFIED = 'geotask_overdue_notified';
const LS_URGENT_NOTIFIED  = 'geotask_urgent_notified';  // sắp hết hạn (<24h)

async function gasGet(action: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ action, t: Date.now().toString(), ...extra });
  const res = await fetch(`${getGasUrl()}?${params}`, { cache: 'no-store' });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function gasPost(body: Record<string, unknown>) {
  const res = await fetch(getGasUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

function lsLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function lsSave(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

type AppContextType = {
  projects: Project[];
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  isAppLoading: boolean;
  isSyncing: boolean;
  notifications: Notification[];
  login: (username: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (user: Omit<User, 'id'> & { id?: string }) => Promise<void>;
  setCurrentUser: (user: User) => void;
  addProject: (project: Project) => Promise<void>;
  updateProjectStage: (projectId: string, stageId: string, status: StageStatus) => Promise<void>;
  updateProjectStageAssignee: (projectId: string, stageId: string, userIds: string[]) => Promise<void>;
  updateProjectStageAppointment: (projectId: string, stageId: string, appointmentDate: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  handoffStage: (projectId: string, currentStageId: string, nextStageId: string, nextAssigneeIds: string[], nextDeadline: string, note?: string) => Promise<void>;
  returnStage: (projectId: string, currentStageId: string, prevStageId: string, returnNote: string) => Promise<void>;
  addAttachment: (projectId: string, stageId: string, attachment: Attachment) => Promise<void>;
  addAttachmentsBatch: (projectId: string, stageId: string, attachments: Attachment[]) => Promise<void>;
  removeAttachment: (projectId: string, stageId: string, attachmentId: string, fileId?: string) => Promise<void>;
  reportIssue: (projectId: string, note: string) => Promise<void>;
  resolveIssue: (projectId: string, issueId: string, resolutionNote: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  updateCustomerInfo: (projectId: string, customerInfo: import('../types').CustomerInfo) => Promise<void>;
  updateProjectInfo: (projectId: string, updates: Partial<import('../types').Project>) => Promise<void>;
  reloadData: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects,        setProjects]         = useState<Project[]>    (lsLoad(LS_PROJECTS, mockProjects));
  const [users,           setUsers]            = useState<User[]>       (mockUsers);
  const [currentUser,     setCurrentUserState] = useState<User | null> (null);
  const [isAuthenticated, setIsAuthenticated]  = useState(false);
  const [notifications,   setNotifications]    = useState<Notification[]>(lsLoad(LS_NOTIFS, mockNotifications));
  const [isAppLoading,    setIsAppLoading]     = useState(true);
  const [isSyncing,       setIsSyncing]        = useState(false);

  useEffect(() => { lsSave(LS_PROJECTS, projects); }, [projects]);
  useEffect(() => { lsSave(LS_NOTIFS,   notifications); }, [notifications]);

  // ── Init: load từ Google Sheets ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      setIsSyncing(true);
      // Mặc định fallback = chỉ admin (khi GAS offline)
      let fetchedUsers: User[]       = mockUsers;
      let fetchedProjects: Project[] = lsLoad(LS_PROJECTS, mockProjects);
      let gasUsersLoaded = false;
      try {
        const [uData, pData] = await Promise.all([gasGet('getUsers'), gasGet('getProjects')]);
        if (Array.isArray(uData) && uData.length > 0) {
          fetchedUsers   = uData;     // Dùng HOÀN TOÀN từ GAS, không merge mock
          gasUsersLoaded = true;
        } else if (uData?.users?.length > 0) {
          fetchedUsers   = uData.users;
          gasUsersLoaded = true;
        }
        if (Array.isArray(pData) && pData.length > 0)  fetchedProjects = pData;
      } catch { /* offline */ }

      // Nếu GAS trả được users → đảm bảo admin mock cũng có trong danh sách
      // (để luôn đăng nhập được kể cả khi GAS không có admin)
      if (gasUsersLoaded) {
        const hasAdmin = fetchedUsers.some(u => u.username === 'trung91hn');
        if (!hasAdmin) fetchedUsers = [...mockUsers, ...fetchedUsers];
      }

      // Merge local users (đăng ký offline)
      const localUsers = lsLoad<User[]>(LS_LOCAL_USERS, []);
      for (const lu of localUsers) {
        if (!fetchedUsers.find(u => u.username === lu.username)) {
          fetchedUsers.push(lu);
        }
      }

      setUsers(fetchedUsers);
      setProjects(fetchedProjects);

      const savedRaw = localStorage.getItem(LS_USER);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw) as User;
          const fresh = fetchedUsers.find(u => u.id === saved.id && u.username === saved.username)
                     || fetchedUsers.find(u => u.username === saved.username);
          if (fresh) {
            setCurrentUserState(fresh);
            setIsAuthenticated(true);
            lsSave(LS_USER, fresh);
            try {
              const nData = await gasGet('getNotifications', { userId: fresh.id });
              if (Array.isArray(nData) && nData.length > 0) setNotifications(nData);
            } catch { /* dùng cache */ }
          } else {
            localStorage.removeItem(LS_USER);
          }
        } catch { localStorage.removeItem(LS_USER); }
      }
      setIsSyncing(false);
      setIsAppLoading(false);
    };
    init();
  }, []);

  // ── Kiểm tra overdue + sắp hết hạn (<24h) ───────────────────
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const alreadyOverdue = new Set<string>(lsLoad(LS_OVERDUE_NOTIFIED, []));
    const alreadyUrgent  = new Set<string>(lsLoad(LS_URGENT_NOTIFIED,  []));
    const newOverdue: string[] = [];
    const newUrgent:  string[] = [];

    setProjects(prev => prev.map(p => {
      if (p.status === 'completed') return p;
      // Nếu đang có phát sinh chưa xử lý → không cập nhật overdue (deadline tạm dừng)
      const hasPendingIssue = (p.issues || []).some(i => !i.isResolved);
      let changed = false;
      const stages = p.stages.map(s => {
        const isActive = s.status === 'pending' || s.status === 'in_progress';
        if (!isActive) return s;

        // Overdue check
        if (s.deadline < today && !hasPendingIssue) {
          changed = true;
          if (!alreadyOverdue.has(s.id)) {
            alreadyOverdue.add(s.id);
            s.assigneeIds?.forEach(assigneeId => {
              const notif: Notification = {
                id: `notif-overdue-${s.id}-${assigneeId}`, userId: assigneeId,
                title: '⚠️ Quá hạn', message: `Giai đoạn "${s.name}" dự án ${p.code} đã quá hạn.`,
                type: 'deadline', isRead: false,
                createdAt: new Date().toISOString(),
                linkTo: { projectId: p.id, stageId: s.id },
              };
              setNotifications(n => n.some(x => x.id === notif.id) ? n : [notif, ...n]);
              gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
            });
            newOverdue.push(s.id);
          }
          return { ...s, status: 'overdue' as StageStatus };
        }

        // Urgent check: còn <= 1 ngày
        if (s.deadline <= tomorrow && s.deadline >= today && !alreadyUrgent.has(s.id)) {
          alreadyUrgent.add(s.id);
          s.assigneeIds?.forEach(assigneeId => {
            const notif: Notification = {
              id: `notif-urgent-${s.id}-${assigneeId}`, userId: assigneeId,
              title: '🟡 Sắp hết hạn', message: `Giai đoạn "${s.name}" dự án ${p.code} còn dưới 24 giờ.`,
              type: 'deadline', isRead: false,
              createdAt: new Date().toISOString(),
              linkTo: { projectId: p.id, stageId: s.id },
            };
            setNotifications(n => n.some(x => x.id === notif.id) ? n : [notif, ...n]);
            gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
          });
          newUrgent.push(s.id);
        }

        return s;
      });
      return changed ? { ...p, stages } : p;
    }));

    if (newOverdue.length > 0) lsSave(LS_OVERDUE_NOTIFIED, [...alreadyOverdue, ...newOverdue]);
    if (newUrgent.length > 0)  lsSave(LS_URGENT_NOTIFIED,  [...alreadyUrgent,  ...newUrgent]);
  }, []);

  // ── Foreground push notifications ────────────────────────────
  useEffect(() => {
    const unsubscribe = onForegroundMessage(({ title, body }) => {
      const notif: Notification = {
        id: `push-${Date.now()}`, userId: currentUser?.id || '',
        title, message: body, type: 'assignment', isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(n => [notif, ...n]);
    });
    return unsubscribe;
  }, [currentUser]);

  // ── Auth ──────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password?: string, rememberMe = false) => {
    const uname = username.trim().toLowerCase();
    const pwd = password?.trim();

    // ── Thử đăng nhập qua GAS server ─────────────────────────
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000); // timeout 5s
      const res = await fetch(getGasUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', username: uname, password: pwd }),
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      // Nếu GAS trả về HTML (lỗi deploy) → bỏ qua, dùng fallback
      const text = await res.text();
      let data: { success?: boolean; message?: string; user?: User } = {};
      try { data = JSON.parse(text); } catch { /* GAS trả HTML lỗi → fallback local */ }
      if (data.success && data.user) {
        setCurrentUserState(data.user);
        setIsAuthenticated(true);
        if (rememberMe) lsSave(LS_USER, data.user);
        try {
          const nData = await gasGet('getNotifications', { userId: data.user.id });
          if (Array.isArray(nData) && nData.length > 0) setNotifications(nData);
        } catch { /* dùng cache */ }
        try {
          const fcmToken = await requestNotificationPermission();
          if (fcmToken) await gasPost({ action: 'saveFcmToken', userId: data.user.id, fcmToken });
        } catch { /* không bắt buộc */ }
        return { success: true };
      }
      // Server trả lỗi "Sai mật khẩu" rõ ràng → báo user, không fallback
      if (data.message?.includes('Sai mật khẩu')) {
        return { success: false, message: 'Sai mật khẩu.' };
      }
      // Các trường hợp khác (GAS chưa có user, lỗi parse...) → fallback local
    } catch {
      // Network timeout, GAS offline → fallback local (im lặng)
    }

    // ── Fallback: đăng nhập bằng dữ liệu local ──────────────────
    let currentUsers = [...users];
    try {
      // Đảm bảo App luôn đọc danh sách tài khoản từ Google Sheets về trước khi đối chiếu
      const uData = await gasGet('getUsers');
      if (Array.isArray(uData) && uData.length > 0) {
        currentUsers = uData;
        setUsers(uData);
      } else if (uData?.users?.length > 0) {
        currentUsers = uData.users;
        setUsers(uData.users);
      }
    } catch {
      // Lỗi mạng, dùng danh sách users hiện tại trong state
    }

    // Chỉ thêm admin mock nếu chưa có trong danh sách (GAS offline)
    const allUsers = [...currentUsers];
    for (const mu of mockUsers) {
      if (!allUsers.find(u => u.username === mu.username)) allUsers.push(mu);
    }
    
    // Thêm các user đăng ký offline
    const localUsers = lsLoad<User[]>(LS_LOCAL_USERS, []);
    for (const lu of localUsers) {
      if (!allUsers.find(u => u.username === lu.username)) allUsers.push(lu);
    }

    const found = allUsers.find(
      u => u.username?.trim().toLowerCase() === uname && u.password?.trim() === pwd
    );
    if (found) {
      const safeUser = { ...found };
      delete (safeUser as { password?: string }).password;
      setCurrentUserState(safeUser);
      setIsAuthenticated(true);
      if (rememberMe) lsSave(LS_USER, safeUser);
      try {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) gasPost({ action: 'saveFcmToken', userId: safeUser.id, fcmToken }).catch(() => {});
      } catch { /* không bắt buộc */ }
      return { success: true };
    }

    return { success: false, message: 'Không tìm thấy tài khoản. Kiểm tra lại tên đăng nhập và mật khẩu.' };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUserState(null);
    setIsAuthenticated(false);
    localStorage.removeItem(LS_USER);
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id'> & { id?: string }) => {
    // Kiểm tra trùng username trong local state trước khi thêm
    const uname = userData.username?.trim().toLowerCase() || '';
    setUsers(prev => {
      if (prev.some(u => u.username?.trim().toLowerCase() === uname)) return prev;
      // Dùng id từ server nếu có (để khớp với GAS DB), không thì random
      const newUser: User = { ...userData, username: uname, id: userData.id || crypto.randomUUID() };
      
      // Lưu vào local storage để fallback đăng nhập
      const localUsers = lsLoad<User[]>(LS_LOCAL_USERS, []);
      if (!localUsers.some(u => u.username === uname)) {
        lsSave(LS_LOCAL_USERS, [...localUsers, newUser]);
      }
      
      return [...prev, newUser];
    });
  }, []);

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
    setIsAuthenticated(true);
  }, []);

  // ── Projects ──────────────────────────────────────────────────
  const _syncProject = useCallback(async (project: Project) => {
    await gasPost({ action: 'saveProject', project }).catch(() => {});
  }, []);

  const addProject = useCallback(async (project: Project) => {
    setProjects(prev => [project, ...prev]);
    await _syncProject(project);

    // Push notification: hồ sơ mới → báo cho manager
    if (currentUser) {
      const title = '📁 Hồ sơ mới';
      const body  = `${currentUser.name} vừa tạo hồ sơ ${project.code} — ${project.client}`;
      showLocalNotification(title, body, `new-project-${project.id}`);
      gasPost({ action: 'broadcastToManagers', title, body, data: { projectId: project.id } }).catch(() => {});
    }
  }, [_syncProject, currentUser]);

  const updateProjectStage = useCallback(async (projectId: string, stageId: string, status: StageStatus) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => {
        if (s.id !== stageId) return s;
        if (status === 'completed' && s.status !== 'completed') {
          const manager = users.find(u => u.role === 'manager');
          if (manager && currentUser) {
            const notif: Notification = {
              id: `notif-${crypto.randomUUID()}`, userId: manager.id,
              title: 'Cập nhật tiến độ',
              message: `${currentUser.name} hoàn thành "${s.name}" — ${p.code}.`,
              type: 'progress', isRead: false,
              createdAt: new Date().toISOString(),
              linkTo: { projectId: p.id, stageId: s.id },
            };
            setNotifications(n => [notif, ...n]);
            gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
            // Push notification native khi hoàn thành giai đoạn
            showLocalNotification(notif.title, notif.message, `complete-${s.id}`);
            // Gửi FCM đến manager qua GAS
            gasPost({ action: 'sendPush', userId: manager.id, title: notif.title, body: notif.message, data: { projectId: p.id } }).catch(() => {});
          }
        }
        return {
          ...s,
          status,
          completedAt: status === 'completed' ? new Date().toISOString().split('T')[0] : s.completedAt,
          // Khi bắt đầu lại hoặc hoàn thành → xóa cờ returned để bỏ highlight vàng
          isReturned: (status === 'in_progress' || status === 'completed') ? false : s.isReturned,
        };
      });
      const allDone = stages.every(s => s.status === 'completed');
      const p2 = { ...p, stages, status: allDone ? 'completed' as const : p.status };
      updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [users, currentUser, _syncProject]);

  const updateProjectStageAssignee = useCallback(async (projectId: string, stageId: string, userIds: string[]) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => s.id === stageId ? { ...s, assigneeIds: userIds } : s);
      const p2 = { ...p, stages }; updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  // Lưu ngày hẹn trả kết quả:
  //   1. appointmentDate → field `appointmentDate` của stage "Nộp hồ sơ"
  //   2. appointmentDate → `deadline` của stage cuối "Trả kết quả hồ sơ"
  //   3. appointmentDate → `overallDeadline` của toàn bộ dự án
  //   4. Gửi saveProject lên GAS để lưu DB
  const updateProjectStageAppointment = useCallback(async (
    projectId: string, stageId: string, appointmentDate: string
  ) => {
    // Tính project đã cập nhật TRƯỚC setProjects để tránh closure stale
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== projectId) return p;

        const stages = p.stages.map(s => {
          // (1) Lưu ngày hẹn vào đúng stage "Nộp hồ sơ"
          if (s.id === stageId) return { ...s, appointmentDate };
          // (2) Cập nhật deadline stage cuối "Trả kết quả hồ sơ" = ngày hẹn
          if (s.name === STAGE_TRA_KET_QUA) return { ...s, deadline: appointmentDate };
          return s;
        });

        // (3) Cập nhật overallDeadline dự án = ngày hẹn
        return { ...p, stages, overallDeadline: appointmentDate };
      });

      // (4) Sync lên GAS ngay trong callback (dùng biến next đã tính xong)
      const updatedProject = next.find(p => p.id === projectId);
      if (updatedProject) {
        // fire-and-forget — không block state update
        gasPost({ action: 'saveProject', project: updatedProject }).catch(() => {});
      }

      return next;
    });
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    await gasPost({ action: 'deleteProject', projectId }).catch(() => {});
  }, []);

  // Chuyển tiếp công việc sang bước tiếp theo
  const handoffStage = useCallback(async (
    projectId: string, currentStageId: string, nextStageId: string,
    nextAssigneeIds: string[], nextDeadline: string, note?: string
  ) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => {
        if (s.id === currentStageId)
          return { ...s, status: 'completed' as StageStatus, completedAt: new Date().toISOString().split('T')[0] };
        if (s.id === nextStageId)
          return { ...s, status: 'in_progress' as StageStatus, assigneeIds: nextAssigneeIds, deadline: nextDeadline };
        return s;
      });
      const nextStage = stages.find(s => s.id === nextStageId);
      if (nextStage) {
        const message = note 
          ? `Bạn được giao xử lý bước "${nextStage.name}" — dự án ${p.code}.\nLời nhắn: ${note}`
          : `Bạn được giao xử lý bước "${nextStage.name}" — dự án ${p.code}.`;
        nextAssigneeIds.forEach(nextAssigneeId => {
          const notif: Notification = {
            id: `notif-${crypto.randomUUID()}`, userId: nextAssigneeId,
            title: '📋 Công việc mới được giao',
            message,
            type: 'assignment', isRead: false,
            createdAt: new Date().toISOString(),
            linkTo: { projectId: p.id, stageId: nextStageId },
          };
          setNotifications(n => [notif, ...n]);
          gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
          // Push notification native + FCM khi chuyển tiếp công việc
          showLocalNotification(notif.title, notif.message, `handoff-${nextStageId}`);
          gasPost({ action: 'sendPush', userId: nextAssigneeId, title: notif.title, body: notif.message, data: { projectId: p.id, stageId: nextStageId } }).catch(() => {});
        });
      }
      const allDone = stages.every(s => s.status === 'completed');
      const p2 = { ...p, stages, status: allDone ? 'completed' as const : p.status };
      updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  // Trả lại bước trước
  const returnStage = useCallback(async (
    projectId: string, currentStageId: string, prevStageId: string, returnNote: string
  ) => {
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== projectId) return p;

        const prevStage = p.stages.find(s => s.id === prevStageId);
        const now       = new Date();

        // Deadline mới cho Stage N-1 = đúng 24 giờ kể từ lúc bấm trả
        const deadline24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];

        const stages = p.stages.map(s => {
          // ── Stage N (giai đoạn hiện tại bị trả) ──────────────────
          if (s.id === currentStageId) {
            return {
              ...s,
              status:     'pending' as StageStatus, // "Chờ bước trước"
              assigneeIds: [],                        // xóa người thực hiện
              returnNote,                            // ghi lý do
            };
          }

          // ── Stage N-1 (giai đoạn trước — nhận lại việc) ─────────
          if (s.id === prevStageId) {
            return {
              ...s,
              status:      'in_progress' as StageStatus, // "Đang thực hiện"
              // assigneeIds giữ nguyên — không xóa
              completedAt: undefined,                    // bỏ dấu hoàn thành
              returnNote,                                // hiện chú thích đỏ
              isReturned:  true,                         // cờ highlight vàng
              returnedAt:  now.toISOString(),            // timestamp trả
              deadline:    deadline24h,                  // SLA 24h
            };
          }

          return s;
        });

        // Gửi thông báo cho người thực hiện Stage N-1
        if (prevStage?.assigneeIds && prevStage.assigneeIds.length > 0) {
          prevStage.assigneeIds.forEach(assigneeId => {
            const notif: Notification = {
              id:        `notif-${crypto.randomUUID()}`,
              userId:    assigneeId,
              title:     '↩️ Hồ sơ bị trả lại — cần xử lý gấp',
              message:   `Bước "${prevStage.name}" bị trả lại — ${p.code}. Lý do: ${returnNote}. Hạn xử lý: 24h.`,
              type:      'return',
              isRead:    false,
              createdAt: now.toISOString(),
              linkTo:    { projectId: p.id, stageId: prevStageId },
            };
            setNotifications(n => [notif, ...n]);
            gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
            showLocalNotification(notif.title, notif.message, `return-${prevStageId}`);
            gasPost({ action: 'sendPush', userId: assigneeId, title: notif.title, body: notif.message, data: { projectId: p.id, stageId: prevStageId } }).catch(() => {});
          });
        }

        const p2 = { ...p, stages };

        // Sync lên GAS ngay trong callback (đảm bảo dùng đúng data mới)
        gasPost({ action: 'saveProject', project: p2 }).catch(() => {});

        return p2;
      });

      return next;
    });
  }, []);

  const addAttachment = useCallback(async (projectId: string, stageId: string, attachment: Attachment) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s =>
        s.id === stageId ? { ...s, attachments: [...(s.attachments || []), attachment] } : s
      );
      const p2 = { ...p, stages }; updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  // Thêm nhiều attachment cùng lúc trong MỘT lần setProjects → tránh stale closure
  // khi upload multi-file tuần tự rồi gộp vào state
  const addAttachmentsBatch = useCallback(async (projectId: string, stageId: string, attachments: Attachment[]) => {
    if (attachments.length === 0) return;
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s =>
        s.id === stageId
          ? { ...s, attachments: [...(s.attachments || []), ...attachments] }
          : s
      );
      const p2 = { ...p, stages }; updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  const removeAttachment = useCallback(async (projectId: string, stageId: string, attachmentId: string, fileId?: string) => {
    // 1. Xóa khỏi state local
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => {
        if (s.id !== stageId) return s;
        return { ...s, attachments: (s.attachments || []).filter(a => a.id !== attachmentId) };
      });
      const p2 = { ...p, stages };
      updated = p2;
      return p2;
    }));
    // 2. Xóa file trên Google Drive (chuyển vào Thùng rác)
    if (fileId) {
      gasPost({ action: 'deleteFile', fileId }).catch(() => {});
    }
    // 3. Sync project lên GAS
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  // Báo cáo phát sinh — TẠMDỪNG deadline
  const reportIssue = useCallback(async (projectId: string, note: string) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const issue = {
        id: `issue-${crypto.randomUUID()}`, note,
        createdAt: new Date().toISOString(),
        reportedBy: currentUser?.name || 'Unknown',
        reportedById: currentUser?.id || '',
        pausedDeadlineAt: new Date().toISOString(),
      };
      const p2 = {
        ...p,
        hasIssue: true,
        originalDeadline: p.originalDeadline || p.overallDeadline,
        issues: [...(p.issues || []), issue],
      };
      updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [currentUser, _syncProject]);

  // Kết thúc phát sinh — TIẾP TỤC deadline (cộng thêm số ngày bị tạm dừng)
  const resolveIssue = useCallback(async (projectId: string, issueId: string, resolutionNote: string) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const now = new Date();
      const updatedIssues = (p.issues || []).map(issue => {
        if (issue.id !== issueId) return issue;
        const pausedDays = issue.pausedDeadlineAt
          ? Math.ceil((now.getTime() - new Date(issue.pausedDeadlineAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          ...issue, resolutionNote,
          resolvedBy: currentUser?.name || '',
          resolvedById: currentUser?.id || '',
          resolvedAt: now.toISOString(),
          isResolved: true,
          resumedAt: now.toISOString(),
          pausedDays,
        };
      });

      // Cộng thêm số ngày bị tạm dừng vào deadline
      const resolvedIssue = updatedIssues.find(i => i.id === issueId);
      const pausedDays = resolvedIssue?.pausedDays || 0;
      const newDeadline = new Date(p.overallDeadline);
      newDeadline.setDate(newDeadline.getDate() + pausedDays);

      const stillHasIssue = updatedIssues.some(i => !i.isResolved);
      const p2 = {
        ...p,
        hasIssue: stillHasIssue,
        overallDeadline: newDeadline.toISOString().split('T')[0],
        issues: updatedIssues,
      };
      updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [currentUser, _syncProject]);

  // ── Users ─────────────────────────────────────────────────────
  const deleteUser = useCallback(async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    await gasPost({ action: 'deleteUser', id: userId }).catch(() => {});
  }, []);

  const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    await gasPost({ action: 'updateUser', id: userId, ...updates }).catch(() => {});
  }, []);

  // ── Notifications ─────────────────────────────────────────────
  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await gasPost({ action: 'markNotifRead', id }).catch(() => {});
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (currentUser) await gasPost({ action: 'markAllNotifsRead', userId: currentUser.id }).catch(() => {});
  }, [currentUser]);

  // ── Customer Info ─────────────────────────────────────────────
  const updateCustomerInfo = useCallback(async (projectId: string, customerInfo: import('../types').CustomerInfo) => {
    let updatedProject: Project | undefined;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      updatedProject = { ...p, customerInfo };
      return updatedProject;
    }));
    if (updatedProject) await _syncProject(updatedProject);
  }, [_syncProject]);

  // ── Cập nhật thông tin tổng quát của dự án (tên, khách hàng, địa chỉ...) ──
  const updateProjectInfo = useCallback(async (projectId: string, updates: Partial<Project>) => {
    let updatedProject: Project | undefined;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      updatedProject = { ...p, ...updates };
      return updatedProject!;
    }));
    if (updatedProject) await _syncProject(updatedProject);
  }, [_syncProject]);

  // ── Reload từ GAS (dùng sau khi đổi GAS URL) ──────────────────
  const reloadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [uData, pData] = await Promise.all([gasGet('getUsers'), gasGet('getProjects')]);

      if (Array.isArray(uData) && uData.length > 0) {
        let fetchedUsers: User[] = uData;
        const hasAdmin = fetchedUsers.some(u => u.username === 'trung91hn');
        if (!hasAdmin) fetchedUsers = [...mockUsers, ...fetchedUsers];
        setUsers(fetchedUsers);
      }

      if (Array.isArray(pData) && pData.length > 0) {
        setProjects(pData);
        lsSave(LS_PROJECTS, pData);
      }

      if (currentUser) {
        const nData = await gasGet('getNotifications', { userId: currentUser.id });
        if (Array.isArray(nData) && nData.length > 0) {
          setNotifications(nData);
          lsSave(LS_NOTIFS, nData);
        }
      }
    } catch { /* GAS không phản hồi — giữ nguyên state hiện tại */ }
    finally { setIsSyncing(false); }
  }, [currentUser]);

  return (
    <AppContext.Provider value={{
      projects, users, currentUser, isAuthenticated, isAppLoading, isSyncing, notifications,
      login, logout, register, setCurrentUser,
      addProject, updateProjectStage, updateProjectStageAssignee, updateProjectStageAppointment,
      deleteProject, deleteUser, updateUser, handoffStage, returnStage, addAttachment, addAttachmentsBatch, removeAttachment,
      reportIssue, resolveIssue,
      markNotificationAsRead, markAllNotificationsAsRead,
      updateCustomerInfo, updateProjectInfo,
      reloadData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
