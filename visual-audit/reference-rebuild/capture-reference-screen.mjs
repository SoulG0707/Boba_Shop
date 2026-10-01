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
await pause(900);
console.log("BEFORE", await evaluate(`JSON.stringify({text:document.body.innerText.slice(0,1800),buttons:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0}).map(b=>({text:b.innerText,aria:b.getAttribute('aria-label'),cls:b.className,rect:(()=>{const r=b.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})()})).slice(-12)})`));
await capture("reference-screen-before-enter-390x844");
console.log("ENTER", await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(b=>b.getBoundingClientRect().width>0&&b.innerText.includes('Vào Quầy')); if(!button)return false; button.click(); return true; })()`));
await pause(1500);
console.log("AFTER_ENTER", await evaluate(`JSON.stringify({text:document.body.innerText.slice(0,2400),buttons:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0}).map(b=>({text:b.innerText,aria:b.getAttribute('aria-label'),cls:b.className})).slice(0,60)})`));
await capture("reference-screen-after-enter-390x844");
socket.close();
