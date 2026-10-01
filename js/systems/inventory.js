import { INGREDIENT_BY_ID } from "../data/ingredients.js";

export function getPendingPurchaseSummary(pendingPurchase = {}) {
  let totalCost = 0;
  let itemCount = 0;
  let totalQuantity = 0;
  for (const [ingredientId, rawQuantity] of Object.entries(pendingPurchase ?? {})) {
    const quantity = Math.max(0, Number(rawQuantity) || 0);
    const definition = INGREDIENT_BY_ID[ingredientId];
    if (!definition || quantity <= 0) continue;
    itemCount += 1;
    totalQuantity += quantity;
    totalCost += quantity * definition.purchasePrice;
  }
  return { totalCost, itemCount, totalQuantity };
}

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

export function purchaseIngredients(state, pendingPurchase, currentDay = state.day) {
  if (state.gameplay.status === "summary") return { success: false, reason: "Chuyển sang ngày tiếp theo rồi hãy nhập hàng." };
  if (!pendingPurchase || typeof pendingPurchase !== "object" || Array.isArray(pendingPurchase)) {
    return { success: false, reason: "Giỏ nhập hàng không hợp lệ." };
  }

  const selections = [];
  let totalCost = 0;
  for (const [ingredientId, rawQuantity] of Object.entries(pendingPurchase)) {
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      return { success: false, reason: "Số lượng nhập không hợp lệ." };
    }
    if (quantity === 0) continue;
    const definition = INGREDIENT_BY_ID[ingredientId];
    if (!definition) return { success: false, reason: "Có nguyên liệu không còn tồn tại trong danh mục." };
    selections.push({ ingredientId, definition, quantity });
    totalCost += definition.purchasePrice * quantity;
  }

  if (!selections.length) return { success: false, reason: "Hãy chọn nguyên liệu cần nhập." };
  if (state.money < totalCost) return { success: false, reason: "Tiệm chưa đủ tiền để nhập toàn bộ giỏ hàng." };

  const shelfLifeBonus = Math.max(0, Number(state.upgrades?.airConditioner) || 0) * 0.2;
  const batches = selections.map(({ ingredientId, definition, quantity }) => {
    const entry = normalizeStockEntry(state.stock, ingredientId);
    const expirationDays = definition.expirationDays + Math.round(definition.expirationDays * shelfLifeBonus);
    return { entry, definition, quantity, expirationDays };
  });

  state.money -= totalCost;
  for (const { entry, definition, quantity, expirationDays } of batches) {
    entry.purchasePrice = definition.purchasePrice;
    entry.expirationDays = expirationDays;
    entry.batches.push({ quantity, boughtDay: currentDay, expireDay: currentDay + expirationDays, unitPrice: definition.purchasePrice });
    entry.quantity += quantity;
  }
  state.dailyStats.stockPurchases = (state.dailyStats.stockPurchases ?? 0) + totalCost;
  return {
    success: true,
    totalCost,
    items: selections.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })),
  };
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
