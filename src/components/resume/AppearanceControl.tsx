"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import {
  getThemePreferenceSnapshot,
  setThemePreference,
  subscribeEffectiveTheme,
  subscribeThemePreference,
  type ThemePreference,
} from "@/lib/workstation-theme";

const themeChoices = ["system", "light", "dark"] as const;

function themeLabel(theme: (typeof themeChoices)[number]) {
  return theme[0].toUpperCase() + theme.slice(1);
}

export function AppearanceControl() {
  const preference: ThemePreference = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreferenceSnapshot,
    () => "system",
  );
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const query = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    // Read the browser snapshot on hydration so the server's System snapshot
    // cannot briefly override the pre-paint bootstrap for an explicit choice.
    return subscribeEffectiveTheme(getThemePreferenceSnapshot(), query, (theme) => {
      document.documentElement.dataset.theme = theme;
    });
  }, [preference]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = themeChoices.indexOf(preference);
    optionRefs.current[selectedIndex]?.focus();
  }, [isOpen, preference]);

  const focusChoice = (index: number) => {
    const wrappedIndex = (index + themeChoices.length) % themeChoices.length;
    optionRefs.current[wrappedIndex]?.focus();
  };

  const closeMenu = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focusedIndex = optionRefs.current.findIndex((option) => option === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusChoice(focusedIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusChoice(focusedIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusChoice(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusChoice(themeChoices.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  return (
    <div className="resume-shell-appearance" ref={controlRef}>
      <button
        ref={triggerRef}
        className="resume-shell-appearance-trigger"
        type="button"
        aria-label="Appearance"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="resume-appearance-menu"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <svg className="resume-shell-appearance-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="7.1" fill="none" />
          <path d="M10 2.9a7.1 7.1 0 0 1 0 14.2V2.9Z" fill="currentColor" stroke="none" />
          <path d="M10 2.9v14.2" />
        </svg>
        <span>Appearance</span>
        <svg className="resume-shell-appearance-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </button>
      {isOpen ? (
        <div
          className="resume-shell-appearance-menu"
          id="resume-appearance-menu"
          role="menu"
          aria-label="Appearance"
          onKeyDown={handleMenuKeyDown}
        >
          {themeChoices.map((theme, index) => (
            <button
              key={theme}
              ref={(element) => { optionRefs.current[index] = element; }}
              className="resume-shell-appearance-menu-item"
              type="button"
              role="menuitemradio"
              aria-checked={preference === theme}
              tabIndex={-1}
              onClick={() => {
                setThemePreference(theme);
                closeMenu(true);
              }}
            >
              <span className="resume-shell-appearance-check" aria-hidden="true">
                {preference === theme ? "✓" : ""}
              </span>
              <span>{themeLabel(theme)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
