function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initPageMotion(root = document) {
  const html = document.documentElement;
  const cleanups = [];

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.dataset.pdlMotionReady = "";
    });
  });

  const reveals = [...root.querySelectorAll("[data-pdl-reveal]")];
  const groups = [...root.querySelectorAll("[data-pdl-reveal-group]")];

  for (const group of groups) {
    const items = [...group.querySelectorAll(":scope > [data-pdl-reveal]")];
    items.forEach((item, index) => {
      item.style.setProperty("--pdl-reveal-delay", `${Math.min(index * 60, 240)}ms`);
    });
  }

  if (reducedMotion() || !("IntersectionObserver" in window)) {
    reveals.forEach(item => item.classList.add("is-visible"));
    return { destroy() { delete html.dataset.pdlMotionReady; } };
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });

  reveals.forEach(item => observer.observe(item));
  cleanups.push(() => observer.disconnect());

  return {
    destroy() {
      cleanups.forEach(fn => fn());
      delete html.dataset.pdlMotionReady;
    }
  };
}

export function withViewTransition(update) {
  if (reducedMotion() || typeof document.startViewTransition !== "function") {
    return Promise.resolve(update());
  }

  const transition = document.startViewTransition(update);
  return transition.finished;
}
