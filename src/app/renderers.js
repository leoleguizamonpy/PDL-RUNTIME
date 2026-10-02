function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
function clear(root) { while (root.firstChild) root.removeChild(root.firstChild); }

function frameSurface(ctx, content, options = {}) {
  const frame = el("div", "pdl-application-shell");
  const sidebar = el("aside", "pdl-sidebar pdl-app-sidebar");
  sidebar.setAttribute("aria-label", "Navegación principal");

  const brand = el("button", "pdl-app-sidebar__brand");
  brand.type = "button";
  const mark = el("span", "pdl-app-sidebar__mark", (ctx.manifest.product.name || "P").slice(0, 1));
  const brandCopy = el("span", "pdl-app-sidebar__brand-copy");
  brandCopy.append(
    el("strong", "", ctx.manifest.product.name || "Producto"),
    el("small", "", ctx.manifest.product.signature || "Aplicación")
  );
  brand.append(mark, brandCopy);

  const navigable = (ctx.manifest.routes || []).filter(route => route.navigation === true);
  const home = navigable[0];
  if (home) brand.addEventListener("click", () => ctx.router.navigate(home.id, ctx.params || {}));
  sidebar.append(brand);

  const navLabel = el("span", "pdl-app-sidebar__label", options.general_navigation_label || "Navegación");
  const nav = el("nav", "pdl-sidebar__nav");
  for (const route of navigable) {
    const button = el("button", "pdl-nav-item", route.label || route.id);
    button.type = "button";
    if (route.id === ctx.route.id && !(options.navigation || []).length) {
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => ctx.router.navigate(route.id, ctx.params || {}));
    nav.append(button);
  }
  sidebar.append(navLabel, nav);

  const contextual = Array.isArray(options.navigation) ? options.navigation : [];
  if (contextual.length) {
    const contextBlock = el("div", "pdl-app-sidebar__context");
    if (options.navigation_title) {
      const contextTitle = el("div", "pdl-app-sidebar__project");
      contextTitle.append(
        el("span", "pdl-app-sidebar__label", options.navigation_label || "Proyecto"),
        el("strong", "", options.navigation_title)
      );
      contextBlock.append(contextTitle);
    } else {
      contextBlock.append(el("span", "pdl-app-sidebar__label", options.navigation_label || "Proyecto"));
    }
    const projectNav = el("nav", "pdl-sidebar__nav pdl-app-sidebar__project-nav");
    for (const item of contextual) {
      const button = el("button", "pdl-nav-item pdl-project-nav-item");
      button.type = "button";
      button.append(el("span", "pdl-project-nav-item__label", item.label || item.id || "Sección"));
      if (item.attention) {
        const notice = el("span", "pdl-project-nav-item__notice");
        notice.setAttribute("aria-label", item.attention_label || "Requiere atención");
        button.append(notice);
      }
      if (item.id === options.active_navigation) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => {
        if (item.route) ctx.router.navigate(item.route, item.params || ctx.params || {});
      });
      projectNav.append(button);
    }
    contextBlock.append(projectNav);
    sidebar.append(contextBlock);
  }

  const signature = el("div", "pdl-app-sidebar__footer");
  signature.append(
    el("strong", "", ctx.manifest.product.signature || ctx.manifest.product.name || ""),
    el("small", "", ctx.manifest.product.name || "")
  );
  sidebar.append(signature);

  const main = el("div", "pdl-shell-main pdl-app-main");
  const topbar = el("header", "pdl-topbar pdl-app-topbar");
  const topbarInner = el("div", "pdl-topbar__inner");
  const menu = el("button", "pdl-icon-button pdl-app-menu", "☰");
  menu.type = "button";
  menu.setAttribute("aria-label", "Abrir menú");
  menu.setAttribute("aria-expanded", "false");
  const context = el(
    "strong",
    "pdl-app-topbar__context",
    options.context_title || ctx.route.label || ctx.surface.title || ctx.manifest.product.name
  );
  topbarInner.append(menu, context);
  if (options.progress) {
    const meter = el("div", "pdl-app-topbar__progress");
    const value = Number(options.progress.value || 0);
    const max = Math.max(1, Number(options.progress.max || 1));
    meter.append(el("strong", "", Math.round((value / max) * 100) + "%"));
    const bar = el("progress", "pdl-progress");
    bar.max = max;
    bar.value = value;
    meter.append(bar, el("small", "", value + "/" + max));
    topbarInner.append(meter);
  }
  topbar.append(topbarInner);

  const backdrop = el("button", "pdl-app-backdrop");
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Cerrar menú");
  backdrop.hidden = true;

  const closeMenu = () => {
    sidebar.classList.remove("is-open");
    menu.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  };
  menu.addEventListener("click", () => {
    const open = !sidebar.classList.contains("is-open");
    sidebar.classList.toggle("is-open", open);
    menu.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !open;
  });
  backdrop.addEventListener("click", closeMenu);

  const body = el("div", "pdl-app-content");
  body.append(content);
  main.append(topbar, body);
  frame.append(sidebar, main, backdrop);
  return frame;
}
function status(root, message, tone = "") {
  const node = el("p", "pdl-alert" + (tone ? " pdl-alert--" + tone : ""), message);
  node.setAttribute("role", "status");
  root.append(node);
  return node;
}
async function loadModel(ctx) {
  if (!ctx.surface.load_action) return {};
  const result = await ctx.transport.invoke(ctx.surface.load_action, ctx.params || {});
  if (result?.navigate) {
    await ctx.handleResult(result);
    return null;
  }
  return result || {};
}
function routeButton(item, ctx) {
  const button = el("button", item.primary ? "pdl-button pdl-button--primary" : "pdl-button", item.label || "Continuar");
  button.type = "button";
  button.addEventListener("click", async () => {
    if (item.confirm_message && globalThis.confirm && !globalThis.confirm(item.confirm_message)) return;
    if (item.route) ctx.router.navigate(item.route, item.params || ctx.params || {});
    else if (item.action) {
      const result = await ctx.transport.invoke(item.action, { ...(ctx.params || {}), ...(item.params || {}) });
      await ctx.handleResult(result);
    }
  });
  return button;
}

