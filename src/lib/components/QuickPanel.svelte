<script lang="ts">
  import { config, connStatus, lastError } from "../store";
  import { t } from "../i18n";
  import EntityTile from "./EntityTile.svelte";
  import AddTile from "./AddTile.svelte";
  import { openSettings, openFullHA } from "../windows";

  const statusKey: Record<string, string> = {
    connected: "status.connected",
    connecting: "status.connecting",
    error: "status.error",
    disconnected: "status.disconnected",
  };
</script>

<div class="panel">
  <header>
    <div class="title">
      <span class="dot {$connStatus}"></span>
      <span>Home Assistant</span>
    </div>
    <button class="icon-btn" on:click={() => openSettings()} title="Settings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
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
    opacity: 0.8;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s, transform 0.3s;
  }
  .icon-btn:hover {
    background: var(--surface-hover);
    opacity: 1;
    transform: rotate(40deg);
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
