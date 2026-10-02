function selectedRows(grid) {
  return [...grid.querySelectorAll("tbody tr")].filter(row => row.dataset.selected === "true");
}

function syncSelection(grid) {
  const rows = [...grid.querySelectorAll("tbody tr")];
  const selected = selectedRows(grid);
  grid.dataset.hasSelection = String(selected.length > 0);

  const count = grid.querySelector("[data-pdl-selection-count]");
  if (count) count.textContent = String(selected.length);

  const master = grid.querySelector("[data-pdl-select-all]");
  if (master) {
    master.checked = rows.length > 0 && selected.length === rows.length;
    master.indeterminate = selected.length > 0 && selected.length < rows.length;
  }

  grid.dispatchEvent(new CustomEvent("pdl:grid-selection", {
    bubbles: true,
    detail: { selected: selected.map(row => row.dataset.rowId).filter(Boolean) }
  }));
}

export function initDataGrids(root = document) {
  const grids = [...root.querySelectorAll("[data-pdl-data-grid]")];
  const cleanups = [];

  for (const grid of grids) {
    const rowChecks = [...grid.querySelectorAll("[data-pdl-row-select]")];
    for (const checkbox of rowChecks) {
      const handler = () => {
        const row = checkbox.closest("tr");
        if (!row) return;
        row.dataset.selected = String(checkbox.checked);
        syncSelection(grid);
      };
      checkbox.addEventListener("change", handler);
      cleanups.push(() => checkbox.removeEventListener("change", handler));
    }

    const master = grid.querySelector("[data-pdl-select-all]");
    if (master) {
      const handler = () => {
        for (const checkbox of rowChecks) {
          checkbox.checked = master.checked;
          const row = checkbox.closest("tr");
          if (row) row.dataset.selected = String(master.checked);
        }
        syncSelection(grid);
      };
      master.addEventListener("change", handler);
      cleanups.push(() => master.removeEventListener("change", handler));
    }

    const columnToggles = [...grid.querySelectorAll("[data-pdl-column-toggle]")];
    for (const toggle of columnToggles) {
      const handler = () => {
        const key = toggle.dataset.pdlColumnToggle;
        const visible = toggle.checked;
        for (const cell of grid.querySelectorAll(`[data-pdl-column="${CSS.escape(key)}"]`)) {
          cell.hidden = !visible;
        }
        grid.dispatchEvent(new CustomEvent("pdl:grid-column-visibility", {
          bubbles: true,
          detail: { key, visible }
        }));
      };
      toggle.addEventListener("change", handler);
      cleanups.push(() => toggle.removeEventListener("change", handler));
    }

    const clear = grid.querySelector("[data-pdl-clear-selection]");
    if (clear) {
      const handler = () => {
        for (const checkbox of rowChecks) checkbox.checked = false;
        for (const row of grid.querySelectorAll("tbody tr")) row.dataset.selected = "false";
        syncSelection(grid);
      };
      clear.addEventListener("click", handler);
      cleanups.push(() => clear.removeEventListener("click", handler));
    }

    syncSelection(grid);
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
