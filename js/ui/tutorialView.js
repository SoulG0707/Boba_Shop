import { escapeHtml } from "./helpers.js";
import { renderFoodAsset } from "./foodAssets.js";

const PAGES = [
  {
    title: "Chào mừng đến tiệm bánh tráng",
    copy: "Bạn sẽ tự quản lý quầy bánh tráng của mình — từ nhập hàng buổi sáng đến giao từng phần ăn vặt.",
    art: `<div class="tutorial-logo-art">${renderFoodAsset("shop-logo", "tutorial-logo", "Tô bánh tráng trộn")}</div><span class="tutorial-art-caption">Quầy nhỏ · Món trộn vui · Khách quen</span>`,
  },
  {
    title: "Nhập hàng buổi sáng",
    copy: "Nhập đủ nguyên liệu cho ít nhất một công thức. Hàng tươi có hạn sử dụng, nên chỉ mua lượng cần dùng.",
    art: `<div class="tutorial-demo-list"><div>${renderFoodAsset("rice_paper", "tutorial-food-icon")}<strong>Bánh tráng</strong><b>+15</b></div><div>${renderFoodAsset("shrimp_salt", "tutorial-food-icon")}<strong>Muối tôm</strong><b>+10</b></div><div>${renderFoodAsset("green_mango", "tutorial-food-icon")}<strong>Xoài xanh</strong><b>+10</b></div></div>`,
  },
  {
    title: "Nhận đơn của khách",
    copy: "Đọc món, size và ghi chú trước khi bắt đầu. Mỗi khách có sở thích riêng.",
    art: `<div class="tutorial-order-demo"><span class="tutorial-customer">${renderFoodAsset("product_beef", "tutorial-food-icon")}</span><div><small>KHÁCH GỌI MÓN · SIZE BÉ</small><strong>Bánh tráng khô bò</strong><span>+ Trứng cút · Không rau răm</span></div></div>`,
  },
  {
    title: "Trộn món theo yêu cầu",
    copy: "Cho bánh tráng, thêm gia vị và topping theo đơn rồi bấm Trộn.",
    art: `<div class="tutorial-flow"><span>${renderFoodAsset("rice_paper", "tutorial-food-icon")}Bánh tráng</span><b>→</b><span>${renderFoodAsset("shrimp_salt", "tutorial-food-icon")}Gia vị</span><b>→</b><span>${renderFoodAsset("beef_jerky", "tutorial-food-icon")}Topping</span><b>→</b>${renderFoodAsset("mixing_bowl", "tutorial-bowl")}</div>`,
  },
  {
    title: "Đóng hộp và giao khách",
    copy: "Khi trộn xong, đóng hộp phần ăn và giao cho khách để nhận tiền cùng đánh giá.",
    art: `<div class="tutorial-pack-flow">${renderFoodAsset("mixing_bowl", "tutorial-bowl")}<b>↓</b>${renderFoodAsset("food_box", "tutorial-box")}</div>`,
  },
  {
    title: "Phục vụ tốt để được đánh giá cao",
    copy: "Làm đúng món và giao nhanh để khách vui. Thiếu topping hoặc để khách chờ lâu sẽ ảnh hưởng điểm tiệm.",
    art: `<div class="tutorial-review"><span>★★★★★</span><strong>Ngon quá, lần sau mình ghé nữa!</strong><small>Đúng món · Giao nhanh</small></div>`,
  },
  {
    title: "Dùng lợi nhuận để nâng cấp quán",
    copy: "Đầu tư vào thau trộn, kệ topping, xe đẩy, biển hiệu và nhân viên để phục vụ tốt hơn.",
    art: `<div class="tutorial-upgrades"><span>🥣<small>Thau trộn</small></span><span>🫙<small>Kệ topping</small></span><span>🛒<small>Xe đẩy</small></span><span>👩‍🍳<small>Nhân viên</small></span></div>`,
  },
];

export function renderTutorialView(pageIndex = 0) {
  const safeIndex = Math.max(0, Math.min(PAGES.length - 1, pageIndex));
  const page = PAGES[safeIndex];
  const dots = PAGES.map((_, index) => `<i class="tutorial-dot ${index === safeIndex ? "is-active" : ""}" aria-hidden="true"></i>`).join("");
  return `<div class="tutorial-scene">
    <div class="tutorial-topbar"><div class="tutorial-brand">${renderFoodAsset("shop-logo", "tutorial-brand-logo")}<strong>Hướng dẫn tiệm bánh tráng</strong></div><button class="tutorial-skip" data-action="tutorial-skip">Bỏ qua <span aria-hidden="true">›</span></button></div>
    <div class="tutorial-awning" aria-hidden="true"></div>
    <main class="tutorial-main"><article class="tutorial-card">
      <span class="tutorial-step">HƯỚNG DẪN ${String(safeIndex + 1).padStart(2, "0")} / ${PAGES.length}</span>
      <h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.copy)}</p>
      <div class="tutorial-illustration">${page.art}</div>
      <div class="tutorial-progress" aria-label="Bước ${safeIndex + 1} trên ${PAGES.length}">${dots}</div>
      <button class="button button-primary tutorial-next" data-action="tutorial-next" data-page="${safeIndex}">${safeIndex === PAGES.length - 1 ? "Bắt đầu nhập hàng" : "Tiếp →"}</button>
    </article></main>
  </div>`;
}
