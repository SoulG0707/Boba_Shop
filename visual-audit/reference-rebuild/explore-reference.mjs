const tabs = await (await fetch("http://127.0.0.1:9226/json/list")).json();
const target = tabs.find((tab) => tab.type === "page" && tab.url.startsWith("https://tiemtramouoc.tensorship.tech/"));
if (!target) throw new Error("Reference tab not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const packet = JSON.parse(event.data);
  const callback = pending.get(packet.id);
  if (!callback) return;
  pending.delete(packet.id);
  packet.error ? callback.reject(new Error(packet.error.message)) : callback.resolve(packet.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const packet = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (packet.exceptionDetails) throw new Error(packet.exceptionDetails.text);
  return packet.result.value;
}
await call("Page.enable");
await call("Runtime.enable");
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log("BEFORE", await evaluate(`JSON.stringify({url:location.href,title:document.title,buttons:[...document.querySelectorAll('button')].map((button)=>{const r=button.getBoundingClientRect();return {text:button.innerText,aria:button.getAttribute('aria-label'),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],disabled:button.disabled}})})`));
await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find((node)=>node.getAttribute('aria-label') === 'Đóng' && node.getBoundingClientRect().width > 0); button?.click(); return Boolean(button); })()`);
await new Promise((resolve) => setTimeout(resolve, 1800));
console.log("AFTER_CLOSE", await evaluate(`JSON.stringify({text:document.body.innerText.slice(-1400),buttons:[...document.querySelectorAll('button')].filter((button)=>button.getBoundingClientRect().width>0).map((button)=>({text:button.innerText,aria:button.getAttribute('aria-label'),rect:(()=>{const r=button.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()})).slice(0,30)})`));
await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find((node)=>node.innerText.trim() === 'Bắt đầu' && node.getBoundingClientRect().width > 0); button?.click(); return Boolean(button); })()`);
await new Promise((resolve) => setTimeout(resolve, 1200));
console.log("AFTER_BEGIN", await evaluate(`JSON.stringify({text:document.body.innerText.slice(-1500),buttons:[...document.querySelectorAll('button')].filter((button)=>button.getBoundingClientRect().width>0).map((button)=>({text:button.innerText,aria:button.getAttribute('aria-label')})).slice(0,30)})`));
await evaluate(`(() => { const button=[...document.querySelectorAll('button,a,[role=button]')].find((node)=>node.innerText.trim().startsWith('Bỏ qua') && node.getBoundingClientRect().width > 0); button?.click(); return Boolean(button); })()`);
await new Promise((resolve) => setTimeout(resolve, 900));
console.log("AFTER_SKIP", await evaluate(`JSON.stringify({text:document.body.innerText.slice(-1000),buttons:[...document.querySelectorAll('button')].filter((button)=>button.getBoundingClientRect().width>0).map((button)=>({text:button.innerText,aria:button.getAttribute('aria-label')})).slice(0,30)})`));
await evaluate(`(() => { const input=document.querySelector('input'); if(input){input.value='Tiệm Trà Mơ Ước';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));} const button=[...document.querySelectorAll('button')].find((node)=>node.innerText.trim().startsWith('Tiếp') && node.getBoundingClientRect().width>0); button?.click(); return Boolean(button); })()`);
await new Promise((resolve) => setTimeout(resolve, 1100));
console.log("AFTER_NAME", await evaluate(`JSON.stringify({text:document.body.innerText.slice(-1300),buttons:[...document.querySelectorAll('button')].filter((button)=>button.getBoundingClientRect().width>0).map((button)=>({text:button.innerText,aria:button.getAttribute('aria-label')})).slice(0,30)})`));
await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find((node)=>node.innerText.trim() === 'Khai trương' && node.getBoundingClientRect().width > 0); button?.click(); return Boolean(button); })()`);
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log("AFTER_OPEN", await evaluate(`JSON.stringify({text:document.body.innerText.slice(-1100),buttons:[...document.querySelectorAll('button')].filter((button)=>button.getBoundingClientRect().width>0).map((button)=>({text:button.innerText,aria:button.getAttribute('aria-label')})).slice(0,30)})`));
await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find((node)=>node.getAttribute('aria-label') === 'Xuống Phố' && node.getBoundingClientRect().width > 0); button?.click(); return Boolean(button); })()`);
await new Promise((resolve) => setTimeout(resolve, 1600));
console.log("AFTER_STREET", await evaluate(`JSON.stringify({text:document.body.innerText.slice(-1300),buttons:[...document.querySelectorAll('button')].filter((button)=>button.getBoundingClientRect().width>0).map((button)=>({text:button.innerText,aria:button.getAttribute('aria-label')})).slice(0,40)})`));
const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
await fs.writeFile("visual-audit/reference-rebuild/reference-after-startup-click.png", Buffer.from(screenshot.data, "base64"));
socket.close();
import fs from "node:fs/promises";

