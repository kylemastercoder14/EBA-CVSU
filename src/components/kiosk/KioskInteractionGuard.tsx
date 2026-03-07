"use client";

import { useEffect } from "react";

const INTERACTIVE_SELECTOR = "button, a[href], [role='button']";

export const KioskInteractionGuard = () => {
  useEffect(() => {
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

    document.addEventListener("contextmenu", onContextMenu, true);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, []);

  return null;
};
