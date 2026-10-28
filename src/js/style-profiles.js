// One registry for interchangeable PDL appearance profiles.
// Profiles change tokens; component markup and behavior stay untouched.
export const PDL_STYLES = Object.freeze([
  Object.freeze({ id: "carbon-soft", name: "Carbon Soft", defaultTheme: "negative", defaultTexture: "off" }),
  Object.freeze({ id: "carbon-core", name: "Carbon Core", defaultTheme: "negative", defaultTexture: "off" }),
  Object.freeze({ id: "carbon-sharp", name: "Carbon Sharp", defaultTheme: "negative", defaultTexture: "off", sampleFont: '"Space Grotesk", "Plus Jakarta Sans", sans-serif' }),
  Object.freeze({ id: "carbon-commercial", name: "Carbon Commercial", defaultTheme: "positive", defaultTexture: "off" }),
]);
export const PDL_STYLE_IDS = Object.freeze(PDL_STYLES.map(profile => profile.id));

function styleRoot(root) {
  const element = root?.documentElement ?? root;
  if (!element || typeof element.setAttribute !== "function" ||
      typeof element.getAttribute !== "function" || typeof element.removeAttribute !== "function") {
    throw new TypeError("PDL style root must be a Document or Element");
  }
  return element;
}

/** Change the whole appearance with one call; no component reinitialization. */
export function setPDLStyle(style, root = document) {
  const value = style ?? "";
  if (value !== "" && !PDL_STYLE_IDS.includes(value)) {
    throw new RangeError("Unknown PDL style: " + String(value));
  }
  const element = styleRoot(root);
  if (value) element.setAttribute("data-pdl-style", value);
  else element.removeAttribute("data-pdl-style");
  return value;
}

/** Invalid/obsolete stored names safely read as canonical style. */
export function getPDLStyle(root = document) {
  const value = styleRoot(root).getAttribute("data-pdl-style") ?? "";
  return PDL_STYLE_IDS.includes(value) ? value : "";
}
