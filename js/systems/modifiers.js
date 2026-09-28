import { applyUpgradeEffects } from "./upgrades.js";
import { getEmployeeEffects } from "./employees.js";
import { getEventModifiers } from "./events.js";

export function getGameplayModifiers(state) {
  const upgrades = applyUpgradeEffects(state);
  const employees = getEmployeeEffects(state);
  const event = getEventModifiers(state);
  const rate = (key) => 1 + (upgrades[key] ?? 0) + (employees[key] ?? 0);
  const modifiers = {
    customerSpawn: Math.max(0.25, rate("customerSpawn") * (event.customerSpawn ?? 1)),
    onlineOrders: Math.max(0.25, rate("onlineOrders") * (event.onlineOrders ?? 1)),
    serviceSpeed: Math.max(0.5, rate("serviceSpeed")),
    patience: Math.max(0.5, rate("patience") * (event.patience ?? 1)),
    rating: (upgrades.rating ?? 0) + (employees.rating ?? 0) + (event.rating ?? 0),
    capacity: (upgrades.capacity ?? 0) + (employees.capacity ?? 0),
    priceSensitivity: event.priceSensitivity ?? 1,
    demand: event.demand ?? 1,
  };
  for (const [key, value] of Object.entries(event)) {
    if (key.endsWith("Demand")) modifiers[key] = value;
  }
  return modifiers;
}
