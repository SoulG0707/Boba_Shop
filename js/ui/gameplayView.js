import { formatDuration, GAME_CONFIG } from "../config.js";
import { INGREDIENTS, INGREDIENT_BY_ID } from "../data/ingredients.js";
import { PRODUCT_BY_ID, PRODUCT_OPTIONS, getProductRecipe, getSizeLabel } from "../data/products.js";
import { getRemainingSeconds } from "../systems/dayCycle.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";
import { renderFoodAsset } from "./foodAssets.js";

const CUSTOMER_SPRITES = Object.freeze({
  regular: { row: 0, column: 0 },
  student: { row: 7, column: 0 },
  office: { row: 5, column: 0 },
  reviewer: { row: 3, column: 0 },
  online: { row: 0, column: 0, delivery: true },
});

const waitingCustomers = (state) => state.customers.filter((customer) => customer.status === "waiting");

function getFocusedCustomer(state, presentation) {
  const customers = waitingCustomers(state);
  return customers.find((customer) => customer.id === presentation.focusedCustomerId) ?? customers[0] ?? null;
}

function getPreparationOrder(state, presentation, focusedCustomer) {
  const requestedId = presentation.activePreparationOrderId ?? focusedCustomer?.orderId;
  return state.orders.find((order) => order.id === requestedId && order.status !== "cancelled") ?? null;
}

export function renderGameplayView(state, presentation = {}) {
  const customers = waitingCustomers(state);
  const customer = getFocusedCustomer(state, presentation);
  const order = getPreparationOrder(state, presentation, customer);
  const statusLabel = state.gameplay.status === "paused" ? "Tạm nghỉ" : "Đang bán";
  const clockRatio = Math.max(0, Math.min(1, getRemainingSeconds(state) / GAME_CONFIG.DAY_DURATION_SECONDS));

  return `<section class="selling-scene ${state.gameplay.status === "paused" ? "is-paused" : ""}" aria-label="Quầy bánh tráng trộn">
    <div class="scene-topline">
      <div class="scene-clock"><strong id="scene-clock-value">${formatDuration(getRemainingSeconds(state))}</strong><span>Ngày ${state.day} · <span id="scene-status-label">${statusLabel}</span></span></div>
      <div class="scene-meter" role="progressbar" aria-label="Thời gian còn lại trong ngày" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(clockRatio * 100)}"><i id="scene-meter-fill" style="transform:scaleX(${clockRatio})"></i></div>
      <span id="scene-event-slot" data-render-signature="${escapeHtml(getEventSignature(state))}">${renderEvent(state)}</span>
    </div>
    <div class="customer-queue-section">
      <div class="customer-queue-heading"><span>KHÁCH ĐANG CHỜ</span><strong id="customer-queue-count">${customers.length}</strong></div>
      <div id="customer-queue" class="customer-queue" aria-label="Hàng khách đang chờ">${renderCustomerQueue(customers, customer?.id)}</div>
    </div>
    <div class="customer-focus-stage" aria-label="Khách đang được phục vụ">
      <div id="focused-customer-slot" class="focused-customer-slot" data-render-signature="${customer?.id ?? "empty"}">${renderFocusedCustomer(customer)}</div>
      <div id="focused-order-slot" class="focused-order-slot" data-render-signature="${escapeHtml(`${order?.customerId ?? "empty"}:${order?.id ?? "empty"}`)}">${renderOrderDetails(order, customer)}</div>
    </div>
    <div id="online-orders-slot" class="online-orders-slot" data-render-signature="${escapeHtml(getOnlineOrderSignature(state))}">${renderOnlineOrders(state)}</div>
    <section class="work-counter" aria-label="Bàn trộn bánh tráng">
      <div class="counter-work">
        <div class="counter-work-heading"><strong>QUẦY BÁNH TRÁNG</strong><span>PHA · TRỘN · GIAO</span></div>
        <div class="counter-center">
          <div id="mixing-bowl-slot" class="mixing-bowl-slot" data-render-signature="${escapeHtml(getBowlSignature(order))}">${renderMixingBowl(order)}</div>
          <div id="work-controls-slot" class="work-controls-slot" data-render-signature="${escapeHtml(getControlsSignature(order))}">${renderWorkControls(order)}</div>
        </div>
      </div>
      <div id="ingredient-tools-slot" class="ingredient-tools" data-render-signature="${escapeHtml(getIngredientsSignature(state, order))}">${renderIngredientControls(state, order)}</div>
      <div id="selling-actions-slot" class="selling-actions-slot" data-render-signature="${escapeHtml(getActionsSignature(state, order))}">${renderSellingActions(order, state)}</div>
    </section>
    <div id="serve-feedback-slot" class="serve-feedback-slot" data-render-signature="${presentation.feedback?.createdAt ?? "empty"}">${renderFeedback(presentation.feedback)}</div>
    <div id="pause-curtain-slot" data-render-signature="${state.gameplay.status === "paused" ? "paused" : "running"}">${state.gameplay.status === "paused" ? renderPauseCurtain() : ""}</div>
  </section>`;
}

