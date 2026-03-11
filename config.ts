// ═══════════════════════════════════════════════════════════════
//  GeoTask Pro — Cấu hình trung tâm
//
//  Thứ tự ưu tiên khi lấy GAS URL:
//    1. Biến môi trường VITE_GAS_URL (Vercel / CI/CD) ← ưu tiên nhất
//    2. localStorage (admin đổi thủ công qua trang Cài đặt)
//    3. DEFAULT_GAS_URL hardcode làm fallback cuối cùng
// ═══════════════════════════════════════════════════════════════

const LS_GAS_URL = 'geotask_gas_url';

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec';

/** URL đến từ biến môi trường (build-time, Vercel). Undefined nếu chưa cấu hình. */
export const ENV_GAS_URL: string | undefined =
  import.meta.env.VITE_GAS_URL || undefined;

/**
 * Lấy GAS URL theo thứ tự ưu tiên:
 *   VITE_GAS_URL (env)  >  localStorage  >  DEFAULT hardcode
 *
 * Mọi hàm gọi API đều dùng hàm này — không hardcode URL ở bất kỳ chỗ nào khác.
 */
export function getGasUrl(): string {
  return (
    ENV_GAS_URL ||
    localStorage.getItem(LS_GAS_URL) ||
    DEFAULT_GAS_URL
  );
}

/**
 * Lưu URL thủ công vào localStorage.
 * Chỉ có hiệu lực khi VITE_GAS_URL KHÔNG được cấu hình trong env.
 */
export function setGasUrl(url: string): void {
  localStorage.setItem(LS_GAS_URL, url.trim());
}

/** Xoá URL thủ công khỏi localStorage, trả về DEFAULT hoặc ENV. */
export function resetGasUrl(): void {
  localStorage.removeItem(LS_GAS_URL);
}

// Backward-compat export (một số nơi import trực tiếp)
export const GAS_URL = DEFAULT_GAS_URL;
