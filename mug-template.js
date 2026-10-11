var LimonMugTemplate = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var stdin_exports = {};
  __export(stdin_exports, {
    clampMugLayer: () => clampMugLayer,
    mugAxes: () => mugAxes,
    mugBounds: () => mugBounds,
    mugMargin: () => mugMargin,
    mugPresets: () => mugPresets,
    mugTemplate: () => mugTemplate,
    supportsMug: () => supportsMug,
    validMugLayer: () => validMugLayer,
    validateMug: () => validateMug
  });
  const mugTemplate = Object.freeze({ id: "ceramic-80x95-v1", version: 1, width: 200, height: 80, safe: 5, diameter: 80, bodyHeight: 95, clearance: 7.5, estimated: true });
  const products = /* @__PURE__ */ new Set(["4205", "limon-8662", "limon-8661", "limon-9233"]);
  function supportsMug(p) {
    return products.has(p?.id);
  }
  const mugAxes = Object.freeze({ A: 100 - Math.PI * 80 / 4, C: 100, B: 100 + Math.PI * 80 / 4 });
  function mugPresets(preset = "single") {
    if (!["single", "double", "wrap"].includes(preset)) preset = "single";
    const sides = preset === "double" ? [["front", mugAxes.A], ["back", mugAxes.B]] : [["front", preset === "wrap" ? 100 : mugAxes.A]];
    return { templateId: mugTemplate.id, version: 1, preset, layers: sides.flatMap(([sourceFace, x]) => [
      { id: sourceFace + "-logo", kind: "logo", sourceFace, x, y: preset === "wrap" ? 40 : 34, width: preset === "wrap" ? 190 : 60, height: preset === "wrap" ? 70 : 40, rotation: 0 },
      { id: sourceFace + "-text", kind: "text", sourceFace, x, y: preset === "wrap" ? 65 : 67, width: 60, height: 8, rotation: 0 }
    ]) };
  }
  function mugMargin(layer, mug) {
    return layer.kind === "logo" && mug.preset === "wrap" ? 0 : mugTemplate.safe;
  }
  function mugBounds(layer) {
    const r = layer.rotation * Math.PI / 180;
    return { width: Math.abs(layer.width * Math.cos(r)) + Math.abs(layer.height * Math.sin(r)), height: Math.abs(layer.width * Math.sin(r)) + Math.abs(layer.height * Math.cos(r)) };
  }
  function clampMugLayer(layer, mug) {
    const a = { ...layer };
    for (const k of ["x", "y", "width", "height", "rotation"]) a[k] = Number.isFinite(Number(a[k])) ? Number(a[k]) : { x: 100, y: 40, width: 60, height: 40, rotation: 0 }[k];
    a.width = Math.max(0.5, a.width);
    a.height = Math.max(0.5, a.height);
    a.rotation = Math.max(-180, Math.min(180, a.rotation));
    const m = mugMargin(a, mug), b = mugBounds(a), s = Math.min(1, (200 - 2 * m) / b.width, (80 - 2 * m) / b.height);
    a.width *= s;
    a.height *= s;
    const fitted = mugBounds(a);
    a.x = Math.max(m + fitted.width / 2, Math.min(200 - m - fitted.width / 2, a.x));
    a.y = Math.max(m + fitted.height / 2, Math.min(80 - m - fitted.height / 2, a.y));
    return a;
  }
  function validMugLayer(a, mug) {
    if (!["logo", "text"].includes(a.kind) || !["front", "back"].includes(a.sourceFace) || a.id !== a.sourceFace + "-" + a.kind) return false;
    if (!["x", "y", "width", "height", "rotation"].every((k) => Number.isFinite(a[k])) || a.width < 0.5 || a.height < 0.5 || Math.abs(a.rotation) > 180) return false;
    const m = mugMargin(a, mug), b = mugBounds(a), e = 1e-4;
    return a.x - b.width / 2 >= m - e && a.x + b.width / 2 <= 200 - m + e && a.y - b.height / 2 >= m - e && a.y + b.height / 2 <= 80 - m + e;
  }
  function validateMug(raw, p) {
    if (!supportsMug(p) || raw?.templateId !== mugTemplate.id || raw.version !== 1 || !["single", "double", "wrap"].includes(raw.preset) || !Array.isArray(raw.layers) || raw.layers.length < 1 || raw.layers.length > 4) throw Error("Ge\xE7ersiz kupa bask\u0131 \u015Fablonu.");
    const seen = /* @__PURE__ */ new Set();
    const layers = raw.layers.map((a) => {
      if (!validMugLayer(a, raw) || seen.has(a.id)) throw Error("Kupa tasar\u0131m\u0131 izin verilen bask\u0131 alan\u0131 i\xE7inde olmal\u0131.");
      seen.add(a.id);
      return Object.fromEntries(["id", "kind", "sourceFace", "x", "y", "width", "height", "rotation"].map((k) => [k, a[k]]));
    });
    return { templateId: mugTemplate.id, version: 1, preset: raw.preset, layers };
  }
  return __toCommonJS(stdin_exports);
})();
