import { DEBUG } from "./config.js";
import { getState, updateState, replaceState } from "./state/store.js";
import { saveGame, resetGame } from "./state/persistence.js";
import { navigate, renderApp } from "./ui/router.js";
import { setInventoryCategory } from "./ui/inventoryView.js";
import { renderHeader } from "./ui/header.js";
import { renderSplashView } from "./ui/splashView.js";
import { renderTutorialView } from "./ui/tutorialView.js";
import { hideModal, showEndDayModal, showModal } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { purchaseIngredient } from "./systems/inventory.js";
import { buyUpgrade } from "./systems/upgrades.js";
import { hireEmployee, fireEmployee } from "./systems/employees.js";
import { addIngredientToOrder, createOrder, finishMixingOrder, mixOrder, packOrder, removeIngredientFromOrder, serveOrder, setOrderSize } from "./systems/orders.js";
import { spawnCustomer } from "./systems/customers.js";
import { acceptOnlineOrder, completeOnlineOrder } from "./systems/onlineOrders.js";
import { startDay, pauseDay, resumeDay, tickDay, endDay, nextDay } from "./systems/dayCycle.js";
import { triggerEvent } from "./systems/events.js";
import { escapeHtml, formatMoneyCompact } from "./ui/helpers.js";
import { createBackup, restoreBackup } from "./backup/backup.js";
import { audioManager } from "./systems/audioManager.js";
import { placeBauCuaBet, clearBauCuaBets, rollBauCua } from "./systems/bauCua.js";
import { playXidachHouseRound } from "./systems/xidach.js";
import { getShopPreparationStatus } from "./systems/preparation.js";

const header = document.querySelector("#header");
const appShell = document.querySelector("#app-shell");
const splash = document.querySelector("#splash");
let renderedSecond = -1;
let summaryShownForDay = null;
let splashVisible = true;
let tutorialVisible = false;
let tutorialPage = 0;
let selectedCustomerId = null;
let serveFeedback = null;
let serveFeedbackTimer = null;

function refreshUI() {
  const state = getState();
  document.body.dataset.theme = state.settings.theme ?? "peach";
  if (splashVisible) {
    appShell.hidden = true;
    appShell.setAttribute("aria-hidden", "true");
    splash.hidden = false;
    splash.innerHTML = tutorialVisible ? renderTutorialView(tutorialPage) : renderSplashView(state);
    return;
  }

  splash.hidden = true;
  appShell.hidden = false;
  appShell.setAttribute("aria-hidden", "false");
  header.innerHTML = renderHeader(state);
  renderApp(state, { selectedCustomerId, feedback: serveFeedback });
}

function enterGame() {
  splashVisible = false;
  tutorialVisible = false;
  let state = getState();
  const migrationNotice = state.migrationNotice;
  if (migrationNotice) {
    updateState((current) => { delete current.migrationNotice; });
    state = getState();
  }
  if (state.gameplay.status === "running") {
    updateState((current) => { current.gameplay.lastTickAt = Date.now(); });
    state = getState();
    saveGame(state);
  }
  syncSelectedCustomer(state);
  navigate("inventory");
  refreshUI();
  if (migrationNotice) showToast(migrationNotice, "info", 7000);
  if (state.gameplay.status === "summary") {
    summaryShownForDay = state.day;
    showEndDayModal(state.dailyStats, state.day);
  }
}

function startTutorial() {
  tutorialPage = 0;
  tutorialVisible = true;
  splashVisible = true;
  refreshUI();
}

function finishTutorial() {
  updateState((state) => { state.tutorialCompleted = true; });
  enterGame();
}

function syncSelectedCustomer(state) {
  const customer = selectedCustomerId && state.customers.find((candidate) => candidate.id === selectedCustomerId && candidate.status === "waiting");
  if (customer) return;
  const nextCustomer = state.customers.find((candidate) => candidate.status === "waiting");
  selectedCustomerId = nextCustomer?.id ?? null;
}

