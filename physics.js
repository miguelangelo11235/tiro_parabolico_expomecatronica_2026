/* ═══════════════════════════════════════════
   physics.js — Pure physics calculations
   ═══════════════════════════════════════════ */

var Physics = (function () {
  'use strict';

  var G = 9.8;
  var DEG2RAD = Math.PI / 180;

  /**
   * Compute all projectile motion values.
   * @param {number} v0  — initial speed (m/s)
   * @param {number} angleDeg — launch angle in degrees
   * @returns {object} { rad, sinA, cosA, H, R, T, vx }
   */
  function compute(v0, angleDeg) {
    var rad  = angleDeg * DEG2RAD;
    var sinA = Math.sin(rad);
    var cosA = Math.cos(rad);
    var sin2A = Math.sin(2 * rad);

    var H  = (v0 * sinA) * (v0 * sinA) / (2 * G);
    var R  = (v0 * v0 * sin2A) / G;
    var T  = (2 * v0 * sinA) / G;
    var vx = v0 * cosA;

    return {
      rad: rad,
      sinA: sinA,
      cosA: cosA,
      H: H,
      R: R,
      T: T,
      vx: vx
    };
  }

  /**
   * Position at time t.
   */
  function posAt(v0, rad, t) {
    var cosA = Math.cos(rad);
    var sinA = Math.sin(rad);
    return {
      x: v0 * cosA * t,
      y: v0 * sinA * t - 0.5 * G * t * t
    };
  }

  /**
   * Compute nice axis tick step.
   */
  function niceStep(range, ticks) {
    if (range <= 0) return 1;
    var rough = range / ticks;
    var pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    var f = rough / pow10;
    var s;
    if (f <= 1.5)       s = 1;
    else if (f <= 3.5)  s = 2;
    else if (f <= 7.5)  s = 5;
    else                s = 10;
    return Math.max(s * pow10, 1);
  }

  /* Public API */
  return {
    G: G,
    DEG2RAD: DEG2RAD,
    compute: compute,
    posAt: posAt,
    niceStep: niceStep
  };

})();
