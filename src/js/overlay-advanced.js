function placeFloating(trigger, floating, gap = 8) {
  const rect = trigger.getBoundingClientRect();
  const floatRect = floating.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + floatRect.width > viewportW - gap) left = viewportW - floatRect.width - gap;
  if (top + floatRect.height > viewportH - gap) top = rect.top - floatRect.height - gap;

  floating.style.left = `${Math.max(gap, left)}px`;
  floating.style.top = `${Math.max(gap, top)}px`;
}

export function initAdvancedOverlays(root = document) {
  const cleanups = [];

  const popovers = [...root.querySelectorAll("[data-pdl-popover-open]")];
  for (const trigger of popovers) {
    const target = document.getElementById(trigger.dataset.pdlPopoverOpen);
    if (!target) continue;

    const open = () => {
      target.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => placeFloating(trigger, target));
    };

    const close = () => {
      target.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };

    const toggle = event => {
      event.stopPropagation();
      target.hidden ? open() : close();
    };

    const outside = event => {
      if (!target.contains(event.target) && !trigger.contains(event.target)) close();
    };

    const key = event => {
      if (event.key === "Escape") {
        close();
        trigger.focus();
      }
    };

    trigger.addEventListener("click", toggle);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);

    cleanups.push(() => {
      trigger.removeEventListener("click", toggle);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    });
  }

  const tooltipTriggers = [...root.querySelectorAll("[data-pdl-tooltip]")];
  for (const trigger of tooltipTriggers) {
    const target = document.getElementById(trigger.dataset.pdlTooltip);
    if (!target) continue;

    const show = () => {
      target.hidden = false;
      requestAnimationFrame(() => placeFloating(trigger, target, 6));
    };
    const hide = () => { target.hidden = true; };

    trigger.addEventListener("mouseenter", show);
    trigger.addEventListener("mouseleave", hide);
    trigger.addEventListener("focus", show);
    trigger.addEventListener("blur", hide);

    cleanups.push(() => {
      trigger.removeEventListener("mouseenter", show);
      trigger.removeEventListener("mouseleave", hide);
      trigger.removeEventListener("focus", show);
      trigger.removeEventListener("blur", hide);
    });
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