export async function renderAuthSurface(ctx) {
  clear(ctx.root);
  const model = await loadModel(ctx);
  if (model === null) return;
  const wrap = el("main", "pdl-container pdl-container--narrow pdl-stack");
  const header = el("header", "pdl-page-header");
  header.append(el("h1", "pdl-page-title", model.title || ctx.surface.title || ctx.manifest.product.name));
  if (model.description) header.append(el("p", "pdl-prose", model.description));
  wrap.append(header);
  const feedback = el("div", "");
  for (const formModel of model.forms || []) {
    const card = el("section", "pdl-card pdl-stack");
    card.append(el("h2", "", formModel.title || "Continuar"));
    const form = el("form", "pdl-stack");
    for (const field of formModel.fields || []) {
      const label = el("label", "pdl-field");
      label.append(el("span", "pdl-field__label", field.label || field.name));
      const input = el("input", "pdl-input");
      input.name = field.name;
      input.type = field.type || "text";
      if (field.autocomplete) input.autocomplete = field.autocomplete;
      input.required = field.required === true;
      label.append(input);
      form.append(label);
    }
    const submit = el("button", "pdl-button pdl-button--primary", formModel.submit_label || "Continuar");
    submit.type = "submit";
    form.append(submit);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      clear(feedback);
      submit.disabled = true;
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const result = await ctx.transport.invoke(formModel.action, payload);
        await ctx.handleResult(result);
      } catch (error) {
        status(feedback, error.message, "danger");
      } finally { submit.disabled = false; }
    });
    card.append(form);
    wrap.append(card);
  }
  wrap.append(feedback);
  ctx.root.append(wrap);
}

