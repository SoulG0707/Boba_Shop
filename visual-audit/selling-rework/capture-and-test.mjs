import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { GAME_CONFIG } from "../../js/config.js";
import { INGREDIENTS } from "../../js/data/ingredients.js";
import { getProductPrice, getProductRecipe, getSizeLabel, PRODUCT_BY_ID } from "../../js/data/products.js";
import { createInitialState } from "../../js/state/initialState.js";
import { purchaseIngredients } from "../../js/systems/inventory.js";
import { createOrder } from "../../js/systems/orders.js";
import { startDay } from "../../js/systems/dayCycle.js";
import { spawnCustomer } from "../../js/systems/customers.js";

const outputDirectory = path.resolve("visual-audit/selling-rework");
const baseUrl = "http://127.0.0.1:8125/index.html";
const storageKey = GAME_CONFIG.STORAGE_KEY;
const devToolsPort = 9224;
const consoleErrors = [];
const results = { screenshots: [], checks: {}, video: null };

await fs.mkdir(outputDirectory, { recursive: true });

function createState({ customers = [], spawnAccumulator = -10_000, startTime = Date.now() } = {}) {
  const state = createInitialState();
  state.tutorialCompleted = true;
  state.money = 3_000_000;
  const purchase = purchaseIngredients(state, Object.fromEntries(INGREDIENTS.map(({ id }) => [id, id === "food_box" ? 100 : 120])));
  assert.equal(purchase.success, true, "Test stock purchase succeeds");
  assert.equal(startDay(state, startTime), true, "Test day starts");
  state.currentEvent = null;
  state.eventEndsAt = null;
  state.gameplay.customerSpawnAccumulator = spawnAccumulator;
  state.gameplay.lastTickAt = startTime;

  const patienceMax = { regular: 120, student: 85, office: 100, reviewer: 137.5 };
  for (const [index, spec] of customers.entries()) {
    const customer = spawnCustomer(state, startTime + index * 1_000, () => 0);
    assert.ok(customer, `Fixture customer ${index + 1} spawns`);
    customer.type = spec.type;
    customer.label = spec.label;
    customer.preferredProduct = spec.productId;
    customer.maxPatience = patienceMax[spec.type];
    customer.patience = customer.maxPatience * (1 - index * 0.14);
    customer.elapsedWait = index * 3;
    const order = createOrder(state, customer, startTime + index * 1_000, () => 0);
    order.items[0].productId = spec.productId;
    order.items[0].size = spec.size;
    order.totalPrice = getProductPrice(spec.productId, state.sellPrices, { size: spec.size });
    order.preparedIngredients = structuredClone(spec.preparedIngredients ?? {});
    if (spec.customerRequest) order.customerRequest = structuredClone(spec.customerRequest);
    order.preparedSize = spec.preparedSize ?? null;
    order.mixed = false;
    order.mixing = false;
    order.packed = false;
    order.status = "waiting";
  }
  return state;
}

const specs = [
  { type: "regular", label: "Khách quen", productId: "traditional", size: "M", preparedSize: "M", preparedIngredients: { rice_paper: 1, shrimp_salt: 1 } },
  { type: "student", label: "Học sinh", productId: "beef", size: "L" },
  { type: "office", label: "Dân văn phòng", productId: "chicken", size: "M", customerRequest: { excludedIngredients: ["vietnamese_coriander"], heatLevel: "Cay vừa" } },
  { type: "reviewer", label: "Khách kỹ tính", productId: "special", size: "L", preparedSize: "L", preparedIngredients: { rice_paper: 2, shrimp_salt: 2, satay: 2, tamarind_sauce: 2, green_mango: 2, vietnamese_coriander: 2, fried_shallot: 2, peanut: 2, quail_egg: 2, beef_jerky: 2, chicken_jerky: 2, dried_shrimp: 2, scallion_oil: 1, calamansi: 1 }, customerRequest: { excludedIngredients: [], heatLevel: "Cay vừa" } },
];
const fourCustomerState = createState({ customers: specs });

