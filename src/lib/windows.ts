import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";

/** Open (or focus) the settings window, optionally on a given tab. */
export async function openSettings(tab = ""): Promise<void> {
  const all = await getAllWebviewWindows();
  const existing = all.find((w) => w.label === "settings");
  if (existing) {
    await existing.show();
    try {
      await existing.unminimize();
    } catch {}
    await existing.setFocus();
    return;
  }
  new WebviewWindow("settings", {
    url: "index.html" + (tab ? `#${tab}` : ""),
    title: "HA Companion — Настройки",
    width: 860,
    height: 760,
    minWidth: 600,
    minHeight: 560,
    resizable: true,
    center: true,
  });
}

/** Open (or focus) the full Home Assistant web UI in its own window. */
export async function openFullHA(url: string): Promise<void> {
  if (!url) {
    openSettings("connection");
    return;
  }
  const all = await getAllWebviewWindows();
  const existing = all.find((w) => w.label === "ha-full");
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }
  new WebviewWindow("ha-full", {
    url,
    title: "Home Assistant",
    width: 1200,
    height: 820,
    resizable: true,
    center: true,
  });
}
