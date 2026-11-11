/* My Esoteric Healer v2 - shared behaviour
   Mobile menu, 3D tilt cards, GSAP + ScrollTrigger reveals and photo parallax.
   All motion is skipped when the visitor prefers reduced motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 880) setMenu(false); });
  }

  /* ---------- year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  if (reduce) return;

  /* ---------- 3D tilt (pointer devices only) ---------- */
  if (finePointer) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 8;
      var raf = null;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transform = 'rotateY(' + ((px - 0.5) * max * 2).toFixed(2) + 'deg) rotateX(' + ((0.5 - py) * max * 2).toFixed(2) + 'deg) translateZ(0)';
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', function () {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = '';
      });
    });

    /* hero orb follows the pointer slightly */
    var stage = document.querySelector('.orb-stage');
    var frame = stage && stage.querySelector('.orb-frame');
    if (stage && frame) {
      window.addEventListener('pointermove', function (e) {
        var cx = e.clientX / window.innerWidth - 0.5;
        var cy = e.clientY / window.innerHeight - 0.5;
        frame.style.transform = 'rotateY(' + (cx * 10).toFixed(2) + 'deg) rotateX(' + (-cy * 10).toFixed(2) + 'deg)';
      });
    }
  }

  /* ---------- GSAP scroll motion ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('js-motion');

  gsap.utils.toArray('[data-reveal]').forEach(function (el) {
    var delay = parseFloat(el.getAttribute('data-reveal')) || 0;
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.1, delay: delay, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  gsap.utils.toArray('[data-parallax]').forEach(function (img) {
    var amt = parseFloat(img.getAttribute('data-parallax')) || 10;
    gsap.fromTo(img, { yPercent: -amt / 2 }, {
      yPercent: amt / 2, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  var hero = document.querySelector('.hero-copy');
  if (hero) {
    gsap.from(hero.children, { opacity: 0, y: 30, duration: 1.2, stagger: 0.12, ease: 'power3.out', delay: 0.1 });
    gsap.from('.orb-stage', { opacity: 0, scale: 0.92, rotateY: -12, duration: 1.6, ease: 'power3.out' });
  }

  /* make sure nothing stays hidden if the page is printed or captured mid-load */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
