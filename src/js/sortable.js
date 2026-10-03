// Sortable lists: reorder items by dragging a handle (mouse, touch or pen)
// or with the arrow keys on it. While dragging, the item follows the
// pointer and the others make room through --pdl-sortable-offset; nothing
// moves in the DOM. On drop, onMove({ from, to, item }) lets the product
// reorder its data and redraw (createSortable), or the list moves the item
// itself and announces it with a pdl:sortable-move event (initSortables).
// Events are delegated to the list, so items may be redrawn between drags.

const ACTIVATION_DISTANCE = 4;
const SCROLL_EDGE = 80;

/**
 * Where the dragged item goes and how far each item shifts. `rects` are the
 * items' { top, bottom } at the start of the drag (same coordinate space as
 * `dy`), `gap` the space between items.
 */
export function sortableLayout({ rects, from, gap = 0, dy }) {
  const self = rects[from];
  const first = rects[0];
  const last = rects[rects.length - 1];
  const offset = Math.max(first.top - self.top, Math.min(last.bottom - self.bottom, dy));
  // The leading edge decides: an item makes room once the dragged one covers
  // half of it, so the ends are reachable whatever the heights.
  const top = self.top + offset;
  const bottom = self.bottom + offset;
  const room = self.bottom - self.top + gap;
  let to = from;
  const offsets = rects.map((rect, index) => {
    if (index === from) return offset;
    const middle = (rect.top + rect.bottom) / 2;
    if (index < from && top < middle) {
      to -= 1;
      return room;
    }
    if (index > from && bottom > middle) {
      to += 1;
      return -room;
    }
    return 0;
  });
  return { to, offsets };
}

function scrollerOf(element) {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

// The click that ends a drag must not reach what is under the pointer.
function swallowNextClick() {
  const block = event => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", block, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", block, { capture: true }), 0);
}

const INTERACTIVE = "a, button, input, select, textarea, label, [contenteditable]";

