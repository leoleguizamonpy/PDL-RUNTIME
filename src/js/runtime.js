export function initSidebar(root = document) {
  const sidebar = root.querySelector("[data-pdl-sidebar]");
  if (!sidebar) return { open() {}, close() {}, toggle() {}, destroy() {} };

  const toggles = [...root.querySelectorAll("[data-pdl-sidebar-toggle]")];
  const closers = [...root.querySelectorAll("[data-pdl-sidebar-close]")];
  const backdrops = [...root.querySelectorAll("[data-pdl-sidebar-backdrop]")];

  const setOpen = open => {
    const value = Boolean(open);
    sidebar.classList.toggle("is-open", value);
    for (const control of toggles) {
      control.setAttribute("aria-expanded", String(value));
    }
    for (const backdrop of backdrops) {
      backdrop.hidden = !value;
    }
  };

  const open = () => setOpen(true);
  const close = () => setOpen(false);
  const toggle = () => setOpen(!sidebar.classList.contains("is-open"));

  for (const control of toggles) control.addEventListener("click", toggle);
  for (const control of closers) control.addEventListener("click", close);
  for (const backdrop of backdrops) backdrop.addEventListener("click", close);

  const onKeydown = event => {
    if (event.key === "Escape") close();
  };
  const onOpen = () => open();
  const onClose = () => close();

  document.addEventListener("keydown", onKeydown);
  root.addEventListener?.("pdl:sidebar-open", onOpen);
  root.addEventListener?.("pdl:sidebar-close", onClose);

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

    const handler = event => {
      const tab = event.target.closest("[role='tab']");
      if (!tab) return;
      activate(tab);
    };

    tablist.addEventListener("click", handler);
    cleanups.push(() => tablist.removeEventListener("click", handler));
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
