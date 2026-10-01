import { GAME_CONFIG } from "../config.js";
import { INGREDIENTS } from "../data/ingredients.js";
import { getPendingPurchaseSummary } from "../systems/inventory.js";
import { getIngredientPreparationStatus } from "../systems/preparation.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";
import { renderFoodAsset } from "./foodAssets.js";

const CATEGORY_ICONS = Object.freeze({ "Bánh tráng": "rice_paper", "Gia vị": "shrimp_salt", Topping: "green_mango", "Đóng gói": "food_box" });
let selectedCategory = INGREDIENTS[0]?.category ?? "Bánh tráng";

export function setInventoryCategory(category) {
  const validCategories = new Set(INGREDIENTS.map((ingredient) => ingredient.category));
  if (validCategories.has(category)) selectedCategory = category;
}

export function renderInventoryView(state, presentation = {}) {
  const stock = state.stock ?? {};
  const pendingPurchase = presentation.pendingPurchase ?? {};
  const preparation = presentation.preparation ?? { recommendedRequirements: [] };
  const categories = [...new Set(INGREDIENTS.map((ingredient) => ingredient.category))].map((category) => ({
    id: category,
    label: category,
    icon: CATEGORY_ICONS[category] ?? "food_box",
  }));
  const categoryTabs = categories.map(({ id, label, icon }) => {
    const active = selectedCategory === id;
    return `<button type="button" class="ingredient-category-tab ${active ? "is-active" : ""}" role="tab" aria-selected="${active}" data-action="inventory-category" data-category="${escapeHtml(id)}">${renderFoodAsset(icon, "category-asset")}<span>${escapeHtml(label)}</span></button>`;
  }).join("");
  const visibleIngredients = INGREDIENTS.filter((ingredient) => ingredient.category === selectedCategory);
  const rows = visibleIngredients.map((ingredient) => {
    const entry = stock[ingredient.id] ?? {};
    const quantity = Math.max(0, Number(entry.quantity) || 0);
    const pendingQuantity = Math.max(0, Number(pendingPurchase[ingredient.id]) || 0);
    const lineCost = pendingQuantity * ingredient.purchasePrice;
    const prepStatus = getIngredientPreparationStatus(
      ingredient.id,
      quantity,
      pendingQuantity,
      preparation.recommendedRequirements ?? [],
    );
    const firstExpiry = Array.isArray(entry.batches) && entry.batches.length
      ? Math.min(...entry.batches.map((batch) => Number(batch.expireDay)).filter(Number.isFinite))
      : null;
    const daysLeft = firstExpiry == null ? null : Math.max(0, firstExpiry - state.day);
    const expiryLabel = daysLeft == null ? "Chưa nhập" : daysLeft === 0 ? "HSD hôm nay" : `HSD ${daysLeft} ngày`;
    const expiryClass = daysLeft === 0 ? "is-expiring" : "";
    const disabled = state.gameplay.status === "summary";
    const warning = prepStatus.status === "missing" || prepStatus.status === "pending-ready"
      ? `<small class="inventory-prep-feedback ${prepStatus.status === "missing" ? "is-missing" : "is-projected-ready"}" role="status">${escapeHtml(prepStatus.message)}</small>`
      : "";
    const subtotal = pendingQuantity > 0
      ? `<small class="inventory-line-cost">+${formatQuantity(pendingQuantity)} · ${formatMoneyCompact(lineCost, { maximumFractionDigits: 2 })}</small>`
      : "";

    return `<article class="prep-row inventory-row ${prepStatus.status === "missing" ? "has-prep-shortage" : ""}" data-ingredient-row="${ingredient.id}">
      <span class="row-emoji" aria-hidden="true">${renderFoodAsset(ingredient.id, "ingredient-asset")}</span>
      <div class="row-copy inventory-copy">
        <div class="inventory-row-heading"><strong>${escapeHtml(ingredient.name)}</strong><small class="inventory-expiry ${expiryClass}">${expiryLabel}</small></div>
        <div class="inventory-meta"><span>📦 Đang có: ${formatQuantity(quantity)} ${escapeHtml(ingredient.unit)}</span><span>💰 ${formatMoneyCompact(ingredient.purchasePrice)} / ${escapeHtml(ingredient.unit)}</span></div>
        ${warning}${subtotal}
      </div>
      <div class="inventory-quantity-control" aria-label="Số lượng ${escapeHtml(ingredient.name)} muốn nhập">
        <button type="button" class="inventory-quantity-button" data-action="change-pending-purchase" data-ingredient="${ingredient.id}" data-direction="-1" aria-label="Giảm ${escapeHtml(ingredient.name)} ${GAME_CONFIG.PURCHASE_STEP}" ${pendingQuantity <= 0 || disabled ? "disabled" : ""}>−</button>
        <output class="inventory-quantity" aria-label="Số lượng dự kiến">${formatQuantity(pendingQuantity)}</output>
        <button type="button" class="inventory-quantity-button" data-action="change-pending-purchase" data-ingredient="${ingredient.id}" data-direction="1" aria-label="Tăng ${escapeHtml(ingredient.name)} ${GAME_CONFIG.PURCHASE_STEP}" ${pendingQuantity >= GAME_CONFIG.MAX_PENDING_PURCHASE_PER_ITEM || disabled ? "disabled" : ""}>+</button>
      </div>
    </article>`;
  }).join("");
  const expiringLots = INGREDIENTS.reduce((sum, ingredient) => {
    const batches = stock[ingredient.id]?.batches;
    return sum + (Array.isArray(batches) ? batches.filter((batch) => batch.expireDay <= state.day).length : 0);
  }, 0);
  const pendingItemCount = Object.values(pendingPurchase).filter((quantity) => Number(quantity) > 0).length;
  const pendingUnitCount = Object.values(pendingPurchase).reduce((sum, quantity) => sum + Math.max(0, Number(quantity) || 0), 0);
  const cartTotal = getPendingPurchaseSummary(pendingPurchase);
  const budgetNote = cartTotal.itemCount && cartTotal.totalCost > state.money
    ? `<small class="pending-cart-budget">Bạn có ${formatMoneyCompact(state.money, { maximumFractionDigits: 2 })} · Đang chọn ${formatMoneyCompact(cartTotal.totalCost, { maximumFractionDigits: 2 })}</small>`
    : "";

  return `<section class="inventory-preparation" aria-label="Chuẩn bị nhập nguyên liệu">
    <div class="inventory-heading"><h2>Nhập hàng</h2><small>${visibleIngredients.length} / ${INGREDIENTS.length} nguyên liệu</small></div>
    <div class="ingredient-category-tabs" role="tablist" aria-label="Nhóm nguyên liệu">${categoryTabs}</div>
    ${pendingItemCount ? `<div class="pending-cart-summary" role="status"><span>🧺 Đang chọn</span><strong>${pendingItemCount} nguyên liệu · ${formatQuantity(pendingUnitCount)} đơn vị</strong><small>Chưa trừ tiền hoặc cộng kho</small>${budgetNote}</div>` : ""}
    <div id="ingredient-list" class="prep-list inventory-list" role="tabpanel" tabindex="-1" aria-label="Danh sách nguyên liệu">${rows}</div>
    <div class="stock-legend"><span>Tồn kho thật</span><span>Chọn theo bước ${GAME_CONFIG.PURCHASE_STEP}</span><span>${expiringLots ? `${expiringLots} lô hết hạn hôm nay` : "Không có lô hết hạn hôm nay"}</span></div>
  </section>`;
}

function formatQuantity(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}
