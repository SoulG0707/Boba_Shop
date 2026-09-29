import { GAME_CONFIG } from "../config.js";
import { BAU_CUA_SYMBOLS } from "../data/bauCua.js";

export function placeBauCuaBet(state, symbolId, amount) {
  if (!BAU_CUA_SYMBOLS.some((symbol) => symbol.id === symbolId)) return { success: false, reason: "Lựa chọn không hợp lệ." };
  const stake = Math.floor(Number(amount));
  if (!Number.isFinite(stake) || stake < GAME_CONFIG.MIN_MINIGAME_BET || stake > GAME_CONFIG.MAX_MINIGAME_BET) return { success: false, reason: "Mức cược nằm ngoài giới hạn của bàn." };
  const game = state.miniGames.bauCua;
  const roundTotal = Object.values(game.bets).reduce((total, bet) => total + bet, 0);
  if (roundTotal + stake > GAME_CONFIG.MAX_MINIGAME_ROUND_STAKE) return { success: false, reason: "Tổng cược lượt này đã vượt giới hạn." };
  if (state.money < stake) return { success: false, reason: "Quỹ chung không đủ để đặt cược." };
  state.money -= stake;
  game.bets[symbolId] = (game.bets[symbolId] ?? 0) + stake;
  return { success: true, stake, roundTotal: roundTotal + stake };
}

export function clearBauCuaBets(state) {
  const game = state.miniGames.bauCua;
  const refund = Object.values(game.bets).reduce((total, bet) => total + bet, 0);
  state.money += refund;
  game.bets = {};
  return refund;
}

export function rollBauCua(state, random = Math.random) {
  const game = state.miniGames.bauCua;
  const totalStake = Object.values(game.bets).reduce((total, bet) => total + bet, 0);
  if (!totalStake) return { success: false, reason: "Hãy đặt ít nhất một cửa trước khi lắc." };
  const dice = Array.from({ length: 3 }, () => BAU_CUA_SYMBOLS[Math.floor(random() * BAU_CUA_SYMBOLS.length)].id);
  const matches = Object.fromEntries(BAU_CUA_SYMBOLS.map((symbol) => [symbol.id, dice.filter((die) => die === symbol.id).length]));
  const payouts = Object.entries(game.bets).reduce((total, [symbolId, stake]) => total + (matches[symbolId] ? stake * (matches[symbolId] + 1) : 0), 0);
  const net = payouts - totalStake;
  state.money += payouts;
  game.net += net;
  game.roundsPlayed += 1;
  game.lastRound = { dice, matches, bets: { ...game.bets }, totalStake, payouts, net, playedAt: Date.now() };
  game.bets = {};
  return { success: true, ...game.lastRound };
}
