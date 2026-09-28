import { loadGame, saveGame } from "./persistence.js";

let state = loadGame();
const listeners = new Set();

export function getState() {
  return state;
}

export function updateState(updater) {
  updater(state);
  saveGame(state);
  for (const listener of listeners) listener(state);
  return state;
}

export function replaceState(nextState) {
  state = nextState;
  saveGame(state);
  for (const listener of listeners) listener(state);
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
