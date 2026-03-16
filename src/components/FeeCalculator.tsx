import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Calculator, Printer, RotateCcw, MapPin, Mountain, Scissors,
  Receipt, BadgePercent, ChevronRight, CheckCircle2, Building2,
  Trees, Info, Plus, Trash2, FolderOpen, Save, X, TrendingUp,
  AlertCircle, FileText, User, ChevronsUpDown,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ProjectFinancials } from '../types';

// ════════════════════════════════════════════════════════════════
//  BẢNG GIÁ TRÍCH ĐO ĐỊA CHÍNH
// ════════════════════════════════════════════════════════════════
type PriceTier = { label: string; maxArea: number; rural: number; urban: number };
const PRICE_TIERS: PriceTier[] = [
  { label: 'Dưới 100 m²',               maxArea: 100,     rural: 1_629_000,  urban: 2_438_000  },
  { label: 'Từ 100 m² đến 300 m²',      maxArea: 300,     rural: 1_935_000,  urban: 2_895_000  },
  { label: 'Từ 301 m² đến 500 m²',      maxArea: 500,     rural: 2_058_000,  urban: 3_069_000  },
  { label: 'Từ 501 m² đến 1.000 m²',    maxArea: 1_000,   rural: 2_506_000,  urban: 3_758_000  },
  { label: 'Từ 1.001 m² đến 3.000 m²',  maxArea: 3_000,   rural: 3_433_000,  urban: 5_159_000  },
  { label: 'Từ 3.001 m² đến 10.000 m²', maxArea: 10_000,  rural: 5_296_000,  urban: 7_923_000  },
  { label: 'Từ 1 ha đến 10 ha',          maxArea: 100_000, rural: 6_355_000,  urban: 9_508_000  },
  { label: 'Từ 10 ha đến 50 ha',         maxArea: 500_000, rural: 6_884_000,  urban: 10_300_000 },
];
const TERRAIN_OPTIONS = [
  { value: 1.0, label: 'Bình thường',           desc: 'Địa hình bằng phẳng'              },
  { value: 1.2, label: 'Địa hình khó ×1.2',     desc: 'Đồi núi, vùng sâu vùng xa'        },
  { value: 1.3, label: 'Địa hình rất khó ×1.3', desc: 'Vùng núi cao, biên giới, hải đảo' },
];

// ════════════════════════════════════════════════════════════════
//  TIỆN ÍCH
// ════════════════════════════════════════════════════════════════
function getTier(area: number): PriceTier | null {
  if (!area || area <= 0) return null;
  return PRICE_TIERS.find(t => area <= t.maxArea) ?? PRICE_TIERS[PRICE_TIERS.length - 1];
}
const fmt    = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const fmtVND = (n: number) => fmt(n) + ' đ';

// ─── Đọc số thành chữ tiếng Việt ─────────────────────────────
const CH_DON  = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const CH_CHUC = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];

function readGroup(n: number, isFirst: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const d = n % 10;
  let s = '';
  if (h > 0)           s += CH_DON[h] + ' trăm';
  if (t === 0 && d === 0) return s.trim();
  if (t === 0 && d > 0)   { s += (h > 0 || !isFirst ? ' lẻ ' : '') + CH_DON[d]; return s.trim(); }
  if (t === 1)             { s += ' mười' + (d > 0 ? ' ' + (d === 5 ? 'lăm' : CH_DON[d]) : ''); return s.trim(); }
  s += ' ' + CH_CHUC[t];
  if (d === 1) s += ' mốt';
  else if (d === 4 && t > 0) s += ' tư';
  else if (d === 5 && t > 0) s += ' lăm';
  else if (d > 0) s += ' ' + CH_DON[d];
  return s.trim();
}

