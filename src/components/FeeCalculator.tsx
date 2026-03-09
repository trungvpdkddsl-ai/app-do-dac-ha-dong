import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';

type LandType = {
  label: string;
  baseRate: number;   // đ/m²
  minFee: number;     // đ
  notes: string;
};

const LAND_TYPES: Record<string, LandType> = {
  'ODT': { label: 'Đất ở đô thị (ODT)',         baseRate: 700,  minFee: 1_500_000, notes: 'Áp dụng khu vực đô thị' },
  'ONT': { label: 'Đất ở nông thôn (ONT)',        baseRate: 450,  minFee: 800_000,  notes: 'Áp dụng khu vực nông thôn' },
  'CLN': { label: 'Đất cây lâu năm (CLN)',        baseRate: 300,  minFee: 600_000,  notes: 'Vườn, rừng trồng' },
  'LUC': { label: 'Đất lúa (LUC)',                baseRate: 250,  minFee: 500_000,  notes: 'Ruộng, đất trồng lúa' },
  'NTS': { label: 'Đất nuôi trồng thủy sản',      baseRate: 280,  minFee: 550_000,  notes: 'Ao, hồ, đầm' },
  'SKC': { label: 'Đất sản xuất kinh doanh',      baseRate: 600,  minFee: 1_200_000,notes: 'Khu CN, thương mại' },
  'DGT': { label: 'Đất giao thông (DGT)',          baseRate: 200,  minFee: 400_000,  notes: 'Đường, ngõ hẻm' },
  'CSD': { label: 'Đất chưa sử dụng (CSD)',        baseRate: 150,  minFee: 300_000,  notes: 'Đất trống, hoang hóa' },
};

const PROCEDURE_MULTIPLIER: Record<string, { label: string; mult: number }> = {
  'trich_do':   { label: 'Trích đo địa chính',     mult: 1.0  },
  'cap_lan_dau':{ label: 'Cấp lần đầu',             mult: 1.3  },
  'cap_doi':    { label: 'Cấp đổi',                 mult: 1.1  },
  'tach_thua':  { label: 'Tách thửa',               mult: 1.2  },
  'dinh_chinh': { label: 'Đính chính',               mult: 0.8  },
  'thua_ke':    { label: 'Thừa kế / Tặng cho',      mult: 1.0  },
  'chuyen_nhuong':{ label: 'Chuyển nhượng',          mult: 1.0  },
};

const COMPLEXITY: Record<string, { label: string; mult: number }> = {
  'binh_thuong': { label: 'Bình thường',  mult: 1.0 },
  'phuc_tap':    { label: 'Phức tạp',     mult: 1.3 },
  'rat_phuc_tap':{ label: 'Rất phức tạp', mult: 1.6 },
};

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export const FeeCalculator: React.FC = () => {
  const [landType,   setLandType]   = useState('ODT');
  const [area,       setArea]       = useState('');
  const [procedure,  setProcedure]  = useState('trich_do');
  const [complexity, setComplexity] = useState('binh_thuong');
  const [manualRate, setManualRate] = useState('');
  const [useManual,  setUseManual]  = useState(false);
  const [result,     setResult]     = useState<{ base: number; final: number; vat: number; total: number } | null>(null);

  useEffect(() => {
    calculate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landType, area, procedure, complexity, manualRate, useManual]);

  const calculate = () => {
    const a = parseFloat(area);
    if (!a || a <= 0) { setResult(null); return; }

    const lt  = LAND_TYPES[landType];
    const pm  = PROCEDURE_MULTIPLIER[procedure].mult;
    const cm  = COMPLEXITY[complexity].mult;
    const rate = useManual && parseFloat(manualRate) > 0 ? parseFloat(manualRate) : lt.baseRate;

    const base  = Math.max(a * rate * pm * cm, lt.minFee);
    const vat   = base * 0.1;
    const total = base + vat;
    setResult({ base, final: base, vat, total });
  };

  const reset = () => {
    setArea(''); setManualRate(''); setUseManual(false);
    setLandType('ODT'); setProcedure('trich_do'); setComplexity('binh_thuong');
    setResult(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calculator size={24} className="text-indigo-600" /> Tính tiền trích đo
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Tính phí đo đạc địa chính theo loại đất, diện tích và loại thủ tục.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Loại đất */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loại đất <span className="text-red-500">*</span></label>
            <select value={landType} onChange={e => setLandType(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white">
              {Object.entries(LAND_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">{LAND_TYPES[landType].notes} · Đơn giá gốc: {formatVND(LAND_TYPES[landType].baseRate)}/m²</p>
          </div>

          {/* Diện tích */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Diện tích (m²) <span className="text-red-500">*</span></label>
            <input
              type="number" min="0" step="0.1" value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="Ví dụ: 120.5"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Loại thủ tục */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loại thủ tục</label>
            <select value={procedure} onChange={e => setProcedure(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              {Object.entries(PROCEDURE_MULTIPLIER).map(([k, v]) => (
                <option key={k} value={k}>{v.label} (×{v.mult})</option>
              ))}
            </select>
          </div>

          {/* Mức độ phức tạp */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mức độ phức tạp</label>
            <div className="flex gap-2">
              {Object.entries(COMPLEXITY).map(([k, v]) => (
                <button key={k} onClick={() => setComplexity(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    complexity === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
                  }`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Đơn giá tùy chỉnh */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              <input type="checkbox" checked={useManual} onChange={e => setUseManual(e.target.checked)} className="mr-2" />
              Đơn giá tùy chỉnh (đ/m²)
            </label>
            <input
              type="number" min="0" value={manualRate}
              onChange={e => setManualRate(e.target.value)}
              disabled={!useManual}
              placeholder={`Mặc định: ${LAND_TYPES[landType].baseRate}`}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-sm transition-colors">
            <RotateCcw size={14} /> Đặt lại
          </button>
        </div>
      </div>

      {/* Kết quả */}
      {result ? (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="text-sm font-semibold text-indigo-200 mb-4 uppercase tracking-wider">Kết quả tính toán</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-indigo-200 text-sm">Phí cơ bản</span>
              <span className="font-semibold">{formatVND(result.base)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-indigo-200 text-sm">VAT (10%)</span>
              <span className="font-semibold">{formatVND(result.vat)}</span>
            </div>
            <div className="border-t border-indigo-500 pt-3 flex justify-between items-center">
              <span className="text-white font-bold text-lg">Tổng cộng</span>
              <span className="text-2xl font-bold text-white">{formatVND(result.total)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-500 grid grid-cols-2 gap-3 text-xs text-indigo-200">
            <div>Loại đất: <span className="text-white font-medium">{LAND_TYPES[landType].label}</span></div>
            <div>Diện tích: <span className="text-white font-medium">{area} m²</span></div>
            <div>Thủ tục: <span className="text-white font-medium">{PROCEDURE_MULTIPLIER[procedure].label}</span></div>
            <div>Mức phức tạp: <span className="text-white font-medium">{COMPLEXITY[complexity].label}</span></div>
          </div>
          <p className="text-xs text-indigo-300 mt-4 italic">* Phí tham khảo, có thể thay đổi theo thực tế và quy định địa phương.</p>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
          <Calculator size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Nhập diện tích để xem kết quả tự động.</p>
        </div>
      )}
    </div>
  );
};
