import React, { useState } from 'react';
import { getGasUrl } from '../config';
import { useAppContext } from '../context/AppContext';
import { Map, User, Lock, Building2, Eye, EyeOff, Settings } from 'lucide-react';
import { GasSettings } from './GasSettings';

export const Auth: React.FC = () => {
  const { login, register, setCurrentUser } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Nội nghiệp');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isLogin) {
      // ── Đăng nhập ─────────────────────────────────────────────
      setIsLoading(true);
      try {
        const result = await login(username.trim().toLowerCase(), password, rememberMe);
        if (!result.success) {
          setError(result.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
        }
      } catch {
        setError('Đã xảy ra lỗi, vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // ── Đăng ký tài khoản mới ─────────────────────────────────
      const uname = username.trim().toLowerCase();
      const pwd = password.trim();
      const fullName = name.trim();

      if (!uname || !pwd || !fullName || !department) {
        setError('Vui lòng điền đầy đủ thông tin.');
        return;
      }
      if (pwd.length < 4) {
        setError('Mật khẩu phải có ít nhất 4 ký tự.');
        return;
      }

      setIsLoading(true);
      const localId = crypto.randomUUID();

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(getGasUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'register',
            id: localId,
            name: fullName,
            fullName: fullName,
            username: uname,
            password: pwd,
            department: department,
            role: 'user',
            status: 'active'
          }),
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timer);
        
        const text = await res.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch { /* ignore */ }

        const newUser = {
          id: localId,
          name: fullName,
          fullName: fullName,
          username: uname,
          password: pwd,
          department,
          role: 'user',
          status: 'active',
          avatar: '',
        } as import('../types').User;

        if (data.success) {
          register(newUser);
          setCurrentUser(newUser);
          localStorage.setItem('geotask_current_user', JSON.stringify(newUser));
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đăng ký và Đăng nhập tự động thành công!' }));
        } else if (data.message) {
          setError(data.message);
        } else {
          // Fallback offline khi GAS trả về HTML (lỗi deploy)
          register(newUser);
          setCurrentUser(newUser);
          localStorage.setItem('geotask_current_user', JSON.stringify(newUser));
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đăng ký offline thành công! (Chưa đồng bộ lên máy chủ)' }));
        }
      } catch (err) {
        // Fallback offline khi mất mạng
        const newUser = {
          id: localId,
          name: fullName,
          fullName: fullName,
          username: uname,
          password: pwd,
          department,
          role: 'user',
          status: 'active',
          avatar: '',
        } as import('../types').User;
        
        register(newUser);
        setCurrentUser(newUser);
        localStorage.setItem('geotask_current_user', JSON.stringify(newUser));
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đăng ký offline thành công! (Chưa đồng bộ lên máy chủ)' }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-3xl mb-4">
          <button
            onClick={() => setShowSettings(false)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
        <GasSettings />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <button
          onClick={() => setShowSettings(true)}
          className="absolute right-0 top-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="Cài đặt kết nối"
        >
          <Settings size={20} />
        </button>
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Map size={28} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">GeoTask Pro</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isLogin ? 'Đăng nhập để quản lý công việc đo đạc' : 'Tạo tài khoản mới'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm font-medium border border-emerald-100">
                {successMessage}
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Họ và tên</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-slate-400" />
                    </div>
                    <input type="text" required value={name}
                      onChange={(e) => setName(e.target.value)} disabled={isLoading}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
                      placeholder="Nguyễn Văn A" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Phòng ban / Đội</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 size={18} className="text-slate-400" />
                    </div>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)}
                      disabled={isLoading}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white disabled:bg-slate-50">
                      <option value="Nội nghiệp">Nội nghiệp</option>
                      <option value="Ngoại nghiệp">Ngoại nghiệp</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Tên đăng nhập</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input type="text" required value={username}
                  onChange={(e) => setUsername(e.target.value)} disabled={isLoading}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
                  placeholder="vd: nguyen.van.a" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
                  placeholder="Ít nhất 4 ký tự" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">Lưu đăng nhập</label>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed">
              {isLoading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }}
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                {isLogin ? 'Tạo tài khoản mới' : 'Đăng nhập ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
