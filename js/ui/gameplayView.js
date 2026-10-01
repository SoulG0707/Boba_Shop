import { formatDuration, GAME_CONFIG } from "../config.js";
import { INGREDIENTS, INGREDIENT_BY_ID } from "../data/ingredients.js";
import { PRODUCT_BY_ID, PRODUCT_OPTIONS, getSizeLabel } from "../data/products.js";
import { getOrderRecipe } from "../systems/orders.js";
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
      <div id="serve-feedback-slot" class="serve-feedback-slot" data-render-signature="${presentation.feedback?.createdAt ?? "empty"}">${renderFeedback(presentation.feedback)}</div>
    </div>
    <div id="online-orders-slot" class="online-orders-slot" data-render-signature="${escapeHtml(getOnlineOrderSignature(state))}">${renderOnlineOrders(state)}</div>
    <section class="work-counter" aria-label="Bàn trộn bánh tráng">
      <div class="counter-nameplate"><strong>QUẦY BÁNH TRÁNG</strong><span>PHA · TRỘN · ĐÓNG HỘP</span></div>
      <div id="work-controls-slot" class="counter-equipment-row" data-render-signature="${escapeHtml(getControlsSignature(state, order))}">${renderWorkControls(state, order)}</div>
      <div class="counter-mix-bench">
        <div id="mixing-bowl-slot" class="mixing-bowl-slot" data-render-signature="${escapeHtml(getBowlSignature(order))}">${renderMixingBowl(order)}</div>
        <div id="ingredient-tools-slot" class="ingredient-tools" data-render-signature="${escapeHtml(getIngredientsSignature(state, order))}">${renderIngredientControls(state, order)}</div>
      </div>
      <div id="selling-actions-slot" class="selling-actions-slot" data-render-signature="${escapeHtml(getActionsSignature(state, order))}">${renderSellingActions(order, state)}</div>
    </section>
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
  patchSlot("#work-controls-slot", getControlsSignature(state, order), () => renderWorkControls(state, order));
  patchSlot("#ingredient-tools-slot", getIngredientsSignature(state, order), () => renderIngredientControls(state, order));
  patchSlot("#selling-actions-slot", getActionsSignature(state, order), () => renderSellingActions(order, state));
  patchSlot("#scene-event-slot", getEventSignature(state), () => renderEvent(state));
  patchSlot("#serve-feedback-slot", presentation.feedback?.createdAt ?? "empty", () => renderFeedback(presentation.feedback));
  patchSlot("#pause-curtain-slot", state.gameplay.status === "paused" ? "paused" : "running", () => state.gameplay.status === "paused" ? renderPauseCurtain() : "");
  root.classList.toggle("is-paused", state.gameplay.status === "paused");
  return true;
}

function renderCustomerQueue(customers, focusedCustomerId) {
  if (!customers.length) return `<div class="customer-queue-empty">${renderFoodAsset("mixing_bowl", "queue-empty-asset")}<strong>Đang chờ khách ghé quầy</strong></div>`;
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
      queue.innerHTML = `<div class="customer-queue-empty">${renderFoodAsset("mixing_bowl", "queue-empty-asset")}<strong>Đang chờ khách ghé quầy</strong></div>`;
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
    return `<div class="focused-customer is-empty">${renderFoodAsset("mixing_bowl", "empty-customer-illustration")}<strong>Quầy đang chờ khách</strong><small>Khách mới sẽ đứng ở đây khi ghé tiệm.</small></div>`;
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
  const recipe = getOrderRecipe(order, { size: item.size }) ?? {};
  const requested = Object.entries(recipe)
    .filter(([id]) => id !== "food_box")
    .map(([id, quantity]) => ({
      id,
      quantity,
      name: INGREDIENT_BY_ID[id]?.name ?? id,
    }));
  const excludedIngredients = order.customerRequest?.excludedIngredients ?? [];
  const excluded = excludedIngredients
    .map((id) => INGREDIENT_BY_ID[id]?.name ?? id)
    .filter(Boolean);
  const heatLevel = order.customerRequest?.heatLevel;
  const requestedMarkup = requested.map(({ id, name, quantity }) =>
    `<strong class="order-keyword">${escapeHtml(name)}${quantity > 1 ? ` ×${quantity}` : ""}</strong>`,
  ).join(`<span class="order-word">, </span>`);
  const exclusionsMarkup = excluded.map((name) =>
    `<strong class="order-keyword is-excluded">KHÔNG ${escapeHtml(name.toLocaleUpperCase("vi"))}</strong>`,
  ).join(`<span class="order-word">, </span>`);
  const productName = product?.name ?? "Bánh tráng trộn";
  const sizeLabel = getSizeLabel(item.size).toLocaleUpperCase("vi");

  return `<section class="active-order-bubble" aria-label="Đơn hàng đầy đủ của ${escapeHtml(customer.label)}" data-order-id="${escapeHtml(order.id)}">
    <span class="order-bubble-tail" aria-hidden="true"></span>
    <div class="order-bubble-kicker"><span>ĐƠN ĐANG LÀM</span><strong>${formatMoneyCompact(order.totalPrice)}</strong></div>
    <div class="order-request-copy">
      <p>Cho mình một <strong class="order-product-name">${escapeHtml(productName)}</strong> cỡ <strong class="order-keyword">${escapeHtml(sizeLabel)}</strong>${(item.quantity ?? 1) > 1 ? `, <strong class="order-keyword">${item.quantity} phần</strong>` : ""},</p>
      ${requestedMarkup ? `<p>thêm ${requestedMarkup}</p>` : ""}
      ${exclusionsMarkup ? `<p>${exclusionsMarkup}</p>` : ""}
      ${heatLevel ? `<p>nêm <strong class="order-keyword">${escapeHtml(String(heatLevel).toLocaleUpperCase("vi"))}</strong> nha!</p>` : ""}
    </div>
  </section>`;
}

