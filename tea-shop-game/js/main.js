import { DEBUG } from "./config.js";
import { getState, updateState, replaceState } from "./state/store.js";
import { saveGame, resetGame } from "./state/persistence.js";
import { navigate, renderApp, renderCurrentView, getCurrentRoute } from "./ui/router.js";
import { renderHeader } from "./ui/header.js";
import { hideModal, showEndDayModal, showModal } from "./ui/modal.js";
import { showToast } from "./ui/toast.js";
import { purchaseIngredient } from "./systems/inventory.js";
import { buyUpgrade } from "./systems/upgrades.js";
import { hireEmployee, fireEmployee } from "./systems/employees.js";
import { createOrder, setOrderStatus, serveOrder } from "./systems/orders.js";
import { spawnCustomer } from "./systems/customers.js";
import { acceptOnlineOrder, completeOnlineOrder } from "./systems/onlineOrders.js";
import { startDay, pauseDay, resumeDay, tickDay, endDay, nextDay } from "./systems/dayCycle.js";
import { triggerEvent } from "./systems/events.js";
import { escapeHtml } from "./ui/helpers.js";
import { createBackup, restoreBackup } from "./backup/backup.js";
import { audioManager } from "./systems/audioManager.js";

const header = document.querySelector("#header");
let renderedSecond = -1;
let summaryShownForDay = null;

function refreshUI({ full = false } = {}) {
  const state = getState();
  document.body.dataset.theme = state.settings.theme ?? "peach";
  header.innerHTML = renderHeader(state);
  if (full) renderApp(state);
  else document.querySelector("#view").innerHTML = renderCurrentView(state);
}

function openSettings() {
  const state = getState();
  const body = `<div class="setting-line"><span><strong>Nhạc nền</strong><div class="tiny muted">Phát nhạc sau thao tác đầu tiên</div></span><input class="switch" type="checkbox" data-setting="music" ${state.settings.music ? "checked" : ""}></div>
    <div class="setting-line"><span><strong>Hiệu ứng âm thanh</strong><div class="tiny muted">Chuông và âm thanh pha chế</div></span><input class="switch" type="checkbox" data-setting="sound" ${state.settings.sound ? "checked" : ""}></div>
    <div class="setting-line"><label for="theme-setting">Màu giao diện</label><select id="theme-setting" class="text-input" style="max-width:180px" data-setting="theme"><option value="peach" ${state.settings.theme === "peach" ? "selected" : ""}>Đào sữa</option><option value="mint" ${state.settings.theme === "mint" ? "selected" : ""}>Trà xanh</option></select></div>
    <div class="setting-line"><label for="music-volume">Âm lượng nhạc</label><input id="music-volume" type="range" min="0" max="100" value="50" data-setting-volume="music"></div><div class="setting-line"><label for="sfx-volume">Âm lượng hiệu ứng</label><input id="sfx-volume" type="range" min="0" max="100" value="65" data-setting-volume="sound"></div>
    <div class="divider"></div><strong>Sao lưu tiến trình</strong><p class="tiny">Backup được tạo trên thiết bị này, có checksum SHA-256 để phát hiện dữ liệu sai.</p><div class="button-row"><button class="button button-quiet" data-action="export-backup">Tạo backup</button><button class="button button-primary" data-action="restore-backup">Khôi phục</button></div><textarea id="backup-text" class="text-input" rows="4" style="margin-top:.65rem;resize:vertical" placeholder="Dán mã TEASHOP1... vào đây để khôi phục"></textarea>
    <div class="button-row" style="margin-top:1rem"><button class="button button-quiet" data-action="edit-shop-name">Đổi tên tiệm</button><button class="button button-danger" data-action="confirm-reset">Chơi lại từ đầu</button></div>`;
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
  if (result.success) showToast(successMessage, "success");
  else showToast(result.reason ?? "Thao tác chưa hoàn tất.", "error");
}

