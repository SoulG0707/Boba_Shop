import { UPGRADES } from "../data/upgrades.js";
import { getUpgradeCost } from "../systems/upgrades.js";
import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

const UPGRADE_ICONS = { sealer: "🥤", ledSign: "💡", chairs: "🪑", advertising: "📣", counter: "🧰", airConditioner: "❄️" };

export function renderUpgradesView(state) {
  const cards = UPGRADES.map((upgrade) => {
    const level = state.upgrades[upgrade.id] ?? 0;
    const cost = getUpgradeCost(state, upgrade.id);
    const effects = Object.entries(upgrade.effects).map(([key, value]) => `${effectName(key)} +${Math.round(value * 100)}%`).join(" · ");
    return `<article class="card upgrade-card"><div class="card-head"><span class="upgrade-icon">${UPGRADE_ICONS[upgrade.id]}</span><span class="pill">Cấp ${level} / ${upgrade.maxLevel}</span></div><div><h3>${escapeHtml(upgrade.name)}</h3><p class="tiny">${escapeHtml(upgrade.description)}</p></div><div class="upgrade-level">${Array.from({ length: upgrade.maxLevel }, (_, index) => `<span class="level-dot ${index < level ? "is-filled" : ""}"></span>`).join("")}</div><span class="tiny muted">${effects}</span><button class="button ${level >= upgrade.maxLevel ? "button-quiet" : "button-primary"}" data-action="buy-upgrade" data-upgrade="${upgrade.id}" ${level >= upgrade.maxLevel || state.money < cost ? "disabled" : ""}>${level >= upgrade.maxLevel ? "Đã tối đa" : `Nâng cấp · ${formatMoney(cost)}`}</button></article>`;
  }).join("");
  return `${renderPageHeading("Nâng cấp tiệm", "Đầu tư vừa sức để phục vụ nhanh hơn và thu hút thêm khách.")}<div class="page-content"><div class="grid-3">${cards}</div></div>`;
}

function effectName(key) {
  return ({ serviceSpeed: "Tốc độ phục vụ", customerSpawn: "Lượng khách", patience: "Kiên nhẫn", onlineOrders: "Đơn online", rating: "Đánh giá", capacity: "Sức chứa" })[key] ?? key;
}
