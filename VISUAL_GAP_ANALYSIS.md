# Phân tích khoảng cách giao diện: Tiệm Trà Mơ Ước

## Phạm vi và nguồn tham chiếu

- HAR người dùng cung cấp: `tiemtramouoc.tensorship.tech.har` ở thư mục gốc dự án, 8.1 MB, 109 request trong một lần ghi nhận.
- Có 103 request tới tên miền game; các request ngoài tên miền gồm Google Fonts, các file font từ `fonts.gstatic.com` và Cloudflare Insights. HAR ghi nhận một HTML, bốn stylesheet, bốn script, ảnh/sprite, font và một request telemetry trả `204`.
- HTML tĩnh đặt `header`, `awning`, `main#view`, toast, modal, splash và các vùng minigame/chi nhánh riêng. Các màn nội dung được dựng trong `#view`.
- CSS chính xác nhận khung `.app` rộng tối đa `560px`, căn giữa; header sticky có ba cột; mái hiên rộng `30px` mỗi sọc, cao `26px`; khu chuẩn bị có bảng phấn, tab cuộn ngang và panel màu kem. Màn bán hàng khóa cuộn và dùng artboard `768×1376`.
- CSS tham chiếu dùng font Baloo 2 và bộ màu được liệt kê bên dưới. Những giá trị này khớp với yêu cầu đính kèm.
- Không đọc hay sao chép nội dung các script game trong HAR. Phân tích hành vi giao diện dựa trên HTML, CSS, tên/vai trò asset, cùng yêu cầu người dùng; không gọi endpoint lưu trữ hay telemetry.

## Asset quan sát được trong HAR

| Asset tham chiếu | Quan sát từ HAR/CSS | Vai trò khi dựng lại |
| --- | --- | --- |
| `img/splash2.jpg` (`768×1376`) | Tranh tiệm trà bên ngoài, mái sọc, cây, mèo và quầy | Nền splash, tên game và nút vào tiệm phủ trên tranh |
| `img/kho.jpg` (`768×1376`) | Kệ nguyên liệu và quầy gỗ, vùng giữa để nội dung | Nền màn chuẩn bị; panel kem đặt phía trên |
| `img/bg2.jpg` (`768×1376`) | Minh họa khu pha chế với bình trà, topping và quầy | Nền sân bán hàng |
| `img/bg.jpg` (`768×1376`) | Bản sprite nền mà CSS tham chiếu dùng để đặt các lớp tương tác | Tham khảo cách ghép cốc/control với cảnh; không cần dùng làm nền thứ hai |
| `img/faces.webp`, `img/ship.webp` | Sprite nhân vật thường và khách giao hàng, có biểu cảm | Avatar khách và trạng thái phản ứng |
| `img/cup.png`, `img/lid.png` | Cốc trong suốt và nắp riêng | Lớp hình cốc trong builder, cho phép đổi màu trà/đá/trân châu |
| `img/ic_pause.png`, `img/ic_set.png`, `img/ic_*.png` | Icon thao tác, tab, nguyên liệu, nâng cấp và thống kê | Icon cục bộ cho header/tab; không hotlink tới website |
| `img/lanL.png`, `img/lanR.png`, `img/stk_*.png`, `img/stk_cloud.png` | Đèn lồng và sticker trang trí | Điểm nhấn splash nhỏ, chỉ dùng nếu không làm rối nội dung |
| `css/style.css`, `baucua.css`, `xidach.css` | Bố cục game chính và hai minigame | Tham khảo hình học/màu; viết CSS dự án mới, không chép nguyên stylesheet |
| `Baloo 2` WOFF2 | Font được CSS Google Fonts khai báo, bốn biến thể/subset được tải trong HAR | Đóng gói local để chạy không cần hotlink font |

Các asset không liên quan tới giao diện chơi (Cloudflare beacon/telemetry, QR, endpoint riêng) sẽ không được tích hợp.

## Bảng đối chiếu