export function updateGameplayView(state, presentation = {}) {
  const root = document.querySelector(".selling-scene");
  if (!root) return false;

  const customers = waitingCustomers(state);
  const customer = getFocusedCustomer(state, presentation);
  const order = getPreparationOrder(state, presentation, customer);
  const focusedOrderCustomer = order ? state.customers.find((candidate) => candidate.id === order.customerId) ?? customer : customer;
  const queue = document.querySelector("#customer-queue");

  if (queue) updateCustomerQueue(queue, customers, customer?.id);
  const count = document.querySelector("#customer-queue-count");
  if (count && count.textContent !== String(customers.length)) count.textContent = String(customers.length);

  updateClock(root, state);
  updatePatienceIndicators(root, customers, customer);

  patchSlot("#focused-customer-slot", customer?.id ?? "empty", () => renderFocusedCustomer(customer), true);
  patchSlot("#focused-order-slot", `${focusedOrderCustomer?.id ?? "empty"}:${order?.id ?? "empty"}`, () => renderOrderDetails(order, focusedOrderCustomer), true);
  patchSlot("#online-orders-slot", getOnlineOrderSignature(state), () => renderOnlineOrders(state));
  patchSlot("#mixing-bowl-slot", getBowlSignature(order), () => renderMixingBowl(order));
  patchSlot("#work-controls-slot", getControlsSignature(order), () => renderWorkControls(order));
  patchSlot("#ingredient-tools-slot", getIngredientsSignature(state, order), () => renderIngredientControls(state, order));
  patchSlot("#selling-actions-slot", getActionsSignature(state, order), () => renderSellingActions(order, state));
  patchSlot("#scene-event-slot", getEventSignature(state), () => renderEvent(state));
  patchSlot("#serve-feedback-slot", presentation.feedback?.createdAt ?? "empty", () => renderFeedback(presentation.feedback));
  patchSlot("#pause-curtain-slot", state.gameplay.status === "paused" ? "paused" : "running", () => state.gameplay.status === "paused" ? renderPauseCurtain() : "");
  root.classList.toggle("is-paused", state.gameplay.status === "paused");
  return true;
}

function renderCustomerQueue(customers, focusedCustomerId) {
  if (!customers.length) return `<div class="customer-queue-empty"><span>🥣</span><strong>Đang chờ khách ghé quầy</strong></div>`;
  return customers.map((customer, index) => renderQueueCustomer(customer, index, customer.id === focusedCustomerId)).join("");
}

