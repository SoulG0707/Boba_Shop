import { escapeHtml } from "./helpers.js";

export function renderSplashView(state) {
  return `<div class="splash-scene">
    <img class="splash-lantern splash-lantern-left" src="./img/splash-decor/lantern-left.png" alt="" aria-hidden="true">
    <img class="splash-lantern splash-lantern-right" src="./img/splash-decor/lantern-right.png" alt="" aria-hidden="true">
    <img class="splash-sticker splash-sticker-star" src="./img/splash-decor/star.png" alt="" aria-hidden="true">
    <img class="splash-sticker splash-sticker-leaf" src="./img/splash-decor/leaf.png" alt="" aria-hidden="true">
    <div class="splash-food-art" aria-hidden="true"><span>🥭</span><span>🌶️</span><span>🥣</span></div>
    <div class="splash-content">
      <span class="splash-ribbon">Ăn vặt trộn vui mỗi ngày</span>
      <h1>Tiệm Bánh<br><span>Tráng Trộn</span></h1>
      <p class="splash-shop-name">${escapeHtml(state.shopName)}</p>
      <div class="splash-actions">
        <button class="button button-primary splash-start" data-action="splash-start">Bắt đầu chơi</button>
        <button class="button button-quiet splash-continue" data-action="splash-continue">Tiếp tục · Ngày ${state.day}</button>
      </div>
      <small class="splash-version">MỞ QUẦY · TRỘN MÓN · GIAO KHÁCH</small>
    </div>
  </div>`;
}
