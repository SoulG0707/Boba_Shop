import assert from "node:assert/strict";

const url = "http://127.0.0.1:8125/index.html";
const target = await (await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? JSON.stringify(message.params.exceptionDetails));
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result);
});
function call(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression, timeoutMs = 10_000) { const until = Date.now() + timeoutMs; while (Date.now() < until) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 100)); } throw new Error(`Timeout: ${expression}`); }
async function click(selector) { const ok = await evaluate(`(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button || button.disabled) return false; button.click(); return true; })()`); if (!ok) throw new Error(`Cannot click ${selector}`); }

await call("Page.enable");
await call("Runtime.enable");
await call("Log.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url });
await waitFor("Boolean(window.gameDebug)");
await evaluate("localStorage.clear(); sessionStorage.clear(); true");
await call("Page.reload", { ignoreCache: true });
await waitFor("Boolean(document.querySelector('[data-action=splash-start]'))");
assert.deepEqual(await evaluate("({money:gameDebug.getState().money,day:gameDebug.getState().day,status:gameDebug.getState().gameplay.status,unlocked:gameDebug.getState().unlockedItems})"), { money: 400_000, day: 1, status: "preparation", unlocked: ["traditional"] });
await click("[data-action=splash-start]");
await click("[data-action=tutorial-skip]");
await waitFor("Boolean(document.querySelector('[data-action=change-pending-purchase]'))");
for (const [category, ids] of [["Bánh tráng", ["rice_paper"]], ["Gia vị", ["shrimp_salt"]], ["Topping", ["green_mango"]], ["Đóng gói", ["food_box"]]]) {
  await click(`[data-action=inventory-category][data-category="${category}"]`);
  for (const ingredient of ids) await click(`[data-action=change-pending-purchase][data-ingredient=${ingredient}][data-direction="1"]`);
}
await click("[data-action=commit-purchase]");
await waitFor("Boolean(document.querySelector('[data-action=start-day]:not([disabled])'))");
const afterPurchase = await evaluate("({money:gameDebug.getState().money,stock:Object.fromEntries(['rice_paper','shrimp_salt','green_mango','food_box'].map(id=>[id,gameDebug.getState().stock[id].quantity]))})");
assert.ok(afterPurchase.money < 400_000);
assert.ok(Object.values(afterPurchase.stock).every((quantity) => quantity === 5));
await click("[data-action=start-day]");
await waitFor("gameDebug.getState().gameplay.status === 'running'");
await waitFor("gameDebug.getState().customers.length === 1", 6_000);
const first = await evaluate("({customer:gameDebug.getState().customers[0],order:gameDebug.getState().orders[0],online:gameDebug.getState().onlineOrders.length,spawned:gameDebug.getState().gameplay.spawnedCustomersToday})");
assert.equal(first.customer.tutorial, true);
assert.equal(first.order.items[0].productId, "traditional");
assert.equal(first.order.items[0].size, "M");
assert.deepEqual(first.order.customerRequest.excludedIngredients, []);
assert.equal(first.online, 0);
assert.equal(first.spawned, 1);
await click('[data-action=choose-order-size][data-size="M"]');
for (const ingredient of ["rice_paper", "shrimp_salt", "green_mango"]) await click(`[data-action=add-order-ingredient][data-ingredient=${ingredient}]`);
await click("[data-action=mix-order]");
await waitFor("Boolean(document.querySelector('[data-action=pack-order]:not([disabled])'))", 4_000);
await click("[data-action=pack-order]");
await click("[data-action=serve-order]");
const afterServe = await evaluate("({done:gameDebug.getState().tutorialSellingCompleted,served:gameDebug.getState().dailyStats.customersServed,customers:gameDebug.getState().customers.length,delay:(gameDebug.getState().gameplay.nextCustomerSpawnAtMs-gameDebug.getState().gameplay.elapsedMs)/1000})");
assert.equal(afterServe.done, true);
assert.equal(afterServe.served, 1);
assert.equal(afterServe.customers, 0);
assert.ok(afterServe.delay >= 28 && afterServe.delay <= 35, JSON.stringify(afterServe));
assert.deepEqual(errors, []);
console.log(JSON.stringify({ afterPurchase, first: { tutorial: first.customer.tutorial, product: first.order.items[0], online: first.online }, afterServe, consoleErrors: errors.length }));
ws.close();
await fetch(`http://127.0.0.1:9224/json/close/${target.id}`);