function renderQueueCustomer(customer, index, isFocused) {
  const sprite = spritePosition(customer.type);
  const patience = getPatiencePercent(customer);
  const color = patienceColor(patience);
  return `<button type="button" class="customer-queue-avatar ${isFocused ? "is-focused" : ""}" data-action="select-customer" data-customer="${escapeHtml(customer.id)}" aria-pressed="${isFocused}" aria-label="Xem đơn ${index + 1} của ${escapeHtml(customer.label)}, còn kiên nhẫn ${Math.round(patience)} phần trăm">
    <span class="queue-avatar-face ${sprite.delivery ? "is-delivery" : ""}" style="--sprite-x:${sprite.column * 50}%;--sprite-y:${sprite.row * (sprite.delivery ? 100 : 12.5)}%" aria-hidden="true"></span>
    <span class="queue-patience-ring" data-queue-patience="${escapeHtml(customer.id)}" role="progressbar" aria-label="Kiên nhẫn của ${escapeHtml(customer.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(patience)}" style="--patience-angle:${patience * 3.6}deg;--patience-color:${color}"></span>
    <span class="queue-avatar-index">${index + 1}</span>
  </button>`;
}

function updateCustomerQueue(queue, customers, focusedCustomerId) {
  const desiredIds = customers.map((customer) => customer.id);
  const desired = new Set(desiredIds);
  const buttons = [...queue.querySelectorAll(".customer-queue-avatar")];
  const buttonById = new Map(buttons.map((button) => [button.dataset.customer, button]));
  for (const button of buttons) {
    if (!desired.has(button.dataset.customer)) button.remove();
  }

  if (!customers.length) {
    if (!queue.querySelector(".customer-queue-empty")) {
      queue.innerHTML = `<div class="customer-queue-empty"><span>🥣</span><strong>Đang chờ khách ghé quầy</strong></div>`;
    }
    return;
  }
  queue.querySelector(".customer-queue-empty")?.remove();

  customers.forEach((customer, index) => {
    let button = buttonById.get(customer.id);
    if (!button) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = renderQueueCustomer(customer, index, customer.id === focusedCustomerId);
      button = wrapper.firstElementChild;
      buttonById.set(customer.id, button);
    }
    const focused = customer.id === focusedCustomerId;
    button.classList.toggle("is-focused", focused);
    const pressed = String(focused);
    if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
    const label = `Xem đơn ${index + 1} của ${customer.label}`;
    if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
    const number = button.querySelector(".queue-avatar-index");
    if (number && number.textContent !== String(index + 1)) number.textContent = String(index + 1);
    const currentAtIndex = queue.children[index];
    if (currentAtIndex !== button) queue.insertBefore(button, currentAtIndex ?? null);
  });
}

function renderFocusedCustomer(customer) {
  if (!customer) {
    return `<div class="focused-customer is-empty"><span class="empty-customer-illustration">🥣</span><strong>Quầy đang chờ khách</strong><small>Khách mới sẽ đứng ở đây khi ghé tiệm.</small></div>`;
  }
  const sprite = spritePosition(customer.type);
  const patience = getPatiencePercent(customer);
  const minutes = Math.floor(Math.max(0, customer.patience) / 60);
  const seconds = Math.floor(Math.max(0, customer.patience) % 60);
  const patienceText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `<div class="focused-customer" data-focused-customer="${escapeHtml(customer.id)}">
    <span class="customer-main-image ${sprite.delivery ? "is-delivery" : ""}" style="--sprite-x:${sprite.column * 50}%;--sprite-y:${sprite.row * (sprite.delivery ? 100 : 12.5)}%" aria-hidden="true"></span>
    <strong class="focused-customer-name">${escapeHtml(customer.label)}</strong>
    <div class="focused-patience"><span>KIÊN NHẪN</span><strong data-focused-patience-text="${escapeHtml(customer.id)}">${patienceText}</strong></div>
    <span class="focused-patience-track"><i data-focused-patience="${escapeHtml(customer.id)}" class="${patienceClass(patience)}" style="transform:scaleX(${patience / 100})"></i></span>
  </div>`;
}

