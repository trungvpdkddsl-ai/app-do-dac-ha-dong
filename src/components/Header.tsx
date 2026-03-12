import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, LogOut, Menu } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

// ── Random cute animal avatar ─────────────────────────────────
// Dùng emoji con vật — không cần thư viện ngoài, hiển thị đẹp trên mọi thiết bị
const ANIMALS = [
  { emoji: '🐻', label: 'Gấu',       bg: '#FDE68A', fg: '#92400E' },
  { emoji: '🐰', label: 'Thỏ',       bg: '#FBCFE8', fg: '#9D174D' },
  { emoji: '🐱', label: 'Mèo',       bg: '#E0F2FE', fg: '#0C4A6E' },
  { emoji: '🐶', label: 'Chó',       bg: '#FEF3C7', fg: '#78350F' },
  { emoji: '🐼', label: 'Gấu trúc',  bg: '#F1F5F9', fg: '#1E293B' },
  { emoji: '🦊', label: 'Cáo',       bg: '#FFEDD5', fg: '#9A3412' },
  { emoji: '🐨', label: 'Koala',     bg: '#DBEAFE', fg: '#1E3A5F' },
  { emoji: '🦁', label: 'Sư tử',     bg: '#FEF9C3', fg: '#713F12' },
  { emoji: '🐯', label: 'Hổ',        bg: '#FFF7ED', fg: '#9A3412' },
  { emoji: '🐸', label: 'Ếch',       bg: '#DCFCE7', fg: '#14532D' },
  { emoji: '🐧', label: 'Chim cánh cụt', bg: '#EFF6FF', fg: '#1E3A8A' },
  { emoji: '🦋', label: 'Bướm',      bg: '#FAE8FF', fg: '#6B21A8' },
  { emoji: '🦊', label: 'Cáo lửa',   bg: '#FEE2E2', fg: '#991B1B' },
  { emoji: '🐹', label: 'Chuột túi', bg: '#FCE7F3', fg: '#831843' },
  { emoji: '🐮', label: 'Bò',        bg: '#F0FDF4', fg: '#166534' },
  { emoji: '🐷', label: 'Lợn',       bg: '#FDF2F8', fg: '#9D174D' },
];

function getAnimalForUser(userId: string) {
  // Deterministic per user (same animal each session), random each mount for freshness
  const seed = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = (seed + Math.floor(Date.now() / 86_400_000)) % ANIMALS.length; // đổi mỗi ngày
  return ANIMALS[idx];
}

type HeaderProps = {
  toggleSidebar: () => void;
};

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { currentUser, logout, isSyncing } = useAppContext();
  const [imgError, setImgError] = useState(false);

  // Reset lỗi ảnh khi đổi user
  useEffect(() => { setImgError(false); }, [currentUser?.id]);

  const animal = useMemo(() =>
    currentUser ? getAnimalForUser(currentUser.id) : ANIMALS[0],
    [currentUser?.id]
  );

  if (!currentUser) return null;

  const showAnimal = imgError || !currentUser.avatar || currentUser.avatar.includes('default') || currentUser.avatar.includes('placeholder');

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm dự án, công việc..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-5">
        {isSyncing && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 hidden sm:flex">
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            Đang đồng bộ...
          </div>
        )}

        {/* Notification bell với số badge nổi bật */}
        <NotificationDropdown />

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-5 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-slate-900">{currentUser.name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
              <span style={{ fontSize: 11 }}>{animal.emoji}</span>
              {currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
            </div>
          </div>

          {/* Avatar: emoji con vật nếu không có ảnh thật */}
          <div
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl select-none border-2 shrink-0 overflow-hidden transition-transform hover:scale-105 cursor-default"
            style={{
              backgroundColor: showAnimal ? animal.bg : undefined,
              borderColor: showAnimal ? animal.fg + '40' : '#e2e8f0',
            }}
            title={`${currentUser.name} (${animal.label})`}
          >
            {showAnimal ? (
              <span className="leading-none" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.1))' }}>
                {animal.emoji}
              </span>
            ) : (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover rounded-full"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          <button
            onClick={logout}
            className="ml-0 sm:ml-1 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
