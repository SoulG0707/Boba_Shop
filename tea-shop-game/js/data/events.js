export const EVENTS = [
  { id: "HOT_WEATHER", name: "Nắng nóng", description: "Khách chuộng đồ uống mát lạnh.", duration: 55, modifiers: { customerSpawn: 1.18, demand: 1.08, matchaLatteDemand: 1.08 } },
  { id: "RAIN", name: "Mưa nhẹ", description: "Khách đến thưa hơn, đơn giao tận nơi tăng.", duration: 60, modifiers: { customerSpawn: 0.82, onlineOrders: 1.35, patience: 1.08 } },
  { id: "WEEKEND", name: "Cuối tuần", description: "Khu phố nhộn nhịp hơn.", duration: 80, modifiers: { customerSpawn: 1.35, demand: 1.05 } },
  { id: "STUDENT_RUSH", name: "Giờ tan học", description: "Nhiều bạn học sinh ghé tiệm.", duration: 50, modifiers: { customerSpawn: 1.4, priceSensitivity: 1.2, milkTeaDemand: 1.15 } },
  { id: "REVIEWER", name: "Food blogger ghé thăm", description: "Một vị khách kỹ tính đang quan sát tiệm.", duration: 35, modifiers: { rating: 0.2, patience: 0.9 } },
  { id: "HOT_PRODUCT", name: "Matcha đang thịnh hành", description: "Nhu cầu matcha tăng rõ rệt.", duration: 65, modifiers: { matchaLatteDemand: 1.5 } },
  { id: "SALE", name: "Ngày ưu đãi", description: "Khách nhạy giá mua nhiều hơn.", duration: 55, modifiers: { customerSpawn: 1.2, priceSensitivity: 1.25, demand: 1.1 } },
  { id: "HOLIDAY", name: "Lễ hội khu phố", description: "Cả khu phố cùng đi chơi.", duration: 75, modifiers: { customerSpawn: 1.45, onlineOrders: 1.2, demand: 1.08 } },
];

export const EVENT_BY_ID = Object.freeze(Object.fromEntries(EVENTS.map((event) => [event.id, event])));