function renderOrderDetails(order, customer) {
  if (!order || !customer) {
    return `<section class="active-order-bubble is-empty" aria-label="Chưa có đơn hàng"><span class="order-bubble-tail" aria-hidden="true"></span><strong>Đơn hàng sẽ hiện ở đây</strong><small>Chọn một khách trong hàng chờ để xem món.</small></section>`;
  }
  const item = order.items[0];
  const product = PRODUCT_BY_ID[item.productId];
  const recipe = getProductRecipe(item.productId, item) ?? {};
  const grouped = [
    { category: "Bánh tráng", label: "NỀN" },
    { category: "Topping", label: "TOPPING" },
    { category: "Gia vị", label: "GIA VỊ" },
  ].map((group) => ({
    ...group,
    items: Object.entries(recipe)
      .filter(([id]) => id !== "food_box" && INGREDIENT_BY_ID[id]?.category === group.category)
      .map(([id, quantity]) => `${INGREDIENT_BY_ID[id]?.name ?? id}${quantity > 1 ? ` ×${quantity}` : ""}`),
  })).filter((group) => group.items.length);
  const otherItems = Object.entries(recipe)
    .filter(([id]) => id !== "food_box" && !["Bánh tráng", "Topping", "Gia vị"].includes(INGREDIENT_BY_ID[id]?.category))
    .map(([id, quantity]) => `${INGREDIENT_BY_ID[id]?.name ?? id}${quantity > 1 ? ` ×${quantity}` : ""}`);
  if (otherItems.length) grouped.push({ label: "YÊU CẦU", items: otherItems });

  return `<section class="active-order-bubble" aria-label="Đơn hàng đầy đủ của ${escapeHtml(customer.label)}" data-order-id="${escapeHtml(order.id)}">
    <span class="order-bubble-tail" aria-hidden="true"></span>
    <div class="order-bubble-kicker"><span>ĐƠN ĐANG LÀM</span><strong>${formatMoneyCompact(order.totalPrice)}</strong></div>
    <h2 class="order-product-name">${escapeHtml(product?.name ?? "Bánh tráng trộn")}</h2>
    <div class="order-size-line"><span>CỠ</span><strong>${escapeHtml(getSizeLabel(item.size).toUpperCase())}</strong><small>· ${item.quantity ?? 1} phần</small></div>
    <div class="order-ingredient-groups">${grouped.map((group) => `<div class="order-ingredient-group"><span>${group.label}</span><strong>${group.items.map(escapeHtml).join(" · ")}</strong></div>`).join("")}</div>
  </section>`;
}

function renderMixingBowl(order) {
  const ingredients = Object.entries(order?.preparedIngredients ?? {}).filter(([, quantity]) => quantity > 0);
  if (order?.packed) {
    return `<div class="mixing-bowl-wrap is-packed"><div class="food-box" aria-label="Món đã đóng hộp">${renderFoodAsset("food_box", "food-box-asset", "Hộp bánh tráng trộn")}<small>ĐÃ ĐÓNG HỘP</small></div></div>`;
  }
  const hasSatay = (order?.preparedIngredients?.satay ?? 0) > 0;
  const hasTamarind = (order?.preparedIngredients?.tamarind_sauce ?? 0) > 0;
  const toppings = ingredients.map(([id, quantity], index) => {
    const ingredient = INGREDIENT_BY_ID[id];
    return `<button class="bowl-topping topping-${index % 8}" data-action="remove-bowl-ingredient" data-ingredient="${id}" ${order?.mixed || order?.mixing ? "disabled" : ""} aria-label="Bỏ ${escapeHtml(ingredient?.name ?? id)} khỏi tô">${renderFoodAsset(id, "bowl-ingredient-asset")}${quantity > 1 ? `<small>×${quantity}</small>` : ""}</button>`;
  }).join("");
  const stage = order?.mixed ? "Đã trộn xong" : order?.mixing ? "Đang trộn…" : ingredients.length ? "Chạm nguyên liệu trong tô để bỏ" : "Tô đang trống";
  return `<div class="mixing-bowl-wrap">
    <div class="mixing-bowl ${order?.mixing ? "is-mixing" : ""} ${order?.mixed ? "is-mixed" : ""}" style="--mix-duration:${GAME_CONFIG.MIX_DURATION_MS}ms" aria-label="Tô trộn bánh tráng">
      ${renderFoodAsset("mixing_bowl", "mixing-bowl-art", "Thau trộn bánh tráng")}
      <div class="bowl-contents ${hasSatay ? "has-satay" : ""} ${hasTamarind ? "has-tamarind" : ""}">${toppings || `<span class="bowl-empty">${renderFoodAsset("rice_paper", "bowl-empty-asset")}</span>`}</div>
    </div><small class="bowl-hint">${stage}</small>
  </div>`;
}

