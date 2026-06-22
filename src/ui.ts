/**
 * UI rendering helpers for the Font Styler drawer. Kept separate from
 * frontend.ts so each file stays small and focused.
 */

import {
  TARGET_LABELS,
  type FontStylerConfig,
  type TargetKey,
  type TargetStyle,
} from "./config";

const TARGET_ORDER: TargetKey[] = ["message", "charName", "userName"];

const FONT_PRESETS = [
  "",
  "Inter, sans-serif",
  "Georgia, serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "'Comic Sans MS', cursive",
  "system-ui, sans-serif",
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fontOptions(current: string): string {
  const opts = FONT_PRESETS.map((f) => {
    const label = f === "" ? "(host default)" : f;
    const sel = f === current ? " selected" : "";
    return `<option value="${esc(f)}"${sel}>${esc(label)}</option>`;
  });
  // If the current value isn't a preset, add it as a custom selected option.
  if (current && !FONT_PRESETS.includes(current)) {
    opts.push(`<option value="${esc(current)}" selected>${esc(current)} (custom)</option>`);
  }
  return opts.join("");
}

function modeOptions(current: string): string {
  return (["inherit", "solid", "gradient"] as const)
    .map((m) => `<option value="${m}"${m === current ? " selected" : ""}>${m}</option>`)
    .join("");
}

/** Build the controls card for one target. data-* attributes drive wiring. */
function cardHtml(key: TargetKey, t: TargetStyle): string {
  const c = t.color;
  return `
    <div class="fs-card fs-mode-${esc(c.mode)}" data-target="${key}">
      <h3>
        <label><input type="checkbox" data-field="enabled" ${t.enabled ? "checked" : ""}/> ${esc(
          TARGET_LABELS[key]
        )}</label>
      </h3>

      <div class="fs-row">
        <label>Font</label>
        <select class="fs-select" data-field="fontFamily">${fontOptions(t.fontFamily)}</select>
      </div>
      <div class="fs-row">
        <label>Custom font</label>
        <input class="fs-input" data-field="fontFamilyCustom" placeholder="e.g. 'My Font', sans-serif" value="${esc(
          t.fontFamily
        )}"/>
      </div>
      <div class="fs-row">
        <label>Google Font</label>
        <input class="fs-input" data-field="googleFont" placeholder="e.g. Inter" value="${esc(
          t.googleFont
        )}"/>
      </div>
      <div class="fs-row">
        <label>Size</label>
        <input class="fs-input" data-field="fontSize" placeholder="e.g. 15px" value="${esc(t.fontSize)}"/>
        <label>Weight</label>
        <input class="fs-input" data-field="fontWeight" placeholder="e.g. 600" value="${esc(
          t.fontWeight
        )}"/>
      </div>
      <div class="fs-row">
        <label>Letter sp.</label>
        <input class="fs-input" data-field="letterSpacing" placeholder="e.g. 0.02em" value="${esc(
          t.letterSpacing
        )}"/>
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

/** Build the full controls panel HTML for the given config. */
export function panelHtml(config: FontStylerConfig): string {
  const cards = TARGET_ORDER.map((k) => cardHtml(k, config.targets[k])).join("");
  return `
    <div class="fs-wrap">
      <div class="fs-row">
        <label><input type="checkbox" id="fs-enabled" ${
          config.enabled ? "checked" : ""
        }/> Enable Font Styler</label>
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

export { TARGET_ORDER };
