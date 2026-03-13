import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calculator, Printer, RotateCcw, MapPin, Mountain,
  Scissors, Receipt, BadgePercent, ChevronRight, CheckCircle2,
  Building2, Trees, Info, Plus, Trash2, FolderOpen,
  Save, X, TrendingUp, AlertCircle,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ProjectFinancials } from '../types';

// ─── Bảng giá trích đo ──────────────────────────────────────────
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

function getTier(area: number): PriceTier | null {
  if (!area || area <= 0) return null;
  return PRICE_TIERS.find(t => area <= t.maxArea) ?? PRICE_TIERS[PRICE_TIERS.length - 1];
}
const fmt    = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const fmtVND = (n: number) => fmt(n) + ' đ';

type Plot = { id: string; area: string; label: string };
let _pid = 1;
const mkPlot = (lbl?: string): Plot => ({ id: `p-${_pid++}`, area: '', label: lbl ?? `Thửa ${_pid - 1}` });

// ════════════════════════════════════════════════════════════════
export const FeeCalculator: React.FC = () => {
  const { projects, updateProjectInfo } = useAppContext();

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [plots,   setPlots]   = useState<Plot[]>([mkPlot('Thửa 1')]);
  const [isSplit, setIsSplit] = useState(false);
  const [landType,setLandType]= useState<'urban'|'rural'>('urban');
  const [terrain, setTerrain] = useState(1.0);
  const [withVAT, setWithVAT] = useState(true);
  const [ctvPct,  setCtvPct]  = useState('20');
  const [toast,   setToast]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving,  setSaving]  = useState(false);

  const invoiceNo = useRef(`BGC-${Date.now().toString().slice(-6)}`).current;
  const today = new Date().toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  // ── Plot CRUD ─────────────────────────────────────────────────
  const addPlot      = () => setPlots(p => [...p, mkPlot(`Thửa ${p.length + 1}`)]);
  const removePlot   = (id: string) => setPlots(p => p.length > 1 ? p.filter(x => x.id !== id) : p);
  const setArea      = (id: string, v: string) => setPlots(p => p.map(x => x.id===id ? {...x,area:v} : x));
  const setLabel     = (id: string, v: string) => setPlots(p => p.map(x => x.id===id ? {...x,label:v}: x));
  const toggleSplit  = (on: boolean) => { setIsSplit(on); if (!on) setPlots(p => [p[0]]); };

  // ── Realtime calc ─────────────────────────────────────────────
  const calc = useMemo(() => {
    type VP = { plot: Plot; area: number; tier: PriceTier; basePrice: number };
    const vp: VP[] = [];
    for (const pl of plots) {
      const a = parseFloat(pl.area);
      if (!a || a <= 0) continue;
      const tier = getTier(a); if (!tier) continue;
      vp.push({ plot: pl, area: a, tier, basePrice: landType==='urban' ? tier.urban : tier.rural });
    }
    if (!vp.length) return null;
    const totalBase = vp.reduce((s,p) => s + p.basePrice, 0);
    const subtotal  = totalBase * terrain;
    const vatAmount = withVAT ? subtotal * 0.10 : 0;
    const total     = subtotal + vatAmount;
    const ctvN      = Math.max(0, Math.min(100, parseFloat(ctvPct)||0));
    const ctvAmount = total * (ctvN / 100);
    const netRevenue= total - ctvAmount - vatAmount;
    return { vp, totalBase, subtotal, vatAmount, total, ctvN, ctvAmount, netRevenue };
  }, [plots, landType, terrain, withVAT, ctvPct]);

  // ── Lưu doanh thu ────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!selectedProject) return setToast({ ok:false, msg:'⚠️ Vui lòng chọn dự án trước khi lưu!' }), setTimeout(()=>setToast(null),3500);
    if (!calc)             return setToast({ ok:false, msg:'⚠️ Chưa có dữ liệu tính toán.' }),         setTimeout(()=>setToast(null),3500);
    setSaving(true);
    try {
      const fin: ProjectFinancials = {
        savedAt: new Date().toISOString(), invoiceNo,
        plots: calc.vp.map(p => ({
          label: p.plot.label, area: p.area, tierLabel: p.tier.label,
          basePrice: p.basePrice, amount: p.basePrice * terrain,
        })),
        landType, terrain, isSplit,
        totalBase:  calc.totalBase,  subtotal:  calc.subtotal,
        vatAmount:  calc.vatAmount,  total:     calc.total,
        ctvPct:     calc.ctvN,       ctvAmount: calc.ctvAmount,
        netRevenue: calc.netRevenue,
      };
      await updateProjectInfo(selectedProject.id, { financials: fin });
      setToast({ ok:true, msg:`✅ Đã lưu doanh thu vào dự án "${selectedProject.name}"` });
      setTimeout(()=>setToast(null), 4000);
    } catch { setToast({ ok:false, msg:'❌ Lỗi khi lưu. Vui lòng thử lại.' }); setTimeout(()=>setToast(null),3500); }
    finally  { setSaving(false); }
  }, [selectedProject, calc, terrain, landType, isSplit, invoiceNo, updateProjectInfo]);

  const handleReset = () => {
    setPlots([mkPlot('Thửa 1')]); setIsSplit(false); setLandType('urban');
    setTerrain(1.0); setWithVAT(true); setCtvPct('20'); setSelectedProjectId('');
  };

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility:hidden!important; }
          #survey-invoice,#survey-invoice * { visibility:visible!important; }
          #survey-invoice { position:fixed!important;inset:0!important;width:100%!important;max-width:100%!important;padding:24px 32px!important;background:#fff!important;font-size:13px!important;box-shadow:none!important;border:none!important; }
          .no-print { display:none!important; }
        }
        .fsl{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;}
        .fi{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:white;transition:border-color .15s,box-shadow .15s;}
        .fi:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(99,102,241,.12);}
      `}</style>

      {/* Toast */}
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

        {/* ═══ PANEL TRÁI ════════════════════════════════════════ */}
        <div className="lg:w-[440px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white no-print">

          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl"><Calculator size={17} className="text-white"/></div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Tính tiền trích đo</h1>
                <p className="text-[10px] text-slate-400">Bảng giá địa chính chuẩn Nhà nước</p>
              </div>
            </div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Nhập lại"><RotateCcw size={14}/></button>
          </div>

          <div className="px-5 py-4 space-y-5">

            {/* 1. Chọn dự án */}
            <section>
              <label className="fsl flex items-center gap-1.5"><FolderOpen size={12} className="text-indigo-500"/> Thuộc dự án / Hồ sơ</label>
              <div className="relative">
                <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} className="fi appearance-none pr-8 text-sm cursor-pointer">
                  <option value="">— Chọn dự án (tùy chọn) —</option>
                  {projects.filter(p=>p.status!=='completed').map(p=>(
                    <option key={p.id} value={p.id}>{p.code} · {p.name} — {p.client}</option>
                  ))}
                </select>
                <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none"/>
              </div>
              {selectedProject && (
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <CheckCircle2 size={12} className="text-indigo-500 shrink-0"/>
                  <span className="text-[11px] text-indigo-700 font-medium">{selectedProject.name}
                    {selectedProject.financials && <span className="ml-1 text-indigo-400 font-normal">(đã lưu doanh thu)</span>}
                  </span>
                </div>
              )}
            </section>

            {/* 2. Loại đất */}
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

            {/* 3. Danh sách thửa */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label className="fsl mb-0 flex items-center gap-1.5"><MapPin size={12} className="text-indigo-500"/> Danh sách thửa đất</label>
                <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer text-[11px] font-bold transition-all ${isSplit ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'}`}>
                  <input type="checkbox" checked={isSplit} onChange={e=>toggleSplit(e.target.checked)} className="accent-orange-500 w-3.5 h-3.5"/>
                  <Scissors size={11}/> Tách thửa
                </label>
              </div>

              <div className="space-y-2">
                {plots.map((plot, idx) => {
                  const a    = parseFloat(plot.area);
                  const tier = a > 0 ? getTier(a) : null;
                  const price= tier ? (landType==='urban' ? tier.urban : tier.rural) : null;
                  return (
                    <div key={plot.id} className={`rounded-xl border p-3 transition-all ${tier ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <input type="text" value={plot.label} onChange={e=>setLabel(plot.id,e.target.value)}
                          className="fi text-xs font-bold py-1.5 px-2 w-[90px] shrink-0"/>
                        <div className="relative flex-1">
                          <input type="number" min="1" value={plot.area} onChange={e=>setArea(plot.id,e.target.value)}
                            placeholder="Diện tích..." className="fi pr-10 text-sm font-semibold py-1.5"/>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">m²</span>
                        </div>
                        {idx > 0 && (
                          <button onClick={()=>removePlot(plot.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                      {tier && price !== null && (
                        <div className="flex items-center justify-between text-[11px] px-1">
                          <span className="text-indigo-500 font-medium flex items-center gap-1"><Info size={10}/>{tier.label}</span>
                          <span className="text-indigo-700 font-black">→ {fmtVND(price)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isSplit && (
                <>
                  <button onClick={addPlot} className="mt-2 w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50 rounded-xl text-sm font-semibold transition-all">
                    <Plus size={14}/> Thêm thửa mới
                  </button>
                  <p className="mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-700">
                    💡 Mỗi thửa tra bảng giá riêng theo diện tích. Tổng = cộng đơn giá tất cả thửa × hệ số địa hình.
                  </p>
                </>
              )}
            </section>

            {/* 4. Hệ số địa hình */}
            <section>
              <label className="fsl flex items-center gap-1.5"><Mountain size={12} className="text-indigo-500"/> Hệ số địa hình</label>
              <div className="space-y-1.5">
                {TERRAIN_OPTIONS.map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${terrain===opt.value ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'}`}>
                    <input type="radio" name="terrain" checked={terrain===opt.value} onChange={()=>setTerrain(opt.value)} className="accent-violet-600"/>
                    <div className="flex-1">
                      <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.desc}</div>
                    </div>
                    {terrain===opt.value && opt.value>1 && <span className="px-1.5 py-0.5 bg-violet-200 text-violet-800 text-[10px] font-black rounded-full">×{opt.value}</span>}
                  </label>
                ))}
              </div>
            </section>

            {/* 5. Thuế & CTV */}
            <section>
              <label className="fsl flex items-center gap-1.5"><Receipt size={12} className="text-indigo-500"/> Thuế & Chi phí</label>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${withVAT ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <input type="checkbox" checked={withVAT} onChange={e=>setWithVAT(e.target.checked)} className="accent-blue-600 w-4 h-4"/>
                  <div>
                    <div className={`text-xs font-bold ${withVAT ? 'text-blue-800' : 'text-slate-700'}`}>Bao gồm thuế VAT 10%</div>
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

          </div>
        </div>

        {/* ═══ PANEL PHẢI ════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">

          <div id="survey-invoice" className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto overflow-hidden">

            {/* Invoice header */}
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 px-7 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator size={14} className="opacity-70"/>
                    <span className="text-[10px] font-black tracking-[.15em] opacity-70 uppercase">Báo Giá</span>
                  </div>
                  <h2 className="text-xl font-bold leading-tight">Trích Đo Địa Chính</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">Số: {invoiceNo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-indigo-200 text-[10px]">Ngày lập</p>
                  <p className="text-sm font-bold">{today}</p>
                  {selectedProject && (
                    <div className="mt-1.5 px-2 py-1 bg-white/15 rounded-lg">
                      <p className="text-[10px] text-indigo-200">Mã HS</p>
                      <p className="text-xs font-black">{selectedProject.code}</p>
                    </div>
                  )}
                </div>
              </div>
              {selectedProject && (
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="opacity-60 text-[10px]">Khách hàng</span><div className="font-bold mt-0.5">{selectedProject.client}</div></div>
                  <div><span className="opacity-60 text-[10px]">Địa điểm</span><div className="font-bold mt-0.5 truncate">{selectedProject.location}</div></div>
                  {selectedProject.procedureType && <div><span className="opacity-60 text-[10px]">Thủ tục</span><div className="font-bold mt-0.5">{selectedProject.procedureType}</div></div>}
                  <div><span className="opacity-60 text-[10px]">Loại đất</span><div className="font-bold mt-0.5">{landType==='urban' ? 'Đất đô thị' : 'Đất ngoài đô thị'}</div></div>
                </div>
              )}
            </div>

            {!calc ? (
              <div className="py-16 text-center text-slate-400">
                <Calculator size={40} className="mx-auto mb-3 opacity-10"/>
                <p className="text-sm font-medium">Nhập diện tích để xem báo giá</p>
                <p className="text-xs mt-1 opacity-50">Kết quả cập nhật tự động theo dữ liệu</p>
              </div>
            ) : (
              <div className="px-7 py-5">

                {/* Bảng chi tiết thửa */}
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Chi tiết từng thửa đất</h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">Thửa</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-bold">Diện tích</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-bold hidden sm:table-cell">Mức giá</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-bold">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calc.vp.map((p,i)=>(
                        <tr key={p.plot.id} className={i%2===0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-3 py-2.5 font-bold text-slate-700">{p.plot.label}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{fmt(p.area)} m²</td>
                          <td className="px-3 py-2.5 text-right text-slate-400 hidden sm:table-cell">{p.tier.label}</td>
                          <td className="px-3 py-2.5 text-right font-black text-indigo-700">{fmtVND(p.basePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {calc.vp.length > 1 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-100">
                          <td colSpan={2} className="px-3 py-2 text-xs font-black text-slate-700">Cộng đơn giá ({calc.vp.length} thửa)</td>
                          <td className="px-3 py-2 hidden sm:table-cell"></td>
                          <td className="px-3 py-2 text-right font-black text-slate-900 text-sm">{fmtVND(calc.totalBase)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Hệ số địa hình */}
                {terrain > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl mb-3">
                    <span className="text-violet-700 flex items-center gap-1.5 text-sm font-semibold"><Mountain size={14}/> Hệ số địa hình ×{terrain}</span>
                    <span className="font-black text-violet-800">{fmtVND(calc.subtotal)}</span>
                  </div>
                )}

                {/* Totals */}
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Thành tiền {isSplit ? `(${calc.vp.length} thửa, sau hệ số)` : ''}</span>
                    <span className="font-black text-slate-900">{fmtVND(calc.subtotal)}</span>
                  </div>
                  {withVAT && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <span className="text-sm text-blue-600 flex items-center gap-1.5"><Receipt size={13}/> VAT 10%</span>
                      <span className="font-bold text-blue-600">+ {fmtVND(calc.vatAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-4 bg-indigo-700 text-white">
                    <span className="font-black text-base">Tổng khách thanh toán</span>
                    <span className="text-2xl font-black tracking-tight">{fmtVND(calc.total)}</span>
                  </div>
                </div>

                {/* Phân chia nội bộ */}
                {calc.ctvN > 0 && (
                  <div className="mt-4 rounded-xl border border-dashed border-rose-200 overflow-hidden no-print">
                    <div className="px-4 py-2 bg-rose-50 border-b border-dashed border-rose-200 flex items-center gap-2">
                      <TrendingUp size={12} className="text-rose-500"/>
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Phân chia nội bộ — không in</span>
                    </div>
                    <div className="divide-y divide-rose-100/60">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-rose-700">Chi CTV ({calc.ctvN}%)</span>
                        <span className="font-black text-rose-700">− {fmtVND(calc.ctvAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-slate-500">Thuế VAT nộp NN</span>
                        <span className="font-semibold text-slate-500">− {fmtVND(calc.vatAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
                        <span className="text-sm font-black text-slate-800 flex items-center gap-1.5"><TrendingUp size={14} className="text-emerald-600"/> Doanh thu thực tế công ty</span>
                        <span className="text-lg font-black text-emerald-700">{fmtVND(calc.netRevenue)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ghi chú */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    * Báo giá theo bảng đơn giá trích đo địa chính hiện hành.<br/>
                    * Chưa bao gồm chi phí đi lại và phụ phí phát sinh (nếu có).<br/>
                    * Hiệu lực báo giá: 30 ngày kể từ ngày lập.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="px-7 pb-6 space-y-2.5 no-print">
              {calc ? (
                <>
                  <button onClick={()=>window.print()}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 active:scale-[.98] text-white font-bold rounded-xl transition-all text-sm">
                    <Printer size={15}/> In Báo Giá / Xuất PDF
                    <ChevronRight size={13} className="opacity-50"/>
                  </button>
                  <button onClick={doSave} disabled={saving}
                    className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-[.98] text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-200 text-sm">
                    {saving
                      ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Đang lưu...</>
                      : <><Save size={16}/> Lưu Doanh Thu vào Dự Án</>
                    }
                  </button>
                  {!selectedProjectId && (
                    <p className="text-center text-[11px] text-amber-600 flex items-center justify-center gap-1">
                      <AlertCircle size={11}/> Chọn dự án bên trái để lưu doanh thu
                    </p>
                  )}
                </>
              ) : (
                <p className="text-center text-xs text-slate-400 py-1">Điền thông tin bên trái để tạo báo giá</p>
              )}
            </div>
          </div>

          {/* Bảng giá tham khảo */}
          <div className="max-w-2xl mx-auto mt-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
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
                  const active = calc?.vp.some(p=>p.tier===tier);
                  return (
                    <tr key={i} className={active ? 'bg-indigo-50' : 'hover:bg-slate-50 transition-colors'}>
                      <td className={`px-4 py-2 ${active ? 'text-indigo-700 font-black' : 'text-slate-600'}`}>
                        {active && '▶ '}{tier.label}
                      </td>
                      <td className={`px-4 py-2 text-right ${active&&landType==='rural' ? 'text-indigo-700 font-black' : 'text-slate-700'}`}>{fmt(tier.rural)}</td>
                      <td className={`px-4 py-2 text-right ${active&&landType==='urban' ? 'text-indigo-700 font-black' : 'text-slate-700'}`}>{fmt(tier.urban)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
};