const target = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return;
    await pause(60);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function pause(milliseconds = 120) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function click(selector) {
  const clicked = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.disabled) return false; element.click(); return true; })()`);
  if (!clicked) throw new Error(`Unable to click ${selector}`);
  await pause(70);
}

async function seedAndEnter(state) {
  await call("Page.navigate", { url: baseUrl });
  await waitFor("Boolean(window.gameDebug && document.querySelector('#splash'))");
  await evaluate("localStorage.clear(); sessionStorage.clear()");
  await call("Page.reload");
  await waitFor("Boolean(document.querySelector('[data-action=splash-start]'))");
  await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(state))})`);
  await call("Page.reload");
  await waitFor("Boolean(document.querySelector('[data-action=splash-continue]'))");
  await click('[data-action="splash-continue"]');
  await waitFor("Boolean(document.querySelector('.selling-scene'))");
}

async function setViewport(width, height) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}

async function screenshot(name) {
  const shot = await call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  const file = path.join(outputDirectory, `${name}.png`);
  await fs.writeFile(file, Buffer.from(shot.data, "base64"));
  results.screenshots.push(path.basename(file));
  const metrics = JSON.parse(await evaluate(`(() => {
    const scene=document.querySelector('.selling-scene');
    const queue=document.querySelector('#customer-queue');
    const order=document.querySelector('.active-order-bubble');
    const image=document.querySelector('.customer-main-image');
    const action=document.querySelector('.selling-actions');
    const tools=document.querySelector('.ingredient-tools');
    const bowl=document.querySelector('.mixing-bowl');
    const binGrid=document.querySelector('.topping-tray-grid');
    const rect=(node)=>{if(!node)return null;const r=node.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),height:Math.round(r.height)}};
    const orderCopy=order?.querySelector('.order-request-copy');
    const orderStyle=order?getComputedStyle(order):null;
    const sellingText=scene?.innerText??'';
    return JSON.stringify({viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,scene:rect(scene),queue:rect(queue),order:rect(order),mainCustomer:rect(image),bowl:rect(bowl),tools:rect(tools),actions:rect(action),binGrid:binGrid?{clientHeight:binGrid.clientHeight,scrollHeight:binGrid.scrollHeight}:null,orderTextSize:orderCopy?parseFloat(getComputedStyle(orderCopy).fontSize):null,orderOverflow:order?{clientHeight:order.clientHeight,scrollHeight:order.scrollHeight,overflow:orderStyle.overflow}:null,queueCount:document.querySelectorAll('.customer-queue-avatar').length,orderCount:document.querySelectorAll('.active-order-bubble:not(.is-empty)').length,ingredientJars:document.querySelectorAll('.ingredient-jar').length,ingredientTrays:document.querySelectorAll('.ingredient-tray').length,secondaryIngredients:document.querySelectorAll('.ingredient-secondary').length,primaryActionCount:document.querySelectorAll('.selling-actions [data-action]').length,hasLegacyTeaText:/trà sữa|matcha|trân châu|pha ly|quầy trà|\bly\b/i.test(sellingText),showsInternalSize:/\b[ML]\b/.test(document.querySelector('.size-choices')?.innerText??'')});
  })()`));
  if (metrics.documentWidth > metrics.viewport.width) throw new Error(`${name} has horizontal overflow: ${JSON.stringify(metrics)}`);
  if (metrics.tools && metrics.actions && metrics.tools.bottom > metrics.actions.top + 1) throw new Error(`${name} ingredient trays overlap the action bar: ${JSON.stringify(metrics)}`);
  if (metrics.binGrid && metrics.binGrid.scrollHeight > metrics.binGrid.clientHeight + 1) throw new Error(`${name} topping trays are clipped: ${JSON.stringify(metrics)}`);
  if (metrics.scene && metrics.hasLegacyTeaText) throw new Error(`${name} still shows tea-domain text`);
  if (metrics.scene && metrics.showsInternalSize) throw new Error(`${name} still exposes internal M/L size codes`);
  if (metrics.scene && metrics.orderCount && metrics.primaryActionCount !== 1) throw new Error(`${name} emphasizes more than one action`);
  results.checks[name] = metrics;
  console.log(`${name}: ${JSON.stringify(metrics)}`);
  return file;
}

