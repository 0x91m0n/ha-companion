<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { fade, slide } from "svelte/transition";
  import { config, entities, connStatus } from "../store";
  import type { EntityCard, ThemeMode, Backdrop, PanelSize, Lang } from "../store";
  import { connectHA, testConnection } from "../haClient";
  import { applyTheme } from "../theme";
  import { t, locale } from "../i18n";
  import {
    CONTROLLABLE_DOMAINS,
    READONLY_DOMAINS,
    iconForDomain,
    defaultService,
    EMOJI_PALETTE,
    MDI_CATALOG,
  } from "../icons";
  import Icon from "./Icon.svelte";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { emit } from "@tauri-apps/api/event";
  import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

  type Tab = "connection" | "entities" | "appearance";
  let tab: Tab = "connection";
  const fromHash = (location.hash.replace("#", "") || "") as Tab;
  if (["connection", "entities", "appearance"].includes(fromHash)) tab = fromHash;

  const initial = get(config);
  let url = initial.hassUrl;
  let token = initial.token;
  let lang: Lang = initial.lang ?? "en";
  let cards: EntityCard[] = initial.cards.map((c) => ({ ...c }));

  let accent = initial.theme.accent;
  let opacity = initial.theme.opacity;
  let mode: ThemeMode = initial.theme.mode;
  let radius = initial.theme.radius;
  let columns: 1 | 2 = initial.theme.columns;
  let animations = initial.theme.animations;
  let panelSize: PanelSize = initial.theme.panelSize;
  let backdrop: Backdrop = initial.theme.backdrop;
  let performance = initial.theme.performance;
  $: theme = { accent, opacity, mode, radius, columns, animations, panelSize, backdrop, performance };
  $: applyTheme(theme);
  $: locale.set(lang);

  let showToken = false;
  let testing = false;
  let testOk: boolean | null = null;
  let testMsg = "";
  let saved = false;
  let autostart = false;

  let query = "";
  let activeDomain = "";
  let editingIcon: string | null = null;
  let iconTab: "mdi" | "upload" | "emoji" = "mdi";
  let mdiQuery = "";

  onMount(async () => {
    if (url && token) connectHA(url, token);
    try {
      autostart = await isEnabled();
    } catch (e) {
      console.warn("autostart unavailable", e);
    }
  });

  $: live = Object.values($entities) as any[];
  $: addedIds = new Set(cards.map((c) => c.entity_id));
  $: domainsPresent = CONTROLLABLE_DOMAINS.filter((d) => live.some((e) => e.entity_id.startsWith(d + ".")));
  $: filtered = live
    .filter((e) => CONTROLLABLE_DOMAINS.includes(e.entity_id.split(".")[0]))
    .filter((e) => !activeDomain || e.entity_id.startsWith(activeDomain + "."))
    .filter((e) => !addedIds.has(e.entity_id))
    .filter((e) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const name = (e.attributes?.friendly_name ?? e.entity_id).toLowerCase();
      return name.includes(q) || e.entity_id.toLowerCase().includes(q);
    })
    .sort((a, b) =>
      (a.attributes?.friendly_name ?? a.entity_id).localeCompare(b.attributes?.friendly_name ?? b.entity_id),
    )
    .slice(0, 80);
  $: mdiFiltered = MDI_CATALOG.filter((n) => n.includes(mdiQuery.trim().toLowerCase())).slice(0, 60);

  function addEntity(e: any) {
    const domain = e.entity_id.split(".")[0];
    cards = [
      ...cards,
      {
        entity_id: e.entity_id,
        name: e.attributes?.friendly_name ?? e.entity_id,
        icon: iconForDomain(domain),
        service: defaultService(domain),
      },
    ];
  }
  function removeCard(i: number) {
    cards = cards.filter((_, idx) => idx !== i);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    const copy = [...cards];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    cards = copy;
  }
  function setIcon(i: number, icon: string) {
    cards = cards.map((c, idx) => (idx === i ? { ...c, icon } : c));
  }
  function setCardColor(i: number, color: string | undefined) {
    cards = cards.map((c, idx) => (idx === i ? { ...c, color } : c));
  }
  function setCardSize(i: number, size: "s" | "l") {
    cards = cards.map((c, idx) => (idx === i ? { ...c, size } : c));
  }
  function effSize(c: EntityCard): "s" | "l" {
    return c.size ?? (READONLY_DOMAINS.has(c.entity_id.split(".")[0]) ? "s" : "l");
  }
  function openIconEditor(id: string) {
    editingIcon = editingIcon === id ? null : id;
    iconTab = "mdi";
    mdiQuery = "";
  }

  function fileToIcon(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const src = reader.result as string;
        if (file.type === "image/svg+xml") {
          resolve(src);
          return;
        }
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = 64;
          c.height = 64;
          const ctx = c.getContext("2d")!;
          const scale = Math.min(64 / img.width, 64 / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
          resolve(c.toDataURL("image/png"));
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }
  async function onUpload(e: Event, i: number) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setIcon(i, await fileToIcon(file));
      editingIcon = null;
    } catch (err) {
      console.error(err);
    }
    input.value = "";
  }

  async function runTest() {
    testing = true;
    testOk = null;
    testMsg = "";
    const r = await testConnection(url.trim(), token.trim());
    testing = false;
    testOk = r.ok;
    testMsg = r.ok ? $t("conn.ok") : r.error ?? "error";
    if (r.ok) connectHA(url.trim(), token.trim());
  }

  async function toggleAutostart() {
    try {
      if (autostart) await disable();
      else await enable();
      autostart = await isEnabled();
    } catch (e) {
      console.error("autostart toggle failed", e);
    }
  }

  async function save(close = false) {
    const payload = { hassUrl: url.trim(), token: token.trim(), lang, cards, theme };
    config.set(payload);
    await emit("config-updated", payload);
    saved = true;
    setTimeout(() => (saved = false), 1800);
    if (close) {
      try {
        await getCurrentWebviewWindow().close();
      } catch {}
    }
  }

  const ACCENTS = ["#5b8cff", "#46d39a", "#f5c451", "#ff7a90", "#b083ff", "#22d3ee"];
  const statusKey: Record<string, string> = {
    connected: "status.connected",
    connecting: "status.connecting",
    error: "status.error",
    disconnected: "status.disconnected",
  };
