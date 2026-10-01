import assert from "node:assert/strict";
import { GAME_CONFIG } from "../../js/config.js";
import { createInitialState } from "../../js/state/initialState.js";
import { getProductRecipe } from "../../js/data/products.js";
import { renderGameplayView } from "../../js/ui/gameplayView.js";
import { renderInventoryView, setInventoryCategory } from "../../js/ui/inventoryView.js";
import { renderPricesView } from "../../js/ui/pricesView.js";
import { addIngredientToOrder, createOrder, evaluatePreparedOrder, finishMixingOrder, mixOrder, removeIngredientFromOrder, setOrderSize } from "../../js/systems/orders.js";
import { advanceCustomerQueue, migrateCustomerPatience, spawnCustomer } from "../../js/systems/customers.js";

const state = createInitialState();
const customer = spawnCustomer(state, 1000, () => 0);
assert.ok(customer, "Customer spawns");
assert.equal(customer.patience, 48 * GAME_CONFIG.CUSTOMER_PATIENCE_MULTIPLIER, "New patience starts at 2.5x base");
assert.equal(customer.maxPatience, customer.patience, "Progress bar max matches starting patience");

const order = createOrder(state, customer, 1000, () => 0);
order.preparedSize = "M";
order.preparedIngredients.rice_paper = 1;
const patienceBefore = customer.patience;
const elapsedBefore = customer.elapsedWait;
assert.equal(mixOrder(state, order.id), true, "Mix starts");
assert.equal(mixOrder(state, order.id), false, "Second mix trigger is rejected");
assert.equal(addIngredientToOrder(state, order.id, "satay").success, false, "Ingredients lock while mixing");
assert.equal(removeIngredientFromOrder(state, order.id, "rice_paper"), false, "Bowl removal locks while mixing");
assert.equal(setOrderSize(state, order.id, "L"), false, "Size locks while mixing");
advanceCustomerQueue(state, 1);
assert.equal(customer.patience, patienceBefore - 1, "Patience continues while mixing");
assert.equal(customer.elapsedWait, elapsedBefore + 1, "Elapsed wait continues while mixing");
assert.equal(customer.maxPatience, patienceBefore, "Patience maximum remains stable");
assert.equal(finishMixingOrder(state, order.id), true, "Mix completes");
advanceCustomerQueue(state, 1);
assert.equal(customer.patience, patienceBefore - 2, "Patience continues after mixing");
assert.equal(customer.elapsedWait, elapsedBefore + 2, "Elapsed wait continues after mixing");

const oldState = createInitialState();
const oldCustomer = { id: "legacy-customer", type: "regular", status: "waiting", patience: 18, elapsedWait: 30 };
oldState.customers.push(oldCustomer);
assert.equal(migrateCustomerPatience(oldState), true, "Old active customer save is normalized once");
assert.equal(oldCustomer.maxPatience, 120, "Legacy customer receives the new progress maximum");
assert.equal(oldCustomer.patience, 45, "Legacy remaining patience receives the multiplier");
assert.equal(oldCustomer.patience / oldCustomer.maxPatience, 18 / 48, "Legacy progress ratio is preserved");
assert.equal(migrateCustomerPatience(oldState), false, "Patience is not multiplied again");

const exactIngredients = getProductRecipe("traditional", { size: "M" });
delete exactIngredients.food_box;
const accuracy = evaluatePreparedOrder({ items: [{ productId: "traditional", size: "M" }], preparedSize: "M", preparedIngredients: exactIngredients, createdAt: 1000 }, customer);
assert.deepEqual(accuracy.missingIngredients, [], "Correct recipe stays correct");
assert.deepEqual(accuracy.wrongIngredients, [], "Correct recipe has no extras");
assert.equal(accuracy.sizeCorrect, true, "Size validation remains intact");

