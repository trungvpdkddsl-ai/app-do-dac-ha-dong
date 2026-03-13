import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Search, LogOut, Menu, User as UserIcon, ChevronDown,
  X, Save, CreditCard, Calendar, Building2, BadgeCheck,
  Shield, CheckCircle2,
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

// ── Random cute animal avatar ─────────────────────────────────
const ANIMALS = [
  { emoji: '🐻', label: 'Gấu',           bg: '#FDE68A', fg: '#92400E' },
  { emoji: '🐰', label: 'Thỏ',           bg: '#FBCFE8', fg: '#9D174D' },
  { emoji: '🐱', label: 'Mèo',           bg: '#E0F2FE', fg: '#0C4A6E' },
  { emoji: '🐶', label: 'Chó',           bg: '#FEF3C7', fg: '#78350F' },
  { emoji: '🐼', label: 'Gấu trúc',      bg: '#F1F5F9', fg: '#1E293B' },
  { emoji: '🦊', label: 'Cáo',           bg: '#FFEDD5', fg: '#9A3412' },
  { emoji: '🐨', label: 'Koala',         bg: '#DBEAFE', fg: '#1E3A5F' },
  { emoji: '🦁', label: 'Sư tử',         bg: '#FEF9C3', fg: '#713F12' },
  { emoji: '🐯', label: 'Hổ',            bg: '#FFF7ED', fg: '#9A3412' },
  { emoji: '🐸', label: 'Ếch',           bg: '#DCFCE7', fg: '#14532D' },
  { emoji: '🐧', label: 'Chim cánh cụt', bg: '#EFF6FF', fg: '#1E3A8A' },
  { emoji: '🦋', label: 'Bướm',          bg: '#FAE8FF', fg: '#6B21A8' },
  { emoji: '🐹', label: 'Chuột hamster', bg: '#FCE7F3', fg: '#831843' },
  { emoji: '🐮', label: 'Bò',            bg: '#F0FDF4', fg: '#166534' },
  { emoji: '🐷', label: 'Lợn',           bg: '#FDF2F8', fg: '#9D174D' },
  { emoji: '🦔', label: 'Nhím',          bg: '#FEF3C7', fg: '#92400E' },
];

function getAnimalForUser(userId: string) {
  const seed = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = (seed + Math.floor(Date.now() / 86_400_000)) % ANIMALS.length;
  return ANIMALS[idx];
}

// ── Type cho extended profile (lưu localStorage) ─────────────
export type UserProfile = {
  name:         string;
  department:   string;
  position:     string;   // Chức vụ (không có trong User gốc)
  idNumber:     string;   // Số CCCD
  dob:          string;   // Ngày sinh YYYY-MM-DD
  idIssueDate:  string;   // Ngày cấp CCCD
  idIssuePlace: string;   // Nơi cấp CCCD
};

const LS_KEY = (userId: string) => `user_profile_${userId}`;

