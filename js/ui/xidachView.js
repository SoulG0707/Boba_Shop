import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

const STAKES = [5_000, 10_000, 25_000, 50_000];

function renderHand(cards, score) {
  return `<div class="playing-cards">${cards.map((card) => `<span class="playing-card ${["♥", "♦"].includes(card.suit) ? "is-red" : ""}">${escapeHtml(card.label)}<small>${escapeHtml(card.suit)}</small></span>`).join("")}</div><strong>Tổng: ${score}</strong>`;
}

export function renderXidachView(state) {
  const game = state.miniGames.xiDach;
  const result = game.lastRound ? `<section class="round-result"><div class="branch-status"><strong>Kết quả lượt trước</strong><span class="pill ${game.lastRound.outcome === "house" ? "pill-green" : game.lastRound.outcome === "visitor" ? "pill-yellow" : ""}">${game.lastRound.outcome === "house" ? "Nhà cái thắng" : game.lastRound.outcome === "visitor" ? "Khách thắng" : "Hòa"} · ${game.lastRound.net >= 0 ? "+" : ""}${formatMoney(game.lastRound.net)}</span></div><div class="hand-result-grid"><div><small>Khách</small>${renderHand(game.lastRound.visitorCards, game.lastRound.visitorScore)}</div><div><small>Nhà cái</small>${renderHand(game.lastRound.houseCards, game.lastRound.houseScore)}</div></div></section>` : "";
  return `${renderPageHeading("Xì Dách · Nhà cái", "Khách chơi với tiệm; kết quả được cộng hoặc trừ vào quỹ chung.")}<section class="activity-panel"><div class="activity-intro"><h3>Mở một ván với khách</h3><span class="pill">Quỹ ${formatMoney(state.money)}</span></div><p class="activity-note">Hai bên tự rút đến ít nhất 17 điểm. Hòa thì hoàn tiền cược.</p><div class="button-row stake-strip">${STAKES.map((stake) => `<button class="button button-small ${game.stake === stake ? "button-primary" : "button-quiet"}" data-action="select-xidach-stake" data-stake="${stake}">${formatMoney(stake)}</button>`).join("")}</div><button class="button button-primary" data-action="play-xidach">Mở bàn ${formatMoney(game.stake)}</button><p class="tiny muted round-count">${game.roundsPlayed} ván đã chơi · Kết quả lũy kế ${game.net >= 0 ? "+" : ""}${formatMoney(game.net)}</p></section>${result}`;
}
