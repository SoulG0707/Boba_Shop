import { GAME_CONFIG } from "../config.js";
import { getDifficultyForDay, isOnlineOrderingUnlocked, PRODUCT_UNLOCK_DAYS, randomIntervalMs } from "../data/difficulty.js";
import { createDailyStats, settleDay } from "./economy.js";
import { advanceCustomerQueue, spawnCustomer } from "./customers.js";
import { createOrder } from "./orders.js";
import { spawnOnlineOrder } from "./onlineOrders.js";
import { expireIngredients } from "./inventory.js";
import { startRandomEvent } from "./events.js";
import { getGameplayModifiers } from "./modifiers.js";
import { processEmployeeAutomation } from "./employees.js";
import { addDepartureReview } from "./reviews.js";
import { getShopPreparationStatus } from "./preparation.js";

export function startDay(state, now = Date.now(), random = Math.random) {
  if (state.gameplay.status !== "preparation") return false;
  if (!getShopPreparationStatus(state).canOpen) return false;
  state.orders = state.orders.filter((order) => !["served", "cancelled"].includes(order.status));
  state.customers = [];
  state.onlineOrders = state.onlineOrders.filter((order) => !["served", "cancelled"].includes(order.status));
  state.currentEvent = null;
  state.eventEndsAt = null;
  state.gameplay.status = "running";
  state.gameplay.elapsedMs = 0;
  state.gameplay.lastTickAt = now;
  state.gameplay.customerSpawnAccumulator = 0;
  state.gameplay.onlineSpawnAccumulator = 0;
  const difficulty = getDifficultyForDay(state.day);
  state.gameplay.spawnedCustomersToday = 0;
  state.gameplay.nextCustomerSpawnAtMs = randomIntervalMs(difficulty.firstCustomerDelayMin, difficulty.firstCustomerDelayMax, random);
  state.gameplay.nextOnlineSpawnAtMs = isOnlineOrderingUnlocked(state)
    ? randomIntervalMs(difficulty.onlineIntervalMin, difficulty.onlineIntervalMax, random)
    : 0;
  startRandomEvent(state, now, random);
  return true;
}

export function pauseDay(state, now = Date.now()) {
  if (state.gameplay.status !== "running") return false;
  tickClock(state, now);
  if (state.gameplay.elapsedMs >= GAME_CONFIG.DAY_DURATION_SECONDS * 1000) {
    endDay(state);
    return true;
  }
  if (state.gameplay.status !== "running") return false;
  state.gameplay.status = "paused";
  state.gameplay.lastTickAt = null;
  return true;
}

export function resumeDay(state, now = Date.now()) {
  if (state.gameplay.status !== "paused") return false;
  state.gameplay.status = "running";
  state.gameplay.lastTickAt = now;
  return true;
}

export function getRemainingSeconds(state) {
  const elapsedMs = state.gameplay.elapsedMs;
  return Math.max(0, GAME_CONFIG.DAY_DURATION_SECONDS - elapsedMs / 1000);
}

export function endDay(state) {
  if (state.gameplay.status === "summary") return state.dailyStats;
  state.gameplay.elapsedMs = Math.min(state.gameplay.elapsedMs, GAME_CONFIG.DAY_DURATION_SECONDS * 1000);
  state.gameplay.status = "summary";
  state.gameplay.lastTickAt = null;
  for (const customer of state.customers) {
    const order = state.orders.find((candidate) => candidate.id === customer.orderId);
    if (order && order.status !== "served") {
      order.status = "cancelled";
      addDepartureReview(state, customer, order);
    }
  }
  state.customers = [];
  for (const order of state.onlineOrders) {
    if (!["served", "cancelled"].includes(order.status)) order.status = "cancelled";
  }
  const { loss } = expireIngredients(state, state.day);
  const summary = settleDay(state);
  summary.expiredStockCost = loss;
  state.history.unshift({ day: state.day, ...structuredClone(summary) });
  state.history.length = Math.min(state.history.length, GAME_CONFIG.MAX_HISTORY_ENTRIES);
  state.currentEvent = null;
  state.eventEndsAt = null;
  return summary;
}

