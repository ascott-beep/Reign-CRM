"use client";

/**
 * Round 5 Part A item 6 — Radix restores focus to the trigger element when a
 * menu/dialog/popover closes, and because that focus() call is programmatic
 * rather than a direct key press, Chromium's :focus-visible heuristic still
 * lights up the ring even though the user just clicked. Tracks whether the
 * most recent interaction was a pointer (not keyboard) so onCloseAutoFocus
 * handlers can skip the auto-refocus in that case, leaving a visible ring
 * only when a keyboard user tabbed/typed their way to the close.
 */
let lastInteractionWasPointer = false;

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => {
    lastInteractionWasPointer = true;
  }, true);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      lastInteractionWasPointer = false;
    }
  }, true);
}

export function wasLastInteractionPointer() {
  return lastInteractionWasPointer;
}

/** Pass as onCloseAutoFocus on a Radix Dialog/DropdownMenu/Popover Content to stop a leftover focus ring after a mouse-driven close. */
export function skipAutoFocusAfterPointer(event: Event) {
  if (wasLastInteractionPointer()) event.preventDefault();
}
