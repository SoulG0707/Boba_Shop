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
    return `<div class="prep-row noodle-row"><span class="row-emoji">${item.emoji}</span><div class="row-copy"><strong>${escapeHtml(item.name)} <small>${formatMoney(price)}</small></strong><small>${escapeHtml(item.description)}</small><small>${escapeHtml(recipe)} · Vốn ${formatMoney(cost)}</small></div><div class="row-actions"><button class="button button-small button-primary" data-action="sell-noodle" data-noodle="${item.id}" ${!available || state.gameplay.status !== "running" ? "disabled" : ""}>${available ? "Bán tô" : "Hết món"}</button></div></div>`;
  }).join("");
  const status = state.gameplay.status === "running" ? "Đang mở cửa" : state.gameplay.status === "paused" ? "Quán trà đang tạm dừng" : "Mở ngày bán hàng để nhận đơn";
  return `${renderPageHeading(state.noodleBranch.name, "Bếp mì chung két tiền, kho nguyên liệu và ngày kinh doanh với tiệm trà.")}<section class="branch-ledger"><div class="branch-status"><strong>${escapeHtml(status)}</strong><button class="button button-small button-quiet" data-navigate="inventory">Mua nguyên liệu →</button></div><div class="branch-stats"><span><small>Đã bán</small><strong>${state.noodleBranch.customersServed} tô</strong></span><span><small>Doanh thu mì</small><strong>${formatMoney(state.noodleBranch.totalRevenue)}</strong></span><span><small>Hôm nay</small><strong>${formatMoney(state.dailyStats.noodleRevenue)}</strong></span></div></section><div class="page-heading branch-menu-heading"><div><h3>Món mì</h3><p>Giá vốn được tính theo lượng nguyên liệu còn trong kho.</p></div></div><div class="prep-list">${menu}</div>`;
}
