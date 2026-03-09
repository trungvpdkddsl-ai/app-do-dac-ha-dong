import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { TaskBoard } from './components/TaskBoard';
import { Reports } from './components/Reports';
import { Auth } from './components/Auth';
import { UserManagement } from './components/UserManagement';

function AppContent() {
  const { isAuthenticated, isAppLoading } = useAppContext();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentView} />;
      case 'projects': return <ProjectList />;
      case 'tasks': return <TaskBoard />;
      case 'reports': return <Reports />;
      case 'team': return <UserManagement />;
      default: return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-auto w-full">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

