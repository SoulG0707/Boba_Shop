import { INGREDIENTS } from "../data/ingredients.js";
import { formatMoneyCompact, escapeHtml } from "./helpers.js";
import { renderFoodAsset } from "./foodAssets.js";

const ALL_CATEGORIES = "__all__";
const CATEGORY_ICONS = Object.freeze({ "Bánh tráng": "rice_paper", "Gia vị": "shrimp_salt", Topping: "green_mango", "Đóng gói": "food_box" });
let selectedCategory = ALL_CATEGORIES;

export function setInventoryCategory(category) {
  const validCategories = new Set([ALL_CATEGORIES, ...INGREDIENTS.map((ingredient) => ingredient.category)]);
  if (validCategories.has(category)) selectedCategory = category;
}

export function renderInventoryView(state) {
  const stock = state.stock ?? {};
  const categories = [...new Set(INGREDIENTS.map((ingredient) => ingredient.category))].map((category) => ({
    id: category,
    label: category,
    icon: CATEGORY_ICONS[category] ?? "food_box",
    count: INGREDIENTS.filter((ingredient) => ingredient.category === category).length,
  }));
  const categoryTabs = categories.map(({ id, label, icon }) => {
    const active = selectedCategory === id;
    return `<button class="ingredient-category-tab ${active ? "is-active" : ""}" role="tab" aria-selected="${active}" data-action="inventory-category" data-category="${escapeHtml(id)}">${renderFoodAsset(icon, "category-asset")}<span>${escapeHtml(label)}</span></button>`;
  }).join("");
  const visibleIngredients = INGREDIENTS.filter((ingredient) =>
    selectedCategory === ALL_CATEGORIES || ingredient.category === selectedCategory,
  );
  const rows = visibleIngredients.map((ingredient) => {
    const entry = stock[ingredient.id] ?? {};
    const quantity = Math.max(0, Number(entry.quantity) || 0);
    const firstExpiry = Array.isArray(entry.batches) && entry.batches.length
      ? Math.min(...entry.batches.map((batch) => Number(batch.expireDay)).filter(Number.isFinite))
      : null;
    const daysLeft = firstExpiry == null ? null : Math.max(0, firstExpiry - state.day);
    const expiryLabel = daysLeft == null ? "Chưa nhập" : daysLeft === 0 ? "HSD hôm nay" : `HSD ${daysLeft} ngày`;
    const expiryClass = daysLeft === 0 ? "is-expiring" : "";
    const canBuyTen = state.money >= ingredient.purchasePrice * 10;
    const canBuyFifty = state.money >= ingredient.purchasePrice * 50;

    return `<article class="prep-row inventory-row">
      <span class="row-emoji" aria-hidden="true">${renderFoodAsset(ingredient.id, "ingredient-asset")}</span>
      <div class="row-copy inventory-copy">
        <div class="inventory-row-heading"><strong>${escapeHtml(ingredient.name)}</strong><small class="inventory-expiry ${expiryClass}">${expiryLabel}</small></div>
        <div class="inventory-meta"><span>📦 ${formatQuantity(quantity)} ${escapeHtml(ingredient.unit)}</span><span>💰 ${formatMoneyCompact(ingredient.purchasePrice)} / ${escapeHtml(ingredient.unit)}</span></div>
      </div>
      <div class="row-actions inventory-buy-actions">
        <button class="button button-small button-cream" data-action="buy-stock" data-ingredient="${ingredient.id}" data-quantity="10" aria-label="Nhập 10 ${escapeHtml(ingredient.name)}" ${canBuyTen ? "" : "disabled"}>+10</button>
        <button class="button button-small button-cream" data-action="buy-stock" data-ingredient="${ingredient.id}" data-quantity="50" aria-label="Nhập 50 ${escapeHtml(ingredient.name)}" ${canBuyFifty ? "" : "disabled"}>+50</button>
      </div>
    </article>`;
  }).join("");
  const expiringLots = INGREDIENTS.reduce((sum, ingredient) => {
    const batches = stock[ingredient.id]?.batches;
    return sum + (Array.isArray(batches) ? batches.filter((batch) => batch.expireDay <= state.day).length : 0);
  }, 0);

  return `<section class="inventory-preparation" aria-label="Chuẩn bị nguyên liệu">
    <div class="inventory-heading"><h2>Nhập hàng</h2><small>${visibleIngredients.length} / ${INGREDIENTS.length} nguyên liệu</small></div>
    <div class="ingredient-category-tabs" role="tablist" aria-label="Nhóm nguyên liệu">${categoryTabs}</div>
    <div id="ingredient-list" class="prep-list inventory-list" role="tabpanel" tabindex="-1" aria-label="Danh sách nguyên liệu">${rows}</div>
    <div class="stock-legend"><span>Tồn kho</span><span>Giá nhập</span><span>${expiringLots ? `${expiringLots} lô hết hạn hôm nay` : "Không có lô hết hạn hôm nay"}</span></div>
  </section>`;
}

function formatQuantity(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}
