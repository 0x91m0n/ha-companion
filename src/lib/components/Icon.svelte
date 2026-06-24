<script lang="ts">
  import { iconKind, mdiClass } from "../icons";

  export let icon: string;
  export let size = 22;

  $: kind = iconKind(icon);
</script>

{#if kind === "image"}
  <img class="ic-img" src={icon} alt="" style="width:{size}px;height:{size}px" />
{:else if kind === "mdi"}
  <i class={mdiClass(icon)} style="font-size:{size}px;line-height:1"></i>
{:else}
  <span style="font-size:{size}px;line-height:1">{icon}</span>
{/if}

<style>
  .ic-img {
    object-fit: contain;
    border-radius: 5px;
    display: block;
  }
</style>
