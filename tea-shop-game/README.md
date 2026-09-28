# Trà Nhỏ — game quản lý tiệm trà

Project vanilla JavaScript ES Modules, không cần framework, build tool, backend hay API bên ngoài. Dữ liệu game lưu trên trình duyệt bằng `localStorage`.

## Chạy game

Mở terminal tại thư mục `tea-shop-game/` rồi chạy:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080`. Có thể dùng VS Code Live Server. ES Modules, Web Crypto, service worker và backup cần chạy trên `localhost` hoặc HTTPS; không mở trực tiếp bằng `file://`.

## Kiến trúc

```text
js/config.js                 Cấu hình, thời lượng ngày, hằng số và formatter
js/data/                     Catalog nguyên liệu, món, nâng cấp, vai trò, sự kiện
js/state/                    State ban đầu, store, localStorage và schema validation
js/systems/                  Kho, giá vốn, khách, đơn, đánh giá, ngày, modifiers, v.v.
js/ui/                       Router, header, modal, toast và các view HTML
js/backup/                   Mã hóa, checksum, xác thực và khôi phục backup
```

Luồng dữ liệu chính là `data → state/store → systems → UI`. Các system nhận state làm tham số; chúng không trực tiếp sửa DOM. UI gửi thao tác tới system rồi lưu/render lại state. `config.js` là nơi chỉnh ngày gameplay: `DAY_DURATION_SECONDS: 240`.

## Gameplay

1. State được nạp từ localStorage; lần đầu bắt đầu với 400.000đ và bảy loại nguyên liệu.
2. Ở phần Chuẩn bị, kiểm tra kho, giá và nâng cấp, sau đó mở cửa.
3. Khách xuất hiện ngẫu nhiên, chọn món, size và topping; đơn counter cần pha chế rồi phục vụ. Đơn online có thể xử lý thủ công hoặc giao cho nhân viên online.
4. Phục vụ trừ nguyên liệu theo batch hết hạn trước, cộng doanh thu và tạo đánh giá. Khách bỏ đi vì chờ lâu cũng có thể để lại đánh giá thấp.
5. Sau 240 giây, game loại bỏ nguyên liệu hết hạn, trả lương/chi phí cố định, tính thuế/lợi nhuận và mở modal tổng kết.

Pause/resume dựa trên timestamp. Vòng lặp sử dụng chênh lệch thời gian thật giữa các tick, nên thời gian không bị chạy sai khi tab lag.

## Mở rộng nội dung

### Thêm nguyên liệu

Thêm record trong `js/data/ingredients.js` gồm `id`, `name`, `unit`, `purchasePrice`, `expirationDays`, `startingQuantity`, `emoji`. Công thức cần dùng `id` mới trong `js/data/products.js`; `initialState.js` sẽ tự tạo stock và batch ban đầu từ catalog.

### Thêm món

Thêm record vào `baseProducts` trong `js/data/products.js`: `id`, `name`, `category`, `emoji`, `basePrice`, `baseRecipe`, `description`, `unlockedByDefault`. Recipe là object `{ ingredientId: quantity }`. Nếu thêm một ID sản phẩm mới, các sự kiện nhu cầu riêng có thể dùng key `<productId>Demand` trong `modifiers`.

### Thêm nâng cấp

Thêm record trong `js/data/upgrades.js` với `maxLevel`, `baseCost`, `costMultiplier` và các `effects`. Effect hiện hỗ trợ `serviceSpeed`, `customerSpawn`, `patience`, `onlineOrders`, `rating`, `capacity`; hệ thống tổng hợp upgrade, employee và event ở `systems/modifiers.js`.

### Thêm sự kiện

Thêm record trong `js/data/events.js`. `duration` tính bằng giây; multipliers như `customerSpawn`, `onlineOrders`, `patience`, `demand`, `priceSensitivity` được kết hợp qua modifier system. Có thể thêm key nhu cầu riêng món dạng `<productId>Demand`; `rating` là điểm cộng đánh giá.

### Thêm nhân viên

Vai trò nằm trong `js/data/employees.js` và được tuyển/điều khiển bởi `js/systems/employees.js`. Nhân viên online tự nhận và hoàn tất đơn; phụ quầy tăng kiên nhẫn, pha chế tăng service speed.

## Kho và kinh tế

Mỗi stock entry lưu tổng `quantity`, giá nhập, hạn dùng và các `batches` (`quantity`, `boughtDay`, `expireDay`, `unitPrice`). Dùng nguyên liệu sắp batch theo hạn gần nhất. Giá vốn món được tính theo recipe; `ingredientCost` của báo cáo là giá trị nguyên liệu thực tế đã tiêu thụ. Tiền mua hàng được trừ ngay khỏi tiền mặt và theo dõi riêng ở `dailyStats.stockPurchases`; tồn kho còn lại là tài sản trong game, tránh tính cùng một batch hai lần vào lợi nhuận.

Giá bán thay đổi khả năng mua bằng demand modifier. Size lớn tăng recipe và giá; topping cộng nguyên liệu và phụ phí. Báo cáo ngày gồm doanh thu, giá vốn đã dùng, lương, mặt bằng, tiện ích, marketing, hàng hết hạn, thuế và lợi nhuận.

## Lưu trữ và backup

`saveGame()`, `loadGame()` và `resetGame()` nằm trong `js/state/persistence.js`. Tiến trình được schema-check và lưu trong localStorage dưới key `tea-shop-game-save-v1`.

Backup có định dạng:

```text
TEASHOP1.<base64(mode + JSON hoặc gzip(JSON))>.<sha256-hex>
```

`mode` là `G` khi browser hỗ trợ gzip hoặc `J` khi dùng JSON nguyên bản. `restoreBackup()` kiểm tra prefix, checksum SHA-256, JSON, schema và version trước khi đưa dữ liệu vào game. Dữ liệu không được thực thi bằng `eval`.

## Âm thanh và PWA

Âm nhạc/hiệu ứng được tổng hợp bằng Web Audio API, không tải tự động asset âm thanh. AudioContext chỉ được mở sau tương tác đầu tiên của người chơi. `manifest.webmanifest` khai báo cài đặt PWA; `sw.js` chỉ cache danh sách tệp tĩnh cùng origin của project, không bắt request API.

## Debug

`DEBUG` trong `js/config.js` đang bật. Console trình duyệt có `window.gameDebug` với `getState()`, `addMoney(amount)`, `nextDay()`, `spawnCustomer()` và `triggerEvent(id)`. Đặt `DEBUG = false` để tắt công cụ này.

## Phân tích HAR

HAR tham chiếu ghi nhận trang PWA tiếng Việt, tài nguyên giao diện cho kho/giá/nâng cấp/khách/đơn và âm thanh theo mùa. Frontend có một script inline bị làm rối; project này không giải mã hay sao chép script đó. HAR cũng có request lưu tới backend riêng trả 500; bản tái triển khai không gọi hoặc phụ thuộc endpoint đó.
