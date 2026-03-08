import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, User, StageStatus, Notification, Attachment } from '../types';
import { mockProjects, mockUsers, mockNotifications } from '../data/mock';

type AppContextType = {
  projects: Project[];
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  isAppLoading: boolean;
  notifications: Notification[];
  login: (username: string, password?: string, rememberMe?: boolean) => boolean;
  logout: () => void;
  register: (user: Omit<User, 'id'>) => void;
  setCurrentUser: (user: User) => void;
  addProject: (project: Project) => void;
  updateProjectStage: (projectId: string, stageId: string, status: StageStatus) => void;
  updateProjectStageAssignee: (projectId: string, stageId: string, userId: string) => void;
  deleteProject: (projectId: string) => void;
  deleteUser: (userId: string) => void;
  handoffStage: (projectId: string, currentStageId: string, nextStageId: string, nextAssigneeId: string, nextDeadline: string) => void;
  addAttachment: (projectId: string, stageId: string, attachment: Attachment) => void;
  reportIssue: (projectId: string, note: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Load saved session and fetch users on mount
  useEffect(() => {
    const initApp = async () => {
      // Check local storage
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('currentUser');
        }
      }

      // Fetch users
      try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec?action=getUsers');
        if (response.ok) {
          const data = await response.json();
          const usersList = Array.isArray(data) ? data : (data.users || []);
          setUsers(usersList);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsAppLoading(false);
      }
    };

    initApp();
  }, []);

  const login = (username: string, password?: string, rememberMe: boolean = false) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      if (rememberMe) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
  };

  const register = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `u${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
  };

  // Check for overdue tasks periodically or on load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setProjects(prev => prev.map(p => {
      if (p.status === 'completed') return p;
      let hasChanges = false;
      const updatedStages = p.stages.map(s => {
        if (s.status === 'pending' || s.status === 'in_progress') {
          if (s.deadline < today) {
            hasChanges = true;
            
            // Create notification for overdue task
            const newNotif: Notification = {
              id: `notif-${Date.now()}-${s.id}`,
              userId: s.assigneeId,
              title: 'Cảnh báo quá hạn',
              message: `Nhiệm vụ "${s.name}" trong dự án ${p.code} đã quá hạn.`,
              type: 'deadline',
              isRead: false,
              createdAt: new Date().toISOString(),
              linkTo: { projectId: p.id, stageId: s.id }
            };
            setNotifications(n => [newNotif, ...n]);
            
            return { ...s, status: 'overdue' as StageStatus };
          }
        }
        return s;
      });
      return hasChanges ? { ...p, stages: updatedStages } : p;
    }));
  }, []);

  const addProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
  };

  const updateProjectStage = (projectId: string, stageId: string, status: StageStatus) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedStages = p.stages.map(s => {
          if (s.id === stageId) {
            // If status changed to completed, notify manager
            if (status === 'completed' && s.status !== 'completed') {
              const manager = users.find(u => u.role === 'manager');
              if (manager && currentUser) {
                const newNotif: Notification = {
                  id: `notif-${Date.now()}`,
                  userId: manager.id,
                  title: 'Cập nhật tiến độ',
                  message: `${currentUser.name} đã hoàn thành "${s.name}" trong dự án ${p.code}.`,
                  type: 'progress',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                  linkTo: { projectId: p.id, stageId: s.id }
                };
                setNotifications(n => [newNotif, ...n]);
              }
            }
            
            return {
              ...s,
              status,
              completedAt: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined
            };
          }
          return s;
        });
        
        // Check if all stages are completed
        const allCompleted = updatedStages.every(s => s.status === 'completed');
        
        return {
          ...p,
          stages: updatedStages,
          status: allCompleted ? 'completed' : p.status
        };
      }
      return p;
    }));
  };

  const updateProjectStageAssignee = (projectId: string, stageId: string, userId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedStages = p.stages.map(s => {
          if (s.id === stageId) {
            return { ...s, assigneeId: userId };
          }
          return s;
        });
        return { ...p, stages: updatedStages };
      }
      return p;
    }));
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handoffStage = (projectId: string, currentStageId: string, nextStageId: string, nextAssigneeId: string, nextDeadline: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedStages = p.stages.map(s => {
          if (s.id === currentStageId) {
            return {
              ...s,
              status: 'completed' as StageStatus,
              completedAt: new Date().toISOString().split('T')[0]
            };
          }
          if (s.id === nextStageId) {
            return {
              ...s,
              status: 'in_progress' as StageStatus,
              assigneeId: nextAssigneeId,
              deadline: nextDeadline
            };
          }
          return s;
        });

        // Notify next assignee
        const nextStage = updatedStages.find(s => s.id === nextStageId);
        if (nextStage) {
          const newNotif: Notification = {
            id: `notif-${Date.now()}`,
            userId: nextAssigneeId,
            title: 'Chuyển giao công việc',
            message: `Bạn vừa được giao xử lý bước "${nextStage.name}" của dự án ${p.code}.`,
            type: 'assignment',
            isRead: false,
            createdAt: new Date().toISOString(),
            linkTo: { projectId: p.id, stageId: nextStageId }
          };
          setNotifications(n => [newNotif, ...n]);
        }

        return { ...p, stages: updatedStages };
      }
      return p;
    }));
  };

  const addAttachment = (projectId: string, stageId: string, attachment: Attachment) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedStages = p.stages.map(s => {
          if (s.id === stageId) {
            return {
              ...s,
              attachments: [...(s.attachments || []), attachment]
            };
          }
          return s;
        });
        return { ...p, stages: updatedStages };
      }
      return p;
    }));
  };

  const reportIssue = (projectId: string, note: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        // Extend deadline by 7 days
        const currentDeadline = new Date(p.overallDeadline);
        currentDeadline.setDate(currentDeadline.getDate() + 7);
        const newDeadline = currentDeadline.toISOString().split('T')[0];

        const newIssue = {
          id: `issue-${Date.now()}`,
          note,
          createdAt: new Date().toISOString(),
          reportedBy: currentUser?.name || 'Unknown'
        };

        return {
          ...p,
          hasIssue: true,
          overallDeadline: newDeadline,
          issues: [...(p.issues || []), newIssue]
        };
      }
      return p;
    }));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <AppContext.Provider value={{ 
      projects, users, currentUser, isAuthenticated, notifications, isAppLoading,
      login, logout, register,
      setCurrentUser, addProject, updateProjectStage, updateProjectStageAssignee, deleteProject, deleteUser, handoffStage, addAttachment, reportIssue,
      markNotificationAsRead, markAllNotificationsAsRead
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
