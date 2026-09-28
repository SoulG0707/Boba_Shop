import { formatDuration, formatMoney, GAME_CONFIG } from "../config.js";
import { INGREDIENT_BY_ID } from "../data/ingredients.js";
import { PRODUCT_BY_ID, PRODUCT_OPTIONS, getProductRecipe } from "../data/products.js";
import { getRemainingSeconds } from "../systems/dayCycle.js";
import { escapeHtml } from "./helpers.js";

const CUSTOMER_SPRITES = Object.freeze({
  regular: { row: 0, column: 0 },
  student: { row: 7, column: 0 },
  office: { row: 5, column: 0 },
  reviewer: { row: 3, column: 0 },
  noodle: { row: 2, column: 0 },
  online: { row: 0, column: 0, delivery: true },
});

export function getDefaultCupVisual(order) {
  const item = order?.items?.[0];
  if (!item) return { base: true, milk: true, ice: true, pearls: false };
  const recipe = getProductRecipe(item.productId, item) ?? {};
  return { base: true, milk: Boolean(recipe.milk), ice: true, pearls: item.topping !== "none" };
}

export function renderGameplayView(state, presentation = {}) {
  const remaining = getRemainingSeconds(state);
  const ratio = Math.max(0, Math.min(100, (remaining / GAME_CONFIG.DAY_DURATION_SECONDS) * 100));
  const activeCustomers = state.customers.filter((customer) => customer.status === "waiting");
  const selectedCustomer = activeCustomers.find((customer) => customer.id === presentation.selectedCustomerId) ?? activeCustomers[0] ?? null;
  const currentOrder = selectedCustomer ? state.orders.find((order) => order.id === selectedCustomer.orderId && order.status !== "cancelled") : null;
  const sprite = selectedCustomer ? spritePosition(selectedCustomer.type) : null;
  const currentEvent = state.currentEvent ? `<span class="scene-event">✨ ${escapeHtml(state.currentEvent.name)}</span>` : "";
  const customerLane = activeCustomers.length
    ? activeCustomers.map((customer) => renderCustomer(customer, state, customer.id === selectedCustomer?.id)).join("")
    : `<div class="empty-customer"><span>🚪</span><strong>Tiệm đang chờ khách</strong><small>Một vị khách sẽ ghé ngay thôi!</small></div>`;

  return `<section class="selling-scene ${state.gameplay.status === "paused" ? "is-paused" : ""}" aria-label="Quầy pha chế">
    <div class="scene-topline"><div class="scene-clock"><strong>${formatDuration(remaining)}</strong><span>Ngày ${state.day} · ${state.gameplay.status === "paused" ? "Tạm nghỉ" : "Đang bán"}</span></div><div class="scene-meter"><i style="width:${ratio}%"></i></div>${currentEvent}</div>
    <div class="customer-deck"><div class="customer-lane">${customerLane}</div>${renderOnlineOrders(state)}</div>
    <section class="work-counter" aria-label="Bàn pha chế">
      <div class="counter-work">
        <div class="counter-note">${currentOrder ? renderOrderDetails(currentOrder, selectedCustomer) : `<span class="counter-note-empty">Chọn khách để xem món cần pha</span>`}</div>
        <div class="cup-workspace">${renderCup(currentOrder, presentation.visualCup)}</div>
        <div class="counter-serve">${currentOrder ? renderServeControl(currentOrder) : `<span>🧋</span><small>Chiếc cốc tiếp theo đang chờ</small>`}</div>
      </div>
      <div class="ingredient-tools">${renderIngredientControls(state, currentOrder, presentation.visualCup)}</div>
    </section>
    ${renderFeedback(presentation.feedback, sprite)}
    ${state.gameplay.status === "paused" ? `<div class="pause-curtain"><div><span>☕</span><h2>Tiệm nghỉ một chút</h2><p>Khách sẽ chờ khi bạn quay lại.</p><button class="button button-primary" data-action="pause-day">Tiếp tục bán</button></div></div>` : ""}
  </section>`;
}

