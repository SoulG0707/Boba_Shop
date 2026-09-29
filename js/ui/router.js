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

export function navigate(routeId) {
  if (!VIEWS[routeId]) return false;
  currentRoute = routeId;
  return true;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function renderNavigation() {
  return `<nav class="prep-tabs" aria-label="Các phần trong tiệm">${ROUTES.map((route) => {
    const icon = ["prep", "inventory", "upgrades", "prices", "employees", "reviews", "stats"].includes(route.icon)
      ? `<img src="./img/icons/${route.icon === "prep" ? "preparation" : route.icon}.png" alt="">`
      : route.icon;
    return `<button class="prep-tab ${route.id === currentRoute ? "is-active" : ""}" data-navigate="${route.id}" ${route.id === currentRoute ? 'aria-current="page"' : ""}><span class="tab-icon">${icon}</span><span>${route.label}</span></button>`;
  }).join("")}</nav>`;
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
