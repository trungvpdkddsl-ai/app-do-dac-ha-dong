import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, RefreshCw, Save, Wifi, WifiOff } from 'lucide-react';
import { getGasUrl, setGasUrl, resetGasUrl } from '../config';

export const GasSettings: React.FC = () => {
  const [inputUrl, setInputUrl]     = useState('');
  const [status,   setStatus]       = useState<'idle'|'testing'|'ok'|'fail'>('idle');
  const [message,  setMessage]      = useState('');
  const [saved,    setSaved]        = useState(false);
  const [gasInfo,  setGasInfo]      = useState<Record<string,unknown> | null>(null);

  useEffect(() => { setInputUrl(getGasUrl()); }, []);

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

  const handleSave = () => {
    const url = inputUrl.trim();
    if (!url.startsWith('https://script.google.com/macros/s/')) {
      setStatus('fail');
      setMessage('❌ URL không hợp lệ. Phải bắt đầu bằng https://script.google.com/macros/s/');
      return;
    }
    setGasUrl(url);
    setSaved(true);
    setMessage('✅ Đã lưu GAS URL. Thử kết nối để xác nhận.');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetGasUrl();
    setInputUrl(getGasUrl());
    setStatus('idle'); setMessage(''); setGasInfo(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-xl"><Settings size={22} className="text-indigo-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cài đặt kết nối</h1>
          <p className="text-sm text-slate-500">Cấu hình Google Apps Script URL</p>
        </div>
      </div>

      {/* GAS URL Config */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <Wifi size={16} /> Google Apps Script URL
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Sau khi deploy GAS mới, dán URL vào đây và nhấn Lưu — không cần rebuild app.
        </p>

        <div className="space-y-3">
          <textarea
            value={inputUrl}
            onChange={e => { setInputUrl(e.target.value); setStatus('idle'); setMessage(''); }}
            rows={3}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => testUrl(inputUrl)}
              disabled={status === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={status === 'testing' ? 'animate-spin' : ''} />
              Kiểm tra kết nối
            </button>

            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors ${saved ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              <Save size={14} />
              {saved ? 'Đã lưu!' : 'Lưu URL'}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl border border-red-200 transition-colors"
            >
              <XCircle size={14} /> Reset về mặc định
            </button>
          </div>

          {/* Status message */}
          {message && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
              status === 'ok'   ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              status === 'fail' ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {status === 'ok'   && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
              {status === 'fail' && <WifiOff      size={16} className="shrink-0 mt-0.5" />}
              {status === 'testing' && <RefreshCw size={16} className="animate-spin shrink-0 mt-0.5" />}
              <span>{message}</span>
            </div>
          )}

          {/* GAS info box */}
          {gasInfo && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-600 border border-slate-200">
              <div className="font-semibold text-slate-700 mb-1">Chi tiết GAS:</div>
              {Object.entries(gasInfo).map(([k,v]) => (
                <div key={k}><span className="text-indigo-600">{k}</span>: {String(v)}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hướng dẫn re-deploy */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-semibold text-amber-800 mb-3">📋 Hướng dẫn re-deploy GAS khi bị lỗi upload</h3>
        <ol className="text-sm text-amber-700 space-y-2">
          <li><strong>1.</strong> Mở <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="underline">script.google.com</a> → chọn project GeoTask Pro</li>
          <li><strong>2.</strong> Dán toàn bộ nội dung <code className="bg-amber-100 px-1 rounded">Code.gs</code> mới vào editor → <strong>Ctrl+S</strong> để lưu</li>
          <li><strong>3.</strong> Nhấn <strong>Deploy → Manage deployments</strong></li>
          <li><strong>4.</strong> Nhấn <strong>✏️ Edit</strong> → Version: chọn <strong>"New version"</strong> → <strong>Deploy</strong></li>
          <li><strong>5.</strong> Copy URL mới → dán vào ô trên → <strong>Kiểm tra kết nối</strong> → <strong>Lưu URL</strong></li>
        </ol>
        <div className="mt-3 text-xs text-amber-600 bg-amber-100 rounded-lg p-2">
          ⚠️ Nếu kiểm tra thấy <code>uploadFile: ❌</code> → GAS vẫn đang chạy version cũ. Phải chọn <strong>"New version"</strong> khi deploy, không phải "Latest code".
        </div>
      </div>
    </div>
  );
};
