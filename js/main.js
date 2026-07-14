/* ============ TOP MEDIA ============ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // always start at the hero — the preloader plays on every load
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    window.__lenis = lenis;
  }
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------- Preloader: smooth focus-pull inside the viewfinder frame ---------- */
  const preloader = document.getElementById('preloader');
  const counterEl = document.getElementById('plCounter');
  const finishLoad = () => {
    preloader.classList.add('is-done');
    document.body.classList.add('is-loaded');
    document.body.classList.remove('no-scroll');
    if (lenis) lenis.start();
    setTimeout(() => preloader.remove(), 1200);
  };

  document.body.classList.add('no-scroll');
  if (lenis) lenis.stop();

  if (reduceMotion) {
    finishLoad();
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => preloader.classList.add('is-in')));
    // smooth eased counter 0 → 100 (purely timed, never waits on the network)
    const countStart = performance.now() + 300;
    const countDur = 1900;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    (function count() {
      const el = performance.now() - countStart;
      if (el < 0) return requestAnimationFrame(count);
      const p = Math.min(1, el / countDur);
      counterEl.textContent = Math.round(easeOutCubic(p) * 100) + '%';
      if (p < 1 && document.body.contains(counterEl)) requestAnimationFrame(count);
    })();
    setTimeout(() => preloader.classList.add('is-exit'), 2500);
    setTimeout(() => { if (!document.body.classList.contains('is-loaded')) finishLoad(); }, 2800);
    // hard cap in case anything stalls
    setTimeout(() => { if (!document.body.classList.contains('is-loaded')) finishLoad(); }, 5200);
  }

  /* ---------- Anchor scrolling ---------- */
  document.querySelectorAll('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      if (document.body.classList.contains('menu-open')) toggleMenu(false);
      setTimeout(() => scrollToTarget(href), 60);
    });
  });

  /* ---------- Nav detach on scroll ---------- */
  const nav = document.getElementById('nav');
  let navStuck = false;
  const onScroll = (y) => {
    const stuck = y > 70;
    if (stuck !== navStuck) {
      navStuck = stuck;
      nav.classList.toggle('is-stuck', stuck);
    }
    parallax(y);
    updateRail(y);
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  window.addEventListener('scroll', () => { if (!lenis) onScroll(window.scrollY); }, { passive: true });

  /* ---------- Hero parallax ---------- */
  const heroContent = document.querySelector('.hero__content');
  const heroBg = document.querySelector('.hero__bg');
  const heroH = () => window.innerHeight;
  function parallax(y) {
    if (y > heroH() * 1.2) return;
    if (heroContent) {
      heroContent.style.transform = `translateY(${y * 0.22}px)`;
      // stay fully visible for the first stretch, then fade out late
      const fadeStart = heroH() * 0.35;
      const fadeEnd = heroH() * 0.95;
      const op = y <= fadeStart ? 1 : Math.max(0, 1 - (y - fadeStart) / (fadeEnd - fadeStart));
      heroContent.style.opacity = op;
      heroContent.style.pointerEvents = op < 0.3 ? 'none' : '';
    }
    if (heroBg) heroBg.style.transform = `translateY(${y * 0.14}px)`;
  }

  /* ---------- Section rail (desktop) ---------- */
  const rail = document.getElementById('rail');
  const railProgress = document.getElementById('railProgress');
  const railThumb = document.getElementById('railThumb');
  const railItems = rail ? Array.from(rail.querySelectorAll('.rail__item')) : [];
  const railSections = railItems.map((a) => document.querySelector(a.getAttribute('href')));
  const railMQ = window.matchMedia('(min-width: 1200px)');
  function updateRail(y) {
    if (!rail || !railMQ.matches) return; // hidden below 1200px
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    railProgress.style.height = p * 100 + '%';
    railThumb.style.top = p * 100 + '%';
    let idx = 0;
    railSections.forEach((sec, i) => {
      if (sec && sec.getBoundingClientRect().top <= window.innerHeight * 0.4) idx = i;
    });
    railItems.forEach((a, i) => a.classList.toggle('is-active', i === idx));
  }
  updateRail(window.scrollY || 0);

  /* ---------- Fullscreen menu ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  function toggleMenu(open) {
    const willOpen = open !== null && open !== undefined ? open : !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', willOpen);
    menu.setAttribute('aria-hidden', String(!willOpen));
    burger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) { if (lenis) lenis.stop(); document.body.classList.add('no-scroll'); }
    else { if (lenis) lenis.start(); document.body.classList.remove('no-scroll'); }
  }
  burger.addEventListener('click', () => toggleMenu());

  /* ---------- Custom cursor (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add('has-cursor');
    const cursor = document.getElementById('cursor');
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    const label = document.getElementById('cursorLabel');
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function cursorLoop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(cursorLoop);
    })();
    document.addEventListener('mouseover', (e) => {
      const drag = e.target.closest('[data-cursor="drag"]');
      const hover = e.target.closest('a, button, [data-hover]');
      const gold = e.target.closest('.about, .svc.open, .btn--gold, .nav__cta');
      cursor.classList.toggle('is-drag', !!drag);
      cursor.classList.toggle('is-hover', !!hover && !drag);
      cursor.classList.toggle('on-gold', !!gold);
      label.textContent = drag ? 'DRAG' : '';
    });
  }

  /* ---------- Scroll reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 0.07}s`);
    io.observe(el);
  });

  /* ---------- About statement: word-by-word ---------- */
  const statement = document.getElementById('aboutStatement');
  if (statement) {
    const nodes = Array.from(statement.childNodes);
    statement.textContent = '';
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/\s+/).filter(Boolean).forEach((word) => {
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = word;
          statement.append(s, ' ');
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const s = document.createElement('span');
        s.className = 'w';
        s.appendChild(node.cloneNode(true));
        statement.append(s, ' ');
      }
    });
    const words = statement.querySelectorAll('.w');
    const ioWords = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        words.forEach((w, i) => setTimeout(() => w.classList.add('in'), i * 70));
        ioWords.disconnect();
      }
    }, { threshold: 0.35 });
    ioWords.observe(statement);
  }

  /* ---------- Services accordion ---------- */
  const services = document.querySelectorAll('.svc');
  services.forEach((svc) => {
    const head = svc.querySelector('.svc__head');
    head.addEventListener('click', () => {
      const isOpen = svc.classList.contains('open');
      services.forEach((s) => {
        s.classList.remove('open');
        s.querySelector('.svc__head').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        svc.classList.add('open');
        head.setAttribute('aria-expanded', 'true');
      }
    });
  });
  // first service open by default so the pattern is obvious
  if (services[0]) {
    services[0].classList.add('open');
    services[0].querySelector('.svc__head').setAttribute('aria-expanded', 'true');
  }

  /* ---------- Marquee: duplicate tracks for seamless loop ---------- */
  ['bandA', 'bandB'].forEach((id) => {
    const track = document.getElementById(id);
    if (track) track.innerHTML += track.innerHTML;
  });

  /* ---------- Infinite work carousel ---------- */
  const carousel = document.getElementById('carousel');
  const track = document.getElementById('carouselTrack');
  if (carousel && track) {
    track.innerHTML += track.innerHTML; // duplicate set → wrap at half width
    const cards = Array.from(track.children);

    // videos only download & play when their card is near the viewport
    const vids = Array.from(track.querySelectorAll('video'));
    if (vids.length) {
      const ioVid = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const v = en.target;
          if (en.isIntersecting) {
            v.muted = true;
            const pr = v.play();
            if (pr) pr.catch(() => {});
          } else {
            v.pause();
          }
        });
      }, { rootMargin: '100px 300px', threshold: 0.1 });
      vids.forEach((v) => ioVid.observe(v));
    }

    let x = 0, loopW = 0, autoSpeed = reduceMotion ? 0 : 0.45;
    let dragging = false, startX = 0, lastX = 0, vel = 0, moved = 0;
    let visible = true, running = false;

    const measure = () => {
      loopW = track.scrollWidth / 2;
    };
    measure();
    window.addEventListener('resize', measure);

    const ioCar = new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(loop); }
    }, { threshold: 0.05 });
    ioCar.observe(carousel);

    carousel.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0;
      startX = lastX = e.clientX;
      vel = 0;
      carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      x -= dx;
      vel = -dx;
    });
    const endDrag = () => { dragging = false; };
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
    // block accidental "clicks" after a drag
    carousel.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    // circular arc: cards dip and tilt toward the edges
    const arc = () => {
      const mid = window.innerWidth / 2;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.min(1, Math.max(-1, (c - mid) / mid)); // -1..1
        card.style.transform = `translateY(${(1 - Math.cos(d * Math.PI * 0.5)) * 26}px) rotate(${d * 2.4}deg)`;
      });
    };

    function loop() {
      if (!visible) { running = false; return; }
      if (!dragging) {
        x += autoSpeed + vel;
        vel *= 0.94;
        if (Math.abs(vel) < 0.01) vel = 0;
      }
      if (loopW > 0) {
        x = ((x % loopW) + loopW) % loopW;
      }
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
      arc();
      requestAnimationFrame(loop);
    }
    running = true;
    requestAnimationFrame(loop);
  }

  /* ---------- Hero constellation: the mark drawn in living particles (desktop) ---------- */
  const vizCanvas = document.getElementById('vizCanvas');
  if (vizCanvas && !reduceMotion) {
    const vizMQ = window.matchMedia('(min-width: 1100px)');
    const vctx = vizCanvas.getContext('2d');
    const VDPR = Math.min(1.5, window.devicePixelRatio || 1);
    let vw = 0, vh = 0, pts = [], amb = [], vizRunning = false, vizVisible = true;
    let px = 0, py = 0; // parallax offset
    const mouse = { x: -9999, y: -9999 };

    const buildTargets = () => {
      if (!vizMQ.matches) { pts = []; return; }
      vw = vizCanvas.clientWidth; vh = vizCanvas.clientHeight;
      if (!vw || !vh) { pts = []; return; }
      vizCanvas.width = vw * VDPR; vizCanvas.height = vh * VDPR;
      vctx.setTransform(VDPR, 0, 0, VDPR, 0, 0);
      // rasterize the logo mark and sample it into particle targets
      const off = document.createElement('canvas');
      off.width = vw; off.height = vh;
      const o = off.getContext('2d');
      const scale = Math.min((vw * 0.84) / 160, (vh * 0.84) / 123);
      o.setTransform(scale, 0, 0, scale, (vw - 160 * scale) / 2, (vh - 123 * scale) / 2);
      o.lineWidth = 2;
      o.lineJoin = 'round';
      ['M0 0H74L51.742 33H0V0Z', 'M160 0H86L108.258 33H160V0Z', 'M102 33H95V123H65V33H58L80 0L102 33Z']
        .forEach((d) => { const path = new Path2D(d); o.fill(path); o.stroke(path); });
      // carve the arrow notches back out, wide and crisp — the mark must never read as a plain T
      o.globalCompositeOperation = 'destination-out';
      o.lineWidth = 8;
      o.lineCap = 'round';
      o.beginPath();
      o.moveTo(79, -4); o.lineTo(52, 38);
      o.moveTo(81, -4); o.lineTo(108, 38);
      o.stroke();
      o.globalCompositeOperation = 'source-over';
      const data = o.getImageData(0, 0, vw, vh).data;
      const step = 5;
      pts = [];
      for (let y = 0; y < vh; y += step) {
        for (let x = 0; x < vw; x += step) {
          if (data[(y * vw + x) * 4 + 3] > 128) {
            pts.push({
              tx: x + (Math.random() - 0.5) * 4, ty: y + (Math.random() - 0.5) * 4,
              x: Math.random() * vw, y: Math.random() * vh,
              vx: 0, vy: 0,
              r: 1 + Math.random() * 1.2,
              ph: Math.random() * Math.PI * 2,
              tw: 0.5 + Math.random() * 1.1,
            });
          }
        }
      }
      // ambient drifters circulating around the mark
      amb = Array.from({ length: 64 }, () => ({
        x: Math.random() * vw, y: Math.random() * vh,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: 0.8 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
        tw: 0.4 + Math.random(),
      }));
    };
    const heroEl = document.querySelector('.hero');
    heroEl.addEventListener('mousemove', (e) => {
      const r = vizCanvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    heroEl.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    let vt = 0;
    function vizLoop() {
      if (!vizVisible || document.hidden || !pts.length) { vizRunning = false; return; }
      vt += 0.016;
      // whole scene eases gently toward the cursor
      const txp = mouse.x > -1000 ? (mouse.x - vw / 2) * 0.045 : 0;
      const typ = mouse.y > -1000 ? (mouse.y - vh / 2) * 0.045 : 0;
      px += (txp - px) * 0.04;
      py += (typ - py) * 0.04;
      vctx.clearRect(0, 0, vw, vh);
      vctx.save();
      vctx.translate(px, py);
      // ambient traffic: drifters + constellation threads between them
      for (const p of amb) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -6) p.x = vw + 6; else if (p.x > vw + 6) p.x = -6;
        if (p.y < -6) p.y = vh + 6; else if (p.y > vh + 6) p.y = -6;
      }
      vctx.lineWidth = 1;
      for (let i = 0; i < amb.length; i++) {
        for (let j = i + 1; j < amb.length; j++) {
          const dx = amb[i].x - amb[j].x, dy = amb[i].y - amb[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 5600) {
            vctx.strokeStyle = `rgba(255, 207, 12, ${0.16 * (1 - d2 / 5600)})`;
            vctx.beginPath();
            vctx.moveTo(amb[i].x, amb[i].y);
            vctx.lineTo(amb[j].x, amb[j].y);
            vctx.stroke();
          }
        }
      }
      for (const p of amb) {
        const a = 0.16 + 0.35 * Math.abs(Math.sin(vt * p.tw + p.ph));
        vctx.fillStyle = `rgba(255, 207, 12, ${a})`;
        vctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }
      // the mark itself — square particles that charge with light, bottom to top
      const waveY = vh * (1.15 - ((vt % 3.4) / 3.4) * 1.3);
      for (const p of pts) {
        const wx = Math.sin(vt * p.tw + p.ph) * 1.3;
        const wy = Math.cos(vt * p.tw * 0.9 + p.ph) * 1.3;
        let ax = (p.tx + wx - p.x) * 0.045;
        let ay = (p.ty + wy - p.y) * 0.045;
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 8100) {
          const d = Math.sqrt(d2) || 1;
          const f = ((90 - d) / 90) * 2.8;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
        p.vx = (p.vx + ax) * 0.86;
        p.vy = (p.vy + ay) * 0.86;
        p.x += p.vx; p.y += p.vy;
        const dW = Math.abs(p.y - waveY);
        const g = dW < 80 ? 1 - dW / 80 : 0; // rising glow band
        const a = Math.min(1, 0.32 + 0.45 * Math.abs(Math.sin(vt * p.tw + p.ph)) + g * 0.5);
        const size = p.r * (1 + g * 0.85);
        vctx.fillStyle = g > 0.02
          ? `rgba(255, ${Math.round(207 + 36 * g)}, ${Math.round(12 + 150 * g)}, ${a})`
          : `rgba(255, 207, 12, ${a})`;
        vctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
      }
      vctx.restore();
      requestAnimationFrame(vizLoop);
    }
    const startViz = () => { if (!vizRunning && pts.length) { vizRunning = true; requestAnimationFrame(vizLoop); } };
    const initViz = () => { buildTargets(); startViz(); };
    window.addEventListener('resize', initViz);
    if (vizMQ.addEventListener) vizMQ.addEventListener('change', initViz);
    const ioViz = new IntersectionObserver((e) => {
      vizVisible = e[0].isIntersecting;
      if (vizVisible) startViz();
    }, { threshold: 0 });
    ioViz.observe(vizCanvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && vizVisible) startViz(); });
    initViz();
  }

  /* ---------- Hero dust particles ---------- */
  const canvas = document.getElementById('dust');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, parts = [], heroVisible = true, dustRunning = false;

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const N = Math.min(46, Math.floor(w / 12));
    for (let i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.7,
        sy: 0.08 + Math.random() * 0.3,
        sx: (Math.random() - 0.5) * 0.15,
        ph: Math.random() * Math.PI * 2,
        tw: 0.4 + Math.random() * 0.7,
      });
    }
    let t = 0;
    function dustLoop() {
      if (!heroVisible || document.hidden) { dustRunning = false; return; }
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.sy;
        p.x += p.sx + Math.sin(t * 0.7 + p.ph) * 0.12;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        const a = (0.25 + 0.55 * Math.abs(Math.sin(t * p.tw + p.ph))) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 90, ${a})`;
        ctx.fill();
      }
      requestAnimationFrame(dustLoop);
    }
    const startDust = () => { if (!dustRunning) { dustRunning = true; requestAnimationFrame(dustLoop); } };
    const ioDust = new IntersectionObserver((e) => {
      heroVisible = e[0].isIntersecting;
      if (heroVisible) startDust();
    }, { threshold: 0 });
    ioDust.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && heroVisible) startDust(); });
    startDust();
  }
})();
