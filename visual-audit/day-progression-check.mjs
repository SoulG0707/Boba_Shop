import assert from "node:assert/strict";
import { createInitialState } from "../js/state/initialState.js";
import { DAY_DIFFICULTY, getDifficultyForDay, isOnlineOrderingUnlocked } from "../js/data/difficulty.js";
import { startDay, tickDay, nextDay } from "../js/systems/dayCycle.js";
import { getOrderRecipe, setOrderSize, addIngredientToOrder, mixOrder, finishMixingOrder, packOrder, serveOrder } from "../js/systems/orders.js";
import { spawnCustomer } from "../js/systems/customers.js";
import { spawnOnlineOrder } from "../js/systems/onlineOrders.js";
import { validateSaveSchema } from "../js/state/persistence.js";
import { purchaseIngredients } from "../js/systems/inventory.js";
import { getShopPreparationStatus } from "../js/systems/preparation.js";

function stockShop(state, quantity = 100) {
  for (const item of Object.values(state.stock)) {
    item.quantity = quantity;
    item.batches = [{ quantity, boughtDay: state.day, expireDay: state.day + item.expirationDays, unitPrice: item.purchasePrice }];
  }
}

function serveCurrent(state, now, random = () => .5) {
  const customer = state.customers[0];
  const order = state.orders.find((entry) => entry.id === customer.orderId);
  assert.equal(setOrderSize(state, order.id, order.items[0].size), true);
  for (const [ingredientId, quantity] of Object.entries(getOrderRecipe(order))) {
    if (ingredientId === "food_box") continue;
    for (let count = 0; count < quantity; count += 1) assert.equal(addIngredientToOrder(state, order.id, ingredientId).success, true);
  }
  assert.equal(mixOrder(state, order.id), true);
  assert.equal(finishMixingOrder(state, order.id), true);
  assert.equal(packOrder(state, order.id).success, true);
  assert.equal(serveOrder(state, order.id, now, random).success, true);
}

const fresh = createInitialState();
assert.equal(fresh.money, 400_000);
assert.equal(fresh.gameplay.status, "preparation");
assert.deepEqual(fresh.unlockedItems, ["traditional"]);
assert.equal(purchaseIngredients(fresh, { rice_paper: 5, shrimp_salt: 5, green_mango: 5, food_box: 5 }).success, true);
assert.equal(getShopPreparationStatus(fresh).canOpen, true);
assert.deepEqual(getShopPreparationStatus(fresh).activeProducts.map((product) => product.id), ["traditional"]);

for (const day of [1, 2, 3, 4, 5, 6, 10]) {
  const state = createInitialState();
  stockShop(state);
  state.day = day;
  // An older save may already list every product; today's menu still controls new orders.
  state.unlockedItems = ["traditional", "beef", "chicken", "special"];
  assert.equal(startDay(state, 1_000, () => .5), true);
  const difficulty = getDifficultyForDay(day);
  tickDay(state, 4_900, () => .5);
  assert.equal(state.customers.length, 0, `Day ${day}: first customer waits 3-5s`);
  tickDay(state, 5_000, () => .5);
  assert.equal(state.customers.length, 1);
  const order = state.orders[0];
  assert.ok(difficulty.allowedProducts.includes(order.items[0].productId));
  assert.ok(difficulty.allowedSizes.includes(order.items[0].size));
  assert.equal(state.customers[0].tutorial, day === 1);
  if (day === 1) {
    assert.deepEqual(Object.keys(getOrderRecipe(order)).sort(), ["rice_paper", "shrimp_salt", "green_mango", "food_box"].sort());
    assert.deepEqual(order.customerRequest.excludedIngredients, []);
    assert.equal(order.customerRequest.heatLevel, null);
    assert.equal(setOrderSize(state, order.id, "L"), false);
    assert.equal(state.currentEvent, null);
    assert.equal(spawnOnlineOrder(state), null);
    assert.equal(spawnCustomer(state), null, "Only one Day 1 customer may be active");
    const patience = state.customers[0].patience;
    tickDay(state, 15_000, () => .5);
    assert.equal(state.customers[0].patience, patience);
    serveCurrent(state, 15_000);
    assert.equal(state.tutorialSellingCompleted, true);
    tickDay(state, 45_000, () => .5);
    assert.equal(state.customers.length, 0, "Next customer waits after tutorial completion");
    tickDay(state, 47_000, () => .5);
    assert.equal(state.customers.length, 1);
    assert.equal(state.gameplay.spawnedCustomersToday, 2);
    const snapshot = structuredClone(getOrderRecipe(order));
    state.day = 10;
    assert.deepEqual(getOrderRecipe(order), snapshot, "Spawned order survives a difficulty change");
  }
  if (day < 5) assert.equal(isOnlineOrderingUnlocked(state), false);
  if (day === 5) {
    assert.equal(isOnlineOrderingUnlocked(state), false);
    state.upgrades.onlineChannel = 1;
    assert.equal(isOnlineOrderingUnlocked(state), true);
    assert.ok(spawnOnlineOrder(state, 5_001, () => .5));
  }
  console.log(`Day ${day}: ${difficulty.targetCustomers} customers, ${difficulty.customerIntervalMin}-${difficulty.customerIntervalMax}s, max ${difficulty.maxConcurrentCustomers}, ${difficulty.allowedProducts.join("/")}`);
}

const oldSave = createInitialState();
delete oldSave.upgrades.onlineChannel;
assert.equal(validateSaveSchema(oldSave), true);
const progression = createInitialState();
stockShop(progression);
for (let day = 2; day <= 6; day += 1) {
  progression.gameplay.status = "summary";
  nextDay(progression);
  assert.ok(DAY_DIFFICULTY[day].allowedProducts.every((id) => progression.unlockedItems.includes(id)));
}
assert.deepEqual(progression.unlockedItems, ["traditional", "beef", "chicken", "special"]);

const onlineDay = createInitialState();
stockShop(onlineDay);
onlineDay.day = 5;
onlineDay.upgrades.onlineChannel = 1;
startDay(onlineDay, 1_000, () => .5);
tickDay(onlineDay, 61_000, () => .5);
assert.equal(onlineDay.onlineOrders.length, 0);
tickDay(onlineDay, 77_000, () => .5);
assert.equal(onlineDay.onlineOrders.length, 1, "Unlocked online order starts after 60-90s");

// Simulated five-minute service run, exercising the same order actions as the UI.
const play = createInitialState();
stockShop(play);
let clock = 100_000;
startDay(play, clock, () => .5);
let largestQueue = 0;
let dayOneEndedAt = null;
for (let second = 0; second <= 300; second += 1) {
  clock += 1_000;
  tickDay(play, clock, () => .5);
  largestQueue = Math.max(largestQueue, play.customers.length);
  if (play.customers[0] && clock - play.customers[0].arrivedAt >= 6_000) serveCurrent(play, clock);
  if (play.gameplay.status === "summary" && dayOneEndedAt == null) {
    dayOneEndedAt = second;
    assert.equal(play.dailyStats.customersServed, 5);
    assert.equal(play.dailyStats.onlineOrders, 0);
    nextDay(play);
    startDay(play, clock, () => .5);
  }
}
assert.ok(dayOneEndedAt >= 140 && dayOneEndedAt < 240);
assert.ok(largestQueue <= 1);
assert.equal(play.day, 2);
console.log(`Progression, old saves, online gate and five-minute simulation passed; Day 1 ended after ${dayOneEndedAt}s.`);