function renderWorkControls(order) {
  if (!order) return `<div class="counter-controls"><div class="counter-waiting">${renderFoodAsset("mixing_bowl", "waiting-bowl-asset")}<small>Chọn khách để bắt đầu</small></div></div>`;
  const item = order.items[0];
  const hasIngredients = Object.values(order.preparedIngredients ?? {}).some((quantity) => quantity > 0);
  const sizeDisabled = order.mixed || order.mixing || hasIngredients || order.status !== "waiting";
  const sizeButtons = Object.entries(PRODUCT_OPTIONS.sizes).map(([id, option]) =>
    `<button class="size-choice ${order.preparedSize === id ? "is-selected" : ""}" data-action="choose-order-size" data-size="${id}" aria-pressed="${order.preparedSize === id}" ${sizeDisabled ? "disabled" : ""}>${escapeHtml(option.label.toUpperCase())}</button>`,
  ).join("");
  const selectedSize = order.preparedSize ? `ĐANG CHỌN · ${getSizeLabel(order.preparedSize).toUpperCase()}` : `KHÁCH GỌI · ${getSizeLabel(item.size).toUpperCase()}`;
  return `<div class="counter-controls">
    <span class="size-choices-label">CHỌN CỠ · ${escapeHtml(selectedSize)}</span>
    <div class="size-choices" aria-label="Chọn cỡ bánh">${sizeButtons}</div>
    <small class="size-hint">Cỡ Bé / Lớn</small>
  </div>`;
}

function renderSellingActions(order, state) {
  if (!order) return `<div class="selling-actions" aria-label="Thao tác đơn hàng"><button class="button button-primary" disabled>TRỘN</button><button class="button button-secondary" disabled>ĐÓNG HỘP</button><button class="button button-serve" disabled>GIAO KHÁCH</button></div>`;
  const canMix = Boolean(order.preparedSize && order.preparedIngredients?.rice_paper > 0 && order.status === "waiting" && !order.mixed && !order.mixing);
  const canPack = Boolean(order.mixed && order.status === "waiting" && (state.stock.food_box?.quantity ?? 0) > 0);
  const mixLabel = order.mixing ? "ĐANG TRỘN…" : "TRỘN MÓN";
  const packLabel = order.packed ? "ĐÃ ĐÓNG HỘP" : "ĐÓNG HỘP";
  return `<div class="selling-actions" aria-label="Thao tác đơn hàng">
    <button class="button button-primary" data-action="mix-order" ${canMix ? "" : "disabled"}>${mixLabel}</button>
    <button class="button button-secondary" data-action="pack-order" ${canPack ? "" : "disabled"}>${packLabel}</button>
    <button class="button button-serve" data-action="serve-order" data-order="${escapeHtml(order.id)}" ${order.packed ? "" : "disabled"}>GIAO KHÁCH · ${formatMoneyCompact(order.totalPrice)}</button>
  </div>`;
}

