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
    return `<div class="price-row"><div class="product-title"><span class="product-emoji">${product.emoji}</span><div><strong>${escapeHtml(product.name)}</strong><div class="tiny muted">${escapeHtml(recipe)}</div></div></div><label><span class="tiny muted">Giá bán</span><input class="price-input" type="number" min="1000" step="1000" value="${state.sellPrices[product.id]}" data-price-product="${product.id}" aria-label="Giá ${escapeHtml(product.name)}"></label><div class="price-note"><span class="pill ${margin >= .5 ? "pill-green" : "pill-yellow"}">Lãi gộp ${Math.round(margin * 100)}%</span><div class="tiny muted">Giá vốn ${formatMoney(cost)} · Nhu cầu ${Math.round(demand * 100)}%</div></div></div>`;
  }).join("");
  return `${renderPageHeading("Giá bán", "Chọn mức giá có lời nhưng vẫn dễ chịu với khách quen.")}<div class="page-content"><section class="card"><div class="card-head"><div><h2>Thực đơn</h2><p class="tiny">Thay đổi giá sẽ cập nhật sức mua ước tính ngay.</p></div><span class="pill">${PRODUCTS.length} món</span></div>${rows}</section><section class="card card-soft"><strong>Gợi ý nhỏ</strong><p class="tiny">Giá cao hơn có thể tăng lãi trên mỗi ly nhưng làm giảm lượng khách sẵn sàng mua. Món size lớn và topping được tính thêm theo công thức.</p></section></div>`;
}

function ingredientName(id) {
  return ({ tea: "trà", milk: "sữa", matcha: "matcha", sugar: "đường", blackPearl: "trân châu đen", whitePearl: "trân châu trắng", cup: "ly" })[id] ?? id;
}