export function createSortable(list, options = {}) {
  const itemSelector = options.item ?? "[data-pdl-sortable-item]";
  const handleSelector = options.handle ?? "[data-pdl-sortable-handle]";
  // Extra areas a mouse may drag from (touch keeps them for scrolling).
  const mouseHandleSelector = options.mouseHandle ?? null;
  const onMove = options.onMove ?? (() => {});
  let drag = null;

  const items = () => [...list.children].filter(child => child.matches(itemSelector));

  const layout = () => {
    const viewport = drag.scroller.scrollTop;
    const result = sortableLayout({
      rects: drag.rects,
      from: drag.from,
      gap: drag.gap,
      dy: drag.clientY + viewport - drag.startY,
    });
    drag.to = result.to;
    drag.all.forEach((item, index) => item.style.setProperty("--pdl-sortable-offset", `${result.offsets[index]}px`));
  };

  const autoscroll = () => {
    if (!drag?.active) return;
    const { scroller, clientY } = drag;
    const page = scroller === document.scrollingElement || scroller === document.documentElement;
    const top = page ? 0 : scroller.getBoundingClientRect().top;
    const bottom = page ? window.innerHeight : scroller.getBoundingClientRect().bottom;
    // Scrolls only while there is more of the list to reveal that way.
    const span = list.getBoundingClientRect();
    const speed =
      clientY < top + SCROLL_EDGE && span.top < top
        ? -Math.ceil((top + SCROLL_EDGE - clientY) / 6)
        : clientY > bottom - SCROLL_EDGE && span.bottom > bottom
          ? Math.ceil((clientY - (bottom - SCROLL_EDGE)) / 6)
          : 0;
    if (speed) {
      scroller.scrollTop += speed;
      layout();
    }
    drag.frame = requestAnimationFrame(autoscroll);
  };

  const finish = commit => {
    if (!drag) return;
    const { all, item, from, to, active, pointerId, frame } = drag;
    drag = null;
    cancelAnimationFrame(frame);
    for (const each of all) each.style.removeProperty("--pdl-sortable-offset");
    item.removeAttribute("data-pdl-sortable-dragging");
    list.removeAttribute("data-pdl-sortable-active");
    if (list.hasPointerCapture?.(pointerId)) list.releasePointerCapture(pointerId);
    if (!active) return;
    swallowNextClick();
    if (commit && from !== to) onMove({ from, to, item });
  };

  const onPointerDown = event => {
    if (drag || event.button !== 0 || !event.isPrimary) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    let grip = target.closest(handleSelector);
    if (!grip && mouseHandleSelector && event.pointerType === "mouse" && !target.closest(INTERACTIVE)) {
      grip = target.closest(mouseHandleSelector);
    }
    const item = grip?.closest(itemSelector);
    if (!grip || !item || item.parentElement !== list) return;

    const all = items();
    const scroller = scrollerOf(list);
    const viewport = scroller.scrollTop;
    const rects = all.map(each => {
      const rect = each.getBoundingClientRect();
      return { top: rect.top + viewport, bottom: rect.bottom + viewport };
    });
    // No text selection or focus change while a drag may start.
    event.preventDefault();
    drag = {
      pointerId: event.pointerId,
      item,
      all,
      from: all.indexOf(item),
      to: all.indexOf(item),
      rects,
      gap: rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0,
      scroller,
      startY: event.clientY + viewport,
      startClientY: event.clientY,
      clientY: event.clientY,
      active: false,
      frame: 0,
    };
  };

  const onPointerMove = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.clientY = event.clientY;
    if (!drag.active) {
      if (Math.abs(event.clientY - drag.startClientY) < ACTIVATION_DISTANCE) return;
      drag.active = true;
      // Captured only once dragging: a plain click keeps its own target.
      try {
        list.setPointerCapture(event.pointerId);
      } catch {
        // Not a live pointer (synthetic events): moves still bubble here.
      }
      list.setAttribute("data-pdl-sortable-active", "");
      drag.item.setAttribute("data-pdl-sortable-dragging", "");
      drag.frame = requestAnimationFrame(autoscroll);
    }
    layout();
  };

  const onPointerUp = event => {
    if (drag && event.pointerId === drag.pointerId) finish(true);
  };

  const onPointerCancel = event => {
    if (drag && event.pointerId === drag.pointerId) finish(false);
  };

  // Arrow keys on a handle move its item one place; Escape cancels a drag.
  const onKeydown = event => {
    if (drag) {
      if (event.key === "Escape") finish(false);
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const grip = event.target instanceof Element ? event.target.closest(handleSelector) : null;
    const item = grip?.closest(itemSelector);
    if (!grip || !item || item.parentElement !== list) return;
    event.preventDefault();
    const all = items();
    const from = all.indexOf(item);
    const to = from + (event.key === "ArrowUp" ? -1 : 1);
    if (to < 0 || to >= all.length) return;
    onMove({ from, to, item, keyboard: true });
  };

  list.addEventListener("pointerdown", onPointerDown);
  list.addEventListener("pointermove", onPointerMove);
  list.addEventListener("pointerup", onPointerUp);
  list.addEventListener("pointercancel", onPointerCancel);
  list.addEventListener("lostpointercapture", onPointerCancel);
  document.addEventListener("keydown", onKeydown);

  return {
    destroy() {
      finish(false);
      list.removeEventListener("pointerdown", onPointerDown);
      list.removeEventListener("pointermove", onPointerMove);
      list.removeEventListener("pointerup", onPointerUp);
      list.removeEventListener("pointercancel", onPointerCancel);
      list.removeEventListener("lostpointercapture", onPointerCancel);
      document.removeEventListener("keydown", onKeydown);
    },
  };
}

/**
 * Declarative lists ([data-pdl-sortable]): the list moves the item itself,
 * keeps the focus on its handle and dispatches pdl:sortable-move.
 */
export function initSortables(root = document) {
  const instances = [...root.querySelectorAll("[data-pdl-sortable]")].map(list =>
    createSortable(list, {
      onMove({ from, to, item, keyboard }) {
        const items = [...list.children].filter(child => child.matches("[data-pdl-sortable-item]"));
        const reference = to > from ? items[to].nextElementSibling : items[to];
        list.insertBefore(item, reference);
        if (keyboard) item.querySelector("[data-pdl-sortable-handle]")?.focus();
        list.dispatchEvent(new CustomEvent("pdl:sortable-move", { bubbles: true, detail: { from, to, item } }));
      },
    }),
  );
  return { destroy() { instances.forEach(instance => instance.destroy()); } };
}