async function recordFrame() {
  const shot = await call("Page.captureScreenshot", { format: "jpeg", quality: 67, fromSurface: true, captureBeyondViewport: false });
  await evaluate(`window.__drawSellingFrame(${JSON.stringify(`data:image/jpeg;base64,${shot.data}`)})`);
}

async function hold(milliseconds, interval = 85) {
  const endAt = Date.now() + milliseconds;
  while (Date.now() < endAt) {
    await recordFrame();
    await pause(interval);
  }
}

async function installRecorder() {
  const mimeType = await evaluate(`(() => {
    const canvas=document.createElement('canvas');canvas.width=innerWidth;canvas.height=innerHeight;canvas.style.cssText='position:fixed;left:-10000px;top:0;pointer-events:none';document.body.append(canvas);
    const context=canvas.getContext('2d');
    window.__drawSellingFrame=(source)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{context.drawImage(image,0,0,canvas.width,canvas.height);resolve(true)};image.onerror=reject;image.src=source});
    const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find((candidate)=>MediaRecorder.isTypeSupported(candidate));if(!type)throw new Error('No WebM codec supported');
    window.__sellingChunks=[];const recorder=new MediaRecorder(canvas.captureStream(12),{mimeType:type});window.__sellingRecorder=recorder;recorder.ondataavailable=(event)=>{if(event.data.size)window.__sellingChunks.push(event.data)};
    window.__startSellingRecording=()=>recorder.start(200);
    window.__stopSellingRecording=async()=>{await new Promise((resolve)=>{recorder.onstop=resolve;recorder.stop()});const blob=new Blob(window.__sellingChunks,{type});const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));return JSON.stringify({mimeType:type,base64:btoa(binary),bytes:bytes.length})};
    return type;
  })()`);
  await evaluate("window.__startSellingRecording()");
  return mimeType;
}

await call("Page.enable");
await call("Runtime.enable");
await call("Network.enable");
await call("Log.enable");
await call("Network.setBypassServiceWorker", { bypass: true });
await call("Network.setCacheDisabled", { cacheDisabled: true });
await call("Network.clearBrowserCache");
await setViewport(390, 844);
await seedAndEnter(fourCustomerState);

const initial = JSON.parse(await evaluate(`JSON.stringify({customers:window.gameDebug.getState().customers.map((customer)=>({id:customer.id,orderId:customer.orderId,patience:customer.patience,maxPatience:customer.maxPatience})),orders:window.gameDebug.getState().orders.map((order)=>({id:order.id,customerId:order.customerId,productId:order.items[0].productId,size:order.items[0].size,prepared:order.preparedIngredients,customerRequest:order.customerRequest}))})`));
assert.equal(initial.customers.length, 4, "Four customers are present in the queue");
assert.equal(await evaluate("document.querySelectorAll('.customer-queue-avatar').length"), 4, "Four waiting customers are visible as avatars");
assert.equal(await evaluate("document.querySelectorAll('.active-order-bubble:not(.is-empty)').length"), 1, "Exactly one full order bubble is rendered");
await screenshot("queue-four-customers-390x844");

