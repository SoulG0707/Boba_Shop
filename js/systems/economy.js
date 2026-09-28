import { GAME_CONFIG } from "../config.js";
import { PRODUCT_BY_ID, getProductRecipe, getProductPrice } from "../data/products.js";
import { getIngredientUnitCost } from "./inventory.js";
import { getGameplayModifiers } from "./modifiers.js";

export function calculateProductCost(state, productId, options = {}) {
  const recipe = getProductRecipe(productId, options);
  if (!recipe) return 0;
  return Object.entries(recipe).reduce((sum, [ingredientId, quantity]) => sum + getIngredientUnitCost(state, ingredientId) * quantity, 0);
}

export function calculateProfitMargin(state, productId, options = {}) {
  const price = getProductPrice(productId, state.sellPrices, options);
  if (!price) return 0;
  return (price - calculateProductCost(state, productId, options)) / price;
}

export function calculateDemandModifier(state, productId, options = {}) {
  const product = PRODUCT_BY_ID[productId];
  if (!product) return 0;
  const price = getProductPrice(productId, state.sellPrices, options);
  const referencePrice = product.basePrice * (options.size === "large" ? 1.3 : 1) + (options.topping === "blackPearl" ? 5_000 : options.topping === "whitePearl" ? 6_000 : 0);
  const eventModifiers = getGameplayModifiers(state);
  const priceSensitivity = eventModifiers.priceSensitivity;
  const priceRatio = price / referencePrice;
  const priceFactor = Math.max(0.35, Math.min(1.3, 1 - (priceRatio - 1) * 0.85 * priceSensitivity));
  const productFactor = eventModifiers[`${productId}Demand`] ?? eventModifiers.demand;
  const reputationFactor = 0.85 + Math.min(0.3, getCurrentRating(state) * 0.06);
  return Math.max(0.2, priceFactor * productFactor * reputationFactor);
}

export function getCurrentRating(state) {
  if (!state.reviews.length) return state.dailyStats.ratingEnd ?? 4;
  return state.reviews.reduce((sum, review) => sum + review.rating, 0) / state.reviews.length;
}

export function createDailyStats(state) {
  const rating = getCurrentRating(state);
  state.dailyStats = {
    revenue: 0,
    noodleRevenue: 0,
    noodleCustomers: 0,
    ingredientCost: 0,
    stockPurchases: 0,
    salaryCost: 0,
    rent: 0,
    utilities: 0,
    marketingCost: 0,
    expiredStockCost: 0,
    tax: 0,
    profit: 0,
    customersServed: 0,
    onlineOrders: 0,
    ratingStart: rating,
    ratingEnd: rating,
  };
}

export function settleDay(state) {
  const salaryCost = state.employees.reduce((sum, employee) => sum + employee.salary * Math.max(1, employee.level ?? 1), 0);
  const rent = GAME_CONFIG.BASE_RENT;
  const utilities = GAME_CONFIG.BASE_UTILITIES;
  const marketingLevel = state.upgrades.advertising ?? 0;
  const marketingCost = marketingLevel * 2_500;
  const stats = state.dailyStats;
  const preTaxProfit = stats.revenue - stats.ingredientCost - salaryCost - rent - utilities - marketingCost - stats.expiredStockCost;
  const tax = Math.max(0, preTaxProfit) * GAME_CONFIG.TAX_RATE;
  const profit = preTaxProfit - tax;

  Object.assign(stats, { salaryCost, rent, utilities, marketingCost, tax, profit, ratingEnd: getCurrentRating(state) });
  state.money -= salaryCost + rent + utilities + marketingCost + tax;
  state.totalRevenue += stats.revenue;
  state.totalExpenses += stats.ingredientCost + salaryCost + rent + utilities + marketingCost + stats.expiredStockCost + tax;
  state.totalProfit += profit;
  return stats;
}
