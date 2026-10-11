/* Hero world stage. Classic script: sets window.HeroWorld = { mount }.
   mount(heroEl, { mode: 'full'|'short'|'static', loops, debugPlaced }) builds the layer stack over the hero image,
   aligned to it with the same cover-fit math the browser uses for object-fit, and returns cleanup().
   'full' plays the world-assembly intro (landmarks arrive on yellow, the city grows out from under them, hand-off to
   the real image); 'short' runs only the grow; 'static' adds no intro (debugPlaced shows the placed cutouts).
   loops (the caller's decision, HeroWorldCore.decideLoops) runs the living-city loops (startLoops): after the hand-off
   of 'full' / 'short', or straight away in 'static' (re-render on home, or paused at mount: they then start paused).
   Any failure inside mount, the intro or a later re-layout tears the layers down, warns once and leaves the static hero.
   Also: noteScreen(screen) / isRerender() (replay policy memory), skipToEnd() (fast-forward a running intro to its end
   state), setPaused(paused) (pauses / resumes the living-city loops). While the images decode the stage holds the yellow
   start state; if they are not ready after DECODE_TIMEOUT, or decoding fails, the stage crossfades to the static hero. */
(function () {
  'use strict';

  var YELLOW = '#f4ee00';
  var CAMERA_POINT = [0.58, 0.45]; // camera zooms around this image point (fractions of w, h)
  var CROSSFADE = 0.3;             // s, frame fades out over the shown image at hand-off
  var DECODE_TIMEOUT = 2500;       // ms after mount: base image + cutouts must be decoded by then, else the static hero
  var MASK_SCALE = 0.25;           // grow mask resolution relative to the image (it is soft, so low res is enough)
  var SHADOW_TYPES = { drop: 1, rise: 1, fold: 1 };

  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); }
  // Deterministic pseudo-random sequence (mulberry32), so every run of the intro grows the same way.
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function scaleBeats(beats, f) {
    var out = {};
    for (var k in beats) if (Object.prototype.hasOwnProperty.call(beats, k)) out[k] = beats[k] * f;
    return out;
  }

  // Wraps every word of the headline once in .w > span (masks for the rise), keeping <br> and <em>. Returns the inner spans.
  function wrapWords(h1) {
    if (!h1.querySelector('.w')) {
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
          if (ch.nodeType === 1) { if (ch.tagName !== 'BR') walk(ch); return; }
          if (ch.nodeType !== 3 || !/\S/.test(ch.nodeValue)) return;
          var frag = document.createDocumentFragment();
          ch.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = el('span', 'w'), inner = el('span');
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        });
      })(h1);
    }
    return Array.prototype.slice.call(h1.querySelectorAll('.w>span'));
  }

  // ---- World grow (canvas) -------------------------------------------------------------------------------------
  // Draws the stage for grow progress p (0..1) in image coordinates: yellow, then the base image through a soft mask
  // (lumpy blooms from under each landmark, a sweep from the left over the river, the sky wiping up from the horizon,
  // and a final fill so p = 1 is the plain image), then an additive sun glow that peaks mid-grow and is gone by p = 1.
  function makeGrow(ctx) {
    var data = ctx.data, W = data.image.w, H = data.image.h;
    // Radii accelerate (quad in): a bloom starts as a small seed under its landmark and then spreads, so coverage builds
    // across the whole grow window instead of flooding in its first third.
    var ease = gsap.parseEase('power2.inOut'), grow = gsap.parseEase('power1.in'), sweepEase = gsap.parseEase('power1.inOut');
    var n = data.landmarks.length;
    var blooms = [];
    data.landmarks.forEach(function (lm) {
      var r = rng(lm.order * 7919), R = 1.6 * Math.max(lm.box[2], lm.box[3]);
      var d = 0.5 * (lm.order - 1) / Math.max(1, n - 1);
      blooms.push({ x: lm.anchor[0], y: lm.anchor[1], R: R, d: d, span: 0.5 });
      for (var i = 0; i < 3; i++) {
        var a = r() * Math.PI * 2, dist = (0.25 + 0.3 * r()) * R;
        blooms.push({ x: lm.anchor[0] + Math.cos(a) * dist, y: lm.anchor[1] + Math.sin(a) * dist * 0.6, R: (0.4 + 0.3 * r()) * R, d: d + 0.04 + 0.12 * r(), span: 0.45 });
      }
    });
    // River / promenade sweep from the left (x < 520): a lumpy front of soft blobs, each row slightly out of step.
    var SWEEP_X = 520, SWEEP_R = 210, sweep = [], rs = rng(4242);
    for (var k = 0; k <= 9; k++) sweep.push({ y: k * H / 9, d: 0.06 * rs(), j: (rs() - 0.5) * 60 });
    function blob(m, x, y, r) {
      var g = m.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,1)');
      g.addColorStop(0.75, 'rgba(255,255,255,.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      m.fillStyle = g;
      m.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    var horizon = data.overlays.horizonY, sun = data.overlays.sun;
    var mask = document.createElement('canvas');
    mask.width = Math.round(W * MASK_SCALE);
    mask.height = Math.round(H * MASK_SCALE);
    var m = mask.getContext('2d');
    var phase = null;

    function drawMask(p) {
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.clearRect(0, 0, mask.width, mask.height);
      m.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
      m.globalAlpha = 1;
      blooms.forEach(function (b) {
        var q = clamp01((p - b.d) / b.span);
        if (q <= 0) return;
        blob(m, b.x, b.y, b.R * grow(q));
      });
      sweep.forEach(function (b) {
        var s = sweepEase(clamp01((p - b.d) / 0.75));
        if (s <= 0) return;
        var x = s * (SWEEP_X + SWEEP_R * 0.5) - SWEEP_R * 0.5 + b.j * s;
        m.fillStyle = '#fff';
        if (x > 0) m.fillRect(0, b.y - H / 18, x, H / 9);
        blob(m, x, b.y, SWEEP_R * Math.min(1, 0.4 + s * 3));
      });
      // Sky band: wipes upward from the horizon with a soft top edge.
      var v = ease(clamp01((p - 0.22) / 0.6));
      if (v > 0) {
        var FS = 150, top = horizon - v * (horizon + FS), bottom = horizon + 60;
        var sg = m.createLinearGradient(0, top, 0, bottom);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(clamp01(Math.min(FS, horizon - top) / (bottom - top)), 'rgba(255,255,255,1)');
        sg.addColorStop(clamp01((horizon - top) / (bottom - top)), 'rgba(255,255,255,1)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        m.globalAlpha = Math.min(1, v * 4);
        m.fillStyle = sg;
        m.fillRect(0, top, W, bottom - top);
        m.globalAlpha = 1;
      }
      // Everything else settles in at the end, so p = 1 is exactly the image.
      var fill = smooth(0.75, 1, p);
      if (fill > 0) {
        m.globalAlpha = fill;
        m.fillStyle = '#fff';
        m.fillRect(0, 0, W, H);
        m.globalAlpha = 1;
      }
    }

    // The base image: the device-pixel bitmap made by refreshBitmap() when it matches the canvas, else a scaled draw.
    function drawBase(g, c) {
      var bm = ctx.bitmap;
      if (bm && bm.width === c.width && bm.height === c.height) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(bm, 0, 0);
        g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
      } else {
        g.drawImage(ctx.img, 0, 0, W, H);
      }
    }

    return {
      reset: function () { phase = null; },
      // Frees the mask's backing store (hand-off: the grow never draws again).
      release: function () { mask.width = 0; mask.height = 0; },
      draw: function (p) {
        var c = ctx.canvas;
        if (!c) return; // released (hand-off / teardown)
        var g = c.getContext('2d');
        var key = p <= 0 ? 'yellow' : p >= 1 ? 'full' : 'grow';
        if (key !== 'grow' && key === phase) return; // redraw only during the grow window
        phase = key;
        g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        if (key === 'yellow') { g.fillStyle = YELLOW; g.fillRect(0, 0, W, H); return; }
        g.clearRect(0, 0, W, H);
        if (key === 'full') { drawBase(g, c); return; }
        drawMask(p);
        g.drawImage(mask, 0, 0, W, H);
        g.globalCompositeOperation = 'source-in';
        drawBase(g, c);
        g.globalCompositeOperation = 'destination-over';
        g.fillStyle = YELLOW;
        g.fillRect(0, 0, W, H);
        var glow = Math.pow(Math.sin(Math.PI * clamp01((p - 0.25) / 0.75)), 1.5) * 0.32;
        if (glow > 0.002) {
          g.globalCompositeOperation = 'lighter';
          var rg = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 380);
          rg.addColorStop(0, 'rgba(255,214,150,' + glow + ')');
          rg.addColorStop(0.35, 'rgba(255,170,80,' + glow * 0.4 + ')');
          rg.addColorStop(1, 'rgba(255,150,60,0)');
          g.fillStyle = rg;
          g.fillRect(sun[0] - 380, sun[1] - 380, 760, 760);
        }
        g.globalCompositeOperation = 'source-over';
      }
    };
  }

  // ---- Timeline --------------------------------------------------------------------------------------------------
  // ctx = { frame, cutouts: Map<id, el>, canvas, heroEl, data, mobile } plus mount internals (img, layers, cam, apply,
  // resolveDone). Every derived per-frame value (camera, shake, canvas, veil, layer fades, image visibility) is a pure
  // function of the timeline's clock, rendered through a getter/setter tween, so seek() is deterministic in both
  // directions and does not depend on callbacks.
  function buildTimeline(ctx, mode) {
    var core = window.HeroWorldCore, data = ctx.data, W = data.image.w, H = data.image.h;
    var full = mode === 'full';
    var f = ctx.mobile ? core.MOBILE_FACTOR : 1;
    var B = full ? scaleBeats(core.BEATS, f)
      : { arriveStart: 0, settle: core.SHORT_GROW, growStart: 0, growEnd: core.SHORT_GROW };
    var END = B.settle + CROSSFADE;
    var grow = makeGrow(ctx);
    var camEase = gsap.parseEase('power2.inOut'), veilEase = gsap.parseEase('power1.inOut');
    var landings = [];
    var stageScale = ctx.stageScale > 0 ? ctx.stageScale : 1;
    var zMax = core.MAX_ZOOM / stageScale, zStart = zMax;
    var earlyVeil = full && !ctx.mobile;
    var headlineEnd = full ? B.copyStart + 1.23 * f : 0; // refined below once the headline words are counted
    var tl = gsap.timeline({ paused: true });
    ctx.grow = grow;
    ctx.beats = B;

    function shakeAt(t) {
      var x = 0, y = 0;
      for (var i = 0; i < landings.length; i++) {
        var tau = t - landings[i].t;
        if (tau < 0 || tau > 0.45) continue;
        var a = landings[i].amp * Math.exp(-tau * 13);
        y += a * Math.cos(tau * 2 * Math.PI * 9);
        x += a * 0.3 * Math.sin(tau * 2 * Math.PI * 12);
      }
      return [Math.max(-3, Math.min(3, x)), Math.max(-3, Math.min(3, y))];
    }

    ctx.render = function (t) {
      if (ctx.handedOff) return;
      try { renderAt(t); } catch (e) { ctx.fail(e); }
    };
    function renderAt(t) {
      ctx.t = t;
      // The 1.15 cap is on the COMBINED scale: the stage's (paused) city-drift scale times the camera zoom.
      var z = full ? zStart - (zStart - 1) * camEase(clamp01((t - B.arriveStart) / (B.settle - B.arriveStart))) : 1;
      var sh = full ? shakeAt(t) : [0, 0];
      ctx.cam.zoom = Math.max(1, Math.min(zMax, z));
      ctx.cam.x = sh[0];
      ctx.cam.y = sh[1];
      ctx.apply();
      var p = clamp01((t - B.growStart) / (B.growEnd - B.growStart));
      grow.draw(p);
      var a = 0.42 * (1 - smooth(0.05, 0.7, p));
      // Written only on change: --hw-veil is inherited by the whole hero, so a needless write restyles the copy.
      // Veil: desktop full mode fades it to 0.85 from copyStart to the end of the headline reveal (the copy sits over the
      // stage there), and the grow completes it to 1. Mobile (copy above the stage band, on white) and short mode: grow only.
      var veil = veilEase(clamp01(p / 0.85));
      if (earlyVeil) veil = 0.85 * veilEase(clamp01((t - B.copyStart) / (headlineEnd - B.copyStart))) + 0.15 * veil;
      put('veil', String(+veil.toFixed(4)), function (v) { ctx.heroEl.style.setProperty('--hw-veil', v); });
      put('shadows', String(+(1 - smooth(0.05, 0.6, p)).toFixed(4)), function (v) { ctx.shadowLayer.style.opacity = v; });
      put('filter', a > 0.005 ? 'drop-shadow(3px 5px 7px rgba(70,52,0,' + a.toFixed(3) + '))' : 'none', function (v) { ctx.cutoutLayer.style.filter = v; });
      put('img', t >= B.settle ? '' : '0', function (v) { ctx.img.style.opacity = v; });
    }
    var written = {};
    function put(key, v, set) { if (written[key] !== v) { written[key] = v; set(v); } }
    var clock = { t: function (v) { if (!arguments.length) return ctx.t || 0; ctx.render(v); } };
    tl.fromTo(clock, { t: 0 }, { t: END, duration: END, ease: 'none' }, 0);

    // Landmark entrances. Mobile: landmarks whose centre lies outside the image x-range the stage shows (cover transform)
    // are pre-placed: in place on the yellow from the first frame, no entrance.
    var visible = null, v = ctx.view;
    if (ctx.mobile && v) {
      var ox = v.x0 / v.k;
      visible = { x0: -ox / v.sx, x1: (ctx.stage.clientWidth - ox) / v.sx };
    }
    var schedule = core.buildSchedule(data.landmarks, { mobile: !!ctx.mobile, visible: visible });
    var byId = {};
    data.landmarks.forEach(function (lm) { byId[lm.id] = lm; });
    var scale = ctx.view ? ctx.view.sx : 1;
    var dropY = -1.2 * window.innerHeight / (scale * core.MAX_ZOOM);
    schedule.forEach(function (s) {
      var lm = byId[s.id], c = ctx.cutouts.get(s.id), sh = ctx.shadowEls.get(s.id), dust = ctx.dustEls.get(s.id);
      var bx = lm.box[0], by = lm.box[1], at = s.at, dur = s.dur, prm = lm.params || {};
      gsap.set(c, { transformOrigin: (lm.anchor[0] - bx) + 'px ' + (lm.anchor[1] - by) + 'px' });
      if (!full || s.prePlaced) return;
      if (lm.enter === 'slide' || lm.enter === 'roll') {
        tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: dur * 0.22, ease: 'none' }, at);
      } else {
        gsap.set(c, { opacity: 0 });
        tl.set(c, { opacity: 1 }, at);
      }
      if (sh) gsap.set(sh, { opacity: 0 });
      switch (lm.enter) {
        case 'drop': {
          var fall = dur * 0.62, land = at + fall, spin = prm.spin || 0;
          tl.fromTo(c, { y: dropY, rotation: spin }, { y: 0, rotation: spin * -0.06, duration: fall, ease: 'power3.in' }, at);
          tl.to(c, { scaleX: 1.08, scaleY: 0.9, duration: 0.07 * f, ease: 'power2.out' }, land);
          tl.to(c, { scaleX: 1, scaleY: 1, rotation: 0, duration: 0.5 * f, ease: 'elastic.out(1,.55)' }, land + 0.07 * f);
          tl.fromTo(sh, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: fall, ease: 'power3.in', immediateRender: false }, at);
          tl.set(dust, { opacity: 0.95, scale: 0.5 }, land);
          tl.to(dust, { opacity: 0, scale: 1.55, duration: 0.6 * f, ease: 'power2.out' }, land);
          landings.push({ t: land, amp: lm.order === data.landmarks.length ? 3 : Math.max(1.5, Math.min(3, 1.5 + lm.box[2] * lm.box[3] / 60000)) });
          break;
        }
        case 'rise':
          tl.fromTo(c, { scaleY: 0 }, { scaleY: 1, duration: dur, ease: 'elastic.out(1,.6)' }, at);
          tl.fromTo(sh, { opacity: 0, scaleX: 0.5 }, { opacity: 1, scaleX: 1, duration: dur * 0.5, ease: 'power2.out', immediateRender: false }, at);
          break;
        case 'slide':
          tl.fromTo(c, { x: (prm.from || [0, 0])[0], y: (prm.from || [0, 0])[1] }, { x: 0, y: 0, duration: dur, ease: 'power3.out' }, at);
          break;
        case 'unroll': {
          var from = { left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)', top: 'inset(0% 0% 100% 0%)', bottom: 'inset(100% 0% 0% 0%)' }[prm.wipeFrom] || 'inset(0% 100% 0% 0%)';
          tl.fromTo(c, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur, ease: 'power2.inOut' }, at);
          break;
        }
        case 'roll':
          gsap.set(c, { transformOrigin: '50% 50%' });
          tl.fromTo(c, { x: (prm.from || [0, 0])[0], y: (prm.from || [0, 0])[1], rotation: 360 }, { x: 0, y: 0, rotation: 0, duration: dur, ease: 'power2.out' }, at);
          break;
        case 'fold':
          tl.fromTo(c, { scaleY: 0, skewX: 12 }, { scaleY: 1, skewX: 0, duration: dur, ease: 'power3.out' }, at);
          tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: dur * 0.6, ease: 'power2.out', immediateRender: false }, at);
          break;
      }
    });

    // Copy: kicker, headline words, highlight swipe, then lede, actions, signature, caption. Opacity/transform only, so
    // the CTA stays clickable throughout.
    if (full) {
      var copy = ctx.heroEl.querySelector('.world-copy');
      var q = function (sel) { return ctx.heroEl.querySelector(sel); };
      var kicker = copy && copy.querySelector('.home-kicker'), h1 = copy && copy.querySelector('h1');
      var cs = B.copyStart, rs = B.restStart;
      if (kicker) tl.fromTo(kicker, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 * f, ease: 'power2.out', clearProps: 'opacity,transform' }, cs);
      if (h1) {
        // The original markup comes back at hand-off (or on failure), so the word wrapping does not outlive the intro.
        if (!h1.querySelector('.w')) { ctx.h1 = h1; ctx.h1Html = h1.innerHTML; }
        var words = wrapWords(h1), masks = words.map(function (w) { return w.parentNode; });
        // The mask clip extends past the tight .92 line box so accents stay whole; it is dropped once the words are up,
        // because a clip-path also changes paint order against the em highlight (which overlaps line 1 when static).
        gsap.set(masks, { clipPath: 'inset(-0.3em -0.2em -0.3em -0.2em)' });
        tl.fromTo(words, { yPercent: 140 }, { yPercent: 0, duration: 0.75 * f, ease: 'power3.out', stagger: 0.09 * f, clearProps: 'transform' }, cs + 0.12 * f);
        headlineEnd = cs + (0.12 + 0.09 * (words.length - 1) + 0.75) * f;
        tl.set(masks, { clipPath: 'none' }, headlineEnd);
        var em = h1.querySelector('em');
        if (em) {
          var hi = 'rgb(244, 238, 0)';
          gsap.set(em, { backgroundColor: 'transparent', backgroundImage: 'linear-gradient(' + hi + ',' + hi + ')', backgroundRepeat: 'no-repeat', backgroundSize: '0% 100%', boxShadow: hi + ' 0px 0px 0px 0px' });
          tl.to(em, { backgroundSize: '100% 100%', duration: 0.45 * f, ease: 'power2.inOut' }, cs + 0.85 * f);
          tl.to(em, { boxShadow: hi + ' 8px 0px 0px 0px', duration: 0.12 * f, ease: 'none' }, cs + 1.18 * f);
          tl.set(em, { clearProps: 'backgroundColor,backgroundImage,backgroundRepeat,backgroundSize,boxShadow' }, cs + 1.32 * f);
        }
      }
      [[copy && copy.querySelector('p'), 0], [q('.world-copy .hero-actions'), 0.1], [q('.world-signature'), 0.2], [q('.world-caption'), 0.3]].forEach(function (it) {
        if (it[0]) tl.fromTo(it[0], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 * f, ease: 'power2.out', clearProps: 'opacity,transform' }, rs + it[1] * f);
      });
    }

    // Hand-off: the real image is shown at settle (render), the whole frame crossfades out over it, then handOff.
    tl.to(ctx.frame, { opacity: 0, duration: CROSSFADE, ease: 'power1.inOut' }, B.settle);
    tl.call(function () {
      if (tl.time() < END - 1e-3) return; // crossing backwards while scrubbing
      try { handOff(ctx); } catch (e) { ctx.fail(e); }
    }, null, END);
    return tl;
  }

  // ---- Living city -----------------------------------------------------------------------------------------------
  // Idle micro-motion after hand-off (full/short modes only, so never under reduced motion): a bass thump on the speaker
  // cone, a light glint sweeping the crystal tower, a gold second hand sweeping the watch dial, twinkling stadium
  // floodlights; plus pointer tilt and a scroll push on the stage. Overlays sit in .hw-overlays in image
  // px, so the frame's cover transform keeps them on their photo features. Mobile (<= 650 px): cone and glint only, no tilt
  // or push. Loops pause while the user has paused motion, the hero is out of view (.motion-visible) or the tab is hidden
  // (body.home-tab-hidden). Glows and the glint are near-white, where 'screen' blending equals plain alpha compositing
  // (true blending cannot reach the photo through the isolated frame anyway).
  // ctx = { data, overlays, stage, heroEl, mobile }. Returns { tweens, pause(), resume(), kill() }; tweens = the loops.
  var LOOP_FADE_DELAY = 0.4, LOOP_FADE = 1.4; // s: the overlays fade in after hand-off, so nothing pops
  var TILT_MAX = 1.2;                         // deg
  var PUSH_RATE = 0.12;                       // scroll push: stage scale 1 + PUSH_RATE * progress (capped, see push())
  function startLoops(ctx) {
    var data = ctx.data, ov = data.overlays, layer = ctx.overlays, heroEl = ctx.heroEl, stage = ctx.stage;
    var desktop = !ctx.mobile, MAX_ZOOM = window.HeroWorldCore.MAX_ZOOM;
    var tweens = [], extra = [], nodes = [], off = [];
    var userPaused = document.body.classList.contains('home-motion-paused'); // motion.js's pause choice (state.homeMotionPaused)
    var paused = null, killed = false;
    var rnd = rng(1729);
    // 2D transforms only: a 3D (layer-promoted) cone or hand re-layers the overlapping copy and shifts its antialiasing.
    var FLAT = { force3D: false };
    function add(n, b) {
      if (b) n.style.cssText += ';left:' + b[0] + 'px;top:' + b[1] + 'px;width:' + b[2] + 'px;height:' + b[3] + 'px';
      layer.appendChild(n);
      nodes.push(n);
      return n;
    }
    function listen(target, type, fn, opt) { target.addEventListener(type, fn, opt); off.push(function () { target.removeEventListener(type, fn, opt); }); }
    function setMask(n, value) { n.style.webkitMaskImage = value; n.style.maskImage = value; }
    var tilt = null, toX = null, toY = null;
    var pushNow = 1, prog = 0, pushOn = false, measureRaf = 0;
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    // A throw part-way through setup must not leave tweens, listeners or overlay nodes behind.
    try {
      gsap.set(layer, { opacity: 0 });
      extra.push(gsap.to(layer, { opacity: 1, duration: LOOP_FADE, delay: LOOP_FADE_DELAY, ease: 'power1.inOut' }));

      // Floodlights (desktop): small warm glows on the rim lights, each flickering on its own random timing.
      if (desktop) {
        ov.floodlights.forEach(function (pt) {
          var g = add(el('div', 'hw-flood'));
          g.style.left = pt[0] + 'px';
          g.style.top = pt[1] + 'px';
          gsap.set(g, { opacity: 0.5 + 0.5 * rnd() });
          tweens.push(gsap.to(g, { opacity: 'random(0.5, 1)', duration: 'random(0.18, 1.2)', ease: 'sine.inOut', repeat: -1, repeatRefresh: true }));
        });
      }

      // Speaker cone: the cone crop over its own pixels, a bass thump (quick out to 1.03, slower settle) about once a second.
      var cb = ov.speakerCone.box, cone = el('img', 'hw-cone');
      cone.src = ov.speakerCone.src;
      cone.alt = '';
      cone.draggable = false;
      add(cone, cb);
      tweens.push(gsap.timeline({ repeat: -1, repeatDelay: 0.38, defaults: FLAT })
        .to(cone, { scale: 1.03, duration: 0.08, ease: 'power2.out' })
        .to(cone, { scale: 1, duration: 0.54, ease: 'power2.inOut' }));

      // Crystal glint: a soft diagonal light band masked by the crystal cutout (glass only: faded out above the planter),
      // sweeping up the tower once every 6 s.
      var crystal = data.landmarks.filter(function (l) { return l.id === ov.crystal.id; })[0];
      if (crystal) {
        var gb = crystal.box, glint = add(el('div', 'hw-glint'), gb), band = el('div', 'hw-glint-band');
        setMask(glint, 'url("' + crystal.src + '"), linear-gradient(#000 74%, transparent 84%)');
        glint.appendChild(band);
        gsap.set(band, { rotation: -32, y: gb[3] + 70, force3D: false });
        tweens.push(gsap.timeline({ repeat: -1, defaults: FLAT })
          .to(band, { y: -170, duration: 1.6, ease: 'power1.inOut' }, 2.2)
          .set(band, { y: gb[3] + 70 }, 6));
      }

      // Watch second hand (desktop): a thin gold line in the dial plane (axes = the 3 and 12 o'clock marker vectors, fitted
      // to the photo), sweeping 360 deg per 60 s from the current real second; a faint offset twin is its shadow.
      if (desktop && ov.watch && ov.watch.axes) {
        var w = ov.watch, U = w.axes[0], V = w.axes[1], r = w.r;
        var hand = add(el('div', 'hw-second-hand'));
        hand.style.left = w.center[0] + 'px';
        hand.style.top = w.center[1] + 'px';
        hand.style.transform = 'matrix(' + [U[0] / r, U[1] / r, -V[0] / r, -V[1] / r, 0, 0].map(function (n) { return +n.toFixed(5); }).join(',') + ')';
        var tip = 0.9 * r, tail = 0.2 * r, arms = [];
        [[0.7, 0.9, 'hw-arm hw-arm-shadow'], [0, 0, 'hw-arm']].forEach(function (a) {
          var arm = el('div', a[2]);
          arm.style.cssText = 'left:' + (a[0] - 0.55) + 'px;top:' + (a[1] - tip) + 'px;height:' + (tip + tail) + 'px;transform-origin:0.55px ' + tip + 'px';
          hand.appendChild(arm);
          arms.push(arm);
        });
        var a0 = (Date.now() / 1000 % 60) * 6;
        tweens.push(gsap.fromTo(arms, { rotation: a0 }, { rotation: a0 + 360, duration: 60, ease: 'none', repeat: -1, force3D: false }));
      }

      // Tilt (desktop, fine pointer): the pointer leans the stage up to +-1.2 deg, eased; leaving the hero eases it back.
      // The `rotate` property composes with the city-drift `transform` animation on the same element; the hero supplies the
      // perspective (hw-tilt).
      tilt = { x: 0, y: 0 };
      if (desktop && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        heroEl.classList.add('hw-tilt');
        var writeTilt = function () {
          var a = Math.sqrt(tilt.x * tilt.x + tilt.y * tilt.y);
          stage.style.rotate = a < 1e-4 ? '' : tilt.x.toFixed(5) + ' ' + tilt.y.toFixed(5) + ' 0 ' + a.toFixed(5) + 'deg';
        };
        toX = gsap.quickTo(tilt, 'x', { duration: 0.9, ease: 'power3.out', onUpdate: writeTilt });
        toY = gsap.quickTo(tilt, 'y', { duration: 0.9, ease: 'power3.out', onUpdate: writeTilt });
        listen(heroEl, 'pointermove', function (e) {
          if (paused || e.pointerType === 'touch') return;
          var b = heroEl.getBoundingClientRect();
          var nx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width) * 2 - 1));
          var ny = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height) * 2 - 1));
          // Each axis reaches +-1.2 deg; the combined lean is capped at 1.2 deg too, so a corner (1.7 deg uncapped) cannot
          // pull a stage edge in far enough to show a hairline of the hero background.
          var len = Math.max(1, Math.sqrt(nx * nx + ny * ny));
          toX(-TILT_MAX * ny / len); // pointer side leans away
          toY(TILT_MAX * nx / len);
        }, { passive: true });
        listen(heroEl, 'pointerleave', function () { toX(0); toY(0); });
      }

      // Scroll push (desktop): as the hero leaves the viewport the stage scales 1 -> 1 + 0.12 * progress, capped so that
      // city-drift scale x push stays <= MAX_ZOOM (the drift is read live; +0.001 covers its one-frame advance). Held while
      // the loops are paused (the user's pause, the hero out of view, the tab hidden: the drift is paused then too).
      // Scroll progress is measured on scroll / resize only, coalesced to one rAF. push() joins the GSAP ticker only while it
      // has to follow the running drift (not paused, hero partly scrolled), so the ticker can sleep once the loops pause.
      if (desktop) {
        listen(window, 'scroll', scheduleMeasure, { passive: true });
        listen(window, 'resize', scheduleMeasure);
        off.push(function () {
          if (measureRaf) cancelAnimationFrame(measureRaf);
          measureRaf = 0;
          if (pushOn) gsap.ticker.remove(push);
          pushOn = false;
        });
      }

      var mo = new MutationObserver(update);
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      mo.observe(heroEl, { attributes: true, attributeFilter: ['class'] });
      off.push(function () { mo.disconnect(); });
      // Reduced motion switched on while the loops run: stop them for good.
      var onMq = function () { if (mq.matches) kill(); };
      if (mq.addEventListener) { mq.addEventListener('change', onMq); off.push(function () { mq.removeEventListener('change', onMq); }); }
      update();
    } catch (e) {
      kill();
      throw e;
    }

    function push() {
      if (paused || killed) return;
      var s = 1;
      if (prog > 0) {
        var m = /matrix\(([^,]+),\s*([^,]+)/.exec(getComputedStyle(stage).transform || '');
        var driftScale = m ? Math.sqrt(parseFloat(m[1]) * parseFloat(m[1]) + parseFloat(m[2]) * parseFloat(m[2])) || 1 : 1;
        s = Math.max(1, Math.min(1 + PUSH_RATE * prog, MAX_ZOOM / (driftScale + 0.001)));
      }
      if (Math.abs(s - pushNow) < 1e-5) return;
      pushNow = s;
      stage.style.scale = s === 1 ? '' : s.toFixed(5);
    }
    function syncPush() {
      var on = desktop && !killed && !paused && prog > 0;
      if (on === pushOn) return;
      pushOn = on;
      if (on) gsap.ticker.add(push); else gsap.ticker.remove(push);
    }
    function measure() {
      measureRaf = 0;
      if (killed) return;
      var b = heroEl.getBoundingClientRect();
      prog = b.height > 0 ? clamp01(-b.top / b.height) : 0;
      push();
      syncPush();
    }
    function scheduleMeasure() { if (desktop && !killed && !measureRaf) measureRaf = requestAnimationFrame(measure); }

    // Pause sources: the user's choice (setPaused), the hero out of view, the tab hidden. Without motion.js managing the
    // hero (no .motion-zone) it counts as in view.
    function inView() { return !heroEl.classList.contains('motion-zone') || heroEl.classList.contains('motion-visible'); }
    function update() {
      if (killed) return;
      var p = userPaused || document.body.classList.contains('home-tab-hidden') || !inView();
      if (p === paused) return;
      paused = p;
      tweens.concat(extra).forEach(function (t) { if (p) t.pause(); else t.resume(); });
      if (p && toX) { toX(0); toY(0); }
      if (p) syncPush(); else scheduleMeasure(); // resuming: re-measure (the page may have scrolled while paused)
    }

    function kill() {
      if (killed) return;
      killed = true;
      tweens.concat(extra).forEach(function (t) { t.kill(); });
      if (tilt) gsap.killTweensOf(tilt);
      off.forEach(function (f) { f(); });
      nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      layer.style.opacity = '';
      stage.style.removeProperty('rotate');
      stage.style.removeProperty('scale');
      if (!stage.getAttribute('style')) stage.removeAttribute('style');
      heroEl.classList.remove('hw-tilt');
    }
    return {
      tweens: tweens,
      pause: function () { userPaused = true; update(); },
      resume: function () { userPaused = false; update(); },
      kill: kill
    };
  }

  // Puts the headline's original markup back (the intro wrapped its words in .w > span masks).
  function restoreHeadline(ctx) {
    if (ctx.h1 && ctx.h1Html != null && ctx.h1.querySelector('.w')) ctx.h1.innerHTML = ctx.h1Html;
    ctx.h1 = null;
    ctx.h1Html = null;
  }

  // Releases what only the intro needed: the canvas and mask backing stores (the canvas alone is ~19 MB at DPR 2), the
  // device-pixel bitmap and the cutout / shadow / dust element maps. layout() skips the canvas once ctx.grow is null.
  function releaseIntro(ctx) {
    if (ctx.bitmap && ctx.bitmap.close) ctx.bitmap.close();
    ctx.bitmap = null;
    if (ctx.grow && ctx.grow.release) ctx.grow.release();
    ctx.grow = null;
    if (ctx.canvas) { ctx.canvas.width = 0; ctx.canvas.height = 0; }
    ctx.canvas = null;
    [ctx.cutouts, ctx.shadowEls, ctx.dustEls].forEach(function (m) { if (m && m.clear) m.clear(); });
  }

  // Removes the canvas, shadows and cutouts, shows the real image, keeps .hw-frame + .hw-overlays, resolves done.
  function handOff(ctx) {
    if (ctx.handedOff) return;
    ctx.handedOff = true;
    ctx.img.style.opacity = '';
    [ctx.canvas, ctx.shadowLayer, ctx.cutoutLayer].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    releaseIntro(ctx);
    restoreHeadline(ctx);
    ctx.frame.style.opacity = '';
    ctx.frame.style.willChange = 'auto';
    ctx.heroEl.classList.remove('hw-intro');
    ctx.heroEl.style.removeProperty('--hw-veil');
    ctx.cam.zoom = 1;
    ctx.cam.x = 0;
    ctx.cam.y = 0;
    ctx.apply();
    ctx.resolveDone();
    if (ctx.onHandOff) ctx.onHandOff();
  }

  // Replay-policy memory: render() reports every screen it renders (through stopHomepageMotion, before the new DOM), so a
  // render of 'home' straight after another render of 'home' is a re-render (menu toggle, cart...) and must not replay.
  var lastScreen = null;
  var lastRerender = false;
  function noteScreen(screen) {
    lastRerender = lastScreen === 'home' && screen === 'home';
    lastScreen = screen;
  }
  function isRerender() { return lastRerender; }

  // The mounted instance whose intro can be fast-forwarded (null when nothing animated is mounted).
  var current = null;
  // Jumps a running intro to its end state (copy shown, veil 1, image visible, crossfade done) and hands off; before the
  // assets are decoded it falls back to the static hero. Returns true when an intro was running, false otherwise.
  function skipToEnd() { return current ? current.skip() : false; }
  // The user's motion pause (motion.js applyPause) for the mounted hero's living-city loops. Quiet when nothing is mounted.
  function setPaused(paused) { if (current) current.setPaused(!!paused); }

  function mount(heroEl, opts) {
    opts = opts || {};
    var mode = opts.mode || 'static';
    var frame = null;
    var raf = 0;
    var ro = null;
    var warned = false;
    var alive = true;
    var ctx = null;
    var decodeTimer = 0;
    var fallingBack = false;
    var fadeTl = null;
    var unlisten = function () {};
    var loops = null;
    var self = {
      skip: function () { return skipToEnd_(); },
      setPaused: function (p) { if (loops) { if (p) loops.pause(); else loops.resume(); } }
    };
    var resolveDone = function () {};
    var state = { mode: mode, completed: false, timeline: null, done: Promise.resolve(), layout: function () {} };

    function onResize() { schedule(); }

    // Pre-resizes the base image to the canvas backing store ('low' = bilinear, which matches how Chrome rasters the
    // <img> itself, so canvas and image agree at hand-off even at phone-size downscales; it also saves resampling the
    // full image every grow frame). Best effort: on failure the canvas keeps drawing the scaled image.
    function refreshBitmap() {
      if (!ctx || !ctx.canvas || typeof window.createImageBitmap !== 'function') return Promise.resolve();
      var c = ctx.canvas, cw = c.width, ch = c.height;
      return window.createImageBitmap(ctx.img, { resizeWidth: cw, resizeHeight: ch, resizeQuality: 'low' }).then(function (b) {
        if (!alive || ctx.handedOff || c.width !== cw || c.height !== ch) { if (b.close) b.close(); return; }
        if (ctx.bitmap && ctx.bitmap.close) ctx.bitmap.close();
        ctx.bitmap = b;
        ctx.grow.reset();
        ctx.render(ctx.t || 0);
      }, function () {});
    }

    // Undo everything the intro changed on the hero, so a failure leaves exactly the static hero.
    function restoreHero() {
      if (!ctx) return;
      if (state.timeline) state.timeline.kill();
      ctx.handedOff = true;
      if (ctx.img) ctx.img.style.opacity = '';
      heroEl.classList.remove('hw-intro');
      heroEl.style.removeProperty('--hw-veil');
      var touched = heroEl.querySelectorAll('.world-copy .home-kicker,.world-copy h1 .w,.world-copy h1 .w>span,.world-copy h1 em,.world-copy p,.world-copy .hero-actions,.world-signature,.world-caption');
      if (touched.length) gsap.set(touched, { clearProps: 'all' });
      restoreHeadline(ctx);
    }

    function teardown() {
      alive = false;
      clearTimeout(decodeTimer);
      unlisten();
      if (current === self) current = null;
      if (fadeTl) fadeTl.kill();
      fadeTl = null;
      if (loops) loops.kill();
      loops = null;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onResize);
      if (ro) ro.disconnect();
      ro = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (state.timeline) state.timeline.kill();
      if (ctx) releaseIntro(ctx);
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      frame = null;
    }

    // Isolation: whatever goes wrong, leave the plain static hero and a one-line warning.
    function fail(err) {
      try { restoreHero(); } catch (e) { /* keep going: the frame still goes */ }
      teardown();
      state.mode = 'static';
      state.timeline = null;
      state.done = Promise.resolve();
      state.layout = function () {};
      resolveDone();
      window.__heroWorld = state;
      if (!warned) { warned = true; console.warn('HeroWorld disabled, showing the static hero:', err); }
    }

    // Decode timeout, decode failure, or a skip before the assets are ready: crossfade from the yellow start state to the
    // static hero (the image is shown under the fading frame while the copy, veil and image settle to their static state).
    // done resolves at the end, with mode 'static'. A real error (err) warns once.
    function fallbackStatic(err) {
      if (fallingBack || !alive || !ctx || ctx.handedOff) return;
      fallingBack = true;
      clearTimeout(decodeTimer);
      unlisten();
      state.mode = 'static';
      if (err && !warned) { warned = true; console.warn('HeroWorld disabled, showing the static hero:', err); }
      try {
        if (state.timeline) state.timeline.kill();
        state.timeline = null;
        ctx.img.style.opacity = '';
        var copyEls = heroEl.querySelectorAll('.world-copy .home-kicker,.world-copy h1 .w>span,.world-copy p,.world-copy .hero-actions,.world-signature,.world-caption');
        var veil = { v: parseFloat(getComputedStyle(heroEl).getPropertyValue('--hw-veil')) || 0 };
        fadeTl = gsap.timeline({ onComplete: function () {
          try { restoreHero(); } catch (e) { /* the frame still goes */ }
          teardown();
          state.layout = function () {};
          resolveDone();
        } });
        fadeTl.to(frame, { opacity: 0, duration: CROSSFADE, ease: 'power1.inOut' }, 0);
        if (copyEls.length) fadeTl.to(copyEls, { opacity: 1, y: 0, yPercent: 0, duration: CROSSFADE, ease: 'power1.inOut' }, 0);
        fadeTl.to(veil, { v: 1, duration: CROSSFADE, ease: 'power1.inOut', onUpdate: function () { heroEl.style.setProperty('--hw-veil', String(veil.v)); } }, 0);
      } catch (e) {
        fail(e);
      }
    }

    function skipToEnd_() {
      if (!alive || !ctx || ctx.handedOff || fallingBack) return false;
      if (!ctx.decoded) { fallbackStatic(null); return true; }
      try { state.timeline.progress(1, false); } catch (e) { fail(e); }
      return true;
    }

    function cleanup() {
      teardown();
      resolveDone();
      if (window.__heroWorld === state) delete window.__heroWorld;
    }

    // Static mode with loops (a re-render on home, or paused at mount): no intro, so the loops start as soon as their
    // overlay assets (cone crop, crystal mask) are decoded, with the usual fade-in. A failed asset leaves the static hero.
    function startStaticLoops() {
      var data = window.HERO_WORLD_DATA, ov = data.overlays;
      var crystal = data.landmarks.filter(function (l) { return l.id === ov.crystal.id; })[0];
      var srcs = [ov.speakerCone.src].concat(crystal ? [crystal.src] : []);
      frame.style.willChange = 'auto'; // nothing transforms the frame here; keep the copy above it uncomposited
      current = self;
      Promise.all(srcs.map(function (src) {
        var i = new Image();
        i.src = src;
        return i.decode ? i.decode() : new Promise(function (res, rej) { i.onload = res; i.onerror = rej; });
      })).then(function () {
        if (!alive || loops || reducedMotion()) return;
        try {
          loops = startLoops({
            data: data, overlays: frame.querySelector('.hw-overlays'), stage: heroEl.querySelector('.world-stage'), heroEl: heroEl,
            mobile: window.matchMedia('(max-width: 650px)').matches
          });
          state.loops = loops;
        } catch (e) { fail(e); }
      }, function () { /* an overlay asset is missing: the static hero simply stays still */ });
    }

    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        try { state.layout(); } catch (e) { fail(e); }
      });
    }

    try {
      var data = window.HERO_WORLD_DATA;
      var core = window.HeroWorldCore;
      var stage = heroEl && heroEl.querySelector('.world-stage');
      var img = stage && stage.querySelector('img.world-city');
      window.__heroWorld = state;
      if (!data || !core || !stage || !img) return cleanup;

      // Static mode adds nothing unless the debug flag asks for the placed cutouts, or the caller wants the living-city
      // loops (opts.loops, decided by motion.js via HeroWorldCore.decideLoops): then the frame holds only the overlays.
      var wantLoops = !!opts.loops;
      if (mode === 'static' && !opts.debugPlaced && !wantLoops) return cleanup;
      var animated = mode !== 'static';
      var layered = animated || !!opts.debugPlaced; // canvas, shadows and cutouts
      if ((animated || wantLoops) && typeof window.gsap === 'undefined') throw new Error('GSAP missing');

      var W = data.image.w, H = data.image.h;
      frame = el('div', 'hw-frame');
      // Only the added layers are decorative; the hero image underneath keeps its alt text for assistive technology.
      frame.setAttribute('aria-hidden', 'true');
      frame.style.width = W + 'px';
      frame.style.height = H + 'px';
      var canvas = el('canvas', 'hw-canvas');
      canvas.width = W;
      canvas.height = H;
      var shadows = el('div', 'hw-shadows');
      var cutouts = el('div', 'hw-cutouts');
      var overlays = el('div', 'hw-overlays');
      var cutoutMap = new Map(), shadowMap = new Map(), dustMap = new Map();
      (layered ? data.landmarks.slice() : []).sort(function (a, b) { return a.z - b.z; }).forEach(function (lm) {
        var c = el('img');
        c.src = lm.src;
        c.alt = '';
        c.draggable = false;
        c.setAttribute('data-id', lm.id);
        c.style.left = lm.box[0] + 'px';
        c.style.top = lm.box[1] + 'px';
        c.style.width = lm.box[2] + 'px';
        c.style.height = lm.box[3] + 'px';
        c.style.zIndex = String(lm.z);
        cutouts.appendChild(c);
        cutoutMap.set(lm.id, c);
        if (!animated || !SHADOW_TYPES[lm.enter]) return;
        // Soft contact shadow on the ground at the landmark's base; drops also get a dust ring.
        var sw = Math.max(36, Math.min(380, lm.box[2] * 0.95)), shh = Math.max(12, sw * 0.24);
        var s = el('div', 'hw-shadow');
        s.style.cssText = 'left:' + (lm.anchor[0] - sw / 2) + 'px;top:' + (lm.anchor[1] - shh * 0.6) + 'px;width:' + sw + 'px;height:' + shh + 'px';
        shadows.appendChild(s);
        shadowMap.set(lm.id, s);
        if (lm.enter !== 'drop') return;
        var dw = sw * 1.5, dh = dw * 0.3;
        var d = el('div', 'hw-dust');
        d.style.cssText = 'left:' + (lm.anchor[0] - dw / 2) + 'px;top:' + (lm.anchor[1] - dh * 0.55) + 'px;width:' + dw + 'px;height:' + dh + 'px;opacity:0';
        shadows.appendChild(d);
        dustMap.set(lm.id, d);
      });
      if (layered) {
        frame.appendChild(canvas);
        frame.appendChild(shadows);
        frame.appendChild(cutouts);
      }
      frame.appendChild(overlays);
      stage.appendChild(frame);
      // Without hero-world.css (failed to load) the layers would sit in the flow, misaligned: show the static hero.
      if (getComputedStyle(frame).position !== 'absolute') throw new Error('hero-world.css not applied');

      var cam = { zoom: 1, x: 0, y: 0 };
      var view = null; // { x0, y0, x1, y1, k, sx, sy }: the layout's snapped cover transform
      // Base transform from layout() (the single source), then shake (CSS px, before the base) and camera zoom around
      // CAMERA_POINT (image px, after the base). With zoom 1 and no shake it is exactly the layout transform.
      var apply = function () {
        if (!view || !frame) return;
        var t = 'translate(' + (view.x0 / view.k + cam.x) + 'px,' + (view.y0 / view.k + cam.y) + 'px) scale(' + view.sx + ',' + view.sy + ')';
        if (cam.zoom !== 1) {
          var z = cam.zoom, px = CAMERA_POINT[0] * W, py = CAMERA_POINT[1] * H;
          t += ' translate(' + px * (1 - z) + 'px,' + py * (1 - z) + 'px) scale(' + z + ')';
        }
        frame.style.transform = t;
      };

      // Maps image px -> stage px the way Chrome paints object-fit: cover for the hero image. Chrome (which lays out
      // in device pixels) does the cover math in 1/64 px units, then snaps the destination rect to whole DEVICE
      // pixels, measured against the page origin (so the stage's own fractional device offset matters), and stretches
      // the image to the snapped rect. Doing the same keeps the cutouts pixel-aligned; the exact fractional cover rect
      // is up to half a device pixel off. Verified with a genuine --force-device-scale-factor of 1, 1.25, 1.5, 2 and
      // 2.625 (tools/verify/align.mjs). puppeteer's emulated deviceScaleFactor snaps in CSS px instead and is not
      // representative.
      state.layout = function layout() {
        var cs = getComputedStyle(img);
        var st = getComputedStyle(stage);
        var k = window.devicePixelRatio || 1;
        var lu = function (v) { return Math.floor(v * 64) / 64; };
        var snap = function (v) { return Math.floor(v + 0.5); };
        var box = { w: lu(parseFloat(cs.width) * k), h: lu(parseFloat(cs.height) * k) };
        if (!(box.w > 0 && box.h > 0)) return;
        var hr = heroEl.getBoundingClientRect();
        var ax = (hr.left + window.pageXOffset + (parseFloat(st.left) || 0)) * k;
        var ay = (hr.top + window.pageYOffset + (parseFloat(st.top) || 0)) * k;
        var r = core.coverRect(box, { w: W, h: H }, core.parseObjectPosition(cs.objectPosition));
        var x0 = snap(ax + lu(r.x)) - snap(ax), y0 = snap(ay + lu(r.y)) - snap(ay);
        var x1 = snap(ax + lu(r.x) + lu(r.w)) - snap(ax), y1 = snap(ay + lu(r.y) + lu(r.h)) - snap(ay);
        view = { x0: x0, y0: y0, x1: x1, y1: y1, k: k, sx: (x1 - x0) / (W * k), sy: (y1 - y0) / (H * k) };
        if (ctx) ctx.view = view;
        apply();
        // Sharp canvas: backing store at the frame's device-pixel size; resizing clears it, so redraw the current state.
        // Skipped once the intro has released its canvas (ctx.grow and ctx.canvas are null after hand-off).
        var cv = ctx && ctx.grow && !ctx.handedOff ? ctx.canvas : null;
        if (cv) {
          var cw = Math.max(1, x1 - x0), ch = Math.max(1, y1 - y0);
          if (cv.width !== cw || cv.height !== ch) {
            cv.width = cw;
            cv.height = ch;
            ctx.grow.reset();
            ctx.render(ctx.t || 0);
            if (ctx.decoded) refreshBitmap();
          }
        }
      };

      window.addEventListener('resize', onResize);
      window.addEventListener('load', onResize);
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(schedule);
        ro.observe(stage);
        ro.observe(heroEl);
      }
      state.layout();
      if (!animated) {
        if (wantLoops) startStaticLoops();
        return cleanup;
      }

      // Intro: start state (yellow, veil off, copy hidden, camera in), play once the image and cutouts are decoded.
      ctx = {
        frame: frame, cutouts: cutoutMap, canvas: canvas, heroEl: heroEl, data: data,
        mobile: window.matchMedia('(max-width: 650px)').matches,
        img: img, shadowLayer: shadows, cutoutLayer: cutouts, shadowEls: shadowMap, dustEls: dustMap,
        view: view, cam: cam, apply: apply, handedOff: false, t: 0, stage: stage, overlays: overlays,
        resolveDone: function () { state.completed = true; unlisten(); resolveDone(); }, fail: fail,
        // Living city: starts a microtask after hand-off, so a pause pressed during the intro (which skips to the end and
        // then marks the body paused) is already visible to the loops when they start.
        onHandOff: function () {
          Promise.resolve().then(function () {
            if (!wantLoops || !alive || loops || (state.mode !== 'full' && state.mode !== 'short') || reducedMotion()) return;
            try { loops = startLoops(ctx); state.loops = loops; } catch (e) { fail(e); }
          });
        }
      };
      // Fast-forward triggers while the intro runs: a click on the CTA (the app still handles it and navigates), keyboard
      // focus entering the copy (tabbing to the CTA), scrolling past 40% of the hero, the tab going hidden, and reduced
      // motion being switched on.
      var copyEl = heroEl.querySelector('.world-copy');
      var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onClick = function (e) { var n = e.target; if (n && n.closest && n.closest('.world-copy .home-button,.world-copy .hero-actions')) skipToEnd_(); };
      var onFocus = function () { skipToEnd_(); };
      var onScroll = function () { var h = heroEl.offsetHeight; if (h > 0 && window.pageYOffset > 0.4 * h) skipToEnd_(); };
      var onHidden = function () { if (document.hidden) skipToEnd_(); };
      var onReduce = function () { if (rmq.matches) skipToEnd_(); };
      heroEl.addEventListener('click', onClick, true);
      if (copyEl) copyEl.addEventListener('focusin', onFocus);
      window.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('visibilitychange', onHidden);
      if (rmq.addEventListener) rmq.addEventListener('change', onReduce);
      unlisten = function () {
        heroEl.removeEventListener('click', onClick, true);
        if (copyEl) copyEl.removeEventListener('focusin', onFocus);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('visibilitychange', onHidden);
        if (rmq.removeEventListener) rmq.removeEventListener('change', onReduce);
        unlisten = function () {};
      };
      current = self;
      state.done = new Promise(function (r) { resolveDone = r; });
      // hw-intro also pauses the stage's city-drift (CSS), so its scale holds still for the whole intro and resumes from
      // the same frame after hand-off; read that scale now so the camera keeps stage x camera <= MAX_ZOOM.
      heroEl.classList.add('hw-intro');
      var m = /matrix\(([^,]+),\s*([^,]+)/.exec(getComputedStyle(stage).transform || '');
      ctx.stageScale = m ? Math.sqrt(parseFloat(m[1]) * parseFloat(m[1]) + parseFloat(m[2]) * parseFloat(m[2])) || 1 : 1;
      state.timeline = buildTimeline(ctx, mode);
      state.layout();
      var decode = function (i) { return i.decode ? i.decode() : Promise.resolve(); };
      decodeTimer = setTimeout(function () { if (!ctx.decoded) fallbackStatic(null); }, DECODE_TIMEOUT);
      Promise.all([decode(img)].concat(Array.prototype.map.call(cutouts.querySelectorAll('img'), decode))).then(function () {
        if (!alive || fallingBack) return;
        clearTimeout(decodeTimer);
        ctx.decoded = true;
        return refreshBitmap();
      }).then(function () {
        if (alive && !fallingBack && !ctx.handedOff && state.timeline) state.timeline.play();
      }, function (e) { if (alive) fallbackStatic(e); });
    } catch (e) {
      fail(e);
    }
    return cleanup;
  }

  window.HeroWorld = { mount: mount, noteScreen: noteScreen, isRerender: isRerender, skipToEnd: skipToEnd, setPaused: setPaused };
})();
