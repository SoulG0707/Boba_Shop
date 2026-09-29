export const EVENTS = [
  { id: "HOT_WEATHER", name: "Trời nóng", description: "Khách thích món chua cay, mát vị tắc.", duration: 55, modifiers: { customerSpawn: 1.18, demand: 1.08 } },
  { id: "RAIN", name: "Mưa bất chợt", description: "Khách ghé quầy thưa hơn, đơn giao tận nơi tăng.", duration: 60, modifiers: { customerSpawn: 0.82, onlineOrders: 1.35, patience: 1.08 } },
  { id: "WEEKEND", name: "Cuối tuần", description: "Khu phố đông vui, khách ăn vặt ghé nhiều hơn.", duration: 80, modifiers: { customerSpawn: 1.35, demand: 1.05 } },
  { id: "STUDENT_RUSH", name: "Tan học", description: "Nhiều bạn học sinh ghé quầy sau giờ học.", duration: 50, modifiers: { customerSpawn: 1.4, priceSensitivity: 1.2, demand: 1.15 } },
  { id: "REVIEWER", name: "Reviewer ghé quầy", description: "Một vị khách kỹ tính đang để ý từng món.", duration: 35, modifiers: { rating: 0.2, patience: 0.9 } },
  { id: "HOT_PRODUCT", name: "Bánh tráng đang hot", description: "Món đặc biệt được nhiều người gọi hôm nay.", duration: 65, modifiers: { specialDemand: 1.35 } },
  { id: "SALE", name: "Ngày khuyến mãi", description: "Khách nhạy giá gọi món nhiều hơn.", duration: 55, modifiers: { customerSpawn: 1.2, priceSensitivity: 1.25, demand: 1.1 } },
  { id: "HOLIDAY", name: "Ngày lễ", description: "Phố xá đông vui, đơn hàng tăng mạnh.", duration: 75, modifiers: { customerSpawn: 1.45, onlineOrders: 1.2, demand: 1.08 } },
  { id: "TIKTOK_VIRAL", name: "TikTok viral", description: "Video về quầy đang lan truyền, khách kéo đến đông.", duration: 55, modifiers: { customerSpawn: 1.7, onlineOrders: 1.35, demand: 1.12 } },
];

export const EVENT_BY_ID = Object.freeze(Object.fromEntries(EVENTS.map((event) => [event.id, event])));
