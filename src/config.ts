// ═══════════════════════════════════════════════════════════════
//  GeoTask Pro — Cấu hình trung tâm
//
//  Thứ tự ưu tiên khi lấy GAS URL:
//    1. VITE_GAS_URL  — biến môi trường Vercel (build-time)
//    2. GAS_URL       — lưu cố định qua trang Cài đặt (localStorage)
//    3. geotask_gas_url — key cũ (backward compat)
//    4. DEFAULT_GAS_URL — hardcode fallback cuối cùng
// ═══════════════════════════════════════════════════════════════

const LS_KEY_PRIMARY = 'GAS_URL';          // key mới — "Lưu cố định kết nối"
const LS_KEY_LEGACY  = 'geotask_gas_url';  // key cũ — backward compat

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec';

/** URL từ biến môi trường Vercel (undefined nếu chưa cấu hình). */
export const ENV_GAS_URL: string | undefined =
  import.meta.env.VITE_GAS_URL || undefined;

/**
 * Lấy GAS URL — ưu tiên env → localStorage(GAS_URL) → localStorage(legacy) → default.
 * Mọi fetch đều gọi hàm này, không hardcode URL ở nơi nào khác.
 */
export function getGasUrl(): string {
  return (
    ENV_GAS_URL ||
    localStorage.getItem(LS_KEY_PRIMARY) ||
    localStorage.getItem(LS_KEY_LEGACY)  ||
    DEFAULT_GAS_URL
  );
}

/**
 * Lưu URL vào localStorage (cả key mới và key legacy để đồng bộ).
 * Không xóa bất kỳ key nào khác.
 */
export function setGasUrl(url: string): void {
  const trimmed = url.trim();
  localStorage.setItem(LS_KEY_PRIMARY, trimmed);
  localStorage.setItem(LS_KEY_LEGACY,  trimmed);
}

/** Xóa URL đã lưu khỏi cả hai key. */
export function resetGasUrl(): void {
  localStorage.removeItem(LS_KEY_PRIMARY);
  localStorage.removeItem(LS_KEY_LEGACY);
}

// Backward-compat
export const GAS_URL = DEFAULT_GAS_URL;
