export const UPGRADES = [
  { id: "sealer", name: "Thau trộn inox", description: "Thau rộng, thao tác trộn nhanh hơn.", maxLevel: 3, baseCost: 80_000, costMultiplier: 1.65, effects: { serviceSpeed: 0.12 } },
  { id: "ledSign", name: "Biển LED", description: "Giúp thêm khách biết đến quầy.", maxLevel: 3, baseCost: 65_000, costMultiplier: 1.7, effects: { customerSpawn: 0.12, rating: 0.05 } },
  { id: "chairs", name: "Bàn ghế", description: "Khách thoải mái và kiên nhẫn hơn khi chờ.", maxLevel: 3, baseCost: 55_000, costMultiplier: 1.55, effects: { patience: 0.15, capacity: 1 } },
  { id: "advertising", name: "Quảng cáo online", description: "Tăng lượng khách ghé và đơn giao tận nơi.", maxLevel: 3, baseCost: 90_000, costMultiplier: 1.8, effects: { customerSpawn: 0.18, onlineOrders: 0.15 } },
  { id: "onlineChannel", name: "Điện thoại nhận đơn", description: "Mở kênh đơn online từ ngày 5.", minDay: 5, maxLevel: 1, baseCost: 75_000, costMultiplier: 1, effects: {} },
  { id: "counter", name: "Kệ topping", description: "Sắp xếp nguyên liệu gọn, phục vụ thêm khách cùng lúc.", maxLevel: 2, baseCost: 120_000, costMultiplier: 2, effects: { capacity: 2, serviceSpeed: 0.08 } },
  { id: "airConditioner", name: "Tủ nguyên liệu", description: "Giữ rau, xoài và trứng tươi lâu hơn.", maxLevel: 2, baseCost: 100_000, costMultiplier: 1.9, effects: { shelfLife: 0.2 } },
];

export const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade])));
