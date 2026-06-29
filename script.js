gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 820px)").matches;

// ヒーローの各レイヤー視差で共有するスクロール設定。
const HERO_SCRUB = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };

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
  // モーション抑制時は入場アニメも視差も行わず、要素を初期状態（=表示）のままにする。
  if (prefersReducedMotion) return;

  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(".hero-title", { yPercent: 72, opacity: 0, duration: 0.9 })
    .from(".reveal-portrait", { y: 36, scale: 0.96, opacity: 0, duration: 1 }, "-=0.7")
    .from(".hero .reveal-up", { y: 28, opacity: 0, duration: 0.75, stagger: 0.12 }, "-=0.45");

  gsap.to(".motion-grid", { yPercent: 18, ease: "none", scrollTrigger: { ...HERO_SCRUB } });
  gsap.to(".hero-foreground", { yPercent: isMobile ? 8 : 12, opacity: 0.62, ease: "none", scrollTrigger: { ...HERO_SCRUB } });
  gsap.to(".hero-portrait img", { yPercent: isMobile ? 7 : 12, scale: 1.04, ease: "none", scrollTrigger: { ...HERO_SCRUB } });
  gsap.to(".hero-bgword", { xPercent: isMobile ? -4 : -8, yPercent: 6, ease: "none", scrollTrigger: { ...HERO_SCRUB } });
}

// カーテン演出＋横スクロールは、ブレークポイント/モーション設定の変化に追従させる（gsap.matchMedia）。
function initScrollAnimations() {
  const mm = gsap.matchMedia();

  // カーテン演出: 対応業務をピンで固定したまま黒幕を上へめくる。スマホは尺を短く。
  const makeCurtain = (endPct) => () => {
    if (!document.querySelector(".curtain-transition") || !document.querySelector(".hero-curtain")) return;
    gsap.to(".hero-curtain", {
      yPercent: -106,
      ease: "none",
      scrollTrigger: {
        id: "curtain",
        trigger: ".curtain-transition",
        start: "top top",
        end: `+=${endPct}%`,
        scrub: 0.5,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  };
  mm.add("(max-width: 820px) and (prefers-reduced-motion: no-preference)", makeCurtain(15));
  mm.add("(min-width: 821px) and (prefers-reduced-motion: no-preference)", makeCurtain(40));

  // 参画実績の横スクロール（PCのみ）。スマホ幅へ変わると自動で解除される。
  mm.add("(min-width: 821px) and (prefers-reduced-motion: no-preference)", () => {
    const track = document.querySelector(".horizontal-track");
    if (!document.querySelector(".horizontal-section") || !track) return;
    const distance = () => track.scrollWidth - window.innerWidth + window.innerWidth * 0.12;
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".pin-wrap",
        start: "top top",
        end: () => `+=${distance()}`,
        pin: ".pin-wrap",
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
    });
  });
}

// 実績・経験の森背景にパララックスを付ける。
function initProfileParallax() {
  if (prefersReducedMotion) return;
  const img = document.querySelector(".profile-bg img");
  if (!img) return;

  gsap.to(img, {
    yPercent: -14,
    ease: "none",
    scrollTrigger: {
      trigger: ".profile-section",
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
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
  });
}

// 指定位置へ滑らかにスクロール。Lenis があればそれで、なければ（CDN不達/抑制時）ネイティブで。
function smoothScrollTo(lenis, y) {
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.max(0, Math.min(Math.round(y), maxY));

  if (prefersReducedMotion || !lenis) {
    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    return;
  }

  lenis.scrollTo(top, { duration: 1 });
}

function sectionTop(selector) {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
}

// ナビのアンカーは滑らかに移動。Services はカーテンのピン終了位置（=めくり切って対応業務が見える位置）へ着地させる。
function initNav(lenis) {
  const links = document.querySelectorAll('.site-nav a[href^="#"], .brand[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (id !== "#top" && !document.querySelector(id)) return;

      event.preventDefault();

      let y;
      if (id === "#top") {
        y = 0;
      } else if (id === "#services") {
        // カーテンのピン終了位置を直接使う（マジックナンバー不要・ピン中の座標誤読も回避）。
        const curtainST = ScrollTrigger.getById("curtain");
        y = curtainST ? curtainST.end : sectionTop(id);
      } else {
        y = sectionTop(id);
      }

      smoothScrollTo(lenis, y);
    });
  });
}

function initReveals() {
  if (prefersReducedMotion) return;

  gsap.utils.toArray(".reveal-up").forEach((element) => {
    // ヒーロー内の要素はイントロのタイムラインで処理済み。二重アニメーション（競合）を防ぐ。
    if (element.closest(".hero")) return;
    gsap.from(element, {
      y: isMobile ? 24 : 44,
      opacity: 0,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: { trigger: element, start: "top 84%", once: true },
    });
  });

  gsap.utils.toArray(".reveal-slide").forEach((element, index) => {
    if (element.closest(".hero")) return;
    gsap.from(element, {
      x: isMobile ? 0 : index % 2 === 0 ? -48 : 48,
      y: isMobile ? 28 : 0,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: element, start: "top 82%", once: true },
    });
  });
}

function init() {
  const lenis = initLenis();
  initHero();
  initScrollAnimations();
  initReveals();
  initProfileParallax();
  initProgress();
  initNav(lenis);
  ScrollTrigger.refresh();

  // Webフォントの遅延読み込みでレイアウトがずれるため、確定後にトリガー位置を再計算する。
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

window.addEventListener("load", init);