const orderByCustomer = new Map(initial.orders.map((order) => [order.customerId, order]));
const displayedOrders = new Map();
for (const [index, customer] of initial.customers.entries()) {
  await click(`[data-action="select-customer"][data-customer="${customer.id}"]`);
  const currentOrder = orderByCustomer.get(customer.id);
  const shownOrderId = await evaluate("document.querySelector('.active-order-bubble')?.dataset.orderId");
  assert.equal(shownOrderId, currentOrder.id, `Focus ${index + 1} opens that customer's saved order`);
  const focusClass = await evaluate(`document.querySelector('[data-customer="${customer.id}"]')?.classList.contains('is-focused')`);
  assert.equal(focusClass, true, `Focus ${index + 1} highlights the selected avatar`);
  const shownText = await evaluate("document.querySelector('.active-order-bubble').innerText");
  displayedOrders.set(customer.id, shownText);
  assert.ok(shownText.includes(PRODUCT_BY_ID[currentOrder.productId].name), `Focus ${index + 1} keeps that customer's original product request`);
  assert.ok(shownText.includes(getSizeLabel(currentOrder.size).toLocaleUpperCase("vi")), `Focus ${index + 1} keeps that customer's original size request`);
  if (index === 0) {
    const bowlIngredients = await evaluate("[...document.querySelectorAll('.bowl-topping')].map((item)=>item.dataset.ingredient)");
    assert.ok(bowlIngredients.includes("rice_paper") && bowlIngredients.includes("shrimp_salt"), "A's prepared bowl is restored after focusing A again");
  }
  const screenshotName = `focus-customer-${index + 1}-390x844`;
  await screenshot(screenshotName);
}

for (const index of [0, 1, 2, 0, 1]) {
  const customer = initial.customers[index];
  await click(`[data-action="select-customer"][data-customer="${customer.id}"]`);
  const shownText = await evaluate("document.querySelector('.active-order-bubble').innerText");
  assert.equal(shownText, displayedOrders.get(customer.id), `A → B → C → A → B preserves all original order wording (${index + 1})`);
}
await click(`[data-action="select-customer"][data-customer="${initial.customers[2].id}"]`);
const excludedOrderText = await evaluate("document.querySelector('.active-order-bubble').innerText");
assert.ok(excludedOrderText.includes("KHÔNG RAU RĂM") && excludedOrderText.includes("CAY VỪA"), "Exclusions and heat requests are bold, readable order terms");
assert.equal(await evaluate("document.querySelectorAll('.active-order-bubble').length"), 1, "Only the focused customer's complete speech bubble exists in the DOM");

await click(`[data-action="select-customer"][data-customer="${initial.customers[0].id}"]`);
const restoredBowl = await evaluate("[...document.querySelectorAll('.bowl-topping')].map((item)=>item.dataset.ingredient)");
assert.ok(restoredBowl.includes("rice_paper") && restoredBowl.includes("shrimp_salt"), "Returning focus to A restores the exact bowl stored on A's order");
const unchangedQueueIds = await evaluate("window.gameDebug.getState().customers.map((customer)=>customer.id)");
assert.deepEqual(unchangedQueueIds, initial.customers.map((customer) => customer.id), "Changing focus never reorders or clones the queue");

