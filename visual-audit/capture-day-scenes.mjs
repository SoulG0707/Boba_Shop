import fs from "node:fs/promises";
import { createInitialState } from "../js/state/initialState.js";
import { startDay, tickDay } from "../js/systems/dayCycle.js";

const outputDir = new URL("./day-progression/", import.meta.url);
await fs.mkdir(outputDir, { recursive: true });
const url = "http://127.0.0.1:8125/index.html";
const target = await (await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
const browserErrors = [];
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result);
});
function call(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression) { for (let i = 0; i < 80; i += 1) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 100)); } throw new Error(`Timeout: ${expression}`); }

await call("Page.enable");
await call("Runtime.enable");
await call("Log.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
for (const day of [1, 3, 6]) {
  const state = createInitialState();
  state.day = day;
  state.tutorialCompleted = true;
  state.unlockedItems = ["traditional", "beef", "chicken", "special"];
  for (const item of Object.values(state.stock)) {
    item.quantity = 20;
    item.batches = [{ quantity: 20, boughtDay: day, expireDay: day + item.expirationDays, unitPrice: item.purchasePrice }];
  }
  const now = Date.now();
  startDay(state, now, () => .5);
  tickDay(state, now + 4_000, () => day === 1 ? 0 : day === 3 ? .92 : .95);
  await call("Page.navigate", { url });
  await waitFor("Boolean(window.gameDebug)");
  await evaluate(`localStorage.setItem("banh-trang-tron-game-save-v1", ${JSON.stringify(JSON.stringify(state))})`);
  await call("Page.reload", { ignoreCache: true });
  await waitFor("Boolean(document.querySelector('[data-action=splash-continue]'))");
  await evaluate("document.querySelector('[data-action=splash-continue]').click()");
  await waitFor("Boolean(document.querySelector('.selling-scene'))");
  await new Promise((r) => setTimeout(r, 250));
  const info = await evaluate("({day:window.gameDebug.getState().day, order:window.gameDebug.getState().orders[0]?.items[0], customer:window.gameDebug.getState().customers.length, scrollHeight:document.querySelector('.selling-scene').scrollHeight, clientHeight:document.querySelector('.selling-scene').clientHeight, viewport: [innerWidth, innerHeight], jars:document.querySelectorAll('.ingredient-jar').length, trays:document.querySelectorAll('.ingredient-tray').length, packMachine:!!document.querySelector('.pack-station .packing-machine-asset')})");
  const shot = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = new URL(`day-${day}-mobile-390x844.png`, outputDir);
  await fs.writeFile(file, Buffer.from(shot.data, "base64"));
  console.log(`${file.pathname}: ${JSON.stringify(info)}`);
}
if (browserErrors.length) throw new Error(`Browser console errors:\n${browserErrors.join("\n")}`);
console.log("Browser console: no errors");
ws.close();
await fetch(`http://127.0.0.1:9224/json/close/${target.id}`);
