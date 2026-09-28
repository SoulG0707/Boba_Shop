import { formatMoney } from "../config.js";
import { EMPLOYEE_ROLES } from "../data/employees.js";
import { getAverageRating } from "../systems/reviews.js";
import { escapeHtml, renderPageHeading, renderStatCard } from "./helpers.js";

export function renderDashboard(state) {
  const rating = getAverageRating(state);
  const staff = EMPLOYEE_ROLES.map((role) => {
    const employee = state.employees.find((candidate) => candidate.role === role.id);
    return `<div class="list-row"><div><strong>${escapeHtml(role.name)}</strong><div class="tiny muted">${escapeHtml(role.description)}</div></div>${employee
      ? `<button class="button button-small button-quiet" data-action="fire-employee" data-employee="${employee.id}">Đang làm · Nghỉ việc</button>`
      : `<button class="button button-small" data-action="hire-employee" data-role="${role.id}">Tuyển · ${formatMoney(role.hireCost)}</button>`}</div>`;
  }).join("");
  return `${renderPageHeading("Tiệm trà của bạn", "Mỗi ngày là một cơ hội để phục vụ thêm khách và làm tiệm tốt hơn.")}
    <div class="page-content"><section class="card hero-card"><span class="pill">Ngày ${state.day} · ${state.gameplay.status === "preparation" ? "Sẵn sàng mở cửa" : "Bán hàng đang diễn ra"}</span><h2 style="font-size:clamp(1.5rem,4vw,2.4rem);margin:.75rem 0">Chào mừng bạn đến với ${escapeHtml(state.shopName)}!</h2><p>Pha một ly trà ngon, chăm chút kho nguyên liệu và để khách quen truyền tin vui khắp khu phố.</p><button class="button button-primary" data-navigate="gameplay">${state.gameplay.status === "preparation" ? "Mở cửa bán hàng →" : "Quay lại quầy →"}</button></section>
    <div class="grid-4">${renderStatCard("💰", "Số dư hiện tại", formatMoney(state.money))}${renderStatCard("⭐", "Đánh giá tiệm", `${rating.toFixed(1)} / 5`, `${state.reviews.length} lượt đánh giá gần đây`)}${renderStatCard("🧋", "Khách đã phục vụ", state.customersServed.toLocaleString("vi-VN"))}${renderStatCard("📈", "Doanh thu hôm nay", formatMoney(state.dailyStats.revenue))}</div>
    <div class="grid-2"><section class="card"><div class="card-head"><h2>Hôm nay ở tiệm</h2><span class="pill">Ngày ${state.day}</span></div><div class="list-row"><span class="muted">Khách phục vụ</span><strong>${state.dailyStats.customersServed}</strong></div><div class="list-row"><span class="muted">Doanh thu Mì Cay</span><strong>${formatMoney(state.dailyStats.noodleRevenue ?? 0)}</strong></div><div class="list-row"><span class="muted">Đơn online</span><strong>${state.dailyStats.onlineOrders}</strong></div><div class="list-row"><span class="muted">Lợi nhuận tạm tính</span><strong>${formatMoney(state.dailyStats.revenue - state.dailyStats.ingredientCost)}</strong></div><div class="button-row" style="margin-top:1rem"><button class="button button-quiet" data-navigate="inventory">Kiểm tra kho</button><button class="button button-quiet" data-navigate="prices">Chỉnh giá món</button><button class="button button-quiet" data-navigate="noodles">Mở chi nhánh Mì Cay</button></div></section>
    <section class="card"><div class="card-head"><h2>Đội ngũ tiệm</h2><span class="pill">${state.employees.length} / ${EMPLOYEE_ROLES.length}</span></div>${staff}</section></div></div>`;
}
