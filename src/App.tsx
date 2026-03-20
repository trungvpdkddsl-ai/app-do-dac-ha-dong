import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { TaskBoard } from './components/TaskBoard';
import { Reports } from './components/Reports';
import { Auth } from './components/Auth';
import { UserManagement } from './components/UserManagement';
import { GasSettings } from './components/GasSettings';
import { FeeCalculator } from './components/FeeCalculator';
import { FinancialReport } from './components/FinancialReport';
import { ReminderPanel } from './components/ReminderPanel';

function AppContent() {
  const { isAuthenticated, isAppLoading } = useAppContext();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Lưu projectId cần mở từ notification hoặc từ TaskBoard
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToastMessage(customEvent.detail);
      setTimeout(() => setToastMessage(null), 3000);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  // Lắng nghe click từ push notification (qua service worker)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        if (event.data.data?.projectId) setPendingProjectId(event.data.data.projectId);
        setCurrentView('projects');
        setIsSidebarOpen(false);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Xử lý URL param khi mở từ notification (app đang đóng)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('project');
    if (pid) { setPendingProjectId(pid); setCurrentView('projects'); window.history.replaceState({}, '', '/'); }
  }, []);

  // YÊU CẦU 3: Navigate từ TaskBoard → ProjectList (mở thẳng chi tiết dự án)
  const handleNavigateToProject = (projectId: string) => {
    setPendingProjectId(projectId);
    setCurrentView('projects');
    setIsSidebarOpen(false);
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Auth />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':  return <Dashboard onNavigate={(view, projectId) => {
        if (projectId) setPendingProjectId(projectId);
        setCurrentView(view);
      }} />;
      case 'projects':   return (
        <ProjectList
          initialProjectId={pendingProjectId}
          onProjectOpened={() => setPendingProjectId(null)}
        />
      );
      case 'tasks':      return <TaskBoard onNavigateToProject={handleNavigateToProject} />;
      case 'reports':    return <Reports />;
      case 'financial':  return <FinancialReport />;
      case 'team':       return <UserManagement />;
      case 'feecalc':    return <FeeCalculator />;
      case 'settings':   return <GasSettings />;
      default:           return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-auto w-full">{renderView()}</main>
      </div>
      {/* Reminder Panel — cố định góc dưới phải, hiện trên mọi trang */}
      <ReminderPanel onNavigateToProject={handleNavigateToProject} />
      
      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <AppProvider><AppContent /></AppProvider>;
}
