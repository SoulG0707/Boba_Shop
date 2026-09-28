import { formatMoney } from "../config.js";
import { escapeHtml } from "./helpers.js";

export function renderStatsView(state) {
  const rows = state.history.map((day) => `<div class="ledger-row"><div><strong>Ngày ${day.day}</strong><small>${day.customersServed} khách · ${day.onlineOrders} đơn online · Mì Cay ${formatMoney(day.noodleRevenue ?? 0)}</small></div><div class="ledger-total"><strong>${formatMoney(day.revenue)}</strong><small class="${day.profit < 0 ? "money-negative" : "money-positive"}">${day.profit < 0 ? "−" : "+"}${formatMoney(Math.abs(day.profit))}</small></div></div>`).join("");
  const stats = state.dailyStats;

  return `<div class="page-heading"><div><h2>Sổ cuối ngày</h2><p>${escapeHtml(state.shopName)} · ${state.history.length} ngày đã hoàn thành</p></div><span class="pill">Ngày ${state.day}</span></div>
    <section class="ledger-book"><div class="ledger-row"><div><strong>Doanh thu hôm nay</strong><small>Trà và Mì Cay</small></div><strong>${formatMoney(stats.revenue)}</strong></div><div class="ledger-row"><div><strong>Nguyên liệu đã dùng</strong><small>Giá vốn theo từng lô</small></div><strong>−${formatMoney(stats.ingredientCost)}</strong></div><div class="ledger-row"><div><strong>Nhân viên</strong><small>Lương cuối ngày</small></div><strong>−${formatMoney(stats.salaryCost)}</strong></div><div class="ledger-row"><div><strong>Thuê quán & tiện ích</strong><small>Chi phí cố định</small></div><strong>−${formatMoney(stats.rent + stats.utilities)}</strong></div><div class="ledger-row"><div><strong>Hao hụt, thuế</strong><small>Hàng hết hạn và thuế</small></div><strong>−${formatMoney(stats.expiredStockCost + stats.tax)}</strong></div><div class="ledger-row ledger-final"><div><strong>Lợi nhuận tạm tính</strong><small>Tiền mua kho tính riêng</small></div><strong>${formatMoney(stats.profit)}</strong></div></section>
    <section class="ledger-book ledger-history"><h3>Những ngày đã qua</h3>${rows || `<div class="empty-state">Sổ sẽ có dòng đầu tiên sau khi kết thúc ngày bán hàng.</div>`}</section>`;
}
