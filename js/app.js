gsap.registerPlugin(ScrollTrigger);

/* ===== CONFIG ===== */
const FRAME_COUNT = 240;
const FRAME_SPEED = 2.0;
const FRAME_PATH = (i) => `frames/frame_${String(i).padStart(4, "0")}.webp`;

const frames = [];
let currentFrame = 0;
const BG_STONE = "#E2DCD1"; // always use site stone color for letterbox, never sample from grey video
let bgColor = BG_STONE;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const canvasWrap = document.querySelector(".canvas-wrap");
const heroSection = document.querySelector(".hero-standalone");
const scrollContainer = document.getElementById("scroll-container");
const loader = document.getElementById("loader");
const loaderBarFill = document.getElementById("loader-bar-fill");
const loaderPercent = document.getElementById("loader-percent");

/* ===== LENIS SMOOTH SCROLL ===== */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ===== CANVAS SIZING ===== */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ===== BACKGROUND COLOR SAMPLING ===== */
function sampleBgColor(img) {
  try {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 10; sampleCanvas.height = 10;
    const sctx = sampleCanvas.getContext("2d");
    sctx.drawImage(img, 0, 0, 10, 10);
    const data = sctx.getImageData(0, 0, 1, 1).data;
    bgColor = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
  } catch (e) { /* canvas tainted or not ready, keep previous */ }
}

/* ===== FRAME RENDERING: padded cover mode ===== */
const IMAGE_SCALE = 0.52;
function drawFrame(index) {
  const img = frames[index];
  if (!img) return;
  const cw = window.innerWidth, ch = window.innerHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ===== TWO-PHASE FRAME PRELOADER ===== */
let loadedCount = 0;
function updateLoaderProgress() {
  const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
  loaderBarFill.style.width = pct + "%";
  loaderPercent.textContent = pct + "%";
}

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      frames[i] = img;
      loadedCount++;
      updateLoaderProgress();
      resolve();
    };
    img.onerror = () => { loadedCount++; updateLoaderProgress(); resolve(); };
    img.src = FRAME_PATH(i + 1);
  });
}

async function preloadFrames() {
  // Phase 1: first 10 frames immediately for fast first paint
  const first = [];
  for (let i = 0; i < Math.min(10, FRAME_COUNT); i++) first.push(loadFrame(i));
  await Promise.all(first);
  drawFrame(0);

  // Phase 2: remaining frames in background
  const rest = [];
  for (let i = 10; i < FRAME_COUNT; i++) rest.push(loadFrame(i));
  await Promise.all(rest);

  loader.classList.add("hidden");
  initScrollAnimations();
}

/* ===== FRAME-TO-SCROLL BINDING ===== */
function initFrameScrub() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    }
  });
}

/* ===== HERO CIRCLE-WIPE REVEAL ===== */
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      heroSection.style.opacity = Math.max(0, 1 - p * 15);
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
      const radius = wipeProgress * 75;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    }
  });
}

/* ===== DARK OVERLAY (stats section) ===== */
function initDarkOverlay() {
  const statsSection = document.querySelector(".section-stats");
  const enter = parseFloat(statsSection.dataset.enter) / 100;
  const leave = parseFloat(statsSection.dataset.leave) / 100;
  const overlay = document.getElementById("dark-overlay");
  const fadeRange = 0.04;
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p >= enter - fadeRange && p <= enter) opacity = (p - (enter - fadeRange)) / fadeRange;
      else if (p > enter && p < leave) opacity = 0.9;
      else if (p >= leave && p <= leave + fadeRange) opacity = 0.9 * (1 - (p - leave) / fadeRange);
      overlay.style.opacity = Math.max(0, Math.min(0.9, opacity));
    }
  });
}

/* ===== SECTION ENTRANCE CHOREOGRAPHY ===== */
function setupSectionAnimation(section) {
  const type = section.dataset.animation;
  const persist = section.dataset.persist === "true";
  const enter = parseFloat(section.dataset.enter) / 100;
  const leave = parseFloat(section.dataset.leave) / 100;
  const children = section.querySelectorAll(
    ".section-label, .section-heading, .section-body, .section-note, .cta-button, .stat"
  );

  const tl = gsap.timeline({ paused: true });

  switch (type) {
    case "fade-up":
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
      break;
    case "slide-left":
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
      break;
    case "slide-right":
      tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
      break;
    case "scale-up":
      tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out" });
      break;
    case "rotate-in":
      tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" });
      break;
    case "stagger-up":
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" });
      break;
    case "clip-reveal":
      tl.from(children, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" });
      break;
  }

  gsap.set(section, { opacity: 1 });

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      if (p >= enter && p <= leave) {
        section.style.display = "block";
        const revealWindow = Math.max(0.012, (leave - enter) * 0.18);
        const localProgress = (p - enter) / revealWindow;
        tl.progress(Math.min(1, localProgress));
      } else if (p < enter) {
        if (!persist) { section.style.display = "none"; tl.progress(0); }
        else { section.style.display = "none"; }
      } else if (p > leave) {
        if (persist) { section.style.display = "block"; tl.progress(1); }
        else { section.style.display = "none"; }
      }
    }
  });
}

/* ===== COUNTER ANIMATIONS ===== */
function initCounters() {
  document.querySelectorAll(".stat-number").forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0");
    let played = false;
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const statsSection = document.querySelector(".section-stats");
        const enter = parseFloat(statsSection.dataset.enter) / 100;
        if (self.progress >= enter && !played) {
          played = true;
          gsap.fromTo(el, { textContent: 0 }, {
            textContent: target,
            duration: 1.6,
            ease: "power1.out",
            snap: { textContent: decimals === 0 ? 1 : 0.01 }
          });
        } else if (self.progress < enter && played) {
          played = false;
          el.textContent = "0";
        }
      }
    });
  });
}

/* ===== MARQUEE ===== */
function initMarquee() {
  document.querySelectorAll(".marquee-wrap").forEach((el) => {
    const speed = parseFloat(el.dataset.scrollSpeed) || -20;
    gsap.to(el.querySelector(".marquee-text"), {
      xPercent: speed,
      ease: "none",
      scrollTrigger: { trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true }
    });
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;
        if (p > 0.2 && p < 0.55) opacity = 1;
        else if (p >= 0.15 && p <= 0.2) opacity = (p - 0.15) / 0.05;
        else if (p >= 0.55 && p <= 0.6) opacity = 1 - (p - 0.55) / 0.05;
        el.style.opacity = Math.max(0, Math.min(1, opacity));
      }
    });
  });
}

/* ===== INIT ALL SCROLL ANIMATIONS ===== */
function initScrollAnimations() {
  initFrameScrub();
  initHeroTransition();
  initDarkOverlay();
  initCounters();
  initMarquee();
  document.querySelectorAll(".scroll-section").forEach(setupSectionAnimation);
  ScrollTrigger.refresh();
}

preloadFrames();
