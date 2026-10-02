export function initOverlays(root = document) {
  const cleanups = [];
  const openers = [...root.querySelectorAll("[data-pdl-dialog-open]")];

  for (const opener of openers) {
    const id = opener.dataset.pdlDialogOpen;
    const dialog = document.getElementById(id);
    if (!dialog) continue;

    const open = () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else {
        dialog.hidden = false;
        dialog.setAttribute("open", "");
      }
    };

    opener.addEventListener("click", open);
    cleanups.push(() => opener.removeEventListener("click", open));
  }

  const closers = [...root.querySelectorAll("[data-pdl-dialog-close]")];
  for (const closer of closers) {
    const close = () => {
      const dialog = closer.closest("dialog, [role='dialog']");
      if (!dialog) return;
      if (typeof dialog.close === "function") dialog.close();
      else {
        dialog.hidden = true;
        dialog.removeAttribute("open");
      }
    };

    closer.addEventListener("click", close);
    cleanups.push(() => closer.removeEventListener("click", close));
  }

  const dialogs = [...root.querySelectorAll("dialog.pdl-dialog")];
  for (const dialog of dialogs) {
    const onClick = event => {
      if (event.target === dialog && dialog.dataset.pdlDismissBackdrop === "true") dialog.close();
    };
    dialog.addEventListener("click", onClick);
    cleanups.push(() => dialog.removeEventListener("click", onClick));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
