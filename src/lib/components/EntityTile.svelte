<script lang="ts">
  import { entities } from "../store";
  import { callEntityService, setBrightness, setLightColor } from "../haClient";
  import { ACTION_DOMAINS, READONLY_DOMAINS } from "../icons";
  import { t } from "../i18n";
  import type { EntityCard } from "../store";
  import Icon from "./Icon.svelte";

  export let card: EntityCard;
  export let compact = false;

  $: ent = $entities[card.entity_id];
  $: domain = card.entity_id.split(".")[0];
  $: isAction = ACTION_DOMAINS.has(domain);
  $: isReadonly = READONLY_DOMAINS.has(domain);
  $: state = ent?.state ?? "unavailable";
  $: unavailable = !ent || state === "unavailable" || state === "unknown";
  $: attrs = ent?.attributes ?? {};
  $: modes = (attrs.supported_color_modes ?? []) as string[];
  $: canColor = domain === "light" && modes.some((m) => ["rgb", "rgbw", "rgbww", "hs", "xy"].includes(m));
  $: canBright =
    domain === "light" && (canColor || modes.includes("brightness") || attrs.brightness != null);
  $: expandable = !isAction && !isReadonly && canColor;
  $: rgb = attrs.rgb_color as number[] | undefined;
  $: tileAccent = card.color || (state === "on" && rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : "var(--accent)");

  let expanded = false;
  let flash = false;
  let bri = 0;
  let briTimer: ReturnType<typeof setTimeout> | undefined;
  let colorHex = "#ffffff";

  $: if (canBright && attrs.brightness != null) bri = Math.round((attrs.brightness / 255) * 100);
  $: if (rgb) colorHex = rgbToHex(rgb[0], rgb[1], rgb[2]);

  function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function activate() {
    if (unavailable || isReadonly) return;
    if (isAction) {
      flash = true;
      setTimeout(() => (flash = false), 450);
    }
    callEntityService(card);
  }
  function onBrightness(e: Event) {
    bri = +(e.target as HTMLInputElement).value;
    clearTimeout(briTimer);
    briTimer = setTimeout(() => setBrightness(card.entity_id, bri), 130);
  }
  function onColor(e: Event) {
    colorHex = (e.target as HTMLInputElement).value;
    setLightColor(card.entity_id, hexToRgb(colorHex));
  }

  function stateLabel(): string {
    if (unavailable) return "";
    if (isReadonly) {
      const unit = attrs.unit_of_measurement ? ` ${attrs.unit_of_measurement}` : "";
      return `${state}${unit}`;
    }
    if (isAction) return $t("tile.press");
    if (state === "on") return canBright ? `${bri}%` : $t("tile.on");
    if (state === "off") return $t("tile.off");
    return state;
  }
  $: label = stateLabel();
  $: void [$t, state, bri, unavailable, isReadonly, isAction, canBright, attrs];
</script>

<div
  class="tile"
  class:compact
  class:on={state === "on" && !isAction && !isReadonly}
  class:action={isAction}
  class:readonly={isReadonly}
  class:unavailable
  class:flash
  style="--glow: {tileAccent}"
>
  <div class="row">
    <button class="hit" on:click={activate} title={card.entity_id}>
      <span class="icon"><Icon icon={card.icon} size={22} /></span>
      <span class="meta">
        <span class="name">{card.name}</span>
        {#if label}<span class="state">{label}</span>{/if}
      </span>
    </button>

    {#if !isAction && !isReadonly}
      <span class="led" class:lit={state === "on"}></span>
    {/if}
    {#if expandable && state === "on"}
      <button class="chev" class:open={expanded} on:click={() => (expanded = !expanded)} title={$t("tile.color")}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    {/if}
  </div>

  {#if canBright && state === "on"}
    <input class="bri" type="range" min="1" max="100" value={bri} on:input={onBrightness} aria-label="brightness" />
  {/if}

  {#if expandable && expanded && state === "on"}
    <div class="drawer">
      <label class="palette">
        <span class="ring"></span>
        <span class="plbl">{$t("tile.color")}</span>
        <span class="cur" style="background: {colorHex}"></span>
        <input type="color" value={colorHex} on:input={onColor} />
      </label>
    </div>
  {/if}
</div>

<style>
  .tile {
    border-radius: var(--radius, 16px);
    border: 1px solid var(--border);
    background: var(--surface);
    overflow: hidden;
    transition: background 0.22s ease, border-color 0.22s ease;
  }
  .tile:hover {
    background: var(--surface-hover);
  }
  .tile.on {
    background: color-mix(in srgb, var(--glow) 16%, var(--surface));
    border-color: color-mix(in srgb, var(--glow) 42%, var(--border));
  }
  .tile.action.flash {
    background: color-mix(in srgb, var(--accent) 30%, var(--surface));
    border-color: var(--accent);
  }
  .tile.unavailable {
    opacity: 0.4;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 10px;
  }
  .hit {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 0 13px 13px;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }
  .tile.compact .hit {
    gap: 9px;
    padding: 10px 0 10px 11px;
  }
  .tile.compact .name {
    font-size: 12.5px;
  }
  .tile.unavailable .hit,
  .tile.readonly .hit {
    cursor: default;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 22px;
    flex-shrink: 0;
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .name {
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .state {
    font-size: 11px;
    opacity: 0.6;
  }
  .led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--text) 18%, transparent);
    transition: background 0.25s, box-shadow 0.25s;
    flex-shrink: 0;
  }
  .led.lit {
    background: var(--glow);
    box-shadow: 0 0 8px var(--glow);
  }
  .chev {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text);
    opacity: 0.6;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.25s;
    flex-shrink: 0;
  }
  .chev:hover {
    opacity: 1;
  }
  .chev.open {
    transform: rotate(180deg);
  }

  .bri {
    -webkit-appearance: none;
    appearance: none;
    width: calc(100% - 26px);
    margin: 0 13px 12px;
    height: 4px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--text) 18%, transparent);
    cursor: pointer;
  }
  .bri::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--glow);
    box-shadow: 0 0 6px var(--glow);
    cursor: pointer;
  }

  .drawer {
    padding: 2px 13px 13px;
  }
  .palette {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 11px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    position: relative;
  }
  .palette:hover {
    background: var(--surface-hover);
  }
  .ring {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
    flex-shrink: 0;
  }
  .plbl {
    font-size: 12.5px;
    font-weight: 600;
    flex: 1;
  }
  .cur {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  .palette input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
