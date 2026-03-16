// ═══════════════════════════════════════════════════════════════
//  GeoTask Pro — Cấu hình trung tâm
// ═══════════════════════════════════════════════════════════════

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwrizAcOq1WFJN5iForRBStQfl14kO5E-ALs_1kgnn1kZRUjSseeBmU-B2_CGbjRPVdXA/exec';

/** URL từ biến môi trường Vercel (undefined nếu chưa cấu hình). */
export const ENV_GAS_URL: string | undefined = undefined;

/**
 * Lấy GAS URL — hardcode theo yêu cầu.
 * Mọi fetch đều gọi hàm này.
 */
export function getGasUrl(): string {
  return DEFAULT_GAS_URL;
}

/**
 * Lưu URL vào localStorage (đã vô hiệu hóa do hardcode).
 */
export function setGasUrl(url: string): void {
  // Không làm gì cả vì đã hardcode
}

/** Xóa URL đã lưu khỏi cả hai key (đã vô hiệu hóa do hardcode). */
export function resetGasUrl(): void {
  // Không làm gì cả vì đã hardcode
}

// Backward-compat
export const GAS_URL = DEFAULT_GAS_URL;
