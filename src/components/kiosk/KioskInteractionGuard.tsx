"use client";

import { useEffect } from "react";

const DOUBLE_TAP_WINDOW_MS = 450;
const INTERACTIVE_SELECTOR = "button, a[href], [role='button']";

type TapMemory = {
  element: Element | null;
  timestamp: number;
};

export const KioskInteractionGuard = () => {
  useEffect(() => {
    const tapMemory: TapMemory = { element: null, timestamp: 0 };
    const contextBypass = new WeakSet<Element>();

    const findInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      if (target.closest(".hg-button")) return null;
      if (target.closest("[data-kiosk-single-tap='true']")) return null;
      return target.closest(INTERACTIVE_SELECTOR);
    };

    const onContextMenu = (event: MouseEvent) => {
      const interactiveTarget = findInteractiveTarget(event.target);
      if (!interactiveTarget) return;

      event.preventDefault();
      contextBypass.add(interactiveTarget);
      (interactiveTarget as HTMLElement).click();
    };

    const onClick = (event: MouseEvent) => {
      const interactiveTarget = findInteractiveTarget(event.target);
      if (!interactiveTarget) return;

      if (contextBypass.has(interactiveTarget)) {
        contextBypass.delete(interactiveTarget);
        return;
      }

      if (event.detail >= 2) return;

      const now = Date.now();
      const isDoubleTap =
        tapMemory.element === interactiveTarget &&
        now - tapMemory.timestamp <= DOUBLE_TAP_WINDOW_MS;
      if (isDoubleTap) {
        tapMemory.element = null;
        tapMemory.timestamp = 0;
        return;
      }

      tapMemory.element = interactiveTarget;
      tapMemory.timestamp = now;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
};
