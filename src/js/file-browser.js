export function initFileBrowsers(root = document) {
  const browsers = [...root.querySelectorAll("[data-pdl-file-browser]")];
  const cleanups = [];

  for (const browser of browsers) {
    const cards = [...browser.querySelectorAll("[data-pdl-file-card]")];

    for (const card of cards) {
      const select = () => {
        const multi = browser.dataset.pdlMultiSelect === "true";
        if (!multi) {
          for (const peer of cards) peer.dataset.selected = "false";
        }
        card.dataset.selected = String(card.dataset.selected !== "true");
        browser.dispatchEvent(new CustomEvent("pdl:file-selection", {
          bubbles: true,
          detail: {
            selected: cards.filter(item => item.dataset.selected === "true").map(item => item.dataset.fileId).filter(Boolean)
          }
        }));
      };

      card.addEventListener("click", select);
      cleanups.push(() => card.removeEventListener("click", select));
    }

    const viewButtons = [...browser.querySelectorAll("[data-pdl-file-view]")];
    for (const button of viewButtons) {
      const handler = () => {
        const view = button.dataset.pdlFileView;
        browser.dataset.view = view;
        for (const peer of viewButtons) peer.setAttribute("aria-pressed", String(peer === button));
      };
      button.addEventListener("click", handler);
      cleanups.push(() => button.removeEventListener("click", handler));
    }
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
