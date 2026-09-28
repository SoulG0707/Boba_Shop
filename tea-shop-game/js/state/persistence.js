import { GAME_CONFIG } from "../config.js";
import { createInitialState } from "./initialState.js";

function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function validateSaveSchema(candidate) {
  return Boolean(
    candidate &&
    typeof candidate === "object" &&
    candidate.version === GAME_CONFIG.STATE_VERSION &&
    Number.isFinite(candidate.money) &&
    Number.isInteger(candidate.day) &&
    candidate.day >= 1 &&
    candidate.stock && typeof candidate.stock === "object" &&
    candidate.sellPrices && typeof candidate.sellPrices === "object" &&
    candidate.upgrades && typeof candidate.upgrades === "object" &&
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
    Object.values(candidate.stock).every((item) => item && Number.isFinite(item.quantity) && item.quantity >= 0 && Array.isArray(item.batches) && item.batches.every((batch) => Number.isFinite(batch.quantity) && batch.quantity >= 0 && Number.isInteger(batch.boughtDay) && Number.isInteger(batch.expireDay))),
    Object.values(candidate.sellPrices).every((price) => Number.isFinite(price) && price >= 0),
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
    const raw = storage.getItem(GAME_CONFIG.STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (validateSaveSchema(parsed)) return parsed;
  } catch (error) {
    console.warn("Tệp lưu bị lỗi; tạo trò chơi mới.", error);
  }
  return createInitialState();
}

export function resetGame() {
  const freshState = createInitialState();
  saveGame(freshState);
  return freshState;
}
