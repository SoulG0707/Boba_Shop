import { ROUTES } from "../config.js";
import { renderDashboard } from "./dashboard.js";
import { renderGameplayView } from "./gameplayView.js";
import { renderInventoryView } from "./inventoryView.js";
import { renderUpgradesView } from "./upgradesView.js";
import { renderPricesView } from "./pricesView.js";
import { renderReviewsView } from "./reviewsView.js";
import { renderStatsView } from "./statsView.js";
import { renderNoodleBranchView } from "./noodleBranchView.js";
import { renderBauCuaView } from "./bauCuaView.js";
import { renderXidachView } from "./xidachView.js";

const VIEWS = {
  dashboard: renderDashboard,
  gameplay: renderGameplayView,
  inventory: renderInventoryView,
  upgrades: renderUpgradesView,
  prices: renderPricesView,
  reviews: renderReviewsView,
  stats: renderStatsView,
  noodles: renderNoodleBranchView,
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
  return ROUTES.map((route) => `<button class="nav-link ${route.id === currentRoute ? "is-active" : ""}" data-navigate="${route.id}" ${route.id === currentRoute ? 'aria-current="page"' : ""}><span class="nav-icon">${route.icon}</span><span>${route.label}</span></button>`).join("");
}

export function renderCurrentView(state) {
  return VIEWS[currentRoute](state);
}

export function renderApp(state) {
  document.querySelector("#navigation").innerHTML = renderNavigation();
  document.querySelector("#view").innerHTML = renderCurrentView(state);
}
