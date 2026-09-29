import fs from "node:fs/promises";
import { getProductPrice, getProductRecipe } from "../../js/data/products.js";

const output = "D:/@_YenNgoc/Desktop/Boba_Shop/visual-audit/ui-rework/selling-flow.webm";
const baseUrl = "http://127.0.0.1:8125/index.html";
const storageKey = "banh-trang-tron-game-save-v1";
const target = await (await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
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

async function pause(ms = 150) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function click(selector) {
  const clicked = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.disabled) return false; element.click(); return true; })()`);
  if (!clicked) throw new Error(`Unable to click ${selector}`);
  await pause(55);
}

async function captureFrame() {
  const shot = await call("Page.captureScreenshot", { format: "jpeg", quality: 62, fromSurface: true, captureBeyondViewport: false });
  await evaluate(`window.__drawSellingFrame(${JSON.stringify(`data:image/jpeg;base64,${shot.data}`)})`);
}

async function holdCurrentScreen(milliseconds, interval = 130) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    await captureFrame();
    await pause(interval);
  }
}

await call("Page.enable");
await call("Runtime.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url: baseUrl });
await waitFor("Boolean(window.gameDebug && document.querySelector('#splash'))");
await evaluate("localStorage.clear()");
await call("Page.reload");
await waitFor("Boolean(document.querySelector('[data-action=splash-start]'))");
await click('[data-action="splash-start"]');
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
await evaluate(`(() => {
  const state = window.gameDebug.getState();
  const customer = state.customers.find((entry) => entry.status === 'waiting');
  const order = state.orders.find((entry) => entry.id === customer.orderId);
  customer.preferredProduct = 'special';
  order.items[0].productId = 'special';
  order.items[0].size = 'L';
  order.totalPrice = state.sellPrices.special + ${getProductPrice("special", { special: 0 }, { size: "L" })};
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

await evaluate(`(() => {
  const canvas = document.createElement('canvas');
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  canvas.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none';
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  window.__drawSellingFrame = (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { context.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(true); };
    image.onerror = reject;
    image.src = source;
  });
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('MediaRecorder WebM codec is unavailable.');
  window.__sellingChunks = [];
  const recorder = new MediaRecorder(canvas.captureStream(12), { mimeType });
  window.__sellingRecorder = recorder;
  recorder.ondataavailable = (event) => { if (event.data.size) window.__sellingChunks.push(event.data); };
  window.__startSellingRecording = () => recorder.start(200);
  window.__stopSellingRecording = async () => {
    await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
    const blob = new Blob(window.__sellingChunks, { type: mimeType });
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < buffer.length; offset += 0x8000) binary += String.fromCharCode(...buffer.subarray(offset, offset + 0x8000));
    return JSON.stringify({ mimeType, base64: btoa(binary), bytes: buffer.length });
  };
  return mimeType;
})()`);
await evaluate("window.__startSellingRecording()");
await holdCurrentScreen(500);
await click('[data-action="choose-order-size"][data-size="L"]');
await captureFrame();

const recipe = getProductRecipe("special", { size: "L" });
for (const [ingredientId, quantity] of Object.entries(recipe)) {
  if (ingredientId === "food_box") continue;
  for (let index = 0; index < quantity; index += 1) await click(`[data-action="add-order-ingredient"][data-ingredient="${ingredientId}"]`);
  await captureFrame();
}
await holdCurrentScreen(260);
await click('[data-action="mix-order"]');
await holdCurrentScreen(1_500, 95);
await waitFor("Boolean(document.querySelector('[data-action=pack-order]') && !document.querySelector('[data-action=pack-order]').disabled)", 2_500);
await holdCurrentScreen(260);
await click('[data-action="pack-order"]');
await holdCurrentScreen(400);
await click('[data-action="serve-order"]');
await holdCurrentScreen(700);

const recording = JSON.parse(await evaluate("window.__stopSellingRecording()"));
await fs.writeFile(output, Buffer.from(recording.base64, "base64"));
console.log(`Saved ${output} (${recording.bytes} bytes, ${recording.mimeType}).`);
const playbackPage = `<!doctype html><meta charset="utf-8"><video id="flow" src="./selling-flow.webm" controls preload="auto"></video>`;
await fs.writeFile("D:/@_YenNgoc/Desktop/Boba_Shop/visual-audit/ui-rework/selling-flow-preview.html", playbackPage);
await call("Page.navigate", { url: "http://127.0.0.1:8125/visual-audit/ui-rework/selling-flow-preview.html" });
await waitFor("Boolean(document.querySelector('#flow')?.readyState >= 1)", 8_000);
const playback = JSON.parse(await evaluate(`(async () => {
  const video = document.querySelector('#flow');
  video.muted = true;
  await video.play();
  const ended = await Promise.race([
    new Promise((resolve) => video.addEventListener('ended', () => resolve(true), { once: true })),
    new Promise((resolve) => setTimeout(() => resolve(false), 11_000)),
  ]);
  return JSON.stringify({ ended, seconds: video.currentTime, duration: Number.isFinite(video.duration) ? video.duration : null, error: video.error?.message ?? null });
})()`));
const playbackSeconds = playback.duration ?? playback.seconds;
if (!playback.ended || playbackSeconds < 5 || playbackSeconds > 10) throw new Error(`Recorded flow playback check failed: ${JSON.stringify(playback)}`);
console.log(`Video playback verified: ${playbackSeconds.toFixed(1)} seconds.`);
ws.close();
