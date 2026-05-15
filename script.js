/* =============================================
   SCOPNUM — immersive interactive engine
   ============================================= */

(() => {
  'use strict';

  /* Cross-browser & mobile detection */
  const mobileQuery = window.matchMedia('(max-width: 767px)');
  let isMobile = mobileQuery.matches;
  mobileQuery.addEventListener('change', function(e) { isMobile = e.matches; });
  
  /* Dynamic viewport height fix for mobile browsers (address bar issue) */
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function() {
    setTimeout(setVH, 100);
  });

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
    if (prefersReduced || isMobile) return;
    const vh = window.innerHeight;
    // Use smoothY for parallax calculations to add inertia/depth perception
    const sy = smoothY;

    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const velFactor = 1 + Math.min(Math.abs(scrollVelocity) * 0.01, 0.2);
      const offset = (center - vh / 2) * speed * velFactor;
      // Multi-axis: horizontal drift + micro-rotation
      const hDrift = offset * 0.05;
      const microRot = offset * 0.005;
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
    if (isMobile) return;
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
     3D TILT (enhanced 18deg + translateZ + shadow parallax)
     ============================================ */
  if (!prefersReduced && hasHover) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rotX = -(y - 0.5) * 18;
        const rotY = (x - 0.5) * 18;
        const shadowX = -(x - 0.5) * 20;
        const shadowY = -(y - 0.5) * 20;
        el.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(20px)`;
        el.style.boxShadow = `${shadowX}px ${shadowY}px 30px rgba(14,14,14,0.12)`;
        el.style.setProperty('--mx', x.toFixed(3));
        el.style.setProperty('--my', y.toFixed(3));
        if (el.classList.contains('hero__spec') || el.closest('.hero__spec')) {
          const target = el.classList.contains('hero__spec') ? el : el.closest('.hero__spec');
          if (target) {
            target.style.setProperty('--reflect-x', ((x - 0.5) * 100) + '%');
            target.style.setProperty('--reflect-y', ((y - 0.5) * 100) + '%');
          }
        }
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; el.style.boxShadow = ''; el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
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
     HERO CANVAS - OSINT Investigation Graph
     Force-directed graph with typed nodes and flowing edges
     ============================================ */
  const heroCanvas = document.getElementById('heroCanvas');
  let noise2D; // shared simplex noise
  if (heroCanvas && !prefersReduced) {
    const ctx = heroCanvas.getContext('2d');
    let w, h, dpr;
    let hmx = -999, hmy = -999;
    let running = true;

    /* Minimal 2D simplex noise */
    noise2D = (() => {
      const F2 = 0.5 * (Math.sqrt(3) - 1);
      const G2 = (3 - Math.sqrt(3)) / 6;
      const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
      const perm = new Uint8Array(512);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      let seed = 42;
      for (let i = 255; i > 0; i--) {
        seed = (seed * 16807 + 0) % 2147483647;
        const j = seed % (i + 1);
        const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
      }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
      return function(x, y) {
        const s = (x + y) * F2;
        const i = Math.floor(x + s), j = Math.floor(y + s);
        const t = (i + j) * G2;
        const x0 = x - (i - t), y0 = y - (j - t);
        const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
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

    const brandColors = [{r:255,g:77,b:21},{r:33,g:54,b:240},{r:183,g:255,b:46}];
    const nodeTypes = ['person','wallet','transaction','domain','ip','email','phone','organization'];
    const nodeLabels = ['Agent','0x742d..','TX-4f1a','scopnum.ai','185.x.x.12','analyst@','tel+7','ScopnumLtd',
      'Target','0xabc1..','TX-9e2c','darknet.io','92.x.x.44','info@','tel+1','ShellCorp',
      'Witness','0xdef3..','TX-7b8d','mixer.io','10.x.x.1','admin@','tel+44','FundCo'];
    const graphNodes = [];
    const graphEdges = [];
    let graphTime = 0, lastNodeSpawn = 0;
    const MAX_NODES = 20, SPAWN_INTERVAL = 1.4;

    function drawShape(ctx2, x, y, r, type) {
      ctx2.beginPath();
      if (type === 'person') { ctx2.arc(x, y, r, 0, Math.PI * 2); }
      else if (type === 'wallet') { for (let i = 0; i < 6; i++) { const a = (i/6)*Math.PI*2 - Math.PI/2; if (i===0) ctx2.moveTo(x+Math.cos(a)*r, y+Math.sin(a)*r); else ctx2.lineTo(x+Math.cos(a)*r, y+Math.sin(a)*r); } ctx2.closePath(); }
      else if (type === 'transaction') { ctx2.moveTo(x,y-r); ctx2.lineTo(x+r,y); ctx2.lineTo(x,y+r); ctx2.lineTo(x-r,y); ctx2.closePath(); }
      else if (type === 'domain') { ctx2.rect(x-r*0.8,y-r*0.8,r*1.6,r*1.6); }
      else { ctx2.arc(x, y, r, 0, Math.PI * 2); }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = heroCanvas.offsetWidth; h = heroCanvas.offsetHeight;
      heroCanvas.width = w * dpr; heroCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    heroCanvas.addEventListener('mousemove', (e) => { const r = heroCanvas.getBoundingClientRect(); hmx = e.clientX - r.left; hmy = e.clientY - r.top; });
    heroCanvas.addEventListener('mouseleave', () => { hmx = -999; hmy = -999; });
    window.addEventListener('resize', resize);
    resize();

    let lastFrameTime = performance.now();
    const draw = () => {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) * 0.001, 0.05);
      lastFrameTime = now;
      graphTime += dt;

      if (graphNodes.length < MAX_NODES && graphTime - lastNodeSpawn > SPAWN_INTERVAL) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 100;
        const ci = graphNodes.length % 3;
        graphNodes.push({ x: w/2 + Math.cos(angle)*dist, y: h/2 + Math.sin(angle)*dist, vx:0, vy:0, type: nodeTypes[graphNodes.length%8], label: nodeLabels[graphNodes.length%nodeLabels.length], color: brandColors[ci], r: 4+Math.random()*4, opacity:0 });
        if (graphNodes.length > 1) { const tgt = Math.floor(Math.random()*(graphNodes.length-1)); graphEdges.push({from:graphNodes.length-1,to:tgt,dash:0}); if (Math.random()>0.5 && graphNodes.length>2) { const t2 = Math.floor(Math.random()*(graphNodes.length-1)); if (t2!==tgt) graphEdges.push({from:graphNodes.length-1,to:t2,dash:0}); } }
        lastNodeSpawn = graphTime;
      }

      ctx.clearRect(0, 0, w, h);
      const cx = w/2, cy = h/2;

      // Physics
      for (let i = 0; i < graphNodes.length; i++) {
        const n = graphNodes[i];
        if (n.opacity < 1) n.opacity = Math.min(1, n.opacity + dt*2);
        for (let j = i+1; j < graphNodes.length; j++) {
          const m = graphNodes[j];
          let dx = n.x-m.x, dy = n.y-m.y;
          const d = Math.sqrt(dx*dx+dy*dy)||1;
          if (d < 120) { const f = (120-d)*0.003; n.vx += (dx/d)*f; n.vy += (dy/d)*f; m.vx -= (dx/d)*f; m.vy -= (dy/d)*f; }
        }
        const dcx = cx-n.x, dcy = cy-n.y, dc = Math.sqrt(dcx*dcx+dcy*dcy)||1;
        n.vx += (dcx/dc)*0.02; n.vy += (dcy/dc)*0.02;
        if (hmx > 0) { const mdx=n.x-hmx, mdy=n.y-hmy, md=Math.sqrt(mdx*mdx+mdy*mdy)||1; if(md<150){const mf=(150-md)*0.005; n.vx+=(mdx/md)*mf; n.vy+=(mdy/md)*mf;} }
        n.vx += noise2D(i*0.5+graphTime*0.3,0)*0.3;
        n.vy += noise2D(0,i*0.5+graphTime*0.3)*0.3;
        const ang = Math.atan2(n.y-cy,n.x-cx);
        n.vx += -Math.sin(ang)*0.001*dc; n.vy += Math.cos(ang)*0.001*dc;
        n.vx *= 0.92; n.vy *= 0.92;
        n.x += n.vx; n.y += n.vy;
        if(n.x<40) n.vx+=0.5; if(n.x>w-40) n.vx-=0.5; if(n.y<40) n.vy+=0.5; if(n.y>h-40) n.vy-=0.5;
      }
      for (let e = 0; e < graphEdges.length; e++) {
        const edge = graphEdges[e]; const a = graphNodes[edge.from], b = graphNodes[edge.to];
        if(!a||!b) continue;
        const dx=b.x-a.x, dy=b.y-a.y, d=Math.sqrt(dx*dx+dy*dy)||1, f=(d-100)*0.001;
        a.vx+=(dx/d)*f; a.vy+=(dy/d)*f; b.vx-=(dx/d)*f; b.vy-=(dy/d)*f;
      }

      // Draw edges
      for (let e = 0; e < graphEdges.length; e++) {
        const edge = graphEdges[e]; const a = graphNodes[edge.from], b = graphNodes[edge.to];
        if(!a||!b) continue;
        edge.dash -= 0.5;
        ctx.save(); ctx.setLineDash([4,8]); ctx.lineDashOffset = edge.dash;
        ctx.strokeStyle = 'rgba('+a.color.r+','+a.color.g+','+a.color.b+','+(Math.min(a.opacity,b.opacity)*0.3)+')';
        ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
      }

      // Draw nodes
      for (let i = 0; i < graphNodes.length; i++) {
        const n = graphNodes[i];
        const grad = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*4);
        grad.addColorStop(0,'rgba('+n.color.r+','+n.color.g+','+n.color.b+','+(n.opacity*0.15)+')');
        grad.addColorStop(1,'rgba('+n.color.r+','+n.color.g+','+n.color.b+',0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba('+n.color.r+','+n.color.g+','+n.color.b+','+(n.opacity*0.7)+')';
        drawShape(ctx,n.x,n.y,n.r,n.type); ctx.fill();
        ctx.strokeStyle = 'rgba('+n.color.r+','+n.color.g+','+n.color.b+','+n.opacity+')'; ctx.lineWidth=1;
        drawShape(ctx,n.x,n.y,n.r,n.type); ctx.stroke();
        const la = n.opacity*(0.4+Math.sin(graphTime*1.5+i)*0.2);
        if(la>0.2){ctx.font='9px "IBM Plex Mono",monospace';ctx.fillStyle='rgba(14,14,14,'+la+')';ctx.textAlign='center';ctx.fillText(n.label,n.x,n.y+n.r+14);}
      }

      // Scanline
      ctx.fillStyle = 'rgba(255,77,21,0.012)';
      ctx.fillRect(0,(graphTime*60)%h,w,2);

      requestAnimationFrame(draw);
    };
    draw();
    const heroEl = document.querySelector('.hero');
    if (heroEl) new IntersectionObserver((e) => { running = e[0].isIntersecting; if(running){lastFrameTime=performance.now();draw();} }, {threshold:0}).observe(heroEl);
  }

  /* ============================================
     FOOTER GENERATIVE CANVAS (morphing concentric rings)
     ============================================ */
  const footerCanvasEl = document.getElementById('footerCanvas');
  let footerCtx, footerW, footerH, footerTime = 0;
  let footerRunning = false;
  let footerLastTime = performance.now();

  if (footerCanvasEl && !prefersReduced && !isMobile) {
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
     EMAIL OBFUSCATION (anti-spam)
     ============================================ */
  (function initEmails() {
    var u1 = 'hello';
    var u2 = 'press';
    var d = 'scopnum';
    var t = '.ai';
    var helloAddr = u1 + '@' + d + t;
    var pressAddr = u2 + '@' + d + t;

    var ctaEl = document.getElementById('ctaEmail');
    if (ctaEl) {
      ctaEl.href = 'mailto:' + helloAddr;
      var span = ctaEl.querySelector('.email-placeholder');
      if (span) span.textContent = '[' + helloAddr + ']';
    }

    var pressEl = document.getElementById('pressEmail');
    if (pressEl) {
      pressEl.textContent = '[' + pressAddr + ']';
    }
  })();

  /* ============================================
     INTERACTIVE TERMINAL ANIMATION
     ============================================ */
  const terminalBody = document.getElementById('terminalLines');
  let terminalRunning = false;
  let currentRunId = 0;

  if (terminalBody) {
    const termScript = [
      { type: 'prompt', text: '$ investigate wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD' },
      { type: 'pause', ms: 600 },
      { type: 'stage', text: '[aggregator] scanning 60+ sources........... done' },
      { type: 'stage', text: '[brain]      tribunal routing query.......... done' },
      { type: 'stage', text: '[crypto]     tracing 3 hops on ETH........... done' },
      { type: 'stage', text: '[snp]        47 cells activated.............. done' },
      { type: 'stage', text: '[report]     generating STIX 2.1............. done' },
      { type: 'pause', ms: 400 },
      { type: 'result', text: '--- RESULT ---' },
      { type: 'result', text: 'clusters: 4 | risk_score: 0.89 | hops: 3' },
      { type: 'result', text: 'linked_entities: 12 | mixer_detected: true' },
      { type: 'result', text: 'report: /out/STX-2025-0742d.json' },
    ];

    function runTerminal() {
      if (!terminalRunning) return;
      const myId = ++currentRunId;
      terminalBody.innerHTML = '';
      let delay = 0;
      termScript.forEach((item, idx) => {
        if (item.type === 'pause') { delay += item.ms; return; }
        delay += item.type === 'prompt' ? 80 : 300;
        const d = delay;
        setTimeout(() => {
          if (myId !== currentRunId || !terminalRunning) return;
          const line = document.createElement('span');
          line.className = 'terminal__line terminal__line--' + item.type;
          line.textContent = item.text;
          terminalBody.appendChild(line);
        }, d);
        if (item.type === 'prompt') delay += item.text.length * 30;
      });
      delay += 5000;
      setTimeout(() => { if (myId !== currentRunId || !terminalRunning) return; runTerminal(); }, delay);
    }

    const termObs = new IntersectionObserver((entries) => {
      terminalRunning = entries[0].isIntersecting;
      if (terminalRunning) runTerminal();
    }, { threshold: 0.2 });
    termObs.observe(terminalBody.closest('.terminal-section'));
  }

  /* ============================================
     PRODUCT CARD MINI CANVAS VISUALIZATIONS
     ============================================ */
  function initMiniCanvas(id, drawFn) {
    const el = document.getElementById(id);
    if (!el || prefersReduced) return null;
    const ctx2 = el.getContext('2d');
    let cw, ch, cdpr, cRunning = false, cTime = 0, cLast = performance.now();

    function resize() {
      cdpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cw = el.parentElement.offsetWidth;
      ch = el.parentElement.offsetHeight;
      el.width = cw * cdpr; el.height = ch * cdpr;
      el.style.width = cw + 'px'; el.style.height = ch + 'px';
      ctx2.setTransform(cdpr, 0, 0, cdpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function tick() {
      if (!cRunning) return;
      const now = performance.now();
      cTime += (now - cLast) * 0.001;
      cLast = now;
      ctx2.clearRect(0, 0, cw, ch);
      drawFn(ctx2, cw, ch, cTime);
      requestAnimationFrame(tick);
    }

    new IntersectionObserver((entries) => {
      cRunning = entries[0].isIntersecting;
      if (cRunning) { cLast = performance.now(); tick(); }
    }, { threshold: 0 }).observe(el);

    return { ctx: ctx2, el: el };
  }

  // OSINT mini graph
  initMiniCanvas('osintCanvas', function(ctx2, cw, ch, t) {
    const nodes = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 0.3;
      const r = 30 + Math.sin(t + i) * 10;
      nodes.push({ x: cw/2 + Math.cos(a) * r, y: ch/2 + Math.sin(a) * r });
    }
    ctx2.strokeStyle = 'rgba(255,77,21,0.3)'; ctx2.lineWidth = 0.6;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if ((i + j) % 3 === 0) { ctx2.beginPath(); ctx2.moveTo(nodes[i].x, nodes[i].y); ctx2.lineTo(nodes[j].x, nodes[j].y); ctx2.stroke(); }
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const pulse = 0.5 + Math.sin(t * 2 + i) * 0.3;
      ctx2.fillStyle = 'rgba(255,77,21,' + pulse + ')';
      ctx2.beginPath(); ctx2.arc(nodes[i].x, nodes[i].y, 3, 0, Math.PI * 2); ctx2.fill();
    }
  });

  // Crypto blockchain flow
  initMiniCanvas('cryptoCanvas', function(ctx2, cw, ch, t) {
    const blockCount = 6;
    const spacing = cw / (blockCount + 1);
    for (let i = 0; i < blockCount; i++) {
      const x = spacing * (i + 1) + Math.sin(t * 0.5 + i) * 5;
      const y = ch / 2 + Math.cos(t * 0.7 + i * 0.8) * 15;
      const s = 12;
      ctx2.strokeStyle = 'rgba(33,54,240,0.5)'; ctx2.lineWidth = 1;
      ctx2.strokeRect(x - s, y - s, s * 2, s * 2);
      if (i < blockCount - 1) {
        const nx = spacing * (i + 2) + Math.sin(t * 0.5 + i + 1) * 5;
        const ny = ch / 2 + Math.cos(t * 0.7 + (i + 1) * 0.8) * 15;
        ctx2.beginPath(); ctx2.moveTo(x + s, y); ctx2.lineTo(nx - s, ny);
        ctx2.setLineDash([3, 4]); ctx2.lineDashOffset = -t * 20; ctx2.stroke(); ctx2.setLineDash([]);
      }
    }
  });

  // Globe wireframe
  initMiniCanvas('globeCanvas', function(ctx2, cw, ch, t) {
    const cx2 = cw / 2, cy2 = ch / 2, r = Math.min(cw, ch) * 0.35;
    ctx2.strokeStyle = 'rgba(14,14,14,0.2)'; ctx2.lineWidth = 0.6;
    ctx2.beginPath(); ctx2.arc(cx2, cy2, r, 0, Math.PI * 2); ctx2.stroke();
    for (let i = 1; i <= 3; i++) {
      const rx = r * (i / 4);
      ctx2.beginPath(); ctx2.ellipse(cx2, cy2, rx, r, 0, 0, Math.PI * 2); ctx2.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const lat = (i / 4 - 0.5) * Math.PI;
      const ry = Math.cos(lat) * r;
      const yOff = Math.sin(lat) * r;
      ctx2.beginPath(); ctx2.ellipse(cx2, cy2 + yOff, r, Math.abs(ry) * 0.3, t * 0.2 + i, 0, Math.PI * 2); ctx2.stroke();
    }
    const dots = [[0.3, 0.7], [0.7, 0.4], [0.5, 0.8], [0.8, 0.6]];
    ctx2.fillStyle = 'rgba(183,255,46,0.8)';
    dots.forEach((d) => {
      const dx = cx2 + (d[0] - 0.5) * r * 1.5 * Math.cos(t * 0.4);
      const dy = cy2 + (d[1] - 0.5) * r * 1.5;
      ctx2.beginPath(); ctx2.arc(dx, dy, 3, 0, Math.PI * 2); ctx2.fill();
    });
  });

  // SNP neural mesh
  initMiniCanvas('snpCanvas', function(ctx2, cw, ch, t) {
    const cols = 5, rows = 4;
    const sx = cw / (cols + 1), sy = ch / (rows + 1);
    const pts = [];
    for (let r2 = 0; r2 < rows; r2++) {
      for (let c = 0; c < cols; c++) {
        pts.push({ x: sx * (c + 1), y: sy * (r2 + 1), active: Math.sin(t * 3 + r2 * cols + c) > 0.5 });
      }
    }
    ctx2.strokeStyle = 'rgba(33,54,240,0.15)'; ctx2.lineWidth = 0.5;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < sx * 1.8) { ctx2.beginPath(); ctx2.moveTo(pts[i].x, pts[i].y); ctx2.lineTo(pts[j].x, pts[j].y); ctx2.stroke(); }
      }
    }
    pts.forEach((p) => {
      ctx2.fillStyle = p.active ? 'rgba(255,77,21,0.7)' : 'rgba(33,54,240,0.3)';
      ctx2.beginPath(); ctx2.arc(p.x, p.y, p.active ? 4 : 2.5, 0, Math.PI * 2); ctx2.fill();
    });
  });

  /* ============================================
     PER-SECTION CANVAS BACKGROUNDS
     ============================================ */
  function initSectionBg(id, drawFn) {
    const el = document.getElementById(id);
    if (!el || prefersReduced || isMobile) return;
    const ctx2 = el.getContext('2d');
    let sw, sh, sdpr, sRunning = false, sTime = 0, sLast = performance.now();

    function resize() {
      sdpr = Math.min(window.devicePixelRatio || 1, 1);
      sw = el.parentElement.offsetWidth; sh = el.parentElement.offsetHeight;
      el.width = sw * sdpr; el.height = sh * sdpr;
      el.style.width = sw + 'px'; el.style.height = sh + 'px';
      ctx2.setTransform(sdpr, 0, 0, sdpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function tick() {
      if (!sRunning) return;
      const now = performance.now();
      sTime += (now - sLast) * 0.001;
      sLast = now;
      ctx2.clearRect(0, 0, sw, sh);
      drawFn(ctx2, sw, sh, sTime);
      requestAnimationFrame(tick);
    }

    new IntersectionObserver((entries) => {
      sRunning = entries[0].isIntersecting;
      if (sRunning) { sLast = performance.now(); tick(); }
    }, { threshold: 0 }).observe(el);
  }

  // About: flowing connection lines
  initSectionBg('aboutBgCanvas', function(ctx2, sw, sh, t) {
    ctx2.strokeStyle = 'rgba(14,14,14,0.06)'; ctx2.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
      ctx2.beginPath();
      const y0 = sh * 0.2 + i * sh * 0.08;
      ctx2.moveTo(0, y0);
      for (let x = 0; x <= sw; x += 40) {
        const n = noise2D ? noise2D(x * 0.005 + t * 0.2, i * 2 + t * 0.1) : Math.sin(x * 0.01 + t + i);
        ctx2.lineTo(x, y0 + n * 30);
      }
      ctx2.stroke();
    }
  });

  // Bento: pulsing dot grid
  initSectionBg('bentoBgCanvas', function(ctx2, sw, sh, t) {
    const spacing = 40;
    const cols = Math.ceil(sw / spacing);
    const rows = Math.ceil(sh / spacing);
    for (let r2 = 0; r2 < rows; r2++) {
      for (let c = 0; c < cols; c++) {
        const x = c * spacing + spacing / 2;
        const y = r2 * spacing + spacing / 2;
        const pulse = 0.3 + Math.sin(t * 1.5 + c * 0.3 + r2 * 0.5) * 0.2;
        ctx2.fillStyle = 'rgba(14,14,14,' + (pulse * 0.03) + ')';
        ctx2.beginPath();
        ctx2.arc(x, y, 1.5 + pulse, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
  });

  // Stats: counting particles
  initSectionBg('statsBgCanvas', function(ctx2, sw, sh, t) {
    for (let i = 0; i < 30; i++) {
      const x = (i * 73 + t * 20) % sw;
      const y = sh - ((i * 47 + t * 15) % sh);
      const alpha = 0.04 + Math.sin(t + i) * 0.02;
      ctx2.fillStyle = 'rgba(255,77,21,' + alpha + ')';
      ctx2.beginPath();
      ctx2.arc(x, y, 2, 0, Math.PI * 2);
      ctx2.fill();
    }
  });

  /* ============================================
     MICRO-INTERACTIONS
     ============================================ */
  // Glitch text on hover for .section__tag
  document.querySelectorAll('.section__tag').forEach(function(el) {
    var textEl = el.querySelector('span');
    if (!textEl) return;
    var original = textEl.textContent;
    var glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>[]';
    el.addEventListener('mouseenter', function() {
      var iterations = 0;
      var maxIter = 10;
      var interval = setInterval(function() {
        textEl.textContent = original.split('').map(function(ch, idx) {
          if (idx < iterations || ch === ' ') return ch;
          return glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }).join('');
        iterations += original.length / maxIter;
        if (iterations >= original.length) { textEl.textContent = original; clearInterval(interval); }
      }, 30);
    });
  });

  // Particle burst on CTA click
  document.querySelectorAll('.hero__cta, .cta__mail, .btn--pill').forEach(function(el) {
    el.addEventListener('click', function(e) {
      var colors = ['#ff4d15', '#2136f0', '#b7ff2e'];
      for (var i = 0; i < 10; i++) {
        var dot = document.createElement('div');
        dot.className = 'particle-burst';
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
        dot.style.background = colors[i % 3];
        var angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
        var dist = 40 + Math.random() * 60;
        dot.style.animation = 'burstOut .6s var(--ease-out) forwards';
        dot.style.transform = 'translate(' + (Math.cos(angle) * dist) + 'px,' + (Math.sin(angle) * dist) + 'px) scale(0)';
        document.body.appendChild(dot);
        setTimeout(function(d) { d.remove(); }, 700, dot);
      }
    });
  });

  /* ============================================
     LIVE DATA SIMULATION
     ============================================ */
  // Hero spec counter fluctuation
  var heroSpecVal = document.querySelector('.hero__spec-val strong');
  var heroSpecIntervalId = null;
  if (heroSpecVal) {
    heroSpecIntervalId = setInterval(function() {
      var val = 99.95 + Math.random() * 0.04;
      heroSpecVal.textContent = val.toFixed(2);
    }, 3000);
  }

  // Footer live status rotation
  var footerLive = document.querySelector('.footer__live');
  var footerLiveIntervalId = null;
  if (footerLive) {
    var statuses = ['[9 services \u00b7 nominal]', '[aggregator \u00b7 indexing]', '[snp \u00b7 47 cells active]', '[crypto \u00b7 16 chains synced]', '[globe \u00b7 sgp4 tracking]'];
    var statusIdx = 0;
    footerLiveIntervalId = setInterval(function() {
      statusIdx = (statusIdx + 1) % statuses.length;
      footerLive.innerHTML = '<i></i> ' + statuses[statusIdx];
    }, 4000);
  }

  // Pause/resume intervals when page is not visible
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (heroSpecIntervalId !== null) { clearInterval(heroSpecIntervalId); heroSpecIntervalId = null; }
      if (footerLiveIntervalId !== null) { clearInterval(footerLiveIntervalId); footerLiveIntervalId = null; }
    } else {
      if (heroSpecVal && heroSpecIntervalId === null) {
        heroSpecIntervalId = setInterval(function() {
          var val = 99.95 + Math.random() * 0.04;
          heroSpecVal.textContent = val.toFixed(2);
        }, 3000);
      }
      if (footerLive && footerLiveIntervalId === null) {
        footerLiveIntervalId = setInterval(function() {
          statusIdx = (statusIdx + 1) % statuses.length;
          footerLive.innerHTML = '<i></i> ' + statuses[statusIdx];
        }, 4000);
      }
    }
  });

  /* ============================================
     ENHANCED PARALLAX - horizontal geo-deco drift + manifesto title scale
     ============================================ */
  var geoDecos = document.querySelectorAll('.geo-deco__shape');
  var manifestoTitle = document.querySelector('.manifesto__title');
  var footerHuge = document.querySelector('.footer__huge');

  function enhancedParallaxTick() {
    if (prefersReduced || isMobile) return;
    // Interactive geo-deco shapes with scroll + mouse reaction
    geoDecos.forEach(function(el, i) {
      if (isMobile) return;
      var dir = i % 2 === 0 ? 1 : -1;
      var speed = 0.02 + (i % 3) * 0.01;

      // Scroll-based drift
      var driftX = smoothY * speed * dir;
      var driftY = smoothY * speed * 0.5 * (i % 2 === 0 ? -1 : 1);

      // Scroll velocity rotation
      var rotSpeed = 0.02 + (i % 4) * 0.008;
      var rotation = smoothY * rotSpeed * dir + scrollVelocity * 2 * dir;

      // Mouse proximity reaction (magnetic)
      var rect = el.getBoundingClientRect();
      var elCx = rect.left + rect.width / 2;
      var elCy = rect.top + rect.height / 2;
      var mdx = mx - elCx;
      var mdy = my - elCy;
      var dist = Math.sqrt(mdx * mdx + mdy * mdy);
      var mouseInfluence = 0;
      var mousePushX = 0, mousePushY = 0;

      if (dist < 300 && hasHover) {
        mouseInfluence = (300 - dist) / 300;
        // Repulsion effect - push away from mouse
        mousePushX = -(mdx / dist) * mouseInfluence * 20;
        mousePushY = -(mdy / dist) * mouseInfluence * 20;
      }

      el.style.transform = 'translate(' + (driftX + mousePushX) + 'px, ' + (driftY + mousePushY) + 'px) rotate(' + rotation + 'deg)';
    });
    // Scale on scroll for manifesto title
    if (manifestoTitle) {
      var rect = manifestoTitle.getBoundingClientRect();
      var vh = window.innerHeight;
      if (rect.top < vh && rect.bottom > 0) {
        var progress = 1 - (rect.top / vh);
        var scale = 1 + clamp(progress * 0.05, 0, 0.05);
        manifestoTitle.style.transform = 'scale(' + scale.toFixed(4) + ')';
      }
    }
    // Stronger parallax on footer huge
    if (footerHuge) {
      var r2 = footerHuge.getBoundingClientRect();
      var vh2 = window.innerHeight;
      if (r2.top < vh2 && r2.bottom > 0) {
        var offset = (r2.top - vh2 / 2) * 0.35;
        footerHuge.style.transform = 'translateY(' + (-offset) + 'px)';
      }
    }
  }

  /* ============================================
     AMBIENT PARTICLE CANVAS
     ============================================ */
  const ambientCanvas = document.getElementById('ambientCanvas');
  let ambientCtx, ambientW, ambientH;
  const ambientParticles = [];
  const AMBIENT_COUNT = 50;

  if (ambientCanvas && !prefersReduced && !isMobile) {
    ambientCtx = ambientCanvas.getContext('2d');

    function resizeAmbient() {
      ambientW = window.innerWidth;
      ambientH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      ambientCanvas.width = ambientW * dpr;
      ambientCanvas.height = ambientH * dpr;
      ambientCanvas.style.width = ambientW + 'px';
      ambientCanvas.style.height = ambientH + 'px';
      ambientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeAmbient();
    window.addEventListener('resize', resizeAmbient);

    // Initialize particles with random positions, sizes, speeds
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      ambientParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.5 + Math.random() * 1.5,
        opacity: 0.03 + Math.random() * 0.03,
        speed: 0.2 + Math.random() * 0.4,
        noiseOffsetX: Math.random() * 1000,
        noiseOffsetY: Math.random() * 1000,
        isAccent: Math.random() < 0.3
      });
    }
  }

  function ambientTick() {
    if (!ambientCtx || !noise2D) return;
    ambientCtx.clearRect(0, 0, ambientW, ambientH);

    const time = performance.now() * 0.0003;
    const scrollBoost = 1 + Math.min(Math.abs(scrollVelocity) * 0.1, 2);

    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];

      // Noise-driven organic movement
      const nx = noise2D(p.noiseOffsetX + time * p.speed, i * 0.5) * p.speed * scrollBoost;
      const ny = noise2D(i * 0.5, p.noiseOffsetY + time * p.speed) * p.speed * scrollBoost;

      p.x += nx;
      p.y += ny;

      // Wrap around screen edges
      if (p.x < -10) p.x = ambientW + 10;
      if (p.x > ambientW + 10) p.x = -10;
      if (p.y < -10) p.y = ambientH + 10;
      if (p.y > ambientH + 10) p.y = -10;

      // Draw particle
      if (p.isAccent) {
        ambientCtx.fillStyle = 'rgba(255, 77, 21, ' + p.opacity + ')';
      } else {
        ambientCtx.fillStyle = 'rgba(14, 14, 14, ' + p.opacity + ')';
      }
      ambientCtx.beginPath();
      ambientCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ambientCtx.fill();
    }
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
    ambientTick();
    sectionThemeTick();
    enhancedParallaxTick();
    requestAnimationFrame(masterLoop);
  }
  requestAnimationFrame(masterLoop);

})();
