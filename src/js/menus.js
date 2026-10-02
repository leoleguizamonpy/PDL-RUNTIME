export function initMenus(root = document) {
  const triggers = [...root.querySelectorAll("[data-pdl-menu-trigger]")];
  const cleanups = [];

  const closeAll = except => {
    for (const trigger of triggers) {
      if (trigger === except) continue;
      const id = trigger.getAttribute("aria-controls");
      const menu = id ? document.getElementById(id) : null;
      if (!menu) continue;
      trigger.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    }
  };

  for (const trigger of triggers) {
    const id = trigger.getAttribute("aria-controls");
    const menu = id ? document.getElementById(id) : null;
    if (!menu) continue;

    const onTrigger = () => {
      const willOpen = trigger.getAttribute("aria-expanded") !== "true";
      closeAll(trigger);
      trigger.setAttribute("aria-expanded", String(willOpen));
      menu.hidden = !willOpen;
      if (willOpen) {
        const first = menu.querySelector("button, a, [tabindex]:not([tabindex='-1'])");
        first?.focus({ preventScroll: true });
      }
    };

    const onMenuKey = event => {
      if (event.key === "Escape") {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    };

    trigger.addEventListener("click", onTrigger);
    menu.addEventListener("keydown", onMenuKey);
    cleanups.push(() => {
      trigger.removeEventListener("click", onTrigger);
      menu.removeEventListener("keydown", onMenuKey);
    });
  }

  const onDocument = event => {
    if (event.target.closest("[data-pdl-menu-trigger], .pdl-menu")) return;
    closeAll();
  };

  document.addEventListener("pointerdown", onDocument);
  cleanups.push(() => document.removeEventListener("pointerdown", onDocument));

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
