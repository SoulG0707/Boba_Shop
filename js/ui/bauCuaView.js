import { BAU_CUA_SYMBOLS } from "../data/bauCua.js";
import { formatMoney } from "../config.js";
import { escapeHtml, renderPageHeading } from "./helpers.js";

const STAKES = [5_000, 10_000, 25_000, 50_000];

export function renderBauCuaView(state) {
  const game = state.miniGames.bauCua;
  const cards = BAU_CUA_SYMBOLS.map((symbol) => `<button class="card minigame-tile ${game.bets[symbol.id] ? "is-selected" : ""}" data-action="add-bau-bet" data-symbol="${symbol.id}"><span class="minigame-emoji">${symbol.emoji}</span><strong>${escapeHtml(symbol.name)}</strong><small>Cược ${formatMoney(game.bets[symbol.id] ?? 0)}</small><span class="button button-small button-quiet">Đặt ${formatMoney(game.stake)}</span></button>`).join("");
  const lastRound = game.lastRound ? `<section class="card"><div class="card-head"><h2>Kết quả lượt trước</h2><span class="pill ${game.lastRound.net >= 0 ? "pill-green" : "pill-yellow"}">${game.lastRound.net >= 0 ? "+" : ""}${formatMoney(game.lastRound.net)}</span></div><div class="dice-result">${game.lastRound.dice.map((id) => { const symbol = BAU_CUA_SYMBOLS.find((item) => item.id === id); return `<span title="${symbol.name}">${symbol.emoji}</span>`; }).join("")}</div><p class="tiny muted">Tiền trả về két: ${formatMoney(game.lastRound.payouts)} · Lượt chơi ${game.roundsPlayed}</p></section>` : "";
  return `${renderPageHeading("Bầu Cua", "Trò chơi may rủi dùng tiền ảo trong quỹ chung của cửa tiệm.")}<div class="page-content"><section class="card"><div class="card-head"><div><h2>Chọn cửa</h2><p class="tiny">Chọn mức cược rồi đặt vào một hoặc nhiều linh vật. Trúng mỗi mặt xúc xắc sẽ nhận lại tiền cược và một khoản bằng tiền cược.</p></div><span class="pill">Quỹ ${formatMoney(state.money)}</span></div><div class="button-row">${STAKES.map((stake) => `<button class="button button-small ${game.stake === stake ? "button-primary" : "button-quiet"}" data-action="select-bau-stake" data-stake="${stake}">${formatMoney(stake)}</button>`).join("")}</div><div class="minigame-grid">${cards}</div><div class="button-row"><button class="button button-primary" data-action="roll-bau-cua" ${Object.keys(game.bets).length ? "" : "disabled"}>Lắc ba viên xúc xắc</button><button class="button button-quiet" data-action="clear-bau-bets" ${Object.keys(game.bets).length ? "" : "disabled"}>Hủy cược, hoàn tiền</button></div></section>${lastRound}</div>`;
}
