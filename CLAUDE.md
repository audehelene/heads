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
- All asset references are **relative** (the site is served under
  `/heads/`, so absolute `/assets/...` paths would 404).

## Game rules

- Win condition: `landed.t === landed.m === landed.b` (same head index).
- Unlimited plays (no counter/limit).
- **Dev controls** are hidden; reveal with `?dev=1` or press `d` 3×:
  - *Force next win* (one-shot), *Boost odds* (~15%).
- The win currently shows a placeholder modal ("You win!"). When the
  winning animation asset arrives, swap it in at the `HOOK` comment in
  `app.js` (`evaluate()`).

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
