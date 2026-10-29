// Brand and theme. A product sets them once on <html>:
//   data-pdl-brand  "indigo" (default) | "leo" | "tierra"
//   data-pdl-theme  "light" | "dark"; without it PDL follows the system
// [data-pdl-theme-toggle] buttons switch light ↔ dark and remember the choice.
export const PDL_BRANDS = Object.freeze(["indigo", "leo", "tierra"]);
export const PDL_THEMES = Object.freeze(["light", "dark", "system"]);
const STORAGE_KEY = "pdl-theme";
const ALIASES = { positive: "light", negative: "dark" };

function rootOf(root) {
  const element = root?.documentElement ?? root ?? document.documentElement;
  if (!element || typeof element.setAttribute !== "function") throw new TypeError("PDL root must be a Document or Element");
  return element;
}

export function getPDLBrand(root) {
  const value = rootOf(root).getAttribute("data-pdl-brand");
  return PDL_BRANDS.includes(value) ? value : "indigo";
}

export function setPDLBrand(brand, root) {
  const element = rootOf(root);
  if (!brand || brand === "indigo") { element.removeAttribute("data-pdl-brand"); return "indigo"; }
  if (!PDL_BRANDS.includes(brand)) throw new RangeError(`Unknown PDL brand: ${brand}`);
  element.setAttribute("data-pdl-brand", brand);
  return brand;
}

/** The theme in effect: "light" or "dark" (system resolved). */
export function getPDLTheme(root) {
  const value = rootOf(root).getAttribute("data-pdl-theme");
  const theme = ALIASES[value] ?? value;
  if (theme === "light" || theme === "dark") return theme;
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setPDLTheme(theme, root) {
  const element = rootOf(root);
  if (!PDL_THEMES.includes(theme)) throw new RangeError(`Unknown PDL theme: ${theme}`);
  if (theme === "system") element.removeAttribute("data-pdl-theme");
  else element.setAttribute("data-pdl-theme", theme);
  try { theme === "system" ? localStorage.removeItem(STORAGE_KEY) : localStorage.setItem(STORAGE_KEY, theme); } catch {}
  element.dispatchEvent?.(new CustomEvent("pdl:theme", { bubbles: true, detail: { theme: getPDLTheme(element) } }));
  return getPDLTheme(element);
}

export function initThemeToggles(root = document) {
  const element = root.documentElement ?? document.documentElement;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if ((saved === "light" || saved === "dark") && !element.hasAttribute("data-pdl-theme")) element.setAttribute("data-pdl-theme", saved);
  } catch {}
  const toggles = [...root.querySelectorAll("[data-pdl-theme-toggle]")];
  const sync = () => {
    const dark = getPDLTheme(element) === "dark";
    for (const toggle of toggles) {
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    }
  };
  const onClick = () => { setPDLTheme(getPDLTheme(element) === "dark" ? "light" : "dark", element); sync(); };
  for (const toggle of toggles) toggle.addEventListener("click", onClick);
  const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", sync);
  sync();
  return {
    destroy() {
      for (const toggle of toggles) toggle.removeEventListener("click", onClick);
      media?.removeEventListener?.("change", sync);
    },
  };
}
