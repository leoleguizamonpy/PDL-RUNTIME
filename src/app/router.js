function normalizePath(path) {
  if (!path) return "/";
  return path.startsWith("/") ? path : "/" + path;
}

function encodeState(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return normalizePath(path) + (search.toString() ? "?" + search.toString() : "");
}

function decodeState(value) {
  const raw = value || "/";
  const [path, search = ""] = raw.split("?", 2);
  return {
    path: normalizePath(path),
    params: Object.fromEntries(new URLSearchParams(search).entries())
  };
}

export function createPDLRouter(routes, options = {}) {
  const win = options.window ?? globalThis.window;
  const byTarget = target => routes.find(route => route.id === target || route.path === normalizePath(target));
  const hashState = win?.location?.hash?.slice(1) || null;
  const directPath = win?.location?.pathname || null;
  const directState = directPath && routes.some(route => route.path === directPath)
    ? directPath + (win?.location?.search || "")
    : null;
  const initialState = options.initialPath
    ?? hashState
    ?? directState
    ?? options.fallbackPath
    ?? routes[0]?.path
    ?? "/";
  let state = decodeState(initialState);
  const listeners = new Set();

  const resolve = current => {
    const route = routes.find(item => item.path === current.path) ?? routes[0];
    return { route, params: current.params };
  };

  const notify = () => {
    const resolved = resolve(state);
    for (const listener of listeners) listener(resolved);
  };

  const onHash = () => {
    state = decodeState(win.location.hash.slice(1));
    notify();
  };
  win?.addEventListener?.("hashchange", onHash);

  return {
    current: () => resolve(state),
    navigate(target, params = {}) {
      const route = byTarget(target);
      if (!route) throw new Error("Unknown route target: " + target);
      state = { path: route.path, params: { ...params } };
      const encoded = encodeState(route.path, params);
      if (win?.location) {
        const currentHash = (win.location.hash || "").replace(/^#/, "");
        if (currentHash !== encoded) {
          win.location.hash = encoded;
          return;
        }
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      win?.removeEventListener?.("hashchange", onHash);
      listeners.clear();
    }
  };
}
