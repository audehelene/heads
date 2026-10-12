# Plan: "Heads" — interactive SVG slot-machine web page (GitHub Pages)

## Context
The repo `audehelene/heads` is currently empty (no commits). We need a small, static, GitHub-Pages–hosted site with two screens:
1. A **splash/landing** page (placeholder info + a **LAUNCH** call-to-action).
2. A **main game** page: an interactive, animated slot machine built from the provided SVG head designs, split into thirds (top / middle / bottom) that spin horizontally-stacked and settle on random slices. When all three thirds belong to the same head (`H##`), the player wins.

Assets already exist locally:
- `assets/svg/full/H01.svg … H44.svg` — 44 complete designs (a winning result). Not shown on the page yet (used later for the win animation).
- `assets/svg/parts/H##_t.svg`, `_m.svg`, `_b.svg` — 132 cut thirds. All 44 heads have all three parts. Parts are ~576 wide × ~240 tall each and stack cleanly. Tiles are black background with white/gray line art (already dark-mode friendly).

Design goal: **minimal IBM Carbon dark mode**; the SVG art is the only visual richness.

### Decisions confirmed with the user
- **Win odds:** authentic ~1/1936 by default, plus **two hidden DEV controls**: (a) boost-odds toggle, (b) force-next-spin-win toggle.
- **Deploy:** GitHub Pages from **main branch / root** (no CI). Served at `https://audehelene.github.io/heads/`.
- **Assets:** **strip & optimize** the part SVGs with SVGO (remove embedded XMP/C2PA metadata to shrink ~13.7 MB), keeping pristine originals in a separate folder.

---

## Step 0 — Git access (verify before building)
- Remote read already confirmed working (`git ls-remote` succeeded; repo is empty).
- Credential helper is `manager` (Git Credential Manager for Windows) → first `git push` should open a browser sign-in and just work.
- **PAT fallback** (only if the interactive push fails): create a *fine-grained* PAT at github.com → Settings → Developer settings → Fine-grained tokens, scoped to the `heads` repo with **Contents: Read and write**. Then either:
  - `git remote set-url origin https://audehelene:<PAT>@github.com/audehelene/heads.git`, or
  - `git config --global credential.helper store` and let the next push cache it.
- I will surface exactly which path was needed after the first push attempt.

---

## Step 1 — Optimize the part SVGs (SVGO)
- Move pristine originals into a separate folder: `assets/_originals/` (contains current `full/` + `parts/`).
  - Note: `.nojekyll` (Step 2) ensures the leading-underscore folder is left alone; we don't serve it anyway.
- Run SVGO over `assets/svg/parts/` in place, config to strip `metadata`, XMP (`<?xpacket ...?>`), editor cruft, and C2PA blocks, while **preserving `viewBox`** and IDs/styles needed for rendering.
  - Command: `npx --yes svgo -f assets/svg/parts -o assets/svg/parts` with an `svgo.config.js` (preset-default, `removeViewBox: false`, `removeMetadata: true`, `cleanupIds: false`).
- Spot-check 2–3 optimized files render identically (viewBox intact, art visible) and report before/after total size.
- Leave `assets/svg/full/` as-is for now (not used on the page until the win asset is ready).

## Step 2 — Site scaffolding (repo root, for branch-root Pages)
Create at repo root (relative asset paths, since project pages serve under `/heads/`):
- `index.html` — splash page.
- `play.html` — game page.
- `styles.css` — shared Carbon dark styles.
- `app.js` — slot-machine logic + dev controls.
- `.nojekyll` — disable Jekyll processing (safe asset serving).
- `README.md` — one-paragraph description + local-run + deploy notes.
- `.gitignore` — `node_modules/`, `svgo` temp, OS cruft.

