import { escapeHtml } from "./helpers.js";
import { renderFoodAsset } from "./foodAssets.js";

export function renderSplashView(state) {
  return `<div class="splash-scene">
    <div class="splash-awning" aria-hidden="true"></div>
    <section class="welcome-card" aria-label="Chào mừng đến tiệm bánh tráng">
      <div class="welcome-mark">${renderFoodAsset("shop-logo", "welcome-logo", "Tô bánh tráng trộn")}</div>
      <span class="splash-ribbon">MỞ QUẦY · TRỘN MÓN · GIAO KHÁCH</span>
      <h1>BÁNH TRÁNG<br><span>GÓC NHỎ</span></h1>
      <p class="welcome-shop-name">${escapeHtml(state.shopName)}</p>
      <p class="welcome-copy">Chào mừng bạn đến với quầy bánh tráng của riêng mình.</p>
      <div class="splash-actions">
        <button class="button button-primary" data-action="splash-start">Bắt đầu</button>
        ${state.tutorialCompleted ? `<button class="button button-quiet" data-action="splash-continue">Tiếp tục · Ngày ${state.day}</button>` : ""}
      </div>
    </section>
  </div>`;
}
