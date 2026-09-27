# Heads

An interactive SVG slot machine. A splash page leads to a game where a
"head" design, split into thirds (top / middle / bottom), spins like a
slot machine with **horizontal** divisions. Land all three thirds on the
same head and you win.

**Live:** https://audehelene.github.io/heads/

## Structure

```
index.html          Splash / landing page (LAUNCH → play)
play.html           The slot-machine game
styles.css          Shared minimal IBM Carbon dark styles
app.js              Slot-machine logic + hidden dev controls
assets/svg/full/    44 complete designs H01–H44 (winning result; not shown yet)
assets/svg/parts/   132 cut thirds: H##_t / H##_m / H##_b (optimized, used by the game)
assets/_originals/  Pristine, un-optimized copies of full/ + parts/
svgo.config.js      SVGO config used to optimize the parts
```

## Run locally

No build step. Serve the folder over HTTP (relative asset paths):

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

## Dev controls

Append `?dev=1` to the play URL (or press **d** three times) to reveal a
panel with:

- **Force next win** — the next spin lands three matching thirds.
- **Boost odds** — ~15% win rate while enabled.

Default odds are authentic: each reel is independent over 44 heads, so a
natural match is ~1 in 1,936.

## Deploy

GitHub Pages, **main branch / root**. In the repo: Settings → Pages →
Source: *Deploy from a branch* → `main` → `/ (root)`.

## Assets

Slice SVGs are optimized with SVGO (`svgo.config.js`) to strip embedded
Adobe XMP / C2PA metadata while preserving `viewBox` and styles. Re-run:

```bash
npx --yes svgo --config svgo.config.js -f assets/svg/parts -o assets/svg/parts
```
