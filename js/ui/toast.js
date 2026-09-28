let nextToastId = 1;

export function showToast(message, type = "", duration = 2600) {
  const root = document.querySelector("#toast-root");
  const toast = document.createElement("div");
  const id = nextToastId++;
  toast.className = `toast ${type ? `is-${type}` : ""}`;
  toast.dataset.toastId = String(id);
  toast.textContent = message;
  root.append(toast);
  window.setTimeout(() => toast.remove(), duration);
}
