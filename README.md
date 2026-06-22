# Font Styler — Lumiverse / Spindle extension

Customize the typography of your chats: change the **font, size, weight, letter
spacing, and color** of three targets independently —

- **Message text**
- **Character name** (in message headers)
- **Your name** (in message headers)

Colors support three modes: **inherit** (leave the theme alone), **solid**, and
**gradient** (two-stop linear gradient rendered as gradient text via
`background-clip: text`). Google Fonts can be loaded by name.

Changes preview live in the drawer and apply to the chat immediately; click
**Save** to persist them across reloads.

## How it works

- A **frontend** module injects a `<style>` element into the host document with
  the rules for your configured selectors, and adds Google Font `<link>` tags as
  needed. It also renders a drawer tab ("Font Styler") with the controls.
- A tiny **backend** module persists the config to extension storage and serves
  it back to the frontend over the message bridge.

No gated permissions are required — DOM/CSS injection, storage, and
frontend↔backend messaging are all free-tier Spindle capabilities.

## Editable selectors (important)

Each target maps to a **CSS selector** in the host chat DOM. The defaults are
best guesses and may not match your exact Lumiverse build:

| Target | Default selector |
| --- | --- |
| Message text | `.message-content, .message-text, [data-message-content]` |
| Character name | `.message-author:not(.is-user), .char-name, …` |
| Your name | `.message-author.is-user, .user-name, …` |

If a target doesn't change when you tweak it, open your browser devtools,
inspect the relevant element, and paste the correct class/selector into the
**Selector** field for that target. The styling uses `!important` so it overrides
the theme, scoped to your selector.

## Gradient text

Gradient mode paints the text with a `linear-gradient` clipped to the glyphs
(`-webkit-background-clip: text` + transparent fill). This works in Chromium and
WebKit. If a browser doesn't support it, the text falls back to the gradient's
start color.

## Project layout

```
lumiverse-fontstyler/
├── spindle.json
├── package.json
├── tsconfig.json
├── types/
│   ├── spindle.d.ts            # backend `spindle` ambient types (subset)
│   └── spindle-frontend.d.ts   # frontend `ctx` ambient types (subset)
└── src/
    ├── config.ts               # shared config types + CSS generation
    ├── backend.ts              # persistence + message bridge
    ├── frontend.ts             # drawer tab, live injection, Google Fonts
    └── ui.ts                   # controls panel HTML
```

## Build

Requires [Bun](https://bun.sh).

```sh
bun install
bun run build       # emits dist/backend.js and dist/frontend.js
bun run typecheck
```

## Install

1. Push this folder to a GitHub repo (set `github`/`homepage` in `spindle.json`).
2. Install from the Extensions panel (or `POST /api/v1/spindle/install`).
3. Open the **Font Styler** drawer tab, adjust settings, and click **Save**.

## Notes & limitations

- Selectors are the main thing you may need to adjust per build; everything else
  is theme-agnostic and uses Lumiverse CSS variables for the drawer UI.
- Loading many Google Fonts adds network requests; prefer one or two families.
- Styling is applied client-side per session and persisted per user; it does not
  alter stored messages or the character cards themselves.
