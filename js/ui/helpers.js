export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function formatMoneyCompact(value) {
  const numeric = Number(value);
  const amount = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  const sign = amount < 0 ? "−" : "";
  const absolute = Math.abs(amount);
  const compact = (number) => number.toFixed(1).replace(".", ",").replace(/,0$/, "");

  if (absolute >= 1_000_000) return `${sign}${compact(absolute / 1_000_000)}tr`;
  if (absolute >= 1_000) {
    const thousands = absolute / 1_000;
    if (Number(thousands.toFixed(1)) >= 1_000) return `${sign}1tr`;
    return `${sign}${compact(thousands)}k`;
  }

  return `${sign}${absolute}`;
}

export function renderPageHeading(title, subtitle = "") {
  return `<div class="page-heading"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div></div>`;
}

export function renderStatCard(icon, label, value, detail = "") {
  return `<article class="stat-card"><span class="stat-icon">${icon}</span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong>${detail ? `<span class="tiny muted">${escapeHtml(detail)}</span>` : ""}</article>`;
}

export function formatStars(rating) {
  const wholeStars = Math.max(0, Math.min(5, Math.round(rating)));
  return `<span class="review-stars" aria-label="${wholeStars} trên 5 sao">${"★".repeat(wholeStars)}${"☆".repeat(5 - wholeStars)}</span>`;
}
