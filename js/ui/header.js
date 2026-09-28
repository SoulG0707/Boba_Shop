import { formatMoney } from "../config.js";
import { getAverageRating } from "../systems/reviews.js";
import { escapeHtml } from "./helpers.js";

export function renderHeader(state) {
  const rating = getAverageRating(state).toFixed(1).replace(".", ",");
  const statusLabel = state.gameplay.status === "running" ? "Tạm dừng" : state.gameplay.status === "paused" ? "Tiếp tục" : "Bán hàng";
  const pauseDisabled = !["running", "paused"].includes(state.gameplay.status);
  return `<div class="brand"><span class="brand-mark">🧋</span><span class="brand-copy"><strong>${escapeHtml(state.shopName)}</strong><small>Tiệm trà nhỏ của bạn</small></span></div>
    <div class="header-actions"><div class="header-stats">
      <span class="header-stat"><small>Ngày</small><strong>${state.day}</strong></span>
      <span class="header-stat"><small>Tiền</small><strong>${formatMoney(state.money)}</strong></span>
      <span class="header-stat"><small>Đánh giá</small><strong>★ ${rating}</strong></span>
    </div><div class="header-mini-games"><button class="button button-small button-quiet" data-navigate="baucua" title="Bầu Cua" aria-label="Bầu Cua">🎲</button><button class="button button-small button-quiet" data-navigate="xidach" title="Xì Dách" aria-label="Xì Dách">🃏</button><button class="button button-small button-quiet" data-navigate="noodles" title="Chi nhánh Mì Cay" aria-label="Mì Cay">🍜</button></div><button class="button button-small button-quiet" data-action="pause-day" ${pauseDisabled ? "disabled" : ""}>${state.gameplay.status === "paused" ? "▶" : "Ⅱ"} <span class="desktop-only">${statusLabel}</span></button>
    <button class="button button-small button-quiet" data-action="settings" aria-label="Cài đặt">⚙️</button></div>`;
}
