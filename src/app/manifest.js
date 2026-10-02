const FORBIDDEN_KEYS = new Set([
  "css", "style", "styles", "html", "markup", "script", "javascript",
  "classes", "className", "selector", "onClick", "onSubmit"
]);
const SURFACE_TYPES = new Set(["auth", "collection", "conversation", "workspace"]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object");
  }
}
function rejectExecutablePresentation(value, path = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectExecutablePresentation(item, path + "[" + index + "]"));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error("PDL manifest forbids executable/presentational field: " + path + "." + key);
    }
    rejectExecutablePresentation(child, path + "." + key);
  }
}
export function validateProductManifest(manifest) {
  assertObject(manifest, "manifest");
  rejectExecutablePresentation(manifest);
  if (manifest.schema_version !== "1.0.0") throw new Error("Unsupported product UI schema_version");
  assertObject(manifest.product, "manifest.product");
  if (!manifest.product.id || !manifest.product.name) throw new Error("Product id and name are required");
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) throw new Error("At least one route is required");
  assertObject(manifest.actions, "manifest.actions");
  const routeIds = new Set();
  const routePaths = new Set();
  for (const route of manifest.routes) {
    assertObject(route, "route");
    if (!route.id || !route.path || !route.surface) throw new Error("Route id/path/surface required");
    if (!SURFACE_TYPES.has(route.surface)) throw new Error("Unknown surface type: " + route.surface);
    if (routeIds.has(route.id)) throw new Error("Duplicate route id: " + route.id);
    if (routePaths.has(route.path)) throw new Error("Duplicate route path: " + route.path);
    routeIds.add(route.id);
    routePaths.add(route.path);
    if (route.load && !manifest.actions[route.load]) throw new Error("Route load references unknown action: " + route.load);
  }
  if (manifest.initial_route && !routeIds.has(manifest.initial_route)) {
    throw new Error("initial_route references unknown route");
  }
  return manifest;
}
export async function loadProductManifest(source, fetchImpl = globalThis.fetch) {
  if (typeof source !== "string") return validateProductManifest(source);
  if (typeof fetchImpl !== "function") throw new Error("fetch is required to load manifest URL");
  const response = await fetchImpl(source, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Unable to load product UI manifest");
  return validateProductManifest(await response.json());
}
