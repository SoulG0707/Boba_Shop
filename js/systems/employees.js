import { EMPLOYEE_ROLE_BY_ID } from "../data/employees.js";
import { completeOnlineOrder } from "./onlineOrders.js";

export function hireEmployee(state, roleId) {
  if (state.day < 3) return { success: false, reason: "Nhân viên mở từ ngày 3." };
  const role = EMPLOYEE_ROLE_BY_ID[roleId];
  if (!role) return { success: false, reason: "Không tìm thấy vị trí nhân viên." };
  if (state.employees.some((employee) => employee.role === roleId)) return { success: false, reason: "Tiệm đã có nhân viên ở vị trí này." };
  if (state.money < role.hireCost) return { success: false, reason: "Tiệm chưa đủ tiền để tuyển." };
  state.money -= role.hireCost;
  const employee = {
    id: `employee-${state.gameplay.nextEntityId++}`,
    role: roleId,
    name: role.name,
    level: 1,
    salary: role.baseSalary,
    speed: role.speed,
    hiredDay: state.day,
  };
  state.employees.push(employee);
  return { success: true, employee, cost: role.hireCost };
}

export function fireEmployee(state, employeeId) {
  const before = state.employees.length;
  state.employees = state.employees.filter((employee) => employee.id !== employeeId);
  return state.employees.length !== before;
}

export function getEmployeeEffects(state) {
  const effects = { serviceSpeed: 0, customerSpawn: 0, patience: 0, onlineOrders: 0, rating: 0, capacity: 0 };
  for (const employee of state.employees) {
    const role = EMPLOYEE_ROLE_BY_ID[employee.role];
    if (!role) continue;
    for (const [effect, value] of Object.entries(role.effect ?? {})) effects[effect] = (effects[effect] ?? 0) + value * (employee.level ?? 1);
    if (employee.role === "mixer") effects.serviceSpeed += employee.speed * (employee.level ?? 1);
    if (employee.role === "online") effects.onlineOrders += employee.speed * (employee.level ?? 1);
  }
  return effects;
}

export function processEmployeeAutomation(state, now = Date.now(), serviceSpeed = 1) {
  if (state.day < 3) return [];
  const onlineEmployee = state.employees.find((employee) => employee.role === "online");
  if (!onlineEmployee) return [];
  const completed = [];
  for (const order of state.onlineOrders) {
    if (order.status === "waiting") {
      order.status = "preparing";
      order.acceptedAt = now;
    }
    const prepSeconds = Math.max(2, 12 / Math.max(0.5, onlineEmployee.speed * onlineEmployee.level * 5 * serviceSpeed));
    if (order.status === "preparing" && now - order.acceptedAt >= prepSeconds * 1000) {
      const result = completeOnlineOrder(state, order.id, now);
      if (result.success) completed.push(result);
    }
  }
  return completed;
}
