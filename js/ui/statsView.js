import { formatMoneyCompact, escapeHtml } from "./helpers.js";

export function renderStatsView(state) {
  const rows = state.history.map((day) => `<div class="ledger-row"><div><strong>Ngày ${day.day}</strong><small>${day.customersServed} khách · ${day.onlineOrders} đơn giao</small></div><div class="ledger-total"><strong>${formatMoneyCompact(day.revenue)}</strong><small class="${day.profit < 0 ? "money-negative" : "money-positive"}">${day.profit < 0 ? "−" : "+"}${formatMoneyCompact(Math.abs(day.profit))}</small></div></div>`).join("");
  const stats = state.dailyStats;
  const hasToday = stats.customersServed > 0 || stats.revenue > 0 || state.gameplay.status === "summary";
  const hasSummary = state.history.length > 0 || hasToday;
  const dailyLedger = `<section class="ledger-book">
    <div class="ledger-row"><div><strong>Doanh thu hôm nay</strong><small>Bán tại quầy và đơn giao</small></div><strong>${formatMoneyCompact(stats.revenue)}</strong></div>
    <div class="ledger-row"><div><strong>Nguyên liệu đã dùng</strong><small>Giá vốn theo từng lô</small></div><strong>−${formatMoneyCompact(stats.ingredientCost)}</strong></div>
    <div class="ledger-row"><div><strong>Nhân viên</strong><small>Lương cuối ngày</small></div><strong>−${formatMoneyCompact(stats.salaryCost)}</strong></div>
    <div class="ledger-row"><div><strong>Thuê quầy & tiện ích</strong><small>Chi phí cố định</small></div><strong>−${formatMoneyCompact(stats.rent + stats.utilities)}</strong></div>
    <div class="ledger-row"><div><strong>Hao hụt, thuế</strong><small>Hàng hết hạn và thuế</small></div><strong>−${formatMoneyCompact(stats.expiredStockCost + stats.tax)}</strong></div>
    <div class="ledger-row ledger-final"><div><strong>Lợi nhuận tạm tính</strong><small>Tiền nhập kho tính riêng</small></div><strong>${formatMoneyCompact(stats.profit)}</strong></div>
  </section>`;
  const history = state.history.length
    ? `<section class="ledger-book ledger-history"><h3>Những ngày đã qua</h3>${rows}</section>`
    : "";

  return `<div class="page-heading"><div><h2>Tổng kết</h2><p>${escapeHtml(state.shopName)} · ${state.history.length} ngày hoàn thành</p></div><span class="pill">Ngày ${state.day}</span></div>
    ${hasSummary ? `${hasToday ? dailyLedger : ""}${history}` : `<div class="empty-state compact-empty">📒 Chưa có dữ liệu.<small>Bán xong ngày đầu tiên sẽ có thống kê.</small></div>`}`;
}
