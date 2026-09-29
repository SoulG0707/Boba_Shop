import { PRODUCTS, PRODUCT_OPTIONS } from "../data/products.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";

export function renderPreparationShell(state, navigation, content) {
  const menuItems = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id)).map((product) =>
    `<div class="chalk-row" title="${escapeHtml(product.name)}"><span>${escapeHtml(product.category)}</span><strong>${formatMoneyCompact(state.sellPrices[product.id] ?? product.basePrice)}</strong></div>`,
  ).join("");
  const sizeLPrice = PRODUCT_OPTIONS.sizes.L.priceModifier;

  return `<div class="prep-world">
    <button class="shop-sign" data-action="edit-shop-name" aria-label="Đổi tên tiệm"><span>${escapeHtml(state.shopName)}</span><small>✎</small></button>
    <section class="chalkboard" aria-label="Thực đơn hôm nay">
      <h1>🥣 MENU HÔM NAY</h1>
      <div class="chalk-items">${menuItems}</div>
      <div class="chalk-extras"><span>Size M <b>chuẩn vị</b></span><span>Size L <b>+${formatMoneyCompact(sizeLPrice)}</b></span></div>
    </section>
    ${navigation}
    <section class="prep-pane" aria-live="polite">${content}</section>
  </div>`;
}

export function renderPreparationAction(state) {
  const isSummary = state.gameplay.status === "summary";
  const action = isSummary ? "show-summary" : "start-day";
  const label = isSummary ? "Xem tổng kết ngày" : "Mở bán";
  return `<div class="prep-bottom-action"><button class="button button-primary prep-primary-action" data-action="${action}">${label}</button></div>`;
}