export async function renderCollectionSurface(ctx) {
  clear(ctx.root);
  const model = await loadModel(ctx);
  if (model === null) return;

  const main = el("main", "pdl-container pdl-container--page pdl-collection");
  const top = el("section", "pdl-collection__top");
  const header = el("header", "pdl-collection__header");
  header.append(el("h1", "pdl-page-title", model.title || ctx.surface.title || "Elementos"));
  if (model.description) header.append(el("p", "pdl-prose", model.description));
  top.append(header);

  if ((model.actions || []).length) {
    const actions = el("div", "pdl-cluster pdl-collection__actions");
    for (const item of model.actions) actions.append(routeButton(item, ctx));
    top.append(actions);
  }
  main.append(top);

  let search = null;
  if (model.searchable !== false) {
    const searchShell = el("div", "pdl-collection__search");
    search = el("input", "pdl-input");
    search.type = "search";
    search.placeholder = model.search_placeholder || "Buscar";
    searchShell.append(search);
    main.append(searchShell);
  }

  const list = el("section", "pdl-collection__list");
  main.append(list);
  ctx.root.replaceChildren(frameSurface(ctx, main));

  const items = model.items || [];
  const draw = query => {
    clear(list);
    const normalized = String(query || "").toLowerCase();
    const filtered = items.filter(item => JSON.stringify(item).toLowerCase().includes(normalized));
    if (!filtered.length) {
      const empty = el("div", "pdl-collection__empty");
      empty.append(el("strong", "", model.empty_title || "Nada para mostrar todavía"));
      empty.append(el("p", "", model.empty_message || "No hay elementos para mostrar."));
      list.append(empty);
      return;
    }
    for (const item of filtered) {
      const card = el("article", "pdl-card pdl-card--interactive pdl-collection-item");
      const copy = el("div", "pdl-collection-item__copy");
      copy.append(el("strong", "pdl-collection-item__title", item.title || item.name || item.label || item.id || "Elemento"));
      if (item.description) copy.append(el("p", "pdl-collection-item__description", item.description));
      const side = el("div", "pdl-collection-item__side");
      if (item.status) side.append(el("span", "pdl-status", item.status));
      if (item.route) side.append(routeButton({ label: item.action_label || "Abrir", route: item.route, params: item.params }, ctx));
      card.append(copy, side);
      list.append(card);
    }
  };
  draw("");
  search?.addEventListener("input", () => draw(search.value));
}

