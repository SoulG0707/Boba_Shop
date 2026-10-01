import { UPGRADE_BY_ID } from "../data/upgrades.js";

export function getUpgradeCost(state, upgradeId) {
  const definition = UPGRADE_BY_ID[upgradeId];
  if (!definition) return Infinity;
  const level = state.upgrades[upgradeId] ?? 0;
  if (level >= definition.maxLevel) return Infinity;
  return Math.round(definition.baseCost * definition.costMultiplier ** level);
}

export function buyUpgrade(state, upgradeId) {
  const definition = UPGRADE_BY_ID[upgradeId];
  const cost = getUpgradeCost(state, upgradeId);
  if (!definition || !Number.isFinite(cost)) return { success: false, reason: "Nâng cấp đã đạt cấp tối đa." };
  if (state.day < (definition.minDay ?? 1)) return { success: false, reason: `Mở từ ngày ${definition.minDay}.` };
  if (state.money < cost) return { success: false, reason: "Tiệm chưa đủ tiền để nâng cấp." };
  state.money -= cost;
  state.upgrades[upgradeId] = (state.upgrades[upgradeId] ?? 0) + 1;
  if (upgradeId === "airConditioner") {
    for (const item of Object.values(state.stock)) {
      for (const batch of item.batches ?? []) {
        const originalShelfLife = Math.max(1, batch.expireDay - batch.boughtDay);
        batch.expireDay += Math.max(1, Math.floor(originalShelfLife * 0.2));
      }
    }
  }
  return { success: true, cost, level: state.upgrades[upgradeId] };
}

export function applyUpgradeEffects(state) {
  const effects = { serviceSpeed: 0, customerSpawn: 0, patience: 0, onlineOrders: 0, rating: 0, capacity: 0, shelfLife: 0 };
  for (const [upgradeId, level] of Object.entries(state.upgrades)) {
    const definition = UPGRADE_BY_ID[upgradeId];
    if (!definition) continue;
    for (const [effect, value] of Object.entries(definition.effects)) effects[effect] = (effects[effect] ?? 0) + value * level;
  }
  return effects;
}
