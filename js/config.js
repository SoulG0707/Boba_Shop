export const DEBUG = true;

export const GAME_CONFIG = Object.freeze({
  DAY_DURATION_SECONDS: 240,
  CUSTOMER_PATIENCE_MULTIPLIER: 2.5,
  MIX_DURATION_MS: 1_400,
  STORAGE_KEY: "banh-trang-tron-game-save-v1",
  LEGACY_STORAGE_KEY: "tea-shop-game-save-v1",
  STATE_VERSION: 3,
  INITIAL_MONEY: 400_000,
  MAX_REVIEWS: 40,
  MAX_HISTORY_ENTRIES: 80,
  MAX_CUSTOMERS: 8,
  BASE_RENT: 30_000,
  BASE_UTILITIES: 8_000,
  TAX_RATE: 0.05,
  CUSTOMER_SPAWN_INTERVAL_SECONDS: 9,
  ONLINE_SPAWN_INTERVAL_SECONDS: 27,
  MIN_MINIGAME_BET: 5_000,
  MAX_MINIGAME_BET: 100_000,
  MAX_MINIGAME_ROUND_STAKE: 250_000,
});

export const ROUTES = Object.freeze([
  { id: "inventory", label: "Kho", icon: "inventory" },
  { id: "upgrades", label: "Nâng cấp", icon: "upgrades" },
  { id: "prices", label: "Giá bán", icon: "prices" },
  { id: "reviews", label: "Đánh giá", icon: "reviews" },
  { id: "stats", label: "Tổng kết", icon: "stats" },
  { id: "employees", label: "Nhân viên", icon: "employees" },
  { id: "baucua", label: "Bầu Cua", icon: "🎲" },
  { id: "xidach", label: "Xì Dách", icon: "🃏" },
]);

export const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};
