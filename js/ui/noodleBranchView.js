import { NOODLE_MENU } from "../data/noodleMenu.js";
import { INGREDIENT_BY_ID } from "../data/ingredients.js";
import { canCraftRecipe } from "../systems/inventory.js";
import { calculateNoodleCost } from "../systems/noodleBranch.js";
import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

export function renderNoodleBranchView(state) {
  const menu = NOODLE_MENU.map((item) => {
    const recipe = Object.entries(item.recipe).map(([ingredientId, quantity]) => `${quantity} ${INGREDIENT_BY_ID[ingredientId].name}`).join(" · ");
    const cost = calculateNoodleCost(state, item.id);
    const price = state.noodleBranch.sellPrices[item.id] ?? item.price;
    const available = canCraftRecipe(state, item.recipe);
    return `<article class="card product-card"><div class="product-title"><span class="product-emoji">${item.emoji}</span><div><h2>${escapeHtml(item.name)}</h2><span class="tiny muted">${escapeHtml(item.description)}</span></div></div><p class="tiny">Công thức: ${escapeHtml(recipe)}</p><div class="ingredient-meta"><span>Giá bán</span><strong>${formatMoney(price)}</strong></div><div class="ingredient-meta"><span>Giá vốn / lãi gộp</span><strong>${formatMoney(cost)} / ${formatMoney(price - cost)}</strong></div><button class="button button-primary" data-action="sell-noodle" data-noodle="${item.id}" ${!available || state.gameplay.status !== "running" ? "disabled" : ""}>${available ? "Bán một tô" : "Thiếu nguyên liệu"}</button></article>`;
  }).join("");
  const status = state.gameplay.status === "running" ? "Đang mở cửa" : state.gameplay.status === "paused" ? "Quán trà đang tạm dừng" : "Mở ngày bán hàng để nhận đơn";
  return `${renderPageHeading(state.noodleBranch.name, "Chi nhánh hai dùng chung quỹ tiền, kho nguyên liệu và ngày kinh doanh với tiệm trà.")}<div class="page-content"><section class="card card-soft"><div class="card-head"><div><h2>Quỹ tiền chung</h2><p>Tiền bán mì được cộng vào cùng két của Tiệm Trà.</p></div><span class="pill">${escapeHtml(status)}</span></div><div class="grid-3"><div class="summary-item"><small>Tổng tô đã bán</small><strong>${state.noodleBranch.customersServed}</strong></div><div class="summary-item"><small>Doanh thu Mì Cay</small><strong>${formatMoney(state.noodleBranch.totalRevenue)}</strong></div><div class="summary-item"><small>Doanh thu hôm nay</small><strong>${formatMoney(state.dailyStats.noodleRevenue)}</strong></div></div><button class="button button-quiet" data-navigate="inventory">Mua nguyên liệu Mì Cay →</button></section><div class="grid-2">${menu}</div></div>`;
}
