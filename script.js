/* =============================================
   SCOPNUM — immersive interactive engine
   ============================================= */

(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* ============================================
     SMOOTH SCROLL ENGINE (lerp-based)
     ============================================ */
  const smooth = document.getElementById('smooth');
  const content = document.getElementById('smoothContent');
  let scrollY = 0, smoothY = 0, scrollVelocity = 0;
  let contentH = 0;
  // Smooth scroll DISABLED — native scroll used for sticky sections compatibility
  let useSmoothScroll = false;

  function initSmooth() {}
  initSmooth();

  function smoothTick() {
    const prev = smoothY;
    scrollY = window.scrollY;
    smoothY = scrollY;
    scrollVelocity = scrollY - prev;
  }

  /* ============================================
     PRELOADER
     ============================================ */
  const loader = document.getElementById('loader');
  const loaderPct = document.getElementById('loaderPct');
  const loaderBar = document.querySelector('.loader__bar i');
  let loaderProgress = 0;

  const loaderInterval = setInterval(() => {
    loaderProgress += Math.random() * 14 + 4;
    if (loaderProgress >= 100) {
      loaderProgress = 100;
      clearInterval(loaderInterval);
      setTimeout(() => {
        if (loader) loader.classList.add('is-done');
        setTimeout(startIntro, 600);
      }, 400);
    }
    if (loaderPct) loaderPct.textContent = Math.floor(loaderProgress);
    if (loaderBar) loaderBar.style.width = loaderProgress + '%';
  }, 100);

  function startIntro() {
    const heroTitle = document.querySelector('.hero__title');
    const hero = document.querySelector('.hero');
    if (heroTitle) heroTitle.classList.add('is-in');
    if (hero) hero.classList.add('is-in');
  }

  /* ============================================
     CURSOR (goo)
     ============================================ */
  const cursor = document.querySelector('.cursor');
  const cDot = document.querySelector('.cursor__dot');
  const cRing = document.querySelector('.cursor__ring');
  const cLabel = document.getElementById('cursorLabel');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;

  if (cursor && hasHover) {
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

    document.querySelectorAll('[data-hover]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  function cursorTick() {
    if (!cursor || !hasHover) return;
    dx = lerp(dx, mx, 0.5);
    dy = lerp(dy, my, 0.5);
    rx = lerp(rx, mx, 0.15);
    ry = lerp(ry, my, 0.15);
    if (cDot) cDot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
    if (cRing) cRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    if (cLabel) cLabel.style.transform = `translate(${mx + 18}px, ${my + 18}px)`;
  }

  /* ============================================
     CURSOR TRAIL CANVAS
     ============================================ */
  const trailCanvas = document.getElementById('cursorTrail');
  let trailCtx, trailW, trailH;
  const trail = [];
  const TRAIL_LEN = 28;

  if (trailCanvas && hasHover && !prefersReduced) {
    trailCtx = trailCanvas.getContext('2d');
    const resize = () => {
      trailW = window.innerWidth;
      trailH = window.innerHeight;
      trailCanvas.width = trailW * (window.devicePixelRatio || 1);
      trailCanvas.height = trailH * (window.devicePixelRatio || 1);
      trailCanvas.style.width = trailW + 'px';
      trailCanvas.style.height = trailH + 'px';
      trailCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
  }

  function trailTick() {
    if (!trailCtx) return;
    trail.push({ x: mx, y: my, life: 1 });
    if (trail.length > TRAIL_LEN) trail.shift();

    trailCtx.clearRect(0, 0, trailW, trailH);
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      p.life -= 0.035;
      if (p.life <= 0) continue;
      const r = p.life * 12;
      trailCtx.beginPath();
      trailCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      trailCtx.fillStyle = `rgba(255, 77, 21, ${p.life * 0.25})`;
      trailCtx.fill();
    }
  }

  /* ============================================
     SCROLL PROGRESS + NAV + RAIL
     ============================================ */
  const progressBar = document.querySelector('.progress span');
  const progressPct = document.getElementById('progressPct');
  const nav = document.getElementById('nav');
  const railLine = document.querySelector('.rail__line i');
  const railDots = document.querySelectorAll('.rail__dots li');
  const chapters = document.querySelectorAll('[data-chapter]');

  function progressTick() {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const pct = total > 0 ? (scrollY / total) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressPct) progressPct.textContent = String(Math.floor(pct)).padStart(2, '0');
    if (nav) nav.classList.toggle('is-scrolled', scrollY > 40);
    if (railLine) railLine.style.height = pct + '%';

    // chapter detection
    let activeChapter = 0;
    const vh = window.innerHeight;
    chapters.forEach((ch) => {
      const rect = ch.getBoundingClientRect();
      const top = useSmoothScroll ? (rect.top + smoothY - scrollY + rect.top) : rect.top;
      // simpler: use real bounding
      if (ch.getBoundingClientRect().top < vh * 0.5) {
        activeChapter = parseInt(ch.dataset.chapter);
      }
    });
    railDots.forEach((d) => {
      d.classList.toggle('is-active', parseInt(d.dataset.rail) === activeChapter);
    });
  }



  /* ============================================
     PARALLAX ENGINE (unified)
     ============================================ */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  const parallaxXEls = document.querySelectorAll('[data-parallax-x]');
  const rotEls = document.querySelectorAll('[data-rot]');

  function parallaxTick() {
    if (prefersReduced) return;
    const vh = window.innerHeight;
    const sy = scrollY;

    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) * speed * 1.5; // amplified
      el.style.transform = `translate3d(0, ${-offset}px, 0)`;
    });

    parallaxXEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallaxX) || 0.5;
      const offset = sy * speed;
      const span = el.querySelector('span');
      if (span) span.style.transform = `translate3d(${-offset}px, 0, 0)`;
    });

    rotEls.forEach((el) => {
      const speed = parseFloat(el.dataset.rot) || 0.05;
      const angle = sy * speed;
      el.style.transform = `rotate(${angle}deg)`;
    });
  }

  /* ============================================
     TICKER (velocity-driven speed)
     ============================================ */
  const tickerTrack = document.getElementById('tickerTrack');
  let tickerX = 0;

  function tickerTick() {
    if (!tickerTrack) return;
    const baseSpeed = 1.5;
    const velBoost = Math.abs(scrollVelocity) * 1.2;
    tickerX -= (baseSpeed + velBoost);
    const half = tickerTrack.scrollWidth / 2;
    if (Math.abs(tickerX) >= half) tickerX = 0;
    tickerTrack.style.transform = `translate3d(${tickerX}px, 0, 0)`;
  }

  /* ============================================
     STRIPE (scroll-driven marquee)
     ============================================ */
  const stripeTracks = document.querySelectorAll('[data-stripe-track]');

  function stripeTick() {
    if (!stripeTracks.length) return;
    const sy = scrollY;
    stripeTracks.forEach((track, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      const offset = sy * 0.5 * dir;
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    });
  }

  /* ============================================
     HORIZONTAL SCROLL
     ============================================ */
  const hWrap = document.querySelector('.h-scroll__wrap');
  const hTrack = document.getElementById('hTrack');
  const hProgress = document.getElementById('hProgressFill');

  function hScrollTick() {
    if (!hWrap || !hTrack) return;
    const rect = hWrap.getBoundingClientRect();
    const wrapHeight = hWrap.offsetHeight;
    const vh = window.innerHeight;
    const trackScroll = hTrack.scrollWidth - window.innerWidth + 120;

    if (rect.top > 0) {
      hTrack.style.transform = 'translateX(0)';
      if (hProgress) hProgress.style.width = '0%';
      return;
    }
    if (rect.bottom < vh) return;

    const scrolled = -rect.top;
    const max = wrapHeight - vh;
    const p = clamp(scrolled / max, 0, 1);
    hTrack.style.transform = `translateX(${-p * trackScroll}px)`;
    if (hProgress) hProgress.style.width = (p * 100) + '%';

    // depth: scale cards based on distance from center
    const cards = hTrack.querySelectorAll('[data-card]');
    const cx = window.innerWidth / 2;
    cards.forEach((card) => {
      const cr = card.getBoundingClientRect();
      const cardCenter = cr.left + cr.width / 2;
      const dist = Math.abs(cardCenter - cx) / (window.innerWidth / 2);
      const scale = 1 - dist * 0.08;
      const blur = dist * 2;
      card.style.transform = `scale(${clamp(scale, 0.88, 1)})`;
      card.style.filter = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : 'none';
      card.style.opacity = 1 - dist * 0.3;
    });
  }

  /* ============================================
     PIN SHOWCASE
     ============================================ */
  const pinWrap = document.querySelector('.pin__wrap');
  const pinSteps = document.querySelectorAll('.pin__step');
  const pinFrames = document.querySelectorAll('.pin__frame-item');
  const pinLabels = document.querySelectorAll('.pin__labels span');
  const pinBarFill = document.getElementById('pinBarFill');

  function pinTick() {
    if (!pinWrap) return;
    const rect = pinWrap.getBoundingClientRect();
    const wrapHeight = pinWrap.offsetHeight;
    const vh = window.innerHeight;

    if (rect.top > 0 || rect.bottom < vh) return;

    const scrolled = -rect.top;
    const max = wrapHeight - vh;
    const p = clamp(scrolled / max, 0, 0.9999);
    const stepCount = pinSteps.length;
    const idx = Math.floor(p * stepCount);

    pinSteps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    pinFrames.forEach((f, i) => f.classList.toggle('is-active', i === idx));
    pinLabels.forEach((l, i) => l.classList.toggle('is-active', i === idx));
    if (pinBarFill) pinBarFill.style.width = (p * 100) + '%';
  }

  /* ============================================
     CINEMATIC QUOTE (word reveal on scroll)
     ============================================ */
  const cineWrap = document.querySelector('.cine__wrap');
  const cineWords = document.querySelectorAll('.cine__word');

  function cineTick() {
    if (!cineWrap || !cineWords.length) return;
    const rect = cineWrap.getBoundingClientRect();
    const wrapHeight = cineWrap.offsetHeight;
    const vh = window.innerHeight;

    if (rect.top > 0 || rect.bottom < vh) return;

    const scrolled = -rect.top;
    const max = wrapHeight - vh;
    const p = clamp(scrolled / max, 0, 1);
    const total = cineWords.length;
    const litCount = Math.floor(p * (total + 2));

    cineWords.forEach((w, i) => {
      w.classList.toggle('is-lit', i < litCount);
    });
  }



  /* ============================================
     REVEAL (IntersectionObserver)
     ============================================ */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.delay || 0, 10);
        setTimeout(() => e.target.classList.add('is-visible'), delay);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });
  revealEls.forEach((el) => io.observe(el));

  /* ============================================
     COUNTERS
     ============================================ */
  const counters = document.querySelectorAll('[data-count]');
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const isInt = Number.isInteger(target);
      const duration = 2000;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = isInt ? Math.floor(val) : val.toFixed(val < 10 ? 2 : 1);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = isInt ? target : target;
      };
      requestAnimationFrame(tick);
      co.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((el) => co.observe(el));

  /* ============================================
     SCRAMBLE TEXT
     ============================================ */
  const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  document.querySelectorAll('[data-scramble]').forEach((el) => {
    const original = el.textContent;
    const run = () => {
      let i = 0;
      const step = () => {
        let out = '';
        for (let j = 0; j < original.length; j++) {
          if (j < i) out += original[j];
          else if (original[j] === ' ') out += ' ';
          else out += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
        el.textContent = out;
        if (i < original.length) { i++; setTimeout(step, 30); }
      };
      step();
    };
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(); so.unobserve(el); } });
    }, { threshold: 0.3 });
    so.observe(el);
    el.addEventListener('mouseenter', run);
  });

  /* ============================================
     SPLIT TEXT
     ============================================ */
  document.querySelectorAll('[data-split-chars]').forEach((el) => {
    const html = el.innerHTML;
    const div = document.createElement('div');
    div.innerHTML = html;
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach((tn) => {
      const parent = tn.parentNode;
      const frag = document.createDocumentFragment();
      tn.textContent.split('').forEach((ch) => {
        if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        frag.appendChild(s);
      });
      parent.replaceChild(frag, tn);
    });
    el.innerHTML = '';
    while (div.firstChild) el.appendChild(div.firstChild);
  });

  document.querySelectorAll('[data-split-words]').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/([^\s<>]+)(?![^<]*>)/g, '<span class="word-span">$1</span>');
  });

  const sio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const items = e.target.querySelectorAll('.char, .word-span');
      items.forEach((c, i) => { c.style.transitionDelay = (i * 15) + 'ms'; });
      e.target.classList.add('is-split-in');
      sio.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('[data-split-chars], [data-split-words]').forEach((el) => sio.observe(el));

  /* ============================================
     MAGNETIC BUTTONS
     ============================================ */
  if (!prefersReduced && hasHover) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      let ax = 0, ay = 0, bx = 0, by = 0, raf;
      const run = () => {
        ax = lerp(ax, bx, 0.15);
        ay = lerp(ay, by, 0.15);
        el.style.transform = `translate(${ax}px, ${ay}px)`;
        if (Math.abs(bx - ax) > 0.1 || Math.abs(by - ay) > 0.1) raf = requestAnimationFrame(run);
      };
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        bx = (e.clientX - r.left - r.width / 2) * 0.3;
        by = (e.clientY - r.top - r.height / 2) * 0.3;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(run);
      });
      el.addEventListener('mouseleave', () => { bx = 0; by = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
    });
  }

  /* ============================================
     3D TILT
     ============================================ */
  if (!prefersReduced && hasHover) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(1200px) rotateX(${-(y - 0.5) * 10}deg) rotateY(${(x - 0.5) * 10}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ============================================
     NAV PREVIEW
     ============================================ */
  const navPreview = document.getElementById('navPreview');
  if (navPreview && hasHover) {
    let px = 0, py = 0;
    const tick = () => { px = lerp(px, mx - 100, 0.12); py = lerp(py, my + 30, 0.12); navPreview.style.transform = `translate(${px}px, ${py}px)`; requestAnimationFrame(tick); };
    tick();
    document.querySelectorAll('.nav__menu a[data-preview]').forEach((link) => {
      const key = link.dataset.preview;
      link.addEventListener('mouseenter', () => {
        navPreview.classList.add('is-visible');
        navPreview.querySelectorAll('.nav__preview-inner').forEach((el) => el.classList.toggle('is-active', el.dataset.previewContent === key));
      });
      link.addEventListener('mouseleave', () => navPreview.classList.remove('is-visible'));
    });
  }

  /* ============================================
     CLOCK
     ============================================ */
  const clockEl = document.getElementById('navClock');
  if (clockEl) {
    const tick = () => {
      const d = new Date();
      const msk = new Date(d.getTime() + (d.getTimezoneOffset() + 180) * 60000);
      const pad = (n) => String(n).padStart(2, '0');
      clockEl.textContent = `${pad(msk.getHours())}:${pad(msk.getMinutes())}:${pad(msk.getSeconds())}`;
    };
    tick(); setInterval(tick, 1000);
  }

  document.getElementById('footerYear').textContent = new Date().getFullYear();

  /* ============================================
     FAQ
     ============================================ */
  document.querySelectorAll('.faq__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) document.querySelectorAll('.faq__item').forEach((o) => { if (o !== item) o.open = false; });
    });
  });

  /* ============================================
     HERO GENERATIVE VIDEO (particle neural field)
     3 depth layers, organic flow, mouse-reactive
     ============================================ */
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas && !prefersReduced) {
    const ctx = heroCanvas.getContext('2d');
    let w, h, dpr;
    let hmx = 0, hmy = 0;
    let running = true;

    // 3 layers of particles at different depths
    const layers = [
      { count: 80, speed: 0.12, size: [1, 2], opacity: 0.15, color: '255,77,21', connectDist: 180 },
      { count: 55, speed: 0.25, size: [1.5, 3.5], opacity: 0.3, color: '33,54,240', connectDist: 150 },
      { count: 40, speed: 0.45, size: [2.5, 5.5], opacity: 0.55, color: '14,14,14', connectDist: 120 },
    ];
    let particles = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = heroCanvas.offsetWidth;
      h = heroCanvas.offsetHeight;
      heroCanvas.width = w * dpr;
      heroCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      layers.forEach((layer, li) => {
        for (let i = 0; i < layer.count; i++) {
          particles.push({
            layer: li,
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * layer.speed,
            vy: (Math.random() - 0.5) * layer.speed,
            baseR: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
            phase: Math.random() * Math.PI * 2,
            orbitR: 20 + Math.random() * 40,
            orbitSpeed: (0.2 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
          });
        }
      });
    };

    heroCanvas.addEventListener('mousemove', (e) => {
      const r = heroCanvas.getBoundingClientRect();
      hmx = e.clientX - r.left;
      hmy = e.clientY - r.top;
    });
    heroCanvas.addEventListener('mouseleave', () => { hmx = -999; hmy = -999; });
    window.addEventListener('resize', resize);
    resize();

    let time = 0;
    const draw = () => {
      if (!running) return;
      time += 0.016;
      ctx.clearRect(0, 0, w, h);

      // Draw connections first, then particles on top
      for (let li = 0; li < layers.length; li++) {
        const layer = layers[li];
        const layerP = particles.filter(p => p.layer === li);

        // Update positions with organic orbital motion
        for (const p of layerP) {
          p.phase += 0.008 * p.orbitSpeed;
          p.x += p.vx + Math.sin(p.phase) * 0.3 * layer.speed;
          p.y += p.vy + Math.cos(p.phase * 0.7) * 0.2 * layer.speed;

          // Wrap
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;

          // Mouse repulsion (stronger for front layers)
          if (hmx > 0) {
            const dx = p.x - hmx;
            const dy = p.y - hmy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const repelDist = 120 + li * 40;
            if (dist < repelDist) {
              const force = (repelDist - dist) / repelDist * (0.5 + li * 0.3);
              p.x += (dx / dist) * force;
              p.y += (dy / dist) * force;
            }
          }
        }

        // Draw connections (neural links)
        for (let i = 0; i < layerP.length; i++) {
          const a = layerP[i];
          for (let j = i + 1; j < layerP.length; j++) {
            const b = layerP[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < layer.connectDist) {
              const alpha = (1 - dist / layer.connectDist) * layer.opacity * 0.6;
              ctx.strokeStyle = `rgba(${layer.color}, ${alpha})`;
              ctx.lineWidth = 0.5 + li * 0.3;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              // Curved connections for organic feel
              const mx2 = (a.x + b.x) / 2 + Math.sin(time + i) * 8;
              const my2 = (a.y + b.y) / 2 + Math.cos(time + j) * 8;
              ctx.quadraticCurveTo(mx2, my2, b.x, b.y);
              ctx.stroke();
            }
          }
        }

        // Draw particles with glow
        for (const p of layerP) {
          const pulseR = p.baseR + Math.sin(time * 2 + p.phase) * p.baseR * 0.3;

          // Outer glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseR * 5);
          grad.addColorStop(0, `rgba(${layer.color}, ${layer.opacity * 0.5})`);
          grad.addColorStop(1, `rgba(${layer.color}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseR * 5, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(${layer.color}, ${layer.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
          ctx.fill();

          // Inner bright dot
          ctx.fillStyle = `rgba(${layer.color}, ${layer.opacity * 1.5})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseR * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Mouse attraction beams (front layer only)
        if (li === 2 && hmx > 0) {
          for (const p of layerP) {
            const dx = p.x - hmx;
            const dy = p.y - hmy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
              const alpha = (1 - dist / 200) * 0.4;
              ctx.strokeStyle = `rgba(255, 77, 21, ${alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(hmx, hmy);
              ctx.stroke();
            }
          }
        }
      }

      // Floating geometric shapes (rotating hexagons + triangles + circles at random positions)
      ctx.strokeStyle = 'rgba(14, 14, 14, 0.05)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 7; i++) {
        const cx = (w * (0.1 + i * 0.13)) + Math.sin(time * 0.2 + i * 1.8) * 40;
        const cy = (h * (0.15 + (i % 4) * 0.22)) + Math.cos(time * 0.15 + i) * 30;
        const r = 25 + i * 12;
        const sides = i % 3 === 0 ? 6 : (i % 3 === 1 ? 3 : 8);
        const rot = time * 0.15 * (i % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const angle = (s / sides) * Math.PI * 2 + rot;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        // Inner shape
        if (i % 2 === 0) {
          ctx.beginPath();
          for (let s = 0; s <= sides; s++) {
            const angle = (s / sides) * Math.PI * 2 - rot * 0.5;
            const px = cx + Math.cos(angle) * r * 0.5;
            const py = cy + Math.sin(angle) * r * 0.5;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Floating dotted circles
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(255, 77, 21, 0.04)';
      for (let i = 0; i < 4; i++) {
        const cx = w * (0.2 + i * 0.2) + Math.sin(time * 0.1 + i * 3) * 50;
        const cy = h * (0.3 + (i % 2) * 0.4) + Math.cos(time * 0.08 + i * 2) * 40;
        const r = 50 + i * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      requestAnimationFrame(draw);
    };
    draw();

    const heroEl = document.querySelector('.hero');
    if (heroEl) new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running) draw(); }, { threshold: 0 }).observe(heroEl);
  }

  /* ============================================
     MASTER RAF LOOP
     ============================================ */
  function masterLoop() {
    scrollY = window.scrollY;
    smoothTick();
    cursorTick();
    trailTick();
    progressTick();
    parallaxTick();
    tickerTick();
    stripeTick();
    hScrollTick();
    pinTick();
    cineTick();
    requestAnimationFrame(masterLoop);
  }
  requestAnimationFrame(masterLoop);

})();
