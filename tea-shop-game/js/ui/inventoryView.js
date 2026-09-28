import { INGREDIENTS } from "../data/ingredients.js";
import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

export function renderInventoryView(state) {
  const cards = INGREDIENTS.map((ingredient) => {
    const stock = state.stock[ingredient.id];
    const firstExpiry = stock.batches.length ? Math.min(...stock.batches.map((batch) => batch.expireDay)) : null;
    const expiryText = firstExpiry == null ? "Chưa có lô hàng" : firstExpiry <= state.day + 1 ? `Sắp hết hạn · ngày ${firstExpiry}` : `Hạn gần nhất · ngày ${firstExpiry}`;
    return `<article class="card ingredient-card"><div class="ingredient-title"><span class="ingredient-emoji">${ingredient.emoji}</span><div><h3>${escapeHtml(ingredient.name)}</h3><span class="tiny muted">${escapeHtml(ingredient.unit)}</span></div></div><div class="ingredient-meta"><span>Trong kho</span><strong>${stock.quantity}</strong></div><div class="ingredient-meta"><span>Giá nhập</span><strong>${formatMoney(ingredient.purchasePrice)} / ${escapeHtml(ingredient.unit)}</strong></div><div class="ingredient-meta"><span>Hạn dùng</span><strong>${ingredient.expirationDays} ngày</strong></div><span class="pill ${firstExpiry != null && firstExpiry <= state.day + 1 ? "pill-yellow" : ""}">⌛ ${expiryText}</span><div class="button-row"><button class="button button-small button-quiet" data-action="buy-stock" data-ingredient="${ingredient.id}" data-quantity="10">Mua 10 · ${formatMoney(ingredient.purchasePrice * 10)}</button><button class="button button-small" data-action="buy-stock" data-ingredient="${ingredient.id}" data-quantity="50">Mua 50</button></div></article>`;
  }).join("");
  return `${renderPageHeading("Kho nguyên liệu", "Các lô được dùng theo hạn gần nhất để hạn chế thất thoát.")}<div class="page-content"><div class="grid-3">${cards}</div></div>`;
}
