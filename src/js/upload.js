export function initUploadZones(root = document) {
  const zones = [...root.querySelectorAll("[data-pdl-dropzone]")];
  const cleanups = [];

  for (const zone of zones) {
    const input = zone.querySelector("input[type='file']");
    if (!input) continue;

    const open = event => {
      if (event.target === input) return;
      input.click();
    };

    const keydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    };

    const enter = event => {
      event.preventDefault();
      zone.classList.add("is-dragging");
    };

    const leave = event => {
      event.preventDefault();
      zone.classList.remove("is-dragging");
    };

    const drop = event => {
      event.preventDefault();
      zone.classList.remove("is-dragging");
      if (!event.dataTransfer?.files?.length) return;
      try {
        input.files = event.dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {
        // Browser may forbid assigning FileList. The native picker remains the fallback.
      }
    };

    zone.addEventListener("click", open);
    zone.addEventListener("keydown", keydown);
    zone.addEventListener("dragenter", enter);
    zone.addEventListener("dragover", enter);
    zone.addEventListener("dragleave", leave);
    zone.addEventListener("drop", drop);

    cleanups.push(() => {
      zone.removeEventListener("click", open);
      zone.removeEventListener("keydown", keydown);
      zone.removeEventListener("dragenter", enter);
      zone.removeEventListener("dragover", enter);
      zone.removeEventListener("dragleave", leave);
      zone.removeEventListener("drop", drop);
    });
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
