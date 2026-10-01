import { INGREDIENT_BY_ID, INGREDIENTS } from "../data/ingredients.js";
import { getProductRecipe, PRODUCTS } from "../data/products.js";
import { getDifficultyForDay } from "../data/difficulty.js";

function getOpeningRecipe(productId, day) {
  const recipe = getProductRecipe(productId) ?? {};
  const allowed = getDifficultyForDay(day).recipeIngredients;
  return allowed ? Object.fromEntries(Object.entries(recipe).filter(([id]) => id === "food_box" || allowed.includes(id))) : recipe;
}

function getInventoryQuantity(inventory, ingredientId) {
  const stock = inventory?.stock ?? inventory;
  const entry = stock?.[ingredientId];
  const quantity = typeof entry === "number" ? entry : Number(entry?.quantity ?? 0);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

export function getProducibleCount(product, inventory, day = 5) {
  if (!product?.id) return 0;
  const recipe = getOpeningRecipe(product.id, day);
  if (!recipe || !Object.keys(recipe).length) return 0;

  let count = Number.POSITIVE_INFINITY;
  for (const [ingredientId, quantity] of Object.entries(recipe)) {
    const required = Math.max(1, Math.ceil(Number(quantity) || 0));
    count = Math.min(count, Math.floor(getInventoryQuantity(inventory, ingredientId) / required));
  }
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export function getIngredientPreparationStatus(ingredientId, currentStock, pendingQuantity, preparationRequirements = []) {
  const requirement = preparationRequirements.find((item) => item.id === ingredientId);
  if (!requirement) return { required: 0, missing: 0, projectedMissing: 0, status: "not-required", message: "" };

  const required = Math.max(0, Math.ceil(Number(requirement.quantityNeeded) || 0));
  const current = Math.max(0, Number(currentStock) || 0);
  const pending = Math.max(0, Number(pendingQuantity) || 0);
  const missing = Math.max(0, required - current);
  const projectedMissing = Math.max(0, required - current - pending);
  if (missing === 0) return { required, missing, projectedMissing, status: "ready", message: "" };
  if (projectedMissing === 0) {
    return { required, missing, projectedMissing, status: "pending-ready", message: "✓ Đủ sau khi xác nhận nhập" };
  }
  const message = pending > 0
    ? `⚠ Còn thiếu ${projectedMissing} ${requirement.unit ?? "phần"}`
    : `⚠ Thiếu ${missing} ${requirement.unit ?? "phần"}`;
  return { required, missing, projectedMissing, status: "missing", message };
}

function getMenuSelection(state) {
  const arraySelection = [
    state.menuProductIds,
    state.menuProducts,
    state.activeProductIds,
    state.activeProducts,
    state.menu?.productIds,
  ].find(Array.isArray);
  if (arraySelection) return new Set(arraySelection);

  const objectSelection = state.menu && typeof state.menu === "object" ? state.menu : null;
  if (objectSelection && Object.keys(objectSelection).some((key) => PRODUCTS.some((product) => product.id === key))) {
    return new Set(Object.entries(objectSelection).filter(([, enabled]) => enabled).map(([id]) => id));
  }
  return null;
}

function getMissingForProduct(product, inventory, day) {
  const recipe = getOpeningRecipe(product.id, day);
  return Object.entries(recipe ?? {}).flatMap(([ingredientId, required]) => {
    const quantityNeeded = Math.max(1, Math.ceil(Number(required) || 0));
    const quantityAvailable = getInventoryQuantity(inventory, ingredientId);
    if (quantityAvailable >= quantityNeeded) return [];
    const ingredient = INGREDIENT_BY_ID[ingredientId];
    return [{
      id: ingredientId,
      name: ingredient?.name ?? ingredientId,
      unit: ingredient?.unit ?? "phần",
      quantityNeeded,
      quantityAvailable,
      missingQuantity: quantityNeeded - quantityAvailable,
    }];
  });
}

export function getShopPreparationStatus(state = {}) {
  if (!state || typeof state !== "object") state = {};
  const unlocked = new Set(Array.isArray(state.unlockedItems) ? state.unlockedItems : []);
  const allowedProducts = new Set(getDifficultyForDay(state.day).allowedProducts);
  const menuSelection = getMenuSelection(state);
  const activeProducts = PRODUCTS.filter((product) =>
    unlocked.has(product.id) && allowedProducts.has(product.id) && (menuSelection === null || menuSelection.has(product.id)),
  );
  const sellableProducts = activeProducts.flatMap((product) => {
    const producibleCount = getProducibleCount(product, state.stock, state.day);
    return producibleCount >= 1 ? [{ ...product, producibleCount }] : [];
  });
  const missingByProduct = activeProducts
    .filter((product) => !sellableProducts.some((candidate) => candidate.id === product.id))
    .map((product) => ({
      productId: product.id,
      name: product.name,
      producibleCount: 0,
      missingIngredients: getMissingForProduct(product, state.stock, state.day),
    }));
  const recommended = [...missingByProduct].sort((a, b) => {
    const missingCount = a.missingIngredients.length - b.missingIngredients.length;
    if (missingCount) return missingCount;
    const aUnits = a.missingIngredients.reduce((sum, item) => sum + item.missingQuantity, 0);
    const bUnits = b.missingIngredients.reduce((sum, item) => sum + item.missingQuantity, 0);
    return aUnits - bUnits;
  })[0] ?? null;
  const recommendedRequirements = recommended
    ? Object.entries(getOpeningRecipe(recommended.productId, state.day)).map(([id, quantity]) => ({
      id,
      name: INGREDIENT_BY_ID[id]?.name ?? id,
      unit: INGREDIENT_BY_ID[id]?.unit ?? "phần",
      quantityNeeded: Math.max(1, Math.ceil(Number(quantity) || 0)),
    }))
    : [];
  const totalStock = INGREDIENTS.reduce((sum, ingredient) => sum + getInventoryQuantity(state.stock, ingredient.id), 0);
  const missingIngredients = recommended?.missingIngredients ?? [];
  const canOpen = sellableProducts.length > 0;
  const message = canOpen
    ? "Sẵn sàng mở bán."
    : activeProducts.length === 0
      ? "Chưa có món nào đang bật trong menu."
      : totalStock === 0
        ? "Bạn chưa có nguyên liệu. Hãy nhập hàng trước khi mở bán."
        : recommended
          ? `Để bán ${recommended.name}, còn thiếu: ${missingIngredients.map((ingredient) => ingredient.name).join(", ")}.`
          : "Chưa đủ nguyên liệu để mở bán.";
  const warnings = missingByProduct.map(({ name, missingIngredients: missing }) =>
    `${name}: thiếu ${missing.map((ingredient) => ingredient.name).join(", ")}`,
  );

  return {
    canOpen,
    activeProducts,
    sellableProducts,
    missingByProduct,
    recommendedProduct: recommended,
    recommendedRequirements,
    missingIngredients,
    warnings,
    hasAnyStock: totalStock > 0,
    totalStock,
    message,
  };
}

export function estimateCustomerDemand(state = {}) {
  return getDifficultyForDay(state.day).targetCustomers;
}
