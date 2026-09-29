import fs from "node:fs/promises";
import path from "node:path";

const output = "D:/@_YenNgoc/Desktop/Boba_Shop/visual-audit/ui-rework";
const port = 9224;
const baseUrl = "http://127.0.0.1:8125/index.html";
await fs.mkdir(output, { recursive: true });

const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const consoleErrors = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  const callbacks = pending.get(message.id);
  if (!callbacks) return;
  pending.delete(message.id);
  if (message.error) callbacks.reject(new Error(message.error.message));
  else callbacks.resolve(message.result);
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function pause(ms = 220) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function setViewport(width, height) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await call("Page.navigate", { url: baseUrl });
  await waitFor("Boolean(window.gameDebug && document.querySelector('#splash:not([hidden])'))");
  await evaluate("localStorage.clear()");
  await call("Page.reload");
  await waitFor("Boolean(window.gameDebug && document.querySelector('[data-action=splash-start]'))");
  await pause(150);
}

async function screenshot(name) {
  const shot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, "base64"));
  const metrics = await evaluate("JSON.stringify({width:innerWidth, height:innerHeight, documentWidth:document.documentElement.scrollWidth, bodyHeight:document.body.scrollHeight})");
  console.log(`${name}: ${metrics}`);
}

async function click(selector) {
  const clicked = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.disabled) return false; element.click(); return true; })()`);
  if (!clicked) throw new Error(`Unable to click ${selector}`);
  await pause(150);
}

await call("Page.enable");
await call("Runtime.enable");
await call("Network.enable");
await call("Log.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await setViewport(390, 844);
await screenshot("mobile-welcome");
await click('[data-action="splash-start"]');
await waitFor("Boolean(document.querySelector('.tutorial-card'))");
await screenshot("mobile-tutorial-01");
await click('[data-action="tutorial-next"]');
await screenshot("mobile-tutorial-02");
await click('[data-action="tutorial-skip"]');
await waitFor("Boolean(document.querySelector('.prep-world'))");
if (!(await evaluate("document.querySelector('[data-action=start-day]')?.disabled"))) throw new Error("Zero stock incorrectly allows opening.");
await screenshot("mobile-preparation-zero");

await click('[data-action="settings"]');
await screenshot("mobile-settings-modal");
if (!(await evaluate("Boolean(document.querySelector('.modal-bottom-close') && document.querySelector('[data-action=replay-tutorial]'))"))) throw new Error("Settings sheet is missing its close or tutorial replay action.");
await click('.modal-bottom-close');
await click('[data-action="settings"]');
await click('[data-action="replay-tutorial"]');
await waitFor("Boolean(document.querySelector('.tutorial-card'))");
await screenshot("mobile-tutorial-replay");
await click('[data-action="tutorial-skip"]');
await waitFor("Boolean(document.querySelector('.prep-world'))");

await click('[data-navigate="more"]');
await screenshot("mobile-more");
if (!(await evaluate("Boolean(document.querySelector('[data-navigate=employees]') && document.querySelector('[data-navigate=baucua]'))"))) throw new Error("More navigation is missing support routes.");
await click('[data-navigate="employees"]');
await click('[data-navigate="inventory"]');

await click('[data-action="buy-stock"][data-ingredient="rice_paper"][data-quantity="10"]');
if (!(await evaluate("document.querySelector('[data-action=start-day]')?.disabled"))) throw new Error("Partial stock incorrectly allows opening.");
await screenshot("mobile-preparation-partial");

const ingredientIds = ["rice_paper", "shrimp_salt", "satay", "tamarind_sauce", "scallion_oil", "green_mango", "vietnamese_coriander", "fried_shallot", "peanut", "quail_egg", "beef_jerky", "chicken_jerky", "dried_shrimp", "calamansi", "food_box"];
for (const id of ingredientIds) {
  const quantity = id === "rice_paper" ? "50" : "10";
  const selector = `[data-action="buy-stock"][data-ingredient="${id}"][data-quantity="${quantity}"]`;
  if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) await click(selector);
}
await screenshot("mobile-preparation-ready");
if (await evaluate("document.querySelector('[data-action=start-day]')?.disabled")) throw new Error("Ready inventory should enable opening.");

await click('[data-action="start-day"]');
await waitFor("Boolean(document.querySelector('.selling-scene'))");
await evaluate("window.gameDebug.spawnCustomer()");
await waitFor("Boolean(document.querySelector('.customer-stop'))");
await pause(200);
await screenshot("mobile-selling-order");

const orderInfo = JSON.parse(await evaluate(`(() => { const s=window.gameDebug.getState(); const c=s.customers.find(x=>x.status==='waiting'); const o=s.orders.find(x=>x.id===c.orderId); return JSON.stringify({customer:c.id,order:o.id,product:o.items[0].productId}); })()`));
const recipes = {
  traditional: ["rice_paper", "shrimp_salt", "satay", "green_mango", "vietnamese_coriander", "fried_shallot", "peanut", "calamansi"],
  beef: ["rice_paper", "shrimp_salt", "satay", "green_mango", "vietnamese_coriander", "fried_shallot", "peanut", "calamansi", "beef_jerky"],
  chicken: ["rice_paper", "shrimp_salt", "satay", "green_mango", "vietnamese_coriander", "fried_shallot", "peanut", "calamansi", "chicken_jerky"],
  special: ["rice_paper", "shrimp_salt", "satay", "tamarind_sauce", "green_mango", "vietnamese_coriander", "fried_shallot", "peanut", "calamansi", "quail_egg", "beef_jerky", "dried_shrimp"],
};
await click(`[data-action="select-customer"][data-customer="${orderInfo.customer}"]`);
await click('[data-action="choose-order-size"][data-size="M"]');
for (const ingredient of recipes[orderInfo.product]) await click(`[data-action="add-order-ingredient"][data-ingredient="${ingredient}"]`);
await screenshot("mobile-selling-bowl");
await click('[data-action="mix-order"]');
await pause(300);
await screenshot("mobile-selling-mixing");
await pause(500);
await click('[data-action="pack-order"]');
await screenshot("mobile-selling-packed");
await click('[data-action="serve-order"]');
await screenshot("mobile-selling-feedback");
const beforeReload = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
if (!(beforeReload.tutorialCompleted && beforeReload.customersServed > 0 && beforeReload.reviews.length > 0 && beforeReload.dailyStats.revenue > 0 && beforeReload.money > 0)) throw new Error(`Selling state check failed: ${JSON.stringify({ tutorialCompleted: beforeReload.tutorialCompleted, customersServed: beforeReload.customersServed, reviews: beforeReload.reviews.length, dayRevenue: beforeReload.dailyStats.revenue, money: beforeReload.money })}`);
await call("Page.reload");
await waitFor("Boolean(window.gameDebug && document.querySelector('[data-action=splash-continue]'))");
const afterReload = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
if (afterReload.customersServed !== beforeReload.customersServed || afterReload.money !== beforeReload.money || afterReload.reviews.length !== beforeReload.reviews.length) throw new Error(`Save/load mismatch: before=${JSON.stringify({ customers: beforeReload.customersServed, money: beforeReload.money, reviews: beforeReload.reviews.length, status: beforeReload.gameplay.status })} after=${JSON.stringify({ customers: afterReload.customersServed, money: afterReload.money, reviews: afterReload.reviews.length, status: afterReload.gameplay.status })}`);
await screenshot("mobile-resume-save");
console.log(`Persistence/economy: customers=${afterReload.customersServed}, dayRevenue=${afterReload.dailyStats.revenue}, money=${afterReload.money}, reviews=${afterReload.reviews.length}, tutorial=${afterReload.tutorialCompleted}`);
await evaluate("window.gameDebug.nextDay()");
const dayTwo = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
if (dayTwo.day !== 2 || dayTwo.gameplay.status !== "preparation" || dayTwo.totalRevenue <= 0) throw new Error("End-day settlement or next-day preparation failed.");
await click('[data-action="splash-continue"]');
await screenshot("mobile-day-two-preparation");

await setViewport(1366, 768);
await screenshot("desktop-welcome");
await click('[data-action="splash-start"]');
await click('[data-action="tutorial-skip"]');
await waitFor("Boolean(document.querySelector('.prep-world'))");
await screenshot("desktop-preparation-zero");

for (const id of ingredientIds) {
  const selector = `[data-action="buy-stock"][data-ingredient="${id}"][data-quantity="10"]`;
  if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) await click(selector);
}
await click('[data-action="start-day"]');
await waitFor("Boolean(document.querySelector('.selling-scene'))");
await evaluate("window.gameDebug.spawnCustomer()");
await waitFor("Boolean(document.querySelector('.customer-stop'))");
await screenshot("desktop-selling-order");

await evaluate(`(() => { localStorage.removeItem('banh-trang-tron-game-save-v1'); localStorage.setItem('tea-shop-game-save-v1', JSON.stringify({ version: 2, money: 123000, day: 3, settings: { music: false, sound: true } })); })()`);
await call("Page.reload");
await waitFor("Boolean(window.gameDebug && document.querySelector('[data-action=splash-continue]'))");
const migrated = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
if (migrated.money !== 123_000 || migrated.day !== 3 || migrated.tutorialCompleted !== true || !migrated.migrationNotice) throw new Error("Legacy save migration failed.");
console.log(`Legacy save migration: day=${migrated.day}, money=${migrated.money}, tutorial=${migrated.tutorialCompleted}`);

if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
console.log("Browser console errors: none.");

console.log("Capture complete.");
ws.close();
