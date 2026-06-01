// Hidden Message — p5.js instance mode, mounted as background of #eigenfield-bg.
// An interactive Eisenstein-lattice that springs and breathes under touch.
// Audio from the original standalone piece is intentionally omitted (the site
// loads p5 but not p5.sound, and the source shipped with audio disabled).
// Bundles the lum-adapter, pill-mirror and hero-canvas adapters (mirrors of the
// ones in eigenfield.js / hypertorus.js) so the waitlist page is self-contained.
(function () {
  var hiddenMessageInstance = null;

  function startHiddenMessage() {
    if (hiddenMessageInstance) return;
    hiddenMessageInstance = new p5(function (p) {
      var vertices = [];
      var edges = [];

      // Spring physics constants (verbatim from the original piece).
      var SPRING_STIFFNESS = 0.15;
      var DAMPING = 0.78;
      var EDGE_STIFFNESS = 0.015;

      p.setup = function () {
        var cnv = p.createCanvas(p.windowWidth, p.windowHeight);
        cnv.parent('eigenfield-bg');
        // p5 instance mode inserts a default <main> wrapper in <body> that we
        // no longer need once the canvas is reparented. Leaving it in place
        // covers the viewport and swallows clicks on form inputs below.
        var orphanMain = document.querySelector('body > main:empty');
        if (orphanMain) orphanMain.remove();
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        p.colorMode(p.HSB, 360, 100, 100, 1);

        var rho_re = 0.5;
        var rho_im = Math.sqrt(3) / 2;
        var irho_re = -Math.sqrt(3) / 2;
        var irho_im = 0.5;

        var uniquePoints = new Map();
        var range = [-2, -1, 0, 1, 2];

        for (var ai = 0; ai < range.length; ai++) {
          for (var bi = 0; bi < range.length; bi++) {
            for (var ci = 0; ci < range.length; ci++) {
              for (var di = 0; di < range.length; di++) {
                var a = range[ai], b = range[bi], c = range[ci], d = range[di];
                var re = a + (c * rho_re) + (d * irho_re);
                var im = b + (c * rho_im) + (d * irho_im);
                var key = re.toFixed(4) + ',' + im.toFixed(4);
                if (!uniquePoints.has(key)) {
                  uniquePoints.set(key, { x: re, y: im });
                }
              }
            }
          }
        }

        var id = 0;
        uniquePoints.forEach(function (pt) {
          var distFromCenter = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
          var angle = Math.atan2(pt.y, pt.x);
          vertices.push({
            id: id++,
            origX: pt.x,
            origY: pt.y,
            currentX: 0,
            currentY: 0,
            dist: distFromCenter,
            angle: angle,
            offsetX: 0,
            offsetY: 0,
            velX: 0,
            velY: 0,
            prevVel: 0,
            acousticEnergy: 0,
            localStress: 0
          });
        });

        var epsilon = 0.01;
        for (var i = 0; i < vertices.length; i++) {
          for (var j = i + 1; j < vertices.length; j++) {
            var dx = vertices[i].origX - vertices[j].origX;
            var dy = vertices[i].origY - vertices[j].origY;
            var dd = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(dd - 1.0) < epsilon) {
              edges.push([i, j]);
            }
          }
        }
      };

      p.draw = function () {
        // Outer try/catch is the only visual safety net on top of the original.
        // If any throw bubbles up from inside draw we keep the loop alive so the
        // canvas never freezes to black.
        try {
          // Near-black HSB(250,75,3.5) ~= #060309, matching the lum-adapter's
          // "dark" classification so the centered cream text stays legible.
          p.background(250, 75, 3.5, 1);

          p.translate(p.width / 2, p.height / 2);
          var graphScale = p.min(p.width, p.height) / 11;
          var time = p.millis() * 0.001;

          var isTouching = (p.touches.length > 0 || p.mouseIsPressed);

          var v, edge, v1, v2;

          // 1. Node Springs Movement
          for (var n = 0; n < vertices.length; n++) {
            v = vertices[n];
            var restX = v.origX * graphScale;
            var restY = -v.origY * graphScale;

            var targetOffsetX = 0;
            var targetOffsetY = 0;

            if (isTouching) {
              var inputPoints = p.touches.length > 0 ? p.touches : [{ x: p.mouseX, y: p.mouseY }];
              for (var ip = 0; ip < inputPoints.length; ip++) {
                var input = inputPoints[ip];
                var inputXAdjusted = input.x - p.width / 2;
                var inputYAdjusted = input.y - p.height / 2;

                var dToInput = p.dist(inputXAdjusted, inputYAdjusted, restX, restY);
                var maxInfluenceRadius = 110;

                if (dToInput < maxInfluenceRadius) {
                  var force = p.map(dToInput, 0, maxInfluenceRadius, 55, 0);
                  var pushAngle = p.atan2(restY - inputYAdjusted, restX - inputXAdjusted);
                  targetOffsetX += p.cos(pushAngle) * force;
                  targetOffsetY += p.sin(pushAngle) * force;
                }
              }
            }

            var ax = (targetOffsetX - v.offsetX) * SPRING_STIFFNESS;
            var ay = (targetOffsetY - v.offsetY) * SPRING_STIFFNESS;

            v.velX = (v.velX + ax) * DAMPING;
            v.velY = (v.velY + ay) * DAMPING;
          }

          // 2. Inter-Node Linkages & Tracking Stress Fields
          for (var e = 0; e < edges.length; e++) {
            edge = edges[e];
            v1 = vertices[edge[0]];
            v2 = vertices[edge[1]];

            var dx2 = v2.offsetX - v1.offsetX;
            var dy2 = v2.offsetY - v1.offsetY;
            var currentDist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            var structuralForce = currentDist * EDGE_STIFFNESS;
            var forceAngle = Math.atan2(dy2, dx2);

            var fx = Math.cos(forceAngle) * structuralForce;
            var fy = Math.sin(forceAngle) * structuralForce;

            v1.velX += fx;
            v1.velY += fy;
            v2.velX -= fx;
            v2.velY -= fy;

            v1.localStress += structuralForce * 0.15;
            v2.localStress += structuralForce * 0.15;
          }

          // 3. Coordinate Resolution
          for (var m = 0; m < vertices.length; m++) {
            v = vertices[m];
            var rX = v.origX * graphScale;
            var rY = -v.origY * graphScale;

            v.offsetX += v.velX;
            v.offsetY += v.velY;

            var breathingFreq = 1.2;
            var breathingAmp = 0.015;
            var pulse = p.sin(time * breathingFreq - v.dist * 0.6) * breathingAmp;

            v.currentX = (rX + v.offsetX) * (1 + pulse);
            v.currentY = (rY + v.offsetY) * (1 + pulse);

            v.acousticEnergy *= 0.90;
            v.localStress *= 0.85;

            var currentSpeed = Math.sqrt(v.velX * v.velX + v.velY * v.velY);
            var deltaSpeed = currentSpeed - v.prevVel;
            if (deltaSpeed > 4.2 && isTouching) {
              v.acousticEnergy = 1.0;
            }
            v.prevVel = currentSpeed;
          }

          // 4. Render Layout Edges
          for (var ee = 0; ee < edges.length; ee++) {
            edge = edges[ee];
            v1 = vertices[edge[0]];
            v2 = vertices[edge[1]];
            var avgDist = (v1.dist + v2.dist) / 2;
            var avgAngle = (v1.angle + v2.angle) / 2;

            var wave1 = p.sin(avgDist * 1.5 - time * 2.2);
            var wave2 = p.cos(avgAngle * 6 + time);

            var combinedEnergy = (v1.acousticEnergy + v2.acousticEnergy) * 0.5;
            var totalStrain = (v1.localStress + v2.localStress) * 0.5;

            // Spectral mapping: core tones map to calm cyans, high stressed notes flash magenta.
            var baseHue = p.map(avgDist + totalStrain * 2, 0, 5, 185, 315);
            var hueVal = (baseHue + (wave1 + wave2) * 20) % 360;

            var stretchStress = p.dist(v1.offsetX, v1.offsetY, v2.offsetX, v2.offsetY);
            var sparkle = p.map(p.noise(avgDist, time * 1.5), 0, 1, 0.2, 0.6) + (stretchStress * 0.01) + (combinedEnergy * 0.35);
            var weight = 0.65 + p.constrain(stretchStress * 0.05, 0, 2) + (combinedEnergy * 1.8);

            p.stroke(hueVal, p.map(combinedEnergy, 0, 1, 85, 45), 95, p.constrain(sparkle, 0, 1));
            p.strokeWeight(weight);
            p.line(v1.currentX, v1.currentY, v2.currentX, v2.currentY);
          }

          // 5. Render Layout Vertices
          for (var k = 0; k < vertices.length; k++) {
            v = vertices[k];
            var nodeWave = p.sin(v.dist * 1.5 - time * 2.2) + 0.5;
            var nodeBaseHue = p.map(v.dist + v.localStress * 2, 0, 5, 185, 315);
            var nodeHue = (nodeBaseHue + nodeWave * 20 + time * 4) % 360;

            p.fill(nodeHue, p.map(v.acousticEnergy, 0, 1, 85, 15), 100, p.map(v.acousticEnergy, 0, 1, 0.85, 1.0));
            p.noStroke();

            var baseSize = p.map(p.sin(time * 3 + v.dist * 8), -1, 1, 3.5, 5.5);
            var dynamicSize = baseSize + (v.acousticEnergy * 10.0) + (v.localStress * 1.5);

            p.ellipse(v.currentX, v.currentY, dynamicSize);
          }
        } catch (err) { /* final safety net — keep the draw loop alive */ }
      };

      // Prevent mobile browser pan/scroll/zoom from stealing the touch.
      p.touchStarted = function () { return false; };
      p.mousePressed = function () { return false; };
      p.touchMoved = function () { return false; };

      p.windowResized = function () {
        // Ignore minor viewport changes (mobile URL/toolbar show/hide); only
        // refit on real resizes / rotation so a collapsing URL bar doesn't
        // clear the pixel buffer and flash the canvas black.
        var dw = Math.abs(p.windowWidth - p.width);
        var dh = Math.abs(p.windowHeight - p.height);
        if (dw > 50 || dh > 200) {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        }
      };
    });
  }

  // Luminance-adaptive text. Periodically downsamples the canvas and, for every
  // element tagged [data-adapt], averages luminance under its bounding box and
  // flips a data-lum attribute used by CSS.
  function startLumAdapter() {
    var sample = document.createElement('canvas');
    sample.width = 80;
    sample.height = 80;
    var sctx = sample.getContext('2d', { willReadFrequently: true });
    var running = true;

    function tick() {
      if (!running) return;
      var bg = document.getElementById('eigenfield-bg');
      var cnv = bg && bg.querySelector('canvas');
      if (!cnv || !cnv.width) { setTimeout(tick, 120); return; }

      try {
        sctx.drawImage(cnv, 0, 0, sample.width, sample.height);
      } catch (e) {
        setTimeout(tick, 200);
        return;
      }

      var nodes = document.querySelectorAll('[data-adapt]');
      var vw = window.innerWidth, vh = window.innerHeight;
      nodes.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var x0 = Math.max(0, Math.floor(r.left / vw * sample.width));
        var y0 = Math.max(0, Math.floor(r.top / vh * sample.height));
        var x1 = Math.min(sample.width, Math.ceil(r.right / vw * sample.width));
        var y1 = Math.min(sample.height, Math.ceil(r.bottom / vh * sample.height));
        var sw = Math.max(1, x1 - x0), sh = Math.max(1, y1 - y0);
        var data;
        try {
          data = sctx.getImageData(x0, y0, sw, sh).data;
        } catch (e) { return; }
        var L = 0, n = 0;
        for (var i = 0; i < data.length; i += 4) {
          L += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          n++;
        }
        var avg = n ? (L / (n * 255)) : 0;
        el.dataset.lum = avg > 0.52 ? 'light' : 'dark';
      });

      setTimeout(tick, 140);
    }

    tick();
    return function stop() { running = false; };
  }

  // Mirror-canvas blur. Continuously-updated 2D copy of the art, CSS-blurred,
  // revealed only inside the pill silhouettes via clip-path.
  function startPillMirror() {
    var mirror = document.getElementById('eigenfield-mirror');
    if (!mirror) return function () {};
    var mctx = mirror.getContext('2d');
    var SCALE = 0.4;
    var running = true;
    var clipDirty = true;

    function sizeMirror() {
      var w = Math.max(2, Math.floor(window.innerWidth * SCALE));
      var h = Math.max(2, Math.floor(window.innerHeight * SCALE));
      if (mirror.width !== w) mirror.width = w;
      if (mirror.height !== h) mirror.height = h;
      mirror.style.width = window.innerWidth + 'px';
      mirror.style.height = window.innerHeight + 'px';
    }

    function buildClipPath() {
      var nodes = document.querySelectorAll('[data-adapt]');
      var parts = [];
      nodes.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return;
        if (el.id === 'waitlist-status') return;
        if (el.classList.contains('pill-field') && !el.classList.contains('is-visible')) return;
        var rr = Math.min(20, r.height * 0.5, r.width * 0.5);
        var x = r.left, y = r.top, w = r.width, h = r.height;
        parts.push(
          'M ' + (x + rr) + ' ' + y +
          ' h ' + (w - 2 * rr) +
          ' a ' + rr + ' ' + rr + ' 0 0 1 ' + rr + ' ' + rr +
          ' v ' + (h - 2 * rr) +
          ' a ' + rr + ' ' + rr + ' 0 0 1 ' + (-rr) + ' ' + rr +
          ' h ' + (-(w - 2 * rr)) +
          ' a ' + rr + ' ' + rr + ' 0 0 1 ' + (-rr) + ' ' + (-rr) +
          ' v ' + (-(h - 2 * rr)) +
          ' a ' + rr + ' ' + rr + ' 0 0 1 ' + rr + ' ' + (-rr) +
          ' Z'
        );
      });
      if (!parts.length) {
        mirror.style.clipPath = 'inset(100%)';
        mirror.style.webkitClipPath = 'inset(100%)';
      } else {
        var d = 'path("' + parts.join(' ') + '")';
        mirror.style.clipPath = d;
        mirror.style.webkitClipPath = d;
      }
    }

    function markClipDirty() { clipDirty = true; }
    window.markMirrorClipDirty = markClipDirty;

    sizeMirror();
    window.addEventListener('resize', function () {
      sizeMirror();
      markClipDirty();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(markClipDirty);
    var pt = document.getElementById('page-two');
    if (pt) pt.addEventListener('scroll', markClipDirty, { passive: true });
    setTimeout(markClipDirty, 0);
    setTimeout(markClipDirty, 400);
    setTimeout(markClipDirty, 1500);

    var lastDraw = 0;
    function tick(t) {
      if (!running) return;
      if (clipDirty) { buildClipPath(); clipDirty = false; }
      if (t - lastDraw > 33) { // ~30fps
        var cnv = document.querySelector('#eigenfield-bg canvas');
        if (cnv && cnv.width > 0) {
          try {
            mctx.drawImage(cnv, 0, 0, mirror.width, mirror.height);
            if (!mirror.classList.contains('is-ready')) mirror.classList.add('is-ready');
          } catch (e) { /* canvas not ready */ }
          lastDraw = t;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return function stop() { running = false; };
  }

  // Hero text with inverted-against-art look, painted inside a single canvas.
  // Difference-blend happens in a 2D canvas (not CSS mix-blend-mode) because
  // iOS WebKit breaks mix-blend-mode once it promotes layers to GPU.
  function startHeroCanvas() {
    var hero = document.querySelector('.about-hero');
    var canvas = hero && hero.querySelector('.about-hero-canvas');
    if (!hero || !canvas) return function () {};
    var ctx = canvas.getContext('2d');
    var maskCanvas = document.createElement('canvas');
    var mctx = maskCanvas.getContext('2d');
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    var running = true;
    var lines = [];
    var fontSpec = '';
    var lineHeightPx = 32;
    var letterSpacingPx = 0;
    var boxW = 0, boxH = 0, paintedH = 0;
    var topY = 0, descentEstimate = 0;

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var anim = {
      primed: false,
      started: false,
      finished: false,
      lineIdx: 0,
      charIdx: 0,
      nextAt: 0,
      initialDelayMs: 120,
      charIntervalMs: 35,
      linePauseMs: 180,
      paragraphPauseMs: 420
    };

    function finishTyping() {
      anim.primed = true;
      anim.finished = true;
      renderMask();
      hero.dispatchEvent(new CustomEvent('herotypingcomplete'));
    }

    function startTyping() {
      if (anim.primed) return;
      if (prefersReduced) { finishTyping(); return; }
      anim.primed = true;
    }

    window.startHeroTyping = startTyping;

    function displayedTextFor(idx) {
      if (anim.finished) return lines[idx];
      if (!anim.primed) return '';
      if (idx < anim.lineIdx) return lines[idx];
      if (idx > anim.lineIdx) return '';
      if (lines[idx] === '') return '';
      return lines[idx].slice(0, anim.charIdx) + '_';
    }

    function renderMask() {
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, boxW, paintedH);
      mctx.font = fontSpec;
      mctx.textAlign = 'center';
      mctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in mctx) mctx.letterSpacing = letterSpacingPx + 'px';
      mctx.fillStyle = '#ffffff';
      for (var m = 0; m < lines.length; m++) {
        var text = displayedTextFor(m);
        if (text) mctx.fillText(text, boxW / 2, topY + lineHeightPx * (m + 1) - descentEstimate);
      }
    }

    function tickTyping(t) {
      if (anim.finished || !anim.primed) return;
      if (!anim.started) {
        anim.started = true;
        anim.nextAt = t + anim.initialDelayMs;
        renderMask();
        return;
      }
      if (t < anim.nextAt) return;
      var line = lines[anim.lineIdx];
      if (typeof line !== 'string') { finishTyping(); return; }
      if (line === '') {
        if (anim.lineIdx < lines.length - 1) {
          anim.lineIdx++;
          anim.charIdx = 0;
          anim.nextAt = t + anim.paragraphPauseMs;
          renderMask();
        } else {
          finishTyping();
        }
        return;
      }
      if (anim.charIdx < line.length) {
        anim.charIdx++;
        anim.nextAt = t + anim.charIntervalMs;
        renderMask();
      } else if (anim.lineIdx < lines.length - 1) {
        anim.lineIdx++;
        anim.charIdx = 0;
        anim.nextAt = t + anim.linePauseMs;
        renderMask();
      } else {
        finishTyping();
      }
    }

    function wrapText(raw, maxWidth) {
      var words = raw.split(' ');
      var wrapped = [];
      var current = '';
      for (var i = 0; i < words.length; i++) {
        var test = current ? current + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && current) {
          wrapped.push(current);
          current = words[i];
        } else {
          current = test;
        }
      }
      if (current) wrapped.push(current);
      return wrapped;
    }

    function refreshLayout() {
      var spanEls = Array.prototype.slice.call(hero.querySelectorAll('span'));
      var rawLines = spanEls.map(function (s) {
        return s.textContent.trim();
      });
      var cs = getComputedStyle(hero);
      var fontSize = parseFloat(cs.fontSize) || 32;
      var lh = parseFloat(cs.lineHeight);
      lineHeightPx = (!lh || isNaN(lh)) ? fontSize * 1.06 : lh;
      fontSpec = cs.fontWeight + ' ' + fontSize + 'px ' + cs.fontFamily;
      letterSpacingPx = parseFloat(cs.letterSpacing) || 0;

      var r = hero.getBoundingClientRect();
      boxW = r.width;
      boxH = r.height;
      var fs = parseFloat(getComputedStyle(hero).fontSize) || 32;
      var descenderPad = Math.ceil(fs * 0.35);
      paintedH = boxH + descenderPad;
      canvas.width = Math.max(2, Math.floor(boxW * dpr));
      canvas.height = Math.max(2, Math.floor(paintedH * dpr));
      canvas.style.width = boxW + 'px';
      canvas.style.height = paintedH + 'px';
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fontSpec;
      if ('letterSpacing' in ctx) ctx.letterSpacing = letterSpacingPx + 'px';

      lines = [];
      for (var k = 0; k < rawLines.length; k++) {
        if (spanEls[k] && spanEls[k].hasAttribute('data-sentence-start')) {
          lines.push('');
        }
        var wrapped = wrapText(rawLines[k], boxW);
        for (var j = 0; j < wrapped.length; j++) lines.push(wrapped[j]);
      }

      var totalH = lines.length * lineHeightPx;
      topY = (boxH - totalH) / 2;
      descentEstimate = fontSize * 0.22;
      renderMask();
    }

    function draw(t) {
      if (!running) return;
      var r = hero.getBoundingClientRect();
      if (Math.abs(r.width - boxW) > 0.5 || Math.abs(r.height - boxH) > 0.5) {
        refreshLayout();
      }
      tickTyping(t || performance.now());
      var bg = document.querySelector('#eigenfield-bg canvas');
      var vw = window.innerWidth, vh = window.innerHeight;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, boxW, paintedH);

      if (bg && bg.width > 0) {
        var sx = (r.left / vw) * bg.width;
        var sy = (r.top / vh) * bg.height;
        var sw = (r.width / vw) * bg.width;
        var sh = (paintedH / vh) * bg.height;
        try {
          ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, boxW, paintedH);
        } catch (e) { /* canvas not ready */ }
      }

      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(maskCanvas, 0, 0, boxW, paintedH);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0, boxW, paintedH);

      requestAnimationFrame(draw);
    }

    function startDrawing() {
      refreshLayout();
      hero.style.color = 'transparent';
      window.addEventListener('resize', refreshLayout);
      requestAnimationFrame(draw);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startDrawing, startDrawing);
    } else {
      startDrawing();
    }

    return function stop() {
      running = false;
      window.removeEventListener('resize', refreshLayout);
    };
  }

  window.startHiddenMessage = startHiddenMessage;
  window.startLumAdapter = startLumAdapter;
  window.startPillMirror = startPillMirror;
  window.startHeroCanvas = startHeroCanvas;
})();
