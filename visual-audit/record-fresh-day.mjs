import fs from "node:fs/promises";
import { createInitialState } from "../js/state/initialState.js";
import { purchaseIngredients } from "../js/systems/inventory.js";

const output = new URL("./day-progression/fresh-save-70s.webm", import.meta.url);
const url = "http://127.0.0.1:8125/index.html";
const target = await (await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result);
});
function call(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression) { for (let i = 0; i < 100; i += 1) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 100)); } throw new Error(`Timeout: ${expression}`); }
async function click(selector) { const ok = await evaluate(`(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button || button.disabled) return false; button.click(); return true; })()`); if (!ok) throw new Error(`Cannot click ${selector}`); }
async function frame() { const shot = await call("Page.captureScreenshot", { format: "jpeg", quality: 55, fromSurface: true }); await evaluate(`window.__drawFrame(${JSON.stringify(`data:image/jpeg;base64,${shot.data}`)})`); }

const state = createInitialState();
state.tutorialCompleted = true;
const purchased = purchaseIngredients(state, { rice_paper: 10, shrimp_salt: 10, green_mango: 10, food_box: 10 });
if (!purchased.success) throw new Error(purchased.reason);

await call("Page.enable");
await call("Runtime.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url });
await waitFor("Boolean(window.gameDebug)");
await evaluate(`localStorage.setItem("banh-trang-tron-game-save-v1", ${JSON.stringify(JSON.stringify(state))})`);
await call("Page.reload", { ignoreCache: true });
await waitFor("Boolean(document.querySelector('[data-action=splash-continue]'))");
await click('[data-action="splash-continue"]');
await waitFor("Boolean(document.querySelector('[data-action=start-day]'))");
await click('[data-action="start-day"]');
await waitFor("Boolean(document.querySelector('.selling-scene') && document.querySelector('[data-action=choose-order-size]'))");

await evaluate(`(() => {
  const canvas = document.createElement('canvas');
  canvas.width = innerWidth; canvas.height = innerHeight;
  canvas.style.cssText = 'position:fixed;left:-10000px;top:0';
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  window.__drawFrame = (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { context.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(true); };
    image.onerror = reject; image.src = source;
  });
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('No WebM recorder');
  const chunks = [];
  const recorder = new MediaRecorder(canvas.captureStream(8), { mimeType });
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  window.__startRecording = () => recorder.start(1000);
  window.__stopRecording = async () => {
    await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
    const bytes = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return JSON.stringify({ base64: btoa(binary), length: bytes.length });
  };
})()`);
await frame();
await evaluate("window.__startRecording()");
const actions = [
  [6, '[data-action="choose-order-size"][data-size="M"]'],
  [8, '[data-action="add-order-ingredient"][data-ingredient="rice_paper"]'],
  [10, '[data-action="add-order-ingredient"][data-ingredient="shrimp_salt"]'],
  [12, '[data-action="add-order-ingredient"][data-ingredient="green_mango"]'],
  [14, '[data-action="mix-order"]'],
  [16, '[data-action="pack-order"]'],
  [18, '[data-action="serve-order"]'],
  [55, '[data-action="choose-order-size"][data-size="M"]'],
  [57, '[data-action="add-order-ingredient"][data-ingredient="rice_paper"]'],
  [59, '[data-action="add-order-ingredient"][data-ingredient="shrimp_salt"]'],
  [61, '[data-action="add-order-ingredient"][data-ingredient="green_mango"]'],
  [63, '[data-action="mix-order"]'],
  [65, '[data-action="pack-order"]'],
  [67, '[data-action="serve-order"]'],
];
let nextAction = 0;
const started = Date.now();
while (Date.now() - started < 70_000) {
  const elapsed = (Date.now() - started) / 1000;
  while (nextAction < actions.length && elapsed >= actions[nextAction][0]) {
    await click(actions[nextAction][1]);
    nextAction += 1;
  }
  await frame();
  await new Promise((r) => setTimeout(r, 150));
}
const recording = JSON.parse(await evaluate("window.__stopRecording()"));
await fs.writeFile(output, Buffer.from(recording.base64, "base64"));
const finalState = await evaluate("({day:gameDebug.getState().day, served:gameDebug.getState().dailyStats.customersServed, online:gameDebug.getState().dailyStats.onlineOrders, customers:gameDebug.getState().customers.length})");
console.log(JSON.stringify({ output: output.pathname, bytes: recording.length, seconds: (Date.now() - started) / 1000, finalState }));
ws.close();
