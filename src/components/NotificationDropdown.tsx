import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Bell, Check, Clock, AlertCircle, FileText, ArrowRight } from 'lucide-react';

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

  const myNotifications = notifications
    .filter(n => n.userId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <FileText size={15} className="text-blue-500" />;
      case 'deadline':   return <AlertCircle size={15} className="text-red-500" />;
      case 'progress':   return <Check size={15} className="text-emerald-500" />;
      case 'return':     return <ArrowRight size={15} className="text-amber-500" />;
      default:           return <Bell size={15} className="text-slate-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'assignment': return 'bg-blue-100';
      case 'deadline':   return 'bg-red-100';
      case 'progress':   return 'bg-emerald-100';
      case 'return':     return 'bg-amber-100';
      default:           return 'bg-slate-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Nút chuông với badge số nổi bật ── */}
      <button
        className={`relative p-2 rounded-xl transition-all ${
          isOpen
            ? 'bg-indigo-100 text-indigo-700'
            : unreadCount > 0
            ? 'text-slate-600 hover:bg-slate-100'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        title={`${unreadCount} thông báo chưa đọc`}
      >
        {/* Hiệu ứng rung khi có thông báo mới */}
        <Bell
          size={21}
          className={unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}
          style={unreadCount > 0 ? {
            animation: 'bellRing 2.5s ease-in-out infinite',
            transformOrigin: 'top center',
          } : {}}
        />

        {/* Badge số — nổi bật hơn */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white leading-none shadow-sm"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Check size={12} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
            {myNotifications.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {myNotifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                      !notif.isRead ? 'bg-indigo-50/40' : ''
                    }`}
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getBg(notif.type)}`}>
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-xs font-semibold leading-snug ${!notif.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock size={9} />
                        {new Date(notif.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-sm text-slate-400">Chưa có thông báo nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS animation cho chuông */}
      <style>{`
        @keyframes bellRing {
          0%, 90%, 100% { transform: rotate(0deg); }
          92%  { transform: rotate(12deg); }
          94%  { transform: rotate(-10deg); }
          96%  { transform: rotate(8deg); }
          98%  { transform: rotate(-6deg); }
        }
      `}</style>
    </div>
  );
};