### Project docs / rules (committed to the repo)
- `plans/` folder at repo root, with this plan saved as `plans/heads-slot-machine.md` so it lives with the code and we can revise it as we iterate.
- `CLAUDE.md` at repo root — living project rules/conventions we grow as we go. Initial contents:
  - Project overview (what "Heads" is; splash → game slot machine).
  - Stack: plain static HTML/CSS/JS, no build step; IBM Carbon dark tokens; IBM Plex fonts.
  - Asset conventions: heads are `H01…H44`; parts `H##_{t,m,b}.svg` in `assets/svg/parts/`; full designs in `assets/svg/full/`; pristine originals in `assets/_originals/`; use relative paths (site served under `/heads/`).
  - Win rule: three thirds share the same `H##`. Dev controls behind `?dev=1`.
  - Deploy: GitHub Pages, main / root.
  - Commit attribution line.
  - A "Rules / decisions log" section we append to over time.

### Carbon dark tokens (in `styles.css` `:root`)
- background `#161616`, layer `#262626`/`#393939`, text `#f4f4f4` / secondary `#c6c6c6`, border-subtle `#393939`.
- primary button `#0f62fe` (hover `#0353e9`), secondary button `#6f6f6f` (hover `#5e5e5e`).
- Fonts: **IBM Plex Sans** + **IBM Plex Mono** via Google Fonts. Buttons: Carbon style — rectangular (no radius), 48px tall, uppercase-ish label, primary blue / secondary gray.
- Responsive: works at phone width, 16px side gutters, no horizontal scroll.

## Step 3 — Splash page (`index.html`)
- Minimal centered layout: project title ("HEADS"), a short **placeholder** blurb ("More info to come."), and a primary **LAUNCH** button linking to `play.html`.
- Nothing else — deliberately sparse.

## Step 4 — Game page (`play.html` + `app.js`)
**Layout:** a single vertically-stacked "reel" column, max-width ~420–520px, centered, framed with a subtle Carbon border so the near-black tiles read as panels. Three rows: **top / middle / bottom**, each showing one `<img>` slice at fixed row height (force uniform height to absorb the ~2px viewBox variance).

**Reels & data:** IDs generated programmatically `H01…H44` (zero-padded). Each row `pos ∈ {t,m,b}` uses `assets/svg/parts/${id}_${pos}.svg`. Preload all 132 optimized images (grouped by position) so `src` swaps are instant.

**Spin behavior (PLAY):**
- Disable PLAY, enable/keep RESET.
- Each reel rapidly cycles its slice (`setInterval` swapping `src`, ~60–80ms) with a subtle spin cue (slight vertical translate + blur via CSS class).
- **Staggered stop** (slot feel): top stops first, then middle, then bottom (e.g. +400ms each).
- Each reel lands on a target index determined by the outcome model (below), then removes the spin class and shows the final slice.
- On all reels stopped → evaluate win.

**Outcome model (RNG):**
- Default: each reel independent uniform over 44 → authentic ~1/1936 win.
- **Win = all three landed IDs identical** (the three thirds form one complete head).
- Dev overrides (Step 5) can force a win or boost win probability.

**Win handling:** if win → show a Carbon-style **modal placeholder** reading **"You win!"** (dark overlay, heading, "Play again" button that closes + resets). This is where the future winning animation asset will slot in — leave a clearly-commented hook.

**RESET:** stop any running spin intervals/timeouts, re-enable PLAY, return reels to a neutral initial state (e.g. `H01_t/_m/_b`, or a blank frame), close modal.

**Unlimited plays:** no play counter/limit (per requirements).

## Step 5 — Hidden DEV controls
- Revealed only via `?dev=1` URL param **or** a keyboard shortcut (e.g. press `d` three times / a small key combo). Hidden entirely otherwise.
- Small fixed-corner Carbon panel with two toggles:
  - **Force next win** — next PLAY rigs all three reels to the same random `H##`, then auto-clears.
  - **Boost odds** — while on, PLAY wins with elevated probability (e.g. ~15%) by forcing a match on that roll; otherwise random.
- Clearly commented as dev-only.

## Step 6 — Commit, push, enable Pages
- `git add -A` → commit → push to `origin main` (first push initializes the branch).
- Then (manual, user does in browser or I document): repo **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.
- Confirm the live URL: `https://audehelene.github.io/heads/`.

