export function initKanban(root = document) {
  const boards = [...root.querySelectorAll("[data-pdl-kanban]")];
  const cleanups = [];

  for (const board of boards) {
    let active = null;
    const cards = [...board.querySelectorAll("[data-pdl-kanban-card]")];
    const columns = [...board.querySelectorAll("[data-pdl-kanban-column]")];

    for (const card of cards) {
      card.draggable = true;
      const start = () => {
        active = card;
        card.setAttribute("aria-grabbed", "true");
      };
      const end = () => {
        card.setAttribute("aria-grabbed", "false");
        active = null;
      };
      card.addEventListener("dragstart", start);
      card.addEventListener("dragend", end);
      cleanups.push(() => {
        card.removeEventListener("dragstart", start);
        card.removeEventListener("dragend", end);
      });
    }

    for (const column of columns) {
      const over = event => event.preventDefault();
      const drop = event => {
        event.preventDefault();
        if (!active) return;
        column.append(active);
        board.dispatchEvent(new CustomEvent("pdl:kanban-move", {
          bubbles: true,
          detail: { cardId: active.dataset.cardId, columnId: column.dataset.columnId }
        }));
      };
      column.addEventListener("dragover", over);
      column.addEventListener("drop", drop);
      cleanups.push(() => {
        column.removeEventListener("dragover", over);
        column.removeEventListener("drop", drop);
      });
    }
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
