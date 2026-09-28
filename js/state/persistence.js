import { GAME_CONFIG } from "../config.js";
import { INGREDIENTS } from "../data/ingredients.js";
import { PRODUCTS } from "../data/products.js";
import { UPGRADES } from "../data/upgrades.js";
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
    UPGRADES.every(({ id }) => Number.isInteger(candidate.upgrades[id]) && candidate.upgrades[id] >= 0) &&
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
    candidate.noodleBranch && typeof candidate.noodleBranch === "object" &&
    candidate.noodleBranch.sellPrices && typeof candidate.noodleBranch.sellPrices === "object" &&
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
    const raw = storage.getItem(GAME_CONFIG.STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (validateSaveSchema(parsed)) return parsed;
    const migrated = migrateVersionOneSave(parsed);
    if (migrated) {
      saveGame(migrated);
      return migrated;
    }
  } catch (error) {
    console.warn("Tệp lưu bị lỗi; tạo trò chơi mới.", error);
  }
  return createInitialState();
}

function migrateVersionOneSave(candidate) {
  if (!candidate || candidate.version !== 1 || !Number.isFinite(candidate.money) || !Number.isInteger(candidate.day) || !candidate.stock || !Array.isArray(candidate.reviews)) return null;
  const defaults = createInitialState();
  const stock = Object.fromEntries(Object.entries(defaults.stock).map(([ingredientId, fallback]) => {
    const previous = candidate.stock[ingredientId];
    if (!previous) return [ingredientId, fallback];
    const quantity = Number.isFinite(previous.quantity) ? Math.max(0, previous.quantity) : 0;
    const batches = Array.isArray(previous.batches) && previous.batches.length ? previous.batches : quantity > 0 ? [{
      quantity,
      boughtDay: candidate.day,
      expireDay: candidate.day + fallback.expirationDays,
      unitPrice: previous.purchasePrice ?? fallback.purchasePrice,
    }] : [];
    return [ingredientId, { ...fallback, ...previous, quantity, batches }];
  }));
  const migrated = {
    ...defaults,
    ...candidate,
    version: GAME_CONFIG.STATE_VERSION,
    stock,
    upgrades: { ...defaults.upgrades, ...candidate.upgrades },
    sellPrices: { ...defaults.sellPrices, ...candidate.sellPrices },
    dailyStats: { ...defaults.dailyStats, ...candidate.dailyStats },
    settings: { ...defaults.settings, ...candidate.settings },
    gameplay: { ...defaults.gameplay, ...candidate.gameplay },
    orders: Array.isArray(candidate.orders) ? candidate.orders : [],
    customers: Array.isArray(candidate.customers) ? candidate.customers : [],
    onlineOrders: Array.isArray(candidate.onlineOrders) ? candidate.onlineOrders : [],
    employees: Array.isArray(candidate.employees) ? candidate.employees : [],
    history: Array.isArray(candidate.history) ? candidate.history : [],
    unlockedItems: Array.isArray(candidate.unlockedItems) ? candidate.unlockedItems : defaults.unlockedItems,
    noodleBranch: candidate.noodleBranch ?? defaults.noodleBranch,
    miniGames: candidate.miniGames ?? defaults.miniGames,
  };
  return validateSaveSchema(migrated) ? migrated : null;
}

export function resetGame() {
  const freshState = createInitialState();
  saveGame(freshState);
  return freshState;
}
