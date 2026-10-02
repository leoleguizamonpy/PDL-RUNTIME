import { initPDL } from "../index.js";
import { loadProductManifest } from "./manifest.js";
import { SurfaceRegistry } from "./surface-registry.js";
import { createHttpActionTransport } from "./action-transport.js";
import { createPDLRouter } from "./router.js";
import { defaultSurfaceRenderers } from "./renderers.js";

export async function createPDLApp(options = {}) {
  const root = typeof options.root === "string"
    ? document.querySelector(options.root)
    : (options.root ?? document.querySelector("[data-pdl-app]"));
  if (!root) throw new Error("PDL app root not found");

  const manifest = await loadProductManifest(options.manifest ?? root.dataset.manifest, options.fetch);
  const registry = options.registry ?? new SurfaceRegistry();
  for (const [type, renderer] of Object.entries(defaultSurfaceRenderers)) {
    if (!registry.has(type)) registry.register(type, renderer);
  }
  const transport = options.transport ?? createHttpActionTransport(manifest.actions, {
    fetch: options.fetch, baseUrl: options.baseUrl, headers: options.headers
  });
  const pdl = initPDL({ root: document, cursor: options.cursor });
  const initialRoute = manifest.routes.find(route => route.id === manifest.initial_route) ?? manifest.routes[0];
  const router = createPDLRouter(manifest.routes, {
    window: options.window,
    initialPath: options.initialPath,
    fallbackPath: initialRoute.path
  });
  let destroyed = false;

  const handleResult = async result => {
    if (!result || typeof result !== "object") return result;
    if (result.navigate) router.navigate(result.navigate, result.params || {});
    return result;
  };

  const renderRoute = async resolved => {
    if (destroyed) return;
    const { route, params } = resolved;
    const renderer = registry.get(route.surface);
    root.dataset.pdlSurface = route.id;
    await renderer({
      root,
      manifest,
      surface: {
        id: route.id,
        type: route.surface,
        title: route.label,
        load_action: route.load
      },
      route,
      params,
      transport,
      router,
      handleResult
    });
  };

  const onRoute = resolved => {
    renderRoute(resolved).catch(error => {
      root.textContent = error.message;
      root.setAttribute("data-pdl-error", "true");
    });
  };
  const unsubscribe = router.subscribe(onRoute);
  await renderRoute(router.current());
  return {
    manifest, registry, router, transport, handleResult,
    render: () => renderRoute(router.current()),
    destroy() {
      destroyed = true;
      unsubscribe();
      router.destroy();
      pdl?.destroy?.();
    }
  };
}
