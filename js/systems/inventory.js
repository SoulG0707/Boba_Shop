import { INGREDIENT_BY_ID } from "../data/ingredients.js";

function normalizeStockEntry(stock, ingredientId) {
  const definition = INGREDIENT_BY_ID[ingredientId];
  const entry = stock[ingredientId] ?? {
    quantity: 0,
    purchasePrice: definition?.purchasePrice ?? 0,
    expirationDays: definition?.expirationDays ?? 1,
    batches: [],
  };
  entry.batches ??= [];
  entry.quantity = entry.batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity), 0);
  stock[ingredientId] = entry;
  return entry;
}

export function getStockQuantity(state, ingredientId) {
  return normalizeStockEntry(state.stock, ingredientId).quantity;
}

export function getIngredientUnitCost(state, ingredientId) {
  const entry = normalizeStockEntry(state.stock, ingredientId);
  const quantity = entry.batches.reduce((sum, batch) => sum + batch.quantity, 0);
  if (!quantity) return entry.purchasePrice || INGREDIENT_BY_ID[ingredientId]?.purchasePrice || 0;
  const value = entry.batches.reduce((sum, batch) => sum + batch.quantity * (batch.unitPrice ?? entry.purchasePrice), 0);
  return value / quantity;
}

export function canCraftRecipe(state, recipe) {
  return Object.entries(recipe).every(([ingredientId, quantity]) => getStockQuantity(state, ingredientId) >= quantity);
}

export function consumeIngredients(state, recipe) {
  if (!canCraftRecipe(state, recipe)) return { success: false, missing: Object.entries(recipe).filter(([id, qty]) => getStockQuantity(state, id) < qty).map(([id]) => id), cost: 0 };

  let cost = 0;
  for (const [ingredientId, requested] of Object.entries(recipe)) {
    const entry = normalizeStockEntry(state.stock, ingredientId);
    entry.batches.sort((a, b) => a.expireDay - b.expireDay || a.boughtDay - b.boughtDay);
    let remaining = requested;
    while (remaining > 0) {
      const batch = entry.batches[0];
      const used = Math.min(remaining, batch.quantity);
      cost += used * (batch.unitPrice ?? entry.purchasePrice);
      batch.quantity -= used;
      remaining -= used;
      if (batch.quantity <= 0) entry.batches.shift();
    }
    entry.quantity = entry.batches.reduce((sum, batch) => sum + batch.quantity, 0);
  }

  state.dailyStats.ingredientCost += cost;
  return { success: true, cost };
}

export function purchaseIngredient(state, ingredientId, quantity, currentDay = state.day) {
  if (state.gameplay.status === "summary") return { success: false, reason: "Chuyển sang ngày tiếp theo rồi hãy mua nguyên liệu." };
  const definition = INGREDIENT_BY_ID[ingredientId];
  const amount = Math.floor(Number(quantity));
  if (!definition || !Number.isFinite(amount) || amount <= 0) return { success: false, reason: "Số lượng mua không hợp lệ." };
  const totalCost = definition.purchasePrice * amount;
  if (state.money < totalCost) return { success: false, reason: "Tiệm chưa đủ tiền để mua." };

  const entry = normalizeStockEntry(state.stock, ingredientId);
  const shelfLifeBonus = Math.max(0, Number(state.upgrades?.airConditioner) || 0) * 0.2;
  const expirationDays = definition.expirationDays + Math.round(definition.expirationDays * shelfLifeBonus);
  state.money -= totalCost;
  entry.purchasePrice = definition.purchasePrice;
  entry.expirationDays = expirationDays;
  entry.batches.push({ quantity: amount, boughtDay: currentDay, expireDay: currentDay + expirationDays, unitPrice: definition.purchasePrice });
  entry.quantity += amount;
  state.dailyStats.stockPurchases = (state.dailyStats.stockPurchases ?? 0) + totalCost;
  return { success: true, totalCost, quantity: amount };
}

export function expireIngredients(state, currentDay = state.day) {
  const expired = [];
  let loss = 0;
  for (const [ingredientId, stock] of Object.entries(state.stock)) {
    const entry = normalizeStockEntry(state.stock, ingredientId);
    const freshBatches = [];
    for (const batch of entry.batches) {
      if (batch.expireDay <= currentDay) {
        const batchLoss = batch.quantity * (batch.unitPrice ?? entry.purchasePrice);
        loss += batchLoss;
        expired.push({ ingredientId, quantity: batch.quantity, loss: batchLoss });
      } else {
        freshBatches.push(batch);
      }
    }
    entry.batches = freshBatches;
    entry.quantity = freshBatches.reduce((sum, batch) => sum + batch.quantity, 0);
  }
  state.dailyStats.expiredStockCost = (state.dailyStats.expiredStockCost ?? 0) + loss;
  return { expired, loss };
}
