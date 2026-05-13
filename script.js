/* =============================================
   SCOPNUM — interactive behaviours
   ============================================= */

(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* ============================================
     PRELOADER with progress
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
        startIntro();
      }, 500);
    }
    if (loaderPct) loaderPct.textContent = Math.floor(loaderProgress);
    if (loaderBar) loaderBar.style.width = loaderProgress + '%';
  }, 110);

  function startIntro() {
    // Hero title reveal
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
  const cTrail = document.querySelector('.cursor__trail');
  const cLabel = document.getElementById('cursorLabel');

  if (cursor && hasHover) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let dx = mx, dy = my;   // dot
    let rx = mx, ry = my;   // ring
    let tx = mx, ty = my;   // trail

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    const tick = () => {
      dx = lerp(dx, mx, 0.5);
      dy = lerp(dy, my, 0.5);
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      tx = lerp(tx, mx, 0.08);
      ty = lerp(ty, my, 0.08);

      if (cDot) cDot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      if (cRing) cRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      if (cTrail) cTrail.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      if (cLabel) cLabel.style.transform = `translate(${mx + 18}px, ${my + 18}px)`;

      requestAnimationFrame(tick);
    };
    tick();

    document.querySelectorAll('[data-hover]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-hover');
        const label = el.dataset.label;
        if (label) { cursor.classList.add('has-label'); if (cLabel) cLabel.textContent = label; }
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hover');
        cursor.classList.remove('has-label');
      });
    });
  }

  /* ============================================
     SCROLL PROGRESS + NAV
     ============================================ */
  const progressBar = document.querySelector('.progress span');
  const nav = document.getElementById('nav');

  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    if (progressBar) progressBar.style.width = scrolled + '%';
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);

    updateHScroll();
    updatePin();
    updateParallax();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ============================================
     CLOCK (MSK / gmt+3)
     ============================================ */
  const clockEl = document.getElementById('navClock');
  if (clockEl) {
    const tick = () => {
      const d = new Date();
      const mskOffset = 3 * 60;
      const local = d.getTime() + d.getTimezoneOffset() * 60000;
      const msk = new Date(local + mskOffset * 60000);
      const pad = (n) => String(n).padStart(2, '0');
      clockEl.textContent = `${pad(msk.getHours())}:${pad(msk.getMinutes())}:${pad(msk.getSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
        else el.textContent = isInt ? target : (target % 1 === 0 ? target : target);
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
  const scrambleEls = document.querySelectorAll('[data-scramble]');

  scrambleEls.forEach((el) => {
    const original = el.textContent;
    const run = () => {
      let i = 0;
      const len = original.length;
      const step = () => {
        let out = '';
        for (let j = 0; j < len; j++) {
          if (j < i) out += original[j];
          else if (original[j] === ' ') out += ' ';
          else out += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
        el.textContent = out;
        if (i < len) {
          i += 1;
          setTimeout(step, 35);
        }
      };
      step();
    };

    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(); so.unobserve(el); }
      });
    }, { threshold: 0.3 });
    so.observe(el);

    el.addEventListener('mouseenter', run);
  });

  /* ============================================
     SPLIT TEXT (chars & words)
     ============================================ */
  const splitChars = document.querySelectorAll('[data-split-chars]');
  splitChars.forEach((el) => {
    const text = el.innerHTML;
    // Handle <i>, <br>, etc — simple approach: split text nodes
    const frag = document.createDocumentFragment();
    const process = (html) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);
      textNodes.forEach((tn) => {
        const parent = tn.parentNode;
        const wrap = document.createDocumentFragment();
        tn.textContent.split('').forEach((ch) => {
          if (ch === ' ') { wrap.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'char';
          s.textContent = ch;
          // wrap in line-wrap for overflow hidden effect per-char would be too heavy;
          // rely on parent overflow clip
          wrap.appendChild(s);
        });
        parent.replaceChild(wrap, tn);
      });
      return div;
    };
    const wrapper = process(text);
    el.innerHTML = '';
    el.style.overflow = 'hidden';
    while (wrapper.firstChild) el.appendChild(wrapper.firstChild);
  });

  const splitWords = document.querySelectorAll('[data-split-words]');
  splitWords.forEach((el) => {
    const html = el.innerHTML;
    // Wrap each word in span.word-span keeping inline tags roughly intact
    const result = html.replace(/([^\s<>]+)(?![^<]*>)/g, '<span class="word-span">$1</span>');
    el.innerHTML = result;
    el.style.overflow = 'visible';
  });

  const sio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const items = el.querySelectorAll('.char, .word-span');
      items.forEach((c, i) => {
        c.style.transitionDelay = (i * 12) + 'ms';
      });
      el.classList.add('is-split-in');
      sio.unobserve(el);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('[data-split-chars], [data-split-words]').forEach((el) => sio.observe(el));

  /* ============================================
     MAGNETIC BUTTONS
     ============================================ */
  if (!prefersReduced && hasHover) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = 0.3;
      let rafId;
      let tx = 0, ty = 0, cx = 0, cy = 0;

      const run = () => {
        cx = lerp(cx, tx, 0.18);
        cy = lerp(cy, ty, 0.18);
        el.style.transform = `translate(${cx}px, ${cy}px)`;
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
          rafId = requestAnimationFrame(run);
        }
      };

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        tx = (e.clientX - rect.left - rect.width / 2) * strength;
        ty = (e.clientY - rect.top - rect.height / 2) * strength;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(run);
      });
      el.addEventListener('mouseleave', () => {
        tx = 0; ty = 0;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(run);
      });
    });
  }

  /* ============================================
     3D TILT
     ============================================ */
  if (!prefersReduced && hasHover) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const maxRot = 6;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotY = (x - 0.5) * maxRot * 2;
        const rotX = -(y - 0.5) * maxRot * 2;
        el.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ============================================
     NAV PREVIEW (follows cursor)
     ============================================ */
  const navPreview = document.getElementById('navPreview');
  if (navPreview && hasHover) {
    let px = 0, py = 0, tx = 0, ty = 0;
    let activeLink = null;

    const animate = () => {
      px = lerp(px, tx, 0.15);
      py = lerp(py, ty, 0.15);
      navPreview.style.transform = `translate(${px}px, ${py}px)`;
      requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX - 90;
      ty = e.clientY + 30;
    });

    document.querySelectorAll('.nav__menu a[data-preview]').forEach((link) => {
      const key = link.dataset.preview;
      link.addEventListener('mouseenter', () => {
        navPreview.classList.add('is-visible');
        navPreview.querySelectorAll('.nav__preview-inner').forEach((el) => {
          el.classList.toggle('is-active', el.dataset.previewContent === key);
        });
      });
      link.addEventListener('mouseleave', () => {
        navPreview.classList.remove('is-visible');
      });
    });
  }

  /* ============================================
     PARALLAX ELEMENTS
     ============================================ */
  const parallaxEls = document.querySelectorAll('[data-parallax-y]');
  function updateParallax() {
    if (prefersReduced) return;
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallaxY) || 0.2;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) * speed;
      el.style.transform = `translateY(${-offset}px)`;
    });
  }

  /* ============================================
     HORIZONTAL SCROLL TRACK
     ============================================ */
  const hWrap = document.querySelector('.h-scroll__wrap');
  const hSticky = document.querySelector('.h-scroll__sticky');
  const hTrack = document.getElementById('hTrack');
  const hProgress = document.getElementById('hProgressFill');

  function updateHScroll() {
    if (!hWrap || !hTrack) return;
    const rect = hWrap.getBoundingClientRect();
    const wrapHeight = hWrap.offsetHeight;
    const vh = window.innerHeight;
    const trackScroll = hTrack.scrollWidth - window.innerWidth + 120;

    if (rect.top > 0 || rect.bottom < vh) {
      // out of sticky range
      if (rect.top > 0) {
        hTrack.style.transform = `translateX(0)`;
        if (hProgress) hProgress.style.width = '0%';
      }
      return;
    }

    const scrolled = -rect.top;
    const max = wrapHeight - vh;
    const p = clamp(scrolled / max, 0, 1);
    hTrack.style.transform = `translateX(${-p * trackScroll}px)`;
    if (hProgress) hProgress.style.width = (p * 100) + '%';
  }

  /* ============================================
     PIN SHOWCASE — steps synced to scroll
     ============================================ */
  const pinWrap = document.querySelector('.pin__wrap');
  const pinSteps = document.querySelectorAll('.pin__step');
  const pinFrames = document.querySelectorAll('.pin__frame-item');
  const pinLabels = document.querySelectorAll('.pin__labels span');

  function updatePin() {
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
  }

  /* ============================================
     HERO WEBGL SHADER (liquid gradient)
     with canvas 2D fallback
     ============================================ */
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas && !prefersReduced) {
    const gl = heroCanvas.getContext('webgl', { antialias: false, alpha: true });

    if (gl) {
      initWebGLShader(gl, heroCanvas);
    } else {
      initCanvas2DFallback(heroCanvas);
    }
  }

  function initWebGLShader(gl, canvas) {
    const vert = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

    const frag = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      // Simplex 2D noise
      vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        vec2 p = (gl_FragCoord.xy - u_res.xy * 0.5) / min(u_res.x, u_res.y);
        float t = u_time * 0.12;

        // Mouse influence
        vec2 m = (u_mouse / u_res - 0.5);
        float md = length(p - m * 1.5);
        float mInf = smoothstep(0.6, 0.0, md) * 0.3;

        // Multi-layer noise field
        float n1 = snoise(p * 1.5 + vec2(t, t * 0.8)) * 0.5;
        float n2 = snoise(p * 3.0 + vec2(-t * 0.6, t * 0.4)) * 0.3;
        float n3 = snoise(p * 5.0 + vec2(t * 0.3, -t * 0.5)) * 0.2;
        float f = n1 + n2 + n3 + mInf;

        // Color palette (cream / orange / indigo)
        vec3 cream = vec3(0.949, 0.925, 0.878);
        vec3 cream2 = vec3(0.922, 0.886, 0.823);
        vec3 orange = vec3(1.0, 0.302, 0.082);
        vec3 indigo = vec3(0.129, 0.212, 0.941);
        vec3 ink = vec3(0.078, 0.078, 0.078);

        // Soft gradient base
        vec3 col = mix(cream, cream2, uv.y);

        // Orange blob
        float orangeMask = smoothstep(0.1, -0.4, f - 0.2);
        col = mix(col, orange, orangeMask * 0.35);

        // Indigo blob
        float indigoMask = smoothstep(0.1, -0.4, -f - 0.15);
        col = mix(col, indigo, indigoMask * 0.22);

        // Ink streaks
        float streak = smoothstep(0.02, 0.0, abs(f * 0.7 - 0.1));
        col = mix(col, ink, streak * 0.08);

        // Vignette
        float vig = smoothstep(1.0, 0.3, length(p));
        col *= mix(0.85, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compile = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) { initCanvas2DFallback(canvas); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      initCanvas2DFallback(canvas);
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'position');
    const resLoc = gl.getUniformLocation(prog, 'u_res');
    const timeLoc = gl.getUniformLocation(prog, 'u_time');
    const mouseLoc = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - rect.left;
      mouse.ty = rect.height - (e.clientY - rect.top);
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const t0 = performance.now();
    let running = true;
    const render = () => {
      if (!running) return;
      mouse.x = lerp(mouse.x, mouse.tx, 0.08);
      mouse.y = lerp(mouse.y, mouse.ty, 0.08);

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, (performance.now() - t0) / 1000);
      gl.uniform2f(mouseLoc, mouse.x * (window.devicePixelRatio || 1), mouse.y * (window.devicePixelRatio || 1));
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    };
    render();

    // Pause when hero is out of view for perf
    const heroEl = document.querySelector('.hero');
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { running = e.isIntersecting; if (running) render(); });
    }, { threshold: 0 });
    if (heroEl) pio.observe(heroEl);
  }

  function initCanvas2DFallback(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr;
    let nodes = [];
    let mouse = { x: -999, y: -999, active: false };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = [];
      const count = Math.min(70, Math.floor((w * h) / 22000));
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    canvas.addEventListener('mouseleave', () => { mouse.active = false; });
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const maxDist = 140;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.strokeStyle = `rgba(20, 20, 20, ${(1 - dist / maxDist) * 0.2})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  /* ============================================
     FAQ accordion (single-open)
     ============================================ */
  const faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* Initial run */
  onScroll();

})();
