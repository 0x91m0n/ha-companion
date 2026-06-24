import { writable } from "svelte/store";

/** A single quick-access tile on the panel. */
export interface EntityCard {
  entity_id: string;
  name: string;
  icon: string; // "mdi:name" | data/http image url | emoji
  service: string; // toggle | turn_on | turn_off | trigger | press ...
  color?: string; // optional per-tile accent override (hex)
}

export type ThemeMode = "dark" | "light";
export type Backdrop = "mica" | "acrylic" | "solid";
export type PanelSize = "s" | "m" | "l";
export type Lang = "en" | "ru";

export interface ThemeConfig {
  accent: string;
  opacity: number; // panel translucency (0..1)
  mode: ThemeMode;
  radius: number; // px corner radius for tiles/elements
  columns: 1 | 2;
  animations: boolean;
  panelSize: PanelSize;
  backdrop: Backdrop;
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
  columns: 1,
  animations: true,
  panelSize: "m",
  backdrop: "mica",
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

export const config = writable<AppConfig>(loadConfig());

config.subscribe((c) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch (e) {
    console.warn("Failed to persist config", e);
  }
});

/** Live entity states from HA, keyed by entity_id. */
export const entities = writable<Record<string, any>>({});

export type ConnStatus = "disconnected" | "connecting" | "connected" | "error";
export const connStatus = writable<ConnStatus>("disconnected");
export const lastError = writable<string>("");