const viewState = createInitialState();
viewState.gameplay.status = "running";
viewState.customers = [{ id: "ui-customer", type: "regular", label: "Khách quen", patience: 120, maxPatience: 120, elapsedWait: 0, orderId: "ui-order", status: "waiting" }];
viewState.orders = [{ id: "ui-order", items: [{ productId: "special", size: "L" }], totalPrice: 48_000, status: "waiting", preparedIngredients: {}, preparedSize: null, mixed: false, mixing: false, packed: false }];
const sellingHtml = renderGameplayView(viewState, { focusedCustomerId: "ui-customer", activePreparationOrderId: "ui-order" });
assert.match(sellingHtml, /<section class="active-order-bubble"/);
assert.match(sellingHtml, /<strong>LỚN<\/strong>/);
assert.equal((sellingHtml.match(/class="order-ingredient-group"/g) ?? []).length, 3, "Special order groups base, toppings, and seasonings");
assert.equal((sellingHtml.match(/class="customer-queue-avatar/g) ?? []).length, 1, "Only one waiting customer appears in this fixture queue");
assert.equal((sellingHtml.match(/class="active-order-bubble/g) ?? []).length, 1, "Only one full order bubble is rendered");
for (const name of ["Sốt me", "Rau răm", "Trứng cút", "Khô bò", "Tép khô"]) assert.ok(sellingHtml.includes(name), `Order includes ${name}`);
assert.match(sellingHtml, /role="progressbar"/);
assert.ok(!sellingHtml.includes("Size L") && !sellingHtml.includes("Size M"), "Selling UI does not expose the internal size ids");

const queueState = createInitialState();
queueState.gameplay.status = "running";
const queueProducts = ["traditional", "beef", "chicken", "special"];
for (const [index, productId] of queueProducts.entries()) {
  const queueCustomer = spawnCustomer(queueState, 1000 + index, () => 0);
  queueCustomer.id = `queue-customer-${index + 1}`;
  queueCustomer.label = `Khách ${index + 1}`;
  queueCustomer.preferredProduct = productId;
  const queueOrder = createOrder(queueState, queueCustomer, 1000 + index, () => 0);
  queueOrder.id = `queue-order-${index + 1}`;
  queueCustomer.orderId = queueOrder.id;
  queueOrder.customerId = queueCustomer.id;
  queueOrder.items[0].productId = productId;
  queueOrder.items[0].size = index % 2 ? "L" : "M";
}
const orderByCustomer = new Map(queueState.customers.map((queueCustomer) => [queueCustomer.id, queueState.orders.find((entry) => entry.id === queueCustomer.orderId)]));
const focusedSpecial = renderGameplayView(queueState, { focusedCustomerId: "queue-customer-4", activePreparationOrderId: "queue-order-4" });
assert.equal((focusedSpecial.match(/class="customer-queue-avatar/g) ?? []).length, 4, "All four waiting customers render as queue avatars");
assert.equal((focusedSpecial.match(/class="active-order-bubble/g) ?? []).length, 1, "Four waiting customers still render one full order");
assert.ok(focusedSpecial.includes("Bánh tráng trộn đặc biệt"), "Focused customer's product is shown in the order bubble");
const orderA = JSON.stringify(orderByCustomer.get("queue-customer-1"));
const orderB = JSON.stringify(orderByCustomer.get("queue-customer-2"));
for (const focusId of ["queue-customer-2", "queue-customer-1", "queue-customer-2"]) {
  const activeOrderId = queueState.customers.find((entry) => entry.id === focusId).orderId;
  const html = renderGameplayView(queueState, { focusedCustomerId: focusId, activePreparationOrderId: activeOrderId });
  assert.equal((html.match(/class="active-order-bubble/g) ?? []).length, 1, "Focus switch renders exactly one full order");
  assert.ok(html.includes(activeOrderId), "Focused order identity remains visible");
}
assert.equal(JSON.stringify(orderByCustomer.get("queue-customer-1")), orderA, "Switching focus never mutates customer A's order");
assert.equal(JSON.stringify(orderByCustomer.get("queue-customer-2")), orderB, "Switching focus never mutates customer B's order");

setInventoryCategory("Bánh tráng");
const baseHtml = renderInventoryView(createInitialState(), { pendingPurchase: { rice_paper: 10, shrimp_salt: 5 } });
assert.match(baseHtml, /data-ingredient-row="rice_paper"/);
assert.doesNotMatch(baseHtml, /data-ingredient-row="(shrimp_salt|green_mango|food_box)"/, "Inactive inventory categories do not enter the DOM");
setInventoryCategory("Gia vị");
const seasoningHtml = renderInventoryView(createInitialState(), { pendingPurchase: { rice_paper: 10, shrimp_salt: 5 } });
assert.match(seasoningHtml, /data-ingredient-row="shrimp_salt"/);
assert.doesNotMatch(seasoningHtml, /data-ingredient-row="(rice_paper|green_mango|food_box)"/, "Switching tabs renders only the selected ingredient group");
assert.match(seasoningHtml, /2 nguyên liệu · 15 đơn vị/, "Pending cart total includes selections made in another category");
const pricesHtml = renderPricesView(viewState);
assert.ok(pricesHtml.includes("(Bé)") && pricesHtml.includes("(Lớn)"), "Price screen names both sizes in Vietnamese");
assert.ok(!pricesHtml.includes("(M)") && !pricesHtml.includes("(L)"), "Price screen does not expose internal size ids");

console.log(`Selling system checks passed. Patience=${48}→${customer.maxPatience}s; mix=${GAME_CONFIG.MIX_DURATION_MS}ms.`);
