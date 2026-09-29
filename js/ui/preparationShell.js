import { PRODUCTS, PRODUCT_OPTIONS } from "../data/products.js";
import { estimateCustomerDemand } from "../systems/preparation.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";

export function renderPreparationShell(state, navigation, content, preparation) {
  const sellable = new Map(preparation.sellableProducts.map((product) => [product.id, product]));
  const productLines = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id)).map((product) => {
    const current = sellable.get(product.id);
    return `<div class="menu-board-item"><span>${escapeHtml(product.name)}</span><strong>${formatMoneyCompact(state.sellPrices[product.id] ?? product.basePrice)}</strong>${current ? `<small>~${current.producibleCount} phần</small>` : ""}</div>`;
  }).join("");
  const extraLines = `<div class="menu-board-item"><span>Thêm trứng cút</span><strong>+${formatMoneyCompact(5_000)}</strong></div><div class="menu-board-item"><span>Size L</span><strong>+${formatMoneyCompact(PRODUCT_OPTIONS.sizes.L.priceModifier)}</strong></div>`;

  let statusTitle;
  let statusCopy;
  let statusIcon;
  let statusClass;
  if (preparation.canOpen) {
    statusTitle = "Hôm nay · Sẵn sàng mở bán";
    const names = preparation.sellableProducts.slice(0, 2).map((product) => `${product.name} ~${product.producibleCount} phần`).join(" · ");
    statusCopy = names ? `Đủ nguyên liệu cho ${names}.` : "Đã có nguyên liệu cho ít nhất một món.";
    statusIcon = "✓";
    statusClass = "is-ready";
  } else if (preparation.recommendedProduct) {
    const missing = preparation.missingIngredients.map((ingredient) => ingredient.name).join(" · ");
    statusTitle = "Hôm nay · Chưa đủ nguyên liệu";
    statusCopy = `Còn thiếu ${missing || "nguyên liệu"} để bán ${preparation.recommendedProduct.name}.`;
    statusIcon = "!";
    statusClass = "is-blocked";
  } else {
    statusTitle = "Hôm nay · Chưa đủ nguyên liệu";
    statusCopy = "Nhập đủ nguyên liệu cho ít nhất một món để mở quầy.";
    statusIcon = "!";
    statusClass = "is-blocked";
  }

  return `<div class="prep-world">
    <div class="shop-sign"><span class="shop-sign-flourish" aria-hidden="true">✦</span><span>${escapeHtml(state.shopName)}</span><button type="button" data-action="edit-shop-name" aria-label="Đổi tên tiệm">✎</button><span class="shop-sign-flourish" aria-hidden="true">✦</span></div>
    <section class="menu-board" aria-label="Menu hôm nay">
      <h1><span aria-hidden="true">${renderBowlMark()}</span> MENU HÔM NAY</h1>
      <div class="menu-board-grid">${productLines}${extraLines}</div>
    </section>
    <section class="prep-pane" aria-live="polite">
      ${navigation}
      <div class="prep-status-card ${statusClass}" aria-live="polite"><span class="prep-status-icon" aria-hidden="true">${statusIcon}</span><span class="prep-status-copy"><strong>${statusTitle}</strong><small>${escapeHtml(statusCopy)}</small></span></div>
      <div class="estimated-customers" aria-label="Lượng khách dự kiến"><span aria-hidden="true">👥</span><strong>Dự kiến ~${estimateCustomerDemand(state)} khách</strong></div>
      ${content}
    </section>
  </div>`;
}

function renderBowlMark() {
  return `<svg viewBox="0 0 180 128" aria-hidden="true"><use href="./img/food-assets.svg#mixing_bowl"></use></svg>`;
}

export function renderPreparationAction(state, preparation) {
  if (state.gameplay.status === "summary") {
    return `<div class="prep-bottom-action"><button class="button button-primary prep-primary-action" data-action="show-summary">Xem tổng kết ngày</button></div>`;
  }

  const label = preparation.canOpen
    ? `Mở cửa ngày ${state.day}`
    : `Nhập nguyên liệu để mở cửa`;
  return `<div class="prep-bottom-action"><button class="button button-primary prep-primary-action" data-action="start-day" ${preparation.canOpen ? "" : "disabled aria-disabled=\"true\""}>${label}</button></div>`;
}
