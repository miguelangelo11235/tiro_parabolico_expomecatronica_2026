/* ═══════════════════════════════════════════
   app.js — Main application controller
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── DOM refs ── */
  var sliderAng  = document.getElementById('slider-angle');
  var numAng     = document.getElementById('num-angle');
  var sliderSpd  = document.getElementById('slider-speed');
  var numSpd     = document.getElementById('num-speed');
  var btnFire    = document.getElementById('btn-fire');
  var btnReset   = document.getElementById('btn-reset');
  var hudTime    = document.getElementById('hud-time');
  var hudHeight  = document.getElementById('hud-height');
  var hudDist    = document.getElementById('hud-dist');
  var calcH_el   = document.getElementById('calc-H');
  var calcR_el   = document.getElementById('calc-R');
  var calcT_el   = document.getElementById('calc-T');
  var calcVx_el  = document.getElementById('calc-vx');
  var toggleBtn  = document.getElementById('theme-toggle');
  var simCanvas  = document.getElementById('simCanvas');

  /* Challenge DOM refs */
  var btnModeFree    = document.getElementById('btn-mode-free');
  var btnModeDist    = document.getElementById('btn-mode-dist');
  var btnModeBalloon = document.getElementById('btn-mode-balloon');
  var challengeOverlay = document.getElementById('challenge-overlay');
  var challengeTarget  = document.getElementById('challenge-target');
  var btnRelocate      = document.getElementById('btn-relocate');

  /* ── State ── */
  var animId        = null;
  var firing        = false;
  var simTime       = 0;
  var startTime     = 0;
  var explosionDone = false;

  /* Challenge State */
  var currentMode = 'FREE'; /* FREE, DISTANCE, BALLOON */
  var targetData  = null;   /* { x, y, radius, tolerance } depending on mode */
  var challengeSuccess = false;

  /* ── Stars background ── */
  var starsCvs = document.getElementById('stars-bg');
  var starsCtx = starsCvs.getContext('2d');
  var stars    = [];

  function initStars() {
    starsCvs.width  = window.innerWidth;
    starsCvs.height = window.innerHeight;
    stars = [];
    for (var i = 0; i < 130; i++) {
      stars.push({
        x: Math.random() * starsCvs.width,
        y: Math.random() * starsCvs.height,
        r: Math.random() * 1.6 + 0.3,
        a: Math.random(),
        s: Math.random() * 0.012 + 0.004,
        d: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  function tickStars() {
    starsCtx.clearRect(0, 0, starsCvs.width, starsCvs.height);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.a += st.s * st.d;
      if (st.a >= 1)   { st.a = 1;   st.d = -1; }
      if (st.a <= 0.1) { st.a = 0.1; st.d =  1; }
      starsCtx.beginPath();
      starsCtx.arc(st.x, st.y, st.r, 0, 6.2832);
      starsCtx.fillStyle = 'rgba(255,255,255,' + st.a + ')';
      starsCtx.fill();
    }
    requestAnimationFrame(tickStars);
  }

  /* ── Helpers ── */
  function getAngle() { return parseFloat(sliderAng.value); }
  function getSpeed() { return parseFloat(sliderSpd.value); }

  function currentPhysics() {
    return Physics.compute(getSpeed(), getAngle());
  }

  function updateCalcDisplay() {
    var c = currentPhysics();
    calcH_el.textContent  = c.H.toFixed(2) + ' m';
    calcR_el.textContent  = c.R.toFixed(2) + ' m';
    calcT_el.textContent  = c.T.toFixed(2) + ' s';
    calcVx_el.textContent = c.vx.toFixed(2) + ' m/s';
  }

  function fullRedraw() {
    var phys = currentPhysics();
    Renderer.drawFullScene(phys, currentMode, targetData);
    if (currentMode === 'FREE') {
      Renderer.drawPredictedPath(getSpeed(), phys);
    }
  }

  /* ── Challenges Setup ── */
  function generateTarget(mode) {
    targetData = null;
    challengeSuccess = false;
    challengeOverlay.classList.remove('success');

    if (mode === 'DISTANCE') {
      var dist = Math.floor(Math.random() * 750) + 50;
      targetData = { x: dist, tolerance: 15 };
      challengeTarget.textContent = dist + ' m';
    } else if (mode === 'BALLOON') {
      var tx = Math.floor(Math.random() * 400) + 50;
      var ty = Math.floor(Math.random() * 100) + 20;
      targetData = { x: tx, y: ty, radius: 15 };
      challengeTarget.textContent = '(' + tx + 'm, ' + ty + 'm)';
    }
    fullRedraw();
  }

  function setMode(mode) {
    if (firing) resetSim();
    currentMode = mode;
    btnModeFree.classList.remove('active');
    btnModeDist.classList.remove('active');
    btnModeBalloon.classList.remove('active');
    challengeOverlay.classList.add('hidden');

    if (mode === 'FREE') {
      btnModeFree.classList.add('active');
      generateTarget(mode);
    } else if (mode === 'DISTANCE') {
      btnModeDist.classList.add('active');
      challengeOverlay.classList.remove('hidden');
      generateTarget(mode);
    } else if (mode === 'BALLOON') {
      btnModeBalloon.classList.add('active');
      challengeOverlay.classList.remove('hidden');
      generateTarget(mode);
    }
  }

  function checkVictory(pos) {
    if (challengeSuccess) return;
    if (currentMode === 'DISTANCE') {
      // Checked at landing (simTime >= realT)
      if (Math.abs(pos.x - targetData.x) <= targetData.tolerance) {
        challengeSuccess = true;
        challengeOverlay.classList.add('success');
        challengeTarget.textContent = '¡IMPACTO DIRECTO!';
      } else {
        challengeTarget.textContent = 'FALLASTE (distancia: ' + pos.x.toFixed(1) + 'm)';
      }
    } else if (currentMode === 'BALLOON') {
      // Checked every frame
      var dx = pos.x - targetData.x;
      var dy = pos.y - targetData.y;
      if (dx * dx + dy * dy <= targetData.radius * targetData.radius) {
        challengeSuccess = true;
        challengeOverlay.classList.add('success');
        challengeTarget.textContent = '¡GLOBO REVENTADO!';
        targetData.popped = true; // Signal renderer to stop drawing balloon
        Renderer.spawnExplosion(
           Renderer.worldToCanvas(targetData.x, targetData.y, currentPhysics(), targetData).cx,
           Renderer.worldToCanvas(targetData.x, targetData.y, currentPhysics(), targetData).cy
        );
      }
    }
  }

  /* ── Theme toggle ── */
  function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    if (current === 'light') {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
    /* Redraw canvas with new theme colors */
    if (!firing) {
      /* Small delay to let CSS vars update */
      setTimeout(fullRedraw, 50);
    }
  }

  function restoreTheme() {
    var saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  /* ── Fire animation ── */
  function fire() {
    if (firing) return;

    var v0   = getSpeed();
    var phys = currentPhysics();
    if (phys.T <= 0) return;

    firing = true;
    explosionDone = false;
    simTime = 0;
    Renderer.clearTrail();
    Renderer.clearParticles();
    startTime = performance.now();

    var realT     = phys.T;
    var animDur   = Math.min(Math.max(realT * 0.35, 0.8), 4.5);
    var timeScale = realT / animDur;

    function frame(now) {
      var elapsed = (now - startTime) / 1000;
      simTime = Math.min(elapsed * timeScale, realT);

      var pos  = Physics.posAt(v0, phys.rad, simTime);
      var wyC  = Math.max(pos.y, 0);

      /* HUD update */
      hudTime.textContent   = simTime.toFixed(2) + ' s';
      hudHeight.textContent = wyC.toFixed(2) + ' m';
      hudDist.textContent   = pos.x.toFixed(2) + ' m';

      /* Render frame */
      Renderer.drawFullScene(phys, currentMode, targetData);
      if (currentMode === 'FREE') {
        Renderer.drawPredictedPath(v0, phys);
      }

      var canvasPos = Renderer.worldToCanvas(pos.x, wyC, phys, targetData);
      Renderer.pushTrail(canvasPos.cx, canvasPos.cy);
      Renderer.drawTrail();

      /* Check collisions in flight */
      if (currentMode === 'BALLOON') {
        checkVictory(pos);
      }

      if (simTime >= realT && !explosionDone) {
        var landPos = Renderer.worldToCanvas(pos.x, 0, phys, targetData);
        Renderer.spawnExplosion(landPos.cx, landPos.cy);
        explosionDone = true;
        
        if (currentMode === 'DISTANCE') {
          checkVictory(pos);
        } else if (currentMode === 'BALLOON' && !challengeSuccess) {
          challengeTarget.textContent = 'FALLASTE (el globo sobrevivió)';
        }
      }

      if (!explosionDone) {
        Renderer.drawProjectile(canvasPos.cx, canvasPos.cy);
        Renderer.spawnTrailParticles(canvasPos.cx, canvasPos.cy);
      }

      Renderer.updateAndDrawParticles();

      if (simTime < realT || Renderer.getParticleCount() > 0) {
        animId = requestAnimationFrame(frame);
      } else {
        firing = false;
        hudTime.textContent   = realT.toFixed(2) + ' s';
        hudHeight.textContent = '0.00 m';
        hudDist.textContent   = (v0 * phys.cosA * realT).toFixed(2) + ' m';
      }
    }

    animId = requestAnimationFrame(frame);
  }

  function resetSim() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    firing = false;
    simTime = 0;
    Renderer.clearTrail();
    Renderer.clearParticles();
    hudTime.textContent   = '0.00 s';
    hudHeight.textContent = '0.00 m';
    hudDist.textContent   = '0.00 m';
    
    // Reset challenge state
    if (currentMode !== 'FREE') {
      challengeSuccess = false;
      challengeOverlay.classList.remove('success');
      if (currentMode === 'DISTANCE') {
        challengeTarget.textContent = targetData.x + ' m';
      } else if (currentMode === 'BALLOON') {
        targetData.popped = false;
        challengeTarget.textContent = '(' + targetData.x + 'm, ' + targetData.y + 'm)';
      }
    }
    fullRedraw();
  }

  /* ── Event listeners ── */
  sliderAng.addEventListener('input', function () {
    numAng.value = sliderAng.value;
    updateCalcDisplay();
    if (!firing) fullRedraw();
  });
  numAng.addEventListener('input', function () {
    let raw = parseInt(numAng.value) || 0;
    let v = Math.max(0, Math.min(90, raw));
    sliderAng.value = v;
    if (raw !== v) numAng.value = v;
    updateCalcDisplay();
    if (!firing) fullRedraw();
  });

  sliderSpd.addEventListener('input', function () {
    numSpd.value = sliderSpd.value;
    updateCalcDisplay();
    if (!firing) fullRedraw();
  });
  numSpd.addEventListener('input', function () {
    let raw = parseInt(numSpd.value) || 0;
    let v = Math.max(1, Math.min(100, raw));
    sliderSpd.value = v;
    if (raw !== v) numSpd.value = v;
    updateCalcDisplay();
    if (!firing) fullRedraw();
  });

  btnModeFree.addEventListener('click', function() { setMode('FREE'); });
  btnModeDist.addEventListener('click', function() { setMode('DISTANCE'); });
  btnModeBalloon.addEventListener('click', function() { setMode('BALLOON'); });

  btnRelocate.addEventListener('click', function() {
    if (!firing && currentMode !== 'FREE') {
      generateTarget(currentMode);
    }
  });

  btnFire.addEventListener('click', fire);
  btnReset.addEventListener('click', resetSim);
  toggleBtn.addEventListener('click', toggleTheme);

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (firing) resetSim();
      else fire();
    }
  });

  window.addEventListener('resize', function () {
    initStars();
    Renderer.resize();
    if (!firing) fullRedraw();
  });

  /* ── INIT ── */
  function init() {
    restoreTheme();
    Renderer.init(simCanvas);
    initStars();
    tickStars();
    Renderer.resize();
    updateCalcDisplay();
    fullRedraw();
  }

  /* Wait for font + DOM */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      Renderer.setFontReady(true);
      init();
    });
  }

  window.addEventListener('load', function () {
    Renderer.setFontReady(true);
    init();
  });

  /* Immediate init for instant feedback */
  init();

})();
