const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
const target = tabs.find((tab) => tab.type === "page" && tab.url.includes("127.0.0.1:8125/index.html"));
if (!target) throw new Error("Local app tab not found");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const packet = JSON.parse(event.data);
  if (packet.method === "Runtime.exceptionThrown") console.log("EXCEPTION", packet.params.exceptionDetails?.text, packet.params.exceptionDetails?.exception?.description);
  if (packet.method === "Log.entryAdded" && packet.params.entry.level === "error") console.log("LOG", packet.params.entry.text);
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
await call("Runtime.enable");
await call("Log.enable");
console.log(await evaluate(`JSON.stringify({url:location.href,title:document.title,ready:document.readyState,debug:!!window.gameDebug,text:document.body.innerText.slice(0,1400),scripts:[...document.scripts].map((script)=>script.src)})`));
socket.close();
