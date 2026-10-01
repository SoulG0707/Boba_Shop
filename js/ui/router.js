import { ROUTES } from "../config.js";
import { getShopPreparationStatus } from "../systems/preparation.js";
import { renderGameplayView } from "./gameplayView.js";
import { renderInventoryView } from "./inventoryView.js";
import { renderUpgradesView } from "./upgradesView.js";
import { renderPricesView } from "./pricesView.js";
import { renderEmployeesView } from "./employeesView.js";
import { renderReviewsView } from "./reviewsView.js";
import { renderStatsView } from "./statsView.js";
import { renderBauCuaView } from "./bauCuaView.js";
import { renderXidachView } from "./xidachView.js";
import { renderMoreView } from "./moreView.js";
import { renderPreparationAction, renderPreparationShell } from "./preparationShell.js";

const VIEWS = {
  inventory: renderInventoryView,
  upgrades: renderUpgradesView,
  prices: renderPricesView,
  employees: renderEmployeesView,
  reviews: renderReviewsView,
  stats: renderStatsView,
  baucua: renderBauCuaView,
  xidach: renderXidachView,
  more: renderMoreView,
};

let currentRoute = "inventory";

export function navigate(routeId) {
  if (!VIEWS[routeId]) return false;
  currentRoute = routeId;
  return true;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function renderNavigation() {
  const mainRoutes = ROUTES.filter((route) => ["inventory", "upgrades", "prices", "reviews", "stats"].includes(route.id));
  const extras = ["employees", "baucua", "xidach"];
  const options = mainRoutes.map((route) => {
    const active = route.id === currentRoute;
    const icon = `<img src="./img/icons/${route.icon}.png" alt="">`;
    return `<button class="prep-route-option ${active ? "is-active" : ""}" data-navigate="${route.id}" ${active ? 'aria-current="page"' : ""}>${icon}<span>${route.label}</span></button>`;
  }).join("");
  const moreActive = currentRoute === "more" || extras.includes(currentRoute);
  return `<nav class="prep-main-nav" aria-label="Điều hướng chính">${options}<button class="prep-route-option ${moreActive ? "is-active" : ""}" data-navigate="more" ${moreActive ? 'aria-current="page"' : ""}><span class="more-nav-icon" aria-hidden="true">•••</span><span>Thêm</span></button></nav>`;
}

export function renderCurrentView(state, presentation = {}) {
  const render = VIEWS[currentRoute] ?? renderInventoryView;
  return render(state, presentation);
}

export function renderApp(state, presentation = {}) {
  const selling = ["running", "paused"].includes(state.gameplay.status);
  const appShell = document.querySelector("#app-shell");
  const prepActionRoot = document.querySelector("#prep-action-root");
  document.body.classList.toggle("is-selling", selling);
  appShell.classList.toggle("is-selling", selling);

  if (selling) {
    prepActionRoot.hidden = true;
    prepActionRoot.innerHTML = "";
    document.querySelector("#view").innerHTML = renderGameplayView(state, presentation);
    return;
  }

  const preparation = getShopPreparationStatus(state);
  prepActionRoot.hidden = false;
  prepActionRoot.innerHTML = renderPreparationAction(state, preparation, presentation);
  const content = renderCurrentView(state, { ...presentation, preparation });
  document.querySelector("#view").innerHTML = renderPreparationShell(
    state,
    renderNavigation(),
    content,
    preparation,
    currentRoute,
  );
}
