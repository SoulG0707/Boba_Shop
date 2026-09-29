import { estimateCustomerDemand } from "../systems/preparation.js";
import { escapeHtml } from "./helpers.js";

export function renderPreparationShell(state, navigation, content, preparation, activeRoute) {
  const ready = preparation.canOpen;
  const title = ready
    ? "Sẵn sàng mở bán"
    : !preparation.hasAnyStock
      ? state.day === 1 ? "Chuẩn bị ngày đầu tiên" : `Chuẩn bị ngày ${state.day}`
      : "Chưa đủ nguyên liệu để mở bán";
  const icon = ready ? "✓" : "⚠";
  let guidance;

  if (ready) {
    const portions = preparation.sellableProducts.slice(0, 3).map((product) =>
      `<li>${escapeHtml(product.name)} <strong>~${product.producibleCount} phần</strong></li>`,
    ).join("");
    const additional = Math.max(0, preparation.sellableProducts.length - 3);
    guidance = `<p>Có thể làm:</p><ul class="preparation-product-list">${portions}${additional ? `<li>và ${additional} món khác</li>` : ""}</ul>`;
  } else if (!preparation.hasAnyStock) {
    guidance = `<p>Bạn chưa có nguyên liệu. Hãy nhập hàng trước khi mở bán.</p>`;
  } else if (preparation.recommendedProduct) {
    const missing = preparation.missingIngredients.map((ingredient) => escapeHtml(ingredient.name)).join(" · ");
    guidance = `<p>Để bán <strong>${escapeHtml(preparation.recommendedProduct.name)}</strong> còn thiếu: ${missing || "nguyên liệu theo công thức"}.</p>`;
  } else {
    guidance = `<p>${escapeHtml(preparation.message)}</p>`;
  }

  const buyLink = !ready && activeRoute === "inventory"
    ? `<button type="button" class="prep-stock-link" data-action="focus-inventory-list">Nhập hàng</button>`
    : "";

  return `<div class="prep-world">
    <section class="prep-status-card ${ready ? "is-ready" : "is-blocked"}" aria-live="polite">
      <div class="prep-status-main"><span class="prep-status-icon" aria-hidden="true">${icon}</span><div class="prep-status-copy"><h1>${title}</h1>${guidance}</div>${navigation}</div>
      ${buyLink}
    </section>
    <div class="estimated-customers" aria-label="Lượng khách dự kiến">👥 <strong>Dự kiến ~${estimateCustomerDemand(state)} khách</strong></div>
    <section class="prep-pane" aria-live="polite">${content}</section>
  </div>`;
}

export function renderPreparationAction(state, preparation) {
  if (state.gameplay.status === "summary") {
    return `<div class="prep-bottom-action"><button class="button button-primary prep-primary-action" data-action="show-summary">Xem tổng kết ngày</button></div>`;
  }

  if (!preparation.canOpen) {
    return `<div class="prep-bottom-action"><button class="button button-primary prep-primary-action" data-action="start-day" disabled aria-disabled="true">Chuẩn bị nguyên liệu để mở cửa</button></div>`;
  }

  return `<div class="prep-bottom-action"><button class="button button-primary prep-primary-action" data-action="start-day">Mở cửa ngày ${state.day}</button></div>`;
}
