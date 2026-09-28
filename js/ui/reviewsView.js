import { getAverageRating } from "../systems/reviews.js";
import { PRODUCT_BY_ID } from "../data/products.js";
import { NOODLE_BY_ID } from "../data/noodleMenu.js";
import { escapeHtml, formatStars } from "./helpers.js";

export function renderReviewsView(state) {
  const average = getAverageRating(state);
  const reviews = state.reviews.map((review) => {
    const productName = PRODUCT_BY_ID[review.productId]?.name ?? NOODLE_BY_ID[review.productId]?.name ?? "Món của tiệm";
    return `<article class="review-note"><span class="review-avatar">${review.rating >= 4 ? "😊" : review.rating === 3 ? "😐" : "🥺"}</span><div class="review-copy"><div class="review-top"><strong>${escapeHtml(review.customerName)}</strong><span>${formatStars(review.rating)}</span></div><small>Ngày ${review.day} · ${escapeHtml(productName)}</small><p>“${escapeHtml(review.comment)}”</p></div></article>`;
  }).join("");

  return `<div class="page-heading"><div><h2>Lời khách để lại</h2><p>Những vị khách gần đây nhớ gì về tiệm?</p></div><span class="rating-stamp">★ ${average.toFixed(1)}</span></div><div class="review-list">${reviews || `<div class="empty-state">Phục vụ những vị khách đầu tiên để nhận lời nhắn nhé.</div>`}</div>`;
}