const specialOrder = orderByCustomer.get(initial.customers[3].id);
await click(`[data-action="select-customer"][data-customer="${initial.customers[3].id}"]`);
await pause(260);
const specialRecipe = getProductRecipe("special", { size: "L" });
const renderedOrderText = await evaluate("document.querySelector('.active-order-bubble').innerText");
for (const [id, quantity] of Object.entries(specialRecipe)) {
  if (id === "food_box") continue;
  const name = INGREDIENTS.find((ingredient) => ingredient.id === id)?.name;
  assert.ok(name && renderedOrderText.includes(name), `Long order fully displays ${name}`);
}
assert.ok(renderedOrderText.includes("LỚN"), "Large order uses the Vietnamese size label");
assert.equal(await evaluate("document.querySelectorAll('.active-order-bubble').length"), 1, "Only the focused customer's full order exists in the DOM");
const longOrderStyles = JSON.parse(await evaluate(`(() => {const order=document.querySelector('.active-order-bubble').getBoundingClientRect();const image=document.querySelector('.customer-main-image').getBoundingClientRect();const bowl=document.querySelector('.mixing-bowl').getBoundingClientRect();const copy=document.querySelector('.order-request-copy');const font=parseFloat(getComputedStyle(copy).fontSize);const bubble=document.querySelector('.active-order-bubble');return JSON.stringify({orderWidth:order.width,orderTop:order.top,orderBottom:order.bottom,mainCustomerHeight:image.height,bowlWidth:bowl.width,bowlHeight:bowl.height,ingredientFontSize:font,bubbleClientHeight:bubble.clientHeight,bubbleScrollHeight:bubble.scrollHeight})})()`));
assert.ok(longOrderStyles.orderWidth >= 245 && longOrderStyles.orderBottom <= 844, "Long order bubble is wide enough and fully inside the mobile viewport");
assert.ok(longOrderStyles.mainCustomerHeight >= 145 && longOrderStyles.mainCustomerHeight <= 165, "Main customer illustration meets the 145–165px mobile target");
assert.ok(longOrderStyles.bowlWidth >= 140 && longOrderStyles.bowlHeight >= 140, "Mixing bowl occupies a large, stable workstation area");
assert.ok(longOrderStyles.ingredientFontSize >= 14, "Order wording meets the 14px readability target");
assert.equal(longOrderStyles.bubbleClientHeight, longOrderStyles.bubbleScrollHeight, "Long order text is not clipped or put in an inner scroll region");
results.checks.longOrderLayout = longOrderStyles;
await screenshot("selling-long-order-focused-customer-4-390x844");

const focusAndPatienceCheck = JSON.parse(await evaluate(`(() => { const state=window.gameDebug.getState(); const customer=state.customers.find((entry)=>entry.id===${JSON.stringify(initial.customers[1].id)}); const order=state.orders.find((entry)=>entry.id===customer.orderId); return JSON.stringify({customerId:customer.id,orderId:order.id,patience:customer.patience,maxPatience:customer.maxPatience,prepared:order.preparedIngredients,size:order.preparedSize}) })()`));
assert.equal(focusAndPatienceCheck.customerId, initial.customers[1].id, "Focus switching does not reorder or replace the selected customer");
assert.deepEqual(focusAndPatienceCheck.prepared, {}, "Focusing other orders did not move ingredients out of B's bowl");
assert.equal(focusAndPatienceCheck.maxPatience, initial.customers[1].maxPatience, "Focus switching preserves patience maximum");
results.checks.focusAndPatience = focusAndPatienceCheck;

await setViewport(1366, 768);
await pause(100);
await screenshot("selling-desktop-1366x768");
await setViewport(390, 844);

