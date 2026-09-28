export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function renderPageHeading(title, subtitle = "") {
  return `<div class="page-heading"><div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div></div>`;
}

export function renderStatCard(icon, label, value, detail = "") {
  return `<article class="stat-card"><span class="stat-icon">${icon}</span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong>${detail ? `<span class="tiny muted">${escapeHtml(detail)}</span>` : ""}</article>`;
}

export function formatStars(rating) {
  const wholeStars = Math.max(0, Math.min(5, Math.round(rating)));
  return `<span class="review-stars" aria-label="${wholeStars} trên 5 sao">${"★".repeat(wholeStars)}${"☆".repeat(5 - wholeStars)}</span>`;
}
