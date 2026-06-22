/**
 * Font Styler frontend: a drawer tab to customize fonts, sizes, and colors
 * (solid or gradient) for message text and the character/user name headers.
 * Applies styling live by injecting a stylesheet into the host DOM.
 */

import {
  buildCss,
  googleFontHrefs,
  mergeConfig,
  type ColorMode,
  type FontStylerConfig,
  type TargetKey,
} from "./config";
import { panelHtml, TARGET_ORDER } from "./ui";

const ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';

export function setup(ctx: SpindleFrontendContext): () => void {
  // Styles for the drawer UI itself.
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
    iconSvg: ICON,
  });

  // Live <style> element injected into the host document for the actual chat
  // styling. Separate from the UI styles above so we can rewrite it freely.
  let removeLiveStyle: (() => void) | null = null;
  // Track loaded Google Font <link> hrefs so we don't add duplicates.
  const loadedFontLinks = new Map<string, HTMLLinkElement>();

  let config: FontStylerConfig = mergeConfig(undefined);

  function send(type: string, payload?: Record<string, unknown>): void {
    ctx.sendToBackend({ type, ...(payload ?? {}) });
  }

  function loadGoogleFonts(): void {
    const wanted = new Set(googleFontHrefs(config));
    // Remove links no longer needed.
    for (const [href, link] of loadedFontLinks) {
      if (!wanted.has(href)) {
        link.remove();
        loadedFontLinks.delete(href);
      }
    }
    // Add new ones.
    for (const href of wanted) {
      if (loadedFontLinks.has(href)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.fontStyler = "1";
      document.head.appendChild(link);
      loadedFontLinks.set(href, link);
    }
  }

  function applyLiveStyles(): void {
    if (removeLiveStyle) {
      removeLiveStyle();
      removeLiveStyle = null;
    }
    loadGoogleFonts();
    const css = buildCss(config);
    if (css) removeLiveStyle = ctx.dom.addStyle(css);
  }

  /** Apply the current config to the in-drawer preview swatch. */
  function updatePreview(): void {
    const box = ctx.dom.query("#fs-preview");
    if (!box) return;
    for (const key of TARGET_ORDER) {
      const el = box.querySelector<HTMLElement>(`[data-preview="${key}"]`);
      if (!el) continue;
      const t = config.targets[key];
      el.style.cssText = "";
      if (!config.enabled || !t.enabled) continue;
      if (t.fontFamily) el.style.fontFamily = t.fontFamily;
      if (t.fontSize) el.style.fontSize = t.fontSize;
      if (t.fontWeight) el.style.fontWeight = t.fontWeight;
      if (t.letterSpacing) el.style.letterSpacing = t.letterSpacing;
      const c = t.color;
      if (c.mode === "solid") {
        el.style.color = c.solid;
      } else if (c.mode === "gradient") {
        el.style.background = `linear-gradient(${c.gradientAngle}deg, ${c.gradientFrom}, ${c.gradientTo})`;
        (el.style as unknown as Record<string, string>)["-webkit-background-clip"] = "text";
        el.style.backgroundClip = "text";
        (el.style as unknown as Record<string, string>)["-webkit-text-fill-color"] = "transparent";
      }
    }
  }

  /** Re-render the controls panel and rewire its inputs. */
  function render(): void {
    const root = tab.root;
    root.innerHTML = panelHtml(config);
    wire(root);
    updatePreview();
  }

  /** Read a single field change into the config, then re-apply live + preview. */
  function onFieldChange(target: TargetKey, field: string, value: string, checked: boolean): void {
    const t = config.targets[target];
    switch (field) {
      case "enabled":
        t.enabled = checked;
        break;
      case "fontFamily":
        // Preset select: write through and re-render so the custom input below
        // reflects the chosen value (single source of truth = t.fontFamily).
        t.fontFamily = value;
        break;
      case "fontFamilyCustom":
        // Custom input is authoritative, including when cleared (= host default).
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
        t.color.mode = (["inherit", "solid", "gradient"].includes(value) ? value : "inherit") as ColorMode;
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

  function wire(root: HTMLElement): void {
    const masterEnabled = root.querySelector<HTMLInputElement>("#fs-enabled");
    masterEnabled?.addEventListener("change", () => {
      config.enabled = masterEnabled.checked;
      applyLiveStyles();
      updatePreview();
    });

    root.querySelectorAll<HTMLElement>(".fs-card").forEach((card) => {
      const target = card.dataset.target as TargetKey | undefined;
      if (!target) return;
      card.querySelectorAll<HTMLElement>("[data-field]").forEach((input) => {
        const field = input.dataset.field as string;
        const evt = input instanceof HTMLSelectElement ? "change" : "input";
        input.addEventListener(evt, () => {
          const el = input as HTMLInputElement | HTMLSelectElement;
          const checked = el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : false;
          onFieldChange(target, field, (el as HTMLInputElement).value, checked);
          // Re-render only when the color mode changes (toggles visible rows).
          // Re-render when a control toggles visible rows (color mode) or when
          // the preset font changes, so the custom input stays in sync.
          if (field === "colorMode" || field === "fontFamily") render();
        });
      });
    });

    root.querySelector<HTMLButtonElement>("#fs-save")?.addEventListener("click", () => {
      send("setConfig", { config });
    });
    root.querySelector<HTMLButtonElement>("#fs-reset")?.addEventListener("click", async () => {
      const { confirmed } = await ctx.ui.showConfirm({
        title: "Reset Font Styler",
        message: "Reset all fonts and colors to defaults?",
        variant: "warning",
        confirmLabel: "Reset",
      });
      if (confirmed) send("reset");
    });
  }

  // Receive config snapshots from the backend.
  const unsub = ctx.onBackendMessage((payload) => {
    const msg = (payload ?? {}) as { type?: string; data?: Partial<FontStylerConfig> };
    if (msg.type === "config" && msg.data) {
      config = mergeConfig(msg.data);
      applyLiveStyles();
      render();
    }
  });

  // Load persisted config on open and at startup.
  const unsubActivate = tab.onActivate(() => send("getConfig"));
  render();
  applyLiveStyles();
  send("getConfig");

  return () => {
    unsub();
    unsubActivate();
    if (removeLiveStyle) removeLiveStyle();
    for (const link of loadedFontLinks.values()) link.remove();
    loadedFontLinks.clear();
    tab.destroy();
    removeStyle();
    ctx.dom.cleanup();
  };
}