export async function renderConversationSurface(ctx) {
  clear(ctx.root);
  let model = await loadModel(ctx);
  if (model === null) return;
  const shell = el("main", "pdl-chat");
  const header = el("header", "pdl-section__inner");
  header.append(el("h1", "pdl-page-title", model.title || ctx.surface.title || "Conversación"));
  if (model.status) header.append(el("span", "pdl-status", model.status));
  const thread = el("section", "pdl-chat__thread");
  const composer = el("form", "pdl-chat__composer");
  const input = el("textarea", "pdl-input");
  input.rows = 1;
  input.placeholder = model.placeholder || "Escribí tu respuesta";
  const send = el("button", "pdl-icon-button pdl-icon-button--primary", "↑");
  send.type = "submit";
  send.setAttribute("aria-label", "Enviar");
  shell.append(header, thread, composer);
  ctx.root.replaceChildren(frameSurface(ctx, shell, {
    navigation: model.navigation,
    navigation_title: model.project_title,
    active_navigation: model.active_section || "assistant",
    context_title: model.project_title ? model.project_title + " · " + (model.title || "Asistente") : undefined,
    progress: model.progress
  }));

  const submitChoice = async choice => {
    const actionId = model.choice_action || model.submit_action;
    if (!actionId) return;
    const result = await ctx.transport.invoke(actionId, {
      ...(ctx.params || {}),
      choice_id: choice.id,
      state: choice.state,
      message: choice.value
    });
    await ctx.handleResult(result);
  };

  const draw = data => {
    clear(thread);
    for (const message of data.messages || []) {
      const article = el("article", "pdl-message" + (message.role === "user" ? " pdl-message--user" : ""));
      article.append(el("div", "pdl-message__bubble", message.content || message.text || message.message || ""));
      thread.append(article);
    }
    if (data.prompt && !(data.messages || []).some(item => item.content === data.prompt)) {
      const article = el("article", "pdl-message");
      article.append(el("div", "pdl-message__bubble", data.prompt));
      thread.append(article);
    }
    const choices = data.reply_options || [];
    if (choices.length) {
      const wrap = el("div", "pdl-chat-choices");
      const list = el("div", "pdl-chat-choices__list");
      choices.forEach((choice, index) => {
        const button = el("button", "pdl-chat-choice");
        button.type = "button";
        button.append(el("span", "pdl-chat-choice__index", index + 1));
        const copy = el("span", "pdl-chat-choice__copy");
        copy.append(el("span", "pdl-chat-choice__label", choice.label || choice.text || String(choice)));
        if (choice.description) copy.append(el("span", "pdl-chat-choice__description", choice.description));
        button.append(copy);
        button.addEventListener("click", () => submitChoice(choice));
        list.append(button);
      });
      wrap.append(list);
      thread.append(wrap);
    }
    thread.scrollTop = thread.scrollHeight;
    composer.hidden = data.allow_freeform_reply === false || !data.submit_action;
    if (!composer.hidden) {
      clear(composer);
      composer.append(input, send);
    }
  };
  draw(model);

  composer.addEventListener("submit", async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || !model.submit_action) return;
    send.disabled = true;
    try {
      const result = await ctx.transport.invoke(model.submit_action, { ...(ctx.params || {}), message });
      input.value = "";
      await ctx.handleResult(result);
    } catch (error) {
      status(thread, error.message, "danger");
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
  if (model.focus_composer) queueMicrotask(() => input.focus());
}

function workspaceItemCard(item, ctx) {
  const card = el("article", "pdl-card pdl-workspace-item");
  const heading = el("div", "pdl-workspace-item__heading");
  const copy = el("div", "pdl-workspace-item__copy");
  if (item.label) copy.append(el("span", "pdl-eyebrow", item.label));
  copy.append(el("strong", "pdl-workspace-item__title", item.title || item.name || "Elemento"));
  if (item.description) copy.append(el("p", "pdl-workspace-item__description", item.description));
  heading.append(copy);
  if (item.status) heading.append(el("span", "pdl-status", item.status));
  card.append(heading);

  if (Array.isArray(item.meta) && item.meta.length) {
    const meta = el("dl", "pdl-kv pdl-workspace-item__meta");
    for (const row of item.meta) {
      if (!row || row.value === undefined || row.value === null || row.value === "") continue;
      meta.append(el("dt", "", row.label || "Dato"), el("dd", "", row.value));
    }
    card.append(meta);
  }

  if (Array.isArray(item.artifacts) && item.artifacts.length) {
    const artifacts = el("div", "pdl-workspace-artifacts");
    for (const artifact of item.artifacts) {
      const row = el("div", "pdl-workspace-artifact");
      row.append(
        el("span", "", artifact.label || artifact.name || "Archivo"),
        el("small", "", artifact.type || artifact.kind || "Resultado")
      );
      artifacts.append(row);
    }
    card.append(artifacts);
  }

  if (Array.isArray(item.actions) && item.actions.length) {
    const actions = el("div", "pdl-cluster pdl-workspace-item__actions");
    for (const action of item.actions) actions.append(routeButton(action, ctx));
    card.append(actions);
  }
  return card;
}

function renderWorkspaceForm(section, ctx, host) {
  if (!section.form) return;
  const formModel = section.form;
  const card = el("form", "pdl-card pdl-workspace-form");
  if (formModel.title) card.append(el("strong", "pdl-workspace-form__title", formModel.title));
  if (formModel.description) card.append(el("p", "pdl-workspace-item__description", formModel.description));
  const fields = el("div", "pdl-workspace-form__fields");
  for (const field of formModel.fields || []) {
    const label = el("label", "pdl-field");
    label.append(el("span", "pdl-field__label", field.label || field.name));
    const input = el("input", "pdl-input");
    input.name = field.name;
    input.type = field.type || "text";
    input.required = field.required === true;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.autocomplete) input.autocomplete = field.autocomplete;
    label.append(input);
    fields.append(label);
  }
  card.append(fields);
  const footer = el("div", "pdl-workspace-form__footer");
  const submit = el("button", "pdl-button pdl-button--primary", formModel.submit_label || "Continuar");
  submit.type = "submit";
  const feedback = el("div", "pdl-workspace-form__feedback");
  footer.append(submit);
  card.append(footer, feedback);
  card.addEventListener("submit", async event => {
    event.preventDefault();
    clear(feedback);
    submit.disabled = true;
    try {
      const payload = {
        ...(ctx.params || {}),
        ...Object.fromEntries(new FormData(card).entries())
      };
      const result = await ctx.transport.invoke(formModel.action, payload);
      await ctx.handleResult(result);
    } catch (error) {
      status(feedback, error.message, "danger");
    } finally {
      submit.disabled = false;
    }
  });
  host.append(card);
}

function renderWorkspaceHistory(section, ctx, host) {
  const controls = el("div", "pdl-workspace-history__controls");
  const search = el("input", "pdl-input");
  search.type = "search";
  search.placeholder = section.search_placeholder || "Buscar en el historial";
  const category = el("select", "pdl-select");
  const categories = ["all", ...new Set((section.items || []).map(item => item.category).filter(Boolean))];
  for (const value of categories) {
    const option = el("option", "", value === "all" ? "Todas las categorías" : value);
    option.value = value;
    category.append(option);
  }
  controls.append(search, category);
  host.append(controls);
  const list = el("div", "pdl-workspace-list");
  host.append(list);
  const draw = () => {
    clear(list);
    const query = search.value.trim().toLowerCase();
    const categoryValue = category.value;
    const items = (section.items || []).filter(item => {
      if (categoryValue !== "all" && item.category !== categoryValue) return false;
      if (!query) return true;
      return JSON.stringify(item).toLowerCase().includes(query);
    });
    if (!items.length) {
      const empty = el("div", "pdl-collection__empty");
      empty.append(el("strong", "", section.empty_title || "No hay actividades para mostrar"));
      if (section.empty_message) empty.append(el("p", "", section.empty_message));
      list.append(empty);
      return;
    }
    for (const item of items) list.append(workspaceItemCard(item, ctx));
  };
  search.addEventListener("input", draw);
  category.addEventListener("change", draw);
  draw();
}

