import fs from "node:fs/promises";

const root = "D:/@_YenNgoc/Desktop/Boba_Shop/visual-audit/video-reference";
const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
const target = tabs.find((tab) => tab.type === "page" && tab.url.includes("video-reference/viewer.html"));
if (!target) throw new Error("Reference video viewer is not open");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let sequence = 0;
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
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

await call("Page.enable");
await call("Runtime.enable");
await call("Page.reload");
const video = await evaluate("window.ready");
console.log(`Video: ${video.duration.toFixed(2)}s · ${video.width}×${video.height}`);

for (const [index, [from, to]] of [[0, 14], [15, 29], [30, 44], [45, Math.ceil(video.duration)]].entries()) {
  const sheet = await evaluate(`window.renderSheet(${from}, ${to}, 1)`);
  const base64 = sheet.dataUrl.slice(sheet.dataUrl.indexOf(",") + 1);
  await fs.writeFile(`${root}/contact-${index + 1}.png`, Buffer.from(base64, "base64"));
  console.log(`Saved contact sheet ${index + 1}: ${sheet.times.length} frames (${from}s–${to}s)`);
}

for (const time of [0, 10, 15, 20, 30, 40, 50]) {
  const dataUrl = await evaluate(`window.renderFrame(${time})`);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  await fs.writeFile(`${root}/frame-${String(time).padStart(2, "0")}s.png`, Buffer.from(base64, "base64"));
}

ws.close();
