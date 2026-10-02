export function initFormFlows(root = document) {
  const flows = [...root.querySelectorAll("[data-pdl-form-flow]")];
  const cleanups = [];

  for (const flow of flows) {
    const steps = [...flow.querySelectorAll("[data-pdl-form-step]")];
    const panels = [...flow.querySelectorAll("[data-pdl-form-panel]")];
    const summary = flow.querySelector("[data-pdl-form-summary]");

    const activate = id => {
      for (const step of steps) {
        const active = step.dataset.pdlFormStep === id;
        if (active) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      }

      for (const panel of panels) {
        panel.hidden = panel.dataset.pdlFormPanel !== id;
      }

      const activeStep = steps.find(step => step.dataset.pdlFormStep === id);
      if (summary && activeStep) {
        const label = activeStep.querySelector(".pdl-form-step__title")?.textContent?.trim() || id;
        summary.textContent = label;
      }

      flow.dispatchEvent(new CustomEvent("pdl:form-step-change", {
        bubbles: true,
        detail: { step: id }
      }));
    };

    for (const step of steps) {
      const handler = () => activate(step.dataset.pdlFormStep);
      step.addEventListener("click", handler);
      cleanups.push(() => step.removeEventListener("click", handler));
    }

    for (const control of flow.querySelectorAll("[data-pdl-form-next], [data-pdl-form-prev]")) {
      const handler = () => {
        const current = steps.findIndex(step => step.hasAttribute("aria-current"));
        const delta = control.hasAttribute("data-pdl-form-next") ? 1 : -1;
        const next = Math.max(0, Math.min(steps.length - 1, current + delta));
        if (steps[next]) activate(steps[next].dataset.pdlFormStep);
      };
      control.addEventListener("click", handler);
      cleanups.push(() => control.removeEventListener("click", handler));
    }

    const current = steps.find(step => step.hasAttribute("aria-current")) ?? steps[0];
    if (current) activate(current.dataset.pdlFormStep);
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
