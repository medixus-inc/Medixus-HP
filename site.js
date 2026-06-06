/* ============================================================
   Medixus — site interactions
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* ---- Header scroll state ---- */
  var hdr = document.querySelector(".hdr");
  function onScroll() {
    if (hdr) hdr.classList.toggle("scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var body = document.body;
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () { body.classList.toggle("menu-open"); });
    document.querySelectorAll(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { body.classList.remove("menu-open"); });
    });
  }

  /* ---- Reveal on scroll (rect-based; robust) ---- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  function checkReveals() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = reveals.length - 1; i >= 0; i--) {
      var r = reveals[i].getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { reveals[i].classList.add("in"); reveals.splice(i, 1); }
    }
  }
  if (reduce) { reveals.forEach(function (el) { el.classList.add("in"); }); reveals = []; }
  else {
    checkReveals();
    window.addEventListener("scroll", checkReveals, { passive: true });
    window.addEventListener("resize", checkReveals, { passive: true });
    [60, 200, 500, 1000].forEach(function (t) { setTimeout(checkReveals, t); });
  }

  /* ---- Count-up ---- */
  function countUp(el) {
    if (el._c) return; el._c = true;
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = (el.getAttribute("data-dec") | 0), dur = 1500, start = null;
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(step);
  }
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  function checkCounters() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = counters.length - 1; i >= 0; i--) {
      var r = counters[i].getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) { countUp(counters[i]); counters.splice(i, 1); }
    }
  }
  checkCounters();
  window.addEventListener("scroll", checkCounters, { passive: true });
  [120, 400, 900].forEach(function (t) { setTimeout(checkCounters, t); });

  /* ---- Lemniscate motif (animated hero stroke) ---- */
  function lemniscate(a, n, cx, cy, sy) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var th = (i / n) * Math.PI * 2;
      var d = 1 + Math.sin(th) * Math.sin(th);
      var x = (a * Math.SQRT2 * Math.cos(th)) / d;
      var y = (a * Math.SQRT2 * Math.cos(th) * Math.sin(th)) / d;
      pts.push([cx + x, cy + y * sy]);
    }
    var s = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (var j = 1; j < pts.length; j++) s += " L " + pts[j][0].toFixed(2) + " " + pts[j][1].toFixed(2);
    return s + " Z";
  }
  document.querySelectorAll("[data-lemni]").forEach(function (path) {
    var vb = path.ownerSVGElement.viewBox.baseVal;
    var d = lemniscate(vb.width * 0.32, 240, vb.width / 2, vb.height / 2, 0.6);
    path.setAttribute("d", d);
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    if (!reduce) {
      path.style.strokeDashoffset = len;
      requestAnimationFrame(function () { path.classList.add("draw"); });
    } else { path.style.strokeDashoffset = 0; }
  });

  /* ---- Hero parallax ---- */
  var px = document.querySelector("[data-parallax]");
  if (px && !reduce) {
    window.addEventListener("scroll", function () {
      px.style.transform = "translateY(" + (window.scrollY * 0.05) + "px)";
    }, { passive: true });
  }

  /* ---- Fake form submit ---- */
  var form = document.querySelector("[data-fakeform]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("[type=submit]"), done = form.querySelector(".form-done");
      if (btn) { btn.disabled = true; btn.textContent = "送信中…"; }
      setTimeout(function () {
        form.querySelector(".form-fields").style.display = "none";
        if (done) done.classList.add("show");
        window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
      }, 900);
    });
  }

  /* ---- Year ---- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
