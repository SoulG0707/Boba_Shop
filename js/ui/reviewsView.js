import { getAverageRating } from "../systems/reviews.js";
import { PRODUCT_BY_ID } from "../data/products.js";
import { NOODLE_BY_ID } from "../data/noodleMenu.js";
import { escapeHtml, formatStars, renderPageHeading, renderStatCard } from "./helpers.js";

export function renderReviewsView(state) {
  const average = getAverageRating(state);
  const reviews = state.reviews.map((review) => `<article class="card review-card"><div class="card-head"><div><strong>${escapeHtml(review.customerName)}</strong><div class="tiny muted">Ngày ${review.day} · ${escapeHtml(PRODUCT_BY_ID[review.productId]?.name ?? NOODLE_BY_ID[review.productId]?.name ?? "Đồ uống")}</div></div><div>${formatStars(review.rating)} <strong>${review.rating}</strong></div></div><p>“${escapeHtml(review.comment)}”</p></article>`).join("");
  return `${renderPageHeading("Đánh giá của khách", "Mỗi nhận xét giúp bạn hiểu khách đang thích điều gì ở tiệm.")}<div class="page-content"><div class="grid-3">${renderStatCard("⭐", "Điểm trung bình", `${average.toFixed(1)} / 5`)}${renderStatCard("💬", "Đánh giá gần đây", state.reviews.length)}${renderStatCard("🧋", "Khách đã phục vụ", state.customersServed)}</div><div class="grid-2">${reviews || `<div class="empty-state">Đánh giá sẽ xuất hiện sau khi bạn phục vụ những vị khách đầu tiên.</div>`}</div></div>`;
}
