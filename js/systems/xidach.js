import { GAME_CONFIG } from "../config.js";

const SUITS = ["♠", "♥", "♦", "♣"];

function drawCard(random) {
  const rank = Math.floor(random() * 13) + 1;
  const value = rank === 1 ? 1 : Math.min(10, rank);
  const label = rank === 1 ? "A" : rank > 10 ? ["J", "Q", "K"][rank - 11] : String(rank);
  return { rank, value, label, suit: SUITS[Math.floor(random() * SUITS.length)] };
}

export function scoreHand(cards) {
  let score = cards.reduce((total, card) => total + card.value, 0);
  const hasAce = cards.some((card) => card.rank === 1);
  if (hasAce && score + 10 <= 21) score += 10;
  return score;
}

function drawUntilSeventeen(cards, random) {
  while (scoreHand(cards) < 17) cards.push(drawCard(random));
  return cards;
}

export function playXidachHouseRound(state, amount, random = Math.random) {
  const stake = Math.floor(Number(amount));
  if (!Number.isFinite(stake) || stake < GAME_CONFIG.MIN_MINIGAME_BET || stake > GAME_CONFIG.MAX_MINIGAME_BET) return { success: false, reason: "Mức bàn nằm ngoài giới hạn của trò chơi." };
  if (state.money < stake) return { success: false, reason: "Quỹ chung chưa đủ tiền bảo chứng cho bàn." };

  // The stall holds the stake, then settles against the visitor's hand.
  state.money -= stake;
  const visitorCards = drawUntilSeventeen([drawCard(random), drawCard(random)], random);
  const houseCards = drawUntilSeventeen([drawCard(random), drawCard(random)], random);
  const visitorScore = scoreHand(visitorCards);
  const houseScore = scoreHand(houseCards);
  let outcome;
  let net;
  // A visitor who busts loses even if the house also busts.
  if (visitorScore > 21) {
    outcome = "house";
    net = stake;
    state.money += stake * 2;
  } else if (houseScore > 21 || visitorScore > houseScore) {
    outcome = "visitor";
    net = -stake;
  } else {
    outcome = "push";
    net = 0;
    state.money += stake;
  }

  const game = state.miniGames.xiDach;
  game.net += net;
  game.roundsPlayed += 1;
  game.lastRound = { visitorCards, houseCards, visitorScore, houseScore, stake, outcome, net, playedAt: Date.now() };
  return { success: true, ...game.lastRound };
}
