/* ═══════════════════════════════════════════
   renderer.js — Canvas drawing & visuals
   ═══════════════════════════════════════════ */

var Renderer = (function () {
  'use strict';

  var canvas, ctx;
  var ML = 70, MR = 30, MT = 30, MB = 72;
  var particles = [];
  var trailPoints = [];
  var fontReady = false;

  /* Read a CSS variable from document root */
  function cv(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  }

  function setFontReady(v) { fontReady = v; }

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var w = Math.max(Math.floor(rect.width), 300);
    canvas.width = w;
    canvas.height = Math.floor(w * 0.5);
  }

  function clearTrail() { trailPoints = []; }
  function clearParticles() { particles = []; }
  function getParticleCount() { return particles.length; }
  function pushTrail(cx, cy) { trailPoints.push({ cx: cx, cy: cy }); }

  /* ── Coordinate mapping ── */
  function getWorldBounds(phys, targetData) {
    var max_X = Math.max(phys.R * 1.15, 20);
    var max_Y = Math.max(phys.H * 1.3, 10);
    
    if (targetData) {
      if (targetData.x) max_X = Math.max(max_X, targetData.x * 1.15);
      if (targetData.y) max_Y = Math.max(max_Y, targetData.y * 1.3 + 5);
    }
    
    return {
      maxX: max_X,
      maxY: max_Y
    };
  }

  function w2c(wx, wy, bounds) {
    var dW = canvas.width - ML - MR;
    var dH = canvas.height - MT - MB;
    return {
      cx: ML + (wx / bounds.maxX) * dW,
      cy: canvas.height - MB - (wy / bounds.maxY) * dH
    };
  }

  /* ── Font helper ── */
  function font(px) {
    return fontReady
      ? (px + 'px "Press Start 2P"')
      : (px + 'px monospace');
  }

  /* ══════════════════════════════════════════════
     DRAW FULL SCENE (background, landscape, grid)
     ══════════════════════════════════════════════ */
  function drawScene(bounds) {
    var w = canvas.width;
    var h = canvas.height;
    var dW = w - ML - MR;
    var dH = h - MT - MB;
    var groundY = h - MB;
    var fpx = Math.max(7, Math.floor(w * 0.01));

    ctx.clearRect(0, 0, w, h);

    /* ── Sky gradient ── */
    var skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, cv('--cv-sky-top'));
    skyGrad.addColorStop(1, cv('--cv-sky-bottom'));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, groundY);

    /* ── Decorative sky stars (dark mode only) ── */
    var starAlpha = parseFloat(cv('--cv-star-alpha') || '0');
    if (starAlpha > 0.01) {
      ctx.fillStyle = 'rgba(255,255,255,' + starAlpha + ')';
      for (var si = 0; si < 30; si++) {
        var sx = ML + ((si * 137 + 29) % (dW > 0 ? dW : 1));
        var sy = MT + ((si * 97 + 13) % (dH > 0 ? dH : 1));
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    /* ── Clouds ── */
    drawClouds(dW, groundY);

    /* ── Mountains ── */
    drawMountains(w, groundY);

    /* ── Trees / Bushes ── */
    drawTrees(w, groundY);

    /* ── Ground blocks (draw BEFORE labels so labels appear on top) ── */
    drawGround(w, groundY);

    /* ── Grid lines ── */
    var stepX = Physics.niceStep(bounds.maxX, 8);
    var stepY = Physics.niceStep(bounds.maxY, 6);

    ctx.strokeStyle = cv('--cv-grid');
    ctx.lineWidth = 1;

    for (var gx = 0; gx <= bounds.maxX + 0.01; gx += stepX) {
      var ptx = w2c(gx, 0, bounds);
      ctx.beginPath();
      ctx.moveTo(ptx.cx, MT);
      ctx.lineTo(ptx.cx, groundY);
      ctx.stroke();
    }
    for (var gy = 0; gy <= bounds.maxY + 0.01; gy += stepY) {
      var pty = w2c(0, gy, bounds);
      ctx.beginPath();
      ctx.moveTo(ML, pty.cy);
      ctx.lineTo(ML + dW, pty.cy);
      ctx.stroke();
    }

    /* ── Axis labels (drawn AFTER ground so they're visible) ── */
    ctx.font = font(fpx);

    /* X-axis labels — drawn on the dirt area below ground blocks */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = cv('--cv-axis-text');
    for (var lx = 0; lx <= bounds.maxX + 0.01; lx += stepX) {
      var plx = w2c(lx, 0, bounds);
      /* Background pill for readability */
      var label = Math.round(lx).toString();
      var tw = ctx.measureText(label).width;
      ctx.fillStyle = cv('--cv-dirt2');
      ctx.fillRect(plx.cx - tw / 2 - 3, groundY + 22, tw + 6, fpx + 6);
      ctx.fillStyle = cv('--cv-axis-text');
      ctx.fillText(label, plx.cx, groundY + 24);
    }

    /* Y-axis labels */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var ly = 0; ly <= bounds.maxY + 0.01; ly += stepY) {
      var ply = w2c(0, ly, bounds);
      ctx.fillText(Math.round(ly).toString(), ML - 6, ply.cy);
    }

    /* ── Axis titles ── */
    ctx.fillStyle = cv('--cv-axis-title');
    ctx.font = font(fpx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Distancia (m)', ML + dW / 2, h - 6);

    ctx.save();
    ctx.translate(10, MT + dH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText('Altura (m)', 0, 0);
    ctx.restore();
  }

  /* ── CLOUDS ── */
  function drawClouds(dW, groundY) {
    var cloudColor = cv('--cv-cloud');
    ctx.fillStyle = cloudColor;
    var positions = [
      { x: ML + dW * 0.15, y: MT + 30, rx: 40, ry: 14 },
      { x: ML + dW * 0.45, y: MT + 18, rx: 55, ry: 16 },
      { x: ML + dW * 0.75, y: MT + 40, rx: 35, ry: 12 },
      { x: ML + dW * 0.9,  y: MT + 22, rx: 28, ry: 10 }
    ];
    for (var i = 0; i < positions.length; i++) {
      var cl = positions[i];
      ctx.beginPath();
      ctx.ellipse(cl.x, cl.y, cl.rx, cl.ry, 0, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cl.x - cl.rx * 0.5, cl.y + 4, cl.rx * 0.6, cl.ry * 0.8, 0, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cl.x + cl.rx * 0.4, cl.y + 3, cl.rx * 0.55, cl.ry * 0.75, 0, 0, 6.2832);
      ctx.fill();
    }
  }

  /* ── MOUNTAINS ── */
  function drawMountains(w, groundY) {
    /* Back range */
    ctx.fillStyle = cv('--cv-mountain1');
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    var peaks1 = [
      [0, groundY - 40],
      [w * 0.08, groundY - 70],
      [w * 0.18, groundY - 110],
      [w * 0.28, groundY - 75],
      [w * 0.38, groundY - 120],
      [w * 0.5, groundY - 85],
      [w * 0.6, groundY - 130],
      [w * 0.72, groundY - 90],
      [w * 0.82, groundY - 105],
      [w * 0.92, groundY - 65],
      [w, groundY - 80]
    ];
    for (var i = 0; i < peaks1.length; i++) {
      ctx.lineTo(peaks1[i][0], peaks1[i][1]);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    /* Front range */
    ctx.fillStyle = cv('--cv-mountain2');
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    var peaks2 = [
      [0, groundY - 25],
      [w * 0.12, groundY - 50],
      [w * 0.22, groundY - 35],
      [w * 0.35, groundY - 65],
      [w * 0.45, groundY - 40],
      [w * 0.55, groundY - 70],
      [w * 0.68, groundY - 45],
      [w * 0.78, groundY - 55],
      [w * 0.88, groundY - 30],
      [w, groundY - 50]
    ];
    for (var j = 0; j < peaks2.length; j++) {
      ctx.lineTo(peaks2[j][0], peaks2[j][1]);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    /* Snow caps on tallest peaks (light mode accent) */
    ctx.fillStyle = cv('--cv-mountain3');
    ctx.beginPath();
    ctx.moveTo(w * 0.57, groundY - 130);
    ctx.lineTo(w * 0.55, groundY - 115);
    ctx.lineTo(w * 0.6, groundY - 130);
    ctx.lineTo(w * 0.63, groundY - 118);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.36, groundY - 120);
    ctx.lineTo(w * 0.34, groundY - 108);
    ctx.lineTo(w * 0.39, groundY - 120);
    ctx.lineTo(w * 0.41, groundY - 110);
    ctx.closePath();
    ctx.fill();
  }

  /* ── TREES ── */
  function drawTrees(w, groundY) {
    var trunkC  = cv('--cv-tree-trunk');
    var leavesC = cv('--cv-tree-leaves');
    var hiC     = cv('--cv-tree-hi');
    var positions = [
      w * 0.05, w * 0.14, w * 0.25, w * 0.42, w * 0.58,
      w * 0.67, w * 0.78, w * 0.88, w * 0.95
    ];
    for (var i = 0; i < positions.length; i++) {
      var tx = positions[i];
      var treeH = 12 + (i * 7) % 14;
      var treeW = 8 + (i * 5) % 8;

      /* Trunk */
      ctx.fillStyle = trunkC;
      ctx.fillRect(tx - 2, groundY - treeH * 0.4, 4, treeH * 0.4);

      /* Leaves (triangular, pixelated) */
      ctx.fillStyle = leavesC;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - treeH);
      ctx.lineTo(tx - treeW, groundY - treeH * 0.3);
      ctx.lineTo(tx + treeW, groundY - treeH * 0.3);
      ctx.closePath();
      ctx.fill();

      /* Highlight */
      ctx.fillStyle = hiC;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - treeH);
      ctx.lineTo(tx - treeW * 0.4, groundY - treeH * 0.55);
      ctx.lineTo(tx, groundY - treeH * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ── GROUND BLOCKS ── */
  function drawGround(w, groundY) {
    var bH = Math.min(18, MB * 0.5);
    var bW = Math.max(16, Math.floor(w * 0.028));
    var nB = Math.ceil(w / bW) + 1;

    for (var bi = 0; bi < nB; bi++) {
      var bx = bi * bW;
      ctx.fillStyle = bi % 2 === 0 ? cv('--cv-grass1') : cv('--cv-grass2');
      ctx.fillRect(bx, groundY, bW, bH);
      ctx.fillStyle = cv('--cv-grass-top');
      ctx.fillRect(bx, groundY, bW, 3);
      ctx.strokeStyle = cv('--cv-grass-line');
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, groundY, bW, bH);
    }

    ctx.fillStyle = cv('--cv-dirt1');
    ctx.fillRect(0, groundY + bH, w, MB - bH);
    ctx.fillStyle = cv('--cv-dirt2');
    ctx.fillRect(0, groundY + bH + 6, w, MB - bH - 6);
  }

  /* ── CANNON ── */
  function drawCannon(bounds, radOverride) {
    var rad = radOverride !== undefined ? radOverride : null;
    if (rad === null) return; /* caller must provide */

    var origin = w2c(0, 0, bounds);
    var ox = origin.cx;
    var oy = origin.cy;
    var barrelLen = Math.max(30, canvas.width * 0.042);
    var barrelW   = Math.max(9, canvas.width * 0.013);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-rad);

    ctx.fillStyle = cv('--cv-cannon-body');
    ctx.fillRect(0, -barrelW / 2, barrelLen, barrelW);
    ctx.fillStyle = cv('--cv-cannon-hi');
    ctx.fillRect(0, -barrelW / 2, barrelLen, 3);
    ctx.strokeStyle = cv('--cv-cannon-muz');
    ctx.lineWidth = 2;
    ctx.strokeRect(barrelLen - 5, -barrelW / 2 - 2, 7, barrelW + 4);
    ctx.fillStyle = cv('--cv-cannon-muz');
    ctx.fillRect(barrelLen - 2, -barrelW / 2 + 1, 3, barrelW - 2);

    ctx.restore();

    var wR = Math.max(11, canvas.width * 0.016);
    ctx.beginPath();
    ctx.arc(ox, oy, wR, 0, 6.2832);
    ctx.fillStyle = cv('--cv-wheel');
    ctx.fill();
    ctx.strokeStyle = cv('--cv-wheel-str');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = cv('--cv-spoke');
    ctx.lineWidth = 1;
    for (var si = 0; si < 4; si++) {
      var sa = si * (Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(sa) * wR * 0.8, oy + Math.sin(sa) * wR * 0.8);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, 6.2832);
    ctx.fillStyle = cv('--cv-axle');
    ctx.fill();
  }

  /* This is the public-facing drawScene that takes params */
  function drawFullScene(phys, mode, targetData) {
    var bounds = getWorldBounds(phys, targetData);
    drawScene(bounds);
    /* draw targets if in challenge mode */
    drawTargets(bounds, mode, targetData);
    /* re-draw cannon with correct angle (drawScene calls drawCannon without rad) */
    drawCannon(bounds, phys.rad);
    return bounds;
  }

  /* ── CHALLENGE TARGETS ── */
  function drawTargets(bounds, mode, data) {
    if (!mode || mode === 'FREE' || !data) return;

    if (mode === 'DISTANCE') {
      var pt = w2c(data.x, 0, bounds);
      ctx.fillStyle = '#ff2d95'; // pink flag pole
      ctx.fillRect(pt.cx - 2, pt.cy - 30, 4, 30);
      /* Flag */
      ctx.fillStyle = '#39ff14'; // green flag
      ctx.beginPath();
      ctx.moveTo(pt.cx + 2, pt.cy - 30);
      ctx.lineTo(pt.cx + 16, pt.cy - 22);
      ctx.lineTo(pt.cx + 2, pt.cy - 14);
      ctx.closePath();
      ctx.fill();
    } else if (mode === 'BALLOON' && !data.popped) {
      var bPt = w2c(data.x, data.y, bounds);
      var br = data.radius * (w2c(data.radius, 0, bounds).cx - w2c(0, 0, bounds).cx) / data.radius; // scale to canvas
      var radiusPx = Math.max(10, Math.min(30, br)); // keep reasonable size

      // string
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bPt.cx, bPt.cy + radiusPx);
      ctx.lineTo(bPt.cx - 4, bPt.cy + radiusPx + 15);
      ctx.lineTo(bPt.cx + 4, bPt.cy + radiusPx + 30);
      ctx.stroke();

      // balloon body
      ctx.fillStyle = '#ff6a00';
      ctx.beginPath();
      ctx.ellipse(bPt.cx, bPt.cy, radiusPx, radiusPx * 1.2, 0, 0, 6.2832);
      ctx.fill();

      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(bPt.cx - radiusPx*0.3, bPt.cy - radiusPx*0.4, radiusPx*0.2, radiusPx*0.3, -Math.PI/4, 0, 6.2832);
      ctx.fill();
    }
  }

  /* ── PREDICTED PATH ── */
  function drawPredictedPath(v0, phys) {
    var bounds = getWorldBounds(phys);
    if (phys.T <= 0) return;

    ctx.beginPath();
    var steps = 80;
    for (var i = 0; i <= steps; i++) {
      var t  = (i / steps) * phys.T;
      var pos = Physics.posAt(v0, phys.rad, t);
      var pt  = w2c(pos.x, Math.max(pos.y, 0), bounds);
      if (i === 0) ctx.moveTo(pt.cx, pt.cy);
      else         ctx.lineTo(pt.cx, pt.cy);
    }
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = cv('--cv-predicted');
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    /* Apex marker */
    var tApex = (v0 * phys.sinA) / Physics.G;
    var apexX = v0 * phys.cosA * tApex;
    var apexPt = w2c(apexX, phys.H, bounds);
    ctx.fillStyle = cv('--cv-predicted');
    ctx.fillRect(apexPt.cx - 3, apexPt.cy - 3, 6, 6);

    /* Landing marker */
    var landPt = w2c(phys.R, 0, bounds);
    ctx.fillStyle = 'rgba(255,45,149,0.35)';
    ctx.fillRect(landPt.cx - 3, landPt.cy - 3, 6, 6);
  }

  /* ── TRAIL ── */
  function drawTrail() {
    if (trailPoints.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(trailPoints[0].cx, trailPoints[0].cy);
    for (var i = 1; i < trailPoints.length; i++) {
      ctx.lineTo(trailPoints[i].cx, trailPoints[i].cy);
    }
    ctx.strokeStyle = cv('--cv-trail');
    ctx.lineWidth = 2.5;
    ctx.shadowColor = cv('--cv-trail');
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /* ── PROJECTILE ── */
  function drawProjectile(cx, cy) {
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
    grad.addColorStop(0, 'rgba(255,230,0,0.85)');
    grad.addColorStop(0.35, 'rgba(255,106,0,0.45)');
    grad.addColorStop(1, 'rgba(255,45,149,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, 6.2832);
    ctx.fillStyle = grad;
    ctx.fill();

    var s = 3;
    var sprite = [
      [0,1,1,1,0],
      [1,2,2,2,1],
      [1,2,3,2,1],
      [1,2,2,2,1],
      [0,1,1,1,0]
    ];
    var cols = ['', '#ff6a00', '#ffe600', '#ffffff'];
    for (var r = 0; r < 5; r++) {
      for (var c = 0; c < 5; c++) {
        if (sprite[r][c] === 0) continue;
        ctx.fillStyle = cols[sprite[r][c]];
        ctx.fillRect(
          Math.floor(cx - 2.5 * s + c * s),
          Math.floor(cy - 2.5 * s + r * s),
          s, s
        );
      }
    }
  }

  /* ── PARTICLES ── */
  function spawnTrailParticles(cx, cy) {
    for (var i = 0; i < 3; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 8,
        y: cy + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.8,
        vy: (Math.random() - 0.5) * 1.8,
        life: 1,
        decay: 0.025 + Math.random() * 0.03,
        size: 2 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '#ff6a00' : '#ffe600'
      });
    }
  }

  var EXPLOSION_COLORS = ['#ff2d95','#ff6a00','#ffe600','#39ff14','#00f0ff','#ffffff'];

  function spawnExplosion(cx, cy) {
    for (var i = 0; i < 55; i++) {
      var ang = Math.random() * 6.2832;
      var spd = 1.2 + Math.random() * 4.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - Math.random() * 2.5,
        life: 1,
        decay: 0.01 + Math.random() * 0.02,
        size: 2 + Math.random() * 5,
        color: EXPLOSION_COLORS[Math.floor(Math.random() * 6)]
      });
    }
  }

  function updateAndDrawParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x - p.size / 2), Math.floor(p.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /* ── World-to-canvas (public) ── */
  function worldToCanvas(wx, wy, phys, targetData) {
    var bounds = getWorldBounds(phys, targetData);
    return w2c(wx, wy, bounds);
  }

  /* ══════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════ */
  return {
    init: init,
    resize: resize,
    setFontReady: setFontReady,
    drawFullScene: drawFullScene,
    drawPredictedPath: drawPredictedPath,
    drawTrail: drawTrail,
    drawProjectile: drawProjectile,
    spawnTrailParticles: spawnTrailParticles,
    spawnExplosion: spawnExplosion,
    updateAndDrawParticles: updateAndDrawParticles,
    worldToCanvas: worldToCanvas,
    clearTrail: clearTrail,
    clearParticles: clearParticles,
    getParticleCount: getParticleCount,
    pushTrail: pushTrail,
    getWorldBounds: getWorldBounds
  };

})();
