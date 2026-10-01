// Apply these rules only when a new customer/order is created. Existing orders keep their recipe.
export const DAY_DIFFICULTY = Object.freeze({
  1: {
    targetCustomers: 5, firstCustomerDelayMin: 3, firstCustomerDelayMax: 5,
    customerIntervalMin: 28, customerIntervalMax: 35, maxConcurrentCustomers: 1,
    allowedProducts: ["traditional"], allowedSizes: ["M"],
    recipeIngredients: ["rice_paper", "shrimp_salt", "green_mango"],
    maxOptionalToppings: 0, exclusionChance: 0, heatLevels: ["Ít cay"],
    eventEnabled: false, allowedEvents: [], onlineEnabled: false,
    onlineIntervalMin: 0, onlineIntervalMax: 0, patienceMultiplier: 1.5,
    allowCapacityUpgrades: false, waitAfterService: true,
  },
  2: {
    targetCustomers: 7, firstCustomerDelayMin: 3, firstCustomerDelayMax: 5,
    customerIntervalMin: 24, customerIntervalMax: 30, maxConcurrentCustomers: 2,
    allowedProducts: ["traditional"], allowedSizes: ["M"],
    recipeIngredients: ["rice_paper", "shrimp_salt", "satay", "green_mango", "peanut"],
    maxOptionalToppings: 1, exclusionChance: 0, heatLevels: ["Ít cay", "Cay vừa"],
    eventEnabled: true, allowedEvents: ["HOT_WEATHER", "RAIN"], onlineEnabled: false,
    onlineIntervalMin: 0, onlineIntervalMax: 0, patienceMultiplier: 1.35,
    allowCapacityUpgrades: true,
  },
  3: {
    targetCustomers: 9, firstCustomerDelayMin: 3, firstCustomerDelayMax: 5,
    customerIntervalMin: 20, customerIntervalMax: 27, maxConcurrentCustomers: 2,
    allowedProducts: ["traditional", "beef"], allowedSizes: ["M", "L"],
    recipeIngredients: ["rice_paper", "shrimp_salt", "satay", "green_mango", "peanut", "vietnamese_coriander", "beef_jerky"],
    maxOptionalToppings: 2, exclusionChance: .05, heatLevels: ["Ít cay", "Cay vừa", "Cay nhiều"],
    eventEnabled: true, allowedEvents: ["HOT_WEATHER", "RAIN", "WEEKEND"], onlineEnabled: false,
    onlineIntervalMin: 0, onlineIntervalMax: 0, patienceMultiplier: 1.2,
    allowCapacityUpgrades: true,
  },
  4: {
    targetCustomers: 11, firstCustomerDelayMin: 3, firstCustomerDelayMax: 5,
    customerIntervalMin: 18, customerIntervalMax: 24, maxConcurrentCustomers: 3,
    allowedProducts: ["traditional", "beef", "chicken"], allowedSizes: ["M", "L"],
    recipeIngredients: ["rice_paper", "shrimp_salt", "satay", "green_mango", "peanut", "vietnamese_coriander", "fried_shallot", "beef_jerky", "chicken_jerky"],
    maxOptionalToppings: 3, exclusionChance: .1, heatLevels: ["Ít cay", "Cay vừa", "Cay nhiều"],
    eventEnabled: true, allowedEvents: ["HOT_WEATHER", "RAIN", "WEEKEND", "STUDENT_RUSH", "REVIEWER"], onlineEnabled: false,
    onlineIntervalMin: 0, onlineIntervalMax: 0, patienceMultiplier: 1.1,
    allowCapacityUpgrades: true,
  },
  5: {
    targetCustomers: 13, firstCustomerDelayMin: 3, firstCustomerDelayMax: 5,
    customerIntervalMin: 16, customerIntervalMax: 22, maxConcurrentCustomers: 3,
    allowedProducts: ["traditional", "beef", "chicken"], allowedSizes: ["M", "L"],
    recipeIngredients: ["rice_paper", "shrimp_salt", "satay", "green_mango", "peanut", "vietnamese_coriander", "fried_shallot", "calamansi", "beef_jerky", "chicken_jerky"],
    maxOptionalToppings: 4, exclusionChance: .15, heatLevels: ["Ít cay", "Cay vừa", "Cay nhiều"],
    eventEnabled: true, allowedEvents: null, onlineEnabled: true,
    onlineIntervalMin: 60, onlineIntervalMax: 90, patienceMultiplier: 1,
    allowCapacityUpgrades: true,
  },
  6: {
    targetCustomers: 15, firstCustomerDelayMin: 3, firstCustomerDelayMax: 5,
    customerIntervalMin: 14, customerIntervalMax: 20, maxConcurrentCustomers: 4,
    allowedProducts: ["traditional", "beef", "chicken", "special"], allowedSizes: ["M", "L"],
    recipeIngredients: null, maxOptionalToppings: 4, exclusionChance: .2,
    heatLevels: ["Ít cay", "Cay vừa", "Cay nhiều"], eventEnabled: true,
    allowedEvents: null, onlineEnabled: true, onlineIntervalMin: 60, onlineIntervalMax: 90,
    patienceMultiplier: 1, allowCapacityUpgrades: true,
  },
});

export const PRODUCT_UNLOCK_DAYS = Object.freeze({ traditional: 1, beef: 3, chicken: 4, special: 6 });
export const INGREDIENT_UNLOCK_DAYS = Object.freeze({ satay: 1, peanut: 2, vietnamese_coriander: 3, beef_jerky: 3, fried_shallot: 4, chicken_jerky: 4, scallion_oil: 4, calamansi: 5, quail_egg: 6, dried_shrimp: 6, tamarind_sauce: 6 });
export const ONLINE_UNLOCK = Object.freeze({ requiredDay: 5, upgradeId: "onlineChannel" });

export function getDifficultyForDay(day) {
  const safeDay = Math.max(1, Math.floor(Number(day) || 1));
  if (DAY_DIFFICULTY[safeDay]) return DAY_DIFFICULTY[safeDay];
  const extra = safeDay - 6;
  return {
    ...DAY_DIFFICULTY[6],
    targetCustomers: Math.min(22, 15 + extra),
    customerIntervalMin: Math.max(8, 14 - extra),
    customerIntervalMax: Math.max(12, 20 - extra),
    maxConcurrentCustomers: Math.min(7, 4 + Math.floor(extra / 2)),
    exclusionChance: Math.min(.35, .2 + extra * .025),
    onlineIntervalMin: Math.max(45, 60 - extra * 2),
    onlineIntervalMax: Math.max(65, 90 - extra * 3),
  };
}

export function isOnlineOrderingUnlocked(state) {
  return getDifficultyForDay(state.day).onlineEnabled &&
    state.day >= ONLINE_UNLOCK.requiredDay &&
    (state.upgrades?.[ONLINE_UNLOCK.upgradeId] ?? 0) >= 1;
}

export function randomIntervalMs(minSeconds, maxSeconds, random = Math.random) {
  return (minSeconds + Math.max(0, maxSeconds - minSeconds) * random()) * 1000;
}