function handleAction(action, element) {
  const state = getState();
  switch (action) {
    case "close-modal":
      hideModal();
      break;
    case "settings":
      openSettings();
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
        link.download = `tra-nho-ngay-${getState().day}.teashop`;
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
        refreshUI({ full: true });
        showToast("Đã khôi phục tiến trình từ backup.", "success");
      }).catch((error) => showToast(error.message, "error", 4200));
      break;
    }
    case "reset-game":
      replaceState(resetGame());
      hideModal();
      navigate("dashboard");
      refreshUI({ full: true });
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
      updateState((current) => startDay(current));
      navigate("gameplay");
      refreshUI({ full: true });
      showToast("Cửa tiệm đã mở cửa. Chúc bạn buôn may bán đắt!", "success");
      break;
    case "show-summary":
      showEndDayModal(state.dailyStats, state.day);
      break;
    case "next-day":
      hideModal();
      updateState((current) => nextDay(current));
      summaryShownForDay = null;
      navigate("dashboard");
      refreshUI({ full: true });
      break;
    case "buy-stock":
      updateState((current) => {
        const result = purchaseIngredient(current, element.dataset.ingredient, Number(element.dataset.quantity));
        notifyResult(result, `Đã thêm ${result.quantity ?? ""} nguyên liệu vào kho.`);
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
    case "prepare-order":
      updateState((current) => setOrderStatus(current, element.dataset.order, "preparing"));
      refreshUI();
      break;
    case "serve-order": {
      let result;
      updateState((current) => { result = serveOrder(current, element.dataset.order); });
      notifyResult(result, "Đơn đã phục vụ! Khách vui vẻ rời tiệm.");
      refreshUI();
      break;
    }
    case "accept-online":
      updateState((current) => {
        const accepted = acceptOnlineOrder(current, element.dataset.order);
        if (accepted) showToast("Đã nhận đơn online, bắt đầu pha chế.", "success");
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
    audioManager.playSfx(action === "serve-order" || action === "complete-online" ? "cash" : action === "buy-upgrade" ? "levelup" : action === "prepare-order" ? "pour" : "tap");
    return;
  }
  const routeButton = event.target.closest("[data-navigate]");
  if (routeButton && navigate(routeButton.dataset.navigate)) refreshUI({ full: true });
  if (event.target.id === "modal") hideModal();
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches("[data-price-product]")) {
    const productId = input.dataset.priceProduct;
    const price = Math.max(1_000, Math.round(Number(input.value) / 1_000) * 1_000);
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
  if (state.gameplay.status !== "running") return;
  const now = Date.now();
  tickDay(state, now);
  saveGame(state);
  const currentSecond = Math.floor(state.gameplay.elapsedMs / 1000);
  if (currentSecond !== renderedSecond) {
    renderedSecond = currentSecond;
    header.innerHTML = renderHeader(state);
    if (getCurrentRoute() === "gameplay") document.querySelector("#view").innerHTML = renderCurrentView(state);
  }
  if (state.gameplay.status === "summary" && summaryShownForDay !== state.day) {
    summaryShownForDay = state.day;
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
      refreshUI({ full: true });
    },
    spawnCustomer() {
      updateState((state) => {
        const customer = spawnCustomer(state);
        if (customer) createOrder(state, customer);
      });
      navigate("gameplay");
      refreshUI({ full: true });
    },
    triggerEvent(id) {
      updateState((state) => triggerEvent(state, id));
      refreshUI();
    },
  };
}

renderApp(getState());
header.innerHTML = renderHeader(getState());
document.body.dataset.theme = getState().settings.theme ?? "peach";
enableDebugTools();
audioManager.setSfxEnabled(getState().settings.sound);
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker chưa được đăng ký.", error));
}
if (getState().gameplay.status === "summary") {
  summaryShownForDay = getState().day;
  showEndDayModal(getState().dailyStats, getState().day);
}
window.setInterval(runGameLoop, 500);
