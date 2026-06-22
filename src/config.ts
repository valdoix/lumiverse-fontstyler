/**
 * Shared config + CSS generation for the Font Styler extension.
 * Used by both the backend (persistence) and the frontend (rendering).
 */

/** How a target's text color is rendered. */
export type ColorMode = "inherit" | "solid" | "gradient";

export interface ColorStyle {
  mode: ColorMode;
  /** Used when mode === "solid". */
  solid: string;
  /** Two stops for mode === "gradient". */
  gradientFrom: string;
  gradientTo: string;
  /** Gradient angle in degrees (CSS linear-gradient). */
  gradientAngle: number;
}

/** Styling for one target region (message body, char name, user name). */
export interface TargetStyle {
  enabled: boolean;
  /** Font family stack, e.g. "Inter, sans-serif". Empty = leave host default. */
  fontFamily: string;
  /** Optional Google Font family to load (e.g. "Inter"). Empty = none. */
  googleFont: string;
  /** Font size override, e.g. "15px" or "1.05rem". Empty = leave host default. */
  fontSize: string;
  /** Font weight, e.g. "400", "600", "bold". Empty = leave host default. */
  fontWeight: string;
  /** Letter spacing, e.g. "0.02em". Empty = leave default. */
  letterSpacing: string;
  color: ColorStyle;
  /** CSS selector this target maps to in the host DOM (editable). */
  selector: string;
}

export type TargetKey = "message" | "charName" | "userName";

export interface FontStylerConfig {
  /** Master on/off. */
  enabled: boolean;
  targets: Record<TargetKey, TargetStyle>;
}

function defaultColor(): ColorStyle {
  return {
    mode: "inherit",
    solid: "#e8e8e8",
    gradientFrom: "#8a2be2",
    gradientTo: "#ff69b4",
    gradientAngle: 90,
  };
}

/**
 * Default selectors target Lumiverse's chat DOM. Lumiverse uses CSS Modules
 * (Vite default scoped naming), so runtime class names are hashed but always
 * embed the original local name as a substring (e.g. `prose` -> `_prose_a1b2c`).
 * We therefore match with `[class*="..."]` attribute-substring selectors rather
 * than exact class names. Base names verified against the staging source:
 *   - message body text:  `prose` (rendered markdown) / `content` (wrapper)
 *   - character name:      `nameChar`
 *   - your (user) name:    `nameUser`
 * These are exposed in the UI so they can be corrected per build if needed.
 */
export const DEFAULT_CONFIG: FontStylerConfig = {
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
      selector: '[class*="prose"], [class*="messageText"], [class*="content"]',
    },
    charName: {
      enabled: true,
      fontFamily: "",
      googleFont: "",
      fontSize: "",
      fontWeight: "",
      letterSpacing: "",
      color: defaultColor(),
      selector: '[class*="nameChar"]',
    },
    userName: {
      enabled: true,
      fontFamily: "",
      googleFont: "",
      fontSize: "",
      fontWeight: "",
      letterSpacing: "",
      color: defaultColor(),
      selector: '[class*="nameUser"]',
    },
  },
};

export const TARGET_LABELS: Record<TargetKey, string> = {
  message: "Message text",
  charName: "Character name (header)",
  userName: "Your name (header)",
};

/** Merge a possibly-partial stored config onto defaults (deep for targets). */
export function mergeConfig(partial: Partial<FontStylerConfig> | undefined): FontStylerConfig {
  const base = DEFAULT_CONFIG;
  if (!partial) return structuredClone(base);
  const merged = structuredClone(base);
  if (typeof partial.enabled === "boolean") merged.enabled = partial.enabled;
  const pTargets = partial.targets ?? {};
  for (const key of Object.keys(merged.targets) as TargetKey[]) {
    const pt = (pTargets as Partial<Record<TargetKey, Partial<TargetStyle>>>)[key];
    if (!pt) continue;
    merged.targets[key] = {
      ...merged.targets[key],
      ...pt,
      color: { ...merged.targets[key].color, ...(pt.color ?? {}) },
    };
  }
  return merged;
}

/** Escape a string for safe use inside a CSS url() / family name. */
/**
 * Sanitize a Google Font *family name* for safe use in a Fonts API URL.
 * Beyond the shared CSS-breaking chars, this also strips quotes, parens, commas
 * and URL-significant characters so the value can't alter the request.
 */
function cssSafe(value: string): string {
  return value.replace(/[<>{}\\;@'"(),:/?#&=]/g, "").trim();
}

/**
 * Sanitize a CSS value token (color, length, weight). Strips only the
 * characters that could break out of the declaration or open a new rule.
 */
function cssToken(value: string): string {
  return value.replace(/[<>{}\\;@]/g, "").trim();
}

/** Build the Google Fonts <link> hrefs needed by the active config. */
export function googleFontHrefs(config: FontStylerConfig): string[] {
  const families = new Set<string>();
  for (const key of Object.keys(config.targets) as TargetKey[]) {
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

function colorDeclarations(color: ColorStyle): string {
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
    // Gradient text via background-clip. Falls back to gradientFrom color if
    // the browser doesn't support text fill transparency.
    return `color: ${cssToken(color.gradientFrom)} !important;
  background: ${grad} !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;`;
  }
  return ""; // inherit: touch nothing
}

/**
 * The font-family value to actually apply for a target. If an explicit family
 * stack is set it wins; otherwise, if a Google Font name is given, build a
 * family stack from it (quoted + a sensible generic fallback). Empty when
 * neither is set, so the host default is left untouched.
 */
export function effectiveFontFamily(style: TargetStyle): string {
  if (style.fontFamily.trim()) return cssToken(style.fontFamily);
  const gf = style.googleFont.trim();
  if (gf) {
    const name = gf.replace(/["';{}<>]/g, "").trim();
    if (name) return `"${name}", sans-serif`;
  }
  return "";
}

function targetCss(style: TargetStyle): string {
  if (!style.enabled || !style.selector.trim()) return "";
  const decls: string[] = [];

  const family = effectiveFontFamily(style);
  if (family) decls.push(`font-family: ${family} !important;`);
  if (style.fontSize.trim()) decls.push(`font-size: ${cssToken(style.fontSize)} !important;`);
  if (style.fontWeight.trim()) decls.push(`font-weight: ${cssToken(style.fontWeight)} !important;`);
  if (style.letterSpacing.trim())
    decls.push(`letter-spacing: ${cssToken(style.letterSpacing)} !important;`);

  const colorDecl = colorDeclarations(style.color);
  if (colorDecl) decls.push(colorDecl);

  if (decls.length === 0) return "";
  // Selector is user-controlled; strip declaration-breaking chars only.
  const selector = style.selector.replace(/[{}]/g, "").trim();
  return `${selector} {\n  ${decls.join("\n  ")}\n}`;
}

/** Generate the full stylesheet for the active config. */
export function buildCss(config: FontStylerConfig): string {
  if (!config.enabled) return "";
  const blocks: string[] = [];
  for (const key of Object.keys(config.targets) as TargetKey[]) {
    const css = targetCss(config.targets[key]);
    if (css) blocks.push(`/* ${key} */\n${css}`);
  }
  return blocks.join("\n\n");
}
