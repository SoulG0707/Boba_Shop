import fs from "node:fs/promises";
import path from "node:path";

const folder = path.resolve("visual-audit/reference-rebuild");
const cases = [
  { page: "compare-iteration-1-mobile.html", width: 780, height: 872, file: "comparison-iteration-1-mobile.png" },
  { page: "compare-iteration-1-desktop.html", width: 2732, height: 796, file: "comparison-iteration-1-desktop.png" },
  { page: "compare-iteration-2-mobile.html", width: 780, height: 872, file: "comparison-iteration-2-mobile.png" },
  { page: "compare-iteration-2-desktop.html", width: 2732, height: 796, file: "comparison-iteration-2-desktop.png" },
];
const target = await (await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => { const packet = JSON.parse(event.data); const callback = pending.get(packet.id); if (!callback) return; pending.delete(packet.id); packet.error ? callback.reject(new Error(packet.error.message)) : callback.resolve(packet.result); });
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { const packet = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (packet.exceptionDetails) throw new Error(packet.exceptionDetails.text); return packet.result.value; };
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await call("Page.enable");
for (const item of cases) {
  await call("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: `http://127.0.0.1:8125/visual-audit/reference-rebuild/${item.page}` });
  await pause(450);
  await evaluate(`Promise.all([...document.images].map(image=>image.decode()))`);
  const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  const file = path.join(folder, item.file);
  await fs.writeFile(file, Buffer.from(screenshot.data, "base64"));
  console.log(`${item.file}: ${screenshot.data.length} base64 bytes`);
}
socket.close();
