export const UPGRADES = [
  { id: "sealer", name: "Máy dán nắp", description: "Đóng ly nhanh, khách chờ ít hơn.", maxLevel: 3, baseCost: 80_000, costMultiplier: 1.65, effects: { serviceSpeed: 0.12 } },
  { id: "ledSign", name: "Biển LED", description: "Giúp thêm khách ghé tiệm.", maxLevel: 3, baseCost: 65_000, costMultiplier: 1.7, effects: { customerSpawn: 0.12, rating: 0.05 } },
  { id: "chairs", name: "Bàn ghế xinh", description: "Khách kiên nhẫn hơn khi chờ.", maxLevel: 3, baseCost: 55_000, costMultiplier: 1.55, effects: { patience: 0.15, capacity: 1 } },
  { id: "advertising", name: "Quảng cáo khu phố", description: "Tăng lượng khách và đơn trực tuyến.", maxLevel: 3, baseCost: 90_000, costMultiplier: 1.8, effects: { customerSpawn: 0.18, onlineOrders: 0.15 } },
  { id: "counter", name: "Mở rộng quầy", description: "Phục vụ thêm khách cùng lúc.", maxLevel: 2, baseCost: 120_000, costMultiplier: 2, effects: { capacity: 2, serviceSpeed: 0.08 } },
  { id: "airConditioner", name: "Máy lạnh", description: "Không gian dễ chịu, điểm đánh giá tốt hơn.", maxLevel: 2, baseCost: 100_000, costMultiplier: 1.9, effects: { rating: 0.15, patience: 0.1 } },
];

export const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade])));
