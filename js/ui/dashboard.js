import { INGREDIENTS } from "../data/ingredients.js";
import { escapeHtml } from "./helpers.js";

export function renderDashboard(state) {
  const stockedIngredients = INGREDIENTS.filter((ingredient) => (state.stock[ingredient.id]?.quantity ?? 0) > 0).length;
  const openAction = state.gameplay.status === "summary"
    ? `<button class="button button-primary" data-action="show-summary">Xem tổng kết ngày</button>`
    : `<button class="button button-primary" data-action="start-day">Mở cửa tiệm</button>`;
  const headline = state.gameplay.status === "summary" ? "Ngày bán hàng đã khép lại" : "Mọi thứ đã sẵn sàng?";
  const description = state.gameplay.status === "summary"
    ? `Ngày ${state.day} đã hoàn thành. Xem sổ cuối ngày rồi chuẩn bị cho ngày mới.`
    : `Kiểm tra ${stockedIngredients} loại nguyên liệu đang có trong kho, rồi mở cửa đón khách.`;

  return `<section class="prep-home">
    <div class="prep-welcome"><span class="welcome-teacup" aria-hidden="true">🧋</span><div><span class="welcome-kicker">Ngày ${state.day} tại tiệm</span><h2>${headline}</h2><p>${description}</p></div></div>
    <div class="prep-start-row"><div><strong>${escapeHtml(state.shopName)}</strong><small>Quán nhỏ, một ngày mới và những vị khách quen.</small></div>${openAction}</div>
    <div class="prep-shortcuts"><button data-navigate="inventory"><img src="./img/icons/inventory.png" alt=""><span>Kiểm tra kho</span></button><button data-navigate="employees"><img src="./img/icons/employees.png" alt=""><span>Đội ngũ</span></button><button data-navigate="reviews"><img src="./img/icons/reviews.png" alt=""><span>Lời khách</span></button></div>
  </section>`;
}
