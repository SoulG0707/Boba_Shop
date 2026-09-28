import { formatMoney, formatDuration, GAME_CONFIG } from "../config.js";
import { PRODUCT_BY_ID, PRODUCT_OPTIONS } from "../data/products.js";
import { getRemainingSeconds } from "../systems/dayCycle.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

const CUSTOMER_EMOJIS = { regular: "😊", student: "🎒", office: "💼", reviewer: "🧐", online: "📱" };

export function renderGameplayView(state) {
  const status = state.gameplay.status;
  const remaining = getRemainingSeconds(state);
  const ratio = Math.max(0, Math.min(100, (remaining / GAME_CONFIG.DAY_DURATION_SECONDS) * 100));
  const controls = status === "preparation"
    ? `<button class="button button-primary" data-action="start-day">Mở cửa · Bắt đầu ngày</button>`
    : status === "paused"
      ? `<button class="button button-primary" data-action="pause-day">▶ Tiếp tục</button>`
      : status === "summary"
        ? `<button class="button button-primary" data-action="show-summary">Xem tổng kết ngày</button>`
        : `<button class="button button-quiet" data-action="pause-day">Ⅱ Tạm dừng</button>`;
  const orders = state.customers.map((customer) => {
    const order = state.orders.find((candidate) => candidate.id === customer.orderId);
    if (!order) return "";
    const item = order.items[0];
    const product = PRODUCT_BY_ID[item.productId];
    const label = `${product.name} · ${PRODUCT_OPTIONS.sizes[item.size].label} · ${PRODUCT_OPTIONS.toppings[item.topping].label}`;
    const canServe = status === "running" && order.status === "ready";
    const prepText = order.status === "preparing" ? `Đang pha · ${Math.ceil(order.preparationRemaining)}s` : order.status === "ready" ? "Sẵn sàng" : "Đang chờ";
    return `<article class="card order-card"><div class="card-head"><div class="order-main"><span class="customer-avatar">${CUSTOMER_EMOJIS[customer.type] ?? "🙂"}</span><div><strong>${escapeHtml(customer.label)}</strong><div class="tiny muted">${escapeHtml(label)}</div></div></div><span class="pill ${customer.patience < 12 ? "pill-yellow" : ""}">⌛ ${Math.ceil(customer.patience)}s</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, customer.patience / (customer.type === "student" ? 34 : 48) * 100))}%"></div></div><div class="card-head"><span class="pill">${prepText}</span><strong>${formatMoney(order.totalPrice)}</strong></div><div class="order-actions"><button class="button button-small button-quiet" data-action="prepare-order" data-order="${order.id}" ${order.status !== "waiting" || status !== "running" ? "disabled" : ""}>Pha chế</button><button class="button button-small button-primary" data-action="serve-order" data-order="${order.id}" ${!canServe ? "disabled" : ""}>Phục vụ ✓</button></div></article>`;
  }).join("");
  const onlineOrders = state.onlineOrders.filter((order) => ["waiting", "preparing", "ready"].includes(order.status)).map((order) => {
    const product = PRODUCT_BY_ID[order.items[0].productId];
    const employee = state.employees.some((candidate) => candidate.role === "online");
    const action = order.status === "waiting"
      ? `<button class="button button-small button-quiet" data-action="accept-online" data-order="${order.id}" ${employee || status !== "running" ? "disabled" : ""}>${employee ? "Nhân viên xử lý" : "Nhận đơn"}</button>`
      : `<button class="button button-small button-green" data-action="complete-online" data-order="${order.id}" ${employee || status !== "running" ? "disabled" : ""}>Giao đơn ✓</button>`;
    return `<div class="list-row"><div><strong>📱 ${escapeHtml(product.name)}</strong><div class="tiny muted">${order.status === "waiting" ? "Đơn mới" : "Đang chuẩn bị"} · ${formatMoney(order.totalPrice)}</div></div>${action}</div>`;
  }).join("");
  const eventBanner = state.currentEvent ? `<div class="event-banner"><span style="font-size:1.5rem">🎉</span><div><strong>${escapeHtml(state.currentEvent.name)}</strong><div class="tiny muted">${escapeHtml(state.currentEvent.description)}</div></div></div>` : "";
  return `${renderPageHeading("Quầy bán hàng", "Đón khách, chuẩn bị món và phục vụ trước khi khách hết kiên nhẫn.")}<div class="page-content">${eventBanner}<section class="card"><div class="game-top"><div><span class="pill">Ngày ${state.day}</span><div class="tiny muted" style="margin-top:.4rem">${status === "running" ? "Tiệm đang mở cửa" : status === "paused" ? "Đang tạm nghỉ" : status === "summary" ? "Ngày đã kết thúc" : "Đang chuẩn bị"}</div></div><div class="progress-track"><div class="progress-fill" style="width:${ratio}%"></div></div><div class="timer" data-timer>${formatDuration(remaining)}</div></div><div class="button-row" style="margin-top:1rem">${controls}${status === "preparation" ? `<button class="button button-quiet" data-navigate="inventory">Kiểm tra nguyên liệu</button>` : ""}</div></section>
    <div class="grid-2"><section class="card"><div class="card-head"><h2>Khách đang chờ</h2><span class="pill">${state.customers.length}</span></div>${orders ? `<div class="queue-grid">${orders}</div>` : `<div class="empty-state">${status === "preparation" ? "Mở cửa để khách bắt đầu ghé tiệm nhé!" : status === "paused" ? "Tiệm đang nghỉ một chút." : "Chưa có khách chờ. Một vị khách mới sẽ sớm ghé qua."}</div>`}</section>
    <section class="card"><div class="card-head"><h2>Đơn trực tuyến</h2><span class="pill">${state.onlineOrders.filter((order) => ["waiting", "preparing", "ready"].includes(order.status)).length}</span></div>${onlineOrders || `<div class="empty-state">Đơn giao tận nơi sẽ xuất hiện trong ngày.</div>`}</section></div></div>`;
}
