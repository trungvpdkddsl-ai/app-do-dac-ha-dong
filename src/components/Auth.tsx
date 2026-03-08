import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Map, User, Lock, Briefcase, Building2, Image as ImageIcon } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Nội nghiệp');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isLogin) {
      const success = login(username, password);
      if (!success) {
        setError('Tên đăng nhập hoặc mật khẩu không đúng.');
      }
    } else {
      if (!username || !password || !name || !department) {
        setError('Vui lòng điền đầy đủ thông tin.');
        return;
      }
      
      setIsLoading(true);
      try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbzKueqCnPonJ1MsFzQpQDk7ihgnVVQyNHMUyc_dx6AocsDu1jW1zf6Gr9VgqMD4D00/exec', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'register',
            name,
            username,
            password,
            department,
            role: 'employee'
          })
        });
        
        if (response.ok) {
          setSuccessMessage('Đăng ký thành công! Vui lòng đăng nhập.');
          // Clear form
          setUsername('');
          setPassword('');
          setName('');
          setDepartment('Nội nghiệp');
          setIsLogin(true);
        } else {
          setError('Đăng ký thất bại. Vui lòng thử lại.');
        }
      } catch (err) {
        console.error('Registration error:', err);
        setError('Đã xảy ra lỗi khi kết nối tới máy chủ.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Map size={28} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          GeoTask Pro
        </h2>
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
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Phòng ban / Đội</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 size={18} className="text-slate-400" />
                    </div>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={isLoading}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                    >
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
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="manager / khaosat"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                {isLogin ? 'Tạo tài khoản mới' : 'Đăng nhập ngay'}
              </button>
            </div>
          </div>
          
          {isLogin && (
            <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-600">
              <p className="font-semibold mb-1">Tài khoản Demo:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Quản lý: <code>manager</code> / <code>password</code></li>
                <li>Nhân viên: <code>khaosat</code> / <code>password</code></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