function renderMixingBowl(order) {
  const ingredients = Object.entries(order?.preparedIngredients ?? {}).filter(([, quantity]) => quantity > 0);
  const hasSatay = (order?.preparedIngredients?.satay ?? 0) > 0;
  const hasTamarind = (order?.preparedIngredients?.tamarind_sauce ?? 0) > 0;
  const isEditable = Boolean(order && order.status === "waiting" && !order.mixed && !order.mixing && !order.packed);
  const toppings = ingredients.map(([id, quantity], index) => {
    const ingredient = INGREDIENT_BY_ID[id];
    return `<button class="bowl-topping topping-${index % 8}" data-action="remove-bowl-ingredient" data-ingredient="${id}" ${isEditable ? "" : "disabled"} aria-label="Bỏ ${escapeHtml(ingredient?.name ?? id)} khỏi tô">${renderFoodAsset(id, "bowl-ingredient-asset")}${quantity > 1 ? `<small>×${quantity}</small>` : ""}</button>`;
  }).join("");
  const stage = order?.mixed ? "Đã trộn xong" : order?.mixing ? "Đang trộn…" : ingredients.length ? "Chạm nguyên liệu trong tô để bỏ" : "Tô đang trống";
  const bowl = `<div class="mixing-bowl ${order?.mixing ? "is-mixing" : ""} ${order?.mixed ? "is-mixed" : ""}" style="--mix-duration:${GAME_CONFIG.MIX_DURATION_MS}ms" aria-label="Tô trộn bánh tráng">
      ${renderFoodAsset("mixing_bowl", "mixing-bowl-art", "Thau trộn bánh tráng")}
      <div class="bowl-contents ${hasSatay ? "has-satay" : ""} ${hasTamarind ? "has-tamarind" : ""}">${toppings || `<span class="bowl-empty">${renderFoodAsset("rice_paper", "bowl-empty-asset")}</span>`}</div>
    </div>`;
  if (order?.packed) {
    return `<div class="mixing-bowl-wrap is-packed"><div class="packing-source">${bowl}</div><div class="food-box" aria-label="Món đã đóng hộp">${renderFoodAsset("food_box", "food-box-asset", "Hộp bánh tráng trộn")}<small>ĐÃ ĐÓNG HỘP</small></div></div>`;
  }
  return `<div class="mixing-bowl-wrap">${bowl}<small class="bowl-hint">${stage}</small></div>`;
}

