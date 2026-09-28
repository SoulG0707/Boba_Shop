import { PRODUCTS, getProductRecipe } from "../data/products.js";
import { calculateDemandModifier, calculateProductCost, calculateProfitMargin } from "../systems/economy.js";
import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

export function renderPricesView(state) {
  const rows = PRODUCTS.filter((product) => state.unlockedItems.includes(product.id)).map((product) => {
    const cost = calculateProductCost(state, product.id);
    const margin = calculateProfitMargin(state, product.id);
    const demand = calculateDemandModifier(state, product.id);
    const recipe = Object.entries(getProductRecipe(product.id)).map(([id, qty]) => `${qty} ${ingredientName(id)}`).join(" · ");
    return `<div class="prep-row price-row"><span class="row-emoji">${product.emoji}</span><div class="row-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(recipe)}</small><small class="price-note">Vốn ${formatMoney(cost)} · Lãi ${Math.round(margin * 100)}% · Nhu cầu ${Math.round(demand * 100)}%</small></div><label class="price-control"><small>Giá bán</small><input class="price-input" type="number" min="1000" step="1000" value="${state.sellPrices[product.id]}" data-price-product="${product.id}" aria-label="Giá ${escapeHtml(product.name)}"></label></div>`;
  }).join("");
  return `${renderPageHeading("Giá trên menu", "Đổi giá ở đây để menu và sức mua cập nhật cùng lúc.")}<div class="prep-list">${rows}</div><p class="prep-tip">Size lớn và topping được cộng riêng theo công thức.</p>`;
}

function ingredientName(id) {
  return ({ tea: "trà", milk: "sữa", matcha: "matcha", sugar: "đường", blackPearl: "trân châu đen", whitePearl: "trân châu trắng", cup: "ly" })[id] ?? id;
}
