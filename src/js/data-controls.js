function normalize(value) {
  return String(value ?? "").toLocaleLowerCase().trim();
}

export function initTableControls(root = document) {
  const tables = [...root.querySelectorAll("[data-pdl-table]")];
  const cleanups = [];

  for (const table of tables) {
    const tableId = table.id;
    const rows = () => [...table.tBodies].flatMap(body => [...body.rows]);

    const sortButtons = [...table.querySelectorAll("[data-pdl-sort]")];
    for (const button of sortButtons) {
      const handler = () => {
        const key = button.dataset.pdlSort;
        const index = [...button.closest("tr").cells].indexOf(button.closest("th"));
        const ascending = button.getAttribute("aria-sort") !== "ascending";

        for (const other of sortButtons) other.removeAttribute("aria-sort");
        button.setAttribute("aria-sort", ascending ? "ascending" : "descending");

        for (const body of table.tBodies) {
          const ordered = [...body.rows].sort((a, b) => {
            const av = normalize(a.cells[index]?.dataset.sortValue ?? a.cells[index]?.textContent);
            const bv = normalize(b.cells[index]?.dataset.sortValue ?? b.cells[index]?.textContent);
            return av.localeCompare(bv, undefined, { numeric: true }) * (ascending ? 1 : -1);
          });
          ordered.forEach(row => body.append(row));
        }

        table.dispatchEvent(new CustomEvent("pdl:table-sort", { bubbles: true, detail: { key, direction: ascending ? "ascending" : "descending" } }));
      };

      button.addEventListener("click", handler);
      cleanups.push(() => button.removeEventListener("click", handler));
    }

    if (!tableId) continue;

    const searches = [...root.querySelectorAll(`[data-pdl-search-for="${CSS.escape(tableId)}"]`)];
    for (const input of searches) {
      const filter = () => {
        const query = normalize(input.value);
        for (const row of rows()) {
          row.hidden = query.length > 0 && !normalize(row.textContent).includes(query);
        }
      };
      input.addEventListener("input", filter);
      cleanups.push(() => input.removeEventListener("input", filter));
    }

    const chips = [...root.querySelectorAll(`[data-pdl-filter-for="${CSS.escape(tableId)}"]`)];
    for (const chip of chips) {
      const handler = () => {
        const field = chip.dataset.pdlFilterField;
        const value = normalize(chip.dataset.pdlFilterValue);
        const active = chip.getAttribute("aria-pressed") !== "true";

        for (const peer of chips) {
          if (peer.dataset.pdlFilterField === field) peer.setAttribute("aria-pressed", "false");
        }
        chip.setAttribute("aria-pressed", String(active));

        for (const row of rows()) {
          const matches = normalize(row.dataset[field]) === value;
          row.hidden = active ? !matches : false;
        }
      };
      chip.addEventListener("click", handler);
      cleanups.push(() => chip.removeEventListener("click", handler));
    }
  }

  const clears = [...root.querySelectorAll("[data-pdl-search-clear]")];
  for (const button of clears) {
    const handler = () => {
      const target = document.getElementById(button.dataset.pdlSearchClear);
      if (!target) return;
      target.value = "";
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.focus();
    };
    button.addEventListener("click", handler);
    cleanups.push(() => button.removeEventListener("click", handler));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
