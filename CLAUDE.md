# CLAUDE.md — project rules for "Heads"

Living rules for working in this repo. Append decisions to the log at the
bottom as we iterate.

## What this is

A small static site hosted on GitHub Pages:

- **Splash** (`index.html`) — minimal placeholder + a **LAUNCH** CTA.
- **Game** (`play.html` + `app.js`) — an animated SVG slot machine. A
  "head" is split into three horizontal thirds (top/middle/bottom). Each
  reel spins through the 44 variants of its slice and stops randomly. A
  **win** = all three thirds belong to the same head (`H##`).

## Stack & conventions

- Plain static **HTML / CSS / JS**, no framework, no build step.
- Styling: **minimal IBM Carbon dark mode** (Gray 100 tokens in
  `styles.css` `:root`). Keep it sparse — the SVG art is the only visual
  richness. Buttons are rectangular (no radius), 48px tall, primary blue
  (`#0f62fe`) / secondary gray.
- Fonts: **IBM Plex Sans** + **IBM Plex Mono** via Google Fonts.
- Responsive: must work at phone width, no horizontal scroll.

## Asset conventions

- Heads are numbered `H01` … `H44` (zero-padded two digits).
- Parts: `assets/svg/parts/H##_{t,m,b}.svg` (t=top, m=middle, b=bottom).
  These are **optimized** (SVGO) and are what the game loads.
- Full designs: `assets/svg/full/H##.svg` — a complete/winning design.
  Not shown on the page yet; reserved for the future win animation.
- Pristine originals live in `assets/_originals/` — never edit these;
  they are the source of truth if we need to re-optimize.
- Cover art: `assets/svg/cover/000_FRONT.svg` (landing state on the game).
- Arcade UI art: pristine source in `assets/_backgrounds/` (scene +
  Play/Reset button states, all on a shared 1366×900 canvas). Served copies
  in `assets/svg/ui/`: the scene as-is, plus **cropped** standalone buttons
  (`play-default/hover/disabled.svg`, `reset-*`) made by rewriting only the
  root `viewBox`/`width`/`height` to each button's bbox.
- Background scene variants `Slot_Display_001.svg … 009.svg` (~3MB each,
  same frame position as `start2`) are cycled behind the frame while the
  reels spin. They're referenced **directly from `assets/_backgrounds/`**
  (not copied to `ui/`) to avoid duplicating ~29 MB; they're preloaded
  ~1.2s after load so the landing paints first. They're shown as CSS
  `background` via `--scene-url` (not `<img>`), so the center + mirrored
  wings update from one assignment.
- All asset references are **relative** (the site is served under
  `/heads/`, so absolute `/assets/...` paths would 404).

## Game rules

- Win condition: `landed.t === landed.m === landed.b` (same head index).
- Unlimited plays (no counter/limit).
- Background behaviour (desktop; all in the `Scenes` module in `app.js`):
  while spinning, scenes **crossfade** (two `.scene-layer`s driven by a
  `--scene-url` custom property) with a random 160–260ms gap and ~180ms fade.
  On stop it settles on the landed scene, then **flashes to the default dark
  frame and back 3× and finally lands on the default** (480ms fade / 480ms
  step). Both buttons stay disabled (`stage.is-spinning`) through the whole
  pulse and only re-enable when it finishes (via a `pulseToDefault` callback).
  The head slots keep their result — only **RESET** resets them.
- Each scene layer has horizontally **mirrored side wings** (`.scene-wing`,
  350px each at the 1366 design) so there's no black gap on the sides up to
  ~2066px wide; hidden on mobile. There is no idle auto-revert.
- **Dev controls** are hidden; reveal with `?dev=1` or press `d` 3×:
  - *Force next win* (one-shot), *Boost odds* (~15%).
- **Win reward:** on a win, `showWin()` (in `app.js`) mints a unique readable
  `code` (`H-<base36 time>-<base36 rand>`) + timestamp, builds an absolute
  `claim.html?id=<code>&t=<epoch>` URL, and renders it as a **QR** (qrcodejs
  from cdnjs) in the modal: "You won a print! Scan this QR code…". Modal also
  shows the code and an **Open claim form** tap-link. The `HOOK` comment in
  `evaluate()` is still where a future win animation would slot in.
- **Claim form** (`claim.html`): static page; reads `id`+`t` from the query,
  shows them, collects Name (required) / Email (required) / Phone (optional),
  and the **Send email** button opens a `mailto:audejomini@gmail.com` prefilled
  with the code, timestamp, and field values (static site → no backend).

## Deploy

- GitHub Pages, **main branch / root**. `.nojekyll` disables Jekyll.
- Live URL: https://audehelene.github.io/heads/

## Git / commits

- Commit attribution line:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## Decisions log

- 2026-09-27 — Initial build: splash + slot-machine game, Carbon dark,
  SVGO-optimized parts, authentic odds + hidden dev overrides, Pages via
  main/root.
- 2026-10-11 — Game page reskinned as an arcade "stage": the slot heads
  sit inside the gold-frame black screen of `Slot_Display_start2.svg`,
  custom Play (right) / Reset (left) SVG buttons with default/hover/disabled
  states, HEADS title + home in the strip above the frame. The whole page
  scales off the 1366×900 background width (`.stage` with cqw text). Added a
  <576px layout: frame + heads full-width (scene background cropped to the
  gold frame), buttons stacked below. `app.js` drives both buttons' disabled
  state via `stage.is-spinning`. Splash left unchanged.
- 2026-10-11 — While the reels spin, the background scene cycles randomly
  through `Slot_Display_001..009` (behind the frame + buttons) and settles
  on the last one when the reels land; RESET returns it to `start2`. Splash
  copy updated with the exquisite-corpse credit and a FEED link.
- 2026-10-11 — Background reworked into the `Scenes` module: crossfade
  cycling (160–260ms gap, 180ms fade) via two `--scene-url` layers; mirrored
  side wings fill the sides to ~2066px; on stop it flashes to the default and
  back 3× then lands on the default dark frame; idle auto-revert removed.
- 2026-10-16 — Win reward added: win modal shows a message + unique QR code
  (qrcodejs CDN) + code + "Open claim form" tap-link. New `claim.html` form
  (Name/Email/Phone) emails `audejomini@gmail.com` via `mailto:` with the
  code + timestamp. Buttons also kept disabled through the whole stop-pulse.
