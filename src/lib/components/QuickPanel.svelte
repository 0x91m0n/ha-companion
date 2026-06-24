<script lang="ts">
  import { config, connStatus, lastError } from "../store";
  import { t } from "../i18n";
  import { turnOffAllLights } from "../haClient";
  import EntityTile from "./EntityTile.svelte";
  import AddTile from "./AddTile.svelte";
  import { openSettings, openFullHA } from "../windows";
  import { invoke } from "@tauri-apps/api/core";

  const statusKey: Record<string, string> = {
    connected: "status.connected",
    connecting: "status.connecting",
    error: "status.error",
    disconnected: "status.disconnected",
  };

  let pinned = false;
  function togglePin() {
    pinned = !pinned;
    invoke("set_pinned", { value: pinned }).catch((e) => console.warn(e));
  }

  $: lightIds = $config.cards
    .filter((c) => c.entity_id.startsWith("light."))
    .map((c) => c.entity_id);
  function allOff() {
    turnOffAllLights(lightIds);
  }
</script>

<div class="panel">
  <header>
    <div class="title">
      <span class="dot {$connStatus}"></span>
      <span>Home Assistant</span>
    </div>
    <div class="actions">
      {#if lightIds.length}
        <button class="icon-btn" on:click={allOff} title={$t("panel.allOff")}>
          <i class="mdi mdi-power"></i>
        </button>
      {/if}
      <button class="icon-btn" class:active={pinned} on:click={togglePin} title={pinned ? $t("panel.unpin") : $t("panel.pin")}>
        <i class="mdi {pinned ? 'mdi-pin' : 'mdi-pin-outline'}"></i>
      </button>
      <button class="icon-btn gear" on:click={() => openSettings()} title="Settings">
        <i class="mdi mdi-cog-outline"></i>
      </button>
    </div>
  </header>

  <p class="status" class:err={$connStatus === "error"}>
    {$t(statusKey[$connStatus] ?? "status.disconnected")}{#if $connStatus === "error" && $lastError}: {$lastError}{/if}
  </p>

  <div class="body">
    {#if $config.cards.length === 0}
      <div class="empty">
        <p class="big">{$t("panel.emptyTitle")}</p>
        <p class="small">{$t("panel.emptyText")}</p>
        <AddTile />
      </div>
    {:else}
      <div class="grid" style="--gtc: repeat(var(--cols, 1), 1fr)">
        {#each $config.cards as card (card.entity_id)}
          <EntityTile {card} />
        {/each}
      </div>
    {/if}
  </div>

  <button class="ha-link" on:click={() => openFullHA($config.hassUrl)}>
    {$t("panel.fullHA")}
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 17 17 7" /><path d="M7 7h10v10" />
    </svg>
  </button>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 15px 6px 12px 15px;
    gap: 10px;
    box-sizing: border-box;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 9px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #7a7f8c;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .dot.connected {
    background: #46d39a;
    box-shadow: 0 0 9px #46d39a;
  }
  .dot.connecting {
    background: #f5c451;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .dot.error {
    background: #ff5d5d;
    box-shadow: 0 0 9px #ff5d5d;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: transparent;
    border: none;
    color: var(--text);
    opacity: 0.75;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s, color 0.2s;
  }
  .icon-btn i {
    font-size: 18px;
  }
  .icon-btn:hover {
    background: var(--surface-hover);
    opacity: 1;
  }
  .icon-btn.gear:hover {
    transform: rotate(40deg);
  }
  .icon-btn.active {
    color: var(--accent);
    opacity: 1;
  }
  .status {
    margin: -4px 9px 0 0;
    font-size: 11px;
    opacity: 0.55;
  }
  .status.err {
    color: #ff8e8e;
    opacity: 0.9;
  }
  .body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    padding: 4px 9px 4px 0;
  }
  .grid {
    display: grid;
    grid-template-columns: var(--gtc);
    gap: 12px;
    align-content: start;
  }
  .empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 6px;
    padding: 16px;
  }
  .empty .big {
    margin: 0;
    font-weight: 700;
    font-size: 15px;
  }
  .empty .small {
    margin: 0 0 14px;
    font-size: 12px;
    opacity: 0.6;
    max-width: 240px;
  }
  .ha-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-right: 9px;
    padding: 9px;
    border-radius: var(--radius, 14px);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .ha-link:hover {
    background: var(--surface-hover);
  }
</style>
