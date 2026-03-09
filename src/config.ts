// ═══════════════════════════════════════════════════════════════
//  GeoTask Pro — Cấu hình trung tâm
//  GAS_URL được lưu trong localStorage để admin có thể đổi
//  ngay trong app mà không cần rebuild
// ═══════════════════════════════════════════════════════════════

const LS_GAS_URL = 'geotask_gas_url';

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzbayeVspw9tXM838hvuUwhQKF09I3wOJYHya5EPdJ9lBk46XjRiz1KXSP4ANXEbcLr/exec';

export function getGasUrl(): string {
  return localStorage.getItem(LS_GAS_URL) || DEFAULT_GAS_URL;
}

export function setGasUrl(url: string): void {
  localStorage.setItem(LS_GAS_URL, url.trim());
}

export function resetGasUrl(): void {
  localStorage.removeItem(LS_GAS_URL);
}

// Backward-compat — dùng như cũ nhưng luôn đọc từ localStorage
export const GAS_URL = DEFAULT_GAS_URL;
