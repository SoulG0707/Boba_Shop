import fs from "node:fs/promises";
import { createInitialState } from "../js/state/initialState.js";
import { purchaseIngredients } from "../js/systems/inventory.js";
import { getOrderRecipe } from "../js/systems/orders.js";

const url = "http://127.0.0.1:8125/index.html";
const target = await (await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
ws.addEventListener("message", ({ data }) => { const result = JSON.parse(data); const entry = pending.get(result.id); if (!entry) return; pending.delete(result.id); if (result.error) entry.reject(new Error(result.error.message)); else entry.resolve(result.result); });
function call(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression, timeoutMs = 10_000) { const started = Date.now(); while (Date.now() - started < timeoutMs) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 100)); } throw new Error(`Timeout: ${expression}`); }
async function click(selector) { const ok = await evaluate(`(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button || button.disabled) return false; button.click(); return true; })()`); if (!ok) throw new Error(`Cannot click ${selector}`); }

const fresh = createInitialState();
fresh.tutorialCompleted = true;
const purchase = Object.fromEntries(Object.keys(fresh.stock).map((id) => [id, 20]));
const bought = purchaseIngredients(fresh, purchase);
if (!bought.success) throw new Error(bought.reason);
await call("Page.enable");
await call("Runtime.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url });
await waitFor("Boolean(window.gameDebug)");
await evaluate(`localStorage.setItem("banh-trang-tron-game-save-v1", ${JSON.stringify(JSON.stringify(fresh))})`);
await call("Page.reload", { ignoreCache: true });
await waitFor("Boolean(document.querySelector('[data-action=splash-continue]'))");
await click('[data-action="splash-continue"]');
await click('[data-action="start-day"]');
await waitFor("Boolean(document.querySelector('.selling-scene'))");

const report = { realSeconds: 0, daysSeen: [], dayOneOrders: [], maxConcurrentDayOne: 0, onlineDayOne: 0, timeoutsDayOne: 0, servedDayOne: 0, dayOneEndSecond: null, uiErrors: [] };
const handled = new Set();
const started = Date.now();
while (Date.now() - started < 300_000) {
  const state = await evaluate("gameDebug.getState()");
  const second = Math.round((Date.now() - started) / 1000);
  if (!report.daysSeen.includes(state.day)) report.daysSeen.push(state.day);
  if (state.day === 1) {
    report.maxConcurrentDayOne = Math.max(report.maxConcurrentDayOne, state.customers.length);
    report.onlineDayOne = Math.max(report.onlineDayOne, state.onlineOrders.filter((order) => !["served", "cancelled"].includes(order.status)).length);
    report.timeoutsDayOne = state.orders.filter((order) => order.channel === "counter" && order.status === "cancelled").length;
    report.servedDayOne = state.dailyStats.customersServed;
    for (const order of state.orders.filter((order) => order.channel === "counter" && !handled.has(order.id))) {
      report.dayOneOrders.push({ productId: order.items[0].productId, size: order.items[0].size, ingredients: Object.keys(getOrderRecipe(order)).filter((id) => id !== "food_box") });
      handled.add(order.id);
    }
  }
  if (state.gameplay.status === "summary") {
    if (state.day === 1 && report.dayOneEndSecond == null) report.dayOneEndSecond = second;
    await click('[data-action="next-day"]');
    await waitFor("Boolean(document.querySelector('[data-action=start-day]'))");
    await click('[data-action="start-day"]');
    await waitFor("Boolean(document.querySelector('.selling-scene'))");
    continue;
  }
  const customer = state.customers.find((entry) => entry.status === "waiting");
  if (customer && Date.now() - customer.arrivedAt >= 5_000) {
    const order = state.orders.find((entry) => entry.id === customer.orderId);
    if (order && order.status === "waiting" && !order.packed) {
      await click(`[data-action="select-customer"][data-customer="${customer.id}"]`);
      if (!order.preparedSize) await click(`[data-action="choose-order-size"][data-size="${order.items[0].size}"]`);
      const recipe = getOrderRecipe(order);
      for (const [ingredientId, quantity] of Object.entries(recipe)) {
        if (ingredientId === "food_box") continue;
        for (let count = order.preparedIngredients?.[ingredientId] ?? 0; count < quantity; count += 1) await click(`[data-action="add-order-ingredient"][data-ingredient="${ingredientId}"]`);
      }
      await click('[data-action="mix-order"]');
      await waitFor("Boolean(document.querySelector('[data-action=pack-order]:not(:disabled)'))", 4_000);
      await click('[data-action="pack-order"]');
      await click('[data-action="serve-order"]');
    }
  }
  await new Promise((r) => setTimeout(r, 350));
}
report.realSeconds = (Date.now() - started) / 1000;
const finalState = await evaluate("gameDebug.getState()");
report.finalDay = finalState.day;
report.finalStatus = finalState.gameplay.status;
report.finalServed = finalState.dailyStats.customersServed;
await fs.writeFile(new URL("./day-progression/five-minute-play.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
ws.close();
