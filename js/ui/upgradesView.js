import { UPGRADES } from "../data/upgrades.js";
import { getUpgradeCost } from "../systems/upgrades.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";

const UPGRADE_ICONS = { sealer: "🥣", ledSign: "💡", chairs: "🪑", advertising: "📣", onlineChannel: "📱", counter: "🫙", airConditioner: "🧊" };

export function renderUpgradesView(state) {
  const rows = UPGRADES.map((upgrade) => {
    const level = state.upgrades[upgrade.id] ?? 0;
    const cost = getUpgradeCost(state, upgrade.id);
    const effects = Object.entries(upgrade.effects).map(([key, value]) => `${effectName(key)} +${Math.round(value * 100)}%`).join(" · ");
    const dots = Array.from({ length: upgrade.maxLevel }, (_, index) => `<i class="level-dot ${index < level ? "is-filled" : ""}"></i>`).join("");
    const locked = state.day < (upgrade.minDay ?? 1);
    const buttonText = locked ? `Mở ngày ${upgrade.minDay}` : level >= upgrade.maxLevel ? "Đã tối đa" : `Nâng · ${formatMoneyCompact(cost)}`;
    return `<div class="prep-row upgrade-row"><span class="row-emoji">${UPGRADE_ICONS[upgrade.id] ?? "✨"}</span><div class="row-copy"><strong>${escapeHtml(upgrade.name)} <small class="upgrade-level-label">${level}/${upgrade.maxLevel}</small></strong><small>${escapeHtml(upgrade.description)}</small><small class="upgrade-effects">${escapeHtml(effects)}</small><span class="upgrade-level">${dots}</span></div><div class="row-actions"><button class="button button-small button-primary" data-action="buy-upgrade" data-upgrade="${upgrade.id}" ${locked || level >= upgrade.maxLevel || state.money < cost ? "disabled" : ""}>${buttonText}</button></div></div>`;
  }).join("");

  return `<div class="page-heading"><div><h2>Nâng cấp tiệm</h2><p>Đầu tư từng chút để quầy phục vụ nhanh hơn.</p></div><span class="pill">${UPGRADES.reduce((sum, upgrade) => sum + (state.upgrades[upgrade.id] ?? 0), 0)} cấp</span></div><div class="prep-list">${rows}</div>`;
}

function effectName(key) {
  return ({ serviceSpeed: "Tốc độ", customerSpawn: "Khách", patience: "Kiên nhẫn", onlineOrders: "Đơn online", rating: "Đánh giá", capacity: "Sức chứa", shelfLife: "Hạn dùng" })[key] ?? key;
}
