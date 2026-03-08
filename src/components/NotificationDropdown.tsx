import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Bell, Check, Clock, AlertCircle, FileText } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export const NotificationDropdown: React.FC = () => {
  const { notifications, currentUser, markNotificationAsRead, markAllNotificationsAsRead } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const myNotifications = notifications.filter(n => n.userId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <FileText size={16} className="text-blue-500" />;
      case 'deadline': return <AlertCircle size={16} className="text-red-500" />;
      case 'progress': return <Check size={16} className="text-emerald-500" />;
      default: return <Bell size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative text-slate-500 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-slate-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {myNotifications.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {myNotifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      // In a real app, this would navigate to the project/stage
                    }}
                  >
                    <div className="mt-1 shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notif.type === 'assignment' ? 'bg-blue-100' :
                        notif.type === 'deadline' ? 'bg-red-100' :
                        'bg-emerald-100'
                      }`}>
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-medium ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0"></span>}
                      </div>
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">{notif.message}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(notif.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm">Không có thông báo nào</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
