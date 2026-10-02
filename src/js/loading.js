function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const splashGenerations = new WeakMap();

function splashGeneration(target) {
  return splashGenerations.get(target) || 0;
}

function bumpSplashGeneration(target) {
  const next = splashGeneration(target) + 1;
  splashGenerations.set(target, next);
  return next;
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, Math.max(0, ms)));
}

function nextPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export function showSplash(
  target = document.querySelector("[data-pdl-splash]"),
  options = {}
) {
  if (!target) return 0;

  const generation = bumpSplashGeneration(target);
  const status = options && typeof options.status === "string"
    ? options.status.trim()
    : "";
  const statusNode = target.querySelector(".pdl-splash__status");

  if (status && statusNode) statusNode.textContent = status;
  target.classList.remove("is-leaving");
  target.hidden = false;
  target.setAttribute("aria-hidden", "false");
  target.dispatchEvent(new CustomEvent("pdl:splash-shown", {
    bubbles: true,
    detail: { generation, status: status || null }
  }));
  return generation;
}

export function dismissSplash(target = document.querySelector("[data-pdl-splash]")) {
  if (!target) return Promise.resolve();

  const generation = splashGeneration(target);

  if (reducedMotion()) {
    if (generation !== splashGeneration(target)) return Promise.resolve();
    target.hidden = true;
    target.setAttribute("aria-hidden", "true");
    target.classList.remove("is-leaving");
    target.dispatchEvent(new CustomEvent("pdl:splash-dismissed", { bubbles: true }));
    return Promise.resolve();
  }

  target.classList.add("is-leaving");

  return new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (generation === splashGeneration(target)) {
        target.hidden = true;
        target.setAttribute("aria-hidden", "true");
        target.classList.remove("is-leaving");
        target.dispatchEvent(new CustomEvent("pdl:splash-dismissed", { bubbles: true }));
      }
      resolve();
    };

    target.addEventListener("transitionend", done, { once: true });
    window.setTimeout(done, 460);
  });
}

export async function withSplashTransition(update, options = {}) {
  const target = options.target ?? document.querySelector("[data-pdl-splash]");
  if (typeof update !== "function") return undefined;
  if (!target) return await update();

  const minVisible = reducedMotion()
    ? 0
    : Math.max(0, Number(options.minVisible ?? 180));
  const generation = showSplash(target, { status: options.status || "Cargando" });
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();

  if (!reducedMotion()) await nextPaint();

  let result;
  let failure;
  try {
    result = await update();
  } catch (error) {
    failure = error;
  } finally {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const remaining = minVisible - (now - started);
    if (remaining > 0) await wait(remaining);
    if (generation === splashGeneration(target)) await dismissSplash(target);
  }

  if (failure) throw failure;
  return result;
}

export function initLoading(root = document) {
  const cleanups = [];
  const splash = root.querySelector("[data-pdl-splash]");

  if (splash?.dataset.pdlSplashAuto === "load") {
    const onLoad = () => dismissSplash(splash);
    if (document.readyState === "complete") onLoad();
    else {
      window.addEventListener("load", onLoad, { once: true });
      cleanups.push(() => window.removeEventListener("load", onLoad));
    }
  }

  const dismissers = [...root.querySelectorAll("[data-pdl-splash-dismiss]")];
  for (const trigger of dismissers) {
    const handler = () => dismissSplash(splash);
    trigger.addEventListener("click", handler);
    cleanups.push(() => trigger.removeEventListener("click", handler));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}

export function setBusy(target, busy = true, label = null) {
  if (!target) return;
  target.setAttribute("aria-busy", String(Boolean(busy)));
  target.dataset.pdlBusy = String(Boolean(busy));

  if (label !== null) {
    if (busy) {
      if (!target.dataset.pdlIdleLabel) target.dataset.pdlIdleLabel = target.textContent;
      target.textContent = label;
    } else if (target.dataset.pdlIdleLabel) {
      target.textContent = target.dataset.pdlIdleLabel;
      delete target.dataset.pdlIdleLabel;
    }
  }

  target.dispatchEvent(new CustomEvent("pdl:busy-change", {
    bubbles: true,
    detail: { busy: Boolean(busy) }
  }));
}
