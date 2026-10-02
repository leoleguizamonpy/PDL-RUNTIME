export class SurfaceRegistry {
  #renderers = new Map();

  register(type, renderer) {
    if (!type || typeof renderer !== "function") throw new TypeError("type and renderer are required");
    if (this.#renderers.has(type)) throw new Error("Surface already registered: " + type);
    this.#renderers.set(type, renderer);
    return this;
  }

  has(type) {
    return this.#renderers.has(type);
  }

  get(type) {
    const renderer = this.#renderers.get(type);
    if (!renderer) throw new Error("Unknown PDL surface type: " + type);
    return renderer;
  }

  list() {
    return [...this.#renderers.keys()];
  }
}