function selectCustomer(customerId) {
  const state = getState();
  const customer = state.customers.find((candidate) => candidate.id === customerId);
  const order = customer && state.orders.find((candidate) => candidate.id === customer.orderId);
  if (!order) return;
  selectedCustomerId = customerId;
  refreshUI();
}

function openSettings() {
  const state = getState();
  const body = `<div class="setting-line"><span><strong>Nhạc nền</strong><div class="tiny muted">Phát nhạc sau thao tác đầu tiên</div></span><input class="switch" type="checkbox" data-setting="music" ${state.settings.music ? "checked" : ""}></div>
    <div class="setting-line"><span><strong>Hiệu ứng âm thanh</strong><div class="tiny muted">Tiếng trộn, đóng hộp và nhận tiền</div></span><input class="switch" type="checkbox" data-setting="sound" ${state.settings.sound ? "checked" : ""}></div>
    <div class="setting-line"><label for="music-volume">Âm lượng nhạc</label><input id="music-volume" type="range" min="0" max="100" value="50" data-setting-volume="music"></div><div class="setting-line"><label for="sfx-volume">Âm lượng hiệu ứng</label><input id="sfx-volume" type="range" min="0" max="100" value="65" data-setting-volume="sound"></div>
    <div class="divider"></div><strong>Sao lưu tiến trình</strong><p class="tiny">Backup được tạo trên thiết bị này, có checksum SHA-256 để phát hiện dữ liệu sai.</p><div class="button-row"><button class="button button-quiet" data-action="export-backup">Tạo backup</button><button class="button button-primary" data-action="restore-backup">Khôi phục</button></div><textarea id="backup-text" class="text-input" rows="4" style="margin-top:.65rem;resize:vertical" placeholder="Dán mã BTRON1... vào đây để khôi phục"></textarea>
    <div class="button-row" style="margin-top:1rem"><button class="button button-quiet" data-action="edit-shop-name">Đổi tên tiệm</button><button class="button button-quiet" data-action="replay-tutorial">Xem lại hướng dẫn</button><button class="button button-danger" data-action="confirm-reset">Chơi lại từ đầu</button></div>`;
  showModal("Cài đặt", body, "Tùy chỉnh trải nghiệm chơi trên thiết bị này.");
}

function openShopNameForm() {
  const state = getState();
  const body = `<form id="shop-name-form"><label for="shop-name" class="tiny muted">Tên tiệm (tối đa 24 ký tự)</label><input id="shop-name" class="text-input" name="shopName" maxlength="24" value="${escapeHtml(state.shopName)}" required><div class="button-row" style="margin-top:1rem"><button class="button button-primary" type="submit">Lưu tên tiệm</button></div></form>`;
  showModal("Đặt tên tiệm", body, "Chọn một cái tên thật dễ thương.");
}

function openResetConfirmation() {
  showModal("Bắt đầu lại?", `<p>Tiến trình đang lưu trên thiết bị này sẽ được thay bằng một tiệm mới.</p><div class="button-row"><button class="button button-danger" data-action="reset-game">Xóa tiến trình</button><button class="button button-quiet" data-action="settings">Quay lại</button></div>`, "Hành động này sẽ đặt lại tiền, kho và lịch sử.");
}

function notifyResult(result, successMessage) {
  if (result.success) {
    if (successMessage) showToast(successMessage, "success");
    return;
  }
  showToast(result.reason ?? "Thao tác chưa hoàn tất.", "error");
}

