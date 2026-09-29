import { PRODUCTS, PRODUCT_OPTIONS } from "../data/products.js";
import { formatMoney } from "../config.js";
import { escapeHtml } from "./helpers.js";

export function renderPreparationShell(state, navigation, content) {
  const menuItems = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id)).map((product) =>
    `<div class="chalk-row"><span>${escapeHtml(product.name)}</span><strong>${formatMoney(state.sellPrices[product.id] ?? product.basePrice)}</strong></div>`,
  ).join("");
  const sizeLPrice = PRODUCT_OPTIONS.sizes.L.priceModifier;

  return `<div class="prep-world">
    <section class="chalkboard" aria-label="Thực đơn hôm nay">
      <span class="chalkboard-kicker">TIỆM BÁNH TRÁNG TRỘN</span>
      <h1>MENU HÔM NAY</h1>
      <div class="chalk-items">${menuItems}</div>
      <div class="chalk-extras"><span>Size M <b>chuẩn vị</b></span><span>Size L <b>+${formatMoney(sizeLPrice)}</b></span></div>
    </section>
    ${navigation}
    <section class="prep-pane" aria-live="polite">${content}</section>
  </div>`;
}
