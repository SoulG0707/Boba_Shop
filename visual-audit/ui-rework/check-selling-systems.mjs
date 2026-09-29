import assert from "node:assert/strict";
import { GAME_CONFIG } from "../../js/config.js";
import { createInitialState } from "../../js/state/initialState.js";
import { getProductRecipe } from "../../js/data/products.js";
import { renderGameplayView } from "../../js/ui/gameplayView.js";
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
assert.equal(customer.patience, patienceBefore, "Patience pauses for required mix animation");
assert.equal(customer.elapsedWait, elapsedBefore, "Elapsed wait pauses during mixing");
assert.equal(customer.maxPatience, patienceBefore, "Patience maximum remains stable");
assert.equal(finishMixingOrder(state, order.id), true, "Mix completes");
advanceCustomerQueue(state, 1);
assert.equal(customer.patience, patienceBefore - 1, "Patience resumes after mixing");
assert.equal(customer.elapsedWait, elapsedBefore + 1, "Elapsed wait resumes after mixing");

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
const sellingHtml = renderGameplayView(viewState, { selectedCustomerId: "ui-customer" });
assert.match(sellingHtml, /<section class="active-order-card"/);
assert.match(sellingHtml, /<strong class="size-badge">Lớn<\/strong>/);
assert.equal((sellingHtml.match(/order-topping-chip/g) ?? []).length, 11, "Special order renders every ingredient as its own chip");
for (const name of ["Sốt me", "Rau răm", "Trứng cút", "Khô bò", "Tép khô"]) assert.ok(sellingHtml.includes(name), `Order includes ${name}`);
assert.match(sellingHtml, /role="progressbar"/);
assert.ok(!sellingHtml.includes("SIZE L"), "Selling UI does not expose the internal size id");
const pricesHtml = renderPricesView(viewState);
assert.ok(pricesHtml.includes("(Bé)") && pricesHtml.includes("(Lớn)"), "Price screen names both sizes in Vietnamese");
assert.ok(!pricesHtml.includes("(M)") && !pricesHtml.includes("(L)"), "Price screen does not expose internal size ids");

console.log(`Selling system checks passed. Patience=${48}→${customer.maxPatience}s; mix=${GAME_CONFIG.MIX_DURATION_MS}ms.`);