Attribution on the commit:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Critical files to create
- `index.html`, `play.html`, `styles.css`, `app.js` (repo root)
- `.nojekyll`, `.gitignore`, `README.md`, `svgo.config.js`
- Optimized: `assets/svg/parts/*.svg` (in place); originals moved to `assets/_originals/`

## Verification
1. **Local:** run a static server from repo root (`python -m http.server 8000`) → open `http://localhost:8000/`.
   - Splash renders; **LAUNCH** → `play.html`.
   - **PLAY** spins all three reels with staggered stop; slices render crisply.
   - **RESET** stops/returns to initial state; PLAY re-enabled.
   - `?dev=1`: **Force next win** → next spin lands three matching thirds → **"You win!"** modal. **Boost odds** → wins occur frequently.
   - Resize to phone width: no horizontal scroll, tiles scale.
2. **Post-deploy:** visit the Pages URL; confirm assets load over relative paths (not 404 under `/heads/`), spin works, mobile layout holds.
3. **Assets:** report SVGO before/after size; visually confirm optimized slices match originals.

---

# Iteration 2 — Arcade background + custom SVG buttons + responsive (2026-10-11)

## Context
New art drops the minimal Carbon game UI in favor of an arcade "machine"
graphic. Assets are in `assets/_backgrounds/` (pristine source), all on a
shared **1366×900** canvas so they layer pixel-perfectly:
- `Slot_Display_start2.svg` (3.1 MB, PNG-layered) — the full scene: gold
  frame with a black screen window, surrounded by scenery.
- `Play-{Default,Hover,Disabled}.svg` — play button, drawn at the **right**.
- `Reset-{Default,Hover,Disabled}.svg` — reset button, drawn at the **left**.

Goal: lay the slot heads inside the black screen, overlay the custom
buttons (default → hover → disabled while spinning), put HEADS title + home
link in the strip above the frame, scale the whole page off the background
width, and add a <576px layout where frame+heads go full-width and the
buttons stack below the frame.

**Decisions (confirmed):** splash stays minimal (this iteration only
touches `play.html`); ship the 3.1 MB background SVG as-is.

### Geometry (in the shared 1366×900 space → use as CSS % / variables)
- **Gold frame (outer):** x=357, y=41, w=651, h=801.
- **Black screen (heads go here):** x=375, y=59, w=616, h=766
  → left 27.45%, top 6.56%, width 45.10%, height 85.11% (aspect ≈ heads 0.80).
- **Play button (right):** x=1023, y=695, w=132, h=170
  → left 74.89%, top 77.22%, width 9.66%, height 18.89%.
- **Reset button (left):** x=178, y=695, w=146, h=172
  → left 13.03%, top 77.22%, width 10.69%, height 19.11%.
- **Title/home strip:** the band above the frame (y 0–41, ~4.5%); thin.
All values go into `:root`/`.stage` CSS variables so they're easy to nudge
after a visual check.

## Step A — Served + cropped assets (`assets/svg/ui/`)
Keep `assets/_backgrounds/` pristine. Create `assets/svg/ui/`:
- Copy `Slot_Display_start2.svg` as-is (the scene the page references).
- Make **cropped standalone buttons** by copying each button SVG and
  rewriting only its root `width/height/viewBox` to the button's bbox
  (content keeps absolute coords, so the new viewBox simply zooms to the
  button): e.g. `viewBox="1023 695 132 170"` for play, `"178 695 146 172"`
  for reset. Six files: `play-default/hover/disabled.svg`, `reset-*`.
  Cropped buttons are reused by BOTH the desktop (absolute at the sides) and
  mobile (stacked below) layouts.
- For the <576px full-width frame, reference the scene via CSS
  `background-position/size` cropped to the **gold-frame outer** bbox (no
  second 3.1 MB file); heads inset inside it.

