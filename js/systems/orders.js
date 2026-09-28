import { PRODUCT_OPTIONS, getProductPrice } from "../data/products.js";
import { consumeIngredients } from "./inventory.js";
import { addReview } from "./reviews.js";

function pickOption(options, random = Math.random) {
  const keys = Object.keys(options);
  return keys[Math.floor(random() * keys.length)] ?? keys[0];
}

export function createOrder(state, customer, now = Date.now(), random = Math.random) {
  const productId = customer.preferredProduct;
  let size = pickOption(PRODUCT_OPTIONS.sizes, random);
  const toppings = Object.keys(PRODUCT_OPTIONS.toppings);
  let topping = toppings[Math.min(toppings.length - 1, Math.floor(random() * toppings.length))];
  let totalPrice = getProductPrice(productId, state.sellPrices, { size, topping });
  if (totalPrice > customer.maxPrice) {
    size = "regular";
    topping = "none";
    totalPrice = getProductPrice(productId, state.sellPrices, { size, topping });
  }
  const number = state.gameplay.nextEntityId++;
  const item = { productId, size, topping, quantity: 1 };
  const order = {
    id: `order-${number}`,
    customerId: customer.id,
    items: [item],
    totalPrice,
    createdAt: now,
    status: "waiting",
    channel: "counter",
  };
  customer.orderId = order.id;
  state.orders.unshift(order);
  state.orders.length = Math.min(state.orders.length, 80);
  return order;
}

export function setOrderStatus(state, orderId, status) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || !["waiting", "preparing", "ready"].includes(status)) return false;
  if (status === "preparing" && order.status === "waiting") {
    order.preparationRemaining = 6 + (order.items[0]?.size === "large" ? 2 : 0) + (order.items[0]?.topping === "none" ? 0 : 1);
  }
  order.status = status;
  return true;
}

export function advanceOrderPreparation(state, deltaSeconds, serviceSpeed = 1) {
  let completed = 0;
  for (const order of state.orders) {
    if (order.status !== "preparing") continue;
    order.preparationRemaining = Math.max(0, order.preparationRemaining - deltaSeconds * serviceSpeed);
    if (order.preparationRemaining === 0) {
      order.status = "ready";
      completed += 1;
    }
  }
  return completed;
}

export function serveOrder(state, orderId, now = Date.now()) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order || !["waiting", "preparing", "ready"].includes(order.status)) return { success: false, reason: "Đơn này không còn chờ phục vụ." };
  const customer = state.customers.find((candidate) => candidate.id === order.customerId);
  if (!customer) return { success: false, reason: "Khách đã rời quầy." };

  const recipe = {};
  for (const item of order.items) {
    const itemRecipe = (awaitRecipe(item));
    for (const [ingredientId, quantity] of Object.entries(itemRecipe)) recipe[ingredientId] = (recipe[ingredientId] ?? 0) + quantity * item.quantity;
  }
  const consumed = consumeIngredients(state, recipe);
  if (!consumed.success) {
    order.availabilityBlocked = true;
    return { success: false, reason: "Kho thiếu nguyên liệu để pha món này.", missing: consumed.missing };
  }

  order.status = "served";
  order.servedAt = now;
  state.money += order.totalPrice;
  state.dailyStats.revenue += order.totalPrice;
  state.dailyStats.customersServed += 1;
  state.customersServed += 1;
  const review = addReview(state, customer, order, now);
  customer.status = "served";
  state.customers = state.customers.filter((candidate) => candidate.id !== customer.id);
  return { success: true, order, review, ingredientCost: consumed.cost };
}

function awaitRecipe(item) {
  // Kept as a tiny wrapper so order aggregation stays independent from the DOM.
  return getProductRecipe(item.productId, item);
}

import { getProductRecipe } from "../data/products.js";

export function getOrderDetails(state, order) {
  const items = order.items.map((item) => ({
    ...item,
    recipe: getProductRecipe(item.productId, item),
    unitPrice: getProductPrice(item.productId, state.sellPrices, item),
  }));
  return { ...order, items };
}
