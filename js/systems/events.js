import { EVENT_BY_ID, EVENTS } from "../data/events.js";
import { getDifficultyForDay } from "../data/difficulty.js";

export function triggerEvent(state, eventId, now = Date.now()) {
  const event = EVENT_BY_ID[eventId];
  if (!event) return null;
  state.currentEvent = event;
  state.eventEndsAt = now + event.duration * 1000;
  return event;
}

export function startRandomEvent(state, now = Date.now(), random = Math.random) {
  const difficulty = getDifficultyForDay(state.day);
  if (!difficulty.eventEnabled) return null;
  const allowedIds = difficulty.allowedEvents;
  const pool = allowedIds === null ? EVENTS : EVENTS.filter((event) => allowedIds.includes(event.id));
  if (!pool.length) return null;
  if (random() > 0.72) return null;
  const event = pool[Math.floor(random() * pool.length)];
  return event ? triggerEvent(state, event.id, now) : null;
}

export function getEventModifiers(state) {
  return state.currentEvent?.modifiers ?? {};
}
