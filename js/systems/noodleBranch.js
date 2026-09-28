import { NOODLE_BY_ID } from "../data/noodleMenu.js";
import { getIngredientUnitCost, consumeIngredients } from "./inventory.js";
import { addReview } from "./reviews.js";

export function calculateNoodleCost(state, noodleId) {
  const noodle = NOODLE_BY_ID[noodleId];
  if (!noodle) return 0;
  return Object.entries(noodle.recipe).reduce((total, [ingredientId, quantity]) => total + getIngredientUnitCost(state, ingredientId) * quantity, 0);
}

export function sellNoodleBowl(state, noodleId, now = Date.now()) {
  if (state.gameplay.status !== "running") return { success: false, reason: "Mở cửa tiệm trước khi nhận đơn Mì Cay." };
  const noodle = NOODLE_BY_ID[noodleId];
  if (!noodle) return { success: false, reason: "Không tìm thấy món mì này." };
  const recipe = noodle.recipe;
  const consumed = consumeIngredients(state, recipe);
  if (!consumed.success) return { success: false, reason: "Kho Mì Cay đang thiếu nguyên liệu.", missing: consumed.missing };

  const totalPrice = state.noodleBranch.sellPrices[noodleId] ?? noodle.price;
  const number = state.gameplay.nextEntityId++;
  const customer = { id: `noodle-customer-${number}`, type: "noodle", label: "Khách Mì Cay", patience: 60, maxPrice: 65_000, ratingBias: 0.05 };
  const order = { id: `noodle-order-${number}`, items: [{ productId: noodleId, quantity: 1 }], totalPrice, createdAt: now, servedAt: now };

  state.money += totalPrice;
  state.dailyStats.revenue += totalPrice;
  state.dailyStats.noodleRevenue += totalPrice;
  state.dailyStats.noodleCustomers += 1;
  state.dailyStats.customersServed += 1;
  state.customersServed += 1;
  state.noodleBranch.customersServed += 1;
  state.noodleBranch.totalRevenue += totalPrice;
  const review = addReview(state, customer, order, now);
  return { success: true, noodle, totalPrice, ingredientCost: consumed.cost, review };
}