export function numberToVietnameseWords(n: number): string {
  if (n === 0) return 'không đồng';
  if (!isFinite(n) || isNaN(n)) return '';
  const num = Math.round(Math.abs(n));
  const ty   = Math.floor(num / 1_000_000_000);
  const tr   = Math.floor((num % 1_000_000_000) / 1_000_000);
  const ngh  = Math.floor((num % 1_000_000) / 1_000);
  const don  = num % 1_000;
  const parts: string[] = [];
  if (ty  > 0) parts.push(readGroup(ty,  parts.length === 0) + ' tỷ');
  if (tr  > 0) parts.push(readGroup(tr,  parts.length === 0) + ' triệu');
  if (ngh > 0) parts.push(readGroup(ngh, parts.length === 0) + ' nghìn');
  if (don > 0) parts.push(readGroup(don, parts.length === 0));
  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

// ─── Plot type ────────────────────────────────────────────────
type Plot = { id: string; area: string; label: string };
let _pid = 1;
const mkPlot = (lbl?: string): Plot => ({ id: `p-${_pid++}`, area: '', label: lbl ?? `Thửa ${_pid - 1}` });

// ─── Buyer info type ──────────────────────────────────────────
type BuyerInfo = {
  buyerName:    string;
  companyName:  string;
  address:      string;
  taxCode:      string;
  paymentMethod:string;
};

// ════════════════════════════════════════════════════════════════
//  COMPONENT CHÍNH
// ════════════════════════════════════════════════════════════════
export const FeeCalculator: React.FC = () => {
  const { projects, updateProjectInfo } = useAppContext();

  // ── Project selector (creatable) ─────────────────────────────
  const [projectQuery,   setProjectQuery]   = useState('');
  const [projectDisplay, setProjectDisplay] = useState('');
  const [selectedProjId, setSelectedProjId] = useState('');
  const [showProjDrop,   setShowProjDrop]   = useState(false);
  const projRef = useRef<HTMLDivElement>(null);

  const filteredProjects = useMemo(() =>
    projects.filter(p =>
      p.status !== 'completed' &&
      (p.name.toLowerCase().includes(projectQuery.toLowerCase()) ||
       p.client.toLowerCase().includes(projectQuery.toLowerCase()) ||
       p.code.toLowerCase().includes(projectQuery.toLowerCase()))
    ), [projects, projectQuery]);

  const selectedProject = projects.find(p => p.id === selectedProjId) ?? null;

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (projRef.current && !projRef.current.contains(e.target as Node))
        setShowProjDrop(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Plots ─────────────────────────────────────────────────────
  const [plots,   setPlots]   = useState<Plot[]>([mkPlot('Thửa 1')]);
  const [isSplit, setIsSplit] = useState(false);

  const addPlot    = () => setPlots(p => [...p, mkPlot(`Thửa ${p.length + 1}`)]);
  const removePlot = (id: string) => setPlots(p => p.length > 1 ? p.filter(x => x.id !== id) : p);
  const setArea    = (id: string, v: string) => setPlots(p => p.map(x => x.id===id ? {...x,area:v} : x));
  const setLbl     = (id: string, v: string) => setPlots(p => p.map(x => x.id===id ? {...x,label:v}: x));

  const toggleSplit = (on: boolean) => {
    setIsSplit(on);
    if (!on) setPlots(p => [{ ...p[0] }]);
  };

  // ── Config ────────────────────────────────────────────────────
  const [landType, setLandType] = useState<'urban'|'rural'>('urban');
  const [terrain,  setTerrain]  = useState(1.0);
  const [withVAT,  setWithVAT]  = useState(true);
  const [ctvPct,   setCtvPct]   = useState('20');

  // ── Buyer info ────────────────────────────────────────────────
  const [buyer, setBuyer] = useState<BuyerInfo>({
    buyerName: '', companyName: '', address: '', taxCode: '', paymentMethod: 'TM/CK',
  });
  const setBuyerField = (k: keyof BuyerInfo, v: string) =>
    setBuyer(b => ({ ...b, [k]: v }));

  // ── Toast / save ──────────────────────────────────────────────
  const [toast,  setToast]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), ok ? 4000 : 3500);
  };

  // ── Invoice meta ──────────────────────────────────────────────
  const invoiceNo = useRef(`HD-${Date.now().toString().slice(-6)}`).current;
  const todayFull = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const todayDMY  = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ── Realtime calc -> Manual calc ─────────────────────────────
  const [calc, setCalc] = useState<{
    vp: { plot: Plot; area: number; tier: PriceTier; basePrice: number }[];
    totalBase: number;
    subtotal: number;
    vatAmount: number;
    total: number;
    ctvN: number;
    ctvAmount: number;
    netRevenue: number;
  } | null>(null);

  const handleCalculate = useCallback(() => {
    type VP = { plot: Plot; area: number; tier: PriceTier; basePrice: number };
    const vp: VP[] = [];
    for (const pl of plots) {
      const a = parseFloat(pl.area);
      if (!a || a <= 0) continue;
      const tier = getTier(a); if (!tier) continue;
      vp.push({ plot: pl, area: a, tier, basePrice: landType==='urban' ? tier.urban : tier.rural });
    }
    if (!vp.length) {
      setCalc(null);
      return;
    }
    const totalBase  = vp.reduce((s, p) => s + p.basePrice, 0);
    const subtotal   = totalBase * terrain;
    const vatAmount  = withVAT ? subtotal * 0.10 : 0;
    const total      = subtotal + vatAmount;
    const ctvN       = Math.max(0, Math.min(100, parseFloat(ctvPct) || 0));
    const ctvAmount  = total * (ctvN / 100);
    const netRevenue = total - ctvAmount - vatAmount;
    setCalc({ vp, totalBase, subtotal, vatAmount, total, ctvN, ctvAmount, netRevenue });
  }, [plots, landType, terrain, withVAT, ctvPct]);

  // ── Lưu doanh thu ────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!selectedProject) return showToast(false, '⚠️ Vui lòng chọn dự án trước khi lưu!');
    if (!calc)             return showToast(false, '⚠️ Chưa có dữ liệu tính toán.');
    setSaving(true);
    try {
      const fin: ProjectFinancials = {
        savedAt: new Date().toISOString(), invoiceNo,
        plots: calc.vp.map(p => ({
          label: p.plot.label, area: p.area, tierLabel: p.tier.label,
          basePrice: p.basePrice, amount: p.basePrice * terrain,
        })),
        landType, terrain, isSplit,
        totalBase: calc.totalBase, subtotal: calc.subtotal,
        vatAmount: calc.vatAmount, total: calc.total,
        ctvPct: calc.ctvN, ctvAmount: calc.ctvAmount, netRevenue: calc.netRevenue,
      };
      await updateProjectInfo(selectedProject.id, { financials: fin });
      showToast(true, `✅ Đã lưu doanh thu vào dự án "${selectedProject.name}"`);
    } catch {
      showToast(false, '❌ Lỗi khi lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }, [selectedProject, calc, terrain, landType, isSplit, invoiceNo, updateProjectInfo]);

  const handleReset = () => {
    setPlots([mkPlot('Thửa 1')]); setIsSplit(false);
    setLandType('urban'); setTerrain(1.0); setWithVAT(true); setCtvPct('20');
    setProjectDisplay(''); setProjectQuery(''); setSelectedProjId('');
    setBuyer({ buyerName:'', companyName:'', address:'', taxCode:'', paymentMethod:'TM/CK' });
    setCalc(null);
  };

  // ── Chữ số tiền bằng chữ ─────────────────────────────────────
  const amountInWords = calc ? numberToVietnameseWords(calc.total) : '';

  // ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══ PRINT STYLES ═════════════════════════════════════════ */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #vat-invoice-print, #vat-invoice-print * { visibility: visible !important; }
          #vat-invoice-print {
            position: fixed !important; inset: 0 !important;
            width: 210mm !important; min-height: 297mm !important;
            padding: 12mm 14mm !important;
            background: #fff !important; color: #000 !important;
            font-size: 11pt !important;
            box-shadow: none !important; border: none !important;
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
        .fsl { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing:.05em; display:block; margin-bottom:6px; }
        .fi  { width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:10px; font-size:13px; outline:none; background:white; transition:border-color .15s,box-shadow .15s; }
        .fi:focus { border-color:#818cf8; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        /* Print invoice styles */
        #vat-invoice-print table { border-collapse: collapse; width: 100%; }
        #vat-invoice-print td, #vat-invoice-print th { border: 1px solid #333; padding: 4px 6px; }
        #vat-invoice-print .no-border td, #vat-invoice-print .no-border th { border: none; }
      `}</style>

      {/* ══ TOAST ════════════════════════════════════════════════ */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${toast.ok ? 'bg-emerald-700 border-emerald-600' : 'bg-red-700 border-red-600'} text-white`}>
            {toast.ok ? <CheckCircle2 size={17} className="shrink-0"/> : <AlertCircle size={17} className="shrink-0"/>}
            <span className="text-sm font-medium flex-1 leading-snug">{toast.msg}</span>
            <button onClick={()=>setToast(null)} className="opacity-60 hover:opacity-100"><X size={14}/></button>
          </div>
        </div>
      )}

      <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-slate-50">

        {/* ══ PANEL TRÁI — Form nhập liệu ══════════════════════ */}
        <div className="lg:w-[440px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white no-print">

          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl"><Calculator size={17} className="text-white"/></div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Tính tiền trích đo</h1>
                <p className="text-[10px] text-slate-400">Bảng giá địa chính + Xuất hóa đơn VAT</p>
              </div>
            </div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Nhập lại"><RotateCcw size={14}/></button>
          </div>

          <div className="px-5 py-4 space-y-5">

            {/* ─ 1. Chọn / nhập dự án (Creatable) ─ */}
            <section>
              <label className="fsl flex items-center gap-1.5"><FolderOpen size={12} className="text-indigo-500"/> Thuộc dự án / Hồ sơ</label>
              <div className="relative" ref={projRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={projectDisplay}
                    onChange={e => {
                      setProjectDisplay(e.target.value);
                      setProjectQuery(e.target.value);
                      setSelectedProjId('');
                      setShowProjDrop(true);
                    }}
                    onFocus={() => { setProjectQuery(projectDisplay); setShowProjDrop(true); }}
                    placeholder="Gõ tên dự án hoặc chọn từ danh sách..."
                    className="fi pr-9 text-sm"
                  />
                  <ChevronsUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                </div>

                {/* Dropdown */}
                {showProjDrop && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                    {filteredProjects.length === 0 && (
                      <div className="px-4 py-3 text-xs text-slate-400 italic">
                        {projectDisplay ? `Dùng tên mới: "${projectDisplay}"` : 'Không có dự án phù hợp'}
                      </div>
                    )}
                    {filteredProjects.map(p => (
                      <button key={p.id}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
                        onClick={() => {
                          setSelectedProjId(p.id);
                          setProjectDisplay(`${p.code} · ${p.name}`);
                          setShowProjDrop(false);
                          // Auto-fill buyer info từ project nếu có
                          if (p.client) setBuyerField('buyerName', p.client);
                          if (p.location) setBuyerField('address', p.location);
                          if (p.phone) setBuyerField('buyerName', p.client);
                        }}>
                        <div className="text-xs font-bold text-indigo-700">{p.code}</div>
                        <div className="text-sm text-slate-700 leading-tight">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.client} · {p.location}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProject?.financials && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600">
                  <Info size={11}/> Dự án này đã có dữ liệu doanh thu được lưu trước đó.
                </div>
              )}
            </section>

            {/* ─ 2. Loại đất ─ */}
            <section>
              <label className="fsl flex items-center gap-1.5"><MapPin size={12} className="text-indigo-500"/> Loại đất</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v:'urban' as const, label:'Đất đô thị',       Icon:Building2, sel:'border-indigo-500 bg-indigo-50 text-indigo-700' },
                  { v:'rural' as const, label:'Đất ngoài đô thị', Icon:Trees,     sel:'border-emerald-500 bg-emerald-50 text-emerald-700' },
                ]).map(({v,label,Icon,sel})=>(
                  <button key={v} onClick={()=>setLandType(v)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${landType===v ? sel : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}>
                    <Icon size={14}/><span className="flex-1 text-left">{label}</span>
                    {landType===v && <CheckCircle2 size={13} className="shrink-0"/>}
                  </button>
                ))}
              </div>
            </section>

            {/* ─ 3. Thửa đất ─ */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label className="fsl mb-0 flex items-center gap-1.5"><MapPin size={12} className="text-indigo-500"/> Diện tích thửa đất</label>
                <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer text-[11px] font-bold transition-all select-none ${isSplit ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'}`}>
                  <input type="checkbox" checked={isSplit} onChange={e=>toggleSplit(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5"/>
                  <Scissors size={11}/> Tách thửa
                </label>
              </div>

              {/* Chế độ thường: chỉ 1 ô */}
              {!isSplit ? (
                <div className={`rounded-xl border p-3 transition-all ${
                  (()=>{const a=parseFloat(plots[0].area);return a>0&&getTier(a);})()
                    ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="relative">
                    <input type="number" min="1" value={plots[0].area}
                      onChange={e=>setArea(plots[0].id, e.target.value)}
                      placeholder="Nhập diện tích..."
                      className="fi pr-10 text-base font-semibold py-2"/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">m²</span>
                  </div>
                  {(()=>{
                    const a=parseFloat(plots[0].area);
                    const t=a>0?getTier(a):null;
                    const p=t?(landType==='urban'?t.urban:t.rural):null;
                    return t&&p!==null ? (
                      <div className="flex items-center justify-between mt-2 text-[11px] px-1">
                        <span className="text-indigo-500 font-medium flex items-center gap-1"><Info size={10}/>{t.label}</span>
                        <span className="text-indigo-700 font-black">→ {fmtVND(p)}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                // Chế độ tách thửa: danh sách
                <div className="space-y-2">
                  {plots.map((plot, idx) => {
                    const a=parseFloat(plot.area);
                    const tier=a>0?getTier(a):null;
                    const price=tier?(landType==='urban'?tier.urban:tier.rural):null;
                    return (
                      <div key={plot.id} className={`rounded-xl border p-3 transition-all ${tier?'border-indigo-200 bg-indigo-50/30':'border-slate-200 bg-white'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <input type="text" value={plot.label} onChange={e=>setLbl(plot.id,e.target.value)}
                            className="fi text-xs font-bold py-1.5 px-2 w-[84px] shrink-0"/>
                          <div className="relative flex-1">
                            <input type="number" min="1" value={plot.area} onChange={e=>setArea(plot.id,e.target.value)}
                              placeholder="Diện tích..." className="fi pr-10 text-sm font-semibold py-1.5"/>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">m²</span>
                          </div>
                          {idx > 0 && (
                            <button onClick={()=>removePlot(plot.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={14}/></button>
                          )}
                        </div>
                        {tier && price!==null && (
                          <div className="flex items-center justify-between text-[11px] px-1">
                            <span className="text-indigo-500 font-medium">{tier.label}</span>
                            <span className="text-indigo-700 font-black">→ {fmtVND(price)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={addPlot} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50 rounded-xl text-sm font-semibold transition-all">
                    <Plus size={14}/> Thêm thửa mới
                  </button>
                  <p className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-700">
                    💡 Mỗi thửa tra bảng giá riêng. Tổng = Σ đơn giá các thửa × hệ số địa hình.
                  </p>
                </div>
              )}
            </section>

            {/* ─ 4. Hệ số địa hình ─ */}
            <section>
              <label className="fsl flex items-center gap-1.5"><Mountain size={12} className="text-indigo-500"/> Hệ số địa hình</label>
              <div className="space-y-1.5">
                {TERRAIN_OPTIONS.map(opt=>(
                  <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${terrain===opt.value?'border-violet-400 bg-violet-50 text-violet-800':'border-slate-200 hover:border-slate-300 bg-white text-slate-700'}`}>
                    <input type="radio" name="terrain" checked={terrain===opt.value} onChange={()=>setTerrain(opt.value)} className="accent-violet-600"/>
                    <div className="flex-1">
                      <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.desc}</div>
                    </div>
                    {terrain===opt.value&&opt.value>1 && <span className="px-1.5 py-0.5 bg-violet-200 text-violet-800 text-[10px] font-black rounded-full">×{opt.value}</span>}
                  </label>
                ))}
              </div>
            </section>

            {/* ─ 5. Thuế & CTV ─ */}
            <section>
              <label className="fsl flex items-center gap-1.5"><Receipt size={12} className="text-indigo-500"/> Thuế & Chi phí</label>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${withVAT?'border-blue-400 bg-blue-50':'border-slate-200 bg-white'}`}>
                  <input type="checkbox" checked={withVAT} onChange={e=>setWithVAT(e.target.checked)} className="accent-blue-600 w-4 h-4"/>
                  <div>
                    <div className={`text-xs font-bold ${withVAT?'text-blue-800':'text-slate-700'}`}>Bao gồm thuế VAT 10%</div>
                    <div className="text-[10px] text-slate-400">Theo quy định hiện hành</div>
                  </div>
                </label>
                <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BadgePercent size={12} className="text-rose-500"/>
                    <span className="text-xs font-bold text-slate-700">Tỉ lệ chi CTV (%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="100" value={ctvPct} onChange={e=>setCtvPct(e.target.value)} className="fi w-20 text-center text-sm font-black py-1.5"/>
                    <span className="text-xs text-slate-400">% / tổng thanh toán</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ─ 6. Thông tin xuất hóa đơn ─ */}
            <section>
              <label className="fsl flex items-center gap-1.5"><FileText size={12} className="text-indigo-500"/> Thông tin xuất hóa đơn</label>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Họ tên người mua hàng</label>
                  <input type="text" value={buyer.buyerName} onChange={e=>setBuyerField('buyerName',e.target.value)}
                    placeholder="Nguyễn Văn A" className="fi text-sm"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tên đơn vị / Công ty</label>
                  <input type="text" value={buyer.companyName} onChange={e=>setBuyerField('companyName',e.target.value)}
                    placeholder="Công ty TNHH..." className="fi text-sm"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Địa chỉ</label>
                  <input type="text" value={buyer.address} onChange={e=>setBuyerField('address',e.target.value)}
                    placeholder="Số nhà, đường, phường/xã..." className="fi text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Mã số thuế</label>
                    <input type="text" value={buyer.taxCode} onChange={e=>setBuyerField('taxCode',e.target.value)}
                      placeholder="0123456789" className="fi text-sm"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Hình thức TT</label>
                    <input type="text" value={buyer.paymentMethod} onChange={e=>setBuyerField('paymentMethod',e.target.value)}
                      placeholder="TM/CK" className="fi text-sm"/>
                  </div>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1 pl-1">
                <Info size={10}/> Các trường có thể bỏ trống — sẽ hiển thị trên hóa đơn in.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={handleCalculate}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <Calculator size={24} />
                TÍNH TIỀN
              </button>
            </div>
          </div>
        </div>

        {/* ══ PANEL PHẢI — Preview & Buttons ═════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">

          {/* ── Preview nhanh (chỉ hiện trên màn hình, không in) ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto overflow-hidden no-print mb-5">

            {/* Header preview */}
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 px-7 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator size={14} className="opacity-70"/>
                    <span className="text-[10px] font-black tracking-[.15em] opacity-70 uppercase">Báo Giá · Preview</span>
                  </div>
                  <h2 className="text-lg font-bold leading-tight">Trích Đo Địa Chính</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">Số: {invoiceNo} · {todayFull}</p>
                </div>
                {selectedProject && (
                  <div className="shrink-0 px-3 py-1.5 bg-white/15 rounded-xl text-right">
                    <p className="text-[10px] text-indigo-200">Dự án</p>
                    <p className="text-xs font-black">{selectedProject.code}</p>
                    <p className="text-[10px] text-indigo-200 mt-0.5 max-w-[120px] truncate">{selectedProject.name}</p>
                  </div>
                )}
              </div>
              {/* Buyer quick preview */}
              {(buyer.buyerName || buyer.companyName) && (
                <div className="mt-3 pt-3 border-t border-white/20 text-xs">
                  <span className="opacity-60">Khách hàng: </span>
                  <span className="font-bold">{buyer.buyerName || buyer.companyName}</span>
                  {buyer.address && <><span className="opacity-60"> · Địa chỉ: </span><span>{buyer.address}</span></>}
                </div>
              )}
            </div>

            {!calc ? (
              <div className="py-12 text-center text-slate-400">
                <Calculator size={36} className="mx-auto mb-3 opacity-10"/>
                <p className="text-sm font-medium">Nhập diện tích để xem kết quả</p>
              </div>
            ) : (
              <div className="px-7 py-5">
                {/* Bảng thửa */}
                <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-xs" style={{borderCollapse:'separate'}}>
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">Thửa</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-bold">Diện tích</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-bold hidden sm:table-cell">Mức</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-bold">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calc.vp.map((p,i)=>(
                        <tr key={p.plot.id} className={i%2===0?'bg-white':'bg-slate-50/50'}>
                          <td className="px-3 py-2.5 font-bold text-slate-700">{p.plot.label}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{fmt(p.area)} m²</td>
                          <td className="px-3 py-2.5 text-right text-slate-400 hidden sm:table-cell text-[10px]">{p.tier.label}</td>
                          <td className="px-3 py-2.5 text-right font-black text-indigo-700">{fmtVND(p.basePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {calc.vp.length>1 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-100">
                          <td colSpan={2} className="px-3 py-2 font-black text-slate-700">Cộng ({calc.vp.length} thửa)</td>
                          <td className="px-3 py-2 hidden sm:table-cell"></td>
                          <td className="px-3 py-2 text-right font-black text-slate-900 text-sm">{fmtVND(calc.totalBase)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {terrain > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl mb-3 text-sm">
                    <span className="text-violet-700 font-semibold flex items-center gap-1.5"><Mountain size={13}/> Hệ số ×{terrain}</span>
                    <span className="font-black text-violet-800">{fmtVND(calc.subtotal)}</span>
                  </div>
                )}

                {/* Totals */}
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Thành tiền (trước thuế)</span>
                    <span className="font-black text-slate-900">{fmtVND(calc.subtotal)}</span>
                  </div>
                  {withVAT && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <span className="text-sm text-blue-600 flex items-center gap-1"><Receipt size={13}/> VAT 10%</span>
                      <span className="font-bold text-blue-600">+ {fmtVND(calc.vatAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-4 bg-indigo-700 text-white">
                    <span className="font-black text-base">Tổng khách thanh toán</span>
                    <span className="text-2xl font-black">{fmtVND(calc.total)}</span>
                  </div>
                </div>

                {/* Chữ */}
                <div className="mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-xs text-amber-700 font-semibold">Bằng chữ: </span>
                  <span className="text-xs text-amber-800 italic">{amountInWords}</span>
                </div>

                {/* Phân chia nội bộ */}
                {calc.ctvN > 0 && (
                  <div className="mt-3 rounded-xl border border-dashed border-rose-200 overflow-hidden">
                    <div className="px-4 py-2 bg-rose-50 border-b border-dashed border-rose-200 flex items-center gap-2">
                      <TrendingUp size={12} className="text-rose-500"/>
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Nội bộ — không in</span>
                    </div>
                    <div className="divide-y divide-rose-100/60 text-sm">
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-rose-700">Chi CTV ({calc.ctvN}%)</span>
                        <span className="font-black text-rose-700">− {fmtVND(calc.ctvAmount)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Thuế VAT</span>
                        <span className="font-semibold text-slate-500">− {fmtVND(calc.vatAmount)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-3 bg-emerald-50">
                        <span className="font-black text-slate-800 flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-600"/> Doanh thu thực tế</span>
                        <span className="text-lg font-black text-emerald-700">{fmtVND(calc.netRevenue)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-[10px] text-slate-400 leading-relaxed pt-3 border-t border-slate-100">
                  * Báo giá theo bảng đơn giá trích đo địa chính hiện hành.<br/>
                  * Hiệu lực 30 ngày kể từ ngày lập. Chưa bao gồm chi phí đi lại phát sinh.
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="px-7 pb-6 space-y-2.5">
              {calc ? (
                <>
                  <button onClick={()=>window.print()}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-indigo-200">
                    <Printer size={15}/> In Hóa Đơn GTGT / Xuất PDF
                    <ChevronRight size={13} className="opacity-50"/>
                  </button>
                  <button onClick={doSave} disabled={saving}
                    className="w-full flex items-center justify-center gap-2.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-[.98] text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 text-sm">
                    {saving
                      ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Đang lưu...</>
                      : <><Save size={15}/> Lưu Doanh Thu vào Dự Án</>}
                  </button>
                  {!selectedProjId && (
                    <p className="text-center text-[11px] text-amber-600 flex items-center justify-center gap-1">
                      <AlertCircle size={11}/> Chọn dự án để lưu doanh thu
                    </p>
                  )}
                </>
              ) : (
                <p className="text-center text-xs text-slate-400 py-1">Điền thông tin bên trái để tạo báo giá</p>
              )}
            </div>
          </div>

          {/* Bảng giá tham khảo */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bảng đơn giá tham khảo</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 text-slate-500 font-bold">Mức diện tích</th>
                  <th className="text-right px-4 py-2 text-slate-500 font-bold">Ngoài đô thị</th>
                  <th className="text-right px-4 py-2 text-slate-500 font-bold">Đô thị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PRICE_TIERS.map((tier,i)=>{
                  const active=calc?.vp.some(p=>p.tier===tier);
                  return (
                    <tr key={i} className={active?'bg-indigo-50':'hover:bg-slate-50 transition-colors'}>
                      <td className={`px-4 py-2 ${active?'text-indigo-700 font-black':'text-slate-600'}`}>{active&&'▶ '}{tier.label}</td>
                      <td className={`px-4 py-2 text-right ${active&&landType==='rural'?'text-indigo-700 font-black':'text-slate-700'}`}>{fmt(tier.rural)}</td>
                      <td className={`px-4 py-2 text-right ${active&&landType==='urban'?'text-indigo-700 font-black':'text-slate-700'}`}>{fmt(tier.urban)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          HÓA ĐƠN GTGT — CHỈ HIỂN THỊ KHI IN
          ══════════════════════════════════════════════════════════ */}
      <div id="vat-invoice-print" style={{display:'none'}}>
        <InvoicePrintTemplate
          invoiceNo={invoiceNo}
          todayDMY={todayDMY}
          buyer={buyer}
          calc={calc}
          withVAT={withVAT}
          amountInWords={amountInWords}
          isSplit={isSplit}
          landType={landType}
        />
      </div>
    </>
  );
};

// ════════════════════════════════════════════════════════════════
//  TEMPLATE HÓA ĐƠN GTGT IN
// ════════════════════════════════════════════════════════════════
type InvoiceProps = {
  invoiceNo:      string;
  todayDMY:       string;
  buyer:          BuyerInfo;
  calc:           {
    vp:         { plot: { label: string }; area: number; tier: PriceTier; basePrice: number }[];
    subtotal:   number;
    vatAmount:  number;
    total:      number;
  } | null;
  withVAT:        boolean;
  amountInWords:  string;
  isSplit:        boolean;
  landType:       'urban'|'rural';
};

const SELLER_NAME    = 'CÔNG TY CỔ PHẦN KHẢO SÁT VÀ ĐO ĐẠC HÀ ĐÔNG';
const SELLER_TAX     = '0100109896';
const SELLER_ADDRESS = 'Số 10 Quang Trung, Hà Đông, Hà Nội';
const SELLER_BANK    = '---';
const SERVICE_DESC   = 'Phí dịch vụ đo đạc, trích đo, xác định ranh giới đất';
const SERVICE_UNIT   = 'trích đo';

const InvoicePrintTemplate: React.FC<InvoiceProps> = ({
  invoiceNo, todayDMY, buyer, calc, withVAT, amountInWords,
}) => {
  const [dd, mm, yyyy] = todayDMY.split('/');
  const subtotal  = calc?.subtotal ?? 0;
  const vatAmount = withVAT ? (calc?.vatAmount ?? 0) : 0;
  const total     = calc?.total ?? 0;

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', color: '#000', background: '#fff', padding: '12mm 14mm', minHeight: '297mm', boxSizing: 'border-box', position: 'relative' }}>

      {/* Viền hoa văn ngoài */}
      <div style={{ border: '3px double #1a5276', padding: '6pt', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ border: '1px solid #1a5276', padding: '8pt', minHeight: 'calc(297mm - 36pt)', boxSizing: 'border-box' }}>

        {/* ─ Header ─ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8pt' }}>
          <tbody>
            <tr>
              {/* Logo / Tên công ty bán */}
              <td style={{ width: '38%', verticalAlign: 'top', borderBottom: 'none', padding: '0 8pt 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8pt', marginBottom: '4pt' }}>
                  {/* Triangle logo */}
                  <div style={{
                    width: 0, height: 0,
                    borderLeft: '18pt solid transparent',
                    borderRight: '18pt solid transparent',
                    borderBottom: '36pt solid #1a5276',
                    position: 'relative', flexShrink: 0,
                  }}/>
                  <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#1a5276', lineHeight: 1.3 }}>{SELLER_NAME}</div>
                </div>
              </td>

              {/* Tiêu đề chính giữa */}
              <td style={{ textAlign: 'center', verticalAlign: 'top', borderBottom: 'none', padding: '0' }}>
                <div style={{ fontSize: '16pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5pt', marginBottom: '2pt' }}>
                  Hóa đơn giá trị gia tăng
                </div>
                <div style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: '4pt' }}>(VAT Invoice)</div>
                <div style={{ fontSize: '8.5pt', fontStyle: 'italic', marginBottom: '2pt' }}>(Bản thể hiện của hóa đơn điện tử)</div>
                <div style={{ fontSize: '8pt', fontStyle: 'italic', color: '#555' }}>(Electronic invoice display)</div>
              </td>

              {/* Ký hiệu / Số */}
              <td style={{ width: '22%', textAlign: 'right', verticalAlign: 'top', borderBottom: 'none', fontSize: '9pt' }}>
                <div>Ký hiệu <em>(Serial No)</em>: <strong>HD25TTD</strong></div>
                <div style={{ marginTop: '4pt' }}>Số <em>(No.)</em>: <strong>{invoiceNo}</strong></div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Ngày tháng năm */}
        <div style={{ textAlign: 'center', fontSize: '10pt', marginBottom: '6pt' }}>
          Ngày <strong>{dd}</strong> tháng <strong>{mm}</strong> năm <strong>{yyyy}</strong>
        </div>

        {/* Mã CQT */}
        <div style={{ textAlign: 'center', fontSize: '9pt', fontWeight: 'bold', marginBottom: '8pt', color: '#1a5276' }}>
          Mã của cơ quan thuế: <span style={{ letterSpacing: '0.5pt' }}>HD25TTD{invoiceNo}HDDATCTY</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '6pt 0' }}/>

        {/* ─ Thông tin người bán ─ */}
        <div style={{ fontSize: '10pt', lineHeight: 1.7, marginBottom: '6pt' }}>
          <div>Đơn vị bán hàng <em>(Seller)</em>: <strong>{SELLER_NAME}</strong></div>
          <div>Mã số thuế <em>(Tax code)</em>: <strong style={{ color: '#c0392b' }}>{SELLER_TAX}</strong></div>
          <div>Địa chỉ <em>(Address)</em>: {SELLER_ADDRESS}</div>
          <div>Số tài khoản <em>(A/C No)</em>: {SELLER_BANK}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '6pt 0' }}/>

        {/* ─ Thông tin người mua ─ */}
        <div style={{ fontSize: '10pt', lineHeight: 1.9, marginBottom: '6pt' }}>
          <div>
            Họ tên người mua hàng <em>(Buyer's fullname)</em>:{' '}
            <strong style={{ color: buyer.buyerName ? '#1a5276' : '#aaa' }}>
              {buyer.buyerName || '___________________________________'}
            </strong>
          </div>
          <div>
            Tên đơn vị <em>(Company's name)</em>:{' '}
            <strong style={{ color: buyer.companyName ? '#1a5276' : '#aaa' }}>
              {buyer.companyName || '___________________________________'}
            </strong>
          </div>
          <div>
            Địa chỉ <em>(Address)</em>:{' '}
            <span style={{ color: buyer.address ? '#1a5276' : '#aaa' }}>
              {buyer.address || '___________________________________'}
            </span>
          </div>
          <div>
            Mã số thuế <em>(Tax code)</em>:{' '}
            <span style={{ color: buyer.taxCode ? '#1a5276' : '#aaa', fontWeight: 'bold' }}>
              {buyer.taxCode || '___________'}
            </span>
          </div>
          <div>
            Hình thức thanh toán <em>(Payment method)</em>:{' '}
            <strong>{buyer.paymentMethod || 'TM/CK'}</strong>
          </div>
        </div>

        {/* ─ Bảng dịch vụ ─ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '4pt' }}>
          <thead>
            <tr style={{ background: '#f0f4f8' }}>
              <th style={{ border: '1px solid #333', padding: '5pt 4pt', width: '6%', textAlign: 'center' }}>STT<br/><em style={{fontSize:'8pt'}}>(No.)</em></th>
              <th style={{ border: '1px solid #333', padding: '5pt 4pt', textAlign: 'center' }}>Tên hàng hóa, dịch vụ<br/><em style={{fontSize:'8pt'}}>(Description)</em></th>
              <th style={{ border: '1px solid #333', padding: '5pt 4pt', width: '11%', textAlign: 'center' }}>Đơn vị tính<br/><em style={{fontSize:'8pt'}}>(Unit)</em></th>
              <th style={{ border: '1px solid #333', padding: '5pt 4pt', width: '10%', textAlign: 'center' }}>Số lượng<br/><em style={{fontSize:'8pt'}}>(Quantity)</em></th>
              <th style={{ border: '1px solid #333', padding: '5pt 4pt', width: '16%', textAlign: 'center' }}>Đơn giá<br/><em style={{fontSize:'8pt'}}>(Unit price)</em></th>
              <th style={{ border: '1px solid #333', padding: '5pt 4pt', width: '16%', textAlign: 'center' }}>Thành tiền<br/><em style={{fontSize:'8pt'}}>(Amount)</em></th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 'bold', color: '#1a5276' }}>
              <td style={{ border: '1px solid #333', padding: '5pt 4pt', textAlign: 'center' }}>1</td>
              <td style={{ border: '1px solid #333', padding: '5pt 4pt' }}>
                {SERVICE_DESC}
                {/* Nếu tách thửa: liệt kê thửa nhỏ */}
                {calc && calc.vp.length > 1 && (
                  <div style={{ fontSize: '8pt', color: '#555', fontWeight: 'normal', marginTop: '3pt' }}>
                    {calc.vp.map(p => (
                      <span key={p.plot.label} style={{ display: 'block' }}>
                        · {p.plot.label}: {fmt(p.area)} m² — {fmtVND(p.basePrice)}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td style={{ border: '1px solid #333', padding: '5pt 4pt', textAlign: 'center' }}>{SERVICE_UNIT}</td>
              <td style={{ border: '1px solid #333', padding: '5pt 4pt', textAlign: 'center' }}>1</td>
              <td style={{ border: '1px solid #333', padding: '5pt 4pt', textAlign: 'right' }}>{fmt(subtotal)}</td>
              <td style={{ border: '1px solid #333', padding: '5pt 4pt', textAlign: 'right' }}>{fmt(subtotal)}</td>
            </tr>
            {/* 5 dòng trống */}
            {Array.from({length:5}).map((_,i)=>(
              <tr key={i}>
                <td style={{border:'1px solid #333',padding:'12pt 4pt'}}></td>
                <td style={{border:'1px solid #333',padding:'12pt 4pt'}}></td>
                <td style={{border:'1px solid #333',padding:'12pt 4pt'}}></td>
                <td style={{border:'1px solid #333',padding:'12pt 4pt'}}></td>
                <td style={{border:'1px solid #333',padding:'12pt 4pt'}}></td>
                <td style={{border:'1px solid #333',padding:'12pt 4pt'}}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ─ Tổng kết ─ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <tbody>
            <tr>
              <td colSpan={4} style={{ border: '1px solid #333', padding: '4pt 6pt', textAlign: 'right', fontWeight: 'normal' }}>
                Cộng tiền hàng <em>(Total amount)</em>:
              </td>
              <td style={{ border: '1px solid #333', padding: '4pt 8pt', textAlign: 'right', fontWeight: 'bold', width: '22%', color: '#c0392b' }}>
                {fmt(subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ border: '1px solid #333', padding: '4pt 6pt', width: '30%' }}>
                Thuế suất GTGT <em>(VAT rate)</em>: <strong>{withVAT ? '10%' : '0%'}</strong>
              </td>
              <td colSpan={2} style={{ border: '1px solid #333', padding: '4pt 6pt', textAlign: 'right' }}>
                Tiền thuế GTGT <em>(VAT amount)</em>:
              </td>
              <td style={{ border: '1px solid #333', padding: '4pt 8pt', textAlign: 'right', fontWeight: 'bold', color: '#c0392b' }}>
                {fmt(vatAmount)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ border: '1px solid #333', padding: '5pt 6pt', textAlign: 'right', fontWeight: 'bold' }}>
                Tổng cộng tiền thanh toán <em>(Total payment)</em>:
              </td>
              <td style={{ border: '1px solid #333', padding: '5pt 8pt', textAlign: 'right', fontWeight: 'bold', fontSize: '11pt', color: '#c0392b' }}>
                {fmt(total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Số tiền bằng chữ */}
        <div style={{ fontSize: '9.5pt', marginTop: '6pt', marginBottom: '14pt', padding: '5pt 8pt', border: '1px solid #333', background: '#fafafa' }}>
          <strong>Số tiền viết bằng chữ <em>(In words)</em>:</strong>{' '}
          <span style={{ fontStyle: 'italic' }}>{amountInWords}</span>
        </div>

        {/* ─ Chữ ký ─ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '8pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', textAlign: 'center', border: 'none', verticalAlign: 'top', paddingTop: '4pt' }}>
                <div style={{ fontWeight: 'bold' }}>Người mua hàng <em>(Buyer)</em></div>
                <div style={{ fontStyle: 'italic', fontSize: '9pt', color: '#555' }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ fontStyle: 'italic', fontSize: '9pt', color: '#555' }}><em>(Sign, Fullname)</em></div>
                <div style={{ marginTop: '40pt', borderTop: '1px solid #999', width: '60%', margin: '50pt auto 0' }}></div>
              </td>
              <td style={{ width: '50%', textAlign: 'center', border: 'none', verticalAlign: 'top', paddingTop: '4pt' }}>
                <div style={{ fontWeight: 'bold' }}>Người bán hàng <em>(Seller)</em></div>
                <div style={{ fontStyle: 'italic', fontSize: '9pt', color: '#555' }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ fontStyle: 'italic', fontSize: '9pt', color: '#555' }}><em>(Sign, Fullname)</em></div>

                {/* Khung chữ ký số — màu xanh lá */}
                <div style={{
                  marginTop: '12pt',
                  border: '2px solid #27ae60',
                  padding: '8pt 10pt',
                  borderRadius: '4pt',
                  background: '#f0fff4',
                  display: 'inline-block',
                  textAlign: 'left',
                  minWidth: '200pt',
                }}>
                  <div style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '9.5pt', marginBottom: '3pt' }}>
                    ✓ Signature valid
                  </div>
                  <div style={{ fontSize: '8.5pt', color: '#1e8449', fontWeight: 'bold', marginBottom: '2pt' }}>
                    Được ký bởi: {SELLER_NAME}
                  </div>
                  <div style={{ fontSize: '8.5pt', color: '#27ae60' }}>
                    Ngày ký: {todayDMY} {new Date().toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '18pt', borderTop: '1px solid #ccc', paddingTop: '6pt', textAlign: 'center', fontSize: '8pt', color: '#777', fontStyle: 'italic' }}>
          Tra cứu hóa đơn tại website: https://tracuuhoadon.minvoice.com.vn/ &nbsp;|&nbsp;
          Khởi tạo từ phần mềm GeoTask Pro · {SELLER_NAME} · MST: {SELLER_TAX}
        </div>

      </div>
      </div>
    </div>
  );
};
