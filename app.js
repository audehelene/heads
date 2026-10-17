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

  // Background scenes: start2 is the landing scene; 001..009 are cycled
  // (behind the frame + buttons) while the reels spin.
  var SCENE_START = 'assets/svg/ui/Slot_Display_start2.svg';
  var SCENES = [];
  for (var s = 1; s <= 9; s++) {
    SCENES.push('assets/_backgrounds/Slot_Display_' + String(s).padStart(3, '0') + '.svg');
  }

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
  var stage = document.getElementById('stage');
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
  var scene = document.querySelector('.stage__scene');
  var playBtn = document.getElementById('play');
  var resetBtn = document.getElementById('reset');
  var modal = document.getElementById('modal');
  var modalClose = document.getElementById('modal-close');
  var qrEl = document.getElementById('qr');
  var winCodeEl = document.getElementById('win-code');
  var claimLink = document.getElementById('claim-link');

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
    // Scenes are large (~3MB each); preload them a beat later so the
    // landing paints first. They only need to be ready by the first PLAY.
    setTimeout(function () {
      for (var n = 0; n < SCENES.length; n++) {
        var sc = new Image();
        sc.src = SCENES[n];
        preloaded.push(sc);
      }
    }, 1200);
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
  var CYCLE_MS = 70;         // how fast slices flicker while spinning
  var SCENE_CYCLE_MIN = 160;  // background scene cycle: random 160-260ms
  var SCENE_CYCLE_MAX = 260;
  var BASE_STOP = 800;       // first reel stop delay
  var STAGGER = 450;         // extra delay per subsequent reel

  function startReelCycle(pos) {
    reelWraps[pos].classList.add('is-spinning');
    intervals[pos] = setInterval(function () {
      showSlice(pos, randIndex());
    }, CYCLE_MS);
  }

  // Cycle the background scene (behind the frame + buttons) while spinning.
  // EXPERIMENT: crossfade between scenes, and extend the artwork outward with
  // horizontally-mirrored "wings" so there's no black gap on the sides (up to
  // ~2066px wide). Each layer drives center + both wings from one CSS custom
  // property (--scene-url), so one assignment updates all three.
  var SCENE_FADE_MS = 180;
  var Scenes = (function () {
    var host = scene; // the original <img class="stage__scene"> placeholder
    if (!host) {
      var noop = function () {};
      return { startCycle: noop, stopCycle: noop, pulseToDefault: noop,
        setDefaultNow: noop, isDefault: function () { return true; } };
    }
    var parent = host.parentNode;
    function makeLayer() {
      var layer = document.createElement('div');
      layer.className = 'scene-layer';
      layer.innerHTML =
        '<div class="scene-fill"></div>' +
        '<div class="scene-wing scene-wing--left"></div>' +
        '<div class="scene-wing scene-wing--right"></div>';
      parent.insertBefore(layer, host);
      return layer;
    }
    var a = makeLayer();
    var b = makeLayer();
    host.style.display = 'none'; // retire the original single <img>

    function url(src) { return 'url("' + src + '")'; }
    function setUrl(layer, src) { layer.style.setProperty('--scene-url', url(src)); }
    function setFade(layer, ms) { layer.style.transition = 'opacity ' + ms + 'ms linear'; }

    setFade(a, SCENE_FADE_MS); setFade(b, SCENE_FADE_MS);
    a.style.opacity = '1'; b.style.opacity = '0';
    setUrl(a, SCENE_START); setUrl(b, SCENE_START);
    var frontIsA = true;
    var cycleId = null;
    var pulseId = null;
    function clearPulse() { if (pulseId) { clearTimeout(pulseId); pulseId = null; } }

    function settle() {
      var vis = frontIsA ? a : b;
      a.style.setProperty('--scene-url', vis.style.getPropertyValue('--scene-url'));
      a.style.opacity = '1'; b.style.opacity = '0'; frontIsA = true;
    }
    return {
      startCycle: function () {
        clearPulse();
        (function tick() {
          var back = frontIsA ? b : a;
          var front = frontIsA ? a : b;
          setFade(back, SCENE_FADE_MS); setFade(front, SCENE_FADE_MS);
          setUrl(back, SCENES[Math.floor(Math.random() * SCENES.length)]);
          back.style.opacity = '1'; front.style.opacity = '0';
          frontIsA = !frontIsA;
          var delay = SCENE_CYCLE_MIN + Math.random() * (SCENE_CYCLE_MAX - SCENE_CYCLE_MIN);
          cycleId = setTimeout(tick, delay);
        })();
      },
      stopCycle: function () {
        if (cycleId) { clearTimeout(cycleId); cycleId = null; }
        settle();
      },
      isDefault: function () {
        return (frontIsA ? a : b).style.getPropertyValue('--scene-url')
          .indexOf('Slot_Display_start2.svg') !== -1;
      },
      // When the reels stop: flash to the default dark frame and back to the
      // landed scene `times` times, then one more flash that LANDS on the
      // default dark frame (settle() must have run first).
      pulseToDefault: function (times, onDone) {
        clearPulse();
        var FADE = 480;  // crossfade duration per flash
        var STEP = 480;  // time between flash toggles
        setFade(b, FADE);
        setUrl(b, SCENE_START);
        b.style.opacity = '0';
        void b.offsetWidth; // flush baseline
        var step = 0;
        var total = times * 2 + 1; // round trips + final land on default
        (function next() {
          if (step >= total) {
            // Ended showing the default (b). Consolidate onto A = default.
            setUrl(a, SCENE_START);
            a.style.opacity = '1';
            b.style.opacity = '0';
            frontIsA = true;
            setFade(b, SCENE_FADE_MS); // restore cycle fade
            pulseId = null;
            if (onDone) onDone();      // pulsing finished
            return;
          }
          b.style.opacity = (step % 2 === 0) ? '1' : '0'; // even->default, odd->landed
          step++;
          pulseId = setTimeout(next, STEP);
        })();
      },
      setDefaultNow: function () {
        clearPulse();
        setUrl(a, SCENE_START);
        a.style.opacity = '1'; b.style.opacity = '0'; frontIsA = true;
      }
    };
  })();
  function startSceneCycle() { Scenes.startCycle(); }
  function stopSceneCycle() { Scenes.stopCycle(); }

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
    stage.classList.add('is-spinning');   // both buttons -> disabled art

    var outcome = decideOutcome();

    startSceneCycle(); // cycle the background behind the frame

    POSITIONS.forEach(function (pos) {
      startReelCycle(pos);
    });

    // Staggered stop: top, then middle, then bottom.
    POSITIONS.forEach(function (pos, idx) {
      var t = setTimeout(function () {
        stopReel(pos, outcome[pos]);
        if (idx === POSITIONS.length - 1) {
          stopSceneCycle(); // background lands on its last scene
          evaluate();
          // Keep both buttons disabled through the whole background pulse;
          // re-enable only once the pulsing finishes.
          Scenes.pulseToDefault(3, function () {
            spinning = false;
            stage.classList.remove('is-spinning');
          });
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
      showWin();
    }
  }

  // ---- Win reward: unique code + QR to the claim form ------
  function makeCode() {
    var t = Date.now().toString(36).toUpperCase();
    var r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'H-' + t + '-' + r;
  }

  function showWin() {
    var code = makeCode();
    var ts = Date.now();
    // Absolute URL so the QR works when scanned on a phone (live Pages URL).
    var claimUrl = new URL(
      'claim.html?id=' + encodeURIComponent(code) + '&t=' + ts,
      window.location.href
    ).href;

    if (winCodeEl) winCodeEl.textContent = code;
    if (claimLink) claimLink.href = claimUrl;

    // Render the QR (qrcodejs from CDN). If it fails, the link + code remain.
    if (qrEl) {
      qrEl.innerHTML = '';
      try {
        /* global QRCode */
        new QRCode(qrEl, {
          text: claimUrl,
          width: 180,
          height: 180,
          colorDark: '#161616',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) {
        qrEl.textContent = 'QR unavailable — use the link below.';
      }
    }

    openModal();
  }

  function reset() {
    // Stop any running spin.
    POSITIONS.forEach(function (pos) {
      if (intervals[pos]) { clearInterval(intervals[pos]); intervals[pos] = null; }
      reelWraps[pos].classList.remove('is-spinning');
    });
    stopSceneCycle();
    Scenes.setDefaultNow(); // back to the landing scene
    timeouts.forEach(clearTimeout);
    timeouts = [];
    spinning = false;
    stage.classList.remove('is-spinning');
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
