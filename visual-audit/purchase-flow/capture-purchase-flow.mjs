import fs from "node:fs/promises";
import path from "node:path";

const output = "D:/@_YenNgoc/Desktop/Boba_Shop/visual-audit/purchase-flow";
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

async function pause(ms = 180) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function click(selector) {
  const clicked = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.disabled) return false; element.click(); return true; })()`);
  if (!clicked) throw new Error(`Unable to click ${selector}`);
  await pause();
}

async function chooseCategory(category) {
  await click(`[data-action="inventory-category"][data-category="${category}"]`);
}

async function screenshot(name) {
  if (name !== "01-empty-cart") await focusCartInViewport();
  const shot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(output, `${name}-390x844.png`), Buffer.from(shot.data, "base64"));
  return JSON.parse(await evaluate("JSON.stringify({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,scrollY})"));
}

async function focusCartInViewport() {
  await evaluate(`(() => { const tabs = document.querySelector('.ingredient-category-tabs'); if (!tabs) return; window.scrollTo(0, Math.max(0, window.scrollY + tabs.getBoundingClientRect().top - 105)); })()`);
  await pause(100);
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

await call("Page.enable");
await call("Runtime.enable");
await call("Network.enable");
await call("Log.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url: baseUrl });
await waitFor("Boolean(window.gameDebug && document.querySelector('#splash:not([hidden])'))");
await evaluate("localStorage.clear(); sessionStorage.clear()");
await call("Page.reload");
await waitFor("Boolean(window.gameDebug && document.querySelector('[data-action=splash-start]'))");
await click('[data-action="splash-start"]');
await waitFor("Boolean(document.querySelector('[data-action=tutorial-skip]'))");
await click('[data-action="tutorial-skip"]');
await waitFor("Boolean(document.querySelector('.inventory-preparation'))");

const initial = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
const initialSave = await evaluate("localStorage.getItem('banh-trang-tron-game-save-v1')");
const emptyButton = await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()");
check(emptyButton === "CHỌN NGUYÊN LIỆU CẦN NHẬP", `Unexpected empty-cart action: ${emptyButton}`);
check(await evaluate("document.querySelector('.prep-primary-action')?.disabled"), "Empty cart action should be disabled.");
check(await evaluate("document.querySelector('[data-action=buy-stock]') === null"), "Legacy immediate-purchase controls are still visible.");
check(await evaluate("document.querySelector('[data-ingredient-row=rice_paper] button[data-direction=\"-1\"]')?.disabled"), "Minus controls should remain disabled when pending quantity is zero.");
const emptyMetrics = await screenshot("01-empty-cart");

await focusCartInViewport();
await click('[data-action="change-pending-purchase"][data-ingredient="rice_paper"][data-direction="1"]');
const afterFirstPlus = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
check(afterFirstPlus.money === initial.money && afterFirstPlus.stock.rice_paper.quantity === 0, "Selecting +5 changed persisted cash or stock before confirmation.");
check(await evaluate("localStorage.getItem('banh-trang-tron-game-save-v1')") === initialSave, "Pending quantity should not be written to the save before confirmation.");
check(await evaluate("document.querySelector('[data-ingredient-row=rice_paper] .inventory-quantity')?.textContent.trim()") === "5", "First plus click did not add five pending units.");
check(await evaluate("document.querySelector('[data-ingredient-row=rice_paper] .inventory-line-cost')?.textContent.trim()") === "+5 · 6k", "The row subtotal for five units is incorrect.");
check(await evaluate("document.querySelector('[data-action=commit-purchase]')?.textContent.trim().toUpperCase()") === "NHẬP HÀNG · 6K", "The bottom action should show the pending total.");
const singleMetrics = await screenshot("02-plus-five");

await click('[data-action="change-pending-purchase"][data-ingredient="rice_paper"][data-direction="1"]');
await chooseCategory("Gia vị");
await click('[data-action="change-pending-purchase"][data-ingredient="shrimp_salt"][data-direction="1"]');
await chooseCategory("Topping");
await click('[data-action="change-pending-purchase"][data-ingredient="green_mango"][data-direction="1"]');
check(await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()") === "NHẬP HÀNG · 19,25K", "The multi-item pending subtotal is incorrect.");
const multiMetrics = await screenshot("03-multiple-items");
for (let index = 0; index < 2; index += 1) await click('[data-action="change-pending-purchase"][data-ingredient="green_mango"][data-direction="1"]');
await chooseCategory("Đóng gói");
for (let index = 0; index < 4; index += 1) await click('[data-action="change-pending-purchase"][data-ingredient="food_box"][data-direction="1"]');
check(await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()") === "NHẬP HÀNG · 41,25K", "The cross-category pending total is incorrect.");
await chooseCategory("Bánh tráng");
check(await evaluate("document.querySelector('[data-ingredient-row=rice_paper] .inventory-quantity')?.textContent.trim()") === "10", "Changing categories lost the first item's pending quantity.");
await chooseCategory("Gia vị");
const enoughMetrics = await screenshot("04-total-enough-funds");
const sessionCart = JSON.parse(await evaluate("sessionStorage.getItem('banh-trang-pending-purchase-v1')"));
check(sessionCart.rice_paper === 10 && sessionCart.green_mango === 15 && sessionCart.food_box === 20, "The staged cart should be stored separately for this tab.");
await call("Page.reload");
await waitFor("Boolean(window.gameDebug && document.querySelector('[data-action=splash-continue]'))");
await click('[data-action="splash-continue"]');
await waitFor("Boolean(document.querySelector('.pending-cart-summary'))");
check(await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()") === "NHẬP HÀNG · 41,25K", "Refreshing the page should retain the staged cart.");
const beforePurchaseReload = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
check(beforePurchaseReload.money === initial.money && beforePurchaseReload.stock.rice_paper.quantity === 0, "Reloading a pending cart should not charge money or add stock.");
check(await evaluate("localStorage.getItem('banh-trang-tron-game-save-v1')") === initialSave, "Staged cart data should remain outside the game save.");

await evaluate("window.gameDebug.addMoney(-395000)");
check(await evaluate("document.querySelector('.prep-primary-action')?.disabled"), "Unaffordable cart should disable confirmation.");
check(await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()") === "KHÔNG ĐỦ TIỀN · 41,25K", "Unaffordable action should show the full cart total.");
check(await evaluate("document.querySelector('.pending-cart-budget')?.textContent.includes('Bạn có 5k')"), "Shortage note should show available money and selected total.");
const insufficientMetrics = await screenshot("05-insufficient-funds");

await evaluate("window.gameDebug.addMoney(5000)");
await click('[data-action="inventory-category"][data-category="Đóng gói"]');
for (let index = 0; index < 4; index += 1) await click('[data-action="change-pending-purchase"][data-ingredient="food_box"][data-direction="-1"]');
await click('[data-action="inventory-category"][data-category="Topping"]');
for (let index = 0; index < 3; index += 1) await click('[data-action="change-pending-purchase"][data-ingredient="green_mango"][data-direction="-1"]');
await click('[data-action="inventory-category"][data-category="Bánh tráng"]');
await click('[data-action="change-pending-purchase"][data-ingredient="rice_paper"][data-direction="-1"]');
check(await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()") === "NHẬP HÀNG · 8,25K", "Reducing cart quantities should recover a payable total.");
check(!(await evaluate("document.querySelector('.prep-primary-action')?.disabled")), "Recovered cart should enable confirmation.");
const recoveredMetrics = await screenshot("06-reduced-cart-ready-to-confirm");

await click('[data-action="commit-purchase"]');
const committed = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
check(committed.money === 1_750 && committed.stock.rice_paper.quantity === 5 && committed.stock.shrimp_salt.quantity === 5, "Commit should charge once and add the selected stock.");
check(committed.stock.rice_paper.batches.length === 1 && committed.stock.rice_paper.batches[0].expireDay === 46, "Confirmed purchase should preserve batch and expiration data.");
check(await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()") === "CHỌN NGUYÊN LIỆU CẦN NHẬP", "Successful commit should clear the pending cart and return to preparation state.");
check(await evaluate("sessionStorage.getItem('banh-trang-pending-purchase-v1') === null"), "Successful confirmation should clear the tab's temporary cart.");
const savedAfterPurchase = JSON.parse(await evaluate("localStorage.getItem('banh-trang-tron-game-save-v1')"));
check(!Object.hasOwn(savedAfterPurchase, "pendingPurchase"), "Pending UI cart must not be serialized into the game save.");
await call("Page.reload");
await waitFor("Boolean(window.gameDebug && document.querySelector('[data-action=splash-continue]'))");
await click('[data-action="splash-continue"]');
await waitFor("Boolean(document.querySelector('.inventory-preparation'))");
const reloaded = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
check(reloaded.money === committed.money && reloaded.stock.rice_paper.quantity === 5 && reloaded.stock.shrimp_salt.quantity === 5, "Committed cash and stock should persist across reload.");
const committedMetrics = await screenshot("07-committed-stock");

await evaluate("window.gameDebug.addMoney(400000)");
const readySelections = [
  ["Gia vị", "satay"], ["Topping", "green_mango"], ["Topping", "vietnamese_coriander"],
  ["Topping", "fried_shallot"], ["Topping", "peanut"], ["Gia vị", "calamansi"], ["Đóng gói", "food_box"],
];
for (const [category, ingredient] of readySelections) {
  await chooseCategory(category);
  await click(`[data-action="change-pending-purchase"][data-ingredient="${ingredient}"][data-direction="1"]`);
}
check(await evaluate("document.querySelector('.prep-primary-action')?.dataset.action") === "commit-purchase", "A pending cart should take precedence over opening the already-ready shop.");
await click('[data-action="commit-purchase"]');
const readyState = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState())"));
check(readyState.stock.food_box.quantity >= 5, "Ready purchase did not include packaging stock.");
check((await evaluate("Boolean(document.querySelector('.prep-primary-action')?.dataset.action === 'start-day' && !document.querySelector('.prep-primary-action').disabled)")), "After confirmed purchase, the ready-to-open action should be enabled.");
check((await evaluate("document.querySelector('.prep-primary-action')?.textContent.trim().toUpperCase()")) === "MỞ CỬA NGÀY 1", "Ready action should show the current day.");
await chooseCategory("Topping");
await click('[data-action="change-pending-purchase"][data-ingredient="chicken_jerky"][data-direction="1"]');
check(await evaluate("document.querySelector('.prep-primary-action')?.dataset.action") === "commit-purchase", "A pending cart should take precedence over opening an already-ready shop.");
await click('[data-action="change-pending-purchase"][data-ingredient="chicken_jerky"][data-direction="-1"]');
check(await evaluate("document.querySelector('.prep-primary-action')?.dataset.action") === "start-day", "Clearing the pending cart should restore the ready-to-open action.");
await chooseCategory("Bánh tráng");
const readyMetrics = await screenshot("08-ready-to-open");

const metrics = [emptyMetrics, singleMetrics, multiMetrics, enoughMetrics, insufficientMetrics, recoveredMetrics, committedMetrics, readyMetrics];
check(metrics.every((item) => item.width === 390 && item.height === 844 && item.documentWidth <= 390 && item.bodyWidth <= 390), `Mobile overflow detected: ${JSON.stringify(metrics)}`);
check(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(" | ")}`);
console.log(JSON.stringify({
  result: "PASS",
  screenshots: ["01-empty-cart", "02-plus-five", "03-multiple-items", "04-total-enough-funds", "05-insufficient-funds", "06-reduced-cart-ready-to-confirm", "07-committed-stock", "08-ready-to-open"],
  firstCommit: { money: committed.money, ricePaper: committed.stock.rice_paper.quantity, shrimpSalt: committed.stock.shrimp_salt.quantity, ricePaperBatches: committed.stock.rice_paper.batches.length },
  ready: { day: readyState.day, canOpen: true, button: "MỞ CỬA NGÀY 1" },
  viewportMetrics: metrics,
  consoleErrors,
}, null, 2));
await call("Browser.close");
