import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, User, StageStatus, Notification, Attachment } from '../types';
import { mockProjects, mockUsers, mockNotifications } from '../data/mock';

// ══════════════════════════════════════════════════════════════
//  CẤU HÌNH — đổi thành URL Google Apps Script của bạn
// ══════════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec';
// ══════════════════════════════════════════════════════════════

const LS_PROJECTS         = 'geotask_projects';
const LS_NOTIFS           = 'geotask_notifications';
const LS_USER             = 'geotask_current_user';
const LS_OVERDUE_NOTIFIED = 'geotask_overdue_notified';

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

function loadOverdueNotified(): Set<string> {
  return new Set(lsLoad<string[]>(LS_OVERDUE_NOTIFIED, []));
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
  deleteProject: (projectId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  handoffStage: (projectId: string, currentStageId: string, nextStageId: string, nextAssigneeId: string, nextDeadline: string) => Promise<void>;
  addAttachment: (projectId: string, stageId: string, attachment: Attachment) => Promise<void>;
  reportIssue: (projectId: string, note: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects,        setProjects]          = useState<Project[]>    (lsLoad(LS_PROJECTS, mockProjects));
  const [users,           setUsers]             = useState<User[]>        ([]);
  const [currentUser,     setCurrentUserState]  = useState<User | null>  (null);
  const [isAuthenticated, setIsAuthenticated]   = useState(false);
  const [notifications,   setNotifications]     = useState<Notification[]>(lsLoad(LS_NOTIFS, mockNotifications));
  const [isAppLoading,    setIsAppLoading]      = useState(true);
  const [isSyncing,       setIsSyncing]         = useState(false);

  useEffect(() => { lsSave(LS_PROJECTS, projects); }, [projects]);
  useEffect(() => { lsSave(LS_NOTIFS,   notifications); }, [notifications]);

  // ── Khởi động: load data từ Google Sheets ────────────────────
  useEffect(() => {
    const init = async () => {
      setIsSyncing(true);
      let fetchedUsers: User[]       = mockUsers;
      let fetchedProjects: Project[] = lsLoad(LS_PROJECTS, mockProjects);

      try {
        const [uData, pData] = await Promise.all([
          gasGet('getUsers'),
          gasGet('getProjects'),
        ]);
        if (Array.isArray(uData) && uData.length > 0)     fetchedUsers    = uData;
        else if (uData?.users?.length > 0)                fetchedUsers    = uData.users;
        if (Array.isArray(pData) && pData.length > 0)     fetchedProjects = pData;
      } catch { /* offline — dùng cache */ }

      setUsers(fetchedUsers);
      setProjects(fetchedProjects);

      // Validate session
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

  // ── Kiểm tra overdue (chạy 1 lần, không lặp thông báo) ───────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const alreadyNotified = loadOverdueNotified();
    const newlyNotified: string[] = [];

    setProjects(prev => prev.map(p => {
      if (p.status === 'completed') return p;
      let changed = false;
      const stages = p.stages.map(s => {
        if ((s.status === 'pending' || s.status === 'in_progress') && s.deadline < today) {
          changed = true;
          if (!alreadyNotified.has(s.id)) {
            const notif: Notification = {
              id: `notif-overdue-${s.id}`,
              userId: s.assigneeId,
              title: 'Cảnh báo quá hạn',
              message: `Nhiệm vụ "${s.name}" trong dự án ${p.code} đã quá hạn.`,
              type: 'deadline', isRead: false,
              createdAt: new Date().toISOString(),
              linkTo: { projectId: p.id, stageId: s.id },
            };
            setNotifications(n => n.some(x => x.id === notif.id) ? n : [notif, ...n]);
            gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
            newlyNotified.push(s.id);
          }
          return { ...s, status: 'overdue' as StageStatus };
        }
        return s;
      });
      return changed ? { ...p, stages } : p;
    }));

    if (newlyNotified.length > 0) {
      const updated = new Set([...alreadyNotified, ...newlyNotified]);
      lsSave(LS_OVERDUE_NOTIFIED, [...updated]);
    }
  }, []);

  // ── Auth ──────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password?: string, rememberMe = false) => {
    try {
      const data = await gasPost({ action: 'login', username, password });
      if (data.success) {
        setCurrentUserState(data.user);
        setIsAuthenticated(true);
        if (rememberMe) lsSave(LS_USER, data.user);
        try {
          const nData = await gasGet('getNotifications', { userId: data.user.id });
          if (Array.isArray(nData) && nData.length > 0) setNotifications(nData);
        } catch { /* dùng cache */ }
        return { success: true };
      }
      return { success: false, message: data.message || 'Đăng nhập thất bại.' };
    } catch {
      return { success: false, message: 'Không thể kết nối server. Kiểm tra mạng.' };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUserState(null);
    setIsAuthenticated(false);
    localStorage.removeItem(LS_USER);
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: crypto.randomUUID() };
    await gasPost({ action: 'register', ...newUser });
    setUsers(prev => [...prev, newUser]);
  }, []);

  const setCurrentUser = useCallback((user: User) => setCurrentUserState(user), []);

  // ── Projects ──────────────────────────────────────────────────
  const _syncProject = useCallback(async (project: Project) => {
    await gasPost({ action: 'saveProject', project }).catch(() => {});
  }, []);

  const addProject = useCallback(async (project: Project) => {
    setProjects(prev => [project, ...prev]);
    await _syncProject(project);
  }, [_syncProject]);

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
              message: `${currentUser.name} đã hoàn thành "${s.name}" trong dự án ${p.code}.`,
              type: 'progress', isRead: false,
              createdAt: new Date().toISOString(),
              linkTo: { projectId: p.id, stageId: s.id },
            };
            setNotifications(n => [notif, ...n]);
            gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
          }
        }
        return { ...s, status, completedAt: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined };
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

  const deleteProject = useCallback(async (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    await gasPost({ action: 'deleteProject', projectId }).catch(() => {});
  }, []);

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
          title: 'Chuyển giao công việc',
          message: `Bạn vừa được giao xử lý bước "${nextStage.name}" của dự án ${p.code}.`,
          type: 'assignment', isRead: false,
          createdAt: new Date().toISOString(),
          linkTo: { projectId: p.id, stageId: nextStageId },
        };
        setNotifications(n => [notif, ...n]);
        gasPost({ action: 'saveNotification', notification: notif }).catch(() => {});
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

  const reportIssue = useCallback(async (projectId: string, note: string) => {
    let updated: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const d = new Date(p.overallDeadline);
      d.setDate(d.getDate() + 7);
      const issue = {
        id: `issue-${crypto.randomUUID()}`, note,
        createdAt: new Date().toISOString(),
        reportedBy: currentUser?.name || 'Unknown',
      };
      const p2 = { ...p, hasIssue: true, overallDeadline: d.toISOString().split('T')[0], issues: [...(p.issues || []), issue] };
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
      addProject, updateProjectStage, updateProjectStageAssignee,
      deleteProject, deleteUser, handoffStage, addAttachment, reportIssue,
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
