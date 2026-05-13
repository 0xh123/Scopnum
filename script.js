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
  let useSmoothScroll = !prefersReduced && hasHover && smooth && content;

  function initSmooth() {
    if (!useSmoothScroll) {
      return;
    }
    document.documentElement.classList.add('has-smooth');
    const measure = () => {
      contentH = content.scrollHeight;
      document.body.style.height = contentH + 'px';
    };
    measure();
    window.addEventListener('resize', measure);
    new ResizeObserver(measure).observe(content);
  }
  initSmooth();

  function smoothTick() {
    if (!useSmoothScroll) return;
    scrollY = window.scrollY;
    const prev = smoothY;
    smoothY = lerp(smoothY, scrollY, 0.09);
    if (Math.abs(smoothY - scrollY) < 0.5) smoothY = scrollY;
    scrollVelocity = smoothY - prev;
    content.style.transform = `translate3d(0, ${-smoothY}px, 0)`;
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
    const sy = useSmoothScroll ? smoothY : scrollY;

    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const rect = el.getBoundingClientRect();
      const elTop = rect.top + (useSmoothScroll ? smoothY : 0);
      const center = elTop + rect.height / 2 - sy;
      const offset = (center - vh / 2) * speed;
      el.style.transform = `translate3d(0, ${-offset}px, 0)`;
    });

    parallaxXEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallaxX) || 0.5;
      const offset = sy * speed;
      el.querySelector('span').style.transform = `translate3d(${-offset}px, 0, 0)`;
    });

    rotEls.forEach((el) => {
      const speed = parseFloat(el.dataset.rot) || 0.05;
      const angle = sy * speed;
      const prev = el.style.transform || '';
      if (prev.includes('translate3d')) {
        el.style.transform = prev.replace(/rotate\([^)]*\)/, `rotate(${angle}deg)`);
      } else {
        el.style.transform = `rotate(${angle}deg)`;
      }
    });
  }

  /* ============================================
     TICKER (velocity-driven speed)
     ============================================ */
  const tickerTrack = document.getElementById('tickerTrack');
  let tickerX = 0;

  function tickerTick() {
    if (!tickerTrack) return;
    const baseSpeed = 1.2;
    const velBoost = Math.abs(scrollVelocity) * 0.5;
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
    const sy = useSmoothScroll ? smoothY : scrollY;
    stripeTracks.forEach((track, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      const offset = sy * 0.3 * dir;
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
     HERO WEBGL SHADER
     ============================================ */
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas && !prefersReduced) {
    const gl = heroCanvas.getContext('webgl', { antialias: false, alpha: true });
    if (gl) initShader(gl, heroCanvas);
  }

  function initShader(gl, canvas) {
    const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
    const frag = `
precision highp float;
uniform vec2 u_r;uniform float u_t;uniform vec2 u_m;
vec3 perm(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){const vec4 C=vec4(.2113,.3660,-.5774,.0244);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);vec3 p=perm(perm(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.792-0.854*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}
void main(){vec2 uv=gl_FragCoord.xy/u_r;vec2 p=(gl_FragCoord.xy-u_r*.5)/min(u_r.x,u_r.y);float t=u_t*.1;vec2 m=(u_m/u_r-.5);float md=length(p-m*1.5);float mi=smoothstep(.6,.0,md)*.3;float n1=snoise(p*1.5+vec2(t,t*.8))*.5;float n2=snoise(p*3.0+vec2(-t*.6,t*.4))*.3;float n3=snoise(p*5.0+vec2(t*.3,-t*.5))*.2;float f=n1+n2+n3+mi;vec3 cream=vec3(.949,.925,.878);vec3 c2=vec3(.922,.886,.823);vec3 orange=vec3(1.,.302,.082);vec3 indigo=vec3(.129,.212,.941);vec3 col=mix(cream,c2,uv.y);col=mix(col,orange,smoothstep(.1,-.4,f-.2)*.35);col=mix(col,indigo,smoothstep(.1,-.4,-f-.15)*.22);col*=mix(.85,1.,smoothstep(1.,.3,length(p)));gl_FragColor=vec4(col,1);}`;

    const compile = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'p');
    const resLoc = gl.getUniformLocation(prog, 'u_r');
    const timeLoc = gl.getUniformLocation(prog, 'u_t');
    const mouseLoc = gl.getUniformLocation(prog, 'u_m');

    let gmx = 0, gmy = 0;
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); gmx = e.clientX - r.left; gmy = r.height - (e.clientY - r.top); });

    const resize = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr; gl.viewport(0, 0, canvas.width, canvas.height); };
    resize(); window.addEventListener('resize', resize);
    const t0 = performance.now();
    let running = true;

    const render = () => { if (!running) return; gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0); gl.uniform2f(resLoc, canvas.width, canvas.height); gl.uniform1f(timeLoc, (performance.now() - t0) / 1000); gl.uniform2f(mouseLoc, gmx * (window.devicePixelRatio || 1), gmy * (window.devicePixelRatio || 1)); gl.drawArrays(gl.TRIANGLES, 0, 6); requestAnimationFrame(render); };
    render();

    const heroEl = document.querySelector('.hero');
    if (heroEl) new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running) render(); }, { threshold: 0 }).observe(heroEl);
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
