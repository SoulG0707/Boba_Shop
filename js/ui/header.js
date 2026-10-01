import { getAverageRating } from "../systems/reviews.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";

const STATUS_LABELS = Object.freeze({
  preparation: "Chuẩn bị",
  running: "Đang bán",
  paused: "Tạm nghỉ",
  summary: "Tổng kết ngày",
});

export function renderHeader(state) {
  const rating = getAverageRating(state);
  const pauseLabel = state.gameplay.status === "paused" ? "Tiếp tục ngày" : "Tạm dừng ngày";
  const pauseIcon = state.gameplay.status === "paused" ? "▶" : "Ⅱ";
  const canPause = ["running", "paused"].includes(state.gameplay.status);

  return `<div class="header-left">
      <button class="round-action" data-action="settings" aria-label="Cài đặt" title="Cài đặt"><img src="./img/icons/settings.png" alt=""></button>
      <button class="round-action" data-action="pause-day" aria-label="${pauseLabel}" title="${pauseLabel}" ${canPause ? "" : "disabled"}>${pauseIcon}</button>
      <div class="header-day"><strong>Ngày ${state.day}</strong><small>${STATUS_LABELS[state.gameplay.status] ?? "Chuẩn bị"}</small></div>
    </div>
    <div class="header-center"><strong>${escapeHtml(state.shopName)}</strong><b>${formatMoneyCompact(state.money)}</b></div>
    <div class="header-rating"><span aria-label="${rating.toFixed(1)} trên 5 sao">${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))}</span><small>${rating.toFixed(1).replace(".", ",")} · ${state.reviews.length} đánh giá</small></div>`;
}

export function updateHeader(state) {
  const root = document.querySelector("#header");
  if (!root) return;
  const rating = getAverageRating(state);
  const day = root.querySelector(".header-day strong");
  const status = root.querySelector(".header-day small");
  const money = root.querySelector(".header-center b");
  const stars = root.querySelector(".header-rating span");
  const ratingSummary = root.querySelector(".header-rating small");
  const dayText = `Ngày ${state.day}`;
  const statusText = STATUS_LABELS[state.gameplay.status] ?? "Chuẩn bị";
  const moneyText = formatMoneyCompact(state.money);
  const starsText = `${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))}`;
  const ratingText = `${rating.toFixed(1).replace(".", ",")} · ${state.reviews.length} đánh giá`;
  if (day && day.textContent !== dayText) day.textContent = dayText;
  if (status && status.textContent !== statusText) status.textContent = statusText;
  if (money && money.textContent !== moneyText) money.textContent = moneyText;
  if (stars) {
    if (stars.textContent !== starsText) stars.textContent = starsText;
    stars.setAttribute("aria-label", `${rating.toFixed(1)} trên 5 sao`);
  }
  if (ratingSummary && ratingSummary.textContent !== ratingText) ratingSummary.textContent = ratingText;
}
