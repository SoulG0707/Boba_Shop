import { PRODUCTS, PRODUCT_OPTIONS } from "../data/products.js";
import { formatMoney } from "../config.js";
import { escapeHtml } from "./helpers.js";

export function renderPreparationShell(state, navigation, content) {
  const menuItems = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id)).map((product) =>
    `<div class="chalk-row"><span>${escapeHtml(product.name)}</span><strong>${formatMoney(state.sellPrices[product.id] ?? product.basePrice)}</strong></div>`,
  ).join("");
  const toppingPrice = PRODUCT_OPTIONS.toppings.blackPearl.price;
  const largePrice = Math.round((state.sellPrices[PRODUCTS[0].id] ?? PRODUCTS[0].basePrice) * (PRODUCT_OPTIONS.sizes.large.priceMultiplier - 1));

  return `<div class="prep-world">
    <section class="chalkboard" aria-label="Thực đơn hôm nay">
      <span class="chalkboard-kicker">Tiệm Trà Mơ Ước</span>
      <h1>MENU HÔM NAY</h1>
      <div class="chalk-items">${menuItems}</div>
      <div class="chalk-extras"><span>Trân châu <b>+${formatMoney(toppingPrice)}</b></span><span>Size L <b>+${formatMoney(largePrice)}</b></span></div>
    </section>
    ${navigation}
    <section class="prep-pane" aria-live="polite">${content}</section>
  </div>`;
}
