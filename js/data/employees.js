export const EMPLOYEE_ROLES = [
  { id: "counter", name: "Phụ quầy", description: "Giúp khách xếp hàng nhanh hơn.", baseSalary: 18_000, speed: 0.12, hireCost: 35_000, effect: { patience: 0.05 } },
  { id: "barista", name: "Pha chế", description: "Tăng tốc độ hoàn tất đồ uống.", baseSalary: 24_000, speed: 0.18, hireCost: 45_000, effect: { serviceSpeed: 0.1 } },
  { id: "online", name: "Xử lý đơn online", description: "Tự nhận và giao một số đơn trực tuyến.", baseSalary: 22_000, speed: 0.15, hireCost: 42_000, effect: { onlineOrders: 0.12 } },
];

export const EMPLOYEE_ROLE_BY_ID = Object.freeze(Object.fromEntries(EMPLOYEE_ROLES.map((role) => [role.id, role])));
