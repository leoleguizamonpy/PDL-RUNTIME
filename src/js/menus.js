const MENU_ITEMS =
  "[role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox']";

function menuItems(menu) {
  const explicit = [...menu.querySelectorAll(MENU_ITEMS)];
  const items = explicit.length
    ? explicit
    : [...menu.querySelectorAll("button, a[href]")];
  return items.filter(
    item => !item.disabled && item.getClientRects().length > 0 && !item.closest("[hidden]")
  );
}

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

    const setOpen = (open, focus = "first") => {
      if (open) closeAll(trigger);
      trigger.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      if (!open) return;
      const items = menuItems(menu);
      const target = focus === "last" ? items[items.length - 1] : items[0];
      (target ?? menu.querySelector("button, a, [tabindex]:not([tabindex='-1'])"))
        ?.focus({ preventScroll: true });
    };

    const onTrigger = () => {
      setOpen(trigger.getAttribute("aria-expanded") !== "true");
    };

    // Menu-button keyboard pattern: arrows on the trigger open the menu.
    const onTriggerKey = event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true, "first");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true, "last");
      }
    };

    const onMenuKey = event => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.focus();
        return;
      }

      const items = menuItems(menu);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      let next = null;

      if (event.key === "ArrowDown") next = items[(index + 1) % items.length];
      else if (event.key === "ArrowUp") next = items[(index - 1 + items.length) % items.length];
      else if (event.key === "Home") next = items[0];
      else if (event.key === "End") next = items[items.length - 1];

      if (next) {
        event.preventDefault();
        next.focus();
      }
    };

    // A pointer press on a non-focusable part of the menu (a label, the
    // identity header) also blurs the focused item; that must not close it.
    let pointerInside = false;
    const onMenuPointerDown = () => {
      pointerInside = true;
      setTimeout(() => { pointerInside = false; }, 0);
    };

    // Tabbing out of an open menu closes it; otherwise it stays open over the
    // content the focus moved to.
    const onFocusOut = event => {
      if (pointerInside) return;
      const next = event.relatedTarget;
      if (next instanceof Node && (menu.contains(next) || trigger.contains(next))) return;
      if (trigger.getAttribute("aria-expanded") === "true") setOpen(false);
    };

    trigger.addEventListener("click", onTrigger);
    trigger.addEventListener("keydown", onTriggerKey);
    menu.addEventListener("keydown", onMenuKey);
    menu.addEventListener("focusout", onFocusOut);
    menu.addEventListener("pointerdown", onMenuPointerDown);
    cleanups.push(() => {
      trigger.removeEventListener("click", onTrigger);
      trigger.removeEventListener("keydown", onTriggerKey);
      menu.removeEventListener("keydown", onMenuKey);
      menu.removeEventListener("focusout", onFocusOut);
      menu.removeEventListener("pointerdown", onMenuPointerDown);
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
