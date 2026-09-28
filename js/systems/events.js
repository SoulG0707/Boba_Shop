import { EVENT_BY_ID, EVENTS } from "../data/events.js";

export function triggerEvent(state, eventId, now = Date.now()) {
  const event = EVENT_BY_ID[eventId];
  if (!event) return null;
  state.currentEvent = event;
  state.eventEndsAt = now + event.duration * 1000;
  return event;
}

export function startRandomEvent(state, now = Date.now(), random = Math.random) {
  if (random() > 0.72) return null;
  const event = EVENTS[Math.floor(random() * EVENTS.length)];
  return event ? triggerEvent(state, event.id, now) : null;
}

export function getEventModifiers(state) {
  return state.currentEvent?.modifiers ?? {};
}
