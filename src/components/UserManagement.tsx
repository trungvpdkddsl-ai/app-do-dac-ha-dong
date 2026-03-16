import { getGasUrl } from '../config';
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Search, Edit2, Trash2, Building2, UserCircle, X, AlertCircle, CheckCircle2, Map } from 'lucide-react';


type UserData = {
  id: string;
  name: string;
  fullName?: string;
  username: string;
  role: string;
  department: string;
  avatar: string;
};

export const UserManagement: React.FC = () => {
  const { currentUser, users: contextUsers, deleteUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Dùng users từ context (đã load sẵn) thay vì fetch riêng
  const users: UserData[] = contextUsers.map(u => ({
    id: u.id,
    name: u.name,
    fullName: u.fullName,
    username: u.username || '',
    role: u.role,
    department: u.department || '',
    avatar: u.avatar || '',
  }));

  const handleEditClick = (user: UserData) => {
    setEditingUser(user);
    setEditName(user.fullName || user.name);
    setEditDepartment(user.department || 'Nội nghiệp');
    setEditRole(user.role || 'employee');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await fetch(getGasUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUser', id: editingUser.id, name: editName, department: editDepartment, role: editRole }),
      });
      setNotification({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      setEditingUser(null);
    } catch {
      setNotification({ type: 'error', text: 'Lỗi khi cập nhật thông tin.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteClick = (user: UserData) => setDeletingUser(user);

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await deleteUser(deletingUser.id);
      setNotification({ type: 'success', text: 'Đã xóa tài khoản thành công!' });
      setDeletingUser(null);
    } catch {
      setNotification({ type: 'error', text: 'Lỗi khi xóa tài khoản.' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-slate-400">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (currentUser.role !== 'manager' && currentUser.username !== 'trung91hn') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h2>
          <p className="text-slate-500">Bạn không có quyền truy cập trang Quản lý nhân sự.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    (user.fullName || user.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const noiNghiepCount = users.filter(u => u.department === 'Nội nghiệp').length;
  const ngoaiNghiepCount = users.filter(u => u.department === 'Ngoại nghiệp').length;

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý nhân sự</h1>
          <p className="text-slate-500 mt-1">Quản lý tài khoản và phòng ban của nhân viên</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Tổng nhân sự</div>
            <div className="text-2xl font-bold text-slate-900">{users.length}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Nội nghiệp</div>
            <div className="text-2xl font-bold text-slate-900">{noiNghiepCount}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Map size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Ngoại nghiệp</div>
            <div className="text-2xl font-bold text-slate-900">{ngoaiNghiepCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-slate-50/50 shrink-0">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhân viên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
              <Users size={40} className="text-slate-300" />
              <p>Chưa có nhân sự nào trong hệ thống.</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-4 pl-6 w-16">STT</th>
                    <th className="p-4">Họ và tên</th>
                    <th className="p-4">Tên đăng nhập</th>
                    <th className="p-4">Phòng ban</th>
                    <th className="p-4 text-right pr-6">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                      <tr key={user.id || index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 text-sm text-slate-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.fullName || user.name} className="w-8 h-8 rounded-full bg-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <UserCircle size={20} />
                              </div>
                            )}
                            <div className="font-medium text-slate-900">{user.fullName || user.name}</div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 font-mono">
                          {user.username}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.department === 'Nội nghiệp' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            user.department === 'Ngoại nghiệp' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {user.department || 'Chưa phân công'}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'manager' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}>
                            {user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(currentUser?.role === 'manager' || currentUser?.username === 'trung91hn') && (
                              <>
                                <button 
                                  onClick={() => handleEditClick(user)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                  title="Sửa"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(user)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                  title="Xóa"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Không tìm thấy nhân viên nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phòng ban / Đội</label>
                <select 
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="Nội nghiệp">Nội nghiệp</option>
                  <option value="Ngoại nghiệp">Ngoại nghiệp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="employee">Nhân viên</option>
                  <option value="manager">Quản lý</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setEditingUser(null)}
                  disabled={isSaving}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang lưu...
                    </>
                  ) : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa tài khoản</h3>
              <p className="text-slate-500 mb-6">
                Bạn có chắc chắn muốn xóa tài khoản <span className="font-bold text-slate-900">{deletingUser.name}</span> ({deletingUser.username}) không? Hành động này không thể hoàn tác.
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xóa...
                    </>
                  ) : 'Xóa tài khoản'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{notification.text}</span>
        </div>
      )}
    </div>
  );
};
