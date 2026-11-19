/* Biblioteca de prompts: copiar, índice, buscador y armador */
(function () {
  var toast = document.getElementById('toast'), tt;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('is-on'); }, 1600);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); return ok;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  /* Copiar */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy], #b-copy');
    if (!b) return;
    var text = b.id === 'b-copy' ? document.getElementById('b-out').textContent : b.getAttribute('data-copy');
    copy(text).then(function (ok) {
      if (!ok) { showToast('No se pudo copiar'); return; }
      if (b.classList.contains('pc-copy')) {
        var s = b.querySelector('span'); s.textContent = '¡Copiado!'; b.classList.add('is-done');
        clearTimeout(b._t); b._t = setTimeout(function () { s.textContent = 'Copiar'; b.classList.remove('is-done'); }, 1600);
      } else { showToast('¡Copiado!'); }
    });
  });

  /* Índice en celular */
  var nav = document.getElementById('bp-nav'), idxBtn = document.querySelector('.bp-idx');
  function setNav(open) { nav.classList.toggle('is-open', open); idxBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  idxBtn.addEventListener('click', function (e) { e.stopPropagation(); setNav(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('click', function (e) { if (nav.classList.contains('is-open') && !nav.contains(e.target) && e.target !== idxBtn) setNav(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  /* Sección activa en el índice */
  var links = {}; nav.querySelectorAll('.nv-g').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var grps = [].slice.call(document.querySelectorAll('.grp'));
  function markActive() {
    var cur = null, y = 120;
    for (var i = 0; i < grps.length; i++) {
      if (grps[i].offsetParent === null) continue;
      if (grps[i].getBoundingClientRect().top <= y) cur = grps[i]; else break;
    }
    Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-on', !!cur && cur.id === k); });
    var on = cur && links[cur.id];
    if (on && window.matchMedia('(min-width:900px)').matches) {
      var nr = nav.getBoundingClientRect(), lr = on.getBoundingClientRect();
      if (lr.top < nr.top + 40 || lr.bottom > nr.bottom - 20) nav.scrollTop += lr.top - nr.top - nr.height / 2;
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; markActive(); }); } }, { passive: true });
  markActive();

  /* Buscador */
  var q = document.getElementById('bp-q'), count = document.getElementById('bp-count'), empty = document.getElementById('bp-empty');
  var total = document.querySelectorAll('.pc').length;
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  function filter() {
    var terms = norm(q.value.trim()).split(/\s+/).filter(Boolean);
    var searching = terms.length > 0, shown = 0;
    var match = function (el) { var s = el.getAttribute('data-s'); return terms.every(function (t) { return s.indexOf(t) > -1; }); };
    document.querySelectorAll('.pc').forEach(function (c) { var ok = !searching || match(c); c.hidden = !ok; if (ok) shown++; });
    document.querySelectorAll('.chip, .chip-row').forEach(function (c) { c.classList.toggle('is-hidden', searching && !match(c)); });
    document.querySelectorAll('.chips-blk').forEach(function (b) { b.hidden = searching && !b.querySelector('.chip:not(.is-hidden), .chip-row:not(.is-hidden)'); });
    document.querySelectorAll('.pgrid').forEach(function (g) { g.hidden = searching && !g.querySelector('.pc:not([hidden])'); });
    document.querySelectorAll('.note, .steps, .bld, .subh, .grp-intro, .psec-intro').forEach(function (n) { n.hidden = searching; });
    var anyGrp = false;
    grps.forEach(function (g) {
      var vis = !searching || !!g.querySelector('.pc:not([hidden]), .chips-blk:not([hidden])');
      g.hidden = !vis; if (vis) anyGrp = true;
      if (links[g.id]) links[g.id].classList.toggle('is-hidden', !vis);
    });
    document.querySelectorAll('.psec').forEach(function (s) {
      var vis = !!s.querySelector('.grp:not([hidden])'); s.hidden = !vis;
      var top = nav.querySelector('a[href="#' + s.id + '"]'); if (top) top.classList.toggle('is-hidden', !vis);
    });
    empty.hidden = anyGrp;
    count.textContent = searching ? shown + ' de ' + total + ' prompts' : total + ' prompts';
    markActive();
  }
  q.addEventListener('input', filter);

  /* Armador de voz en off */
  var mode = 'img';
  var acc = document.getElementById('b-acc'), lug = document.getElementById('b-lug'), pla = document.getElementById('b-pla'), mov = document.getElementById('b-mov'), out = document.getElementById('b-out');
  if (out) {
    var lc = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };
    var build = function () {
      var a = 'Ella ' + lc(acc.value), l = lug.value;
      if (mode === 'img') {
        out.textContent = 'Usa esta imagen como referencia y conserva a la MISMA persona: el mismo rostro e identidad. ' + a + ' ' + l + ' ' + pla.value + ' Fotorrealista, textura de piel natural, poros visibles. Sin texto, sin marca de agua, sin distorsión.';
      } else {
        var m = mov.value.replace(/\.$/, '');
        var head = /cinematogr/i.test(m) ? m + ', sin hablar.' : m + ', cinematográfico, sin hablar.';
        out.textContent = head + ' Conserva a la MISMA persona de la referencia. ' + a + ' ' + l + ' Sin texto, sin marca de agua.';
      }
    };
    document.querySelectorAll('.bld-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        mode = t.getAttribute('data-mode');
        document.querySelectorAll('.bld-tab').forEach(function (x) { var on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
        document.getElementById('f-pla').hidden = mode !== 'img';
        document.getElementById('f-mov').hidden = mode !== 'vid';
        build();
      });
    });
    [acc, lug, pla, mov].forEach(function (s) { s.addEventListener('change', build); });
    build();
  }
})();
