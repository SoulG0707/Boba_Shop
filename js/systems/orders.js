import { INGREDIENT_BY_ID } from "../data/ingredients.js";
import { PRODUCT_OPTIONS, getProductPrice, getProductRecipe } from "../data/products.js";
import { getDifficultyForDay, INGREDIENT_UNLOCK_DAYS, randomIntervalMs } from "../data/difficulty.js";
import { consumeIngredients, getStockQuantity } from "./inventory.js";
import { addReview } from "./reviews.js";

const BOWL_INGREDIENTS = Object.freeze(Object.keys(INGREDIENT_BY_ID).filter((id) => id !== "food_box"));

export function createOrder(state, customer, now = Date.now(), random = Math.random) {
  const productId = customer.preferredProduct;
  const difficulty = getDifficultyForDay(state.day);
  let size = difficulty.allowedSizes[Math.floor(random() * difficulty.allowedSizes.length)] ?? "M";
  let totalPrice = getProductPrice(productId, state.sellPrices, { size });
  if (totalPrice > customer.maxPrice) {
    size = "M";
    totalPrice = getProductPrice(productId, state.sellPrices, { size });
  }
  const number = state.gameplay.nextEntityId++;
  const item = { productId, size, quantity: 1 };
  const baseRecipe = getProductRecipe(productId, { size }) ?? {};
  const allowed = difficulty.recipeIngredients;
  const requestedRecipe = allowed ? Object.fromEntries(Object.entries(baseRecipe).filter(([id]) => id === "food_box" || allowed.includes(id))) : { ...baseRecipe };
  if (customer.tutorial) {
    for (const id of Object.keys(requestedRecipe)) if (!["rice_paper", "shrimp_salt", "green_mango", "food_box"].includes(id)) delete requestedRecipe[id];
  }
  const optionalIds = ["vietnamese_coriander", "fried_shallot", "peanut", "calamansi"]
    .filter((id) => Object.hasOwn(requestedRecipe, id));
  while (optionalIds.length > difficulty.maxOptionalToppings) {
    const removed = optionalIds.splice(Math.floor(random() * optionalIds.length), 1)[0];
    delete requestedRecipe[removed];
  }
  const optionalToppings = ["vietnamese_coriander", "fried_shallot", "peanut", "calamansi"]
    .filter((id) => Object.hasOwn(requestedRecipe, id));
  const excludedIngredients = !customer.tutorial && random() < difficulty.exclusionChance && optionalToppings.length
    ? [optionalToppings[Math.floor(random() * optionalToppings.length)]]
    : [];
  const heatLevel = !customer.tutorial && Object.hasOwn(requestedRecipe, "satay")
    ? difficulty.heatLevels[Math.floor(random() * difficulty.heatLevels.length)] ?? null : null;
  const order = {
    id: `order-${number}`,
    customerId: customer.id,
    items: [item],
    totalPrice,
    createdAt: now,
    status: "waiting",
    channel: "counter",
    customerRequest: { excludedIngredients, heatLevel },
    requestedRecipe,
    preparedIngredients: {},
    preparedSize: null,
    mixed: false,
    mixing: false,
    packed: false,
  };
  customer.orderId = order.id;
  state.orders.unshift(order);
  state.orders.length = Math.min(state.orders.length, 80);
  return order;
}

export function getOrderRecipe(order, { size } = {}) {
  const item = order?.items?.[0];
  if (!item) return null;
  const targetSize = size ?? item.size;
  const recipe = order.requestedRecipe && targetSize === item.size
    ? { ...order.requestedRecipe }
    : getProductRecipe(item.productId, { size: targetSize }) ?? {};
  for (const id of order.customerRequest?.excludedIngredients ?? []) delete recipe[id];
  if (Object.hasOwn(recipe, "satay")) {
    const baseHeat = recipe.satay;
    const heatAdjustments = { "Không cay": -baseHeat, "Ít cay": -1, "Cay vừa": 0, "Cay nhiều": 1 };
    recipe.satay = Math.max(0, baseHeat + (heatAdjustments[order.customerRequest?.heatLevel] ?? 0));
    if (!recipe.satay) delete recipe.satay;
  }
  return recipe;
}

export function addIngredientToOrder(state, orderId, ingredientId) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "waiting" || order.mixed || order.mixing) return { success: false, reason: "Tô đã trộn hoặc đơn không còn hoạt động." };
  if (!order.preparedSize) return { success: false, reason: "Chọn size trước khi thêm nguyên liệu." };
  if (!BOWL_INGREDIENTS.includes(ingredientId)) return { success: false, reason: "Nguyên liệu này không dùng để trộn." };
  if (state.day < (INGREDIENT_UNLOCK_DAYS[ingredientId] ?? 1) && !(getOrderRecipe(order)?.[ingredientId] > 0)) return { success: false, reason: "Nguyên liệu chưa được mở khóa." };
  const quantity = order.preparedIngredients?.[ingredientId] ?? 0;
  if (getStockQuantity(state, ingredientId) <= quantity) return { success: false, reason: `Kho không còn ${INGREDIENT_BY_ID[ingredientId]?.name ?? "nguyên liệu"} để thêm.` };
  order.preparedIngredients ??= {};
  order.preparedIngredients[ingredientId] = quantity + 1;
  return { success: true, ingredient: INGREDIENT_BY_ID[ingredientId], quantity: quantity + 1 };
}