function renderCustomer(customer, state, isSelected) {
  const order = state.orders.find((candidate) => candidate.id === customer.orderId && candidate.status !== "cancelled");
  if (!order) return "";
  const item = order.items[0];
  const product = PRODUCT_BY_ID[item.productId];
  const topping = PRODUCT_OPTIONS.toppings[item.topping]?.label ?? "Không topping";
  const size = PRODUCT_OPTIONS.sizes[item.size]?.label ?? "Vừa";
  const sprite = spritePosition(customer.type);
  const patience = Math.max(0, Math.min(100, (customer.patience / 55) * 100));
  return `<button class="customer-stop ${isSelected ? "is-selected" : ""}" data-action="select-customer" data-customer="${customer.id}" aria-pressed="${isSelected}">
    <span class="customer-face ${sprite.delivery ? "is-delivery" : ""}" style="--sprite-x:${sprite.column * (sprite.delivery ? 50 : 50)}%;--sprite-y:${sprite.row * (sprite.delivery ? 100 : 12.5)}%" aria-hidden="true"></span>
    <span class="customer-speech"><strong>${escapeHtml(customer.label)}</strong><small>${escapeHtml(product?.name ?? "Món trà")} · ${size}</small><small>${escapeHtml(topping)}</small></span>
    <span class="patience-track"><i class="${customer.patience < 12 ? "is-short" : ""}" style="width:${patience}%"></i></span>
  </button>`;
}

function renderOrderDetails(order, customer) {
  const item = order.items[0];
  const product = PRODUCT_BY_ID[item.productId];
  const topping = PRODUCT_OPTIONS.toppings[item.topping]?.label ?? "Không topping";
  return `<span class="counter-customer">${escapeHtml(customer.label)} gọi món</span><strong>${escapeHtml(product?.name ?? "Trà sữa")}</strong><small>${PRODUCT_OPTIONS.sizes[item.size]?.label ?? "Vừa"} · ${escapeHtml(topping)} · ${formatMoney(order.totalPrice)}</small>`;
}

function renderCup(order, visualCup = null) {
  const item = order?.items?.[0];
  const product = item ? PRODUCT_BY_ID[item.productId] : null;
  const recipe = item ? getProductRecipe(item.productId, item) ?? {} : {};
  const baseIngredient = Object.keys(product?.baseRecipe ?? {}).find((id) => id !== "milk" && id !== "sugar" && id !== "cup") ?? "tea";
  const defaults = getDefaultCupVisual(order);
  const visual = visualCup?.orderId === order?.id ? { ...defaults, ...visualCup.ingredients } : defaults;
  const isMatcha = baseIngredient === "matcha";
  const baseColor = !visual.base ? "#f2dca8" : isMatcha ? "#94ad61" : "#ac704b";
  const liquidColor = visual.milk ? mixWithMilk(baseColor) : baseColor;
  const pearlId = item?.topping === "whitePearl" ? "whitePearl" : "blackPearl";
  const pearlCount = visual.pearls ? 5 : 0;
  const ice = visual.ice ? `<div class="cup-ice-cubes"><i></i><i></i><i></i></div>` : "";
  const pearls = pearlCount ? `<div class="cup-pearls ${pearlId === "whitePearl" ? "pearls-white" : ""}"><i></i><i></i><i></i><i></i><i></i></div>` : "";
  const foam = visual.milk ? `<span class="cup-foam"></span>` : "";

  return `<div class="drink-cup-wrap ${item?.size === "large" ? "is-large" : ""}" aria-label="${product ? escapeHtml(product.name) : "Ly trà đang chờ"}">
    <span class="cup-straw"></span><span class="cup-liquid" style="--drink-color:${liquidColor}"></span>${foam}${ice}${pearls}
    <img class="cup-glass-art" src="./img/cup/glass.png" alt=""><img class="cup-lid-art" src="./img/cup/lid.png" alt="">
  </div>`;
}

