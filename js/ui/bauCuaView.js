import { BAU_CUA_SYMBOLS } from "../data/bauCua.js";
import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

const STAKES = [5_000, 10_000, 25_000, 50_000];

export function renderBauCuaView(state) {
  const game = state.miniGames.bauCua;
  const symbols = BAU_CUA_SYMBOLS.map((symbol) => `<button class="bet-symbol ${game.bets[symbol.id] ? "is-selected" : ""}" data-action="add-bau-bet" data-symbol="${symbol.id}" aria-pressed="${Boolean(game.bets[symbol.id])}"><span>${symbol.emoji}</span><strong>${escapeHtml(symbol.name)}</strong><small>${game.bets[symbol.id] ? formatMoney(game.bets[symbol.id]) : "Chạm để cược"}</small></button>`).join("");
  const lastRound = game.lastRound ? `<section class="round-result"><div class="branch-status"><strong>Kết quả lượt trước</strong><span class="pill ${game.lastRound.net >= 0 ? "pill-green" : "pill-yellow"}">${game.lastRound.net >= 0 ? "+" : ""}${formatMoney(game.lastRound.net)}</span></div><div class="dice-result">${game.lastRound.dice.map((id) => { const symbol = BAU_CUA_SYMBOLS.find((item) => item.id === id); return `<span title="${escapeHtml(symbol.name)}">${symbol.emoji}</span>`; }).join("")}</div><p class="tiny muted">Tiền trả về két: ${formatMoney(game.lastRound.payouts)} · Lượt ${game.roundsPlayed}</p></section>` : "";
  return `${renderPageHeading("Bầu Cua", "Trò chơi may rủi dùng tiền ảo trong quỹ chung.")}<section class="activity-panel"><div class="activity-intro"><h3>Chọn cửa cược</h3><span class="pill">Quỹ ${formatMoney(state.money)}</span></div><p class="activity-note">Chọn mức cược rồi chạm một hoặc nhiều linh vật.</p><div class="button-row stake-strip">${STAKES.map((stake) => `<button class="button button-small ${game.stake === stake ? "button-primary" : "button-quiet"}" data-action="select-bau-stake" data-stake="${stake}">${formatMoney(stake)}</button>`).join("")}</div><div class="bet-symbol-grid">${symbols}</div><div class="button-row"><button class="button button-primary" data-action="roll-bau-cua" ${Object.keys(game.bets).length ? "" : "disabled"}>Lắc ba viên xúc xắc</button><button class="button button-quiet" data-action="clear-bau-bets" ${Object.keys(game.bets).length ? "" : "disabled"}>Hoàn cược</button></div></section>${lastRound}`;
}
