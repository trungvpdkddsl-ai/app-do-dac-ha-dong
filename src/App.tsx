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
  const { isAuthenticated } = useAppContext();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <ProjectList />;
      case 'tasks': return <TaskBoard />;
      case 'reports': return <Reports />;
      case 'team': return <UserManagement />;
      default: return <Dashboard />;
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

