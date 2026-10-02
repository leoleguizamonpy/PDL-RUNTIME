const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "[role='button']",
  "summary",
  "input[type='checkbox']",
  "input[type='radio']",
  "[data-pdl-cursor='interactive']"
].join(",");

function isInsideOpenTopLayer(target) {
  const closest = target?.closest?.bind(target);
  if (!closest) return false;

  if (closest("dialog[open]")) return true;

  const popover = closest("[popover]");
  if (popover && typeof popover.matches === "function") {
    try {
      if (popover.matches(":popover-open")) return true;
    } catch {
      // Older browsers may not understand :popover-open.
    }
  }

  return false;
}

export function initCursor(options = {}) {
  const root = options.root ?? document;
  const body = document.body;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!finePointer.matches || options.enabled === false) {
    return { destroy() {} };
  }

  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "pdl-cursor";
  ring.className = "pdl-cursor-ring";
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");
  body.append(dot, ring);
  body.classList.add("pdl-custom-cursor");

  let x = -100;
  let y = -100;
  let ringX = x;
  let ringY = y;
  let frame = 0;
  let destroyed = false;

  const setTopLayerMode = target => {
    const nativeTopLayer = isInsideOpenTopLayer(target);
    body.classList.toggle("pdl-native-cursor-top-layer", nativeTopLayer);
    if (nativeTopLayer) {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    } else if (dot.parentNode !== body || ring.parentNode !== body) {
      body.append(dot, ring);
    }
    return nativeTopLayer;
  };

  const render = () => {
    if (destroyed) return;
    const follow = reduceMotion.matches ? 1 : 0.22;
    ringX += (x - ringX) * follow;
    ringY += (y - ringY) * follow;
    dot.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    ring.style.transform = `translate3d(${ringX}px,${ringY}px,0) translate(-50%,-50%)`;
    frame = requestAnimationFrame(render);
  };

  const onMove = event => {
    const nativeTopLayer = setTopLayerMode(event.target);
    x = event.clientX;
    y = event.clientY;
    if (!nativeTopLayer) {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    }
  };

  const onOver = event => {
    const nativeTopLayer = setTopLayerMode(event.target);
    ring.classList.toggle(
      "is-hover",
      !nativeTopLayer && Boolean(event.target.closest?.(INTERACTIVE_SELECTOR))
    );
  };

  const onDown = () => dot.classList.add("is-pressed");
  const onUp = () => dot.classList.remove("is-pressed");
  const onLeave = () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  };
  const onDialogClose = event => {
    if (event.target?.matches?.("dialog")) {
      body.classList.remove("pdl-native-cursor-top-layer");
      body.append(dot, ring);
    }
  };
  const onPopoverToggle = event => {
    if (event.newState === "closed") {
      body.classList.remove("pdl-native-cursor-top-layer");
      body.append(dot, ring);
    }
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerover", onOver);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("close", onDialogClose, true);
  root.addEventListener("toggle", onPopoverToggle, true);
  document.documentElement.addEventListener("mouseleave", onLeave);
  frame = requestAnimationFrame(render);

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("close", onDialogClose, true);
      root.removeEventListener("toggle", onPopoverToggle, true);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      dot.remove();
      ring.remove();
      body.classList.remove("pdl-custom-cursor");
      body.classList.remove("pdl-native-cursor-top-layer");
    }
  };
}