function handleAction(action, element) {
  const state = getState();
  switch (action) {
    case "splash-start":
      startTutorial();
      break;
    case "splash-continue":
      enterGame();
      break;
    case "tutorial-next":
      if (tutorialPage >= 6) finishTutorial();
      else {
        tutorialPage += 1;
        refreshUI();
      }
      break;
    case "tutorial-skip":
      finishTutorial();
      break;
    case "select-customer":
      selectCustomer(element.dataset.customer);
      break;
    case "choose-order-size":
      updateState((current) => {
        const customer = current.customers.find((candidate) => candidate.id === selectedCustomerId && candidate.status === "waiting");
        if (customer) setOrderSize(current, customer.orderId, element.dataset.size);
      });
      refreshUI();
      break;
    case "add-order-ingredient":
      updateState((current) => {
        const customer = current.customers.find((candidate) => candidate.id === selectedCustomerId && candidate.status === "waiting");
        if (customer) notifyResult(addIngredientToOrder(current, customer.orderId, element.dataset.ingredient), null);
      });
      refreshUI();
      break;
    case "remove-bowl-ingredient":
      updateState((current) => {
        const customer = current.customers.find((candidate) => candidate.id === selectedCustomerId && candidate.status === "waiting");
        if (customer) removeIngredientFromOrder(current, customer.orderId, element.dataset.ingredient);
      });
      refreshUI();
      break;
    case "mix-order": {
      let orderId = null;
      updateState((current) => {
        const customer = current.customers.find((candidate) => candidate.id === selectedCustomerId && candidate.status === "waiting");
        if (customer && mixOrder(current, customer.orderId)) orderId = customer.orderId;
      });
      if (orderId) {
        refreshUI();
        window.setTimeout(() => {
          updateState((current) => finishMixingOrder(current, orderId));
          refreshUI();
        }, 650);
      }
      break;
    }
    case "pack-order": {
      let result;
      updateState((current) => {
        const customer = current.customers.find((candidate) => candidate.id === selectedCustomerId && candidate.status === "waiting");
        result = customer ? packOrder(current, customer.orderId) : { success: false, reason: "Chưa chọn khách." };
      });
      notifyResult(result, "Đã đóng hộp, sẵn sàng giao khách!");
      refreshUI();
      break;
    }
    case "close-modal":
      hideModal();
      break;
    case "settings":
      openSettings();
      break;
    case "replay-tutorial":
      hideModal();
      startTutorial();
      break;
    case "edit-shop-name":
      openShopNameForm();
      break;
    case "confirm-reset":
      openResetConfirmation();
      break;
    case "export-backup":
      createBackup(getState()).then((backup) => {
        const blobUrl = URL.createObjectURL(new Blob([backup], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `banh-trang-tron-ngay-${getState().day}.btron`;
        link.click();
        URL.revokeObjectURL(blobUrl);
        const field = document.querySelector("#backup-text");
        if (field) field.value = backup;
        showToast("Backup đã tải xuống và có thể sao chép từ ô bên dưới.", "success", 4200);
      }).catch((error) => showToast(error.message, "error", 4200));
      break;
    case "restore-backup": {
      const backupText = document.querySelector("#backup-text")?.value ?? "";
      restoreBackup(backupText).then((restoredState) => {
        replaceState(restoredState);
        hideModal();
        refreshUI();
        showToast("Đã khôi phục tiến trình từ backup.", "success");
      }).catch((error) => showToast(error.message, "error", 4200));
      break;
    }
    case "reset-game":
      replaceState(resetGame());
      hideModal();
      navigate("inventory");
      splashVisible = true;
      tutorialVisible = false;
      refreshUI();
      showToast("Tiệm mới đã sẵn sàng!", "success");
      break;
    case "pause-day":
      updateState((current) => {
        if (current.gameplay.status === "running") pauseDay(current);
        else if (current.gameplay.status === "paused") resumeDay(current);
      });
      refreshUI();
      if (getState().gameplay.status === "summary") showEndDayModal(getState().dailyStats, getState().day);
      break;
    case "start-day":
      {
        let started = false;
        updateState((current) => { started = startDay(current); });
        if (!started) showToast(getShopPreparationStatus(getState()).message, "error");
      }
      refreshUI();
      break;
    case "show-summary":
      showEndDayModal(state.dailyStats, state.day);
      break;
    case "next-day":
      hideModal();
      updateState((current) => nextDay(current));
      summaryShownForDay = null;
      navigate("inventory");
      refreshUI();
      break;
    case "focus-inventory-list": {
      const list = document.querySelector("#ingredient-list");
      list?.scrollIntoView({ behavior: "smooth", block: "start" });
      list?.focus({ preventScroll: true });
      break;
    }
    case "inventory-category":
      setInventoryCategory(element.dataset.category);
      refreshUI();
      break;
    case "buy-stock":
      updateState((current) => {
        const result = purchaseIngredient(current, element.dataset.ingredient, Number(element.dataset.quantity));
        if (!result.success) showToast(result.reason ?? "Không thể nhập nguyên liệu.", "error");
      });
      refreshUI();
      break;
    case "buy-upgrade":
      updateState((current) => notifyResult(buyUpgrade(current, element.dataset.upgrade), "Nâng cấp tiệm thành công!"));
      refreshUI();
      break;
    case "hire-employee":
      updateState((current) => notifyResult(hireEmployee(current, element.dataset.role), "Nhân viên mới đã vào ca!"));
      refreshUI();
      break;
    case "fire-employee":
      updateState((current) => fireEmployee(current, element.dataset.employee));
      refreshUI();
      break;
    case "select-bau-stake":
      updateState((current) => { current.miniGames.bauCua.stake = Number(element.dataset.stake); });
      refreshUI();
      break;
    case "add-bau-bet": {
      let result;
      updateState((current) => { result = placeBauCuaBet(current, element.dataset.symbol, current.miniGames.bauCua.stake); });
      notifyResult(result, `Đã đặt ${formatMoneyCompact(result.stake)} vào cửa ${element.dataset.symbol}.`);
      refreshUI();
      break;
    }
    case "clear-bau-bets":
      updateState((current) => { clearBauCuaBets(current); });
      refreshUI();
      break;
    case "roll-bau-cua": {
      let result;
      updateState((current) => { result = rollBauCua(current); });
      notifyResult(result, `Lắc xong · ${result.net >= 0 ? "lãi" : "lỗ"} ${formatMoneyCompact(Math.abs(result.net))}.`);
      refreshUI();
      break;
    }
    case "select-xidach-stake":
      updateState((current) => { current.miniGames.xiDach.stake = Number(element.dataset.stake); });
      refreshUI();
      break;
    case "play-xidach": {
      let result;
      updateState((current) => { result = playXidachHouseRound(current, current.miniGames.xiDach.stake); });
      notifyResult(result, result.outcome === "house" ? `Nhà cái thắng ${formatMoneyCompact(result.net)}.` : result.outcome === "visitor" ? `Khách thắng ${formatMoneyCompact(Math.abs(result.net))}.` : "Hai bên hòa, tiền bảo chứng được hoàn lại.");
      refreshUI();
      break;
    }
    case "serve-order": {
      let result;
      updateState((current) => { result = serveOrder(current, element.dataset.order); });
      if (!result?.success) notifyResult(result, "");
      if (result?.success) {
        serveFeedback = {
          revenue: result.revenue ?? result.order?.totalPrice ?? 0,
          rating: result.review?.rating ?? 5,
          customerType: result.review?.customerType ?? "regular",
          accuracy: result.accuracy,
          createdAt: Date.now(),
        };
        if (serveFeedbackTimer) window.clearTimeout(serveFeedbackTimer);
        serveFeedbackTimer = window.setTimeout(() => {
          serveFeedback = null;
          refreshUI();
        }, 2_000);
        syncSelectedCustomer(getState());
      }
      refreshUI();
      break;
    }
    case "accept-online":
      updateState((current) => {
        const accepted = acceptOnlineOrder(current, element.dataset.order);
        if (accepted) showToast("Đã nhận đơn bánh tráng online.", "success");
      });
      refreshUI();
      break;
    case "complete-online": {
      let result;
      updateState((current) => { result = completeOnlineOrder(current, element.dataset.order); });
      notifyResult(result, "Đơn online đã giao thành công!");
      refreshUI();
      break;
    }
    default:
      break;
  }
}

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton && !actionButton.disabled) {
    const action = actionButton.dataset.action;
    handleAction(action, actionButton);
    audioManager.playSfx(action === "serve-order" || action === "complete-online" ? "cash" : action === "buy-upgrade" ? "levelup" : action === "mix-order" ? "mix" : action === "pack-order" ? "bag" : "tap");
    return;
  }
  const routeButton = event.target.closest("[data-navigate]");
  if (routeButton && navigate(routeButton.dataset.navigate)) refreshUI();
  if (event.target.id === "modal") hideModal();
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches("[data-price-product]")) {
    const productId = input.dataset.priceProduct;
    const price = Math.max(1_000, Math.round(Number(input.value) || 1) * 1_000);
    updateState((state) => { state.sellPrices[productId] = price; });
    showToast("Giá bán đã được cập nhật.", "success");
    refreshUI();
  }
  if (input.matches("[data-setting]")) {
    const key = input.dataset.setting;
    const value = input.type === "checkbox" ? input.checked : input.value;
    updateState((state) => { state.settings[key] = value; });
    if (key === "music") audioManager.setMusicEnabled(value);
    if (key === "sound") audioManager.setSfxEnabled(value);
    if (key === "theme") {
      document.body.dataset.theme = value;
      refreshUI();
    }
  }
  if (input.matches("[data-setting-volume]")) {
    const volume = Number(input.value) / 100;
    if (input.dataset.settingVolume === "music") audioManager.setMusicVolume(volume);
    if (input.dataset.settingVolume === "sound") audioManager.setSfxVolume(volume);
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "shop-name-form") return;
  event.preventDefault();
  const formData = new FormData(event.target);
  const name = String(formData.get("shopName") ?? "").trim().slice(0, 24);
  if (!name) return;
  updateState((state) => { state.shopName = name; });
  hideModal();
  refreshUI();
  showToast("Tên tiệm đã được lưu.", "success");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideModal();
});

