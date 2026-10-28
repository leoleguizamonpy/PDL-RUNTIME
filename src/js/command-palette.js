// Command palette: a modal dialog with a search field (role="combobox") over
// a listbox of commands. Opened by [data-pdl-command-open="<id>"] and by a
// shortcut (data-pdl-command-shortcut, default "k", with Ctrl or ⌘).
// Arrows move the active command, Enter runs it, Escape closes. A command
// with data-href navigates; any other dispatches `pdl:command` on the
// palette with { command, label } and closes.

const normalize = text => text.toLocaleLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

// Apple keyboards say ⌘K; everyone else Ctrl K. Markup ships "Ctrl K"
// (right without JS); [data-pdl-command-key] is relabelled on Apple.
const isApple = () => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? "");

export function initCommandPalettes(root = document) {
  const cleanups = [];
  const palettes = [...root.querySelectorAll("[data-pdl-command-palette]")];

  for (const palette of palettes) {
    const input = palette.querySelector("[role='combobox']");
    const list = palette.querySelector("[role='listbox']");
    const items = [...palette.querySelectorAll("[role='option']")];
    const groups = [...palette.querySelectorAll(".pdl-command-palette__group")];
    const empty = palette.querySelector(".pdl-command-palette__empty");
    if (!input || !list) continue;

    let active = -1;
    let opener = null;
    const enabled = () => items.filter(item => !item.hidden && item.getAttribute("aria-disabled") !== "true");

    const setActive = index => {
      const candidates = enabled();
      active = candidates.length ? (index + candidates.length) % candidates.length : -1;
      for (const item of items) {
        item.classList.remove("is-active");
        item.setAttribute("aria-selected", "false");
      }
      const current = candidates[active];
      if (current) {
        current.classList.add("is-active");
        current.setAttribute("aria-selected", "true");
        input.setAttribute("aria-activedescendant", current.id);
        current.scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    };

    const filter = () => {
      const query = normalize(input.value);
      for (const item of items) {
        const text = normalize(`${item.textContent} ${item.dataset.keywords ?? ""}`);
        item.hidden = query.length > 0 && !query.split(/\s+/).every(word => text.includes(word));
      }
      for (const group of groups) group.hidden = !group.querySelector("[role='option']:not([hidden])");
      const none = !items.some(item => !item.hidden);
      if (empty) empty.hidden = !none;
      input.setAttribute("aria-expanded", String(!none));
      setActive(0);
    };

    const open = from => {
      if (palette.open) return;
      opener = from ?? document.activeElement;
      input.value = "";
      filter();
      if (typeof palette.showModal === "function") palette.showModal();
      else palette.setAttribute("open", "");
      input.focus();
    };

    const close = () => {
      if (typeof palette.close === "function" && palette.open) palette.close();
      else palette.removeAttribute("open");
    };

    const run = item => {
      if (!item || item.hidden || item.getAttribute("aria-disabled") === "true") return;
      const detail = { command: item.dataset.command ?? item.id, label: item.querySelector(".pdl-command-palette__label")?.textContent.trim() ?? item.textContent.trim() };
      close();
      if (item.dataset.href) window.location.assign(item.dataset.href);
      else palette.dispatchEvent(new CustomEvent("pdl:command", { bubbles: true, detail }));
    };

    const onKeydown = event => {
      if (event.key === "ArrowDown") { event.preventDefault(); setActive(active + 1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); setActive(active - 1); }
      else if (event.key === "Home" && event.ctrlKey) { event.preventDefault(); setActive(0); }
      else if (event.key === "End" && event.ctrlKey) { event.preventDefault(); setActive(-1); }
      else if (event.key === "Enter") { event.preventDefault(); run(enabled()[active]); }
    };

    const onClick = event => {
      if (event.target === palette) { close(); return; }
      const item = event.target.closest("[role='option']");
      if (item && palette.contains(item)) run(item);
    };

    const onMove = event => {
      const item = event.target.closest("[role='option']");
      const index = enabled().indexOf(item);
      if (index >= 0 && index !== active) setActive(index);
    };

    const onClose = () => {
      if (opener?.isConnected && typeof opener.focus === "function") opener.focus();
      opener = null;
    };

    const key = (palette.dataset.pdlCommandShortcut ?? "k").toLowerCase();
    const onShortcut = event => {
      if (!key || !(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== key) return;
      event.preventDefault();
      palette.open ? close() : open();
    };

    input.addEventListener("input", filter);
    input.addEventListener("keydown", onKeydown);
    palette.addEventListener("click", onClick);
    list.addEventListener("pointermove", onMove);
    palette.addEventListener("close", onClose);
    document.addEventListener("keydown", onShortcut);
    cleanups.push(() => {
      input.removeEventListener("input", filter);
      input.removeEventListener("keydown", onKeydown);
      palette.removeEventListener("click", onClick);
      list.removeEventListener("pointermove", onMove);
      palette.removeEventListener("close", onClose);
      document.removeEventListener("keydown", onShortcut);
    });

    for (const label of root.querySelectorAll(`[data-pdl-command-open="${palette.id}"] [data-pdl-command-key]`)) {
      label.textContent = isApple() ? `⌘${key.toUpperCase()}` : `Ctrl ${key.toUpperCase()}`;
    }

    for (const trigger of root.querySelectorAll(`[data-pdl-command-open="${palette.id}"]`)) {
      const onOpen = () => open(trigger);
      trigger.addEventListener("click", onOpen);
      cleanups.push(() => trigger.removeEventListener("click", onOpen));
    }

    palette.pdlCommandPalette = { open, close };
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
