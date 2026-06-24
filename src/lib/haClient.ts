import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";
import { entities, connStatus, lastError, STATES_KEY } from "./store";
import type { EntityCard } from "./store";
import { defaultService, READONLY_DOMAINS } from "./icons";

let connection: Connection | null = null;
let unsub: (() => void) | null = null;

// Last known good states (for read-only sensors) so they survive HA hiccups
// and app restarts instead of showing "unavailable".
let goodCache: Record<string, any> = {};
try {
  const raw = localStorage.getItem(STATES_KEY);
  if (raw) goodCache = JSON.parse(raw);
} catch {}
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function persistStates() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const out: Record<string, any> = {};
      for (const id in goodCache) {
        if (READONLY_DOMAINS.has(id.split(".")[0])) out[id] = goodCache[id];
      }
      localStorage.setItem(STATES_KEY, JSON.stringify(out));
    } catch {}
  }, 2000);
}

function errText(e: any): string {
  const map: Record<number, string> = {
    1: "Не удалось подключиться к серверу",
    2: "Неверный токен доступа",
    3: "Соединение закрыто хостом",
  };
  if (typeof e === "number") return map[e] ?? `Ошибка соединения (${e})`;
  return e?.message ?? String(e);
}

export async function connectHA(hassUrl: string, token: string): Promise<void> {
  if (!hassUrl || !token) {
    connStatus.set("disconnected");
    return;
  }
  connStatus.set("connecting");
  lastError.set("");
  try {
    if (unsub) {
      unsub();
      unsub = null;
    }
    if (connection) {
      connection.close();
      connection = null;
    }
    const auth = createLongLivedTokenAuth(hassUrl.replace(/\/+$/, ""), token);
    connection = await createConnection({ auth });
    connection.addEventListener("ready", () => connStatus.set("connected"));
    connection.addEventListener("disconnected", () => connStatus.set("connecting"));
    unsub = subscribeEntities(connection, (ents: HassEntities) => {
      const merged: Record<string, any> = {};
      for (const id in ents) {
        const e = (ents as any)[id];
        const bad = e.state === "unavailable" || e.state === "unknown";
        const readonly = READONLY_DOMAINS.has(id.split(".")[0]);
        if (readonly && bad && goodCache[id]) {
          merged[id] = goodCache[id]; // keep last reading
        } else {
          merged[id] = e;
          if (!bad) goodCache[id] = e;
        }
      }
      entities.set(merged);
      persistStates();
    });
    connStatus.set("connected");
  } catch (e) {
    console.error("HA connection failed", e);
    lastError.set(errText(e));
    connStatus.set("error");
  }
}

export async function testConnection(
  url: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = createLongLivedTokenAuth(url.replace(/\/+$/, ""), token);
    const c = await createConnection({ auth });
    c.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
}

export async function callEntityService(card: EntityCard): Promise<void> {
  if (!connection) return;
  const domain = card.entity_id.split(".")[0];
  const service = card.service || defaultService(domain);
  if (!service) return; // read-only entity
  await callService(connection, domain, service, undefined, {
    entity_id: card.entity_id,
  });
}

/** Turn off all given light entities at once. */
export async function turnOffAllLights(entity_ids: string[]): Promise<void> {
  if (!connection || entity_ids.length === 0) return;
  await callService(connection, "light", "turn_off", undefined, { entity_id: entity_ids });
}

export async function setBrightness(entity_id: string, pct: number): Promise<void> {
  if (!connection) return;
  await callService(connection, "light", "turn_on", { brightness_pct: pct }, { entity_id });
}

export async function setLightColor(
  entity_id: string,
  rgb: [number, number, number],
): Promise<void> {
  if (!connection) return;
  await callService(connection, "light", "turn_on", { rgb_color: rgb }, { entity_id });
}

export async function setLightTemp(entity_id: string, kelvin: number): Promise<void> {
  if (!connection) return;
  await callService(connection, "light", "turn_on", { color_temp_kelvin: kelvin }, { entity_id });
}

export function getConnection(): Connection | null {
  return connection;
}
