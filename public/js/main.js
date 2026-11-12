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

  /* ---------- Barra flotante: aparece después del hero, se oculta en la oferta y muestra el precio después de ella ---------- */
  var floatCta = document.getElementById('float-cta');
  var offer = document.getElementById('oferta');
  var floatLink = floatCta && floatCta.querySelector('a');
  if (floatCta) {
    onScrollRaf(function () {
      var heroH = Math.min(960, Math.max(720, window.innerWidth * 0.64));
      var on = window.scrollY > heroH - 60;
      if (offer) {
        var r = offer.getBoundingClientRect();
        if (r.top < window.innerHeight - 40 && r.bottom > 80) on = false;
      }
      if (floatCta.hidden === on) floatCta.hidden = !on;
      // Sin precio hasta pasar la oferta; después de la oferta, con precio.
      var passed = offer ? offer.getBoundingClientRect().bottom <= 80 : false;
      var label = passed ? "Quiero entrar al club · US$47" : "Quiero entrar al club";
      if (floatLink && floatLink.textContent !== label) floatLink.textContent = label;
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
    // Celular: la primera vez que se ve el comparador, la línea se mueve sola (centro → izquierda → derecha → centro)
    // para mostrar que se puede arrastrar. Solo una vez; si la persona lo toca, la animación se detiene.
    var hintDone = false, hintRaf = null;
    var stopHint = function () { hintDone = true; if (hintRaf) { cancelAnimationFrame(hintRaf); hintRaf = null; } };
    box.addEventListener('pointerdown', stopHint);
    var runHint = function () {
      if (hintDone) return;
      hintDone = true;
      var keys = [50, 32, 68, 50], seg = 650, start = null;
      var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
      var frame = function (t) {
        if (start === null) start = t;
        var e = t - start, i = Math.floor(e / seg);
        if (i >= keys.length - 1) { baRange.value = 50; slide(); hintRaf = null; return; }
        var p = ease((e - i * seg) / seg);
        baRange.value = keys[i] + (keys[i + 1] - keys[i]) * p;
        slide();
        hintRaf = requestAnimationFrame(frame);
      };
      hintRaf = requestAnimationFrame(frame);
    };
    if ('IntersectionObserver' in window) {
      var hintIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || !mqMobile.matches) return;
        hintIO.disconnect();
        setTimeout(runHint, 250);
      }, { threshold: 0.6 });
      hintIO.observe(box);
    }
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
  // Línea de pasos del Agente de Guiones: en celular se rellena el paso que cruza el centro de la pantalla.
  activeOnScroll(document.querySelector('.flow'), 'li');

  /* ---------- Cinta de película con desplazamiento automático ----------
     - Se mueve sola hacia la izquierda en bucle sin cortes (más rápido en PC que en celular).
     - PC: se detiene con el mouse encima y se puede arrastrar con el mouse.
     - Celular: se arrastra con el dedo; al soltar (y terminar la inercia) sigue desde ahí.
     Cómo funciona:
     - El movimiento automático usa solo transform (suave en cualquier pantalla y escala de Windows).
       La posición de scroll solo cambia cuando la persona arrastra.
     - Los cuadros se repiten para llenar pantallas anchas y la posición se mantiene siempre
       dentro de una "vuelta" del medio, así se puede arrastrar sin fin hacia ambos lados. */
  var reel = document.getElementById('reel');
  var strip = reel && reel.querySelector('.strip');
  if (reel && strip) {
    var SPEED_PC = 45;         // píxeles por segundo en PC
    var SPEED_PHONE = 22;      // píxeles por segundo en celular
    var RESUME_AFTER = 700;    // ms sin tocar/arrastrar antes de reanudar
    var originals = Array.prototype.filter.call(strip.children, function (li) { return !li.hasAttribute('aria-hidden'); });
    var now = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
    var hover = false, touching = false, drag = null, lastUser = -1e9, visible = true;
    var auto = false, offset = 0, last = null, lastSet = -1;
    var period = 0, pad = 0;

    // Ancho de una vuelta completa (los cuadros originales con sus márgenes) y margen izquierdo del carril.
    var measure = function () {
      var first = originals[0];
      var next = first && strip.children[originals.length];
      period = next ? next.offsetLeft - first.offsetLeft : strip.scrollWidth / 2;
      pad = parseFloat(getComputedStyle(reel).paddingLeft) || 0;
      var guard = 0;
      while (period > 0 && strip.scrollWidth < pad + period * 2 + reel.clientWidth && guard++ < 10) {
        originals.forEach(function (li) {
          var c = li.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          strip.appendChild(c);
        });
      }
    };

    // Lleva una posición a la vuelta del medio; el contenido es idéntico, así que el salto no se ve.
    var lo = function () { return pad + period * 0.5; };
    var norm = function (x) {
      if (period <= 0) return x;
      while (x < lo()) x += period;
      while (x >= lo() + period) x -= period;
      return x;
    };
    var setScroll = function (x) { reel.scrollLeft = x; lastSet = reel.scrollLeft; };

    measure();
    setScroll(norm(period));

    // Pasa el desplazamiento automático al scroll real, para arrastrar desde donde se ve la cinta.
    var commit = function () {
      if (!auto) return;
      var target = reel.scrollLeft + offset;
      auto = false; offset = 0; last = null;
      strip.style.transform = 'translate3d(0,0,0)';
      setScroll(target);
    };

    var userActive = function () { lastUser = now(); };

    // Dedo (celular): scroll nativo con inercia.
    reel.addEventListener('touchstart', function () { touching = true; userActive(); commit(); }, { passive: true });
    reel.addEventListener('touchmove', userActive, { passive: true });
    reel.addEventListener('touchend', function () { touching = false; userActive(); }, { passive: true });
    reel.addEventListener('touchcancel', function () { touching = false; userActive(); }, { passive: true });

    // Mouse (PC): se detiene encima y se arrastra con clic sostenido.
    reel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    reel.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      e.preventDefault();
      commit();
      drag = { x: e.clientX, s: reel.scrollLeft, id: e.pointerId };
      try { reel.setPointerCapture(e.pointerId); } catch (err) {}
      reel.classList.add('is-dragging');
      userActive();
    });
    reel.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var target = drag.s - (e.clientX - drag.x);
      var n = norm(target);
      drag.s += n - target;   // si saltó una vuelta, el punto de partida salta igual
      setScroll(n);
      userActive();
    });
    var endDrag = function () {
      if (!drag) return;
      drag = null;
      reel.classList.remove('is-dragging');
      userActive();
    };
    reel.addEventListener('pointerup', endDrag);
    reel.addEventListener('pointercancel', endDrag);
    reel.addEventListener('lostpointercapture', endDrag);

    reel.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { userActive(); commit(); }
    }, { passive: true });
    // Cualquier scroll que no hizo este código (dedo, inercia, teclado) cuenta como acción de la persona.
    reel.addEventListener('scroll', function () {
      if (Math.abs(reel.scrollLeft - lastSet) > 1) userActive();
    }, { passive: true });

    window.addEventListener('resize', function () { commit(); measure(); setScroll(norm(reel.scrollLeft)); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(reel);
    }

    var tick = function (t) {
      var userBusy = touching || drag || (now() - lastUser < RESUME_AFTER);
      if (userBusy) commit();
      if (period > 0 && visible && !hover && !userBusy) {
        if (!auto) {
          setScroll(norm(reel.scrollLeft));   // tras un arrastre con el dedo, vuelve a la vuelta del medio
          auto = true; offset = 0; last = null;
        }
        if (last !== null) offset += Math.min(t - last, 50) * (mqMobile.matches ? SPEED_PHONE : SPEED_PC) / 1000;
        last = t;
        if (reel.scrollLeft + offset >= lo() + period) offset -= period;
        strip.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px,0,0)';
      } else {
        last = null;   // en pausa: la cinta se queda quieta donde está
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

  /* ---------- Videos de fondo (Club de Socios y Agente de Guiones) ----------
     PC: video de fondo de la sección. Celular: un video dentro de cada paso.
     Siempre en silencio; cada uno se reproduce solo mientras está visible (los ocultos ni se descargan). */
  var socioVids = Array.prototype.slice.call(document.querySelectorAll(".sv-video, .step-video, .ag-video"));
  if (socioVids.length && "IntersectionObserver" in window) {
    var socioIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && v.offsetParent !== null) { v.preload = "auto"; safePlay(v); } else { v.pause(); }
      });
    }, { rootMargin: "200px 0px 200px 0px" });
    socioVids.forEach(function (v) { v.muted = true; socioIO.observe(v); });
    // Al pasar de PC a celular (o al revés), pausa el que queda oculto y vuelve a evaluar.
    if (mqMobile.addEventListener) mqMobile.addEventListener("change", function () {
      socioVids.forEach(function (v) { if (v.offsetParent === null) v.pause(); socioIO.unobserve(v); socioIO.observe(v); });
    });
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

/* Club de Socios: calculadora de ingresos (US$23 por venta) */
(function () {
  var range = document.getElementById('calc-range');
  if (!range) return;
  var PER_SALE = 23;
  var sales = document.getElementById('calc-sales');
  var month = document.getElementById('calc-month');
  var year = document.getElementById('calc-year');
  var fmt = function (n) { return 'US$' + n.toLocaleString('es-CO'); };
  function update() {
    var v = +range.value;
    var p = (v - range.min) / (range.max - range.min) * 100;
    range.style.setProperty('--p', p + '%');
    sales.textContent = v;
    month.textContent = fmt(v * PER_SALE * 30);
    year.textContent = fmt(v * PER_SALE * 30 * 12);
    range.setAttribute('aria-valuetext', v + ' ventas al día, ' + fmt(v * PER_SALE * 30) + ' al mes');
  }
  range.addEventListener('input', update);
  update();
})();
