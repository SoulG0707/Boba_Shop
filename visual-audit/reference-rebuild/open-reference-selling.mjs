import fs from "node:fs/promises";
import path from "node:path";

const folder = path.resolve("visual-audit/reference-rebuild");
const tabs = await (await fetch("http://127.0.0.1:9226/json/list")).json();
const target = tabs.find((tab) => tab.type === "page" && tab.url.startsWith("https://tiemtramouoc.tensorship.tech/"));
if (!target) throw new Error("Reference tab not found");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => { const packet = JSON.parse(event.data); const callback = pending.get(packet.id); if (!callback) return; pending.delete(packet.id); packet.error ? callback.reject(new Error(packet.error.message)) : callback.resolve(packet.result); });
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { const packet = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (packet.exceptionDetails) throw new Error(packet.exceptionDetails.text); return packet.result.value; };
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function capture(name) {
  const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(folder, `${name}.png`), Buffer.from(screenshot.data, "base64"));
}
await call("Page.enable");
await call("Runtime.enable");
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await pause(700);
console.log("BEFORE_OPEN", await evaluate(`document.body.innerText.includes('Mở cửa ngày 1')`));
console.log("CLICK_OPEN", await evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Mở cửa ngày 1');if(!button)return null;button.click();return button.innerText})()`));
await pause(4500);
console.log("MOBILE_STATE", await evaluate(`JSON.stringify({text:document.body.innerText.slice(0,1700),buttons:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0}).map(b=>({text:b.innerText,aria:b.getAttribute('aria-label'),cls:b.className})).slice(0,40)})`));
await capture("reference-selling-390x844");
await call("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
await pause(1000);
console.log("DESKTOP_STATE", await evaluate(`JSON.stringify({viewport:[innerWidth,innerHeight],text:document.body.innerText.slice(0,1000)})`));
await capture("reference-selling-1366x768");
socket.close();
