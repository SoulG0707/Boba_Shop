import { GAME_CONFIG } from "../config.js";
import { INGREDIENTS } from "../data/ingredients.js";
import { PRODUCTS } from "../data/products.js";
import { UPGRADES } from "../data/upgrades.js";

function createInitialStock() {
  return Object.fromEntries(INGREDIENTS.map((ingredient) => {
    return [ingredient.id, {
      quantity: 0,
      purchasePrice: ingredient.purchasePrice,
      expirationDays: ingredient.expirationDays,
      batches: [],
    }];
  }));
}

export function createInitialState() {
  return {
    version: GAME_CONFIG.STATE_VERSION,
    money: GAME_CONFIG.INITIAL_MONEY,
    day: 1,
    stock: createInitialStock(),
    unlockedItems: PRODUCTS.filter((product) => product.unlockedByDefault).map((product) => product.id),
    upgrades: Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 0])),
    sellPrices: Object.fromEntries(PRODUCTS.map((product) => [product.id, product.basePrice])),
    employees: [],
    reviews: [],
    customersServed: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    dailyStats: {
      revenue: 0,
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
      ratingStart: 4,
      ratingEnd: 4,
    },
    onlineOrders: [],
    orders: [],
    customers: [],
    currentEvent: null,
    eventEndsAt: null,
    shopName: "Tiệm Bánh Tráng Trộn",
    miniGames: {
      bauCua: { bets: {}, stake: 10_000, lastRound: null, net: 0, roundsPlayed: 0 },
      xiDach: { stake: 10_000, lastRound: null, net: 0, roundsPlayed: 0 },
    },
    history: [],
    settings: { music: true, sound: true, theme: "warm" },
    gameplay: {
      status: "preparation",
      elapsedMs: 0,
      lastTickAt: null,
      customerSpawnAccumulator: 0,
      onlineSpawnAccumulator: 0,
      nextEntityId: 1,
    },
  };
}
