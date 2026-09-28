import { formatMoney } from "../config.js";
import { escapeHtml, formatStars } from "./helpers.js";

export function showModal(title, body, subtitle = "") {
  const layer = document.querySelector("#modal");
  const content = document.querySelector("#modal-content");
  content.innerHTML = `<h2 id="modal-title" class="modal-title">${escapeHtml(title)}</h2>${subtitle ? `<p class="modal-subtitle">${escapeHtml(subtitle)}</p>` : ""}${body}`;
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
}

export function hideModal() {
  const layer = document.querySelector("#modal");
  layer.classList.remove("is-open");
  layer.setAttribute("aria-hidden", "true");
  document.querySelector("#modal-content").replaceChildren();
}

export function showEndDayModal(stats, day) {
  const profitClass = stats.profit >= 0 ? "pill-green" : "pill-yellow";
  const body = `<div class="endday-summary"><div class="summary-ribbon"><img src="./img/icons/calendar.png" alt=""><span>SỔ CUỐI NGÀY · NGÀY ${day}</span></div><div class="summary-grid">
    <div class="summary-item"><small>Doanh thu</small><strong>${formatMoney(stats.revenue)}</strong></div>
    <div class="summary-item"><small>Trong đó Mì Cay</small><strong>${formatMoney(stats.noodleRevenue ?? 0)}</strong></div>
    <div class="summary-item"><small>Chi phí vận hành</small><strong>${formatMoney(stats.ingredientCost + stats.salaryCost + stats.rent + stats.utilities + stats.marketingCost + stats.expiredStockCost + stats.tax)}</strong></div>
    <div class="summary-item"><small>Lợi nhuận</small><strong><span class="pill ${profitClass}">${formatMoney(stats.profit)}</span></strong></div>
    <div class="summary-item"><small>Khách phục vụ</small><strong>${stats.customersServed}</strong></div>
    <div class="summary-item"><small>Đơn online</small><strong>${stats.onlineOrders}</strong></div>
    <div class="summary-item"><small>Hàng hết hạn</small><strong>${formatMoney(stats.expiredStockCost)}</strong></div>
    <div class="summary-item"><small>Tiền mua tồn kho</small><strong>${formatMoney(stats.stockPurchases ?? 0)}</strong></div>
    <div class="summary-item"><small>Đánh giá</small><strong>${formatStars(stats.ratingEnd)} ${stats.ratingEnd.toFixed(1)}</strong></div>
    <div class="summary-item"><small>Thay đổi rating</small><strong>${stats.ratingEnd - stats.ratingStart >= 0 ? "+" : ""}${(stats.ratingEnd - stats.ratingStart).toFixed(1)}</strong></div>
  </div><button class="button button-primary" data-action="next-day">Chuẩn bị ngày ${day + 1} →</button></div>`;
  showModal(`Tổng kết ngày ${day}`, body, "Một ngày ở tiệm đã khép lại. Xem kết quả và chuẩn bị cho ngày mai nhé.");
}