await evaluate(`(() => {
  const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  const originalSetter=descriptor.set;
  const originalGetter=descriptor.get;
  Object.defineProperty(Element.prototype,'innerHTML',{configurable:true,enumerable:descriptor.enumerable,get:originalGetter,set(value){if(this.id==='view')window.__fullSellingRenderCount=(window.__fullSellingRenderCount||0)+1;originalSetter.call(this,value)}});
  const storageSetter=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key===${JSON.stringify(storageKey)})window.__gameSaveCount=(window.__gameSaveCount||0)+1;return storageSetter.call(this,key,value)};
  window.__fullSellingRenderCount=0;window.__gameSaveCount=0;
})()`);
// Keep the queue at capacity during the idle measurement so the test isolates timer updates from arrivals.
await evaluate(`(() => { const random=Math.random; Math.random=()=>0; for(let i=0;i<4;i++)window.gameDebug.spawnCustomer(); Math.random=random; window.__fullSellingRenderCount=0;window.__gameSaveCount=0; })()`);
await evaluate("window.__initialScene=document.querySelector('.selling-scene')");
await evaluate("window.__patienceBeforeIdle=Object.fromEntries(window.gameDebug.getState().customers.map((customer)=>[customer.id,customer.patience]));window.__focusBeforeIdle=document.querySelector('[data-focused-customer]')?.dataset.focusedCustomer");
await pause(10_000);
const idleMetrics = JSON.parse(await evaluate(`(() => {const customers=window.gameDebug.getState().customers;return JSON.stringify({fullRenderCount:window.__fullSellingRenderCount,gameSaveCount:window.__gameSaveCount,queueCount:document.querySelectorAll('.customer-queue-avatar').length,sameScene:document.querySelector('.selling-scene')===window.__initialScene,focusedCustomerId:document.querySelector('[data-focused-customer]')?.dataset.focusedCustomer,allPatienceAdvanced:customers.length===8&&customers.every((customer)=>customer.patience<window.__patienceBeforeIdle[customer.id]),viewWidth:document.querySelector('#view').clientWidth,viewScrollWidth:document.querySelector('#view').scrollWidth})})()`));
assert.equal(idleMetrics.fullRenderCount, 0, "Selling view is not fully rendered during ten seconds of idle updates");
assert.ok(idleMetrics.gameSaveCount <= 3, "Autosave stays below one localStorage write every five seconds");
assert.equal(idleMetrics.queueCount, 8, "Additional customers join the queue without stealing the focus");
assert.equal(idleMetrics.sameScene, true, "The selling screen node stays mounted while idle");
assert.equal(idleMetrics.focusedCustomerId, initial.customers[3].id, "Customer arrivals do not take focus from the current guest");
assert.equal(idleMetrics.allPatienceAdvanced, true, "All eight waiting customers continue to lose patience while idle");
results.checks.idleTenSeconds = idleMetrics;
console.log(`Idle performance: ${JSON.stringify(idleMetrics)}`);

