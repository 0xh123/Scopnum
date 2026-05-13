/* =============================================
   SCOPNUM — interactive behaviours
   ============================================= */

(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- PRELOADER ----- */
  window.addEventListener('load', () => {
    setTimeout(() => {
      const pre = document.getElementById('preloader');
      if (pre) pre.classList.add('is-done');
    }, 1200);
  });

  /* ----- CUSTOM CURSOR ----- */
  const cursor = document.querySelector('.cursor');
  const cDot = document.querySelector('.cursor__dot');
  const cRing = document.querySelector('.cursor__ring');

  if (cursor && window.matchMedia('(hover: hover)').matches) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      cRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();

    // hover detection
    document.querySelectorAll('a, button, input, [data-tilt], [data-magnetic]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ----- SCROLL PROGRESS + NAV ----- */
  const progressBar = document.querySelector('.progress span');
  const nav = document.querySelector('.nav');

  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    if (progressBar) progressBar.style.width = scrolled + '%';
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----- REVEAL ON SCROLL ----- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.delay || 0, 10);
        setTimeout(() => e.target.classList.add('is-visible'), delay);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach((el) => io.observe(el));

  /* ----- NUMBER COUNTERS ----- */
  const counters = document.querySelectorAll('[data-count]');
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const isInt = Number.isInteger(target);
      const duration = 1800;
      const start = performance.now();

      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = isInt ? Math.floor(val) : val.toFixed(1);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = isInt ? target : target;
      };
      requestAnimationFrame(tick);
      co.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => co.observe(el));

  /* ----- MAGNETIC BUTTONS ----- */
  if (!prefersReduced) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = 0.35;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ----- 3D TILT ----- */
  if (!prefersReduced) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const maxRot = 8;

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotY = (x - 0.5) * maxRot * 2;
        const rotX = -(y - 0.5) * maxRot * 2;
        el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0)`;

        // glow tracking (для .product__glow)
        const glow = el.querySelector('.product__glow');
        if (glow) {
          glow.style.setProperty('--x', (x * 100) + '%');
          glow.style.setProperty('--y', (y * 100) + '%');
        }
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ----- PARALLAX ORB ----- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !prefersReduced) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      parallaxEls.forEach((el) => {
        el.style.transform = `translate3d(${x * -30}px, ${y * -30}px, 0)`;
      });
    });
  }

  /* ----- PROCESS LINE PROGRESS ----- */
  const processLine = document.querySelector('.process__line span');
  const processWrap = document.querySelector('.process');
  const steps = document.querySelectorAll('.step');

  if (processLine && processWrap) {
    const updateLine = () => {
      const rect = processWrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.75;
      const end = vh * 0.25;
      const total = rect.height + (start - end);
      const passed = start - rect.top;
      const p = Math.max(0, Math.min(1, passed / total));
      processLine.style.height = (p * 100) + '%';

      // marcar steps as visible
      steps.forEach((step) => {
        const stepRect = step.getBoundingClientRect();
        if (stepRect.top < vh * 0.6) step.classList.add('is-visible');
      });
    };
    window.addEventListener('scroll', updateLine, { passive: true });
    updateLine();
  }

  /* ----- CANVAS NEURAL NETWORK (Hero background) ----- */
  const canvas = document.getElementById('neural-canvas');
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr;
    let nodes = [];
    let mouse = { x: -999, y: -999, active: false };
    const palette = ['139, 92, 246', '6, 182, 212', '236, 72, 153'];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();
    };

    const initNodes = () => {
      const count = Math.min(90, Math.floor((w * h) / 18000));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.5 + 0.5,
          color: palette[Math.floor(Math.random() * palette.length)],
          pulse: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // draw connections
      const maxDist = 140;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        a.pulse += 0.02;

        // bounce
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;

        // mouse repel
        if (mouse.active) {
          const dx = a.x - mouse.x;
          const dy = a.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const force = (140 - dist) / 140;
            a.x += (dx / dist) * force * 2;
            a.y += (dy / dist) * force * 2;
          }
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.4;
            ctx.strokeStyle = `rgba(${a.color}, ${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // draw nodes
      for (const n of nodes) {
        const pulseR = n.r + Math.sin(n.pulse) * 0.5;
        // glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulseR * 6);
        gradient.addColorStop(0, `rgba(${n.color}, 0.8)`);
        gradient.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR * 6, 0, Math.PI * 2);
        ctx.fill();

        // core
        ctx.fillStyle = `rgba(${n.color}, 1)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }

      // mouse connection beams
      if (mouse.active) {
        for (const n of nodes) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.6;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; };

    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    resize();
    draw();
  }

  /* ----- DOTS GRID INTERACTION (bento) ----- */
  // (декоративно — уже CSS-анимация)

  /* ----- DYNAMIC YEAR ----- */
  const yearEl = document.querySelector('.footer__bottom span');
  if (yearEl) {
    yearEl.textContent = yearEl.textContent.replace('[год]', new Date().getFullYear());
  }

})();
