/**
 * Font Styler backend: persists the styling config and bridges it to the
 * frontend. No gated permissions — storage and frontend messaging are free-tier.
 */

import { type FontStylerConfig, mergeConfig } from "./config";

const CONFIG_PATH = "config.json";

/** Users whose frontend has contacted us this session (push targets). */
const knownUserIds = new Set<string>();

/** Per-user config read. `userId` is inferred for user-scoped installs and
 * required for operator-scoped ones; using userStorage keeps each user's
 * styling isolated even under a global install. */
async function getConfig(userId?: string): Promise<FontStylerConfig> {
  try {
    const stored = await spindle.userStorage.getJson<Partial<FontStylerConfig>>(CONFIG_PATH, {
      fallback: {},
      userId,
    });
    return mergeConfig(stored);
  } catch (err) {
    spindle.log.warn(`[font_styler] failed to read config, using defaults: ${String(err)}`);
    return mergeConfig(undefined);
  }
}

async function setConfig(next: FontStylerConfig, userId?: string): Promise<FontStylerConfig> {
  const merged = mergeConfig(next);
  await spindle.userStorage.setJson(CONFIG_PATH, merged, { indent: 2, userId });
  return merged;
}

interface FrontendMessage {
  type?: string;
  reqId?: string;
  config?: Partial<FontStylerConfig>;
}

function reply(type: string, reqId: string | undefined, data: unknown, userId: string): void {
  try {
    spindle.sendToFrontend({ type, reqId, data }, userId);
  } catch (err) {
    spindle.log.warn(`[font_styler] sendToFrontend failed: ${String(err)}`);
  }
}

async function handleMessage(raw: unknown, userId: string): Promise<void> {
  const msg = (raw ?? {}) as FrontendMessage;
  if (userId) knownUserIds.add(userId);

  try {
    switch (msg.type) {
      case "getConfig": {
        reply("config", msg.reqId, await getConfig(userId), userId);
        return;
      }
      case "setConfig": {
        const saved = await setConfig(mergeConfig(msg.config), userId);
        // Echo to the requester and any other connected sessions for this user.
        reply("config", msg.reqId, saved, userId);
        return;
      }
      case "reset": {
        const def = await setConfig(mergeConfig(undefined), userId);
        reply("config", msg.reqId, def, userId);
        return;
      }
      default:
        reply("error", msg.reqId, { error: `unknown type: ${String(msg.type)}` }, userId);
    }
  } catch (err) {
    spindle.log.error(`[font_styler] request "${String(msg.type)}" failed: ${String(err)}`);
    reply("error", msg.reqId, { error: String(err) }, userId);
  }
}

void (async () => {
  try {
    spindle.onFrontendMessage((payload, userId) => {
      void handleMessage(payload, userId);
    });
  } catch (err) {
    spindle.log.warn(`[font_styler] onFrontendMessage unavailable: ${String(err)}`);
  }
  spindle.log.info("[font_styler] backend ready");
})();