document.addEventListener("pointerdown", () => {
  if (!audioManager.unlock()) return;
  audioManager.setMusicEnabled(getState().settings.music);
}, { once: true });

function runGameLoop() {
  const state = getState();
  if (splashVisible || state.gameplay.status !== "running") return;
  const now = Date.now();
  tickDay(state, now);
  saveGame(state);
  const currentSecond = Math.floor(state.gameplay.elapsedMs / 1000);
  if (currentSecond !== renderedSecond) {
    renderedSecond = currentSecond;
    syncSelectedCustomer(state);
    refreshUI();
  }
  if (state.gameplay.status === "summary" && summaryShownForDay !== state.day) {
    summaryShownForDay = state.day;
    navigate("inventory");
    refreshUI();
    showEndDayModal(state.dailyStats, state.day);
    saveGame(state);
  }
}

function enableDebugTools() {
  if (!DEBUG) return;
  window.gameDebug = {
    getState: () => structuredClone(getState()),
    addMoney(amount) {
      updateState((state) => { state.money += Number(amount) || 0; });
      refreshUI();
    },
    nextDay() {
      updateState((state) => {
        if (state.gameplay.status !== "summary") endDay(state);
        nextDay(state);
      });
      refreshUI();
    },
    spawnCustomer() {
      updateState((state) => {
        const customer = spawnCustomer(state);
        if (customer) createOrder(state, customer);
      });
      refreshUI();
    },
    triggerEvent(id) {
      updateState((state) => triggerEvent(state, id));
      refreshUI();
    },
  };
}

refreshUI();
enableDebugTools();
audioManager.setSfxEnabled(getState().settings.sound);
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker chưa được đăng ký.", error));
}
window.setInterval(runGameLoop, 500);
