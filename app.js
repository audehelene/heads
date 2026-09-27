/* ============================================================
   HEADS — slot machine logic
   Three reels (top/middle/bottom). Each cycles through the 44
   head variants of its slice and settles on a random one.
   A win = all three landed on the SAME head (H##), i.e. the
   three thirds form one complete original design.
   ============================================================ */

(function () {
  'use strict';

  // ---- Data ------------------------------------------------
  var HEAD_COUNT = 44;              // H01 .. H44
  var POSITIONS = ['t', 'm', 'b'];  // top, middle, bottom
  var PARTS_DIR = 'assets/svg/parts/';
  var COVER_SRC = 'assets/svg/cover/000_FRONT.svg';

  // Build the list of head ids: H01, H02, ... H44
  var HEADS = [];
  for (var i = 1; i <= HEAD_COUNT; i++) {
    HEADS.push('H' + String(i).padStart(2, '0'));
  }

  function srcFor(headId, pos) {
    return PARTS_DIR + headId + '_' + pos + '.svg';
  }

  function randIndex() {
    return Math.floor(Math.random() * HEAD_COUNT);
  }

  // ---- DOM -------------------------------------------------
  var machine = document.getElementById('machine');
  var reels = {
    t: document.getElementById('reel-t'),
    m: document.getElementById('reel-m'),
    b: document.getElementById('reel-b'),
  };
  var reelWraps = {
    t: reels.t.closest('.reel'),
    m: reels.m.closest('.reel'),
    b: reels.b.closest('.reel'),
  };
  var playBtn = document.getElementById('play');
  var resetBtn = document.getElementById('reset');
  var modal = document.getElementById('modal');
  var modalClose = document.getElementById('modal-close');

  // ---- Preload all 132 slices so src swaps are instant -----
  var preloaded = [];
  function preload() {
    var cover = new Image();
    cover.src = COVER_SRC;
    preloaded.push(cover);
    for (var p = 0; p < POSITIONS.length; p++) {
      for (var h = 0; h < HEADS.length; h++) {
        var img = new Image();
        img.src = srcFor(HEADS[h], POSITIONS[p]);
        preloaded.push(img);
      }
    }
  }

  // ---- State -----------------------------------------------
  var spinning = false;
  var intervals = { t: null, m: null, b: null };
  var timeouts = [];
  var landed = { t: 0, m: 0, b: 0 }; // index into HEADS per reel

  // ---- Rendering -------------------------------------------
  function showSlice(pos, headIndex) {
    reels[pos].src = srcFor(HEADS[headIndex], pos);
  }

  function setInitial() {
    // Landing state: show the cover art over the (reset) reels.
    machine.classList.add('is-cover');
    for (var p = 0; p < POSITIONS.length; p++) {
      landed[POSITIONS[p]] = 0; // H01
      showSlice(POSITIONS[p], 0);
    }
  }

  // ---- Outcome model ---------------------------------------
  // Returns { t, m, b } indices into HEADS for this spin.
  function decideOutcome() {
    // Dev: force a guaranteed win on this spin.
    if (devForce && devForce.checked) {
      var w = randIndex();
      devForce.checked = false; // one-shot
      return { t: w, m: w, b: w };
    }
    // Dev: boosted odds -> ~15% chance of a rigged match.
    if (devBoost && devBoost.checked && Math.random() < 0.15) {
      var b = randIndex();
      return { t: b, m: b, b: b };
    }
    // Authentic: each reel independent (~1/1936 to match all three).
    return { t: randIndex(), m: randIndex(), b: randIndex() };
  }

  // ---- Spin ------------------------------------------------
  var CYCLE_MS = 70;      // how fast slices flicker while spinning
  var BASE_STOP = 800;    // first reel stop delay
  var STAGGER = 450;      // extra delay per subsequent reel

  function startReelCycle(pos) {
    reelWraps[pos].classList.add('is-spinning');
    intervals[pos] = setInterval(function () {
      showSlice(pos, randIndex());
    }, CYCLE_MS);
  }

  function stopReel(pos, finalIndex) {
    clearInterval(intervals[pos]);
    intervals[pos] = null;
    reelWraps[pos].classList.remove('is-spinning');
    landed[pos] = finalIndex;
    showSlice(pos, finalIndex);
  }

  function play() {
    if (spinning) return;
    spinning = true;
    machine.classList.remove('is-win');
    machine.classList.remove('is-cover'); // reveal the reels
    playBtn.disabled = true;

    var outcome = decideOutcome();

    POSITIONS.forEach(function (pos) {
      startReelCycle(pos);
    });

    // Staggered stop: top, then middle, then bottom.
    POSITIONS.forEach(function (pos, idx) {
      var t = setTimeout(function () {
        stopReel(pos, outcome[pos]);
        if (idx === POSITIONS.length - 1) {
          spinning = false;
          playBtn.disabled = false;
          evaluate();
        }
      }, BASE_STOP + idx * STAGGER);
      timeouts.push(t);
    });
  }

  function evaluate() {
    var win = landed.t === landed.m && landed.m === landed.b;
    if (win) {
      machine.classList.add('is-win');
      // HOOK: swap this modal for the winning animation asset when ready.
      openModal();
    }
  }

  function reset() {
    // Stop any running spin.
    POSITIONS.forEach(function (pos) {
      if (intervals[pos]) { clearInterval(intervals[pos]); intervals[pos] = null; }
      reelWraps[pos].classList.remove('is-spinning');
    });
    timeouts.forEach(clearTimeout);
    timeouts = [];
    spinning = false;
    playBtn.disabled = false;
    machine.classList.remove('is-win');
    closeModal();
    setInitial();
  }

  // ---- Modal -----------------------------------------------
  function openModal() { modal.classList.add('is-open'); }
  function closeModal() { modal.classList.remove('is-open'); }

  // ---- Dev panel (hidden unless ?dev=1 or 'd' pressed 3x) ---
  var devPanel = document.getElementById('dev');
  var devForce = document.getElementById('dev-force');
  var devBoost = document.getElementById('dev-boost');

  function maybeShowDev() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('dev') === '1') devPanel.classList.add('is-visible');
  }

  // Secret unlock: press "d" three times quickly.
  var dTaps = [];
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'd') return;
    var now = Date.now();
    dTaps.push(now);
    dTaps = dTaps.filter(function (t) { return now - t < 800; });
    if (dTaps.length >= 3) {
      devPanel.classList.toggle('is-visible');
      dTaps = [];
    }
  });

  // ---- Wire up ---------------------------------------------
  playBtn.addEventListener('click', play);
  resetBtn.addEventListener('click', reset);
  modalClose.addEventListener('click', reset);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  preload();
  setInitial();
  maybeShowDev();
})();
