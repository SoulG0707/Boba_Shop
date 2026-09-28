import { escapeHtml } from "./helpers.js";

export function renderSplashView(state) {
  return `<div class="splash-scene">
    <img class="splash-cloud" src="./img/splash-decor/cloud.png" alt="" aria-hidden="true">
    <img class="splash-lantern splash-lantern-left" src="./img/splash-decor/lantern-left.png" alt="" aria-hidden="true">
    <img class="splash-lantern splash-lantern-right" src="./img/splash-decor/lantern-right.png" alt="" aria-hidden="true">
    <img class="splash-sticker splash-sticker-star" src="./img/splash-decor/star.png" alt="" aria-hidden="true">
    <img class="splash-sticker splash-sticker-leaf" src="./img/splash-decor/leaf.png" alt="" aria-hidden="true">
    <div class="splash-content">
      <span class="splash-ribbon">Một ngày thơm mùi trà</span>
      <h1>Tiệm Trà<br><span>Mơ Ước</span></h1>
      <p class="splash-shop-name">${escapeHtml(state.shopName)}</p>
      <div class="splash-actions">
        <button class="button button-primary splash-start" data-action="splash-start">Bắt đầu chơi</button>
        <button class="button button-quiet splash-continue" data-action="splash-continue">Tiếp tục · Ngày ${state.day}</button>
      </div>
      <small class="splash-version">PHIÊN BẢN 1.0 · LƯU TRÊN THIẾT BỊ</small>
    </div>
  </div>`;
}
