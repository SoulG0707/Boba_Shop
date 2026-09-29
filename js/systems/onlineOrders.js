import { PRODUCTS, getProductPrice } from "../data/products.js";
import { consumeIngredients } from "./inventory.js";
import { addReview } from "./reviews.js";

export function spawnOnlineOrder(state, now = Date.now(), random = Math.random) {
  const availableProducts = PRODUCTS.filter((candidate) => state.unlockedItems.includes(candidate.id));
  const product = availableProducts[Math.floor(random() * availableProducts.length)];
  if (!product) return null;
  const size = random() > 0.75 ? "L" : "M";
  const number = state.gameplay.nextEntityId++;
  const customer = { id: `online-customer-${number}`, type: "online", label: "Khách online", patience: 90, maxPrice: 60_000, ratingBias: 0.05, preferredProduct: product.id, arrivedAt: now, elapsedWait: 0, orderId: `online-${number}`, status: "waiting" };
  const order = {
    id: `online-${number}`,
    customerId: customer.id,
    items: [{ productId: product.id, size, quantity: 1 }],
    totalPrice: getProductPrice(product.id, state.sellPrices, { size }),
    createdAt: now,
    status: "waiting",
    channel: "online",
    customer,
  };
  state.onlineOrders.unshift(order);
  state.onlineOrders.length = Math.min(state.onlineOrders.length, 40);
  return order;
}

export function acceptOnlineOrder(state, orderId) {
  const order = state.onlineOrders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "waiting") return false;
  order.status = "preparing";
  order.acceptedAt = Date.now();
  return true;
}

export function completeOnlineOrder(state, orderId, now = Date.now()) {
  const order = state.onlineOrders.find((candidate) => candidate.id === orderId);
  if (!order || !["waiting", "preparing", "ready"].includes(order.status)) return { success: false, reason: "Đơn online không còn hoạt động." };
  const recipe = {};
  for (const item of order.items) {
    const product = getRecipe(item);
    for (const [ingredientId, quantity] of Object.entries(product)) recipe[ingredientId] = (recipe[ingredientId] ?? 0) + quantity * item.quantity;
  }
  const consumed = consumeIngredients(state, recipe);
  if (!consumed.success) return { success: false, reason: "Kho thiếu nguyên liệu cho đơn online." };

  order.status = "served";
  order.servedAt = now;
  state.money += order.totalPrice;
  state.dailyStats.revenue += order.totalPrice;
  state.dailyStats.onlineOrders += 1;
  state.dailyStats.customersServed += 1;
  state.customersServed += 1;
  const review = addReview(state, order.customer, order, now);
  return { success: true, order, review };
}

function getRecipe(item) {
  return getProductRecipe(item.productId, item);
}

import { getProductRecipe } from "../data/products.js";