## Step B — `play.html` structure
Replace the `.game` wrapper with a scalable **stage**:
```
<div class="stage" id="stage">
  <img class="stage__scene" src="assets/svg/ui/Slot_Display_start2.svg" />   (desktop scene; pointer-events none)
  <header class="stage__top"> HEADS … <a href="index.html">home</a> </header>
  <div class="machine is-cover" id="machine"> cover + 3 reels (unchanged) </div>
  <button class="gbtn gbtn--play"  id="play"  aria-label="Play"></button>
  <button class="gbtn gbtn--reset" id="reset" aria-label="Reset"></button>
</div>
```
Modal + dev panel stay as-is. Buttons are real `<button>`s with the cropped
art as `background-image` (default), swapped on `:hover` and on a spinning
state class — no inner imgs needed.

## Step C — `styles.css`
- **Stage scaling (width-driven, never overflows viewport height):**
  `.stage{ position:relative; width:min(100%, calc(100dvh * 1366/900));
  aspect-ratio:1366/900; margin:0 auto; container-type:inline-size; }`
  (body centers it). Use `cqw` units for title/home font so text scales
  with the stage.
- `.stage__scene{ position:absolute; inset:0; width:100%; height:100%;
  pointer-events:none; }`
- `.machine` → `position:absolute` at the black-screen %s above; keep the
  flex column + 1px gap + cover/reel rules. (Drop the old `.controls`,
  `.game`, `.game__header`, `.btn` game styles.)
- `.stage__top` absolutely positioned in the top band; HEADS left, home
  right, centered vertically.
- **Buttons:** each `.gbtn` absolutely positioned at its side bbox %;
  `background:center/contain no-repeat`. Default/hover/disabled driven by
  the cropped art:
  `.gbtn--play{background-image:url(.../play-default.svg)}`,
  `.gbtn--play:hover{...play-hover.svg}`,
  `.stage.is-spinning .gbtn--play{...play-disabled.svg; pointer-events:none}`
  (same pattern for reset). Both disabled together while spinning.
- **Responsive <576px** (`@media (max-width:575.98px)`):
  - `.stage` height becomes auto (frame + buttons-below), width 100%.
  - Show the **frame crop** full-width (scene background cropped to the gold
    frame via `background-position/size`); hide `.stage__scene` <img>.
  - `.machine` repositioned to the black-screen inset *within the frame
    crop* (≈ left 2.8%, top 2.3%, width 94.6%, height 95.6% of the frame box).
  - `.gbtn--play/.--reset` switch from absolute sides to normal flow in a
    row **below** the frame (flex, equal width, comfortable tap height),
    using the same cropped button art.

## Step D — `app.js`
- Add `var stage = document.getElementById('stage');`.
- `play()`: `stage.classList.add('is-spinning')` (drives both buttons'
  disabled art + blocks pointer events); remove the old
  `playBtn.disabled = true` styling reliance (keep a guard so re-clicks are
  ignored while spinning).
- End-of-spin callback and `reset()`: `stage.classList.remove('is-spinning')`.
- Everything else (reels, cover, outcome model, dev panel, modal) unchanged.

## Critical files
- `play.html`, `styles.css`, `app.js` (rework game layout)
- New: `assets/svg/ui/Slot_Display_start2.svg` + 6 cropped button SVGs
- Unchanged: `assets/_backgrounds/` stays pristine source; `index.html`,
  reels/cover/parts logic.

## Verification (Iteration 2)
1. Serve locally; open `play.html`:
   - Scene renders; heads sit **inside the black screen** (no overflow past
     the gold frame); nudge the black-screen CSS vars if slightly off.
   - HEADS title + home sit in the strip above the frame, legible.
   - Hovering Play/Reset shows the **hover** art; clicking Play → both
     buttons show **disabled** art and ignore clicks while the heads spin;
     on stop/RESET they return to default.
   - Confirm the scene doesn't itself draw buttons under our overlays
     (no doubled buttons); if it does, our state art covers them.
   - `?dev=1` force-win still reaches the "You win!" modal.
2. Resize: desktop scales off width and never overflows height; at **<576px**
   the frame+heads go full-width and Play/Reset stack **below** the frame,
   easily tappable; no horizontal scroll.
3. After approval + local pass: commit, push, confirm Pages rebuild, spot-
   check the live URL at desktop and phone widths.