function loadProfile(userId: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(LS_KEY(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(userId: string, profile: UserProfile) {
  localStorage.setItem(LS_KEY(userId), JSON.stringify(profile));
}

// ── Header ────────────────────────────────────────────────────
type HeaderProps = { toggleSidebar: () => void };

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { currentUser, logout, setCurrentUser, isSyncing } = useAppContext();

  const [imgError,       setImgError]       = useState(false);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [savedBadge,     setSavedBadge]     = useState(false);
  const [form,           setForm]           = useState<UserProfile | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset ảnh khi đổi user
  useEffect(() => { setImgError(false); }, [currentUser?.id]);

  const animal = useMemo(
    () => (currentUser ? getAnimalForUser(currentUser.id) : ANIMALS[0]),
    [currentUser?.id]
  );

  if (!currentUser) return null;

  const showAnimal =
    imgError ||
    !currentUser.avatar ||
    currentUser.avatar.includes('default') ||
    currentUser.avatar.includes('placeholder');

  // ── Mở modal profile, load localStorage trước ───────────────
  const openProfile = () => {
    const saved = loadProfile(currentUser.id);
    setForm({
      name:         saved?.name         ?? currentUser.name,
      department:   saved?.department   ?? currentUser.department ?? '',
      position:     saved?.position     ?? '',
      idNumber:     saved?.idNumber     ?? '',
      dob:          saved?.dob          ?? '',
      idIssueDate:  saved?.idIssueDate  ?? '',
      idIssuePlace: saved?.idIssuePlace ?? '',
    });
    setDropdownOpen(false);
    setProfileOpen(true);
    setSavedBadge(false);
  };

  // ── Lưu thay đổi ────────────────────────────────────────────
  const handleSave = () => {
    if (!form) return;

    // TODO: Dữ liệu này sẽ được dùng để tự động truyền vào thư viện docxtemplater khi xuất file Word Giấy ủy quyền.
    saveProfile(currentUser.id, form);

    // Cập nhật state hiện tại (name, department) để phản ánh ngay trên UI
    setCurrentUser({
      ...currentUser,
      name:       form.name.trim()       || currentUser.name,
      department: form.department.trim() || currentUser.department,
    });

    setSavedBadge(true);
    setTimeout(() => {
      setSavedBadge(false);
      setProfileOpen(false);
    }, 1400);
  };

  const f = (field: keyof UserProfile, val: string) =>
    setForm(prev => prev ? { ...prev, [field]: val } : prev);

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 relative">
        {/* Left */}
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

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-5">
          {isSyncing && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 hidden sm:flex">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Đang đồng bộ...
            </div>
          )}

          <NotificationDropdown />

          {/* Avatar + dropdown trigger */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-5 border-l border-slate-200" ref={dropdownRef}>
            {/* Tên + role (desktop) */}
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                <span style={{ fontSize: 11 }}>{animal.emoji}</span>
                {currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
              </div>
            </div>

            {/* Avatar button — click mở dropdown */}
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="relative flex items-center gap-1.5 rounded-xl hover:bg-slate-100 p-1 pr-2 transition-colors group"
              title="Tài khoản của bạn"
            >
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl select-none border-2 shrink-0 overflow-hidden transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: showAnimal ? animal.bg : undefined,
                  borderColor:     showAnimal ? animal.fg + '50' : '#e2e8f0',
                }}
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
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* ── Dropdown Menu ── */}
            {dropdownOpen && (
              <div className="absolute top-full right-4 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1.5">
                {/* User mini card */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 border"
                      style={{ backgroundColor: animal.bg, borderColor: animal.fg + '40' }}
                    >
                      {animal.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{currentUser.department || 'Chưa có phòng ban'}</div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <button
                  onClick={openProfile}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  <UserIcon size={15} className="text-indigo-400" />
                  Thông tin tài khoản
                </button>

                <div className="h-px bg-slate-100 mx-3 my-1" />

                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} className="text-red-400" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          MODAL: THÔNG TIN TÀI KHOẢN / HỒ SƠ CÁ NHÂN
          ═══════════════════════════════════════════════════════ */}
      {profileOpen && form && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                {/* Avatar lớn trong modal */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 shrink-0"
                  style={{ backgroundColor: animal.bg, borderColor: animal.fg + '40' }}
                >
                  {animal.emoji}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Thông tin tài khoản</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentUser.role === 'manager' ? '🏅 Quản lý' : '👤 Nhân viên'} · {currentUser.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 custom-scrollbar">

              {/* ── Thông tin cơ bản ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Thông tin cơ bản</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Họ và tên</label>
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => f('name', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Phòng ban</label>
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={form.department}
                          onChange={e => f('department', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Nội nghiệp"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Chức vụ</label>
                      <div className="relative">
                        <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={form.position}
                          onChange={e => f('position', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Kỹ thuật viên"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Thông tin pháp lý (dùng cho Giấy ủy quyền) ── */}
              <section className="pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-amber-500 rounded-full" />
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Thông tin pháp lý</h3>
                  <span className="text-[10px] text-slate-400 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Dùng cho Giấy ủy quyền</span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 flex items-start gap-2">
                  <Shield size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Thông tin CCCD được lưu cục bộ trên thiết bị này và sẽ được dùng để tự động điền vào biểu mẫu Giấy ủy quyền.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Số Căn cước công dân (CCCD)</label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.idNumber}
                        onChange={e => f('idNumber', e.target.value)}
                        maxLength={12}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none font-mono tracking-wider"
                        placeholder="012 345 678 901"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Ngày tháng năm sinh</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={form.dob}
                          onChange={e => f('dob', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Ngày cấp CCCD</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={form.idIssueDate}
                          onChange={e => f('idIssueDate', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Nơi cấp</label>
                    <input
                      type="text"
                      value={form.idIssuePlace}
                      onChange={e => f('idIssuePlace', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                      placeholder="Cục Cảnh sát QLHC về TTXH"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0">
              <p className="text-[10px] text-slate-400 leading-relaxed hidden sm:block">
                Dữ liệu lưu cục bộ trên thiết bị này
              </p>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setProfileOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={savedBadge}
                  className={`px-5 py-2 text-white font-medium rounded-xl transition-all text-sm flex items-center gap-2 min-w-[130px] justify-center ${
                    savedBadge
                      ? 'bg-emerald-500 scale-95'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {savedBadge ? (
                    <><CheckCircle2 size={15} /> Đã lưu!</>
                  ) : (
                    <><Save size={15} /> Lưu thay đổi</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
