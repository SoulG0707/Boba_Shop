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
  const options = ROUTES.map((route) => {
    const active = route.id === currentRoute;
    const icon = ["inventory", "upgrades", "prices", "employees", "reviews", "stats"].includes(route.icon)
      ? `<img src="./img/icons/${route.icon}.png" alt="">`
      : `<span aria-hidden="true">${route.icon}</span>`;
    return `<button class="prep-route-option ${active ? "is-active" : ""}" data-navigate="${route.id}" ${active ? 'aria-current="page"' : ""}>${icon}<span>${route.label}</span></button>`;
  }).join("");
  return `<details class="prep-route-menu"><summary aria-label="Mở các màn khác"><span aria-hidden="true">•••</span></summary><nav aria-label="Các màn trong tiệm">${options}</nav></details>`;
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
  prepActionRoot.innerHTML = renderPreparationAction(state, preparation);
  const content = renderCurrentView(state, { ...presentation, preparation });
  document.querySelector("#view").innerHTML = renderPreparationShell(
    state,
    renderNavigation(),
    content,
    preparation,
    currentRoute,
  );
}
