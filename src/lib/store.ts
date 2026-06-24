import { writable } from "svelte/store";

/** A single quick-access tile on the panel. */
export interface EntityCard {
  entity_id: string;
  name: string;
  icon: string; // "mdi:name" | data/http image url | emoji
  service: string;
  color?: string; // optional per-tile accent override (hex)
  size?: "s" | "l"; // tile size (small = half width, large = full width)
}

export type ThemeMode = "dark" | "light";
export type Backdrop = "mica" | "acrylic" | "solid";
export type PanelSize = "s" | "m" | "l";
export type Lang = "en" | "ru";

export interface ThemeConfig {
  accent: string;
  opacity: number;
  mode: ThemeMode;
  radius: number;
  columns: 1 | 2;
  animations: boolean;
  panelSize: PanelSize;
  backdrop: Backdrop;
  performance: boolean;
}

export interface AppConfig {
  hassUrl: string;
  token: string;
  lang: Lang;
  cards: EntityCard[];
  theme: ThemeConfig;
}

export const DEFAULT_THEME: ThemeConfig = {
  accent: "#5b8cff",
  opacity: 0.6,
  mode: "dark",
  radius: 16,
  columns: 2,
  animations: true,
  panelSize: "m",
  backdrop: "mica",
  performance: false,
};

const DEFAULT_CONFIG: AppConfig = {
  hassUrl: "",
  token: "",
  lang: "en",
  cards: [],
  theme: { ...DEFAULT_THEME },
};

export const PANEL_SIZES: Record<PanelSize, { w: number; h: number }> = {
  s: { w: 320, h: 460 },
  m: { w: 360, h: 540 },
  l: { w: 420, h: 640 },
};

const STORAGE_KEY = "ha-companion-config";
export const STATES_KEY = "ha-companion-states";

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        theme: { ...DEFAULT_THEME, ...(parsed.theme ?? {}) },
        cards: parsed.cards ?? [],
      };
    }
  } catch (e) {
    console.warn("Failed to load config", e);
  }
  return DEFAULT_CONFIG;
}

function loadStates(): Record<string, any> {
  try {
    const raw = localStorage.getItem(STATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export const config = writable<AppConfig>(loadConfig());

config.subscribe((c) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch (e) {
    console.warn("Failed to persist config", e);
  }
});

/** Live entity states from HA, keyed by entity_id (seeded from last session). */
export const entities = writable<Record<string, any>>(loadStates());

export type ConnStatus = "disconnected" | "connecting" | "connected" | "error";
export const connStatus = writable<ConnStatus>("disconnected");
export const lastError = writable<string>("");
