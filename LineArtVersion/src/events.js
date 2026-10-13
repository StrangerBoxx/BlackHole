// A tiny event bus so the game logic (physics, world) can announce things
// ("an object was swallowed", "coins were earned") without importing the sound or UI code.
//
// Events used in this project:
//   'swallow'  (radius)             an object started falling into the hole      -> audio
//   'absorb'   ({ gain, combo })    an object finished falling in, coins paid    -> audio + UI

const listeners = {};

/** Subscribe to an event. */
export function on(name, fn) {
  if (!listeners[name]) listeners[name] = [];
  listeners[name].push(fn);
}

/** Announce an event to every subscriber. */
export function emit(name, data) {
  for (const fn of listeners[name] || []) fn(data);
}
