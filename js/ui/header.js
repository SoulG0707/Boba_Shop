import { formatMoney } from "../config.js";
import { getAverageRating } from "../systems/reviews.js";
import { escapeHtml } from "./helpers.js";

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
      <button class="round-action" data-action="pause-day" aria-label="${pauseLabel}" title="${pauseLabel}" ${canPause ? "" : "disabled"}>${pauseIcon}</button>
      <button class="round-action" data-action="settings" aria-label="Cài đặt" title="Cài đặt"><img src="./img/icons/settings.png" alt=""></button>
      <div class="header-day"><strong>Ngày ${state.day}</strong><small>${STATUS_LABELS[state.gameplay.status] ?? "Chuẩn bị"}</small></div>
    </div>
    <div class="header-center"><strong>${escapeHtml(state.shopName)}</strong><b>${formatMoney(state.money)}</b></div>
    <div class="header-rating"><span aria-label="${rating.toFixed(1)} trên 5 sao">${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))}</span><strong>${rating.toFixed(1).replace(".", ",")}</strong></div>`;
}