function renderWorkControls(state, order) {
  const hasIngredients = Object.values(order?.preparedIngredients ?? {}).some((quantity) => quantity > 0);
  const sizeDisabled = !order || order.mixed || order.mixing || hasIngredients || order.status !== "waiting";
  const sizeButtons = Object.entries(PRODUCT_OPTIONS.sizes).map(([id, option]) => {
    const sizeAsset = id === "M" ? "size_small_bowl" : "size_large_bowl";
    return `<button class="size-choice ${order?.preparedSize === id ? "is-selected" : ""}" data-action="choose-order-size" data-size="${id}" aria-pressed="${order?.preparedSize === id}" ${sizeDisabled ? "disabled" : ""}>${renderFoodAsset(sizeAsset, "size-choice-asset", `Phần ${option.label}`)}<strong>${escapeHtml(option.label.toLocaleUpperCase("vi"))}</strong></button>`;
  }).join("");
  const primaryIngredients = ["rice_paper", "shrimp_salt", "satay", "tamarind_sauce"].map((id) => INGREDIENT_BY_ID[id]);
  const packageStatus = !order ? "Chờ khách" : order.packed ? "Đã đóng hộp" : order.mixed ? "Sẵn sàng đóng" : "Chờ trộn";
  return `<div class="equipment-row">
    <section class="size-station" aria-label="Chọn cỡ phần">
      <div class="station-caption">CỠ PHẦN</div>
      <div class="size-choices">${sizeButtons}</div>
    </section>
    <section class="dispenser-station" aria-label="Hũ bánh tráng và gia vị">
      <div class="station-caption">HŨ NỀN &amp; GIA VỊ</div>
      <div class="ingredient-dispenser-row">${primaryIngredients.map((ingredient) => renderIngredientControl(ingredient, state, order, "jar")).join("")}</div>
    </section>
    <div class="pack-station ${order?.mixed ? "is-ready" : ""} ${order?.packed ? "is-packed" : ""}" aria-label="Khu đóng hộp: ${packageStatus}">
      ${renderFoodAsset("packing_machine", "packing-machine-asset", "Máy đóng hộp bánh tráng")}
      <strong>KHU ĐÓNG HỘP</strong><small>${escapeHtml(packageStatus)}</small>
    </div>
  </div>`;
}

function renderSellingActions(order, state) {
  if (!order) return `<div class="selling-actions" aria-label="Thao tác đơn hàng"><button class="next-work-action" disabled>CHỜ KHÁCH ĐẾN QUẦY</button></div>`;
  const canMix = Boolean(order.preparedSize && order.preparedIngredients?.rice_paper > 0 && order.status === "waiting" && !order.mixed && !order.mixing);
  const canPack = Boolean(order.mixed && order.status === "waiting" && (state.stock.food_box?.quantity ?? 0) > 0);
  if (order.packed) {
    return `<div class="selling-actions" aria-label="Thao tác đơn hàng"><button class="next-work-action is-serve" data-action="serve-order" data-order="${escapeHtml(order.id)}">GIAO KHÁCH · ${formatMoneyCompact(order.totalPrice)}</button></div>`;
  }
  if (order.mixed) {
    const label = canPack ? "ĐÓNG HỘP" : "THIẾU HỘP ĐỰNG";
    return `<div class="selling-actions" aria-label="Thao tác đơn hàng"><button class="next-work-action is-pack" data-action="pack-order" ${canPack ? "" : "disabled"}>${label}</button></div>`;
  }
  const mixLabel = order.mixing ? "ĐANG TRỘN…" : "TRỘN MÓN";
  return `<div class="selling-actions" aria-label="Thao tác đơn hàng"><button class="next-work-action is-mix" data-action="mix-order" ${canMix ? "" : "disabled"}>${mixLabel}</button></div>`;
}

function renderIngredientControls(state, order) {
  const prepared = order?.preparedIngredients ?? {};
  const toppings = INGREDIENTS.filter((ingredient) => ingredient.category === "Topping");
  const secondary = ["scallion_oil", "calamansi"].map((id) => INGREDIENT_BY_ID[id]);
  const totalInBowl = Object.values(prepared).reduce((sum, quantity) => sum + quantity, 0);
  return `<div class="ingredient-tools-heading"><strong>KHAY TOPPING</strong><small>${order ? `${totalInBowl} phần trong thau` : "Chọn khách để bắt đầu"}</small></div>
    <div class="topping-tray-grid">${toppings.map((ingredient) => renderIngredientControl(ingredient, state, order, "tray")).join("")}</div>
    <section class="secondary-shelf" aria-label="Gia vị và nguyên liệu phụ">
      <div class="secondary-shelf-heading"><strong>KỆ GIA VỊ PHỤ</strong><span>THÊM VÀO THAU</span></div>
      <div class="secondary-ingredient-row">${secondary.map((ingredient) => renderIngredientControl(ingredient, state, order, "secondary")).join("")}</div>
    </section>`;
}