export function nextDay(state) {
  if (state.gameplay.status !== "summary") return false;
  state.day += 1;
  for (const [id, unlockDay] of Object.entries(PRODUCT_UNLOCK_DAYS)) {
    if (state.day >= unlockDay && !state.unlockedItems.includes(id)) state.unlockedItems.push(id);
  }
  state.gameplay.status = "preparation";
  state.gameplay.elapsedMs = 0;
  createDailyStats(state);
  return true;
}

export function tickDay(state, now = Date.now(), random = Math.random) {
  if (state.gameplay.status !== "running" || state.gameplay.lastTickAt == null) return { ended: false, spawned: 0 };
  const deltaMs = Math.max(0, now - state.gameplay.lastTickAt);
  state.gameplay.lastTickAt = now;
  state.gameplay.elapsedMs += deltaMs;
  const deltaSeconds = deltaMs / 1000;
  const timedOutCustomers = advanceCustomerQueue(state, deltaSeconds);
  const difficulty = getDifficultyForDay(state.day);
  if (timedOutCustomers.length && difficulty.waitAfterService) {
    state.gameplay.nextCustomerSpawnAtMs = state.gameplay.elapsedMs + randomIntervalMs(difficulty.customerIntervalMin, difficulty.customerIntervalMax, random);
  }
  for (const customer of timedOutCustomers) {
    const order = state.orders.find((candidate) => candidate.id === customer.orderId);
    if (order) addDepartureReview(state, customer, order, now);
  }

  const modifiers = getGameplayModifiers(state);
  const gameplay = state.gameplay;
  let spawned = 0;
  if (gameplay.spawnedCustomersToday == null) {
    gameplay.spawnedCustomersToday = gameplay.customersSpawnedToday ?? state.orders.filter((order) => order.channel === "counter" && order.createdAt >= now - gameplay.elapsedMs).length;
  }
  gameplay.nextCustomerSpawnAtMs ??= gameplay.elapsedMs + randomIntervalMs(difficulty.customerIntervalMin, difficulty.customerIntervalMax, random);
  if (gameplay.spawnedCustomersToday < difficulty.targetCustomers && gameplay.elapsedMs >= gameplay.nextCustomerSpawnAtMs) {
    const customer = spawnCustomer(state, now, random);
    if (customer) {
      createOrder(state, customer, now, random);
      gameplay.spawnedCustomersToday += 1;
      gameplay.nextCustomerSpawnAtMs = gameplay.elapsedMs + randomIntervalMs(difficulty.customerIntervalMin, difficulty.customerIntervalMax, random) / Math.max(.5, modifiers.customerSpawn);
      spawned += 1;
    }
  }
  if (isOnlineOrderingUnlocked(state) && gameplay.nextOnlineSpawnAtMs === 0) {
    gameplay.nextOnlineSpawnAtMs = gameplay.elapsedMs + randomIntervalMs(difficulty.onlineIntervalMin, difficulty.onlineIntervalMax, random);
  }
  if (isOnlineOrderingUnlocked(state) && gameplay.elapsedMs >= gameplay.nextOnlineSpawnAtMs) {
    spawnOnlineOrder(state, now, random);
    gameplay.nextOnlineSpawnAtMs = gameplay.elapsedMs + randomIntervalMs(difficulty.onlineIntervalMin, difficulty.onlineIntervalMax, random) / Math.max(.5, modifiers.onlineOrders);
  }
  processEmployeeAutomation(state, now, modifiers.serviceSpeed);

  if (state.eventEndsAt && now >= state.eventEndsAt) {
    state.currentEvent = null;
    state.eventEndsAt = null;
  }
  const ended = gameplay.elapsedMs >= GAME_CONFIG.DAY_DURATION_SECONDS * 1000 ||
    (gameplay.spawnedCustomersToday >= difficulty.targetCustomers &&
      state.dailyStats.customersServed - state.dailyStats.onlineOrders >= difficulty.targetCustomers &&
      state.customers.length === 0);
  if (ended) endDay(state);
  return { ended, spawned };
}

function tickClock(state, now) {
  if (state.gameplay.status === "running" && state.gameplay.lastTickAt != null) {
    state.gameplay.elapsedMs += Math.max(0, now - state.gameplay.lastTickAt);
    state.gameplay.lastTickAt = now;
  }
}
