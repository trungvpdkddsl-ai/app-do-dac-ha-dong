import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { TaskBoard } from './components/TaskBoard';
import { Reports } from './components/Reports';
import { Auth } from './components/Auth';

function AppContent() {
  const { isAuthenticated } = useAppContext();
  const [currentView, setCurrentView] = useState('dashboard');

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <ProjectList />;
      case 'tasks': return <TaskBoard />;
      case 'reports': return <Reports />;
      case 'team': return <div className="p-8"><h1 className="text-2xl font-bold">Quản lý nhân sự (Đang phát triển)</h1></div>;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
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

