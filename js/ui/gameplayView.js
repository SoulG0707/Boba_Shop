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

export function renderGameplayView(state, presentation = {}) {
  const remaining = getRemainingSeconds(state);
  const ratio = Math.max(0, Math.min(100, (remaining / GAME_CONFIG.DAY_DURATION_SECONDS) * 100));
  const activeCustomers = state.customers.filter((customer) => customer.status === "waiting");
  const selectedCustomer = activeCustomers.find((customer) => customer.id === presentation.selectedCustomerId) ?? activeCustomers[0] ?? null;
  const currentOrder = selectedCustomer ? state.orders.find((order) => order.id === selectedCustomer.orderId && order.status !== "cancelled") : null;
  const currentEvent = state.currentEvent ? `<span class="scene-event">✨ ${escapeHtml(state.currentEvent.name)}</span>` : "";
  const customerLane = activeCustomers.length
    ? activeCustomers.map((customer) => renderCustomer(customer, state, customer.id === selectedCustomer?.id)).join("")
    : `<div class="empty-customer"><span>🛵</span><strong>Quầy đang chờ khách</strong><small>Một vị khách sẽ ghé ngay thôi!</small></div>`;

  return `<section class="selling-scene ${state.gameplay.status === "paused" ? "is-paused" : ""}" aria-label="Quầy bánh tráng trộn">
    <div class="scene-topline"><div class="scene-clock"><strong>${formatDuration(remaining)}</strong><span>Ngày ${state.day} · ${state.gameplay.status === "paused" ? "Tạm nghỉ" : "Đang bán"}</span></div><div class="scene-meter"><i style="width:${ratio}%"></i></div>${currentEvent}</div>
    <div class="stall-shelf" aria-hidden="true">${["green_mango", "satay", "shrimp_salt", "quail_egg", "vietnamese_coriander", "peanut"].map((id) => renderFoodAsset(id, "shelf-asset")).join("")}</div>
    <div class="customer-deck"><div class="customer-lane">${customerLane}</div>${renderOnlineOrders(state)}</div>
    ${currentOrder ? renderOrderDetails(currentOrder, selectedCustomer) : ""}
    <section class="work-counter" aria-label="Bàn trộn bánh tráng">
      <div class="counter-work">
        <div class="counter-center">
          ${renderMixingBowl(currentOrder)}
          ${renderWorkControls(currentOrder, state)}
        </div>
      </div>
      <div class="ingredient-tools">${renderIngredientControls(state, currentOrder)}</div>
      ${renderSellingActions(currentOrder, state)}
    </section>
    ${renderFeedback(presentation.feedback)}
    ${state.gameplay.status === "paused" ? `<div class="pause-curtain"><div><span>🥣</span><h2>Quầy nghỉ một chút</h2><p>Khách sẽ chờ khi bạn quay lại.</p><button class="button button-primary" data-action="pause-day">Tiếp tục bán</button></div></div>` : ""}
  </section>`;
}

function renderCustomer(customer, state, isSelected) {
  const order = state.orders.find((candidate) => candidate.id === customer.orderId && candidate.status !== "cancelled");
  if (!order) return "";
  const item = order.items[0];
  const size = getSizeLabel(item.size).toLowerCase();
  const sprite = spritePosition(customer.type);
  const maxPatience = Math.max(1, customer.maxPatience ?? customer.patience ?? 1);
  const patience = Math.max(0, Math.min(100, (customer.patience / maxPatience) * 100));
  const patienceState = patience < 30 ? "is-danger" : patience <= 60 ? "is-warning" : "is-normal";
  return `<button class="customer-stop ${isSelected ? "is-selected" : ""}" data-action="select-customer" data-customer="${customer.id}" aria-pressed="${isSelected}">
    <span class="customer-face ${sprite.delivery ? "is-delivery" : ""}" style="--sprite-x:${sprite.column * 50}%;--sprite-y:${sprite.row * (sprite.delivery ? 100 : 12.5)}%" aria-hidden="true"></span>
    <span class="customer-speech"><strong>${escapeHtml(customer.label)}</strong><small>“Cho mình phần ${escapeHtml(size)} nha!”</small></span>
    <span class="patience-meter"><span>Kiên nhẫn</span><span class="patience-track" role="progressbar" aria-label="Kiên nhẫn của ${escapeHtml(customer.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(patience)}"><i class="${patienceState}" style="width:${patience}%"></i></span></span>
  </button>`;
}

