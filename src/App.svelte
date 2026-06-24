<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { config, loadConfig, PANEL_SIZES } from "./lib/store";
  import type { AppConfig } from "./lib/store";
  import { connectHA } from "./lib/haClient";
  import { applyTheme } from "./lib/theme";
  import { locale } from "./lib/i18n";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { LogicalSize } from "@tauri-apps/api/dpi";
  import QuickPanel from "./lib/components/QuickPanel.svelte";
  import Settings from "./lib/components/Settings.svelte";

  let label = "panel";
  try {
    label = getCurrentWebviewWindow().label;
  } catch {}
  const isSettings = label === "settings";

  // Theme + language follow the config store in both windows.
  $: applyTheme($config.theme);
  $: locale.set($config.lang ?? "en");

  async function applyPanelChrome(c: AppConfig) {
    if (isSettings) return;
    try {
      await invoke("apply_backdrop", {
        kind: c.theme.backdrop,
        dark: c.theme.mode === "dark",
        alpha: Math.round(Math.min(1, Math.max(0, c.theme.opacity)) * 255),
      });
    } catch (e) {
      console.warn("apply_backdrop failed", e);
    }
    try {
      const { w, h } = PANEL_SIZES[c.theme.panelSize];
      await getCurrentWebviewWindow().setSize(new LogicalSize(w, h));
    } catch (e) {
      console.warn("setSize failed", e);
    }
  }

  function refreshFromDisk() {
    const next = loadConfig();
    config.set(next);
    applyTheme(next.theme);
    locale.set(next.lang ?? "en");
  }

  onMount(() => {
    document.documentElement.classList.add(isSettings ? "ctx-window" : "ctx-panel");
    applyTheme($config.theme);
    locale.set($config.lang ?? "en");

    if ($config.hassUrl && $config.token) connectHA($config.hassUrl, $config.token);
    applyPanelChrome($config);

    const unsubs: Array<() => void> = [];
    if (!isSettings) {
      // Re-read settings whenever the panel is shown / regains focus.
      const onFocus = () => refreshFromDisk();
      window.addEventListener("focus", onFocus);
      unsubs.push(() => window.removeEventListener("focus", onFocus));

      listen<AppConfig>("config-updated", (e) => {
        const next = e.payload ?? loadConfig();
        config.set(next);
        applyTheme(next.theme);
        locale.set(next.lang ?? "en");
        applyPanelChrome(next);
        connectHA(next.hassUrl, next.token);
      }).then((u) => unsubs.push(u));
    }
    return () => unsubs.forEach((u) => u());
  });
</script>

{#if isSettings}
  <Settings />
{:else}
  <div class="panel-shell" in:fly={{ y: 10, duration: 200 }}>
    <QuickPanel />
  </div>
{/if}

<style>
  .panel-shell {
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(160deg, var(--panel-g1), var(--panel-g2));
  }
</style>
