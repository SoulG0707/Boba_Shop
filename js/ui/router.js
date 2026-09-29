import { ROUTES } from "../config.js";
import { renderDashboard } from "./dashboard.js";
import { renderGameplayView } from "./gameplayView.js";
import { renderInventoryView } from "./inventoryView.js";
import { renderUpgradesView } from "./upgradesView.js";
import { renderPricesView } from "./pricesView.js";
import { renderEmployeesView } from "./employeesView.js";
import { renderReviewsView } from "./reviewsView.js";
import { renderStatsView } from "./statsView.js";
import { renderBauCuaView } from "./bauCuaView.js";
import { renderXidachView } from "./xidachView.js";
import { renderPreparationShell } from "./preparationShell.js";

const VIEWS = {
  dashboard: renderDashboard,
  gameplay: renderGameplayView,
  inventory: renderInventoryView,
  upgrades: renderUpgradesView,
  prices: renderPricesView,
  employees: renderEmployeesView,
  reviews: renderReviewsView,
  stats: renderStatsView,
  baucua: renderBauCuaView,
  xidach: renderXidachView,
};

let currentRoute = "dashboard";
const PRIMARY_ROUTE_IDS = new Set(["dashboard", "inventory", "upgrades", "prices", "reviews", "stats"]);

export function navigate(routeId) {
  if (!VIEWS[routeId]) return false;
  currentRoute = routeId;
  return true;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function renderNavigation() {
  const primary = ROUTES.filter((route) => PRIMARY_ROUTE_IDS.has(route.id)).map(renderRouteButton).join("");
  const extras = ROUTES.filter((route) => !PRIMARY_ROUTE_IDS.has(route.id));
  const moreIsActive = extras.some((route) => route.id === currentRoute);
  const moreItems = extras.map((route) => {
    const active = route.id === currentRoute;
    return `<button class="prep-more-option ${active ? "is-active" : ""}" data-navigate="${route.id}" ${active ? 'aria-current="page"' : ""}><span>${renderRouteIcon(route)}</span><strong>${route.label}</strong></button>`;
  }).join("");

  return `<nav class="prep-tabs" aria-label="Các phần trong tiệm">${primary}<details class="prep-more"><summary class="prep-tab prep-more-trigger ${moreIsActive ? "is-active" : ""}"><span class="tab-icon" aria-hidden="true">•••</span><span>Thêm</span></summary><div class="prep-more-menu">${moreItems}</div></details></nav>`;
}

function renderRouteButton(route) {
  const active = route.id === currentRoute;
  return `<button class="prep-tab ${active ? "is-active" : ""}" data-navigate="${route.id}" ${active ? 'aria-current="page"' : ""}><span class="tab-icon">${renderRouteIcon(route)}</span><span>${route.label}</span></button>`;
}

function renderRouteIcon(route) {
  return ["prep", "inventory", "upgrades", "prices", "employees", "reviews", "stats"].includes(route.icon)
    ? `<img src="./img/icons/${route.icon === "prep" ? "preparation" : route.icon}.png" alt="">`
    : route.icon;
}

export function renderCurrentView(state, presentation = {}) {
  return VIEWS[currentRoute](state, presentation);
}

export function renderApp(state, presentation = {}) {
  const selling = ["running", "paused"].includes(state.gameplay.status);
  document.body.classList.toggle("is-selling", selling);
  document.querySelector("#app-shell").classList.toggle("is-selling", selling);

  if (selling) {
    document.querySelector("#view").innerHTML = renderGameplayView(state, presentation);
    return;
  }

  if (currentRoute === "gameplay") currentRoute = "dashboard";
  const content = renderCurrentView(state, presentation);
  document.querySelector("#view").innerHTML = renderPreparationShell(state, renderNavigation(), content);
}