function renderOrderDetails(order, customer) {
  const item = order.items[0];
  const product = PRODUCT_BY_ID[item.productId];
  const target = getProductRecipe(item.productId, item) ?? {};
  const baseQuantity = target.rice_paper ?? 0;
  const toppings = Object.entries(target).filter(([id]) => id !== "food_box" && id !== "rice_paper");
  const toppingChips = toppings.map(([id, quantity]) => {
    const name = INGREDIENT_BY_ID[id]?.name ?? id;
    return `<li class="order-topping-chip"><strong>${escapeHtml(name)}</strong>${quantity > 1 ? `<span>×${quantity}</span>` : ""}</li>`;
  }).join("");
  return `<section class="active-order-card" aria-label="Đơn hiện tại của ${escapeHtml(customer.label)}" aria-live="polite">
    <div class="active-order-kicker"><span>ĐƠN CỦA KHÁCH</span><span>${formatMoneyCompact(order.totalPrice)}</span></div>
    <div class="active-order-heading"><h2>${escapeHtml(product?.name ?? "Bánh tráng trộn")}</h2><div class="order-size-field"><span>Kích cỡ</span><strong class="size-badge">${escapeHtml(getSizeLabel(item.size))}</strong></div></div>
    <div class="order-base-field"><span>Phần nền</span><strong>Bánh tráng${baseQuantity > 1 ? ` ×${baseQuantity}` : ""}</strong></div>
    <div class="order-toppings-field"><span class="order-field-label">Topping &amp; gia vị</span><ul class="order-toppings">${toppingChips}</ul></div>
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

function renderWorkControls(order, state) {
  if (!order) return `<div class="counter-controls"><div class="counter-waiting">${renderFoodAsset("mixing_bowl", "waiting-bowl-asset")}<small>Tô trộn đang chờ</small></div></div>`;
  const item = order.items[0];
  const hasIngredients = Object.values(order.preparedIngredients ?? {}).some((quantity) => quantity > 0);
  const sizeDisabled = order.mixed || order.mixing || hasIngredients || order.status !== "waiting";
  const sizeButtons = Object.entries(PRODUCT_OPTIONS.sizes).map(([id, option]) =>
    `<button class="size-choice ${order.preparedSize === id ? "is-selected" : ""}" data-action="choose-order-size" data-size="${id}" aria-pressed="${order.preparedSize === id}" ${sizeDisabled ? "disabled" : ""}>${escapeHtml(option.label)}</button>`,
  ).join("");
  return `<div class="counter-controls">
    <span class="size-choices-label">Chọn size</span>
    <div class="size-choices" aria-label="Chọn size">${sizeButtons}</div>
    <small class="size-hint">Khách gọi ${escapeHtml(getSizeLabel(item.size))}</small>
  </div>`;
}

function renderSellingActions(order, state) {
  if (!order) return "";
  const canMix = Boolean(order.preparedSize && order.preparedIngredients?.rice_paper > 0 && order.status === "waiting" && !order.mixed && !order.mixing);
  const canPack = Boolean(order.mixed && order.status === "waiting" && (state.stock.food_box?.quantity ?? 0) > 0);
  const mixLabel = order.mixing ? "ĐANG TRỘN…" : "TRỘN";
  const packLabel = order.packed ? "ĐÃ ĐÓNG HỘP" : "ĐÓNG HỘP";
  return `<div class="selling-actions" aria-label="Thao tác đơn hàng">
    <button class="button button-primary" data-action="mix-order" ${canMix ? "" : "disabled"}>${mixLabel}</button>
    <button class="button button-secondary" data-action="pack-order" ${canPack ? "" : "disabled"}>${packLabel}</button>
    <button class="button button-serve" data-action="serve-order" data-order="${order.id}" ${order.packed ? "" : "disabled"}>GIAO KHÁCH · ${formatMoneyCompact(order.totalPrice)}</button>
  </div>`;
}

function renderIngredientControls(state, order) {
  const prepared = order?.preparedIngredients ?? {};
  const item = order?.items?.[0];
  const targetRecipe = item ? getProductRecipe(item.productId, { size: order.preparedSize ?? item.size }) ?? {} : {};
  const locked = !order || order.status !== "waiting" || order.mixed || order.mixing;
  return `<div class="ingredient-tools-heading"><span>NGUYÊN LIỆU</span><small>${order?.preparedSize ? `${Object.values(prepared).reduce((sum, quantity) => sum + quantity, 0)} phần trong tô` : "Chọn size rồi thêm vào tô"}</small></div>
    <div class="ingredient-control-grid">${INGREDIENTS.filter((ingredient) => ingredient.id !== "food_box").map((ingredient) => {
      const stock = state.stock[ingredient.id]?.quantity ?? 0;
      const inBowl = prepared[ingredient.id] ?? 0;
      const requested = targetRecipe[ingredient.id] ?? 0;
      const unavailable = !order || locked || stock <= inBowl;
      const stateLabel = !order ? "Chọn khách" : !order.preparedSize ? "Chọn size" : `${inBowl}/${requested || "thêm"} · kho ${stock}`;
      return `<button class="ingredient-control ${inBowl ? "is-active" : ""} ${stock <= inBowl ? "is-unavailable" : ""}" data-action="add-order-ingredient" data-ingredient="${ingredient.id}" aria-label="Thêm ${escapeHtml(ingredient.name)}, còn ${stock}" ${unavailable ? "disabled" : ""}>${renderFoodAsset(ingredient.id, "ingredient-control-asset")}<strong>${escapeHtml(ingredient.name)}</strong><small>${stateLabel}</small></button>`;
    }).join("")}</div>`;
}

function renderOnlineOrders(state) {
  const orders = state.onlineOrders.filter((order) => ["waiting", "preparing", "ready"].includes(order.status));
  if (!orders.length) return "";
  const employee = state.employees.some((candidate) => candidate.role === "online");
  return `<div class="delivery-row">${orders.slice(0, 2).map((order) => {
    const product = PRODUCT_BY_ID[order.items[0]?.productId];
    const action = order.status === "waiting"
      ? `<button data-action="accept-online" data-order="${order.id}" ${employee ? "disabled" : ""}>${employee ? "Đang làm" : "Nhận đơn"}</button>`
      : `<button data-action="complete-online" data-order="${order.id}" ${employee ? "disabled" : ""}>Giao hộp</button>`;
    return `<div class="delivery-order"><span class="delivery-face" aria-hidden="true"></span><span><strong>${escapeHtml(product?.name ?? "Đơn bánh tráng")}</strong><small>${formatMoneyCompact(order.totalPrice)}</small></span>${action}</div>`;
  }).join("")}</div>`;
}

function renderFeedback(feedback) {
  if (!feedback || Date.now() - feedback.createdAt > 2_000) return "";
  const accuracy = feedback.accuracy;
  const reaction = accuracy?.missingIngredients?.length
    ? `Thiếu ${INGREDIENT_BY_ID[accuracy.missingIngredients[0].id]?.name?.toLowerCase() ?? "nguyên liệu"} rồi…`
    : accuracy?.wrongIngredients?.length ? "Món hơi dư nguyên liệu nè…"
      : accuracy && !accuracy.sizeCorrect ? "Sai size rồi…" : "Ngon quá!";
  const stars = `${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)}`;
  return `<div class="serve-feedback" key="${feedback.createdAt}"><span class="feedback-box" aria-hidden="true">${renderFoodAsset("food_box", "feedback-box-asset")}</span><strong>+${formatMoneyCompact(feedback.revenue)}</strong><small>${reaction}</small><span>${stars}</span></div>`;
}

function spritePosition(type) {
  return CUSTOMER_SPRITES[type] ?? CUSTOMER_SPRITES.regular;
}