</script>

<div class="root">
  <aside class="rail">
    <div class="brand">
      <span class="brand-badge">HA</span>
      <span class="brand-text">Companion</span>
    </div>
    <nav>
      <button class:active={tab === "connection"} on:click={() => (tab = "connection")}>🔗 {$t("nav.connection")}</button>
      <button class:active={tab === "entities"} on:click={() => (tab = "entities")}>
        🧩 {$t("nav.entities")} <span class="count">{cards.length}</span>
      </button>
      <button class:active={tab === "appearance"} on:click={() => (tab = "appearance")}>🎨 {$t("nav.appearance")}</button>
    </nav>
    <div class="rail-foot">
      <span class="dot {$connStatus}"></span>
      <span>{$t(statusKey[$connStatus] ?? "status.disconnected")}</span>
    </div>
  </aside>

  <main class="content">
    {#if tab === "connection"}
      <section in:fade={{ duration: 150 }}>
        <h2>{$t("conn.title")}</h2>
        <p class="hint">{$t("conn.hint")}</p>
        <label class="field"><span>{$t("conn.url")}</span>
          <input bind:value={url} placeholder="http://192.168.1.34:8123" spellcheck="false" /></label>
        <label class="field"><span>{$t("conn.token")}</span>
          <div class="token-row">
            {#if showToken}<input bind:value={token} placeholder="eyJhbGciOi..." spellcheck="false" />
            {:else}<input type="password" bind:value={token} placeholder="eyJhbGciOi..." spellcheck="false" />{/if}
            <button class="ghost-sm" on:click={() => (showToken = !showToken)}>{showToken ? $t("conn.hide") : $t("conn.show")}</button>
          </div>
        </label>
        <div class="test-row">
          <button class="secondary" on:click={runTest} disabled={testing || !url || !token}>
            {testing ? $t("conn.testing") : $t("conn.test")}
          </button>
          {#if testOk !== null}
            <span class="test-msg" class:ok={testOk} class:bad={!testOk}>{testOk ? "✓" : "✕"} {testMsg}</span>
          {/if}
        </div>
      </section>
    {:else if tab === "entities"}
      <section in:fade={{ duration: 150 }}>
        <h2>{$t("ent.title")}</h2>
        {#if cards.length === 0}
          <p class="hint">{$t("ent.empty")}</p>
        {:else}
          <div class="cards-list">
            {#each cards as card, i (card.entity_id)}
              <div class="card-row" transition:slide={{ duration: 150 }}>
                <button class="card-icon" on:click={() => openIconEditor(card.entity_id)}>
                  <Icon icon={card.icon} size={20} />
                </button>
                <div class="card-info">
                  <input class="name-input" bind:value={card.name} />
                  <span class="eid">{card.entity_id}</span>
                </div>
                <div class="card-actions">
                  <button class="mini" on:click={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button class="mini" on:click={() => move(i, 1)} disabled={i === cards.length - 1}>↓</button>
                  <button class="mini danger" on:click={() => removeCard(i)}>✕</button>
                </div>
                {#if editingIcon === card.entity_id}
                  <div class="icon-pop" transition:slide={{ duration: 130 }}>
                    <div class="icon-tabs">
                      <button class:active={iconTab === "mdi"} on:click={() => (iconTab = "mdi")}>{$t("ent.iconMdi")}</button>
                      <button class:active={iconTab === "upload"} on:click={() => (iconTab = "upload")}>{$t("ent.iconUpload")}</button>
                      <button class:active={iconTab === "emoji"} on:click={() => (iconTab = "emoji")}>{$t("ent.iconEmoji")}</button>
                      <button class="close" on:click={() => (editingIcon = null)}>✕</button>
                    </div>
                    {#if iconTab === "mdi"}
                      <input class="mdi-search" bind:value={mdiQuery} placeholder={$t("ent.mdiSearch")} spellcheck="false" />
                      <div class="mdi-grid">
                        {#each mdiFiltered as n}
                          <button class="mdi-cell" on:click={() => setIcon(i, "mdi:" + n)} title={n}><i class="mdi mdi-{n}"></i></button>
                        {/each}
                      </div>
                      {#if mdiQuery && mdiFiltered.length === 0}
                        <button class="use-exact" on:click={() => setIcon(i, "mdi:" + mdiQuery.trim())}>{$t("ent.useExact")} «mdi:{mdiQuery.trim()}»</button>
                      {/if}
                    {:else if iconTab === "upload"}
                      <label class="upload">
                        <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" on:change={(e) => onUpload(e, i)} />
                        {$t("ent.uploadBtn")}
                      </label>
                      <p class="upload-hint">{$t("ent.uploadHint")}</p>
                    {:else}
                      <div class="emoji-grid">
                        {#each EMOJI_PALETTE as em}<button on:click={() => setIcon(i, em)}>{em}</button>{/each}
                      </div>
                    {/if}
                    <div class="pop-color">
                      <span class="pc-lbl">{$t("ent.tileColor")}</span>
                      <label class="pc-swatch" style="background: {card.color || 'var(--accent)'}">
                        <input type="color" value={card.color || "#5b8cff"} on:input={(e) => setCardColor(i, (e.target as HTMLInputElement).value)} />
                      </label>
                      {#if card.color}<button class="pc-reset" on:click={() => setCardColor(i, undefined)}>{$t("reset")}</button>{/if}
                    </div>
                    <div class="pop-color">
                      <span class="pc-lbl">{$t("ent.tileSize")}</span>
                      <div class="seg seg-sm">
                        <button class:active={effSize(card) === "s"} on:click={() => setCardSize(i, "s")}>{$t("size.small")}</button>
                        <button class:active={effSize(card) === "l"} on:click={() => setCardSize(i, "l")}>{$t("size.large")}</button>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <h3>{$t("ent.addFrom")}</h3>
        {#if $connStatus !== "connected"}
          <p class="hint warn">{$t("ent.connectFirst")}</p>
        {/if}
        <div class="picker">
          <input class="search" bind:value={query} placeholder={$t("ent.search")} spellcheck="false" />
          <div class="chips">
            <button class:active={activeDomain === ""} on:click={() => (activeDomain = "")}>{$t("all")}</button>
            {#each domainsPresent as d}
              <button class:active={activeDomain === d} on:click={() => (activeDomain = d)}>{d}</button>
            {/each}
          </div>
          <div class="pick-list">
            {#each filtered as e (e.entity_id)}
              <button class="pick" on:click={() => addEntity(e)}>
                <span class="pick-ic"><Icon icon={iconForDomain(e.entity_id.split(".")[0])} size={18} /></span>
                <span class="pick-meta">
                  <span class="pick-name">{e.attributes?.friendly_name ?? e.entity_id}</span>
                  <span class="pick-eid">{e.entity_id}</span>
                </span>
                <span class="pick-add">+</span>
              </button>
            {:else}
              <p class="hint dim">{$connStatus === "connected" ? $t("ent.nothing") : $t("ent.nodata")}</p>
            {/each}
          </div>
        </div>
      </section>
    {:else}
      <section in:fade={{ duration: 150 }}>
        <h2>{$t("nav.appearance")}</h2>

        <div class="field"><span>{$t("appr.language")}</span>
          <div class="seg">
            <button class:active={lang === "en"} on:click={() => (lang = "en")}>English</button>
            <button class:active={lang === "ru"} on:click={() => (lang = "ru")}>Русский</button>
          </div>
        </div>

        <div class="field"><span>{$t("appr.theme")}</span>
          <div class="seg">
            <button class:active={mode === "dark"} on:click={() => (mode = "dark")}>🌙 {$t("appr.dark")}</button>
            <button class:active={mode === "light"} on:click={() => (mode = "light")}>☀️ {$t("appr.light")}</button>
          </div>
        </div>

        <div class="field"><span>{$t("appr.accent")}</span>
          <div class="color-row">
            <input type="color" bind:value={accent} />
            <code>{accent}</code>
            <div class="swatches">
              {#each ACCENTS as c}<button style="background:{c}" on:click={() => (accent = c)} aria-label={c}></button>{/each}
            </div>
          </div>
        </div>

        <div class="field"><span>{$t("appr.layout")}</span>
          <div class="seg">
            <button class:active={columns === 1} on:click={() => (columns = 1)}>{$t("appr.col1")}</button>
            <button class:active={columns === 2} on:click={() => (columns = 2)}>{$t("appr.col2")}</button>
          </div>
        </div>

        <div class="field"><span>{$t("appr.size")}</span>
          <div class="seg">
            <button class:active={panelSize === "s"} on:click={() => (panelSize = "s")}>S</button>
            <button class:active={panelSize === "m"} on:click={() => (panelSize = "m")}>M</button>
            <button class:active={panelSize === "l"} on:click={() => (panelSize = "l")}>L</button>
          </div>
        </div>

        <label class="field"><span>{$t("appr.radius")}: {radius}px</span>
          <input type="range" min="0" max="28" step="1" bind:value={radius} /></label>

        <label class="field"><span>{$t("appr.opacity")}: {Math.round(opacity * 100)}%</span>
          <input type="range" min="0.1" max="1" step="0.02" bind:value={opacity} /></label>

        <div class="field"><span>{$t("appr.backdrop")}</span>
          <div class="seg">
            <button class:active={backdrop === "mica"} on:click={() => (backdrop = "mica")}>Mica</button>
            <button class:active={backdrop === "acrylic"} on:click={() => (backdrop = "acrylic")}>Acrylic</button>
            <button class:active={backdrop === "solid"} on:click={() => (backdrop = "solid")}>{$t("appr.none")}</button>
          </div>
          <p class="sub-hint">{$t("appr.backdropHint")}</p>
        </div>

        <label class="switch-row">
          <span>{$t("appr.animations")}</span>
          <input type="checkbox" bind:checked={animations} />
          <span class="switch"></span>
        </label>

        <label class="switch-row">
          <span>{$t("appr.performance")}</span>
          <input type="checkbox" bind:checked={performance} />
          <span class="switch"></span>
        </label>
        <p class="sub-hint">{$t("appr.performanceHint")}</p>

        <label class="switch-row">
          <span>{$t("appr.autostart")}</span>
          <input type="checkbox" checked={autostart} on:change={toggleAutostart} />
          <span class="switch"></span>
        </label>
        <p class="sub-hint">{$t("appr.autostartHint")}</p>
      </section>
    {/if}
  </main>

  <footer class="bar">
    {#if saved}<span class="saved" in:fade>✓ {$t("saved")}</span>{/if}
    <button class="secondary" on:click={() => save(false)}>{$t("save")}</button>
    <button class="primary" on:click={() => save(true)}>{$t("done")}</button>
  </footer>
</div>

<style>
  .root {
    display: grid;
    grid-template-columns: 210px 1fr;
    grid-template-rows: 1fr auto;
    grid-template-areas: "rail content" "rail bar";
    height: 100vh;
    color: var(--text);
  }
  .rail {
    grid-area: rail;
    background: var(--rail-bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 18px 12px;
    gap: 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 6px;
  }
  .brand-badge {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--accent);
    color: #fff;
    font-weight: 800;
    font-size: 12px;
  }
  .brand-text {
    font-weight: 700;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 12px;
    border-radius: 10px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 13.5px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background 0.18s, color 0.18s;
  }
  nav button:hover {
    background: var(--surface);
    color: var(--text);
  }
  nav button.active {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text);
  }
  .count {
    margin-left: auto;
    font-size: 11px;
    background: var(--surface-hover);
    padding: 1px 7px;
    border-radius: 999px;
  }
  .rail-foot {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: var(--text-muted);
    padding: 0 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #7a7f8c;
  }
  .dot.connected {
    background: #46d39a;
    box-shadow: 0 0 8px #46d39a;
  }
  .dot.connecting {
    background: #f5c451;
  }
  .dot.error {
    background: #ff5d5d;
  }

  .content {
    grid-area: content;
    overflow-y: auto;
    padding: 28px 30px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 19px;
    letter-spacing: -0.02em;
  }
  h3 {
    margin: 26px 0 10px;
    font-size: 14px;
    opacity: 0.85;
  }
  .hint {
    font-size: 12.5px;
    color: var(--text-muted);
    margin: 0 0 20px;
    max-width: 520px;
    line-height: 1.5;
  }
  .hint.warn {
    color: #d99a16;
  }
  .hint.dim {
    text-align: center;
    padding: 20px;
  }
  .sub-hint {
    font-size: 11px;
    color: var(--text-muted);
    margin: 8px 0 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
    max-width: 560px;
  }
  .field > span {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }
  input:not([type]),
  input[type="password"],
  .name-input,
  .search,
  .mdi-search {
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 11px 13px;
    color: var(--text);
    font-size: 13px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.18s;
  }
  input:focus,
  .search:focus,
  .name-input:focus,
  .mdi-search:focus {
    outline: none;
    border-color: var(--accent);
  }
  .token-row {
    display: flex;
    gap: 8px;
  }
  .ghost-sm {
    flex-shrink: 0;
    padding: 0 14px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
  }
  .test-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .test-msg {
    font-size: 12.5px;
  }
  .test-msg.ok {
    color: #46d39a;
  }
  .test-msg.bad {
    color: #ff7a7a;
  }
  .seg {
    display: inline-flex;
    gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 4px;
    width: fit-content;
  }
  .seg button {
    padding: 7px 14px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .seg button.active {
    background: var(--accent);
    color: #fff;
  }
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 11px;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 9px 10px;
  }
  .card-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    color: var(--text);
  }
  .card-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .name-input {
    padding: 5px 8px;
    font-size: 13px;
    font-weight: 600;
  }
  .eid {
    font-size: 10.5px;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
    padding-left: 2px;
  }
  .card-actions {
    display: flex;
    gap: 4px;
  }
  .mini {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    cursor: pointer;
    font-size: 12px;
  }
  .mini:hover {
    background: var(--surface-hover);
  }
  .mini:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .mini.danger:hover {
    background: rgba(255, 90, 90, 0.18);
    color: #ff8e8e;
  }
  .icon-pop {
    position: absolute;
    top: 54px;
    left: 10px;
    right: 10px;
    z-index: 5;
    background: var(--rail-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
  }
  .icon-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 9px;
  }
  .icon-tabs button {
    padding: 5px 11px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 11.5px;
    cursor: pointer;
  }
  .icon-tabs button.active {
    background: var(--accent);
    color: #fff;
    border-color: transparent;
  }
  .icon-tabs .close {
    margin-left: auto;
  }
  .mdi-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    max-height: 180px;
    overflow-y: auto;
    margin-top: 8px;
  }
  .mdi-cell {
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    border-radius: 7px;
    color: var(--text);
    font-size: 18px;
    cursor: pointer;
  }
  .mdi-cell:hover {
    background: var(--surface-hover);
  }
  .use-exact {
    margin-top: 8px;
    width: 100%;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: 12px;
  }
  .upload {
    display: block;
    text-align: center;
    padding: 18px;
    border: 1.5px dashed var(--border);
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text);
  }
  .upload input {
    display: none;
  }
  .upload-hint {
    font-size: 11px;
    color: var(--text-muted);
    margin: 8px 0 0;
    text-align: center;
  }
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 2px;
  }
  .emoji-grid button {
    aspect-ratio: 1;
    border: none;
    background: transparent;
    border-radius: 7px;
    font-size: 17px;
    cursor: pointer;
  }
  .emoji-grid button:hover {
    background: var(--surface-hover);
  }
  .pop-color {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .pc-lbl {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    flex: 1;
  }
  .pc-swatch {
    position: relative;
    width: 30px;
    height: 24px;
    border-radius: 7px;
    border: 1px solid var(--border);
    cursor: pointer;
    overflow: hidden;
  }
  .pc-swatch input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .pc-reset {
    padding: 5px 10px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 11px;
    cursor: pointer;
  }
  .seg-sm button {
    padding: 5px 11px;
    font-size: 11px;
  }
  .picker {
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 11px 0;
  }
  .chips button {
    padding: 5px 11px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 11.5px;
    cursor: pointer;
  }
  .chips button.active {
    background: var(--accent);
    color: #fff;
    border-color: transparent;
  }
  .pick-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 280px;
    overflow-y: auto;
  }
  .pick {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 9px 10px;
    border-radius: 10px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }
  .pick:hover {
    background: var(--surface);
    border-color: var(--border);
  }
  .pick-ic {
    display: grid;
    place-items: center;
    width: 20px;
  }
  .pick-meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }
  .pick-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pick-eid {
    font-size: 10.5px;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }
  .pick-add {
    font-size: 18px;
    color: var(--accent);
    font-weight: 700;
  }
  .color-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  input[type="color"] {
    width: 46px;
    height: 38px;
    padding: 3px;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--input-bg);
    cursor: pointer;
  }
  .color-row code {
    font-size: 12px;
    color: var(--text-muted);
  }
  .swatches {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }
  .swatches button {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    border: 1px solid var(--border);
    cursor: pointer;
  }
  input[type="range"] {
    accent-color: var(--accent);
    width: 100%;
    max-width: 560px;
  }
  .switch-row {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 560px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .switch-row input {
    display: none;
  }
  .switch {
    margin-left: auto;
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: var(--surface-hover);
    position: relative;
    transition: background 0.2s;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
  }
  .switch-row input:checked + .switch {
    background: var(--accent);
  }
  .switch-row input:checked + .switch::after {
    transform: translateX(18px);
  }
  .bar {
    grid-area: bar;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 30px;
    background: var(--rail-bg);
    border-top: 1px solid var(--border);
  }
  .saved {
    margin-right: auto;
    color: #46d39a;
    font-size: 13px;
    font-weight: 600;
  }
  .secondary {
    padding: 10px 18px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .secondary:hover {
    background: var(--surface-hover);
  }
  .secondary:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .primary {
    padding: 10px 22px;
    border-radius: 10px;
    border: none;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .primary:hover {
    filter: brightness(1.1);
  }
</style>
