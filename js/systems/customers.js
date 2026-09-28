import { GAME_CONFIG } from "../config.js";
import { PRODUCTS } from "../data/products.js";
import { calculateDemandModifier } from "./economy.js";
import { getGameplayModifiers } from "./modifiers.js";

const CUSTOMER_TYPES = [
  { id: "regular", name: "Khách quen", weight: 0.38, patience: 48, maxPrice: 45_000, ratingBias: 0.1 },
  { id: "student", name: "Học sinh", weight: 0.29, patience: 34, maxPrice: 35_000, ratingBias: 0 },
  { id: "office", name: "Dân văn phòng", weight: 0.23, patience: 40, maxPrice: 55_000, ratingBias: 0.05 },
  { id: "reviewer", name: "Khách kỹ tính", weight: 0.1, patience: 55, maxPrice: 60_000, ratingBias: -0.25 },
];

function weightedPick(items, weightOf, random = Math.random) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (!total) return items[0] ?? null;
  let cursor = random() * total;
  for (const item of items) {
    cursor -= Math.max(0, weightOf(item));
    if (cursor <= 0) return item;
  }
  return items.at(-1) ?? null;
}

export function spawnCustomer(state, now = Date.now(), random = Math.random) {
  const capacity = GAME_CONFIG.MAX_CUSTOMERS + getGameplayModifiers(state).capacity;
  if (state.customers.length >= capacity) return null;

  const type = weightedPick(CUSTOMER_TYPES, (candidate) => candidate.weight, random);
  const products = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id));
  const preferredProduct = weightedPick(products, (product) => calculateDemandModifier(state, product.id), random);
  if (!type || !preferredProduct) return null;

  const number = state.gameplay.nextEntityId++;
  const customer = {
    id: `customer-${number}`,
    type: type.id,
    label: type.name,
    patience: type.patience * getGameplayModifiers(state).patience,
    maxPrice: type.maxPrice,
    ratingBias: type.ratingBias,
    preferredProduct: preferredProduct.id,
    arrivedAt: now,
    elapsedWait: 0,
    orderId: null,
    status: "waiting",
  };
  state.customers.push(customer);
  return customer;
}

export function calculateSatisfaction(customer, order, state, waitSeconds) {
  const priceRatio = order.totalPrice / Math.max(1, customer.maxPrice);
  const priceScore = Math.max(-1, Math.min(1, (1 - priceRatio) * 1.5));
  const waitScore = Math.max(-1, 0.45 - waitSeconds / Math.max(10, customer.patience) * 0.9);
  const score = 3.8 + customer.ratingBias + priceScore * 0.65 + waitScore * 0.75 + getGameplayModifiers(state).rating;
  return Math.max(1, Math.min(5, Math.round(score)));
}

export function advanceCustomerQueue(state, deltaSeconds) {
  const left = [];
  const timedOut = [];
  for (const customer of state.customers) {
    if (customer.status !== "waiting") {
      left.push(customer);
      continue;
    }
    customer.elapsedWait += deltaSeconds;
    customer.patience -= deltaSeconds;
    if (customer.patience <= 0) {
      customer.status = "left";
      customer.patience = 0;
      timedOut.push(customer);
      const order = state.orders.find((candidate) => candidate.id === customer.orderId);
      if (order && order.status !== "served") order.status = "cancelled";
    } else {
      left.push(customer);
    }
  }
  state.customers = left;
  return timedOut;
}
