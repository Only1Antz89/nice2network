"use client";

import { useEffect } from "react";
import {
  currentTabletDeviceEnvironment,
  isTabletDevice,
} from "@/lib/tablet-device";

const TABLET_STYLE_PROPERTIES = [
  "--tablet-visual-viewport-height",
  "--tablet-visual-viewport-offset-top",
  "--tablet-keyboard-inset",
] as const;

function isTextEntry(element: Element | null): element is HTMLElement {
  return Boolean(
    element instanceof HTMLElement &&
      element.matches(
        "input:not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']",
      ),
  );
}

export default function TabletViewportController() {
  useEffect(() => {
    if (!isTabletDevice(currentTabletDeviceEnvironment())) return;

    const root = document.documentElement;
    const viewport = window.visualViewport;
    let revealFrame = 0;
    root.dataset.deviceClass = "tablet";

    const viewportMetrics = () => {
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const keyboardInset = Math.max(
        0,
        window.innerHeight - height - offsetTop,
      );
      return { height, offsetTop, keyboardInset };
    };

    const revealFocusedControl = () => {
      window.cancelAnimationFrame(revealFrame);
      revealFrame = window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!isTextEntry(active)) return;
        const scrollRegion = active.closest<HTMLElement>(
          ".modal-content, [data-tablet-scroll-region]",
        );
        if (!scrollRegion) return;

        const { height, offsetTop, keyboardInset } = viewportMetrics();
        if (keyboardInset <= 80) return;
        const fieldBounds = active.getBoundingClientRect();
        const regionBounds = scrollRegion.getBoundingClientRect();
        const visibleTop = Math.max(regionBounds.top, offsetTop) + 16;
        const visibleBottom =
          Math.min(regionBounds.bottom, offsetTop + height) - 88;

        if (fieldBounds.bottom > visibleBottom) {
          scrollRegion.scrollBy({
            top: fieldBounds.bottom - visibleBottom + 16,
            behavior: "smooth",
          });
        } else if (fieldBounds.top < visibleTop) {
          scrollRegion.scrollBy({
            top: fieldBounds.top - visibleTop - 16,
            behavior: "smooth",
          });
        }
      });
    };

    const syncViewport = () => {
      const { height, offsetTop, keyboardInset } = viewportMetrics();
      root.style.setProperty(
        "--tablet-visual-viewport-height",
        `${Math.round(height)}px`,
      );
      root.style.setProperty(
        "--tablet-visual-viewport-offset-top",
        `${Math.round(offsetTop)}px`,
      );
      root.style.setProperty(
        "--tablet-keyboard-inset",
        `${Math.round(keyboardInset)}px`,
      );
      root.dataset.tabletKeyboard = keyboardInset > 80 ? "open" : "closed";
      revealFocusedControl();
    };

    const onFocus = (event: FocusEvent) => {
      if (isTextEntry(event.target as Element | null)) revealFocusedControl();
    };

    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    document.addEventListener("focusin", onFocus);
    syncViewport();

    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      document.removeEventListener("focusin", onFocus);
      window.cancelAnimationFrame(revealFrame);
      if (root.dataset.deviceClass === "tablet") {
        delete root.dataset.deviceClass;
        delete root.dataset.tabletKeyboard;
        TABLET_STYLE_PROPERTIES.forEach((property) =>
          root.style.removeProperty(property),
        );
      }
    };
  }, []);

  return null;
}