function renderIngredientControl(ingredient, state, order, station) {
  const stock = state.stock[ingredient.id]?.quantity ?? 0;
  const inBowl = order?.preparedIngredients?.[ingredient.id] ?? 0;
  const recipe = order ? getOrderRecipe(order) ?? {} : {};
  const requested = recipe[ingredient.id] ?? 0;
  const isLocked = Number.isFinite(ingredient.unlockDay) && state.day < ingredient.unlockDay;
  const unavailable = !order || order.status !== "waiting" || order.mixed || order.mixing || order.packed || stock <= inBowl || isLocked;
  const amount = order?.preparedSize && requested ? `${inBowl}/${requested}` : `${inBowl} · kho ${stock}`;
  const classes = [
    `ingredient-${station}`,
    inBowl ? "is-active" : "",
    stock <= inBowl ? "is-unavailable" : "",
    unavailable ? "is-disabled" : "",
    isLocked ? "is-locked" : "",
  ].filter(Boolean).join(" ");
  const ingredientArt = renderFoodAsset(ingredient.id, station === "tray" ? "tray-ingredient-asset" : "station-ingredient-asset");
  const graphic = station === "jar"
    ? `<span class="ingredient-vessel">${renderFoodAsset("spice_jar", "jar-vessel-asset")}${ingredientArt}</span>`
    : station === "tray"
      ? `<span class="tray-well"><span class="tray-stock">${stock}</span>${ingredientArt}<span class="tray-lock">${isLocked ? renderFoodAsset("lock", "lock-asset") : ""}</span></span>`
      : `<span class="secondary-vessel">${renderFoodAsset("spice_jar", "secondary-vessel-asset")}${ingredientArt}</span>`;
  return `<button type="button" class="${classes}" data-action="add-order-ingredient" data-ingredient="${ingredient.id}" aria-label="${isLocked ? `Đã khóa ${escapeHtml(ingredient.name)}` : `Thêm ${escapeHtml(ingredient.name)}, còn ${stock}`}" ${unavailable ? "disabled" : ""}>${graphic}<strong>${escapeHtml(ingredient.name)}</strong><small>${isLocked ? "Chưa mở" : escapeHtml(amount)}</small></button>`;
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
  return `<div class="pause-curtain"><div>${renderFoodAsset("mixing_bowl", "pause-bowl-asset")}<h2>Quầy nghỉ một chút</h2><p>Khách sẽ chờ khi bạn quay lại.</p><button class="button button-primary" data-action="pause-day">Tiếp tục bán</button></div></div>`;
}

function renderFeedback(feedback) {
  if (!feedback || Date.now() - feedback.createdAt > 2_000) return "";
  const accuracy = feedback.accuracy;
  const reaction = accuracy?.missingIngredients?.length
    ? `Thiếu ${INGREDIENT_BY_ID[accuracy.missingIngredients[0].id]?.name?.toLowerCase() ?? "nguyên liệu"} rồi…`
    : accuracy?.wrongIngredients?.length ? "Món hơi dư nguyên liệu nè…"
      : accuracy && !accuracy.sizeCorrect ? "Sai cỡ rồi…" : "Ngon quá!";
  const stars = `${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)}`;
  return `<div class="serve-feedback" key="${feedback.createdAt}" aria-live="polite"><span class="feedback-box" aria-hidden="true">${renderFoodAsset("food_box", "feedback-box-asset")}</span><strong>${escapeHtml(feedback.customerLabel ?? "Khách")} · +${formatMoneyCompact(feedback.revenue)}</strong><small>${reaction}</small><span>${stars}</span></div>`;
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

function getControlsSignature(state, order) {
  return JSON.stringify([
    order ? [order.id, order.preparedSize, order.preparedIngredients, order.mixed, order.mixing, order.packed, order.status] : null,
    ["rice_paper", "shrimp_salt", "satay", "tamarind_sauce"].map((id) => [id, state.stock[id]?.quantity ?? 0]),
    state.stock.food_box?.quantity ?? 0,
  ]);
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