// Inventory category screenshots also verify cross-tab pending quantities and real DOM filtering.
const preparationState = createInitialState();
preparationState.tutorialCompleted = true;
preparationState.money = 2_000_000;
await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(preparationState))}); sessionStorage.clear()`);
await call("Page.reload");
await waitFor("Boolean(document.querySelector('[data-action=splash-continue]'))");
await click('[data-action="splash-continue"]');
await waitFor("Boolean(document.querySelector('.inventory-preparation'))");
const baseRows = await evaluate("[...document.querySelectorAll('[data-ingredient-row]')].map((row)=>row.getAttribute('data-ingredient-row'))");
assert.deepEqual(baseRows, ["rice_paper"], "Base tab has only base ingredients in the DOM by default");
await screenshot("inventory-base-only-390x844");
await click('[data-action="change-pending-purchase"][data-ingredient="rice_paper"][data-direction="1"]');
await click('[data-action="inventory-category"][data-category="Gia vị"]');
const seasoningRows = await evaluate("[...document.querySelectorAll('[data-ingredient-row]')].map((row)=>row.getAttribute('data-ingredient-row'))");
assert.ok(seasoningRows.length && seasoningRows.every((id) => INGREDIENTS.find((ingredient) => ingredient.id === id)?.category === "Gia vị"), "Seasoning tab contains only seasoning rows");
await screenshot("inventory-seasoning-only-390x844");
await click('[data-action="change-pending-purchase"][data-ingredient="shrimp_salt"][data-direction="1"]');
await click('[data-action="inventory-category"][data-category="Topping"]');
const toppingRows = await evaluate("[...document.querySelectorAll('[data-ingredient-row]')].map((row)=>row.getAttribute('data-ingredient-row'))");
assert.ok(toppingRows.length && toppingRows.every((id) => INGREDIENTS.find((ingredient) => ingredient.id === id)?.category === "Topping"), "Topping tab contains only topping rows");
await click('[data-action="change-pending-purchase"][data-ingredient="green_mango"][data-direction="1"]');
await click('[data-action="inventory-category"][data-category="Bánh tráng"]');
const cartSummary = await evaluate("document.querySelector('.pending-cart-summary')?.innerText");
assert.ok(cartSummary?.includes("3 nguyên liệu") && cartSummary.includes("15 đơn vị"), "Cart quantity persists across category switches");
const stockBeforeConfirm = await evaluate("window.gameDebug.getState().stock.rice_paper.quantity");
assert.equal(stockBeforeConfirm, 0, "Pending quantities do not change stock before confirmation");
const readyAfterConfirm = await evaluate("document.querySelector('[data-ingredient-row=rice_paper] .inventory-prep-feedback')?.innerText");
assert.ok(readyAfterConfirm?.includes("Đủ sau khi xác nhận nhập"), "Pending stock clears the warning but waits for confirmation");
await screenshot("inventory-cart-persists-after-tabs-390x844");
results.checks.inventoryCategories = { baseRows, seasoningRows, toppingRows, cartSummary, stockBeforeConfirm };

// Save a desktop viewport capture, then record A's service while B, C, and D keep their original orders.
await seedAndEnter(fourCustomerState);
await setViewport(1366, 768);
await screenshot("selling-desktop-1366x768");

// Record a 20-second flow with four waiting customers and one later arrival.
const recordingSpecs = specs.map((spec) => ({ ...spec, preparedIngredients: { ...(spec.preparedIngredients ?? {}) } }));
recordingSpecs[0] = { ...recordingSpecs[0], preparedIngredients: {}, preparedSize: null, customerRequest: { excludedIngredients: [], heatLevel: "Cay vừa" } };
const recordingState = createState({ customers: recordingSpecs, spawnAccumulator: -10_000 });
await setViewport(390, 844);
await seedAndEnter(recordingState);
assert.equal(await evaluate("document.querySelectorAll('.customer-queue-avatar').length"), 4, "Recording starts with customers A, B, C, and D");
const recordingType = await installRecorder();
const recordingStartedAt = Date.now();
await hold(1_150);
await evaluate("(() => { const random=Math.random;Math.random=()=>0;window.gameDebug.spawnCustomer();Math.random=random; })()");
await waitFor("document.querySelectorAll('.customer-queue-avatar').length === 5");
await hold(1_450);
const recordingCustomers = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState().customers.map((customer)=>({id:customer.id,orderId:customer.orderId,label:customer.label})))"));
const ordersBeforeServing = JSON.parse(await evaluate("JSON.stringify(window.gameDebug.getState().orders.filter((order)=>order.customerId).map((order)=>({id:order.id,customerId:order.customerId,request:order.customerRequest,productId:order.items[0].productId,size:order.items[0].size})))"));
const servedCustomer = recordingCustomers[0];
await click(`[data-action="select-customer"][data-customer="${servedCustomer.id}"]`);
await hold(950);
await click('[data-action="choose-order-size"][data-size="M"]');
const recordingRecipe = getProductRecipe("traditional", { size: "M" });
for (const [ingredientId, quantity] of Object.entries(recordingRecipe)) {
  if (ingredientId === "food_box") continue;
  for (let count = 0; count < quantity; count += 1) {
    await click(`[data-action="add-order-ingredient"][data-ingredient="${ingredientId}"]`);
    await hold(110, 90);
  }
}
await hold(900);
await click('[data-action="mix-order"]');
await hold(1_850);
await waitFor("Boolean(document.querySelector('[data-action=pack-order]') && !document.querySelector('[data-action=pack-order]').disabled)", 2_500);
await click('[data-action="pack-order"]');
await hold(1_650);
const packedState = JSON.parse(await evaluate(`JSON.stringify({packed:window.gameDebug.getState().orders.find((order)=>order.id===${JSON.stringify(servedCustomer.orderId)})?.packed,source:!!document.querySelector('.packing-source'),box:!!document.querySelector('.food-box'),next:document.querySelector('.next-work-action')?.textContent})`));
assert.equal(packedState.packed, true, "Packing changes the business order state");
assert.ok(packedState.source && packedState.box && packedState.next === "GIAO KHÁCH · 25k", "Packing animates the bowl into a box and exposes only the serve action");
await click(`[data-action="serve-order"][data-order="${servedCustomer.orderId}"]`);
await waitFor(`document.querySelector('.active-order-bubble')?.dataset.orderId === ${JSON.stringify(recordingCustomers[1].orderId)}`);
const afterServingA = JSON.parse(await evaluate("JSON.stringify({customers:window.gameDebug.getState().customers.map((customer)=>({id:customer.id,orderId:customer.orderId})),orders:window.gameDebug.getState().orders.filter((order)=>order.customerId).map((order)=>({id:order.id,customerId:order.customerId,request:order.customerRequest,productId:order.items[0].productId,size:order.items[0].size}))})"));
assert.ok(!afterServingA.customers.some((customer) => customer.id === servedCustomer.id), "Serving A removes only A from the waiting queue");
assert.deepEqual(afterServingA.customers.slice(0, 3).map((customer) => customer.id), recordingCustomers.slice(1, 4).map((customer) => customer.id), "B, C, and D keep their queue order");
for (const customer of recordingCustomers.slice(1, 4)) {
  const before = ordersBeforeServing.find((order) => order.customerId === customer.id);
  const after = afterServingA.orders.find((order) => order.customerId === customer.id);
  assert.deepEqual(after, before, `${customer.label} retains its original immutable order after serving A`);
}
await hold(9_800);
const recordingSeconds = (Date.now() - recordingStartedAt) / 1000;
assert.ok(recordingSeconds >= 20, `Selling video must cover at least 20 seconds, got ${recordingSeconds.toFixed(1)}`);
const recording = JSON.parse(await evaluate("window.__stopSellingRecording()"));
assert.ok(recordingSeconds >= 19 && recordingSeconds <= 21, `Recording duration should be 19–21 seconds, got ${recordingSeconds.toFixed(1)}s`);
const videoPath = path.join(outputDirectory, "focused-selling-flow-20s.webm");
await fs.writeFile(videoPath, Buffer.from(recording.base64, "base64"));
await fs.writeFile(path.join(outputDirectory, "focused-selling-flow-preview.html"), `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Quầy bánh tráng · video</title><video src="./focused-selling-flow-20s.webm" controls preload="metadata" style="width:min(100vw,390px);height:auto"></video>`);
results.video = { file: path.basename(videoPath), durationSeconds: Number(recordingSeconds.toFixed(1)), bytes: recording.bytes, mimeType: recordingType };
console.log(`Recorded ${videoPath} (${recording.bytes} bytes, ${recordingSeconds.toFixed(1)} seconds).`);

await call("Page.navigate", { url: "http://127.0.0.1:8125/visual-audit/selling-rework/focused-selling-flow-preview.html" });
await waitFor("Boolean(document.querySelector('video') && document.querySelector('video').readyState >= 1)", 10_000);
const playback = JSON.parse(await evaluate(`(async()=>{const video=document.querySelector('video');video.muted=true;await video.play();await new Promise((resolve)=>setTimeout(resolve,700));const state={duration:video.duration,currentTime:video.currentTime,error:video.error?.message??null};video.pause();return JSON.stringify(state)})()`));
const durationMetadataValid = playback.duration == null || (playback.duration >= 19 && playback.duration <= 21);
assert.ok(durationMetadataValid && playback.currentTime > 0 && playback.error === null, `Video playback check failed: ${JSON.stringify(playback)}`);
results.checks.videoPlayback = playback;
assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(" | ")}`);
results.checks.consoleErrors = consoleErrors;
await fs.writeFile(path.join(outputDirectory, "qa-results.json"), JSON.stringify(results, null, 2));
console.log(`Video playback verified: ${JSON.stringify(playback)}`);
console.log(`Saved ${path.join(outputDirectory, "qa-results.json")}`);
ws.close();