function renderIngredientControls(state, order, visualCup = null) {
  const item = order?.items?.[0];
  const product = item ? PRODUCT_BY_ID[item.productId] : null;
  const baseIngredient = Object.keys(product?.baseRecipe ?? {}).find((id) => id !== "milk" && id !== "sugar" && id !== "cup") ?? "tea";
  const recipe = item ? getProductRecipe(item.productId, item) ?? {} : {};
  const defaults = getDefaultCupVisual(order);
  const visual = visualCup?.orderId === order?.id ? { ...defaults, ...visualCup.ingredients } : defaults;
  const toppingId = item?.topping === "whitePearl" ? "whitePearl" : "blackPearl";
  const toppingLabel = item?.topping === "none" ? "Trân châu" : item ? PRODUCT_OPTIONS.toppings[item.topping]?.label ?? "Trân châu" : "Trân châu";
  const controls = [
    { key: "base", id: baseIngredient, name: baseIngredient === "matcha" ? "Matcha" : "Trà đen", emoji: INGREDIENT_BY_ID[baseIngredient]?.emoji ?? "🍃", active: visual.base, required: true },
    { key: "milk", id: "milk", name: "Sữa", emoji: INGREDIENT_BY_ID.milk.emoji, active: visual.milk, required: Boolean(recipe.milk) },
    { key: "ice", id: null, name: "Đá", emoji: "🧊", active: visual.ice, required: true },
    { key: "pearls", id: toppingId, name: toppingLabel, emoji: INGREDIENT_BY_ID[toppingId].emoji, active: visual.pearls, required: item?.topping !== "none" },
  ];

  return `<div class="ingredient-tools-heading"><span>Chạm nguyên liệu để xem ly thay đổi</span><small>Minh họa theo món khách gọi</small></div><div class="ingredient-control-grid">${controls.map((control) => {
    const available = control.id == null || (state.stock[control.id]?.quantity ?? 0) > 0;
    const unavailable = !available || !control.required || !order;
    return `<button class="ingredient-control ${control.active ? "is-active" : ""} ${unavailable ? "is-unavailable" : ""}" data-action="toggle-cup-ingredient" data-ingredient="${control.key}" aria-pressed="${Boolean(control.active)}" ${unavailable ? "disabled" : ""}><span>${control.emoji}</span><strong>${escapeHtml(control.name)}</strong><small>${!order ? "Chọn khách" : !control.required ? "Không gọi" : control.id ? state.stock[control.id]?.quantity ?? 0 : ""}</small></button>`;
  }).join("")}</div>`;
}

function renderServeControl(order) {
  if (order.status === "waiting") return `<button class="button button-primary serve-button" data-action="prepare-order" data-order="${order.id}">Pha chế món này</button>`;
  if (order.status === "preparing") return `<button class="button button-primary serve-button" disabled>Đang pha · ${Math.max(1, Math.ceil(order.preparationRemaining))}s</button>`;
  return `<button class="button button-primary serve-button" data-action="serve-order" data-order="${order.id}">Giao ly cho khách · ${formatMoney(order.totalPrice)}</button>`;
}

function renderOnlineOrders(state) {
  const orders = state.onlineOrders.filter((order) => ["waiting", "preparing", "ready"].includes(order.status));
  if (!orders.length) return "";
  const employee = state.employees.some((candidate) => candidate.role === "online");
  return `<div class="delivery-row">${orders.slice(0, 2).map((order) => {
    const product = PRODUCT_BY_ID[order.items[0]?.productId];
    const action = order.status === "waiting"
      ? `<button data-action="accept-online" data-order="${order.id}" ${employee ? "disabled" : ""}>Nhận</button>`
      : `<button data-action="complete-online" data-order="${order.id}" ${employee ? "disabled" : ""}>Giao</button>`;
    return `<div class="delivery-order"><span class="delivery-face" aria-hidden="true"></span><span><strong>${escapeHtml(product?.name ?? "Đơn trà")}</strong><small>${formatMoney(order.totalPrice)}</small></span>${action}</div>`;
  }).join("")}</div>`;
}

function renderFeedback(feedback, fallbackSprite) {
  if (!feedback || Date.now() - feedback.createdAt > 2_000) return "";
  const sprite = spritePosition(feedback.customerType) ?? fallbackSprite;
  const reaction = sprite ? `<span class="reaction-face ${sprite.delivery ? "is-delivery" : ""}" style="--sprite-x:${feedback.rating >= 4 ? "50" : "100"}%;--sprite-y:${sprite.row * (sprite.delivery ? 100 : 12.5)}%"></span>` : "";
  const stars = `${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)}`;
  return `<div class="serve-feedback" key="${feedback.createdAt}">${reaction}<strong>+${formatMoney(feedback.revenue)}</strong><span>${stars}</span></div>`;
}

function spritePosition(type) {
  return CUSTOMER_SPRITES[type] ?? CUSTOMER_SPRITES.regular;
}

function mixWithMilk(color) {
  const channels = color.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16));
  const mixed = channels.map((channel) => Math.round(channel * 0.68 + 255 * 0.32));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
