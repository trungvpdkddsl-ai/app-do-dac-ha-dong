import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, User, StageStatus, Notification, Attachment } from '../types';
import { mockProjects, mockUsers, mockNotifications } from '../data/mock';
import { requestNotificationPermission, onForegroundMessage, showLocalNotification } from '../utils/firebase';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec';

const LS_PROJECTS         = 'geotask_projects';
const LS_NOTIFS           = 'geotask_notifications';
const LS_USER             = 'geotask_current_user';
const LS_OVERDUE_NOTIFIED = 'geotask_overdue_notified';
const LS_URGENT_NOTIFIED  = 'geotask_urgent_notified';  // sắp hết hạn (<24h)

async function gasGet(action: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ action, ...extra });
  const res = await fetch(`${GAS_URL}?${params}`);
  return res.json();
}

async function gasPost(body: Record<string, unknown>) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  return res.json();
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
  register: (user: Omit<User, 'id'>) => Promise<void>;
  setCurrentUser: (user: User) => void;
  addProject: (project: Project) => Promise<void>;
  updateProjectStage: (projectId: string, stageId: string, status: StageStatus) => Promise<void>;
  updateProjectStageAssignee: (projectId: string, stageId: string, userId: string) => Promise<void>;
  updateProjectStageAppointment: (projectId: string, stageId: string, appointmentDate: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  handoffStage: (projectId: string, currentStageId: string, nextStageId: string, nextAssigneeId: string, nextDeadline: string) => Promise<void>;
  returnStage: (projectId: string, currentStageId: string, prevStageId: string, returnNote: string) => Promise<void>;
  addAttachment: (projectId: string, stageId: string, attachment: Attachment) => Promise<void>;
  reportIssue: (projectId: string, note: string) => Promise<void>;
  resolveIssue: (projectId: string, issueId: string, resolutionNote: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects,        setProjects]         = useState<Project[]>    (lsLoad(LS_PROJECTS, mockProjects));
  const [users,           setUsers]            = useState<User[]>       ([]);
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
      let fetchedUsers: User[]       = mockUsers;
      let fetchedProjects: Project[] = lsLoad(LS_PROJECTS, mockProjects);
      try {
        const [uData, pData] = await Promise.all([gasGet('getUsers'), gasGet('getProjects')]);
        if (Array.isArray(uData) && uData.length > 0)  fetchedUsers    = uData;
        else if (uData?.users?.length > 0)             fetchedUsers    = uData.users;
        if (Array.isArray(pData) && pData.length > 0)  fetchedProjects = pData;
      } catch { /* offline */ }

      setUsers(fetchedUsers);
      setProjects(fetchedProjects);

      const savedRaw = localStorage.getItem(LS_USER);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw) as User;
          const fresh = fetchedUsers.find(u => u.id === saved.id && u.username === saved.username);
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
            const notif: Notification = {
              id: `notif-overdue-${s.id}`, userId: s.assigneeId,
              title: '⚠️ Quá hạn', message: `Giai đoạn "${s.name}" dự án ${p.code} đã quá hạn.`,
              type: 'deadline', isRead: false,
              createdAt: new Date().toISOString(),
              linkTo: { projectId: p.id, stageId: s.id },
            };
            setNotifications(n => n.some(x => x.id === notif.id) ? n : [notif, ...n]);
            gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
            newOverdue.push(s.id);
          }
          return { ...s, status: 'overdue' as StageStatus };
        }

        // Urgent check: còn <= 1 ngày
        if (s.deadline <= tomorrow && s.deadline >= today && !alreadyUrgent.has(s.id)) {
          const notif: Notification = {
            id: `notif-urgent-${s.id}`, userId: s.assigneeId,
            title: '🟡 Sắp hết hạn', message: `Giai đoạn "${s.name}" dự án ${p.code} còn dưới 24 giờ.`,
            type: 'deadline', isRead: false,
            createdAt: new Date().toISOString(),
            linkTo: { projectId: p.id, stageId: s.id },
          };
          setNotifications(n => n.some(x => x.id === notif.id) ? n : [notif, ...n]);
          gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
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

    // ── Thử đăng nhập qua GAS server ─────────────────────────
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000); // timeout 5s
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', username: uname, password }),
        signal: controller.signal,
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

    // ── Fallback: đăng nhập bằng dữ liệu local / mock ────────
    const allUsers = [...users];
    // Thêm mock users nếu chưa có trong danh sách
    for (const mu of mockUsers) {
      if (!allUsers.find(u => u.username === mu.username)) allUsers.push(mu);
    }
    const found = allUsers.find(
      u => u.username?.trim().toLowerCase() === uname && u.password === password
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

  const register = useCallback(async (userData: Omit<User, 'id'>) => {
    // Kiểm tra trùng username trong local state trước khi thêm
    const uname = userData.username?.trim().toLowerCase() || '';
    setUsers(prev => {
      if (prev.some(u => u.username?.trim().toLowerCase() === uname)) return prev;
      const newUser: User = { ...userData, username: uname, id: crypto.randomUUID() };
      return [...prev, newUser];
    });
  }, []);

  const setCurrentUser = useCallback((user: User) => setCurrentUserState(user), []);

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
        return { ...s, status, completedAt: status === 'completed' ? new Date().toISOString().split('T')[0] : s.completedAt };
      });
      const allDone = stages.every(s => s.status === 'completed');
      const p2 = { ...p, stages, status: allDone ? 'completed' as const : p.status };
      updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [users, currentUser, _syncProject]);

  const updateProjectStageAssignee = useCallback(async (projectId: string, stageId: string, userId: string) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => s.id === stageId ? { ...s, assigneeId: userId } : s);
      const p2 = { ...p, stages }; updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  // Lưu ngày hẹn trả kết quả vào giai đoạn "Nộp hồ sơ"
  const updateProjectStageAppointment = useCallback(async (projectId: string, stageId: string, appointmentDate: string) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => s.id === stageId ? { ...s, appointmentDate } : s);
      const p2 = { ...p, stages, overallDeadline: appointmentDate }; // Cập nhật deadline tổng theo ngày hẹn
      updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

  const deleteProject = useCallback(async (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    await gasPost({ action: 'deleteProject', projectId }).catch(() => {});
  }, []);

  // Chuyển tiếp công việc sang bước tiếp theo
  const handoffStage = useCallback(async (
    projectId: string, currentStageId: string, nextStageId: string,
    nextAssigneeId: string, nextDeadline: string
  ) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const stages = p.stages.map(s => {
        if (s.id === currentStageId)
          return { ...s, status: 'completed' as StageStatus, completedAt: new Date().toISOString().split('T')[0] };
        if (s.id === nextStageId)
          return { ...s, status: 'in_progress' as StageStatus, assigneeId: nextAssigneeId, deadline: nextDeadline };
        return s;
      });
      const nextStage = stages.find(s => s.id === nextStageId);
      if (nextStage) {
        const notif: Notification = {
          id: `notif-${crypto.randomUUID()}`, userId: nextAssigneeId,
          title: '📋 Công việc mới được giao',
          message: `Bạn được giao xử lý bước "${nextStage.name}" — dự án ${p.code}.`,
          type: 'assignment', isRead: false,
          createdAt: new Date().toISOString(),
          linkTo: { projectId: p.id, stageId: nextStageId },
        };
        setNotifications(n => [notif, ...n]);
        gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
        // Push notification native + FCM khi chuyển tiếp công việc
        showLocalNotification(notif.title, notif.message, `handoff-${nextStageId}`);
        gasPost({ action: 'sendPush', userId: nextAssigneeId, title: notif.title, body: notif.message, data: { projectId: p.id, stageId: nextStageId } }).catch(() => {});
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
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const prevStage = p.stages.find(s => s.id === prevStageId);
      const stages = p.stages.map(s => {
        if (s.id === currentStageId)
          return { ...s, status: 'pending' as StageStatus, returnNote };
        if (s.id === prevStageId)
          return { ...s, status: 'in_progress' as StageStatus, completedAt: undefined, returnNote };
        return s;
      });
      // Thông báo cho người làm bước trước
      if (prevStage?.assigneeId) {
        const notif: Notification = {
          id: `notif-${crypto.randomUUID()}`, userId: prevStage.assigneeId,
          title: '↩️ Hồ sơ bị trả lại',
          message: `Bước "${prevStage.name}" bị trả lại — ${p.code}. Lý do: ${returnNote}`,
          type: 'return', isRead: false,
          createdAt: new Date().toISOString(),
          linkTo: { projectId: p.id, stageId: prevStageId },
        };
        setNotifications(n => [notif, ...n]);
        gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
        // Push notification khi hồ sơ bị trả lại
        showLocalNotification(notif.title, notif.message, `return-${prevStageId}`);
        gasPost({ action: 'sendPush', userId: prevStage.assigneeId, title: notif.title, body: notif.message, data: { projectId: p.id, stageId: prevStageId } }).catch(() => {});
      }
      const p2 = { ...p, stages }; updated = p2; return p2;
    }));
    if (updated) await _syncProject(updated);
  }, [_syncProject]);

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

  // ── Notifications ─────────────────────────────────────────────
  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await gasPost({ action: 'markNotifRead', id }).catch(() => {});
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (currentUser) await gasPost({ action: 'markAllNotifsRead', userId: currentUser.id }).catch(() => {});
  }, [currentUser]);

  return (
    <AppContext.Provider value={{
      projects, users, currentUser, isAuthenticated, isAppLoading, isSyncing, notifications,
      login, logout, register, setCurrentUser,
      addProject, updateProjectStage, updateProjectStageAssignee, updateProjectStageAppointment,
      deleteProject, deleteUser, handoffStage, returnStage, addAttachment,
      reportIssue, resolveIssue,
      markNotificationAsRead, markAllNotificationsAsRead,
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
