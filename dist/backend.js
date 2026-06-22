// @bun
// src/config.ts
function defaultColor() {
  return {
    mode: "inherit",
    solid: "#e8e8e8",
    gradientFrom: "#8a2be2",
    gradientTo: "#ff69b4",
    gradientAngle: 90
  };
}
var DEFAULT_CONFIG = {
  enabled: true,
  targets: {
    message: {
      enabled: true,
      fontFamily: "",
      googleFont: "",
      fontSize: "",
      fontWeight: "",
      letterSpacing: "",
      color: defaultColor(),
      selector: '[class*="prose"], [class*="messageText"], [class*="content"]'
    },
    charName: {
      enabled: true,
      fontFamily: "",
      googleFont: "",
      fontSize: "",
      fontWeight: "",
      letterSpacing: "",
      color: defaultColor(),
      selector: '[class*="nameChar"]'
    },
    userName: {
      enabled: true,
      fontFamily: "",
      googleFont: "",
      fontSize: "",
      fontWeight: "",
      letterSpacing: "",
      color: defaultColor(),
      selector: '[class*="nameUser"]'
    }
  }
};
function mergeConfig(partial) {
  const base = DEFAULT_CONFIG;
  if (!partial)
    return structuredClone(base);
  const merged = structuredClone(base);
  if (typeof partial.enabled === "boolean")
    merged.enabled = partial.enabled;
  const pTargets = partial.targets ?? {};
  for (const key of Object.keys(merged.targets)) {
    const pt = pTargets[key];
    if (!pt)
      continue;
    merged.targets[key] = {
      ...merged.targets[key],
      ...pt,
      color: { ...merged.targets[key].color, ...pt.color ?? {} }
    };
  }
  return merged;
}

// src/backend.ts
var CONFIG_PATH = "config.json";
var knownUserIds = new Set;
async function getConfig(userId) {
  try {
    const stored = await spindle.userStorage.getJson(CONFIG_PATH, {
      fallback: {},
      userId
    });
    return mergeConfig(stored);
  } catch (err) {
    spindle.log.warn(`[font_styler] failed to read config, using defaults: ${String(err)}`);
    return mergeConfig(undefined);
  }
}
async function setConfig(next, userId) {
  const merged = mergeConfig(next);
  await spindle.userStorage.setJson(CONFIG_PATH, merged, { indent: 2, userId });
  return merged;
}
function reply(type, reqId, data, userId) {
  try {
    spindle.sendToFrontend({ type, reqId, data }, userId);
  } catch (err) {
    spindle.log.warn(`[font_styler] sendToFrontend failed: ${String(err)}`);
  }
}
async function handleMessage(raw, userId) {
  const msg = raw ?? {};
  if (userId)
    knownUserIds.add(userId);
  try {
    switch (msg.type) {
      case "getConfig": {
        reply("config", msg.reqId, await getConfig(userId), userId);
        return;
      }
      case "setConfig": {
        const saved = await setConfig(mergeConfig(msg.config), userId);
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
(async () => {
  try {
    spindle.onFrontendMessage((payload, userId) => {
      handleMessage(payload, userId);
    });
  } catch (err) {
    spindle.log.warn(`[font_styler] onFrontendMessage unavailable: ${String(err)}`);
  }
  spindle.log.info("[font_styler] backend ready");
})();