export async function renderWorkspaceSurface(ctx) {
  clear(ctx.root);
  const model = await loadModel(ctx);
  if (model === null) return;

  const activeId = model.active_section || "overview";
  const sections = Array.isArray(model.sections) ? model.sections : [];
  const active = sections.find(section => section.id === activeId) || sections[0] || {
    id: "overview",
    label: "Resumen",
    title: model.title || "Proyecto",
    kind: "overview",
    items: []
  };

  const main = el("main", "pdl-container pdl-container--page pdl-project-view");
  const header = el("header", "pdl-project-view__header");
  const headerCopy = el("div", "pdl-project-view__header-copy");
  headerCopy.append(
    el("span", "pdl-eyebrow", active.label || "Proyecto"),
    el("h1", "pdl-page-title", active.title || model.title || ctx.surface.title || "Proyecto")
  );
  if (active.description) headerCopy.append(el("p", "pdl-prose", active.description));
  header.append(headerCopy);
  if ((model.actions || []).length) {
    const actions = el("div", "pdl-cluster pdl-project-view__actions");
    for (const item of model.actions) actions.append(routeButton(item, ctx));
    header.append(actions);
  }
  main.append(header);

  if (active.kind === "overview") {
    if (model.progress) {
      const progress = el("section", "pdl-card pdl-project-progress");
      const progressHeader = el("div", "pdl-project-progress__heading");
      const value = Number(model.progress.value || 0);
      const max = Math.max(1, Number(model.progress.max || 1));
      progressHeader.append(
        el("span", "", model.progress.label || "Progreso"),
        el("strong", "", Math.round((value / max) * 100) + "%")
      );
      const bar = el("progress", "pdl-progress");
      bar.max = max;
      bar.value = value;
      progress.append(progressHeader, bar, el("small", "", value + "/" + max + " etapas completadas"));
      main.append(progress);
    }
    if (model.objective) {
      const objective = el("section", "pdl-card pdl-project-objective");
      objective.append(el("span", "pdl-eyebrow", "Objetivo"), el("p", "", model.objective));
      main.append(objective);
    }
    const grid = el("section", "pdl-project-summary-grid");
    for (const item of active.items || []) grid.append(workspaceItemCard(item, ctx));
    if (grid.childElementCount) main.append(grid);
  } else {
    renderWorkspaceForm(active, ctx, main);
    if (active.kind === "history") {
      renderWorkspaceHistory(active, ctx, main);
    } else if (active.kind === "details") {
      const details = el("dl", "pdl-kv pdl-project-details");
      for (const item of active.items || []) {
        if (!item || item.value === undefined || item.value === null || item.value === "") continue;
        details.append(el("dt", "", item.label || "Dato"), el("dd", "", item.value));
      }
      if (details.childElementCount) main.append(details);
    } else {
      const list = el("section", "pdl-workspace-list");
      for (const item of active.items || []) list.append(workspaceItemCard(item, ctx));
      if (!list.childElementCount) {
        const empty = el("div", "pdl-collection__empty");
        empty.append(el("strong", "", active.empty_title || "Nada para mostrar todavía"));
        if (active.empty_message) empty.append(el("p", "", active.empty_message));
        list.append(empty);
      }
      main.append(list);
    }
  }

  ctx.root.replaceChildren(frameSurface(ctx, main, {
    navigation: model.navigation,
    navigation_title: model.title,
    active_navigation: activeId,
    context_title: model.title ? model.title + " · " + (active.label || "Proyecto") : undefined,
    progress: model.progress
  }));
}

export const defaultSurfaceRenderers = {
  auth: renderAuthSurface,
  collection: renderCollectionSurface,
  conversation: renderConversationSurface,
  workspace: renderWorkspaceSurface
};
