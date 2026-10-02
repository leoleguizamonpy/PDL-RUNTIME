export function initResizableWorkspaces(root = document) {
  const workspaces = [...root.querySelectorAll("[data-pdl-workspace]")];
  const cleanups = [];

  for (const workspace of workspaces) {
    const resizers = [...workspace.querySelectorAll("[data-pdl-resizer]")];

    for (const handle of resizers) {
      const side = handle.dataset.pdlResizer;
      const down = event => {
        event.preventDefault();
        handle.setPointerCapture?.(event.pointerId);

        const move = moveEvent => {
          const rect = workspace.getBoundingClientRect();
          if (side === "left") {
            const px = Math.max(180, Math.min(420, moveEvent.clientX - rect.left));
            workspace.style.setProperty("--pdl-left-pane", `${px}px`);
          } else if (side === "right") {
            const px = Math.max(220, Math.min(480, rect.right - moveEvent.clientX));
            workspace.style.setProperty("--pdl-right-pane", `${px}px`);
          }
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
