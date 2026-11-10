/* Reality Club · página de ventas
   Comportamiento de la página: videos, contadores, comparador, barra flotante, etc. */
(function () {
  'use strict';

  var mqMobile = window.matchMedia ? window.matchMedia('(max-width: 899px)') : { matches: false };
  var safePlay = function (v) { var p = v && v.play(); if (p && p.catch) p.catch(function () {}); };
  var onScrollRaf = function (fn) {
    var raf = null;
    var h = function () { if (!raf) raf = requestAnimationFrame(function () { raf = null; fn(); }); };
    window.addEventListener('scroll', h, { passive: true });
    window.addEventListener('resize', h);
    fn();
  };

  /* ---------- Videos con botón de play (uno a la vez, con sonido) ---------- */
  var vids = {};
  document.querySelectorAll('video[data-vid]').forEach(function (v) { vids[v.getAttribute('data-vid')] = v; });
  var playing = null;

  function setPlaying(k) {
    playing = k;
    document.querySelectorAll('[data-play-ind]').forEach(function (s) {
      s.hidden = s.getAttribute('data-play-ind') === k;
    });
    document.querySelectorAll('[data-vid-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', b.getAttribute('data-vid-toggle') === k ? 'Pausar video' : 'Reproducir video con sonido');
    });
  }

  document.querySelectorAll('[data-vid-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-vid-toggle');
      var me = vids[k];
      if (!me) return;
      if (playing === k) { me.pause(); setPlaying(null); return; }
      Object.keys(vids).forEach(function (j) { if (j !== k) vids[j].pause(); });
      me.muted = false;
      safePlay(me);
      setPlaying(k);
    });
  });

  Object.keys(vids).forEach(function (k) {
    vids[k].addEventListener('ended', function (e) {
      var v = e.target;
      try { v.currentTime = 0; v.load(); } catch (err) {}
      if (playing === k) setPlaying(null);
    });
  });

  /* ---------- Barra flotante: aparece después del hero, se oculta en la oferta ---------- */
  var floatCta = document.getElementById('float-cta');
  var offer = document.getElementById('oferta');
  if (floatCta) {
    onScrollRaf(function () {
      var heroH = Math.min(960, Math.max(720, window.innerWidth * 0.64));
      var on = window.scrollY > heroH - 60;
      if (offer) {
        var r = offer.getBoundingClientRect();
        if (r.top < window.innerHeight - 40 && r.bottom > 80) on = false;
      }
      if (floatCta.hidden === on) floatCta.hidden = !on;
    });
  }

  /* ---------- Enlaces a #oferta: compensa la barra de navegación fija ---------- */
  var offerJob = 0;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href="#oferta"]') : null;
    if (!a || !offer) return;
    e.preventDefault();
    var job = ++offerJob;
    var navH = function () { var nv = document.querySelector('nav[aria-label="Principal"]'); return nv ? nv.getBoundingClientRect().height : 72; };
    var dest = function () { return window.scrollY + offer.getBoundingClientRect().top - navH() - 12; };
    window.scrollTo({ top: dest(), behavior: 'smooth' });
    // Corrige el destino si el contenido (videos, imágenes) cambia de alto durante el desplazamiento.
    var tries = 0, lastY = -1, still = 0;
    var check = function () {
      if (job !== offerJob) return;
      var y = window.scrollY;
      still = Math.abs(y - lastY) < 1 ? still + 1 : 0;
      lastY = y;
      if (still >= 3) {
        var d = dest();
        if (Math.abs(d - y) > 3 && tries < 6) { tries++; still = 0; window.scrollTo({ top: d, behavior: 'auto' }); }
        else return;
      }
      setTimeout(check, 60);
    };
    setTimeout(check, 120);
    var stop = function () { offerJob++; window.removeEventListener('touchstart', stop); window.removeEventListener('wheel', stop); };
    setTimeout(function () {
      window.addEventListener('touchstart', stop, { passive: true });
      window.addEventListener('wheel', stop, { passive: true });
    }, 50);
  });

  /* ---------- Antes y después (Grabando como siempre / Con Reality Club) en móvil ---------- */
  var vsSec = document.getElementById('vs-sec');
  var vsList = document.getElementById('vs-list');
  document.querySelectorAll('[data-vs]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.getAttribute('data-vs');
      if (vsSec) vsSec.className = vsSec.className.replace(/vs-sec-\w+/, 'vs-sec-' + tab);
      if (vsList) vsList.className = vsList.className.replace(/vs-tab-\w+/, 'vs-tab-' + tab);
      document.querySelectorAll('[data-vs]').forEach(function (b) {
        var on = b.getAttribute('data-vs') === tab;
        b.className = on ? (tab === 'old' ? 'on-old' : 'on') : '';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  /* ---------- Comparador deslizable ---------- */
  var baRange = document.getElementById('ba-range');
  var baTop = document.getElementById('ba-top');
  var baLine = document.getElementById('ba-line');
  if (baRange) {
    var slide = function () {
      var v = Number(baRange.value);
      if (baTop) baTop.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)';
      if (baLine) baLine.style.left = v + '%';
    };
    baRange.addEventListener('input', slide);
    baRange.addEventListener('change', slide);

    // Arrastre con mouse o dedo en cualquier punto del comparador.
    // touch-action: pan-y deja que el deslizamiento vertical siga moviendo la página.
    var box = baRange.parentElement;
    box.classList.add('ba-box');
    var down = null, dragging = false;
    var setFromX = function (clientX) {
      var r = box.getBoundingClientRect();
      var pct = Math.max(0, Math.min(100, (clientX - r.left) / r.width * 100));
      baRange.value = pct;
      slide();
    };
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      // Con mouse mueve al instante; con el dedo espera a ver si el gesto es horizontal.
      dragging = e.pointerType === 'mouse';
      if (dragging) setFromX(e.clientX);
    });
    box.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      if (!dragging) {
        var dx = Math.abs(e.clientX - down.x), dy = Math.abs(e.clientY - down.y);
        if (dx > 6 && dx > dy) dragging = true; else return;
      }
      e.preventDefault();
      setFromX(e.clientX);
    });
    box.addEventListener('pointerup', function (e) {
      // Un toque sin arrastrar también mueve la línea a ese punto.
      if (down && !dragging && Math.abs(e.clientX - down.x) < 6 && Math.abs(e.clientY - down.y) < 6) setFromX(e.clientX);
      down = null; dragging = false;
    });
    box.addEventListener('pointercancel', function () { down = null; dragging = false; });
  }

  /* ---------- Código de tiempo de la cámara ---------- */
  var tc = document.getElementById('tc');
  if (tc) {
    var sec = 0;
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    setInterval(function () {
      sec += 1;
      tc.textContent = '00:' + p2(Math.floor(sec / 60) % 60) + ':' + p2(sec % 60) + ':' + p2((sec * 7) % 24);
    }, 1000);
  }

  /* ---------- Tarjetas activas al centro de la pantalla (móvil) ---------- */
  function activeOnScroll(container, selector) {
    if (!container) return;
    var cards = container.querySelectorAll(selector);
    onScrollRaf(function () {
      var mid = window.innerHeight / 2;
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect();
        c.classList.toggle('is-active', mqMobile.matches && r.top < mid && r.bottom > mid);
      });
    });
  }
  activeOnScroll(document.getElementById('real-grid'), '.card');
  activeOnScroll(document.getElementById('stage-list'), '.stage-card');

  /* ---------- Ejemplo paso a paso: videos de cada etapa ---------- */
  var stageSec = document.getElementById('stage-sec');
  var stageVids = Array.prototype.slice.call(document.querySelectorAll('video[data-stage-vid]'));
  var scvs = Array.prototype.slice.call(document.querySelectorAll('video[data-scv]'));
  var stageCards = Array.prototype.slice.call(document.querySelectorAll('#stage-list .stage-card'));
  var stage = 0, stagePlaying = false;

  stageVids.concat(scvs).forEach(function (v) { v.muted = true; });

  function markStage() {
    stageCards.forEach(function (c, i) { c.classList.toggle('stage-on', stagePlaying && i === stage); });
    stageVids.forEach(function (v, i) { v.style.opacity = i === stage ? '0.6' : '0'; });
  }
  stageVids.forEach(function (v, i) {
    v.addEventListener('ended', function () {
      stage = (i + 1) % stageVids.length;
      markStage();
      var nx = stageVids[stage];
      if (nx) { nx.currentTime = 0; safePlay(nx); }
      var after = stageVids[(stage + 1) % stageVids.length];
      if (after) after.preload = 'auto';
    });
  });
  function startStage() {
    if (mqMobile.matches) {
      scvs.forEach(function (v) { v.preload = 'auto'; safePlay(v); });
    } else {
      safePlay(stageVids[stage]);
      var nx = stageVids[(stage + 1) % stageVids.length];
      if (nx) nx.preload = 'auto';
    }
    if (!stagePlaying) { stagePlaying = true; markStage(); }
  }
  function stopStage() {
    stageVids.concat(scvs).forEach(function (v) { v.pause(); });
  }
  if (stageSec && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) startStage(); else stopStage(); });
    }, { rootMargin: '700px 0px 700px 0px' }).observe(stageSec);
  } else if (stageSec) {
    startStage();
  }

  /* ---------- Cinta de película con desplazamiento automático ---------- */
  /* La cinta se mueve sola hacia la izquierda, despacio.
     PC: se detiene mientras el mouse está encima.
     Celular: se puede arrastrar con el dedo; al soltar (y terminar la inercia) sigue moviéndose.
     El contenido de la cinta está duplicado, así que al llegar a la mitad salta al inicio sin que se note. */
  var reel = document.getElementById('reel');
  if (reel) {
    var SPEED = 22;            // píxeles por segundo
    var RESUME_AFTER = 700;    // ms sin tocar/desplazar antes de reanudar
    var strip = reel.querySelector('.strip');
    var now = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
    var hover = false, touching = false, lastUser = -1e9, visible = true;
    var pos = 0, last = null, lastSet = -1;

    var userActive = function () { lastUser = now(); };
    reel.addEventListener('touchstart', function () { touching = true; userActive(); }, { passive: true });
    reel.addEventListener('touchmove', userActive, { passive: true });
    reel.addEventListener('touchend', function () { touching = false; userActive(); }, { passive: true });
    reel.addEventListener('touchcancel', function () { touching = false; userActive(); }, { passive: true });
    reel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    reel.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
    reel.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) userActive(); }, { passive: true });
    // Desplazamientos que no hizo la animación (dedo o inercia) mantienen la pausa.
    reel.addEventListener('scroll', function () {
      if (Math.abs(reel.scrollLeft - lastSet) > 1) userActive();
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(reel);
    }

    var setScroll = function (x) { reel.scrollLeft = x; lastSet = reel.scrollLeft; };

    var tick = function (t) {
      var half = strip ? strip.scrollWidth / 2 : 0;
      var paused = hover || touching || (now() - lastUser < RESUME_AFTER);
      if (half > 0 && visible && !paused) {
        if (last === null) pos = reel.scrollLeft;      // reanuda desde donde lo dejó el usuario
        else pos += Math.min(t - last, 50) * SPEED / 1000;
        if (pos >= half) pos -= half;
        if (pos < 0) pos += half;
        var whole = Math.floor(pos);
        if (whole !== Math.round(reel.scrollLeft)) setScroll(whole);
        // La fracción de píxel se aplica con transform para que el movimiento lento sea suave.
        strip.style.transform = 'translate3d(' + (-(pos - whole)).toFixed(2) + 'px,0,0)';
        last = t;
      } else {
        if (last !== null) { last = null; strip.style.transform = 'translate3d(0,0,0)'; }
        // Si el usuario arrastró fuera del tramo duplicado, lo devuelve al equivalente sin que se note.
        if (half > 0 && !touching && now() - lastUser > 300) {
          if (reel.scrollLeft >= half) setScroll(reel.scrollLeft - half);
          else if (reel.scrollLeft < 1) setScroll(reel.scrollLeft + half);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Contadores animados (arrancan al verse) ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  function runCounters() {
    var start = null;
    var step = function (t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / 1600);
      var e = 1 - Math.pow(1 - p, 3);
      counters.forEach(function (c) { c.textContent = Math.round(Number(c.getAttribute('data-count')) * e); });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { cio.disconnect(); runCounters(); }
      }, { threshold: 0.3 });
      counters.forEach(function (c) { cio.observe(c); });
    } else {
      runCounters();
    }
  }

  /* ---------- Reto "¿Cuál es real y cuál es IA?" ---------- */
  var revealBtn = document.getElementById('reveal-btn');
  if (revealBtn) {
    var revealed = false;
    revealBtn.addEventListener('click', function () {
      revealed = !revealed;
      document.querySelectorAll('[data-reveal]').forEach(function (el) { el.hidden = !revealed; });
      revealBtn.textContent = revealed ? 'Ocultar respuesta' : 'Ver la respuesta';
    });
  }
})();
