export const EMPLOYEE_ROLES = [
  { id: "counter", name: "Nhân viên sơ chế", description: "Chuẩn bị nguyên liệu và đón khách nhanh hơn.", baseSalary: 18_000, speed: 0.12, hireCost: 35_000, effect: { patience: 0.05 }, emoji: "🔪" },
  { id: "mixer", name: "Nhân viên trộn", description: "Hỗ trợ làm món nhanh hơn.", baseSalary: 24_000, speed: 0.18, hireCost: 45_000, effect: { serviceSpeed: 0.1 }, emoji: "🥣" },
  { id: "online", name: "Nhân viên giao đơn online", description: "Tự nhận và hoàn tất một số đơn giao tận nơi.", baseSalary: 22_000, speed: 0.15, hireCost: 42_000, effect: { onlineOrders: 0.12 }, emoji: "🛵" },
];

export const EMPLOYEE_ROLE_BY_ID = Object.freeze(Object.fromEntries(EMPLOYEE_ROLES.map((role) => [role.id, role])));
