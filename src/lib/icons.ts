// Domain helpers, MDI icon catalog, classification.

/** Default MDI icon per domain (Home Assistant style). */
export const DOMAIN_MDI: Record<string, string> = {
  light: "mdi:lightbulb",
  switch: "mdi:toggle-switch",
  fan: "mdi:fan",
  scene: "mdi:palette",
  script: "mdi:script-text",
  automation: "mdi:robot",
  cover: "mdi:window-shutter",
  media_player: "mdi:cast",
  climate: "mdi:thermostat",
  input_boolean: "mdi:toggle-switch-outline",
  button: "mdi:gesture-tap-button",
  lock: "mdi:lock",
  vacuum: "mdi:robot-vacuum",
  humidifier: "mdi:air-humidifier",
  siren: "mdi:bullhorn",
  sensor: "mdi:gauge",
  binary_sensor: "mdi:checkbox-marked-circle-outline",
  weather: "mdi:weather-partly-cloudy",
  person: "mdi:account",
  device_tracker: "mdi:map-marker",
  sun: "mdi:white-balance-sunny",
};

export function iconForDomain(domain: string): string {
  return DOMAIN_MDI[domain] ?? "mdi:flash";
}

export type IconKind = "mdi" | "image" | "emoji";

export function iconKind(icon: string): IconKind {
  if (!icon) return "emoji";
  if (icon.startsWith("data:") || icon.startsWith("http")) return "image";
  if (icon.startsWith("mdi:")) return "mdi";
  return "emoji";
}

export function mdiClass(icon: string): string {
  return "mdi mdi-" + icon.slice(4);
}

/** Domains we surface in the entity picker by default. */
export const CONTROLLABLE_DOMAINS = [
  "light",
  "switch",
  "fan",
  "scene",
  "script",
  "automation",
  "cover",
  "media_player",
  "climate",
  "input_boolean",
  "button",
  "lock",
  "vacuum",
  "sensor",
  "binary_sensor",
];

/** Read-only domains shown as info tiles (no service call on click). */
export const READONLY_DOMAINS = new Set([
  "sensor",
  "binary_sensor",
  "weather",
  "person",
  "device_tracker",
  "sun",
]);

/** Momentary-action domains rather than on/off toggles. */
export const ACTION_DOMAINS = new Set(["scene", "script", "automation", "button"]);

export function defaultService(domain: string): string {
  if (READONLY_DOMAINS.has(domain)) return "";
  switch (domain) {
    case "scene":
    case "script":
      return "turn_on";
    case "automation":
      return "trigger";
    case "button":
      return "press";
    default:
      return "toggle";
  }
}

export const EMOJI_PALETTE = [
  "💡", "🌈", "🔌", "🛋️", "🛏️", "🍳", "🚿", "🖥️", "🎮", "🎬",
  "🎵", "🌀", "🌡️", "🪟", "🔒", "🌙", "☀️", "🔥", "❄️", "✨",
];

/** Curated MDI icons for the picker (any other MDI name works via manual input). */
export const MDI_CATALOG = [
  "lightbulb", "lightbulb-outline", "lightbulb-group", "lightbulb-on", "ceiling-light",
  "floor-lamp", "desk-lamp", "lamp", "led-strip", "led-strip-variant", "string-lights",
  "track-light", "wall-sconce", "chandelier", "spotlight", "outdoor-lamp", "coach-lamp",
  "toggle-switch", "toggle-switch-outline", "power-socket", "power-socket-eu", "power-plug",
  "fan", "fan-speed-1", "ceiling-fan", "air-conditioner", "thermostat", "radiator",
  "snowflake", "fire", "weather-sunny", "weather-night", "white-balance-sunny", "palette",
  "format-color-fill", "water", "water-pump", "fridge", "stove", "microwave", "coffee-maker",
  "washing-machine", "dishwasher", "robot-vacuum", "robot", "television", "television-classic",
  "speaker", "cast", "music", "volume-high", "play", "monitor", "desktop-tower", "laptop",
  "router-wireless", "wifi", "server", "nas", "cctv", "doorbell", "door", "door-open",
  "garage", "garage-open", "window-shutter", "window-closed", "blinds", "curtains", "lock",
  "lock-open", "key", "shield-home", "home", "home-automation", "sofa", "bed", "bookshelf",
  "stairs", "car", "ev-station", "battery", "battery-charging", "solar-power",
  "transmission-tower", "flash", "lightning-bolt", "leaf", "sprout", "flower", "tree",
  "paw", "dog", "cat", "water-percent", "gauge", "speedometer", "motion-sensor", "eye",
  "run", "walk", "bell", "alarm-light", "gesture-tap-button", "remote", "script-text",
  "calendar", "clock", "timer", "weather-cloudy", "weather-rainy", "umbrella", "party-popper",
  "gamepad-variant", "headphones", "phone", "tablet", "camera", "printer", "lan", "usb",
  "bluetooth", "map-marker", "account", "dumbbell", "silverware-fork-knife", "kettle",
];
