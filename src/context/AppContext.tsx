import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, User, StageStatus, Notification, Attachment } from '../types';
import { mockProjects, mockUsers, mockNotifications } from '../data/mock';

type AppContextType = {
  projects: Project[];
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  notifications: Notification[];
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  register: (user: Omit<User, 'id'>) => void;
  setCurrentUser: (user: User) => void;
  addProject: (project: Project) => void;
  updateProjectStage: (projectId: string, stageId: string, status: StageStatus) => void;
  addAttachment: (projectId: string, stageId: string, attachment: Attachment) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const login = (username: string, password?: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
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
              if (manager) {
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

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <AppContext.Provider value={{ 
      projects, users, currentUser, isAuthenticated, notifications, 
      login, logout, register,
      setCurrentUser, addProject, updateProjectStage, addAttachment,
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
