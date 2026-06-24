import type { ThemeConfig } from "./store";

/** Apply theme tokens to the document root (used by both windows). */
export function applyTheme(t: ThemeConfig): void {
  const r = document.documentElement;
  r.style.setProperty("--accent", t.accent);
  r.style.setProperty("--radius", `${t.radius}px`);
  r.style.setProperty("--bg-opacity", String(t.opacity));
  r.style.setProperty("--cols", String(t.columns));
  r.classList.toggle("theme-light", t.mode === "light");
  r.classList.toggle("no-anim", !t.animations);
}
