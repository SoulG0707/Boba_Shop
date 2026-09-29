import { PRODUCTS, PRODUCT_OPTIONS, getProductPrice, getProductRecipe } from "../data/products.js";
import { INGREDIENT_BY_ID } from "../data/ingredients.js";
import { calculateDemandModifier, calculateProductCost } from "../systems/economy.js";
import { escapeHtml, formatMoneyCompact, renderPageHeading } from "./helpers.js";
import { renderFoodAsset } from "./foodAssets.js";

export function renderPricesView(state) {
  const rows = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id)).map((product) => {
    const cost = calculateProductCost(state, product.id);
    const profit = state.sellPrices[product.id] - cost;
    const demand = calculateDemandModifier(state, product.id);
    const recipe = Object.entries(getProductRecipe(product.id)).map(([id, qty]) => `${qty} ${ingredientName(id)}`).join(" · ");
    const smallPrice = getProductPrice(product.id, state.sellPrices, { size: "M" });
    const largePrice = getProductPrice(product.id, state.sellPrices, { size: "L" });
    return `<div class="prep-row price-row"><span class="row-emoji">${renderFoodAsset(product.icon, "product-asset")}</span><div class="row-copy"><strong>${escapeHtml(product.name)} (Bé)</strong><small class="price-size-variant">${escapeHtml(product.name)} (Lớn) · ${formatMoneyCompact(largePrice)}</small><small>${escapeHtml(recipe)}</small><small class="price-note">Vốn ${formatMoneyCompact(cost)} · Lãi ${formatMoneyCompact(profit)} · Nhu cầu ${Math.round(demand * 100)}%</small></div><label class="price-control"><small>Giá Bé · ${formatMoneyCompact(smallPrice)}</small><span class="price-input-wrap"><input class="price-input" type="number" min="1" step="1" value="${Math.round(state.sellPrices[product.id] / 1_000)}" data-price-product="${product.id}" aria-label="Giá Bé ${escapeHtml(product.name)}"><span>k</span></span></label></div>`;
  }).join("");
  return `${renderPageHeading("Giá bán", "Đổi giá tại đây để menu và sức mua cập nhật cùng lúc.")}<div class="prep-list">${rows}</div><p class="prep-tip">Size Lớn cộng ${formatMoneyCompact(PRODUCT_OPTIONS.sizes.L.priceModifier)} và cần thêm nguyên liệu.</p>`;
}

function ingredientName(id) {
  return INGREDIENT_BY_ID[id]?.name ?? id;
}
