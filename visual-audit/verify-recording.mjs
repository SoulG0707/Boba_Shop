const url = "http://127.0.0.1:8125/visual-audit/day-progression/fresh-save-preview.html";
const target = await (await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map();
ws.addEventListener("message", ({ data }) => { const result = JSON.parse(data); const entry = pending.get(result.id); if (!entry) return; pending.delete(result.id); if (result.error) entry.reject(new Error(result.error.message)); else entry.resolve(result.result); });
function call(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); }
await call("Runtime.enable");
let playback;
for (let attempt = 0; attempt < 60; attempt += 1) {
  const result = await call("Runtime.evaluate", { expression: "({duration: document.querySelector('video')?.duration, ready: document.querySelector('video')?.readyState, error: document.querySelector('video')?.error?.message || null})", returnByValue: true });
  playback = result.result.value;
  if (playback.ready >= 1) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const check = await call("Runtime.evaluate", { expression: `(async () => {
  const video = document.querySelector('video');
  video.muted = true;
  await Promise.race([video.play().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 3000))]);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return { currentTime: video.currentTime, paused: video.paused, error: video.error?.message ?? null };
})()`, returnByValue: true, awaitPromise: true });
const played = check.result.value;
if (playback.error || played.error || played.currentTime < 2 || played.paused) throw new Error(JSON.stringify({ playback, played }));
console.log(`Playback verified: ${played.currentTime.toFixed(1)}s advanced, readyState ${playback.ready}`);
ws.close();
