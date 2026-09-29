export function renderMoreView(state) {
  const onlineText = state.employees.some((employee) => employee.role === "online")
    ? "Nhân viên giao đơn đang tự xử lý đơn online."
    : "Đơn giao hiện trong khu vực khách khi tiệm mở cửa.";
  return `<section class="more-view" aria-label="Thêm tính năng">
    <div class="page-heading"><div><h2>Thêm</h2><p>Các công cụ quản lý và giải trí của tiệm.</p></div></div>
    <div class="more-links">
      <button class="more-link" data-navigate="employees"><span aria-hidden="true">🧑‍🍳</span><span><strong>Nhân viên</strong><small>Tuyển người phụ quầy, trộn món và giao đơn.</small></span><b aria-hidden="true">›</b></button>
      <button class="more-link" data-navigate="baucua"><span aria-hidden="true">🎲</span><span><strong>Bầu Cua</strong><small>Mini-game dùng tiền trong tiệm.</small></span><b aria-hidden="true">›</b></button>
      <button class="more-link" data-navigate="xidach"><span aria-hidden="true">🃏</span><span><strong>Xì Dách</strong><small>Một ván bài ngắn giữa các ngày bán.</small></span><b aria-hidden="true">›</b></button>
      <button class="more-link" data-action="settings"><span aria-hidden="true">⚙️</span><span><strong>Cài đặt & sao lưu</strong><small>Âm thanh, tên tiệm và dữ liệu lưu.</small></span><b aria-hidden="true">›</b></button>
    </div>
    <div class="more-note"><strong>Đơn online</strong><small>${onlineText}</small></div>
    <div class="more-note"><strong>Thuế cuối ngày</strong><small>Thuế được tính trên lợi nhuận dương và ghi trong Tổng kết ngày.</small></div>
  </section>`;
}
