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
var TARGET_LABELS = {
  message: "Message text",
  charName: "Character name (header)",
  userName: "Your name (header)"
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
function cssSafe(value) {
  return value.replace(/[<>{}\\;@'"(),:/?#&=]/g, "").trim();
}
function cssToken(value) {
  return value.replace(/[<>{}\\;@]/g, "").trim();
}
function googleFontHrefs(config) {
  const families = new Set;
  for (const key of Object.keys(config.targets)) {
    const t = config.targets[key];
    if (t.enabled && t.googleFont.trim()) {
      families.add(cssSafe(t.googleFont));
    }
  }
  return [...families].map((fam) => {
    const family = fam.replace(/\s+/g, "+");
    return `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700&display=swap`;
  });
}
function colorDeclarations(color) {
  if (color.mode === "solid") {
    return `color: ${cssToken(color.solid)} !important;
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
  -webkit-text-fill-color: ${cssToken(color.solid)} !important;`;
  }
  if (color.mode === "gradient") {
    const angle = Number.isFinite(color.gradientAngle) ? color.gradientAngle : 90;
    const grad = `linear-gradient(${angle}deg, ${cssToken(color.gradientFrom)}, ${cssToken(color.gradientTo)})`;
    return `color: ${cssToken(color.gradientFrom)} !important;
  background: ${grad} !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;`;
  }
  return "";
}
function targetCss(style) {
  if (!style.enabled || !style.selector.trim())
    return "";
  const decls = [];
  if (style.fontFamily.trim())
    decls.push(`font-family: ${cssToken(style.fontFamily)} !important;`);
  if (style.fontSize.trim())
    decls.push(`font-size: ${cssToken(style.fontSize)} !important;`);
  if (style.fontWeight.trim())
    decls.push(`font-weight: ${cssToken(style.fontWeight)} !important;`);
  if (style.letterSpacing.trim())
    decls.push(`letter-spacing: ${cssToken(style.letterSpacing)} !important;`);
  const colorDecl = colorDeclarations(style.color);
  if (colorDecl)
    decls.push(colorDecl);
  if (decls.length === 0)
    return "";
  const selector = style.selector.replace(/[{}]/g, "").trim();
  return `${selector} {
  ${decls.join(`
  `)}
}`;
}
function buildCss(config) {
  if (!config.enabled)
    return "";
  const blocks = [];
  for (const key of Object.keys(config.targets)) {
    const css = targetCss(config.targets[key]);
    if (css)
      blocks.push(`/* ${key} */
${css}`);
  }
  return blocks.join(`

`);
}

// src/ui.ts
var TARGET_ORDER = ["message", "charName", "userName"];
var FONT_PRESETS = [
  "",
  "Inter, sans-serif",
  "Georgia, serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "'Comic Sans MS', cursive",
  "system-ui, sans-serif"
];
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fontOptions(current) {
  const opts = FONT_PRESETS.map((f) => {
    const label = f === "" ? "(host default)" : f;
    const sel = f === current ? " selected" : "";
    return `<option value="${esc(f)}"${sel}>${esc(label)}</option>`;
  });
  if (current && !FONT_PRESETS.includes(current)) {
    opts.push(`<option value="${esc(current)}" selected>${esc(current)} (custom)</option>`);
  }
  return opts.join("");
}
function modeOptions(current) {
  return ["inherit", "solid", "gradient"].map((m) => `<option value="${m}"${m === current ? " selected" : ""}>${m}</option>`).join("");
}
function cardHtml(key, t) {
  const c = t.color;
  return `
    <div class="fs-card fs-mode-${esc(c.mode)}" data-target="${key}">
      <h3>
        <label><input type="checkbox" data-field="enabled" ${t.enabled ? "checked" : ""}/> ${esc(TARGET_LABELS[key])}</label>
      </h3>

      <div class="fs-row">
        <label>Font</label>
        <select class="fs-select" data-field="fontFamily">${fontOptions(t.fontFamily)}</select>
      </div>
      <div class="fs-row">
        <label>Custom font</label>
        <input class="fs-input" data-field="fontFamilyCustom" placeholder="e.g. 'My Font', sans-serif" value="${esc(t.fontFamily)}"/>
      </div>
      <div class="fs-row">
        <label>Google Font</label>
        <input class="fs-input" data-field="googleFont" placeholder="e.g. Inter" value="${esc(t.googleFont)}"/>
      </div>
      <div class="fs-row">
        <label>Size</label>
        <input class="fs-input" data-field="fontSize" placeholder="e.g. 15px" value="${esc(t.fontSize)}"/>
        <label>Weight</label>
        <input class="fs-input" data-field="fontWeight" placeholder="e.g. 600" value="${esc(t.fontWeight)}"/>
      </div>
      <div class="fs-row">
        <label>Letter sp.</label>
        <input class="fs-input" data-field="letterSpacing" placeholder="e.g. 0.02em" value="${esc(t.letterSpacing)}"/>
      </div>

      <div class="fs-row">
        <label>Color mode</label>
        <select class="fs-select" data-field="colorMode">${modeOptions(c.mode)}</select>
      </div>
      <div class="fs-row fs-solid-only">
        <label>Color</label>
        <input type="color" class="fs-color" data-field="solid" value="${esc(c.solid)}"/>
      </div>
      <div class="fs-row fs-grad-only">
        <label>Gradient</label>
        <input type="color" class="fs-color" data-field="gradientFrom" value="${esc(c.gradientFrom)}"/>
        <input type="color" class="fs-color" data-field="gradientTo" value="${esc(c.gradientTo)}"/>
        <input class="fs-input" data-field="gradientAngle" type="number" value="${c.gradientAngle}" style="max-width:70px"/>
        <span class="fs-muted">deg</span>
      </div>

      <div class="fs-row">
        <label>Selector</label>
        <input class="fs-input" data-field="selector" value="${esc(t.selector)}"/>
      </div>
      <div class="fs-muted">Edit the selector if styling doesn't apply — inspect your chat DOM to find the right class.</div>
    </div>
  `;
}
function panelHtml(config) {
  const cards = TARGET_ORDER.map((k) => cardHtml(k, config.targets[k])).join("");
  return `
    <div class="fs-wrap">
      <div class="fs-row">
        <label><input type="checkbox" id="fs-enabled" ${config.enabled ? "checked" : ""}/> Enable Font Styler</label>
      </div>
      ${cards}
      <div class="fs-preview" id="fs-preview">
        <div data-preview="charName">Aria</div>
        <div data-preview="message">The lantern flickered as she stepped into the hall.</div>
        <div data-preview="userName">You</div>
      </div>
      <div class="fs-actions">
        <button class="fs-btn primary" id="fs-save">Save</button>
        <button class="fs-btn" id="fs-reset">Reset to defaults</button>
      </div>
      <div class="fs-muted" style="margin-top:6px">Changes preview live; click Save to persist.</div>
    </div>
  `;
}

// src/frontend.ts
var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';
function setup(ctx) {
  const removeStyle = ctx.dom.addStyle(`
    .fs-wrap { padding: 12px; font-size: 13px; color: var(--lumiverse-text); }
    .fs-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
    .fs-row label { color: var(--lumiverse-text-muted); min-width: 84px; }
    .fs-card {
      margin-bottom: 12px; padding: 10px 12px; border-radius: var(--lumiverse-radius);
      background: var(--lumiverse-fill-subtle); border: 1px solid var(--lumiverse-border);
    }
    .fs-card h3 { margin: 0 0 6px; font-size: 13px; }
    .fs-input, .fs-select {
      flex: 1 1 120px; min-width: 90px; padding: 4px 8px; font-size: 12px;
      background: var(--lumiverse-fill); color: var(--lumiverse-text);
      border: 1px solid var(--lumiverse-border); border-radius: var(--lumiverse-radius);
    }
    .fs-color { width: 38px; height: 26px; padding: 0; border: 1px solid var(--lumiverse-border);
      border-radius: var(--lumiverse-radius); background: none; cursor: pointer; }
    .fs-btn {
      padding: 5px 10px; border-radius: var(--lumiverse-radius);
      border: 1px solid var(--lumiverse-border); background: var(--lumiverse-fill-subtle);
      color: var(--lumiverse-text); cursor: pointer; font-size: 12px;
    }
    .fs-btn.primary { background: var(--lumiverse-accent, #2a7); color: #fff; border-color: transparent; }
    .fs-btn:hover { filter: brightness(1.1); }
    .fs-preview {
      margin-top: 8px; padding: 10px; border-radius: var(--lumiverse-radius);
      background: var(--lumiverse-fill); border: 1px dashed var(--lumiverse-border);
    }
    .fs-muted { color: var(--lumiverse-text-dim); font-size: 11px; }
    .fs-actions { display: flex; gap: 8px; margin-top: 8px; }
    .fs-grad-only { display: none; }
    .fs-mode-gradient .fs-grad-only { display: flex; }
    .fs-mode-solid .fs-solid-only, .fs-mode-gradient .fs-solid-only { display: flex; }
    .fs-solid-only { display: none; }
  `);
  const tab = ctx.ui.registerDrawerTab({
    id: "font_styler",
    title: "Font Styler",
    shortName: "Fonts",
    description: "Customize message and name fonts, sizes, and colors",
    keywords: ["font", "color", "gradient", "style", "typography", "theme"],
    headerTitle: "Font Styler",
    iconSvg: ICON
  });
  let removeLiveStyle = null;
  const loadedFontLinks = new Map;
  let config = mergeConfig(undefined);
  function send(type, payload) {
    ctx.sendToBackend({ type, ...payload ?? {} });
  }
  function loadGoogleFonts() {
    const wanted = new Set(googleFontHrefs(config));
    for (const [href, link] of loadedFontLinks) {
      if (!wanted.has(href)) {
        link.remove();
        loadedFontLinks.delete(href);
      }
    }
    for (const href of wanted) {
      if (loadedFontLinks.has(href))
        continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.fontStyler = "1";
      document.head.appendChild(link);
      loadedFontLinks.set(href, link);
    }
  }
  function applyLiveStyles() {
    if (removeLiveStyle) {
      removeLiveStyle();
      removeLiveStyle = null;
    }
    loadGoogleFonts();
    const css = buildCss(config);
    if (css)
      removeLiveStyle = ctx.dom.addStyle(css);
  }
  function updatePreview() {
    const box = ctx.dom.query("#fs-preview");
    if (!box)
      return;
    for (const key of TARGET_ORDER) {
      const el = box.querySelector(`[data-preview="${key}"]`);
      if (!el)
        continue;
      const t = config.targets[key];
      el.style.cssText = "";
      if (!config.enabled || !t.enabled)
        continue;
      if (t.fontFamily)
        el.style.fontFamily = t.fontFamily;
      if (t.fontSize)
        el.style.fontSize = t.fontSize;
      if (t.fontWeight)
        el.style.fontWeight = t.fontWeight;
      if (t.letterSpacing)
        el.style.letterSpacing = t.letterSpacing;
      const c = t.color;
      if (c.mode === "solid") {
        el.style.color = c.solid;
      } else if (c.mode === "gradient") {
        el.style.background = `linear-gradient(${c.gradientAngle}deg, ${c.gradientFrom}, ${c.gradientTo})`;
        el.style["-webkit-background-clip"] = "text";
        el.style.backgroundClip = "text";
        el.style["-webkit-text-fill-color"] = "transparent";
      }
    }
  }
  function render() {
    const root = tab.root;
    root.innerHTML = panelHtml(config);
    wire(root);
    updatePreview();
  }
  function onFieldChange(target, field, value, checked) {
    const t = config.targets[target];
    switch (field) {
      case "enabled":
        t.enabled = checked;
        break;
      case "fontFamily":
        t.fontFamily = value;
        break;
      case "fontFamilyCustom":
        t.fontFamily = value.trim();
        break;
      case "googleFont":
        t.googleFont = value.trim();
        break;
      case "fontSize":
        t.fontSize = value.trim();
        break;
      case "fontWeight":
        t.fontWeight = value.trim();
        break;
      case "letterSpacing":
        t.letterSpacing = value.trim();
        break;
      case "colorMode":
        t.color.mode = ["inherit", "solid", "gradient"].includes(value) ? value : "inherit";
        break;
      case "solid":
        t.color.solid = value;
        break;
      case "gradientFrom":
        t.color.gradientFrom = value;
        break;
      case "gradientTo":
        t.color.gradientTo = value;
        break;
      case "gradientAngle": {
        const n = Number(value);
        t.color.gradientAngle = Number.isFinite(n) ? n : 90;
        break;
      }
      case "selector":
        t.selector = value;
        break;
    }
    applyLiveStyles();
    updatePreview();
  }
  function wire(root) {
    const masterEnabled = root.querySelector("#fs-enabled");
    masterEnabled?.addEventListener("change", () => {
      config.enabled = masterEnabled.checked;
      applyLiveStyles();
      updatePreview();
    });
    root.querySelectorAll(".fs-card").forEach((card) => {
      const target = card.dataset.target;
      if (!target)
        return;
      card.querySelectorAll("[data-field]").forEach((input) => {
        const field = input.dataset.field;
        const evt = input instanceof HTMLSelectElement ? "change" : "input";
        input.addEventListener(evt, () => {
          const el = input;
          const checked = el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : false;
          onFieldChange(target, field, el.value, checked);
          if (field === "colorMode" || field === "fontFamily")
            render();
        });
      });
    });
    root.querySelector("#fs-save")?.addEventListener("click", () => {
      send("setConfig", { config });
    });
    root.querySelector("#fs-reset")?.addEventListener("click", async () => {
      const { confirmed } = await ctx.ui.showConfirm({
        title: "Reset Font Styler",
        message: "Reset all fonts and colors to defaults?",
        variant: "warning",
        confirmLabel: "Reset"
      });
      if (confirmed)
        send("reset");
    });
  }
  const unsub = ctx.onBackendMessage((payload) => {
    const msg = payload ?? {};
    if (msg.type === "config" && msg.data) {
      config = mergeConfig(msg.data);
      applyLiveStyles();
      render();
    }
  });
  const unsubActivate = tab.onActivate(() => send("getConfig"));
  render();
  applyLiveStyles();
  send("getConfig");
  return () => {
    unsub();
    unsubActivate();
    if (removeLiveStyle)
      removeLiveStyle();
    for (const link of loadedFontLinks.values())
      link.remove();
    loadedFontLinks.clear();
    tab.destroy();
    removeStyle();
    ctx.dom.cleanup();
  };
}
export {
  setup
};
