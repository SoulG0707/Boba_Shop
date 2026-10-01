# Tiệm Bánh Tráng Trộn

Game quản lý quầy ăn vặt Việt Nam. Người chơi nhập nguyên liệu, chỉnh giá, mở bán, làm theo đơn khách, trộn bánh tráng, đóng hộp và phục vụ. Cuối ngày, tiền lương, tiền thuê, tiện ích, hao hụt và thuế được tổng kết trước khi sang ngày mới.

## Chạy game

Mở terminal tại thư mục có `index.html` rồi chạy một máy chủ tĩnh, ví dụ:

```powershell
python -m http.server 8080
```

Truy cập `http://localhost:8080`. ES modules, Web Crypto, service worker và backup cần `localhost` hoặc HTTPS; không mở bằng `file://`.

## Cấu trúc

```text
css/                 Theme và bố cục responsive
img/                 Nhân vật, biểu tượng và hình nhận diện
js/config.js         Cấu hình ngày, routes, lưu trữ và format tiền
js/data/             Món, nguyên liệu, nâng cấp, nhân viên, sự kiện
js/state/            State khởi tạo, store và persistence
js/systems/          Kho, đơn, khách, kinh tế, ngày, nhân viên, đánh giá
js/ui/               Splash, màn hình chuẩn bị và quầy bán
js/backup/           Tạo/khôi phục backup có SHA-256
sw.js                PWA cache
```

Inventory, economy, reviews, persistence, backup và PWA được giữ lại. `gameplayView.js` dựng quầy với hũ, khay inox, thau trộn và trạm đóng hộp; `orders.js` theo dõi size, nguyên liệu đã cho vào thau, trạng thái trộn/đóng hộp và độ chính xác của đơn.

## Nội dung game

- Menu: bánh tráng trộn truyền thống, khô bò, khô gà và đặc biệt.
- Size M và L nằm trong `PRODUCT_OPTIONS`; size L dùng nhiều nguyên liệu hơn và cộng giá theo cấu hình.
- Nguyên liệu, giá nhập, hạn sử dụng và tồn kho ban đầu được khai báo trong `js/data/ingredients.js`.
- Công thức định lượng nằm trong `js/data/products.js`. Bao bì được tính vào giá vốn và tiêu thụ ở bước đóng hộp.
- Thứ tự làm món: chọn khách → chọn size → thêm/bỏ nguyên liệu → trộn → đóng hộp → giao khách.
- Đơn được chấm theo nguyên liệu đúng, thiếu/thừa, size và thời gian chờ. Review dùng chung hệ thống hiện có.
- Các mini game Bầu Cua và Xì Dách vẫn hoạt động như nội dung phụ.

## Độ khó theo ngày

`js/data/difficulty.js` chứa `DAY_DIFFICULTY` và `getDifficultyForDay(day)`. Ngày 1 có 5 khách, khoảng cách 28–35 giây, tối đa 1 khách cùng lúc, chỉ món truyền thống cỡ Bé và ba nguyên liệu; khách hướng dẫn đầu tiên đến sau 3–5 giây và không giảm kiên nhẫn. Ngày 3 mở khô bò và cỡ Lớn, ngày 4 mở khô gà, ngày 6 mở món đặc biệt. Từ ngày 5 có thể mua Điện thoại nhận đơn để mở online với khoảng cách 60–90 giây. Ngày 7 trở đi tăng dần theo công thức fallback. Công thức yêu cầu được lưu trong đơn khi khách xuất hiện, nên đơn cũ không thay đổi khi tiến trình mở khóa.

Kiểm tra nhanh: `node visual-audit/day-progression-check.mjs`. Ảnh Day 1/3/5 và clip 70 giây ở `visual-audit/day-progression/`.

## Tiến trình và backup

Save schema hiện tại là phiên bản 3. Khi gặp save cũ, game giữ lại tiền, ngày, một số nâng cấp, nhân viên tương thích và cài đặt âm thanh; kho, đơn hàng và lịch sử đánh giá bắt đầu theo catalog mới. Game hiển thị thông báo cập nhật khi mở lần đầu.

Backup có dạng `BTRON1.<payload>.<sha256>`, được kiểm tra schema trước khi khôi phục. Tiến trình mới lưu trên thiết bị theo key riêng của game.
