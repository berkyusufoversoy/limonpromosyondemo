/* Hero world intro - pure logic (no DOM). Classic script: sets window.HeroWorldCore,
   and module.exports when loaded via require(). */
(function () {
  'use strict';

  var BEATS = { arriveStart: 0.3, arriveEnd: 2.2, copyStart: 1.0, growStart: 2.2, growEnd: 3.8, restStart: 3.4, settle: 4.2, end: 5.0 };
  var MOBILE_FACTOR = 0.7;
  var SHORT_GROW = 1.0;
  var MAX_ZOOM = 1.15;
  var DUR = { drop: 0.55, rise: 0.8, slide: 0.9, unroll: 0.9, roll: 0.8, fold: 0.6 };

  // Image px -> box px for CSS `object-fit: cover` with `object-position` fractions (0..1).
  function coverRect(box, img, pos) {
    var scale = Math.max(box.w / img.w, box.h / img.h);
    var w = img.w * scale;
    var h = img.h * scale;
    return { x: (box.w - w) * pos.x, y: (box.h - h) * pos.y, w: w, h: h, scale: scale };
  }

  // Parses what getComputedStyle(img).objectPosition returns ("58% 50%", "63% center", "center", ...).
  function parseObjectPosition(css) {
    var tokens = String(css == null ? '' : css).trim().toLowerCase().split(/\s+/).filter(Boolean);
    var KEY = { left: 0, center: 0.5, right: 1, top: 0, bottom: 1 };
    var VERT = { top: true, bottom: true };
    var HORIZ = { left: true, right: true };

    function frac(t) {
      if (t in KEY) return KEY[t];
      var n = parseFloat(t);
      return isFinite(n) && /%$/.test(t) ? n / 100 : 0.5;
    }

    if (tokens.length === 0) return { x: 0.5, y: 0.5 };
    if (tokens.length === 1) {
      // A lone top/bottom keyword names the vertical axis; anything else is x.
      if (VERT[tokens[0]]) return { x: 0.5, y: frac(tokens[0]) };
      return { x: frac(tokens[0]), y: 0.5 };
    }
    var a = tokens[0];
    var b = tokens[1];
    // "top left" style: a vertical keyword first, a horizontal keyword second.
    if (VERT[a] || HORIZ[b]) return { x: frac(b), y: frac(a) };
    return { x: frac(a), y: frac(b) };
  }

  // Precedence: reducedMotion > ?intro=0 > ?intro=1 > rerender > stored.
  function decideIntroMode(opts) {
    var intro = null;
    try {
      intro = new URLSearchParams(opts.search || '').get('intro');
    } catch (e) {
      intro = null;
    }
    if (opts.reducedMotion) return 'static';
    if (intro === '0') return 'static';
    if (intro === '1') return 'full';
    if (opts.rerender) return 'static';
    if (opts.stored instanceof Error) return 'full';
    if (opts.stored === 'played') return 'short';
    return 'full';
  }

  // Whether the living-city loops run for this mount (opts as decideIntroMode, plus mode = its result and paused = the
  // user's motion pause at mount). Never under reduced motion or ?intro=0 (the static comparison mode); always after an
  // intro (full/short); and in static mode when the hero was already living (a re-render on home) or the user had paused
  // (the loops then start paused and resume on the toggle).
  function decideLoops(opts) {
    var intro = null;
    try {
      intro = new URLSearchParams(opts.search || '').get('intro');
    } catch (e) {
      intro = null;
    }
    if (opts.reducedMotion || intro === '0') return false;
    if (opts.mode === 'full' || opts.mode === 'short') return true;
    return !!(opts.rerender || opts.paused);
  }

  // Arrival schedule: every landmark, sorted by `order`. Animated ones are spaced evenly so the
  // last one finishes exactly at BEATS.arriveEnd. Landmarks whose box centre falls outside
  // `visible` ({x0, x1} in image px) are pre-placed and do not take part in the spacing.
  function buildSchedule(landmarks, opts) {
    opts = opts || {};
    var factor = opts.mobile ? MOBILE_FACTOR : 1;
    var visible = opts.visible;

    var sorted = landmarks.slice().sort(function (a, b) { return a.order - b.order; });
    var items = sorted.map(function (lm) {
      var cx = lm.box[0] + lm.box[2] / 2;
      var pre = !!visible && (cx < visible.x0 || cx > visible.x1);
      return { lm: lm, pre: pre };
    });
    var animated = items.filter(function (it) { return !it.pre; });
    var n = animated.length;
    var durLast = n ? DUR[animated[n - 1].lm.enter] : 0;
    var step = n > 1 ? (BEATS.arriveEnd - BEATS.arriveStart - durLast) / (n - 1) : 0;

    var i = 0;
    return items.map(function (it) {
      if (it.pre) return { id: it.lm.id, at: 0, dur: 0, prePlaced: true };
      var at = BEATS.arriveStart + i * step;
      i++;
      return { id: it.lm.id, at: at * factor, dur: DUR[it.lm.enter] * factor, prePlaced: false };
    });
  }

  var api = {
    BEATS: BEATS,
    MOBILE_FACTOR: MOBILE_FACTOR,
    SHORT_GROW: SHORT_GROW,
    MAX_ZOOM: MAX_ZOOM,
    DUR: DUR,
    coverRect: coverRect,
    parseObjectPosition: parseObjectPosition,
    decideIntroMode: decideIntroMode,
    decideLoops: decideLoops,
    buildSchedule: buildSchedule
  };

  if (typeof window !== 'undefined') window.HeroWorldCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
