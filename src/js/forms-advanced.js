function targetById(root, id) {
  if (!id) return null;
  return root.querySelector?.(`#${CSS.escape(id)}`) ?? document.getElementById(id);
}

export function initSegmented(root = document) {
  const groups = [...root.querySelectorAll("[data-pdl-segmented]")];
  const cleanups = [];

  for (const group of groups) {
    const items = [...group.querySelectorAll("[data-pdl-segment]")];
    for (const item of items) {
      const select = () => {
        for (const peer of items) peer.setAttribute("aria-pressed", String(peer === item));
        group.dispatchEvent(new CustomEvent("pdl:segment-change", {
          bubbles: true,
          detail: { value: item.dataset.pdlSegment }
        }));
      };
      item.addEventListener("click", select);
      cleanups.push(() => item.removeEventListener("click", select));
    }
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}

export function initRanges(root = document) {
  const ranges = [...root.querySelectorAll("[data-pdl-range]")];
  const cleanups = [];

  for (const range of ranges) {
    const output = targetById(root, range.dataset.pdlRange);
    const sync = () => {
      if (output) output.textContent = range.value;
    };
    sync();
    range.addEventListener("input", sync);
    cleanups.push(() => range.removeEventListener("input", sync));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}

export function initComboboxes(root = document) {
  const boxes = [...root.querySelectorAll("[data-pdl-combobox]")];
  const cleanups = [];

  for (const box of boxes) {
    const input = box.querySelector("[role='combobox']");
    const list = box.querySelector("[role='listbox']");
    const options = [...box.querySelectorAll("[role='option']")];
    if (!input || !list) continue;

    let active = -1;

    const visible = () => options.filter(option => !option.hidden);

    const renderActive = index => {
      const candidates = visible();
      active = candidates.length ? Math.max(0, Math.min(index, candidates.length - 1)) : -1;
      for (const option of options) option.classList.remove("is-active");
      if (active >= 0) candidates[active].classList.add("is-active");
    };

    const open = () => {
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };

    const close = () => {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      renderActive(-1);
    };

    const select = option => {
      input.value = option.dataset.value ?? option.textContent.trim();
      for (const peer of options) peer.setAttribute("aria-selected", String(peer === option));
      close();
      input.dispatchEvent(new CustomEvent("pdl:combobox-change", {
        bubbles: true,
        detail: { value: input.value }
      }));
    };

    const filter = () => {
      const query = input.value.toLocaleLowerCase().trim();
      for (const option of options) {
        option.hidden = query.length > 0 && !option.textContent.toLocaleLowerCase().includes(query);
      }
      open();
      renderActive(0);
    };

    const onKeydown = event => {
      const candidates = visible();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        open();
        renderActive(active < 0 ? 0 : active + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        open();
        renderActive(active < 0 ? candidates.length - 1 : active - 1);
      } else if (event.key === "Enter" && active >= 0) {
        event.preventDefault();
        select(candidates[active]);
      } else if (event.key === "Escape") {
        close();
      }
    };

    input.addEventListener("focus", open);
    input.addEventListener("input", filter);
    input.addEventListener("keydown", onKeydown);
    cleanups.push(() => {
      input.removeEventListener("focus", open);
      input.removeEventListener("input", filter);
      input.removeEventListener("keydown", onKeydown);
    });

    for (const option of options) {
      const choose = () => select(option);
      option.addEventListener("pointerdown", choose);
      cleanups.push(() => option.removeEventListener("pointerdown", choose));
    }

    const outside = event => {
      if (!box.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", outside);
    cleanups.push(() => document.removeEventListener("pointerdown", outside));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}

export function initTagInputs(root = document) {
  const widgets = [...root.querySelectorAll("[data-pdl-tags]")];
  const cleanups = [];

  for (const widget of widgets) {
    const input = widget.querySelector("[data-pdl-tag-control]");
    const list = widget.querySelector("[data-pdl-tag-list]");
    if (!input || !list) continue;

    const values = new Set(
      [...list.querySelectorAll("[data-pdl-tag]")].map(tag => tag.dataset.pdlTag)
    );

    const createTag = raw => {
      const value = raw.trim();
      if (!value || values.has(value)) return;
      values.add(value);

      const tag = document.createElement("span");
      tag.className = "pdl-tag";
      tag.dataset.pdlTag = value;
      tag.innerHTML = `<span></span><button class="pdl-tag__remove" type="button" aria-label="Eliminar ${value}">×</button>`;
      tag.querySelector("span").textContent = value;
      list.append(tag);
    };

    const onKey = event => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        createTag(input.value.replace(/,$/, ""));
        input.value = "";
      } else if (event.key === "Backspace" && !input.value) {
        const last = list.querySelector("[data-pdl-tag]:last-child");
        if (last) {
          values.delete(last.dataset.pdlTag);
          last.remove();
        }
      }
    };

    const remove = event => {
      const button = event.target.closest(".pdl-tag__remove");
      if (!button) return;
      const tag = button.closest("[data-pdl-tag]");
      if (!tag) return;
      values.delete(tag.dataset.pdlTag);
      tag.remove();
      input.focus();
    };

    input.addEventListener("keydown", onKey);
    list.addEventListener("click", remove);
    cleanups.push(() => {
      input.removeEventListener("keydown", onKey);
      list.removeEventListener("click", remove);
    });
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}

export function initAdvancedForms(root = document) {
  const instances = [
    initSegmented(root),
    initRanges(root),
    initComboboxes(root),
    initTagInputs(root)
  ];

  return {
    destroy() {
      for (const instance of instances.reverse()) instance.destroy?.();
    }
  };
}
