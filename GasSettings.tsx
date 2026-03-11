import React, { useState, useEffect } from 'react';
import {
  Settings, CheckCircle2, XCircle, RefreshCw, Save,
  Wifi, WifiOff, Database, ShieldCheck, Lock,
} from 'lucide-react';
import { getGasUrl, setGasUrl, resetGasUrl, ENV_GAS_URL } from '../config';
import { useAppContext } from '../context/AppContext';

export const GasSettings: React.FC = () => {
  const { reloadData, isSyncing } = useAppContext();

  const [inputUrl,    setInputUrl]    = useState('');
  const [status,      setStatus]      = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [message,     setMessage]     = useState('');
  const [saved,       setSaved]       = useState(false);
  const [gasInfo,     setGasInfo]     = useState<Record<string,unknown> | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  // Khi đã có env URL → hiển thị nó (readonly); không thì lấy từ localStorage
  useEffect(() => { setInputUrl(ENV_GAS_URL || getGasUrl()); }, []);

  const isEnvMode = Boolean(ENV_GAS_URL);  // true = Vercel đã cấu hình env

  const testUrl = async (url: string) => {
    setStatus('testing'); setMessage('Đang kiểm tra kết nối...');
    try {
      const r   = await fetch(`${url.trim()}?action=version`);
      const txt = await r.text();
      const j   = JSON.parse(txt);
      if (j.ok || j.version) {
        setStatus('ok');
        setGasInfo(j);
        setMessage(`✅ Kết nối thành công! Version: ${j.version || '?'} — uploadFile: ${j.uploadFile ? '✅' : '❌ Chưa deploy version mới'}`);
      } else {
        setStatus('fail');
        setMessage('❌ GAS phản hồi nhưng không đúng version. Chi tiết: ' + JSON.stringify(j));
      }
    } catch(e) {
      setStatus('fail');
      setMessage('❌ Không kết nối được: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleSave = async () => {
    const url = inputUrl.trim();
    if (!url.startsWith('https://script.google.com/macros/s/')) {
      setStatus('fail');
      setMessage('❌ URL không hợp lệ. Phải bắt đầu bằng https://script.google.com/macros/s/');
      return;
    }

    // Chỉ ghi đúng key, KHÔNG xóa localStorage
    setGasUrl(url);
    setSaved(true);
    setMessage('✅ Đã lưu GAS URL. Đang tải lại dữ liệu từ server mới...');

    setIsReloading(true);
    try {
      await reloadData();
      setMessage('✅ Đã lưu URL và tải lại dữ liệu thành công!');
    } catch {
      setMessage('✅ Đã lưu URL. Không thể tải lại ngay — sẽ đồng bộ lần sau.');
    } finally {
      setIsReloading(false);
    }

    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetGasUrl();
    setInputUrl(ENV_GAS_URL || getGasUrl());
    setStatus('idle'); setMessage(''); setGasInfo(null);
  };

  const isBusy = status === 'testing' || isReloading || isSyncing;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <Settings size={22} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cài đặt kết nối</h1>
          <p className="text-sm text-slate-500">Cấu hình Google Apps Script URL</p>
        </div>
      </div>

      {/* ── Banner: đã kết nối qua env ── */}
      {isEnvMode && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Đã kết nối qua hệ thống (Mặc định)
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              URL đang được lấy từ biến môi trường <code className="bg-emerald-100 px-1 rounded font-mono">VITE_GAS_URL</code> do Vercel cung cấp.
              Bạn không cần nhập thủ công.
            </p>
          </div>
        </div>
      )}

      {/* ── GAS URL Config ── */}
      <div className={`bg-white rounded-2xl border p-6 mb-4 transition-opacity ${isEnvMode ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
        <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <Wifi size={16} />
          Google Apps Script URL
          {isEnvMode && (
            <span className="flex items-center gap-1 text-xs font-normal text-slate-400 ml-1">
              <Lock size={12} /> Khoá — đang dùng biến môi trường
            </span>
          )}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {isEnvMode
            ? 'URL bên dưới chỉ để xem. Để đổi, hãy cập nhật biến VITE_GAS_URL trên Vercel rồi redeploy.'
            : 'Sau khi deploy GAS mới, dán URL vào đây và nhấn Lưu — không cần rebuild app, không mất dữ liệu.'}
        </p>

        <div className="space-y-3">
          <textarea
            value={inputUrl}
            onChange={e => {
              if (isEnvMode) return;   // readonly khi env mode
              setInputUrl(e.target.value);
              setStatus('idle');
              setMessage('');
            }}
            readOnly={isEnvMode}
            rows={3}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono outline-none resize-none transition-colors ${
              isEnvMode
                ? 'bg-slate-50 text-slate-400 cursor-not-allowed select-none'
                : 'focus:ring-2 focus:ring-indigo-500'
            }`}
          />

          <div className="flex flex-wrap gap-2">
            {/* Nút kiểm tra — luôn hoạt động để admin xác nhận URL env */}
            <button
              onClick={() => testUrl(inputUrl)}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={status === 'testing' ? 'animate-spin' : ''} />
              Kiểm tra kết nối
            </button>

            {/* Nút lưu — ẩn khi env mode vì không cần thiết */}
            {!isEnvMode && (
              <button
                onClick={handleSave}
                disabled={isBusy}
                className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 ${
                  saved ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isReloading
                  ? <><Database size={14} className="animate-pulse" /> Đang tải lại...</>
                  : saved
                  ? <><CheckCircle2 size={14} /> Đã lưu!</>
                  : <><Save size={14} /> Lưu URL</>}
              </button>
            )}

            {/* Reset — chỉ hiện khi không dùng env */}
            {!isEnvMode && (
              <button
                onClick={handleReset}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl border border-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle size={14} /> Reset về mặc định
              </button>
            )}
          </div>

          {/* Status message */}
          {message && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
              status === 'ok' || saved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : status === 'fail'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {(status === 'ok' || saved) && !isReloading && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
              {status === 'fail' && <WifiOff size={16} className="shrink-0 mt-0.5" />}
              {(status === 'testing' || isReloading) && <RefreshCw size={16} className="animate-spin shrink-0 mt-0.5" />}
              <span>{message}</span>
            </div>
          )}

          {/* GAS info box */}
          {gasInfo && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-600 border border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">Chi tiết GAS:</div>
              {Object.entries(gasInfo).map(([k, v]) => (
                <div key={k}><span className="text-indigo-600">{k}</span>: {String(v)}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hướng dẫn Vercel env (chỉ hiện khi chưa có env) ── */}
      {!isEnvMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-blue-800 mb-3">🌐 Cách cấu hình cố định cho Vercel</h3>
          <p className="text-sm text-blue-700 mb-2">
            Thay vì nhập URL thủ công mỗi lần deploy, hãy thêm biến môi trường vào Vercel một lần duy nhất:
          </p>
          <ol className="text-sm text-blue-700 space-y-1">
            <li><strong>1.</strong> Vào <strong>Vercel Dashboard → Project → Settings → Environment Variables</strong></li>
            <li><strong>2.</strong> Thêm biến: <code className="bg-blue-100 px-1 rounded font-mono">VITE_GAS_URL</code> = URL GAS của bạn</li>
            <li><strong>3.</strong> Nhấn <strong>Redeploy</strong> — từ đây app sẽ tự động kết nối đúng sau mỗi lần deploy</li>
          </ol>
        </div>
      )}

      {/* ── Hướng dẫn re-deploy GAS ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-semibold text-amber-800 mb-3">📋 Hướng dẫn re-deploy GAS khi bị lỗi upload</h3>
        <ol className="text-sm text-amber-700 space-y-2">
          <li><strong>1.</strong> Mở <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="underline">script.google.com</a> → chọn project GeoTask Pro</li>
          <li><strong>2.</strong> Dán toàn bộ nội dung <code className="bg-amber-100 px-1 rounded">Code.gs</code> mới → <strong>Ctrl+S</strong></li>
          <li><strong>3.</strong> Nhấn <strong>Deploy → Manage deployments → ✏️ Edit</strong></li>
          <li><strong>4.</strong> Version: chọn <strong>"New version"</strong> → <strong>Deploy</strong></li>
          <li><strong>5.</strong> {isEnvMode
            ? 'Cập nhật biến VITE_GAS_URL trên Vercel → Redeploy'
            : 'Copy URL mới → dán vào ô trên → Kiểm tra → Lưu URL'}
          </li>
        </ol>
        <div className="mt-3 text-xs text-amber-600 bg-amber-100 rounded-lg p-2">
          ⚠️ Nếu kiểm tra thấy <code>uploadFile: ❌</code> → GAS vẫn đang chạy version cũ. Phải chọn <strong>"New version"</strong>, không phải "Latest code".
        </div>
      </div>
    </div>
  );
};
