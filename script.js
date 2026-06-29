gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 820px)").matches;

// コンテンツ差し替え時: .js-split を付けた見出しはロード時に1文字ずつ表示されます。
function splitText() {
  document.querySelectorAll(".js-split").forEach((element) => {
    const text = element.textContent.trim();
    element.setAttribute("aria-label", text);
    element.textContent = "";

    const mobileBreak = Number(element.dataset.mobileBreak || 0);

    [...text].forEach((char, index) => {
      const span = document.createElement("span");
      span.className = "char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = char === " " ? "\u00a0" : char;
      element.appendChild(span);
      if (mobileBreak > 0 && index + 1 === mobileBreak) {
        const breakElement = document.createElement("br");
        breakElement.className = "mobile-title-break";
        element.appendChild(breakElement);
      }
      element.appendChild(document.createElement("wbr"));
    });
  });
}

// 慣性スクロール (Lenis)。GSAP の ticker で駆動し、ScrollTrigger と同期させる。
function initLenis() {
  if (prefersReducedMotion) return null;

  const lenis = new Lenis({
    lerp: isMobile ? 0.14 : 0.09,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.1,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

function initHero() {
  const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
  const titleSelector = document.querySelector(".char") ? ".char" : ".hero-title";

  intro
    .from(titleSelector, {
      yPercent: 72,
      opacity: 0,
      duration: 0.9,
      stagger: 0.055,
    })
    .from(
      ".reveal-portrait",
      {
        y: 36,
        scale: 0.96,
        opacity: 0,
        duration: 1,
      },
      "-=0.7",
    )
    .from(
      ".hero .reveal-up",
      {
        y: 28,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
      },
      "-=0.45",
    );

  if (prefersReducedMotion) return;

  gsap.to(".motion-grid", {
    yPercent: 18,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".hero-foreground", {
    yPercent: isMobile ? 8 : 12,
    opacity: 0.62,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".hero-portrait img", {
    yPercent: isMobile ? 7 : 12,
    scale: 1.04,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  // 巨大バックワードはリニアにゆっくり流す（弾まない、知的な動き）。
  gsap.to(".hero-bgword", {
    xPercent: isMobile ? -4 : -8,
    yPercent: 6,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

// カーテン演出: 対応業務セクションをピンで固定したまま黒幕を上へめくり、中身を確実に見せる。
function initCurtain() {
  const curtain = document.querySelector(".curtain-transition");
  if (!curtain || !document.querySelector(".hero-curtain") || prefersReducedMotion) return;

  gsap.to(".hero-curtain", {
    yPercent: -106,
    ease: "none",
    scrollTrigger: {
      trigger: ".curtain-transition",
      start: "top top",
      end: isMobile ? "+=15%" : "+=40%",
      scrub: 0.5,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
}

// 実績・経験の森背景にパララックスを付ける。
function initProfileParallax() {
  if (prefersReducedMotion) return;
  const section = document.querySelector(".profile-section");
  const img = document.querySelector(".profile-bg img");
  if (!section || !img) return;

  gsap.to(img, {
    yPercent: -14,
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
}

// スクロール進捗バー。
function initProgress() {
  if (prefersReducedMotion) return;

  gsap.to(".scroll-progress", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      start: 0,
      end: "max",
      scrub: 0.3,
    },
  });
}

// 指定位置へ滑らかにスクロール。Lenis があればそれで、なければ ScrollToPlugin で。
// どちらもピン留めセクションを考慮して動くため、カーテンのピンを通過しても破綻しない。
function smoothScrollTo(lenis, y) {
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.max(0, Math.min(Math.round(y), maxY));

  if (prefersReducedMotion) {
    window.scrollTo({ top, behavior: "auto" });
    return;
  }

  if (lenis) {
    lenis.scrollTo(top, { duration: 1 });
    return;
  }

  gsap.to(window, {
    duration: 1,
    ease: "power2.inOut",
    scrollTo: { y: top, autoKill: false },
  });
}

// ナビのアンカーは滑らかに移動。Services はカーテンをめくり切った位置へ着地させる。
function initNav(lenis) {
  const links = document.querySelectorAll('.site-nav a[href^="#"], .brand[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      const target = id === "#top" ? null : document.querySelector(id);
      if (id !== "#top" && !target) return;

      event.preventDefault();

      let y = id === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY;

      // Services はカーテンの裏。めくり切る分だけ下にオフセットして着地させる。
      if (id === "#services" && !prefersReducedMotion) {
        y += window.innerHeight * (isMobile ? 0.15 : 0.40);
      }

      smoothScrollTo(lenis, y);
    });
  });
}

function initReveals() {
  gsap.utils.toArray(".reveal-up").forEach((element) => {
    gsap.from(element, {
      y: isMobile ? 24 : 44,
      opacity: 0,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 84%",
        once: true,
      },
    });
  });

  gsap.utils.toArray(".reveal-slide").forEach((element, index) => {
    gsap.from(element, {
      x: isMobile ? 0 : index % 2 === 0 ? -48 : 48,
      y: isMobile ? 28 : 0,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 82%",
        once: true,
      },
    });
  });
}

function initHorizontalPin() {
  const section = document.querySelector(".horizontal-section");
  const track = document.querySelector(".horizontal-track");
  if (!section || !track || isMobile || prefersReducedMotion) return;

  const getDistance = () => track.scrollWidth - window.innerWidth + window.innerWidth * 0.12;

  gsap.to(track, {
    x: () => -getDistance(),
    ease: "none",
    scrollTrigger: {
      trigger: ".pin-wrap",
      start: "top top",
      end: () => `+=${getDistance()}`,
      pin: ".pin-wrap",
      scrub: 0.65,
      invalidateOnRefresh: true,
    },
  });
}

function initScrub() {
  if (prefersReducedMotion) return;
  if (!document.querySelector(".scrub-section")) return;

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".scrub-section",
      start: "top 68%",
      end: "bottom 35%",
      scrub: true,
    },
  });

  timeline
    .to(".scrub-line", { scaleX: 1, ease: "none" }, 0)
    .to(".scrub-cursor", { xPercent: isMobile ? 150 : 300, rotation: 180, ease: "none" }, 0)
    .to(".node-a", { scale: 1.5, borderColor: "#d74f2a", ease: "none" }, 0.15)
    .to(".node-b", { scale: 1.5, borderColor: "#2f8c7a", ease: "none" }, 0.45)
    .to(".node-c", { scale: 1.5, borderColor: "#e1b44f", ease: "none" }, 0.75);
}

function init() {
  splitText();
  const lenis = initLenis();
  initHero();
  initCurtain();
  initReveals();
  initProfileParallax();
  initHorizontalPin();
  initScrub();
  initProgress();
  initNav(lenis);
  ScrollTrigger.refresh();
}

window.addEventListener("load", init);
