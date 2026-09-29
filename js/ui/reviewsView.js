import { getAverageRating } from "../systems/reviews.js";
import { PRODUCT_BY_ID } from "../data/products.js";
import { escapeHtml, formatStars } from "./helpers.js";

export function renderReviewsView(state) {
  const average = getAverageRating(state);
  const counts = Array.from({ length: 5 }, (_, index) =>
    state.reviews.filter((review) => Math.round(review.rating) === index + 1).length,
  );
  const maxCount = Math.max(1, ...counts);
  const histogram = counts.map((count, index) => {
    const stars = index + 1;
    const width = Math.round((count / maxCount) * 100);
    return `<div class="review-histogram-row"><span>${stars}★</span><div class="review-track"><i style="width:${width}%"></i></div><small>${count}</small></div>`;
  }).reverse().join("");
  const reviews = state.reviews.map((review) => {
    const productName = PRODUCT_BY_ID[review.productId]?.name ?? "Món của tiệm";
    return `<article class="review-note"><span class="review-avatar">${review.rating >= 4 ? "😊" : review.rating === 3 ? "😐" : "🥺"}</span><div class="review-copy"><div class="review-top"><strong>${escapeHtml(review.customerName)}</strong><span>${formatStars(review.rating)}</span></div><small>Ngày ${review.day} · ${escapeHtml(productName)}</small><p>“${escapeHtml(review.comment)}”</p></div></article>`;
  }).join("");

  return `<div class="page-heading"><div><h2>Đánh giá</h2><p>Lời khách sau mỗi phần bánh tráng.</p></div><span class="pill">${state.reviews.length} lượt</span></div>
    <section class="review-summary" aria-label="Tổng quan đánh giá">
      <div class="review-average"><strong>${average.toFixed(1).replace(".", ",")}</strong>${formatStars(average)}<small>${state.reviews.length} đánh giá</small></div>
      <div class="review-histogram">${histogram}</div>
    </section>
    <div class="review-list">${reviews || `<div class="empty-state compact-empty">⭐ Chưa có đánh giá.<small>Phục vụ vị khách đầu tiên để nhận lời nhắn nhé.</small></div>`}</div>`;
}
