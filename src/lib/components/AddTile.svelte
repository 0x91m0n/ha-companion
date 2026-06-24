<script lang="ts">
  import { openSettings } from "../windows";
  import { t } from "../i18n";
</script>

<button class="add" on:click={() => openSettings("entities")}>
  <span class="plus">＋</span>
  <span class="label">{$t("add")}</span>
</button>

<style>
  .add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    min-height: 64px;
    border-radius: var(--radius, 16px);
    border: 1.5px dashed var(--border);
    background: transparent;
    color: var(--text);
    opacity: 0.65;
    cursor: pointer;
    transition: opacity 0.2s, background 0.2s, border-color 0.2s;
  }
  .add:hover {
    opacity: 1;
    background: var(--surface);
    border-color: var(--accent);
  }
  .plus {
    font-size: 22px;
    line-height: 1;
  }
  .label {
    font-size: 12.5px;
    font-weight: 600;
  }
</style>
