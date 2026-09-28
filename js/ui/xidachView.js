import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

const STAKES = [5_000, 10_000, 25_000, 50_000];

function renderHand(cards, score) {
  return `<div class="playing-cards">${cards.map((card) => `<span class="playing-card ${["♥", "♦"].includes(card.suit) ? "is-red" : ""}">${escapeHtml(card.label)}<small>${card.suit}</small></span>`).join("")}</div><strong>Tổng: ${score}</strong>`;
}

export function renderXidachView(state) {
  const game = state.miniGames.xiDach;
  const result = game.lastRound ? `<section class="card"><div class="card-head"><h2>Kết quả lượt trước</h2><span class="pill ${game.lastRound.outcome === "house" ? "pill-green" : game.lastRound.outcome === "visitor" ? "pill-yellow" : ""}">${game.lastRound.outcome === "house" ? "Nhà cái thắng" : game.lastRound.outcome === "visitor" ? "Khách thắng" : "Hòa"} · ${game.lastRound.net >= 0 ? "+" : ""}${formatMoney(game.lastRound.net)}</span></div><div class="grid-2"><div><p class="tiny muted">Bài khách</p>${renderHand(game.lastRound.visitorCards, game.lastRound.visitorScore)}</div><div><p class="tiny muted">Bài nhà cái</p>${renderHand(game.lastRound.houseCards, game.lastRound.houseScore)}</div></div></section>` : "";
  return `${renderPageHeading("Xì Dách · Nhà cái", "Khách ghé bàn chơi với tiệm; kết quả được cộng/trừ trực tiếp vào quỹ chung.")}<div class="page-content"><section class="card"><div class="card-head"><div><h2>Mở một ván với khách</h2><p class="tiny">Quỹ giữ lại một mức cược làm tiền bảo chứng. Khách và nhà cái tự rút đến ít nhất 17 điểm; hòa thì hoàn tiền bảo chứng.</p></div><span class="pill">Quỹ ${formatMoney(state.money)}</span></div><div class="button-row">${STAKES.map((stake) => `<button class="button button-small ${game.stake === stake ? "button-primary" : "button-quiet"}" data-action="select-xidach-stake" data-stake="${stake}">${formatMoney(stake)}</button>`).join("")}</div><button class="button button-primary" style="margin-top:1rem" data-action="play-xidach">Mở bàn ${formatMoney(game.stake)}</button><p class="tiny muted" style="margin-top:.8rem">${game.roundsPlayed} ván đã chơi · Kết quả lũy kế ${game.net >= 0 ? "+" : ""}${formatMoney(game.net)}</p></section>${result}</div>`;
}
