import { GAME_CONFIG } from "../config.js";
import { calculateSatisfaction } from "./customers.js";

export function addReview(state, customer, order, now = Date.now()) {
  const waitSeconds = Math.max(0, ((order.servedAt ?? now) - order.createdAt) / 1000);
  const review = {
    id: `review-${state.gameplay.nextEntityId++}`,
    customerType: customer.type,
    customerName: customer.label,
    productId: order.items[0]?.productId,
    satisfaction: order.accuracy?.satisfaction ?? 100,
    rating: calculateSatisfaction(customer, order, state, waitSeconds),
    comment: buildReviewComment(customer, waitSeconds, order),
    day: state.day,
    createdAt: now,
  };
  state.reviews.unshift(review);
  state.reviews.length = Math.min(state.reviews.length, GAME_CONFIG.MAX_REVIEWS);
  return review;
}

export function addDepartureReview(state, customer, order, now = Date.now()) {
  const review = {
    id: `review-${state.gameplay.nextEntityId++}`,
    customerType: customer.type,
    customerName: customer.label,
    productId: order.items[0]?.productId,
    rating: order.availabilityBlocked ? 2 : 1,
    comment: order.availabilityBlocked ? "Quầy đang hết nguyên liệu cho món mình muốn." : "Mình chờ hơi lâu nên đành ghé lại lần sau.",
    day: state.day,
    createdAt: now,
  };
  state.reviews.unshift(review);
  state.reviews.length = Math.min(state.reviews.length, GAME_CONFIG.MAX_REVIEWS);
  return review;
}

function buildReviewComment(customer, waitSeconds, order) {
  const satisfaction = order.accuracy?.satisfaction;
  if (satisfaction != null && satisfaction < 70) return "Món hơi thiếu topping, lần sau nêm vừa hơn nhé.";
  if (waitSeconds > customer.patience * 0.75) return "Bánh tráng ngon, lần sau mong chờ ít hơn nhé.";
  if (customer.type === "reviewer") return "Mình để ý từng chi tiết, vị chua cay khá hài hòa.";
  if (customer.type === "student") return "Ngon và vừa túi tiền!";
  return "Bánh tráng trộn ngon quá, sẽ quay lại!";
}

export function getAverageRating(state) {
  if (!state.reviews.length) return 4;
  return state.reviews.reduce((sum, review) => sum + review.rating, 0) / state.reviews.length;
}
