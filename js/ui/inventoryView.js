import { INGREDIENTS } from "../data/ingredients.js";
import { formatMoney } from "../config.js";
import { escapeHtml } from "./helpers.js";

export function renderInventoryView(state) {
  const rows = INGREDIENTS.map((ingredient) => {
    const stock = state.stock[ingredient.id];
    const firstExpiry = stock.batches.length ? Math.min(...stock.batches.map((batch) => batch.expireDay)) : null;
    const daysLeft = firstExpiry == null ? null : Math.max(0, firstExpiry - state.day);
    const shelfLife = daysLeft == null ? "Chưa nhập hàng" : daysLeft === 0 ? "Hết hạn cuối ngày" : `HSD ${daysLeft} ngày`;
    const shortage = stock.quantity < 4;
    return `<div class="prep-row inventory-row">
      <span class="row-emoji">${ingredient.emoji}</span>
      <div class="row-copy"><strong>${escapeHtml(ingredient.name)}</strong><small>Còn ${stock.quantity} ${escapeHtml(ingredient.unit)} · ${shelfLife} · ${formatMoney(ingredient.purchasePrice)} / ${escapeHtml(ingredient.unit)}</small></div>
      <div class="row-actions"><button class="button button-small button-cream" data-action="buy-stock" data-ingredient="${ingredient.id}" data-quantity="10" aria-label="Mua 10 ${escapeHtml(ingredient.name)}" ${state.money < ingredient.purchasePrice * 10 ? "disabled" : ""}>+10</button><button class="button button-small button-cream" data-action="buy-stock" data-ingredient="${ingredient.id}" data-quantity="50" aria-label="Mua 50 ${escapeHtml(ingredient.name)}" ${state.money < ingredient.purchasePrice * 50 ? "disabled" : ""}>+50</button></div>
      ${shortage ? `<span class="stock-low" title="Sắp hết">!</span>` : ""}
    </div>`;
  }).join("");

  return `<div class="page-heading"><div><h2>Kho nguyên liệu</h2><p>Lô gần hết hạn sẽ được dùng trước.</p></div><span class="pill">${INGREDIENTS.length} loại</span></div><div class="prep-list">${rows}</div>`;
}
