export const WORKSTATION_THEME_STORAGE_KEY = "resume-studio.appearance";

export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

export function createThemeBootstrapScript(): string {
  return `(()=>{let preference="system";try{const saved=localStorage.getItem(${JSON.stringify(WORKSTATION_THEME_STORAGE_KEY)});if(saved==="light"||saved==="dark")preference=saved}catch{}const systemDark=typeof matchMedia==="function"&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=preference==="system"?(systemDark?"dark":"light"):preference})();`;
}

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;
type ColorSchemeQuery = {
  matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
};

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveEffectiveTheme(preference: ThemePreference, systemIsDark: boolean): EffectiveTheme {
  return preference === "system" ? (systemIsDark ? "dark" : "light") : preference;
}

export function readThemePreference(storage: Pick<ThemeStorage, "getItem"> | null): ThemePreference {
  try {
    return parseThemePreference(storage?.getItem(WORKSTATION_THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeThemePreference(preference: ThemePreference, storage: Pick<ThemeStorage, "setItem"> | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(WORKSTATION_THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

let sessionPreference: ThemePreference | null = null;
const preferenceListeners = new Set<() => void>();

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getThemePreferenceSnapshot(): ThemePreference {
  return sessionPreference ?? readThemePreference(browserStorage());
}

export function subscribeThemePreference(listener: () => void): () => void {
  preferenceListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== WORKSTATION_THEME_STORAGE_KEY) return;
    sessionPreference = null;
    preferenceListeners.forEach((notify) => notify());
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function setThemePreference(preference: ThemePreference): void {
  sessionPreference = preference;
  writeThemePreference(preference, browserStorage());
  preferenceListeners.forEach((notify) => notify());
}

export function subscribeEffectiveTheme(
  preference: ThemePreference,
  query: ColorSchemeQuery | null,
  onChange: (theme: EffectiveTheme) => void,
): () => void {
  const update = () => onChange(resolveEffectiveTheme(preference, query?.matches ?? false));
  update();
  if (preference !== "system" || !query) return () => {};
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}
