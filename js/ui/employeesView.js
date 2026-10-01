import { EMPLOYEE_ROLES } from "../data/employees.js";
import { escapeHtml, formatMoneyCompact } from "./helpers.js";

export function renderEmployeesView(state) {
  const rows = EMPLOYEE_ROLES.map((role) => {
    const employee = state.employees.find((candidate) => candidate.role === role.id);
    const control = employee
      ? `<button class="button button-small button-quiet" data-action="fire-employee" data-employee="${employee.id}">Cho nghỉ</button>`
      : `<button class="button button-small button-cream" data-action="hire-employee" data-role="${role.id}" ${state.day < 3 || state.money < role.hireCost ? "disabled" : ""}>${state.day < 3 ? "Mở ngày 3" : `Tuyển · ${formatMoneyCompact(role.hireCost)}`}</button>`;
    return `<div class="prep-row staff-row"><span class="row-emoji">${role.emoji ?? "🧑‍🍳"}</span><div class="row-copy"><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.description)} · Lương ${formatMoneyCompact(role.baseSalary)} / ngày</small></div><div class="row-actions">${control}</div></div>`;
  }).join("");

  return `<div class="page-heading"><div><h2>Đội ngũ tiệm</h2><p>Nhân viên hỗ trợ một phần công việc mỗi ngày.</p></div><span class="pill">${state.employees.length} đang làm</span></div><div class="prep-list">${rows}</div>`;
}
