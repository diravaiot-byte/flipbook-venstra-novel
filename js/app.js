(function () {
  'use strict';

  var C = Object.assign({
    title: 'Buku', subtitle: '', author: '', pdf: 'book/book.pdf',
    allowDownload: true, accent: '#c0392b', flipTime: 800
  }, window.FLIPBOOK_CONFIG || {});

  var $ = function (s) { return document.querySelector(s); };
  var el = {
    stage: $('#stage'), fit: $('#fit'), slider: $('#slider'), label: $('#label'),
    prev: $('#btn-prev'), next: $('#btn-next'), first: $('#btn-first'), last: $('#btn-last'),
    edgeL: $('#edge-l'), edgeR: $('#edge-r'), fs: $('#btn-fs'), dl: $('#btn-dl'), sound: $('#btn-sound'),
    toast: $('#toast'), loader: $('#loader'), ldBar: $('#ld-bar'), ldMsg: $('#ld-msg')
  };

  document.title = C.title + (C.subtitle ? ' – ' + C.subtitle : '');
  document.documentElement.style.setProperty('--accent', C.accent);
  $('#bk-title').textContent = C.title; $('#bk-sub').textContent = C.subtitle + (C.author ? ' · ' + C.author : '');
  $('#ld-title').textContent = C.title; $('#ld-sub').textContent = C.subtitle;

  var storeKey = 'flipbook:' + C.pdf;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } }

  var pdf = null, numPages = 0, ratio = 0.705;
  var pageEls = [], rendered = [], flip = null, cur = 0, mode = null, resizeT = null;
  var isTouch = window.matchMedia('(hover: none)').matches;
  var targetW = isTouch ? 900 : 1100;

  /* ---------------- loader ---------------- */
  function progress(p) { el.ldBar.style.width = Math.max(0, Math.min(100, p)) + '%'; }
  function fail(msg) {
    el.loader.classList.add('error'); el.loader.classList.remove('hide');
    el.ldMsg.textContent = msg;
  }

  /* ---------------- pdf ---------------- */
  async function loadPdf() {
    if (!window.pdfjsLib) throw new Error('Library pdf.js tidak termuat.');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    var task = pdfjsLib.getDocument({ url: C.pdf });
    task.onProgress = function (p) { if (p.total) progress(p.loaded / p.total * 45); };
    pdf = await task.promise;
    numPages = pdf.numPages;
    var p1 = await pdf.getPage(1), vp = p1.getViewport({ scale: 1 });
    ratio = vp.width / vp.height;
  }

  function buildPages() {
    for (var i = 0; i < numPages; i++) {
      var d = document.createElement('div');
      d.className = 'page' + (i === 0 || i === numPages - 1 ? ' cover' : '');
      if (i === 0 || i === numPages - 1) d.setAttribute('data-density', 'hard');
      d.innerHTML = '<div class="paper"></div><i class="ph"></i><img alt="Halaman ' + (i + 1) + '" draggable="false"><div class="tint"></div>';
      pageEls.push(d); rendered.push(false);
    }
  }

  async function renderPage(i) {
    var page = await pdf.getPage(i + 1);
    var v0 = page.getViewport({ scale: 1 });
    var vp = page.getViewport({ scale: targetW / v0.width });
    var cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    var ctx = cv.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp, background: '#ffffff' }).promise;
    var blob = await new Promise(function (r) { cv.toBlob(r, 'image/jpeg', 0.9); });
    var img = pageEls[i].querySelector('img');
    img.onload = function () { pageEls[i].classList.add('ready'); };
    img.src = blob ? URL.createObjectURL(blob) : cv.toDataURL('image/jpeg', 0.9);
    rendered[i] = true; page.cleanup(); cv.width = cv.height = 0;
  }

  var pumping = false;
  function nextIndex() {
    var best = -1, bd = 1e9;
    for (var i = 0; i < numPages; i++) if (!rendered[i]) { var d = Math.abs(i - cur) + (i < cur ? 0.5 : 0); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  async function pump() {
    if (pumping) return; pumping = true;
    try { for (; ;) { var i = nextIndex(); if (i < 0) break; rendered[i] = 'busy'; await renderPage(i); } }
    catch (e) { console.error(e); }
    finally { pumping = false; }
  }

  /* ---------------- layout ---------------- */
  function computeLayout() {
    var aw = el.stage.clientWidth - 24, ah = el.stage.clientHeight - 44;
    var landscape = aw >= 720 && aw / ah >= 1.25;
    var fw, fh;
    if (landscape) { fw = Math.min(aw - 120, ah * 2 * ratio); fh = fw / (2 * ratio); }
    else { fw = Math.min(aw, ah * ratio); fh = fw / ratio; }
    return { landscape: landscape, fw: Math.floor(fw), fh: Math.floor(fh) };
  }

  function mount(start) {
    var L = computeLayout();
    mode = L.landscape ? 'landscape' : 'portrait';
    if (flip) { try { flip.destroy(); } catch (e) { } flip = null; }
    el.fit.innerHTML = '';
    el.fit.style.width = L.fw + 'px'; el.fit.style.height = L.fh + 'px';
    pageEls.forEach(function (p) {
      p.removeAttribute('style');
      p.classList.remove('stf__item', '--left', '--right', '--soft', '--hard', '--simple');
    });
    var host = document.createElement('div'); host.id = 'book'; el.fit.appendChild(host);
    flip = new St.PageFlip(host, {
      width: Math.round(ratio * 1000), height: 1000, size: 'stretch',
      minWidth: L.landscape ? 100 : Math.floor(L.fw / 2) + 1, maxWidth: 3000, minHeight: 100, maxHeight: 4000,
      maxShadowOpacity: 0.45, showCover: true, mobileScrollSupport: false, usePortrait: true,
      flippingTime: C.flipTime, startPage: start || 0, drawShadow: true, swipeDistance: 25,
      showPageCorners: true, autoSize: true
    });
    flip.loadFromHTML(pageEls);
    flip.on('flip', function (e) { cur = e.data; sync(); store(storeKey, String(cur)); playFlip(); pump(); });
    cur = start || 0; sync();
    requestAnimationFrame(function () { el.fit.classList.add('show'); });
  }

  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      if (!flip) return;
      var L = computeLayout();
      if ((L.landscape ? 'landscape' : 'portrait') !== mode) { mount(cur); return; }
      el.fit.style.width = L.fw + 'px'; el.fit.style.height = L.fh + 'px';
      try { flip.update(); } catch (e) { }
    }, 120);
  }

  /* ---------------- ui sync ---------------- */
  function label(i) {
    if (mode === 'landscape' && i > 0 && i < numPages - 1) return 'Halaman ' + (i + 1) + '–' + (i + 2) + ' dari ' + numPages;
    return 'Halaman ' + (i + 1) + ' dari ' + numPages;
  }
  function sync() {
    el.slider.max = numPages; el.slider.value = cur + 1;
    el.slider.style.setProperty('--p', (numPages > 1 ? cur / (numPages - 1) * 100 : 0) + '%');
    el.label.textContent = label(cur);
    var shift = '0';
    if (mode === 'landscape') { if (cur === 0) shift = '-25%'; else if (cur === numPages - 1 && numPages % 2 === 0) shift = '25%'; }
    el.fit.style.setProperty('--shift', shift);
    var atStart = cur <= 0, atEnd = cur >= numPages - 1;
    el.prev.disabled = el.first.disabled = el.edgeL.disabled = atStart;
    el.next.disabled = el.last.disabled = el.edgeR.disabled = atEnd;
  }

  /* ---------------- controls ---------------- */
  function go(n) { if (!flip) return; n = Math.max(0, Math.min(numPages - 1, n)); flip.flip(n); }
  el.prev.onclick = el.edgeL.onclick = function () { flip && flip.flipPrev(); };
  el.next.onclick = el.edgeR.onclick = function () { flip && flip.flipNext(); };
  el.first.onclick = function () { go(0); };
  el.last.onclick = function () { go(numPages - 1); };
  el.slider.oninput = function () {
    var n = parseInt(el.slider.value, 10) - 1;
    el.label.textContent = label(n);
    el.slider.style.setProperty('--p', (n / (numPages - 1) * 100) + '%');
  };
  el.slider.onchange = function () { go(parseInt(el.slider.value, 10) - 1); };
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT' && e.key !== 'Home' && e.key !== 'End') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { flip && flip.flipNext(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { flip && flip.flipPrev(); e.preventDefault(); }
    else if (e.key === 'Home') { go(0); e.preventDefault(); }
    else if (e.key === 'End') { go(numPages - 1); e.preventDefault(); }
    else if (e.key === 'f' || e.key === 'F') { toggleFs(); }
  });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  /* fullscreen */
  var root = document.documentElement;
  var fsReq = root.requestFullscreen || root.webkitRequestFullscreen;
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFs() {
    if (!fsReq) return;
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else fsReq.call(root);
  }
  if (!fsReq) el.fs.hidden = true; else el.fs.onclick = toggleFs;
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { document.body.classList.toggle('is-fs', !!fsEl()); setTimeout(onResize, 150); });
  });

  /* download */
  if (C.allowDownload) { el.dl.hidden = false; el.dl.href = C.pdf; el.dl.setAttribute('download', (C.title || 'buku') + '.pdf'); }

  /* sound */
  var soundOn = store('flipbook:sound') === '1', actx = null;
  el.sound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  el.sound.onclick = function () {
    soundOn = !soundOn; store('flipbook:sound', soundOn ? '1' : '0');
    el.sound.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); if (soundOn) playFlip();
  };
  function playFlip() {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var dur = 0.3, n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) { var t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4) * Math.min(1, t * 8); }
      var s = actx.createBufferSource(); s.buffer = buf;
      var f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5;
      var g = actx.createGain(); g.gain.value = 0.22; s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
    } catch (e) { }
  }

  /* toast */
  var toastT = null;
  function toast(html, ms, onBtn) {
    el.toast.innerHTML = html; el.toast.classList.add('on');
    var b = el.toast.querySelector('button');
    if (b && onBtn) b.onclick = function () { el.toast.classList.remove('on'); onBtn(); };
    clearTimeout(toastT); toastT = setTimeout(function () { el.toast.classList.remove('on'); }, ms || 4500);
  }

  /* ---------------- start ---------------- */
  async function start() {
    if (location.protocol === 'file:') {
      fail('Buku tidak bisa dibuka langsung dari file. Jalankan server lokal (lihat README) atau unggah folder ini ke hosting.');
      return;
    }
    try {
      await loadPdf();
      buildPages();
      progress(50);
      var first = Math.min(4, numPages);
      for (var i = 0; i < first; i++) { rendered[i] = 'busy'; await renderPage(i); progress(50 + (i + 1) / first * 50); }
      el.ldMsg.textContent = 'Membuka buku…';
      mount(0);
      el.loader.classList.add('hide');
      pump();
      var saved = parseInt(store(storeKey) || '0', 10);
      if (saved > 1 && saved < numPages) {
        toast('Lanjutkan membaca di halaman ' + (saved + 1) + '? <button type="button">Lanjutkan</button>', 7000, function () { go(saved); });
      } else if (!store('flipbook:hint')) {
        toast(isTouch ? 'Geser halaman ke kiri atau kanan untuk membaca.' : 'Klik pojok halaman, tekan ← →, atau tarik halaman untuk membalik.', 5000);
        store('flipbook:hint', '1');
      }
    } catch (e) {
      console.error(e);
      var m = (e && e.name === 'MissingPDFException') ? 'File ' + C.pdf + ' tidak ditemukan. Taruh PDF bukumu di folder "book" dengan nama book.pdf.'
        : 'Buku tidak dapat dibuka. Pastikan file ' + C.pdf + ' ada dan situs dibuka lewat server (bukan klik ganda file).';
      fail(m);
    }
  }
  start();
})();
