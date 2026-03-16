// ═══════════════════════════════════════════════════════════════
//  GeoTask Pro — Cấu hình trung tâm
// ═══════════════════════════════════════════════════════════════

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwrizAcOq1WFJN5iForRBStQfl14kO5E-ALs_1kgnn1kZRUjSseeBmU-B2_CGbjRPVdXA/exec';

/** URL từ biến môi trường Vercel (undefined nếu chưa cấu hình). */
export const ENV_GAS_URL: string | undefined = undefined;

/**
 * Lấy GAS URL:
 * 1. Ưu tiên biến môi trường Vercel (nếu có)
 * 2. Ưu tiên localStorage (nếu người dùng đã lưu)
 * 3. Dùng URL mặc định
 */
export function getGasUrl(): string {
  if (ENV_GAS_URL) return ENV_GAS_URL;
  try {
    const saved = localStorage.getItem('GAS_URL');
    if (saved) return saved;
  } catch { /* ignore */ }
  return DEFAULT_GAS_URL;
}

/**
 * Lưu URL vào localStorage.
 */
export function setGasUrl(url: string): void {
  try {
    localStorage.setItem('GAS_URL', url);
  } catch { /* ignore */ }
}

/** Xóa URL đã lưu. */
export function resetGasUrl(): void {
  try {
    localStorage.removeItem('GAS_URL');
  } catch { /* ignore */ }
}

// Backward-compat
export const GAS_URL = DEFAULT_GAS_URL;
