import { formatDuration, GAME_CONFIG } from "../config.js";
import { INGREDIENTS, INGREDIENT_BY_ID } from "../data/ingredients.js";
import { PRODUCT_BY_ID, PRODUCT_OPTIONS, getProductRecipe } from "../data/products.js";
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
    <section class="work-counter" aria-label="Bàn trộn bánh tráng">
      <div class="counter-work">
        <div class="counter-note">${currentOrder ? renderOrderDetails(currentOrder, selectedCustomer) : `<span class="counter-note-empty">Chọn khách để xem món cần làm</span>`}</div>
        <div class="counter-center">
          ${renderMixingBowl(currentOrder)}
          ${renderWorkControls(currentOrder, state)}
        </div>
      </div>
      <div class="ingredient-tools">${renderIngredientControls(state, currentOrder)}</div>
    </section>
    ${renderFeedback(presentation.feedback)}
    ${state.gameplay.status === "paused" ? `<div class="pause-curtain"><div><span>🥣</span><h2>Quầy nghỉ một chút</h2><p>Khách sẽ chờ khi bạn quay lại.</p><button class="button button-primary" data-action="pause-day">Tiếp tục bán</button></div></div>` : ""}
  </section>`;
}

function renderCustomer(customer, state, isSelected) {
  const order = state.orders.find((candidate) => candidate.id === customer.orderId && candidate.status !== "cancelled");
  if (!order) return "";
  const item = order.items[0];
  const product = PRODUCT_BY_ID[item.productId];
  const size = PRODUCT_OPTIONS.sizes[item.size]?.label ?? "SIZE M";
  const recipe = getProductRecipe(item.productId, item) ?? {};
  const ingredients = Object.keys(recipe).filter((id) => id !== "food_box").slice(0, 4).map((id) => INGREDIENT_BY_ID[id]?.name ?? id).join(" · ");
  const sprite = spritePosition(customer.type);
  const patience = Math.max(0, Math.min(100, (customer.patience / 55) * 100));
  return `<button class="customer-stop ${isSelected ? "is-selected" : ""}" data-action="select-customer" data-customer="${customer.id}" aria-pressed="${isSelected}">
    <span class="customer-face ${sprite.delivery ? "is-delivery" : ""}" style="--sprite-x:${sprite.column * 50}%;--sprite-y:${sprite.row * (sprite.delivery ? 100 : 12.5)}%" aria-hidden="true"></span>
    <span class="customer-speech"><strong>${escapeHtml(customer.label)}</strong><small>${escapeHtml(product?.name ?? "Bánh tráng trộn")} · ${size}</small><small>${escapeHtml(ingredients)}</small></span>
    <span class="patience-track"><i class="${customer.patience < 12 ? "is-short" : ""}" style="width:${patience}%"></i></span>
  </button>`;
}

function renderOrderDetails(order, customer) {
  const item = order.items[0];
  const product = PRODUCT_BY_ID[item.productId];
  const requestedSize = PRODUCT_OPTIONS.sizes[item.size]?.label ?? "SIZE M";
  const target = getProductRecipe(item.productId, item) ?? {};
  const ingredients = Object.entries(target).filter(([id]) => id !== "food_box").slice(0, 5);
  const list = ingredients.map(([id, quantity]) => `${quantity} ${INGREDIENT_BY_ID[id]?.name ?? id}`).join(" · ");
  return `<span class="counter-customer">${escapeHtml(customer.label)} gọi món · ${requestedSize}</span><strong>${escapeHtml(product?.name ?? "Bánh tráng trộn")}</strong><small>${formatMoneyCompact(order.totalPrice)} · ${escapeHtml(list)}${Object.keys(target).length > 6 ? " · …" : ""}</small>`;
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
    return `<button class="bowl-topping topping-${index % 8}" data-action="remove-bowl-ingredient" data-ingredient="${id}" ${order?.mixed ? "disabled" : ""} aria-label="Bỏ ${escapeHtml(ingredient?.name ?? id)} khỏi tô">${renderFoodAsset(id, "bowl-ingredient-asset")}${quantity > 1 ? `<small>×${quantity}</small>` : ""}</button>`;
  }).join("");
  const stage = order?.mixed ? "Đã trộn xong" : order?.mixing ? "Đang trộn…" : ingredients.length ? "Chạm nguyên liệu trong tô để bỏ" : "Tô đang trống";
  return `<div class="mixing-bowl-wrap">
    <div class="mixing-bowl ${order?.mixing ? "is-mixing" : ""} ${order?.mixed ? "is-mixed" : ""}" aria-label="Tô trộn bánh tráng">
      ${renderFoodAsset("mixing_bowl", "mixing-bowl-art", "Thau trộn bánh tráng")}
      <div class="bowl-contents ${hasSatay ? "has-satay" : ""} ${hasTamarind ? "has-tamarind" : ""}">${toppings || `<span class="bowl-empty">${renderFoodAsset("rice_paper", "bowl-empty-asset")}</span>`}</div>
    </div><small class="bowl-hint">${stage}</small>
  </div>`;
}

function renderWorkControls(order, state) {
  if (!order) return `<div class="counter-controls"><div class="counter-waiting">${renderFoodAsset("mixing_bowl", "waiting-bowl-asset")}<small>Tô trộn đang chờ</small></div></div>`;
  const item = order.items[0];
  const hasIngredients = Object.values(order.preparedIngredients ?? {}).some((quantity) => quantity > 0);
  const sizeDisabled = order.mixed || hasIngredients || order.status !== "waiting";
  const sizeButtons = Object.entries(PRODUCT_OPTIONS.sizes).map(([id, option]) =>
    `<button class="size-choice ${order.preparedSize === id ? "is-selected" : ""}" data-action="choose-order-size" data-size="${id}" ${sizeDisabled ? "disabled" : ""}>${option.label}</button>`,
  ).join("");
  const canMix = Boolean(order.preparedSize && order.preparedIngredients?.rice_paper > 0 && order.status === "waiting" && !order.mixed && !order.mixing);
  const canPack = Boolean(order.mixed && order.status === "waiting" && (state.stock.food_box?.quantity ?? 0) > 0);
  const mixLabel = order.mixing ? "ĐANG TRỘN…" : "TRỘN";
  const packLabel = order.packed ? "ĐÃ ĐÓNG HỘP" : "ĐÓNG HỘP";
  return `<div class="counter-controls">
    <div class="size-choices" aria-label="Chọn size">${sizeButtons}</div>
    <div class="order-actions">
      <button class="button button-primary" data-action="mix-order" ${canMix ? "" : "disabled"}>${mixLabel}</button>
      <button class="button button-secondary" data-action="pack-order" ${canPack ? "" : "disabled"}>${packLabel}</button>
      <button class="button button-serve" data-action="serve-order" data-order="${order.id}" ${order.packed ? "" : "disabled"}>GIAO KHÁCH · ${formatMoneyCompact(order.totalPrice)}</button>
    </div>
    <small class="size-hint">Khách gọi ${PRODUCT_OPTIONS.sizes[item.size]?.label ?? "SIZE M"}</small>
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