function renderIngredientControls(state, order) {
  const prepared = order?.preparedIngredients ?? {};
  const item = order?.items?.[0];
  const targetRecipe = item ? getProductRecipe(item.productId, { size: order.preparedSize ?? item.size }) ?? {} : {};
  const locked = !order || order.status !== "waiting" || order.mixed || order.mixing;
  return `<div class="ingredient-tools-heading"><span>KHAY NGUYÊN LIỆU</span><small>${order?.preparedSize ? `${Object.values(prepared).reduce((sum, quantity) => sum + quantity, 0)} phần trong tô` : "Chọn khách và cỡ bánh"}</small></div>
    <div class="ingredient-control-grid">${INGREDIENTS.filter((ingredient) => ingredient.id !== "food_box").map((ingredient) => {
      const stock = state.stock[ingredient.id]?.quantity ?? 0;
      const inBowl = prepared[ingredient.id] ?? 0;
      const requested = targetRecipe[ingredient.id] ?? 0;
      const unavailable = !order || locked || stock <= inBowl;
      const stateLabel = !order ? "—" : !order.preparedSize ? `Kho ${stock}` : requested ? `${inBowl}/${requested} · kho ${stock}` : `${inBowl} · kho ${stock}`;
      return `<button class="ingredient-control ${inBowl ? "is-active" : ""} ${stock <= inBowl ? "is-unavailable" : ""}" data-action="add-order-ingredient" data-ingredient="${ingredient.id}" aria-label="Thêm ${escapeHtml(ingredient.name)}, còn ${stock}" ${unavailable ? "disabled" : ""}>${renderFoodAsset(ingredient.id, "ingredient-control-asset")}<strong>${escapeHtml(ingredient.name)}</strong><small>${stateLabel}</small></button>`;
    }).join("")}</div>`;
}

function renderOnlineOrders(state) {
  const orders = state.onlineOrders.filter((order) => ["waiting", "preparing", "ready"].includes(order.status));
  if (!orders.length) return "";
  const employee = state.employees.some((candidate) => candidate.role === "online");
  return `<div class="delivery-row">${orders.map((order) => {
    const product = PRODUCT_BY_ID[order.items[0]?.productId];
    const action = order.status === "waiting"
      ? `<button data-action="accept-online" data-order="${escapeHtml(order.id)}" ${employee ? "disabled" : ""}>${employee ? "Đang làm" : "Nhận đơn"}</button>`
      : `<button data-action="complete-online" data-order="${escapeHtml(order.id)}" ${employee ? "disabled" : ""}>Giao hộp</button>`;
    return `<div class="delivery-order"><span class="delivery-face" aria-hidden="true"></span><span><strong>${escapeHtml(product?.name ?? "Đơn bánh tráng")}</strong><small>${formatMoneyCompact(order.totalPrice)}</small></span>${action}</div>`;
  }).join("")}</div>`;
}

function renderEvent(state) {
  return state.currentEvent ? `<span class="scene-event">✨ ${escapeHtml(state.currentEvent.name)}</span>` : "";
}

function renderPauseCurtain() {
  return `<div class="pause-curtain"><div><span>🥣</span><h2>Quầy nghỉ một chút</h2><p>Khách sẽ chờ khi bạn quay lại.</p><button class="button button-primary" data-action="pause-day">Tiếp tục bán</button></div></div>`;
}

function renderFeedback(feedback) {
  if (!feedback || Date.now() - feedback.createdAt > 2_000) return "";
  const accuracy = feedback.accuracy;
  const reaction = accuracy?.missingIngredients?.length
    ? `Thiếu ${INGREDIENT_BY_ID[accuracy.missingIngredients[0].id]?.name?.toLowerCase() ?? "nguyên liệu"} rồi…`
    : accuracy?.wrongIngredients?.length ? "Món hơi dư nguyên liệu nè…"
      : accuracy && !accuracy.sizeCorrect ? "Sai cỡ rồi…" : "Ngon quá!";
  const stars = `${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)}`;
  return `<div class="serve-feedback" key="${feedback.createdAt}"><span class="feedback-box" aria-hidden="true">${renderFoodAsset("food_box", "feedback-box-asset")}</span><strong>+${formatMoneyCompact(feedback.revenue)}</strong><small>${reaction}</small><span>${stars}</span></div>`;
}

function updateClock(root, state) {
  const remaining = getRemainingSeconds(state);
  const clock = root.querySelector("#scene-clock-value");
  const clockValue = formatDuration(remaining);
  if (clock && clock.textContent !== clockValue) clock.textContent = clockValue;
  const meter = root.querySelector(".scene-meter");
  const fill = root.querySelector("#scene-meter-fill");
  const ratio = Math.max(0, Math.min(1, remaining / GAME_CONFIG.DAY_DURATION_SECONDS));
  if (fill) fill.style.transform = `scaleX(${ratio})`;
  const meterValue = String(Math.round(ratio * 100));
  if (meter && meter.getAttribute("aria-valuenow") !== meterValue) meter.setAttribute("aria-valuenow", meterValue);
}

