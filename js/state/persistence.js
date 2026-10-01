import { GAME_CONFIG } from "../config.js";
import { INGREDIENTS } from "../data/ingredients.js";
import { PRODUCTS } from "../data/products.js";
import { UPGRADES } from "../data/upgrades.js";
import { PRODUCT_UNLOCK_DAYS } from "../data/difficulty.js";
import { createInitialState } from "./initialState.js";

function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function validateSaveSchema(candidate) {
  const stockIsValid = candidate?.stock && typeof candidate.stock === "object" &&
    INGREDIENTS.every(({ id }) => Object.hasOwn(candidate.stock, id)) &&
    Object.values(candidate.stock).every((item) => item && Number.isFinite(item.quantity) && item.quantity >= 0 && Array.isArray(item.batches) && item.batches.every((batch) => Number.isFinite(batch.quantity) && batch.quantity >= 0 && Number.isInteger(batch.boughtDay) && Number.isInteger(batch.expireDay) && Number.isFinite(batch.unitPrice ?? item.purchasePrice)) &&
      Math.abs(item.batches.reduce((sum, batch) => sum + batch.quantity, 0) - item.quantity) < 0.001);
  const pricesAreValid = candidate?.sellPrices && typeof candidate.sellPrices === "object" &&
    PRODUCTS.every(({ id }) => Number.isFinite(candidate.sellPrices[id]) && candidate.sellPrices[id] >= 0) &&
    Object.values(candidate.sellPrices).every((price) => Number.isFinite(price) && price >= 0);
  return Boolean(
    candidate &&
    typeof candidate === "object" &&
    candidate.version === GAME_CONFIG.STATE_VERSION &&
    Number.isFinite(candidate.money) &&
    Number.isInteger(candidate.day) &&
    candidate.day >= 1 &&
    stockIsValid &&
    pricesAreValid &&
    candidate.upgrades && typeof candidate.upgrades === "object" &&
    UPGRADES.every(({ id }) => (id === "onlineChannel" && candidate.upgrades[id] === undefined) || (Number.isInteger(candidate.upgrades[id]) && candidate.upgrades[id] >= 0)) &&
    Array.isArray(candidate.unlockedItems) &&
    Array.isArray(candidate.employees) &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.history) &&
    Array.isArray(candidate.orders) &&
    Array.isArray(candidate.customers) &&
    Array.isArray(candidate.onlineOrders) &&
    candidate.dailyStats && typeof candidate.dailyStats === "object" &&
    candidate.settings && typeof candidate.settings === "object" &&
    candidate.gameplay && typeof candidate.gameplay === "object" &&
    candidate.miniGames && typeof candidate.miniGames === "object" &&
    candidate.miniGames.bauCua && candidate.miniGames.xiDach
  );
}

export function saveGame(state) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(GAME_CONFIG.STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("Không thể lưu trò chơi trên thiết bị này.", error);
    return false;
  }
}

export function loadGame() {
  const storage = getStorage();
  if (!storage) return createInitialState();
  try {
    const raw = storage.getItem(GAME_CONFIG.STORAGE_KEY) ?? storage.getItem(GAME_CONFIG.LEGACY_STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (validateSaveSchema(parsed)) {
      if (typeof parsed.tutorialCompleted !== "boolean") {
        parsed.tutorialCompleted = true;
        saveGame(parsed);
      }
      for (const upgrade of UPGRADES) parsed.upgrades[upgrade.id] ??= 0;
      parsed.tutorialSellingCompleted ??= Boolean(parsed.sellingTutorialCompleted);
      return parsed;
    }
    const migrated = migrateLegacySave(parsed);
    if (migrated) {
      saveGame(migrated);
      return migrated;
    }
  } catch (error) {
    console.warn("Tệp lưu bị lỗi; tạo trò chơi mới.", error);
  }
  return createInitialState();
}

function migrateLegacySave(candidate) {
  if (!candidate || typeof candidate !== "object" || candidate.version >= GAME_CONFIG.STATE_VERSION || !Number.isFinite(candidate.money) || !Number.isInteger(candidate.day)) return null;
  const migrated = createInitialState();
  migrated.tutorialCompleted = true;
  migrated.money = Math.max(0, candidate.money);
  migrated.day = Math.max(1, candidate.day);
  migrated.unlockedItems = Object.entries(PRODUCT_UNLOCK_DAYS).filter(([, unlockDay]) => unlockDay <= migrated.day).map(([id]) => id);
  migrated.settings = {
    ...migrated.settings,
    music: typeof candidate.settings?.music === "boolean" ? candidate.settings.music : migrated.settings.music,
    sound: typeof candidate.settings?.sound === "boolean" ? candidate.settings.sound : migrated.settings.sound,
  };
  for (const upgrade of UPGRADES) {
    const savedLevel = candidate.upgrades?.[upgrade.id];
    if (Number.isInteger(savedLevel)) migrated.upgrades[upgrade.id] = Math.max(0, Math.min(upgrade.maxLevel, savedLevel));
  }
  migrated.employees = Array.isArray(candidate.employees)
    ? candidate.employees.filter((employee) => ["counter", "barista", "mixer", "online"].includes(employee?.role)).map((employee) => {
      const role = employee.role === "barista" ? "mixer" : employee.role;
      return {
        ...employee,
        role,
        name: { counter: "Nhân viên sơ chế", mixer: "Nhân viên trộn", online: "Nhân viên giao đơn online" }[role],
      };
    })
    : [];
  if (candidate.miniGames?.bauCua && candidate.miniGames?.xiDach) migrated.miniGames = candidate.miniGames;
  migrated.migrationNotice = "Game đã được cập nhật sang Tiệm Bánh Tráng Trộn. Dữ liệu phiên bản cũ không tương thích; tiền, ngày và một số nâng cấp đã được giữ lại, kho và đơn hàng đã làm mới.";
  return migrated;
}

export function resetGame() {
  const freshState = createInitialState();
  saveGame(freshState);
  return freshState;
}
