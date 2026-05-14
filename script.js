/* =============================================
   SCOPNUM — immersive interactive engine
   ============================================= */

(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* Spring physics utility - returns {value, velocity} */
  function spring(current, target, velocity, stiffness, damping) {
    if (stiffness === undefined) stiffness = 0.08;
    if (damping === undefined) damping = 0.82;
    const force = (target - current) * stiffness;
    velocity = (velocity + force) * damping;
    return { value: current + velocity, velocity: velocity };
  }

  /* ============================================
     SMOOTH SCROLL ENGINE (lerp-based)
     ============================================ */
  const smooth = document.getElementById('smooth');
  const content = document.getElementById('smoothContent');
  let scrollY = 0, smoothY = 0, scrollVelocity = 0;
  // Smooth scroll inertia applied to parallax/ticker calculations only.
  // Native scroll stays untouched so sticky sections work.
  const SMOOTH_LERP = 0.1;

  function smoothTick() {
    const prev = smoothY;
    scrollY = window.scrollY;
    // Lerp the smoothed value toward actual scroll - gives premium inertia to parallax
    smoothY = lerp(smoothY, scrollY, SMOOTH_LERP);
    if (Math.abs(smoothY - scrollY) < 0.5) smoothY = scrollY;
    scrollVelocity = smoothY - prev;
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
     CURSOR (goo) — spring physics for elastic overshoot
     ============================================ */
  const cursor = document.querySelector('.cursor');
  const cDot = document.querySelector('.cursor__dot');
  const cRing = document.querySelector('.cursor__ring');
  const cLabel = document.getElementById('cursorLabel');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;
  // Spring velocities for the ring
  let ringVx = 0, ringVy = 0;

  if (cursor && hasHover) {
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

    document.querySelectorAll('[data-hover]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  function cursorTick() {
    if (!cursor || !hasHover) return;
    // Dot follows with simple lerp (fast)
    dx = lerp(dx, mx, 0.5);
    dy = lerp(dy, my, 0.5);
    // Ring follows with spring physics (elastic overshoot)
    const sx = spring(rx, mx, ringVx, 0.08, 0.82);
    const sy = spring(ry, my, ringVy, 0.08, 0.82);
    rx = sx.value;
    ry = sy.value;
    ringVx = sx.velocity;
    ringVy = sy.velocity;
    if (cDot) cDot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
    if (cRing) cRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    if (cLabel) cLabel.style.transform = `translate(${mx + 18}px, ${my + 18}px)`;

    // Theme detection: check if cursor overlaps a dark-themed section
    cursorThemeTick();
  }

  /* ============================================
     CURSOR THEME DETECTION (auto-invert on dark sections)
     Uses IntersectionObserver-driven flag from sectionThemeTick
     instead of per-frame getBoundingClientRect calls.
     ============================================ */
  let cursorOnDark = false;

  function cursorThemeTick() {
    if (!cursor) return;
    cursor.classList.toggle('is-dark', cursorOnDark);
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
    // Determine trail color based on cursor theme
    const onDark = cursor && cursor.classList.contains('is-dark');
    const trailColor = onDark ? '242, 236, 224' : '255, 77, 21';
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      p.life -= 0.035;
      if (p.life <= 0) continue;
      const r = p.life * 12;
      trailCtx.beginPath();
      trailCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      trailCtx.fillStyle = `rgba(${trailColor}, ${p.life * 0.25})`;
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
    // Use smoothY for parallax calculations to add inertia/depth perception
    const sy = smoothY;

    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const velFactor = 1 + Math.min(Math.abs(scrollVelocity) * 0.05, 0.8);
      const offset = (center - vh / 2) * speed * 1.5 * velFactor;
      // Multi-axis: horizontal drift + micro-rotation
      const hDrift = offset * 0.1;
      const microRot = offset * 0.01;
      // Scale if data-parallax-scale is present
      const scaleAttr = el.dataset.parallaxScale;
      let scaleStr = '';
      if (scaleAttr !== undefined) {
        const scaleFactor = parseFloat(scaleAttr) || 0;
        const total = document.documentElement.scrollHeight - vh;
        const progress = total > 0 ? sy / total : 0;
        const scaleVal = 1 + scaleFactor * progress;
        scaleStr = ` scale(${scaleVal.toFixed(4)})`;
      }
      el.style.transform = `translate3d(${hDrift}px, ${-offset}px, 0) rotate(${microRot}deg)${scaleStr}`;
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
    const skew = clamp(scrollVelocity * -0.08, -3, 3);
    tickerTrack.style.transform = `translate3d(${tickerX}px, 0, 0) skewX(${skew}deg)`;
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

    // depth: scale cards based on distance from center + 3D rotateY
    const cards = hTrack.querySelectorAll('[data-card]');
    const cx = window.innerWidth / 2;
    cards.forEach((card) => {
      const cr = card.getBoundingClientRect();
      const cardCenter = cr.left + cr.width / 2;
      const dist = Math.abs(cardCenter - cx) / (window.innerWidth / 2);
      const scale = 1 - dist * 0.08;
      const blur = dist * 2;
      const sign = cardCenter < cx ? 1 : -1;
      const rotateY = sign * dist * 3;
      card.style.transform = `perspective(1200px) scale(${clamp(scale, 0.88, 1)}) rotateY(${rotateY}deg)`;
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
    const middle = Math.floor(total / 2);

    cineWords.forEach((w, i) => {
      const distFromMiddle = Math.abs(i - middle);
      w.classList.toggle('is-lit', distFromMiddle < litCount);
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
        const eased = p < 0.7 
          ? (1 - Math.pow(1 - p / 0.7, 3)) * 1.08
          : 1.08 - 0.08 * ((p - 0.7) / 0.3);
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
        const normX = (e.clientX - r.left) / r.width;
        const normY = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', normX.toFixed(3));
        el.style.setProperty('--my', normY.toFixed(3));
        cancelAnimationFrame(raf); raf = requestAnimationFrame(run);
      });
      el.addEventListener('mouseleave', () => { bx = 0; by = 0; el.style.removeProperty('--mx'); el.style.removeProperty('--my'); cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
    });
  }

  /* ============================================
     SMOOTH SCROLL TO ANCHOR
     ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const start = window.scrollY;
      const end = target.getBoundingClientRect().top + window.scrollY - 80;
      const duration = 1000;
      const startTime = performance.now();
      const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const animate = (now) => {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1);
        window.scrollTo(0, start + (end - start) * easeInOutCubic(p));
        if (p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    });
  });

  /* ============================================
     AUDIO INFRASTRUCTURE (subtle UI sounds)
     ============================================ */
  let audioCtx = null;
  let audioReady = false;

  function initAudio() {
    if (audioReady) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioReady = true;
    } catch (e) { /* silent fail */ }
  }

  function playTick() {
    if (!audioCtx || !audioReady) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 2000;
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {}
  }

  function playWhoosh() {
    if (!audioCtx || !audioReady) return;
    try {
      const bufferSize = audioCtx.sampleRate * 0.06;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      source.connect(filter).connect(gain).connect(audioCtx.destination);
      source.start(audioCtx.currentTime);
    } catch (e) {}
  }

  // Initialize on first interaction
  document.addEventListener('click', () => { initAudio(); }, { once: true });
  document.addEventListener('touchstart', () => { initAudio(); }, { once: true });

  // Throttled whoosh to prevent excessive audio on rapid hover
  let lastWhooshTime = 0;
  function playWhooshThrottled() {
    const now = performance.now();
    if (now - lastWhooshTime < 300) return;
    lastWhooshTime = now;
    playWhoosh();
  }

  // Attach sounds to interactive elements
  document.querySelectorAll('[data-hover]').forEach((el) => {
    el.addEventListener('mouseenter', () => { if (audioReady) playWhooshThrottled(); });
    el.addEventListener('click', () => { if (audioReady) playTick(); });
  });

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
        // Animate reflection layer on hero__spec
        const reflection = el.querySelector('.hero__spec') ? el : (el.classList.contains('hero__spec') ? el : null);
        const before = el.style;
        if (el.classList.contains('hero__spec') || el.closest('.hero__spec')) {
          const target = el.classList.contains('hero__spec') ? el : el.closest('.hero__spec');
          if (target) {
            target.style.setProperty('--reflect-x', ((x - 0.5) * 100) + '%');
            target.style.setProperty('--reflect-y', ((y - 0.5) * 100) + '%');
          }
        }
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

  const footerYearEl = document.getElementById('footerYear');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

  /* ============================================
     FAQ
     ============================================ */
  document.querySelectorAll('.faq__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) document.querySelectorAll('.faq__item').forEach((o) => { if (o !== item) o.open = false; });
    });
  });

  /* ============================================
     HERO GENERATIVE VIDEO (morphing geometry system)
     Central morphing shape, flowing field lines, simplex noise
     ============================================ */
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas && !prefersReduced) {
    const ctx = heroCanvas.getContext('2d');
    let w, h, dpr;
    let hmx = -999, hmy = -999;
    let running = true;

    /* Minimal 2D simplex noise implementation */
    const noise2D = (() => {
      const F2 = 0.5 * (Math.sqrt(3) - 1);
      const G2 = (3 - Math.sqrt(3)) / 6;
      const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
      const perm = new Uint8Array(512);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      // Fisher-Yates shuffle with fixed seed
      let seed = 42;
      for (let i = 255; i > 0; i--) {
        seed = (seed * 16807 + 0) % 2147483647;
        const j = seed % (i + 1);
        const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
      }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

      return function(x, y) {
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t, Y0 = j - t;
        const x0 = x - X0, y0 = y - Y0;
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        const ii = i & 255, jj = j & 255;
        let n0 = 0, n1 = 0, n2 = 0;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) { t0 *= t0; const gi = perm[ii + perm[jj]] % 8; n0 = t0 * t0 * (grad[gi][0] * x0 + grad[gi][1] * y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) { t1 *= t1; const gi = perm[ii + i1 + perm[jj + j1]] % 8; n1 = t1 * t1 * (grad[gi][0] * x1 + grad[gi][1] * y1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) { t2 *= t2; const gi = perm[ii + 1 + perm[jj + 1]] % 8; n2 = t2 * t2 * (grad[gi][0] * x2 + grad[gi][1] * y2); }
        return 70 * (n0 + n1 + n2);
      };
    })();

    /* Shape definitions: returns points on a unit shape at angle t [0..1] */
    function shapeCircle(t) {
      const a = t * Math.PI * 2;
      return { x: Math.cos(a), y: Math.sin(a) };
    }
    function shapeHexagon(t) {
      const a = t * Math.PI * 2;
      const sector = Math.floor(t * 6);
      const frac = t * 6 - sector;
      const a1 = (sector / 6) * Math.PI * 2;
      const a2 = ((sector + 1) / 6) * Math.PI * 2;
      return { x: Math.cos(a1) + (Math.cos(a2) - Math.cos(a1)) * frac, y: Math.sin(a1) + (Math.sin(a2) - Math.sin(a1)) * frac };
    }
    function shapeTriangle(t) {
      const sector = Math.floor(t * 3);
      const frac = t * 3 - sector;
      const a1 = (sector / 3) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((sector + 1) / 3) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(a1) + (Math.cos(a2) - Math.cos(a1)) * frac, y: Math.sin(a1) + (Math.sin(a2) - Math.sin(a1)) * frac };
    }
    function shapeDiamond(t) {
      const sector = Math.floor(t * 4);
      const frac = t * 4 - sector;
      const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      const a1 = angles[sector];
      const a2 = angles[(sector + 1) % 4];
      const x1 = Math.cos(a1), y1 = Math.sin(a1);
      const x2 = Math.cos(a2), y2 = Math.sin(a2);
      return { x: x1 + (x2 - x1) * frac, y: y1 + (y2 - y1) * frac };
    }

    const shapes = [shapeCircle, shapeHexagon, shapeTriangle, shapeDiamond];
    const MORPH_DURATION = 4; // seconds per shape transition
    const SHAPE_POINTS = 64;
    const FIELD_LINES = 18;
    const FIELD_SEGMENTS = 20;

    // Brand colors for ambient glow
    const brandColors = [
      { r: 255, g: 77, b: 21 },   // orange
      { r: 33, g: 54, b: 240 },   // indigo
      { r: 183, g: 255, b: 46 },  // lime
    ];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = heroCanvas.offsetWidth;
      h = heroCanvas.offsetHeight;
      heroCanvas.width = w * dpr;
      heroCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    let lastFrameTime = performance.now();
    const draw = () => {
      if (!running) return;
      const now = performance.now();
      time += (now - lastFrameTime) * 0.001;
      lastFrameTime = now;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.18;

      // Determine current and next shape for morphing
      const totalCycle = MORPH_DURATION * shapes.length;
      const cycleTime = time % totalCycle;
      const shapeIdx = Math.floor(cycleTime / MORPH_DURATION);
      const nextIdx = (shapeIdx + 1) % shapes.length;
      const morphT = (cycleTime % MORPH_DURATION) / MORPH_DURATION;
      // Smooth easing for morph
      const ease = morphT < 0.5 ? 2 * morphT * morphT : 1 - Math.pow(-2 * morphT + 2, 2) / 2;

      const currentShape = shapes[shapeIdx];
      const nextShape = shapes[nextIdx];

      // Generate morphed shape points with noise displacement
      const shapePoints = [];
      for (let i = 0; i < SHAPE_POINTS; i++) {
        const t = i / SHAPE_POINTS;
        const p1 = currentShape(t);
        const p2 = nextShape(t);
        const mx2 = p1.x + (p2.x - p1.x) * ease;
        const my2 = p1.y + (p2.y - p1.y) * ease;
        // Noise displacement for organic movement
        const noiseVal = noise2D(t * 3 + time * 0.5, time * 0.3) * 0.15;
        const noiseVal2 = noise2D(t * 3 + 100, time * 0.4 + 50) * 0.1;
        const px = cx + (mx2 + noiseVal) * baseRadius;
        const py = cy + (my2 + noiseVal2) * baseRadius;
        shapePoints.push({ x: px, y: py });
      }

      // Draw ambient glow behind shape
      for (let gi = 0; gi < 3; gi++) {
        const c = brandColors[gi];
        const angle = time * 0.3 + gi * (Math.PI * 2 / 3);
        const glowX = cx + Math.cos(angle) * baseRadius * 0.3;
        const glowY = cy + Math.sin(angle) * baseRadius * 0.3;
        const grad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, baseRadius * 1.8);
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.06)`);
        grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(glowX, glowY, baseRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw flowing field lines radiating from center
      for (let i = 0; i < FIELD_LINES; i++) {
        const baseAngle = (i / FIELD_LINES) * Math.PI * 2 + time * 0.1;
        const colorIdx = i % 3;
        const c = brandColors[colorIdx];

        ctx.beginPath();
        let prevX = cx;
        let prevY = cy;

        for (let s = 1; s <= FIELD_SEGMENTS; s++) {
          const progress = s / FIELD_SEGMENTS;
          const dist = baseRadius * 0.4 + progress * baseRadius * 1.8;
          // Field lines respond to mouse
          let angleOffset = 0;
          if (hmx > 0) {
            const mouseAngle = Math.atan2(hmy - cy, hmx - cx);
            const diff = baseAngle - mouseAngle;
            angleOffset = Math.sin(diff) * 0.15 * (1 - progress);
          }
          const noiseOffset = noise2D(i * 2 + progress * 4, time * 0.6) * 0.4;
          const angle = baseAngle + noiseOffset + angleOffset;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;

          if (s === 1) {
            ctx.moveTo(px, py);
          } else {
            // Use bezier curves for flowing lines
            const cpx = (prevX + px) / 2 + noise2D(i + s, time * 0.4) * 15;
            const cpy = (prevY + py) / 2 + noise2D(i + s + 50, time * 0.4) * 15;
            ctx.quadraticCurveTo(cpx, cpy, px, py);
          }
          prevX = px;
          prevY = py;
        }

        // Pulsing opacity for field lines
        const pulse = 0.5 + Math.sin(time * 2 + i * 0.7) * 0.3;
        const alpha = 0.08 * pulse;
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
        ctx.lineWidth = 1 + Math.sin(time + i) * 0.5;
        ctx.stroke();
      }

      // Draw morphed central shape outline with bezier curves
      ctx.beginPath();
      for (let i = 0; i < shapePoints.length; i++) {
        const curr = shapePoints[i];
        const next = shapePoints[(i + 1) % shapePoints.length];
        const prev = shapePoints[(i - 1 + shapePoints.length) % shapePoints.length];
        if (i === 0) {
          ctx.moveTo(curr.x, curr.y);
        } else {
          const cpx = (prev.x + curr.x) / 2 + (curr.x - prev.x) * 0.1;
          const cpy = (prev.y + curr.y) / 2 + (curr.y - prev.y) * 0.1;
          ctx.quadraticCurveTo(cpx, cpy, curr.x, curr.y);
        }
      }
      ctx.closePath();
      const shapeAlpha = 0.25 + Math.sin(time * 1.5) * 0.08;
      ctx.strokeStyle = `rgba(14, 14, 14, ${shapeAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw inner morph shape (smaller, offset rotation)
      ctx.beginPath();
      for (let i = 0; i < SHAPE_POINTS; i++) {
        const t = i / SHAPE_POINTS;
        const p1 = currentShape(t);
        const p2 = nextShape(t);
        const mx2 = p1.x + (p2.x - p1.x) * ease;
        const my2 = p1.y + (p2.y - p1.y) * ease;
        const noiseVal = noise2D(t * 4 + time * 0.7 + 10, time * 0.5 + 20) * 0.12;
        const px = cx + (mx2 + noiseVal) * baseRadius * 0.55;
        const py = cy + (my2 + noiseVal) * baseRadius * 0.55;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(255, 77, 21, ${0.12 + Math.sin(time * 2) * 0.04})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Draw bezier connections between shape points (sparse, pulsing)
      for (let i = 0; i < shapePoints.length; i += 8) {
        const a = shapePoints[i];
        const b = shapePoints[(i + Math.floor(SHAPE_POINTS / 3)) % SHAPE_POINTS];
        const midX = (a.x + b.x) / 2 + noise2D(i + time, time * 0.3) * 30;
        const midY = (a.y + b.y) / 2 + noise2D(i + time + 100, time * 0.3) * 30;
        const alpha = 0.04 + Math.sin(time * 1.5 + i * 0.5) * 0.03;
        ctx.strokeStyle = `rgba(33, 54, 240, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(midX, midY, b.x, b.y);
        ctx.stroke();
      }

      // Noise-displaced orbital dots
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + time * 0.2;
        const dist = baseRadius * (1.3 + noise2D(i, time * 0.5) * 0.4);
        const dx = cx + Math.cos(angle) * dist;
        const dy = cy + Math.sin(angle) * dist;
        const colorIdx = i % 3;
        const c = brandColors[colorIdx];
        const dotAlpha = 0.2 + noise2D(i * 3, time) * 0.15;
        const dotR = 1.5 + noise2D(i * 2, time * 0.8) * 1;
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouse interaction: attraction ring
      if (hmx > 0) {
        const mouseDist = Math.sqrt((hmx - cx) * (hmx - cx) + (hmy - cy) * (hmy - cy));
        if (mouseDist < baseRadius * 3) {
          const alpha = (1 - mouseDist / (baseRadius * 3)) * 0.15;
          ctx.strokeStyle = `rgba(255, 77, 21, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(hmx, hmy, 30 + Math.sin(time * 3) * 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      requestAnimationFrame(draw);
    };
    draw();

    const heroEl = document.querySelector('.hero');
    if (heroEl) new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running) { lastFrameTime = performance.now(); draw(); } }, { threshold: 0 }).observe(heroEl);
  }

  /* ============================================
     FOOTER GENERATIVE CANVAS (morphing concentric rings)
     ============================================ */
  const footerCanvasEl = document.getElementById('footerCanvas');
  let footerCtx, footerW, footerH, footerTime = 0;
  let footerRunning = false;
  let footerLastTime = performance.now();

  if (footerCanvasEl && !prefersReduced) {
    footerCtx = footerCanvasEl.getContext('2d');
    const resizeFooterCanvas = () => {
      const rect = footerCanvasEl.parentElement.getBoundingClientRect();
      footerW = rect.width;
      footerH = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      footerCanvasEl.width = footerW * dpr;
      footerCanvasEl.height = footerH * dpr;
      footerCanvasEl.style.width = footerW + 'px';
      footerCanvasEl.style.height = footerH + 'px';
      footerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeFooterCanvas();
    window.addEventListener('resize', resizeFooterCanvas);

    // Visibility gating: only tick when footer is in viewport
    new IntersectionObserver((entries) => {
      footerRunning = entries[0].isIntersecting;
      if (footerRunning) footerLastTime = performance.now();
    }, { threshold: 0 }).observe(footerCanvasEl);
  }

  function footerCanvasTick() {
    if (!footerCtx || !footerRunning) return;
    const now = performance.now();
    footerTime += (now - footerLastTime) * 0.001 * 0.75;
    footerLastTime = now;
    footerCtx.clearRect(0, 0, footerW, footerH);

    const cx = footerW / 2;
    const cy = footerH / 2;
    const maxR = Math.max(footerW, footerH) * 0.45;
    const rings = 8;
    const colors = [
      { r: 255, g: 77, b: 21 },
      { r: 33, g: 54, b: 240 },
      { r: 183, g: 255, b: 46 }
    ];

    for (var ri = 0; ri < rings; ri++) {
      var baseRadius = (ri + 1) / rings * maxR;
      var pulse = Math.sin(footerTime * 1.2 + ri * 0.7) * 0.08;
      var radius = baseRadius * (1 + pulse);
      var c = colors[ri % 3];
      var alpha = 0.3 - ri * 0.025;

      footerCtx.beginPath();
      var segments = 64;
      for (var s = 0; s <= segments; s++) {
        var angle = (s / segments) * Math.PI * 2;
        var morph = Math.sin(angle * 3 + footerTime + ri * 0.5) * baseRadius * 0.06;
        var px = cx + Math.cos(angle) * (radius + morph);
        var py = cy + Math.sin(angle) * (radius + morph);
        if (s === 0) footerCtx.moveTo(px, py);
        else footerCtx.lineTo(px, py);
      }
      footerCtx.closePath();
      footerCtx.strokeStyle = 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + alpha + ')';
      footerCtx.lineWidth = 1.5 - ri * 0.1;
      footerCtx.stroke();
    }
  }

  /* ============================================
     SECTION THEME TRANSITION (fixed UI color changes in dark zones)
     Uses IntersectionObserver instead of per-frame getBoundingClientRect.
     ============================================ */
  const sectionBgEls = document.querySelectorAll('[data-section-bg]');
  let currentSectionDark = false;

  if (sectionBgEls.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const isDark = entry.target.dataset.sectionBg === 'ink';
          currentSectionDark = isDark;
          document.body.classList.toggle('is-dark-zone', isDark);
          // Also update cursor dark flag for cursorThemeTick
          cursorOnDark = isDark;
        }
      });
    }, {
      // rootMargin narrows detection to the center band of the viewport
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0
    });
    sectionBgEls.forEach((el) => sectionObserver.observe(el));
  }

  function sectionThemeTick() {
    // No-op: theme detection is now handled by IntersectionObserver above
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
    footerCanvasTick();
    sectionThemeTick();
    requestAnimationFrame(masterLoop);
  }
  requestAnimationFrame(masterLoop);

})();