function updatePatienceIndicators(root, customers, focusedCustomer) {
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  for (const ring of root.querySelectorAll("[data-queue-patience]")) {
    const customer = customersById.get(ring.dataset.queuePatience);
    if (!customer) continue;
    const percent = getPatiencePercent(customer);
    ring.style.setProperty("--patience-angle", `${percent * 3.6}deg`);
    ring.style.setProperty("--patience-color", patienceColor(percent));
    const value = String(Math.round(percent));
    if (ring.getAttribute("aria-valuenow") !== value) ring.setAttribute("aria-valuenow", value);
  }
  if (!focusedCustomer) return;
  const fill = root.querySelector(`[data-focused-patience="${cssEscape(focusedCustomer.id)}"]`);
  const text = root.querySelector(`[data-focused-patience-text="${cssEscape(focusedCustomer.id)}"]`);
  if (fill) {
    const percent = getPatiencePercent(focusedCustomer);
    fill.style.transform = `scaleX(${percent / 100})`;
    const state = patienceClass(percent);
    if (fill.className !== state) fill.className = state;
  }
  if (text) {
    const minutes = Math.floor(Math.max(0, focusedCustomer.patience) / 60);
    const seconds = Math.floor(Math.max(0, focusedCustomer.patience) % 60);
    text.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}

function patchSlot(selector, signature, render, animate = false) {
  const slot = document.querySelector(selector);
  if (!slot || slot.dataset.renderSignature === signature) return;
  const hadContent = slot.dataset.renderSignature && slot.dataset.renderSignature !== "empty";
  slot.innerHTML = render();
  slot.dataset.renderSignature = signature;
  if (animate && hadContent && typeof slot.animate === "function") {
    slot.animate(
      [{ opacity: 0.45, transform: "translateY(4px) scale(.985)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
      { duration: 160, easing: "cubic-bezier(.2,.8,.25,1)" },
    );
  }
}

function getPatiencePercent(customer) {
  const max = Math.max(1, Number(customer.maxPatience) || 1);
  return Math.max(0, Math.min(100, (Number(customer.patience) / max) * 100));
}

function patienceColor(percent) {
  return percent < 25 ? "#d94b35" : percent < 55 ? "#e5a335" : "#5b9d6d";
}

function patienceClass(percent) {
  return percent < 25 ? "is-danger" : percent < 55 ? "is-warning" : "is-normal";
}

function getOnlineOrderSignature(state) {
  return JSON.stringify(state.onlineOrders.filter((order) => ["waiting", "preparing", "ready"].includes(order.status)).map((order) => [order.id, order.status]));
}

function getEventSignature(state) {
  return JSON.stringify(state.currentEvent ? [state.currentEvent.id, state.currentEvent.name] : null);
}

function getBowlSignature(order) {
  return JSON.stringify(order ? [order.id, order.preparedIngredients, order.mixed, order.mixing, order.packed] : null);
}

function getControlsSignature(order) {
  return JSON.stringify(order ? [order.id, order.preparedSize, order.preparedIngredients, order.mixed, order.mixing, order.status] : null);
}

function getIngredientsSignature(state, order) {
  return JSON.stringify([
    order ? [order.id, order.preparedIngredients, order.preparedSize, order.mixed, order.mixing, order.status] : null,
    INGREDIENTS.map(({ id }) => [id, state.stock[id]?.quantity ?? 0]),
  ]);
}

function getActionsSignature(state, order) {
  return JSON.stringify(order ? [order.id, order.status, order.preparedSize, order.preparedIngredients, order.mixed, order.mixing, order.packed, state.stock.food_box?.quantity ?? 0] : null);
}

function cssEscape(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
}

function spritePosition(type) {
  return CUSTOMER_SPRITES[type] ?? CUSTOMER_SPRITES.regular;
}
