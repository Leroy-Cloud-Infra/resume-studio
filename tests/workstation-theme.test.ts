import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";

import {
  WORKSTATION_THEME_STORAGE_KEY,
  createThemeBootstrapScript,
  parseThemePreference,
  readThemePreference,
  resolveEffectiveTheme,
  subscribeEffectiveTheme,
  writeThemePreference,
} from "../src/lib/workstation-theme.ts";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("appearance uses a separate preference key and falls back to System", () => {
  const storage = new MemoryStorage();
  assert.equal(WORKSTATION_THEME_STORAGE_KEY, "resume-studio.appearance");
  assert.equal(readThemePreference(storage), "system");
  assert.equal(parseThemePreference("invalid"), "system");
  storage.setItem(WORKSTATION_THEME_STORAGE_KEY, "invalid");
  assert.equal(readThemePreference(storage), "system");
  assert.equal(readThemePreference({ getItem() { throw new Error("blocked"); } }), "system");
});

test("explicit preference persists and overrides the system setting", () => {
  const storage = new MemoryStorage();
  assert.equal(writeThemePreference("light", storage), true);
  assert.equal(readThemePreference(storage), "light");
  assert.equal(resolveEffectiveTheme("light", true), "light");
  assert.equal(writeThemePreference("dark", storage), true);
  assert.equal(readThemePreference(storage), "dark");
  assert.equal(resolveEffectiveTheme("dark", false), "dark");
  assert.equal(writeThemePreference("system", storage), true);
  assert.equal(storage.getItem(WORKSTATION_THEME_STORAGE_KEY), "system");
  assert.equal(writeThemePreference("dark", { setItem() { throw new Error("blocked"); } }), false);
});

test("System follows OS changes while explicit themes do not", () => {
  let listener: (() => void) | undefined;
  const query = {
    matches: false,
    addEventListener(_event: string, callback: () => void) { listener = callback; },
    removeEventListener(_event: string, callback: () => void) {
      if (listener === callback) listener = undefined;
    },
  };
  const themes: string[] = [];
  const unsubscribe = subscribeEffectiveTheme("system", query, (theme) => themes.push(theme));
  query.matches = true;
  listener?.();
  assert.deepEqual(themes, ["light", "dark"]);
  unsubscribe();
  assert.equal(listener, undefined);

  subscribeEffectiveTheme("light", query, (theme) => themes.push(theme));
  assert.equal(listener, undefined);
  assert.equal(themes.at(-1), "light");
});

test("pre-paint bootstrap resolves stored, invalid, and unavailable preferences", () => {
  function bootstrap(stored: string | null, systemDark: boolean, blocked = false) {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(createThemeBootstrapScript(), {
      document,
      localStorage: { getItem(key: string) {
        assert.equal(key, WORKSTATION_THEME_STORAGE_KEY);
        if (blocked) throw new Error("blocked");
        return stored;
      } },
      matchMedia: () => ({ matches: systemDark }),
    });
    return document.documentElement.dataset.theme;
  }
  assert.equal(bootstrap(null, false), "light");
  assert.equal(bootstrap(null, true), "dark");
  assert.equal(bootstrap("invalid", true), "dark");
  assert.equal(bootstrap("light", true), "light");
  assert.equal(bootstrap("dark", false), "dark");
  assert.equal(bootstrap(null, true, true), "dark");
});
