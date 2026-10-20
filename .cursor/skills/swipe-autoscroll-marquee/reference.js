/**
 * Infinite horizontal marquee: cruise autoplay + 1:1 drag + flick momentum.
 *
 * Usage:
 *   1. Fill [data-marquee-track] with one set of cards, then clone the set
 *      (skip the clone when prefers-reduced-motion).
 *   2. Eager-load images in both halves (loading="eager").
 *   3. initSwipeMarquee(document.getElementById("products-marquee"));
 */
function initSwipeMarquee(root) {
  if (!root) return;
  const track = root.querySelector("[data-marquee-track]");
  if (!track || !track.children.length) {
    root.hidden = true;
    return;
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.toggle("is-reduced", reduced);
  if (reduced) return;

  let offset = 0;
  let loopWidth = 0;
  let rafId = 0;
  let lastTs = 0;
  let dragging = false;
  let dragMoved = false;
  let axis = "";
  let pointerId = null;
  let lastX = 0;
  let lastMoveTs = 0;
  let startX = 0;
  let startY = 0;
  const autoplaySpeed = 0.048; // ~48px/s cruise
  const friction = 0.00135; // coast half-life ~500ms
  const maxFlick = 3.5; // px/ms
  let velocity = autoplaySpeed;
  let coasting = false;
  let measureTimer = 0;
  let moveSamples = [];

  function measure() {
    const half = track.scrollWidth / 2;
    const next = half > 0 ? half : 0;
    if (Math.abs(next - loopWidth) < 0.5) return;
    loopWidth = next;
    if (loopWidth > 0) {
      offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }
  }

  function scheduleMeasure() {
    if (measureTimer) return;
    measureTimer = requestAnimationFrame(() => {
      measureTimer = 0;
      measure();
    });
  }

  function wrapOffset(value) {
    if (loopWidth <= 0) return 0;
    let next = value % loopWidth;
    if (next < 0) next += loopWidth;
    return next;
  }

  function applyOffset() {
    offset = wrapOffset(offset);
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  }

  function pushSample(dx, time) {
    moveSamples.push({ t: time, dx });
    const cutoff = time - 120;
    while (moveSamples.length && moveSamples[0].t < cutoff) moveSamples.shift();
  }

  function flickVelocityFromSamples() {
    if (moveSamples.length < 1) return velocity;
    let totalDx = 0;
    const start = moveSamples[0].t;
    const end = moveSamples[moveSamples.length - 1].t;
    for (let i = 0; i < moveSamples.length; i += 1) totalDx += moveSamples[i].dx;
    const span = Math.max(16, end - start);
    return -totalDx / span;
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    if (!loopWidth) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(32, Math.max(0, ts - lastTs));
    lastTs = ts;
    if (!dt) return;
    if (dragging && axis === "x") return;

    if (coasting) {
      velocity *= Math.exp(-friction * dt);
      if (Math.abs(velocity) <= autoplaySpeed * 1.15) {
        velocity = autoplaySpeed;
        coasting = false;
      }
    } else {
      velocity = autoplaySpeed;
    }

    offset += velocity * dt;
    applyOffset();
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("button, a, input, textarea, select, label")) return;
    dragging = true;
    dragMoved = false;
    coasting = false;
    axis = "";
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = event.clientY;
    lastMoveTs = event.timeStamp || performance.now();
    moveSamples = [];
    velocity = 0;
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    const dxTotal = event.clientX - startX;
    const dyTotal = event.clientY - startY;
    if (!axis) {
      if (Math.abs(dxTotal) < 4 && Math.abs(dyTotal) < 4) return;
      axis = Math.abs(dxTotal) > Math.abs(dyTotal) ? "x" : "y";
      if (axis === "x") {
        root.classList.add("is-dragging");
        try {
          root.setPointerCapture(event.pointerId);
        } catch (_) {
          /* ignore */
        }
      } else {
        dragging = false;
        pointerId = null;
        velocity = autoplaySpeed;
        return;
      }
    }
    if (axis !== "x") return;

    const coalesced =
      typeof event.getCoalescedEvents === "function" && event.getCoalescedEvents().length
        ? event.getCoalescedEvents()
        : [event];

    for (let i = 0; i < coalesced.length; i += 1) {
      const point = coalesced[i];
      const now = point.timeStamp || event.timeStamp || performance.now();
      const dx = point.clientX - lastX;
      if (dx === 0 && i < coalesced.length - 1) continue;
      offset -= dx;
      pushSample(dx, now);
      lastX = point.clientX;
      lastMoveTs = now;
      dragMoved = true;
    }

    if (moveSamples.length) velocity = flickVelocityFromSamples();
    applyOffset();
    if (event.cancelable) event.preventDefault();
  }

  function endDrag(event) {
    if (pointerId != null && event && event.pointerId !== pointerId && event.type !== "lostpointercapture") {
      return;
    }
    if (!dragging && !root.classList.contains("is-dragging")) {
      pointerId = null;
      return;
    }
    const didMove = dragMoved;
    dragging = false;
    pointerId = null;
    axis = "";
    root.classList.remove("is-dragging");

    if (didMove) {
      let flick = flickVelocityFromSamples();
      const idle = (event && event.timeStamp ? event.timeStamp : performance.now()) - lastMoveTs;
      if (idle > 80) flick *= Math.max(0, 1 - (idle - 80) / 140);
      velocity = Math.max(-maxFlick, Math.min(maxFlick, flick));
      coasting = Math.abs(velocity) > autoplaySpeed * 1.5;
      if (!coasting) velocity = autoplaySpeed;
      root.dataset.suppressClick = "1";
    } else {
      velocity = autoplaySpeed;
      coasting = false;
    }
    moveSamples = [];
    dragMoved = false;
  }

  root.classList.add("is-js-marquee");
  measure();
  requestAnimationFrame(measure);
  window.addEventListener("resize", scheduleMeasure);
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(track);
    ro.observe(root);
  }

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove, { passive: false });
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);
  root.addEventListener("lostpointercapture", endDrag);

  root.addEventListener(
    "click",
    (event) => {
      if (!root.dataset.suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      delete root.dataset.suppressClick;
    },
    true
  );

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") lastTs = 0;
  });

  rafId = requestAnimationFrame(tick);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initSwipeMarquee };
}
if (typeof window !== "undefined") {
  window.initSwipeMarquee = initSwipeMarquee;
}
