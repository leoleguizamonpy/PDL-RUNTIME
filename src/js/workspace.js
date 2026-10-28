export function initResizableWorkspaces(root = document) {
  const workspaces = [...root.querySelectorAll("[data-pdl-workspace]")];
  const cleanups = [];

  for (const workspace of workspaces) {
    const resizers = [...workspace.querySelectorAll("[data-pdl-resizer]")];

    for (const handle of resizers) {
      // "left" is the first pane (inline start); right-to-left draws it on
      // the right, so pointer and arrow math use the side it is drawn on.
      const side = handle.dataset.pdlResizer;
      const atLeft = () => (side === "left") !== (getComputedStyle(workspace).direction === "rtl");
      const [min, max, property] = side === "left" ? [180, 420, "--pdl-left-pane"] : [220, 480, "--pdl-right-pane"];
      const pane = () => {
        const set = parseFloat(workspace.style.getPropertyValue(property));
        if (!Number.isNaN(set)) return set;
        const cell = side === "left" ? workspace.firstElementChild : workspace.lastElementChild;
        return Math.round(cell?.getBoundingClientRect().width || min);
      };
      // A separator that takes focus states its value (WAI-ARIA window splitter).
      const announce = px => {
        handle.setAttribute("aria-valuemin", String(min));
        handle.setAttribute("aria-valuemax", String(max));
        handle.setAttribute("aria-valuenow", String(Math.round(px)));
        if (!handle.hasAttribute("aria-label")) handle.setAttribute("aria-label", atLeft() ? "Ancho del panel izquierdo" : "Ancho del panel derecho");
      };
      const resize = px => {
        const clamped = Math.max(min, Math.min(max, px));
        workspace.style.setProperty(property, `${clamped}px`);
        announce(clamped);
      };
      announce(Math.max(min, Math.min(max, pane())));

      // Arrows move the edge 16px (64px with Shift); Home/End jump to the limits.
      const key = event => {
        const step = event.shiftKey ? 64 : 16;
        const grow = atLeft() ? 1 : -1;
        const delta = { ArrowLeft: -step * grow, ArrowRight: step * grow }[event.key];
        if (delta !== undefined) resize(pane() + delta);
        else if (event.key === "Home") resize(min);
        else if (event.key === "End") resize(max);
        else return;
        event.preventDefault();
        workspace.dispatchEvent(new CustomEvent("pdl:workspace-resize", { bubbles: true }));
      };
      handle.addEventListener("keydown", key);
      cleanups.push(() => handle.removeEventListener("keydown", key));

      const down = event => {
        event.preventDefault();
        handle.setPointerCapture?.(event.pointerId);

        const move = moveEvent => {
          const rect = workspace.getBoundingClientRect();
          resize(atLeft() ? moveEvent.clientX - rect.left : rect.right - moveEvent.clientX);
        };

        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          workspace.dispatchEvent(new CustomEvent("pdl:workspace-resize", { bubbles: true }));
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up, { once: true });
      };

      handle.addEventListener("pointerdown", down);
      cleanups.push(() => handle.removeEventListener("pointerdown", down));
    }
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