export function setOrderSize(state, orderId, size) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "waiting" || order.mixed || order.mixing || !PRODUCT_OPTIONS.sizes[size] || !(getDifficultyForDay(state.day).allowedSizes.includes(size) || order.items[0]?.size === size)) return false;
  if (Object.values(order.preparedIngredients ?? {}).some((quantity) => quantity > 0)) return false;
  order.preparedSize = size;
  return true;
}

export function removeIngredientFromOrder(state, orderId, ingredientId) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  const quantity = order?.preparedIngredients?.[ingredientId] ?? 0;
  if (!order || order.status !== "waiting" || order.mixed || order.mixing || quantity <= 0) return false;
  if (quantity === 1) delete order.preparedIngredients[ingredientId];
  else order.preparedIngredients[ingredientId] = quantity - 1;
  return true;
}

export function mixOrder(state, orderId) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "waiting" || order.mixed || order.mixing) return false;
  if (!order.preparedSize || !(order.preparedIngredients?.rice_paper > 0)) return false;
  order.mixing = true;
  return true;
}

export function finishMixingOrder(state, orderId) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "waiting" || !order.mixing) return false;
  order.mixing = false;
  order.mixed = true;
  return true;
}

export function packOrder(state, orderId) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "waiting" || !order.mixed || order.packed) {
    return { success: false, reason: "Hãy trộn món trước khi đóng hộp." };
  }
  const packed = consumeIngredients(state, { food_box: 1 });
  if (!packed.success) return { success: false, reason: "Kho đã hết hộp đựng." };
  order.packed = true;
  order.status = "ready";
  return { success: true, order, ingredientCost: packed.cost };
}

export function evaluatePreparedOrder(order, customer) {
  const item = order.items[0];
  const target = getOrderRecipe(order) ?? {};
  delete target.food_box;
  const prepared = order.preparedIngredients ?? {};
  const ingredientIds = new Set([...Object.keys(target), ...Object.keys(prepared)]);
  const missingIngredients = [];
  const wrongIngredients = [];
  let correctIngredients = 0;
  for (const id of ingredientIds) {
    const needed = target[id] ?? 0;
    const used = prepared[id] ?? 0;
    const correct = Math.min(needed, used);
    correctIngredients += correct;
    if (needed > used) missingIngredients.push({ id, quantity: needed - used });
    if (used > needed) wrongIngredients.push({ id, quantity: used - needed });
  }
  const missingCount = missingIngredients.reduce((sum, entry) => sum + entry.quantity, 0);
  const wrongCount = wrongIngredients.reduce((sum, entry) => sum + entry.quantity, 0);
  const sizeCorrect = order.preparedSize === item.size;
  const waitingTime = Math.max(0, customer.elapsedWait ?? ((Date.now() - order.createdAt) / 1000));
  const satisfaction = Math.max(0, Math.min(100, 100 - missingCount * 9 - wrongCount * 7 - (sizeCorrect ? 0 : 15) - Math.min(30, Math.floor(waitingTime / 8))));
  return { correctIngredients, missingIngredients, wrongIngredients, sizeCorrect, waitingTime, satisfaction };
}

export function serveOrder(state, orderId, now = Date.now(), random = Math.random) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "ready" || !order.packed) return { success: false, reason: "Hãy trộn và đóng hộp món trước khi giao khách." };
  const customer = state.customers.find((candidate) => candidate.id === order.customerId);
  if (!customer) return { success: false, reason: "Khách đã rời quầy." };

  const actualRecipe = { ...(order.preparedIngredients ?? {}) };
  const consumed = consumeIngredients(state, actualRecipe);
  if (!consumed.success) {
    order.availabilityBlocked = true;
    return { success: false, reason: "Kho thiếu nguyên liệu đã cho vào tô.", missing: consumed.missing };
  }

  const accuracy = evaluatePreparedOrder(order, customer);
  order.accuracy = accuracy;
  order.status = "served";
  order.servedAt = now;
  state.money += order.totalPrice;
  state.dailyStats.revenue += order.totalPrice;
  state.dailyStats.customersServed += 1;
  state.customersServed += 1;
  if (customer.tutorial) state.tutorialSellingCompleted = true;
  const review = addReview(state, customer, order, now);
  customer.status = "served";
  state.customers = state.customers.filter((candidate) => candidate.id !== customer.id);
  const difficulty = getDifficultyForDay(state.day);
  if (difficulty.waitAfterService && state.gameplay.status === "running") {
    state.gameplay.nextCustomerSpawnAtMs = state.gameplay.elapsedMs + randomIntervalMs(difficulty.customerIntervalMin, difficulty.customerIntervalMax, random);
  }
  return { success: true, order, review, accuracy, revenue: order.totalPrice, ingredientCost: consumed.cost };
}

export function getOrderDetails(state, order) {
  const items = order.items.map((item) => ({
    ...item,
    recipe: getProductRecipe(item.productId, item),
    unitPrice: getProductPrice(item.productId, state.sellPrices, item),
  }));
  return { ...order, items };
}