| Đặc trưng tham chiếu | Bản hiện tại | Thay đổi cần làm |
| --- | --- | --- |
| App mobile-first, rộng tối đa 560px và căn giữa cả trên desktop | `.app-body` rộng tối đa 1480px, desktop có hai cột | Đưa toàn bộ game vào vỏ 560px; nền ngoài vỏ màu kem; không sidebar |
| Header sticky 3 vùng: thao tác/ngày, tên và tiền ở giữa, sao/điểm bên phải | Header chia brand trái và nhóm stats/actions phải, thêm nút minigame | Dựng header compact theo 3 vùng, tiền nổi bật, sao vàng, trạng thái ngày; nút nhỏ có icon local |
| Awning sọc hồng-trắng và mép scallop ngay dưới header | Không có | Thêm awning CSS, co thấp ở selling mode |
| Splash là tranh tiệm, tiêu đề lớn và nút bắt đầu/tiếp tục | App vào thẳng dashboard | Thêm splash phủ artwork, giữ game state và chỉ thay đổi trạng thái presentation |
| Chuẩn bị có nền kệ kho, menu phấn viền gỗ, tab ngang và panel kem | Dashboard riêng; menu chỉ là data, các page tách rời | Tạo khung prep dùng chung: bảng menu, tabs cuộn ngang và một panel nội dung; map route hiện có vào panel |
| Kho là danh sách hàng compact, icon/tên/hạn và nút mua | Grid ba cột card lớn | Chuyển sang hàng một dòng, đường phân cách mảnh, hai nút mua nhỏ |
| Nút hồng nổi, radius lớn và có bóng kiểu nút game | Nút phẳng với shadow rất nhẹ/không có | Tạo trạng thái hover/active/disabled rõ, nhấn xuống có transform và bóng giảm |
| Selling là cảnh pha chế chiếm viewport, khách ở trên, quầy và cốc ở giữa | `gameplayView` vẫn là heading, hai card lớn và queue card | Chuyển riêng route gameplay sang scene minh họa, bỏ tab/menu trong khi đang bán; giữ queue và hành động order hiện tại |
| Cup có straw/lid/liquid/ice/pearls, thay đổi theo món/option | Không có visual cốc tương tác; order chỉ hiển thị tên/emoji | Thêm cup component presentation-only, lấy recipe/options của order đang chọn; không đổi consume/economy |
| Khách là avatar, bubble món và thanh kiên nhẫn | Emoji avatar trong card với nhãn/status dạng văn bản | Dùng sprite nhân vật, bubble món, patience bar và feedback đến/rời |
| End day là bảng tổng kết gọn trong modal | Modal dùng summary grid hai cột, nằm trên UI kiểu web | Giữ số liệu logic, chuyển sang phiếu tổng kết game dọc, CTA ngày kế tiếp rõ |
| Modal cream, viền mảnh, bo vừa và rộng hẹp | Max 560px, padding lớn, shadow nặng | Giới hạn khoảng 420–480px, giảm padding và bóng, giữ thao tác/backup/settings |
| Baloo 2, palette nâu/kem/hồng/mint | Font hệ thống và palette hồng đào tự chọn; có theme mint đổi màu | Self-host font trong HAR; dùng tokens khớp màu tham chiếu và bỏ theme làm đổi nhận diện |
| Mì Cay, Bầu Cua, Xì Dách vẫn truy cập được như hoạt động phụ | Các view cùng cấp route và header shortcuts | Giữ nguyên systems/routes; đặt lối tắt nhỏ trong prep/tab cuộn, không chiếm scene bán hàng |

## Tokens chuẩn bị áp dụng

| Vai trò | Giá trị |
| --- | --- |
| Nền ngoài app | `#fdf3e4` |
| Chữ chính | `#3a2317` |
| Chữ phụ | `#7a5a48` |
| Panel | `#fffaf2` |
| Viền | `#ead7bd` |
| Nâu quầy / mặt quầy | `#8a5a3b` / `#a8714c` |
| Hồng / hồng đậm | `#ef6f8e` / `#c24c69` |
| Mint / cảnh báo / vàng | `#4fa883` / `#e2574c` / `#f0b43c` |
| Bảng phấn / chữ phấn | `#2f4a3a` / `#f4efe2` |

## Kiến trúc UI đích

- Giữ nguyên `state`, `systems`, persistence, kho, economy, orders, customers, upgrades, employees, events và minigame.
- Refactor phần trình bày theo các module nhỏ: header/awning, splash, prep shell/tabs, các pane hiện có, selling scene/cup, modal/summary.
- Chỉ thêm state giao diện cục bộ cho màn splash, tab/view đang mở, khách đang chọn và visual recipe của cốc. State này không thay đổi chi phí, phục vụ, review hay thời gian order.
- Không đưa script HAR, tracker, QR hoặc request backend riêng vào dự án. Asset cần dùng được lưu cục bộ để app không tải trực tiếp từ website tham chiếu.

## Xác minh sau triển khai

- Đã mở bản chạy local bằng Chrome headless và xem screenshot ở `390×844` (mobile) cùng `1366×768` (desktop). Màn bán hàng, chuẩn bị, splash và tổng kết ngày đã được rà lại bằng hình ảnh.
- Ở desktop, app giữ khung `560px` và căn giữa. Ở mobile, các màn chuẩn bị và bán hàng không tràn ngang; tab nội dung cuộn ngang trong thanh tab, header vẫn ở đầu trang khi cuộn.
- Smoke test luồng ngày: mở cửa, tạo khách, pha xong, giao đơn; tiền tăng, một khách được phục vụ và một đánh giá được thêm. Các thao tác mua kho, tuyển nhân viên, đặt/lắc Bầu Cua và Xì Dách cũng cập nhật state.
- Mở và đóng modal tổng kết ngày, đi tiếp sang ngày mới; cache PWA bản `v5` cài được và tải lại màn mở đầu ở chế độ offline.
- `node --check` qua 46 module JavaScript, `git diff --check` sạch; toàn bộ 82 đường dẫn khai báo trong precache tồn tại. Không có tham chiếu asset HTTP bên ngoài trong mã app.

Trang tham chiếu trực tiếp không mở được qua web tool; bố cục và asset tham chiếu được phân tích từ HAR. Các kiểm tra runtime ở trên chạy trên bản local, không gửi request backend hoặc telemetry của trang tham chiếu. Đây là smoke test cho giao diện và các luồng đã chạm tới, không phải kiểm thử đầy đủ mọi nhánh cân bằng game.

