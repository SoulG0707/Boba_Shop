export const DEBUG = true;

export const GAME_CONFIG = Object.freeze({
  DAY_DURATION_SECONDS: 240,
  STORAGE_KEY: "tea-shop-game-save-v1",
  STATE_VERSION: 1,
  INITIAL_MONEY: 400_000,
  MAX_REVIEWS: 40,
  MAX_HISTORY_ENTRIES: 80,
  MAX_CUSTOMERS: 8,
  BASE_RENT: 30_000,
  BASE_UTILITIES: 8_000,
  TAX_RATE: 0.05,
  CUSTOMER_SPAWN_INTERVAL_SECONDS: 9,
  ONLINE_SPAWN_INTERVAL_SECONDS: 27,
});

export const ROUTES = Object.freeze([
  { id: "dashboard", label: "Tổng quan", icon: "🏠" },
  { id: "gameplay", label: "Chuẩn bị", icon: "🧋" },
  { id: "inventory", label: "Kho", icon: "📦" },
  { id: "upgrades", label: "Nâng cấp", icon: "✨" },
  { id: "prices", label: "Giá bán", icon: "🏷️" },
  { id: "reviews", label: "Đánh giá", icon: "⭐" },
  { id: "stats", label: "Thống kê", icon: "📈" },
]);

export const formatMoney = (value) =>
  `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;

export const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};
