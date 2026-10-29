// Matches the off-canvas range in responsive.css.
const OFF_CANVAS_SIDEBAR = "(max-width: 991.98px)";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function firstFocusable(container) {
  return [...container.querySelectorAll(FOCUSABLE)].find(
    element => element.getClientRects().length > 0 && !element.closest("[hidden]")
  );
}

export function initSidebar(root = document) {
  const sidebar = root.querySelector("[data-pdl-sidebar]");
  if (!sidebar) return { open() {}, close() {}, toggle() {}, destroy() {} };

  const toggles = [...root.querySelectorAll("[data-pdl-sidebar-toggle]")];
  const closers = [...root.querySelectorAll("[data-pdl-sidebar-close]")];
  const backdrops = [...root.querySelectorAll("[data-pdl-sidebar-backdrop]")];
  const offCanvas = window.matchMedia?.(OFF_CANVAS_SIDEBAR);
  let returnFocus = null;

  const isOpen = () => sidebar.classList.contains("is-open");

  // While off-canvas and closed the sidebar is invisible: inert keeps its
  // links out of the tab order and the accessibility tree.
  const syncInert = () => {
    sidebar.inert = Boolean(offCanvas?.matches) && !isOpen();
  };

  const setOpen = open => {
    const value = Boolean(open);
    sidebar.classList.toggle("is-open", value);
    for (const control of toggles) {
      control.setAttribute("aria-expanded", String(value));
    }
    for (const backdrop of backdrops) {
      backdrop.hidden = !value;
    }
    syncInert();
  };

  const open = () => {
    if (isOpen()) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    // Move focus into the drawer so keyboard users start where they look.
    if (offCanvas?.matches) firstFocusable(sidebar)?.focus({ preventScroll: true });
  };

  const close = () => {
    if (!isOpen()) return;
    const focusWasInside = sidebar.contains(document.activeElement);
    setOpen(false);
    if (focusWasInside && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  };

  const toggle = () => (isOpen() ? close() : open());

  for (const control of toggles) control.addEventListener("click", toggle);
  for (const control of closers) control.addEventListener("click", close);
  for (const backdrop of backdrops) backdrop.addEventListener("click", close);

  const onKeydown = event => {
    if (event.key === "Escape" && isOpen()) close();
  };
  const onOpen = () => open();
  const onClose = () => close();
  const onViewportChange = () => syncInert();

  document.addEventListener("keydown", onKeydown);
  root.addEventListener?.("pdl:sidebar-open", onOpen);
  root.addEventListener?.("pdl:sidebar-close", onClose);
  offCanvas?.addEventListener?.("change", onViewportChange);

  setOpen(false);

  return {
    open,
    close,
    toggle,
    destroy() {
      for (const control of toggles) control.removeEventListener("click", toggle);
      for (const control of closers) control.removeEventListener("click", close);
      for (const backdrop of backdrops) backdrop.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeydown);
      root.removeEventListener?.("pdl:sidebar-open", onOpen);
      root.removeEventListener?.("pdl:sidebar-close", onClose);
      offCanvas?.removeEventListener?.("change", onViewportChange);
      sidebar.inert = false;
    }
  };
}

export function initTabs(root = document) {
  const tablists = [...root.querySelectorAll("[data-pdl-tabs]")];
  const cleanups = [];

  for (const tablist of tablists) {
    const tabs = [...tablist.querySelectorAll("[role='tab']")];
    const activate = tab => {
      for (const item of tabs) {
        const active = item === tab;
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
        const panelId = item.getAttribute("aria-controls");
        const panel = panelId ? root.getElementById?.(panelId) ?? document.getElementById(panelId) : null;
        if (panel) panel.hidden = !active;
      }
    };

    // Roving tabindex from the start: only the selected tab is in the Tab order.
    const selected = tabs.find(tab => tab.getAttribute("aria-selected") === "true") ?? tabs[0];
    for (const tab of tabs) tab.tabIndex = tab === selected ? 0 : -1;

    const handler = event => {
      const tab = event.target.closest("[role='tab']");
      if (!tab) return;
      activate(tab);
    };

    // Arrow keys move between tabs (wrapping, mirrored right-to-left),
    // Home and End jump to the ends; the moved-to tab is activated.
    const onKeydown = event => {
      const enabled = tabs.filter(tab => !tab.disabled && tab.getAttribute("aria-disabled") !== "true");
      const current = enabled.indexOf(event.target.closest("[role='tab']"));
      if (current < 0) return;
      const rtl = getComputedStyle(tablist).direction === "rtl";
      // Declared orientation wins; otherwise read it from the layout, since
      // a rail is vertical on desktop and a row on phones.
      const declared = tablist.getAttribute("aria-orientation");
      const vertical = declared
        ? declared === "vertical"
        : enabled.length > 1 && Math.abs(enabled[1].getBoundingClientRect().top - enabled[0].getBoundingClientRect().top) > Math.abs(enabled[1].getBoundingClientRect().left - enabled[0].getBoundingClientRect().left);
      const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
      const previous = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
      let index = null;
      if (event.key === next) index = (current + 1) % enabled.length;
      else if (event.key === previous) index = (current - 1 + enabled.length) % enabled.length;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = enabled.length - 1;
      if (index === null) return;
      event.preventDefault();
      activate(enabled[index]);
      enabled[index].focus();
    };

    tablist.addEventListener("click", handler);
    tablist.addEventListener("keydown", onKeydown);
    cleanups.push(() => {
      tablist.removeEventListener("click", handler);
      tablist.removeEventListener("keydown", onKeydown);
    });
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}

export function initDisclosure(root = document) {
  const controls = [...root.querySelectorAll("[data-pdl-disclosure]")];
  const cleanups = [];

  for (const control of controls) {
    const targetId = control.getAttribute("aria-controls");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) continue;

    const handler = () => {
      const expanded = control.getAttribute("aria-expanded") === "true";
      control.setAttribute("aria-expanded", String(!expanded));
      target.hidden = expanded;
    };

    control.addEventListener("click", handler);
    cleanups.push(() => control.removeEventListener("click", handler));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
