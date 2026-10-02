let feedbackSequence = 0;

function ensureRegion(root = document) {
  let region = root.querySelector?.("[data-pdl-toast-region]");
  if (region) return region;

  region = document.createElement("div");
  region.className = "pdl-toast-region";
  region.dataset.pdlToastRegion = "";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "false");
  if (supportsPopover(region)) region.setAttribute("popover", "manual");
  (root.body ?? document.body).append(region);
  showInTopLayer(region);
  return region;
}

function supportsPopover(el) {
  return typeof el.showPopover === "function" && typeof el.hidePopover === "function";
}

function showInTopLayer(region) {
  if (!supportsPopover(region) || region.matches(":popover-open")) return;
  try { region.showPopover(); } catch { /* not connected or unsupported: fall back to z-index */ }
}

/*
 * The top layer is a stack: a modal <dialog> opened after the region sits above it.
 * When a modal is open, re-raise the region (before appending the toast, in the same
 * task, so the live region is never exposed as hidden) to keep toasts on top.
 */
function raiseAboveModals(region) {
  if (!supportsPopover(region)) return;
  if (!region.matches(":popover-open") || !document.querySelector("dialog:modal")) {
    return showInTopLayer(region);
  }
  try { region.hidePopover(); region.showPopover(); } catch { /* keep current stacking */ }
}

function makeCloseIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  const a = document.createElementNS(ns, "path");
  a.setAttribute("d", "M6 6l12 12");
  const b = document.createElementNS(ns, "path");
  b.setAttribute("d", "M18 6 6 18");
  svg.append(a, b);
  return svg;
}

function feedbackSymbol(state = "info") {
  const symbol = document.createElement("span");
  symbol.className = "pdl-feedback-symbol";
  symbol.dataset.state = state;
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = state === "success"
    ? "✓"
    : state === "warning"
      ? "!"
      : state === "danger"
        ? "×"
        : "i";
  return symbol;
}

export function createToast({ title, message = "", duration = 5000, state = "info" } = {}, root = document) {
  const region = ensureRegion(root);
  raiseAboveModals(region);
  const toast = document.createElement("div");
  toast.className = "pdl-toast";
  toast.dataset.state = state;
  toast.setAttribute("role", state === "danger" ? "alert" : "status");

  const content = document.createElement("div");
  content.className = "pdl-toast__content";

  const strong = document.createElement("strong");
  strong.className = "pdl-toast__title";
  strong.textContent = title ?? "Notificación";
  content.append(strong);

  if (message) {
    const copy = document.createElement("p");
    copy.className = "pdl-toast__copy";
    copy.textContent = message;
    content.append(copy);
  }

  const close = document.createElement("button");
  close.className = "pdl-icon-button pdl-icon-button--ghost pdl-icon-button--sm pdl-toast__close";
  close.type = "button";
  close.setAttribute("aria-label", "Cerrar notificación");
  close.append(makeCloseIcon());

  const remove = () => toast.remove();
  close.addEventListener("click", remove);

  toast.append(feedbackSymbol(state), content, close);
  region.append(toast);

  if (duration > 0) window.setTimeout(remove, duration);
  return { element: toast, close: remove };
}

export function createResponseDialog({
  title = "Atención",
  message = "",
  state = "info",
  acknowledgeLabel = "Entendido",
  dismissible = true
} = {}, root = document) {
  feedbackSequence += 1;
  const id = `pdl-response-${feedbackSequence}`;
  const dialog = document.createElement("dialog");
  dialog.className = "pdl-dialog pdl-response-dialog";
  dialog.dataset.state = state;
  dialog.setAttribute("aria-labelledby", `${id}-title`);

  const header = document.createElement("header");
  header.className = "pdl-dialog__header";

  const eyebrow = document.createElement("span");
  eyebrow.className = "pdl-eyebrow";
  eyebrow.textContent = state === "warning" ? "Advertencia" : state === "danger" ? "Requiere atención" : "Estado";
  header.append(eyebrow);

  if (dismissible) {
    const closeIcon = document.createElement("button");
    closeIcon.className = "pdl-icon-button pdl-icon-button--ghost";
    closeIcon.type = "button";
    closeIcon.setAttribute("aria-label", "Cerrar");
    closeIcon.append(makeCloseIcon());
    closeIcon.addEventListener("click", () => dialog.close());
    header.append(closeIcon);
  }

  const body = document.createElement("div");
  body.className = "pdl-dialog__body pdl-response-dialog__body";

  const copy = document.createElement("div");
  copy.className = "pdl-response-dialog__copy";

  const heading = document.createElement("h2");
  heading.id = `${id}-title`;
  heading.textContent = title;
  copy.append(heading);

  if (message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    copy.append(paragraph);
  }

  body.append(feedbackSymbol(state), copy);

  const footer = document.createElement("footer");
  footer.className = "pdl-dialog__footer";
  const acknowledge = document.createElement("button");
  acknowledge.className = "pdl-button pdl-button--primary";
  acknowledge.type = "button";
  acknowledge.textContent = acknowledgeLabel;
  acknowledge.addEventListener("click", () => dialog.close());
  footer.append(acknowledge);

  dialog.append(header, body, footer);
  (root.body ?? document.body).append(dialog);

  const cleanup = () => dialog.remove();
  dialog.addEventListener("close", cleanup, { once: true });

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");

  return { element: dialog, close: () => dialog.close?.() };
}

export function showFeedback(options = {}, root = document) {
  const mode = options.mode ?? "auto";
  const resolvedMode = mode === "auto"
    ? (options.requiresAcknowledgement === true ? "modal" : "toast")
    : mode;

  if (resolvedMode === "modal") return createResponseDialog(options, root);
  return createToast(options, root);
}

export function initNotifications(root = document) {
  const cleanups = [];

  const triggers = [...root.querySelectorAll("[data-pdl-toast]")];
  for (const trigger of triggers) {
    const show = () => createToast({
      title: trigger.dataset.pdlToastTitle || trigger.dataset.pdlToast || "Notificación",
      message: trigger.dataset.pdlToastMessage || "",
      state: trigger.dataset.pdlToastState || "info"
    }, root);

    trigger.addEventListener("click", show);
    cleanups.push(() => trigger.removeEventListener("click", show));
  }

  const feedbackTriggers = [...root.querySelectorAll("[data-pdl-feedback]")];
  for (const trigger of feedbackTriggers) {
    const show = () => showFeedback({
      title: trigger.dataset.pdlFeedbackTitle || trigger.dataset.pdlFeedback || "Estado",
      message: trigger.dataset.pdlFeedbackMessage || "",
      state: trigger.dataset.pdlFeedbackState || "info",
      mode: trigger.dataset.pdlFeedbackMode || "auto",
      requiresAcknowledgement: trigger.dataset.pdlFeedbackAcknowledge === "true"
    }, root);

    trigger.addEventListener("click", show);
    cleanups.push(() => trigger.removeEventListener("click", show));
  }

  const centers = [...root.querySelectorAll("[data-pdl-notification-center]")];
  for (const center of centers) {
    const markAll = center.querySelector("[data-pdl-mark-all-read]");
    if (!markAll) continue;

    const mark = () => {
      for (const item of center.querySelectorAll(".pdl-notification")) item.dataset.read = "true";
      center.dispatchEvent(new CustomEvent("pdl:notifications-read", { bubbles: true }));
    };

    markAll.addEventListener("click", mark);
    cleanups.push(() => markAll.removeEventListener("click", mark));
  }

  return { destroy() { cleanups.forEach(fn => fn()); } };
}
