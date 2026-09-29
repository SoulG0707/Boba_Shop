import fs from "node:fs/promises";
import path from "node:path";
import { getProductPrice, getProductRecipe } from "../../js/data/products.js";

const output = "D:/@_YenNgoc/Desktop/Boba_Shop/visual-audit/ui-rework";
const port = 9224;
const baseUrl = "http://127.0.0.1:8125/index.html";
const storageKey = "banh-trang-tron-game-save-v1";
const consoleErrors = [];
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
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
    await pause(70);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function pause(ms = 200) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function click(selector) {
  const clicked = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.disabled) return false; element.click(); return true; })()`);
  if (!clicked) throw new Error(`Unable to click ${selector}`);
  await pause(100);
}

async function setViewport(width, height) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await call("Page.navigate", { url: baseUrl });
  await waitFor("Boolean(window.gameDebug && document.querySelector('#splash'))");
  await evaluate("localStorage.clear()");
  await call("Page.reload");
  await waitFor("Boolean(document.querySelector('[data-action=splash-start]'))");
  await click('[data-action="splash-start"]');
  await waitFor("Boolean(document.querySelector('[data-action=tutorial-skip]'))");
  await click('[data-action="tutorial-skip"]');
  await waitFor("Boolean(document.querySelector('.prep-world'))");

  const ingredientIds = ["rice_paper", "shrimp_salt", "satay", "tamarind_sauce", "scallion_oil", "green_mango", "vietnamese_coriander", "fried_shallot", "peanut", "quail_egg", "beef_jerky", "chicken_jerky", "dried_shrimp", "calamansi", "food_box"];
  for (const id of ingredientIds) {
    const selector = `[data-action="buy-stock"][data-ingredient="${id}"][data-quantity="10"]`;
    if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) await click(selector);
  }
  await click('[data-action="start-day"]');
  await waitFor("Boolean(document.querySelector('.selling-scene'))");
  await evaluate("(() => { const random = Math.random; Math.random = () => 0; window.gameDebug.spawnCustomer(); Math.random = random; })()");
  await waitFor("Boolean(document.querySelector('.customer-stop'))");
}

async function makeOrderFixture(productId, sizeId) {
  await evaluate(`(() => {
    const state = window.gameDebug.getState();
    const customer = state.customers.find((entry) => entry.status === 'waiting');
    const order = state.orders.find((entry) => entry.id === customer.orderId);
    customer.preferredProduct = ${JSON.stringify(productId)};
    order.items[0].productId = ${JSON.stringify(productId)};
    order.items[0].size = ${JSON.stringify(sizeId)};
    order.totalPrice = ${JSON.stringify(getProductPrice(productId, { [productId]: 0 }, { size: sizeId }))} + state.sellPrices[${JSON.stringify(productId)}];
    order.preparedIngredients = {};
    order.preparedSize = null;
    order.mixed = false;
    order.mixing = false;
    order.packed = false;
    order.status = 'waiting';
    localStorage.setItem(${JSON.stringify(storageKey)}, JSON.stringify(state));
  })()`);
  await call("Page.reload");
  await waitFor("Boolean(document.querySelector('[data-action=splash-continue]'))");
  await click('[data-action="splash-continue"]');
  await waitFor("Boolean(document.querySelector('.active-order-card'))");
}

async function screenshot(name) {
  const shot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, "base64"));
  const metrics = await evaluate("JSON.stringify({width:innerWidth, height:innerHeight, documentWidth:document.documentElement.scrollWidth, orderVisible:(()=>{const e=document.querySelector('.active-order-card');if(!e)return false;const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})(), toppingChips:document.querySelectorAll('.order-topping-chip').length})");
  console.log(`${name}: ${metrics}`);
  const parsed = JSON.parse(metrics);
  if (parsed.documentWidth > parsed.width) throw new Error(`${name} has horizontal overflow: ${JSON.stringify(parsed)}`);
  if (parsed.orderVisible === false) throw new Error(`${name} order card is outside the viewport.`);
}

await call("Page.enable");
await call("Runtime.enable");
await call("Network.enable");
await call("Log.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await fs.mkdir(output, { recursive: true });

await setViewport(390, 844);
await makeOrderFixture("traditional", "M");
await screenshot("selling-size-be");

await makeOrderFixture("traditional", "L");
await screenshot("selling-size-lon");

await makeOrderFixture("special", "L");
await screenshot("selling-many-toppings");

await click('[data-action="choose-order-size"][data-size="L"]');
const recipe = getProductRecipe("special", { size: "L" });
for (const [ingredientId, quantity] of Object.entries(recipe)) {
  if (ingredientId === "food_box") continue;
  for (let index = 0; index < quantity; index += 1) await click(`[data-action="add-order-ingredient"][data-ingredient="${ingredientId}"]`);
}
await screenshot("selling-before-mix");

const patienceBeforeMix = JSON.parse(await evaluate(`(() => { const state=window.gameDebug.getState(); const customer=state.customers.find((entry)=>entry.status==='waiting'); const snapshot={patience:customer.patience,elapsedWait:customer.elapsedWait,maxPatience:customer.maxPatience}; document.querySelector('[data-action="mix-order"]').click(); return JSON.stringify(snapshot); })()`));
await pause(550);
await screenshot("selling-during-mix");

const mixingState = JSON.parse(await evaluate(`(() => { const state=window.gameDebug.getState(); const customer=state.customers.find((entry)=>entry.status==='waiting'); const order=state.orders.find((entry)=>entry.id===customer.orderId); return JSON.stringify({patience:customer.patience,elapsedWait:customer.elapsedWait,mixing:order.mixing,buttonDisabled:document.querySelector('[data-action=mix-order]').disabled,packDisabled:document.querySelector('[data-action=pack-order]').disabled,serveDisabled:document.querySelector('[data-action=serve-order]').disabled}) })()`));
if (!mixingState.mixing || !mixingState.buttonDisabled || !mixingState.packDisabled || !mixingState.serveDisabled) throw new Error(`Mix controls were not locked: ${JSON.stringify(mixingState)}`);
if (mixingState.patience !== patienceBeforeMix.patience || mixingState.elapsedWait !== patienceBeforeMix.elapsedWait) throw new Error(`Customer patience advanced during mixing: before=${JSON.stringify(patienceBeforeMix)} during=${JSON.stringify(mixingState)}`);
console.log(`Mix pause/guards: ${JSON.stringify(mixingState)}`);

await waitFor("Boolean(document.querySelector('[data-action=pack-order]') && !document.querySelector('[data-action=pack-order]').disabled)", 2_500);
await screenshot("selling-ready-to-pack");

await call("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
await pause(100);
await screenshot("selling-desktop-1366x768");

if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
console.log(`Browser console errors: none. Config: mix=${1400}ms, patience=${2.5}x.`);
ws.close();
