#!/usr/bin/env node
// pdl-check — does a project use PDL as PDL intends? Run it on a product's
// pages and stylesheets:
//
//   npx pdl-check src/                 static rules on .html and .css
//   npx pdl-check src/ --render        also measures grid alignment in a
//                                      browser (needs playwright)
//   npx pdl-check src/ --json          machine-readable report
//
// Errors break the standard (exit 1); warnings are worth a look. The rules
// are the ones in USING_PDL.md: PDL owns breakpoints, sizes, widths, type
// and spacing, so a product's CSS composes and never re-decides them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cssRoot = path.resolve(here, "../src/css");

const BREAKPOINTS = new Set(["576px", "768px", "992px", "1200px", "1400px", "575.98px", "767.98px", "991.98px", "1199.98px", "1399.98px"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "vendor", ".next", "coverage"]);

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith("--")));
const targets = args.filter(a => !a.startsWith("--"));
if (!targets.length || flags.has("--help")) {
  console.log("usage: pdl-check <files or folders…> [--render] [--json]");
  console.log("  --render  open each page in Chromium (Playwright): grid lines at 1440/1280, overflow and clipped figures at 820/390.");
  console.log("            PDL_CHROMIUM_PATH=<chrome binary> when Playwright's own browser is missing or of another build.");
  process.exit(targets.length ? 0 : 2);
}

function walk(p) {
  const stat = fs.statSync(p);
  if (stat.isFile()) return [p];
  return fs.readdirSync(p, { withFileTypes: true }).flatMap(e => {
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : walk(path.join(p, e.name));
    return [path.join(p, e.name)];
  });
}

// Every class PDL defines (the stylesheet is the source of truth).
const pdlCss = walk(cssRoot).filter(f => f.endsWith(".css")).map(f => fs.readFileSync(f, "utf8")).join("\n");
const defined = new Set(pdlCss.match(/\.pdl-[a-z0-9_-]+/g)?.map(c => c.slice(1)) ?? []);

const findings = [];
const report = (file, source, index, level, rule, message) => {
  const line = source.slice(0, index).split("\n").length;
  findings.push({ file: path.relative(process.cwd(), file), line, level, rule, message });
};

// ── CSS rules ────────────────────────────────────────────────────────────
function checkCss(file, source, offset = 0, whole = source) {
  const at = i => offset + i;
  for (const m of source.matchAll(/@media[^{]*/g)) {
    for (const w of m[0].matchAll(/(?:min|max)-width:\s*([\d.]+(?:px|rem|em))/g)) {
      if (!BREAKPOINTS.has(w[1])) report(file, whole, at(m.index), "error", "breakpoint", `${w[1]} is not a PDL breakpoint (sm 576 · md 768 · lg 992 · xl 1200 · xxl 1400; max-width uses .98)`);
    }
  }
  for (const m of source.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const body = m[2];
    const base = m.index + m[1].length + 1;
    const isTokenBlock = /(^|,)\s*(:root|html|\[data-)/.test(selector);
    for (const d of body.matchAll(/(^|;)\s*([a-z-]+)\s*:\s*([^;]+)/g)) {
      const [, , prop, value] = d;
      const pos = at(base + d.index);
      if (prop.startsWith("--")) continue;
      if (prop === "font-size" && !/var\(--pdl-text-|inherit|^\s*(1em|100%)\s*$/.test(value)) report(file, whole, pos, "error", "type-size", `font-size: ${value.trim()} — use a type role (var(--pdl-text-xs|sm|md|lg|xl|display))`);
      if (prop === "font-weight" && /\d/.test(value) && !/var\(--pdl-weight-/.test(value)) report(file, whole, pos, "error", "type-weight", `font-weight: ${value.trim()} — use var(--pdl-weight-regular|medium|strong|bold)`);
      if (prop === "letter-spacing" && !/var\(--pdl-|normal|^\s*0\s*$/.test(value)) report(file, whole, pos, "warning", "type-tracking", `letter-spacing: ${value.trim()} — only the index role (uppercase) is tracked`);
      if (/^(width|min-width|max-width|inline-size|flex-basis|grid-template-columns)$/.test(prop)) {
        const px = [...value.matchAll(/(\d{3,})px/g)].map(x => Number(x[1])).filter(n => n >= 120);
        if (px.length) report(file, whole, pos, "error", "width", `${prop}: ${value.trim()} — use the grid (.pdl-row / .pdl-col--N) or the side scale (--pdl-width-rail|sidebar|panel|drawer) or a container`);
      }
      if (/^(gap|column-gap|row-gap)$/.test(prop) && /\d+(px|rem)/.test(value) && !/var\(--pdl-/.test(value)) report(file, whole, pos, "warning", "gap", `${prop}: ${value.trim()} — grids gap by --pdl-gutter / --pdl-gutter-y, stacks by --pdl-rhythm-*`);
      if (!isTokenBlock && /(^|[^-\w])(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\()/i.test(value) && !/var\(--pdl-/.test(value)) report(file, whole, pos, "warning", "color", `${prop}: ${value.trim()} — colors come from PDL tokens (var(--pdl-…))`);
    }
  }
}

// ── HTML rules ───────────────────────────────────────────────────────────
function checkHtml(file, source) {
  for (const m of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    checkCss(file, m[1], m.index + m[0].indexOf(">") + 1, source);
  }
  for (const m of source.matchAll(/\sclass="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls.startsWith("pdl-") && !defined.has(cls)) report(file, source, m.index, "error", "unknown-class", `.${cls} does not exist in PDL`);
    }
  }
  // PDL 2: three brands, two themes; the PDL 1 style, palette, type and texture switches are gone.
  for (const m of source.matchAll(/\sdata-pdl-brand="([^"]*)"/g)) {
    if (!["indigo", "leo", "tierra"].includes(m[1])) report(file, source, m.index, "error", "brand", `data-pdl-brand="${m[1]}" — PDL brands are indigo (no attribute), leo and tierra`);
  }
  for (const m of source.matchAll(/\sdata-pdl-theme="([^"]*)"/g)) {
    if (!["light", "dark", "system", "positive", "negative"].includes(m[1])) report(file, source, m.index, "error", "theme", `data-pdl-theme="${m[1]}" — use light or dark (or leave it out to follow the system)`);
  }
  for (const m of source.matchAll(/\s(data-pdl-(?:style|palette|texture|dither))="/g)) {
    report(file, source, m.index, "error", "removed", `${m[1]} was removed in PDL 2 — pick a brand with data-pdl-brand`);
  }
  for (const m of source.matchAll(/\sdata-pdl-type="(?!app"|reading")([^"]*)"/g)) {
    report(file, source, m.index, "error", "removed", `data-pdl-type="${m[1]}" — type pairings were removed in PDL 2 (only app | reading remain)`);
  }
  for (const m of source.matchAll(/\sstyle="([^"]*)"/g)) {
    const props = m[1].split(";").map(s => s.trim()).filter(Boolean);
    const bad = props.filter(p => !p.startsWith("--"));
    if (bad.length) report(file, source, m.index, "error", "inline-style", `style="${m[1]}" — only --pdl-* custom properties belong inline`);
  }
  if (/class="[^"]*\bpdl-shell-main\b/.test(source)) {
    const main = source.match(/<main\b[^>]*>/);
    if (!main) report(file, source, source.indexOf("pdl-shell-main"), "error", "page-profile", "the app shell holds no <main>");
    else if (!/pdl-(listing|detail|workspace|form-flow)-page/.test(main[0])) report(file, source, main.index, "warning", "page-profile", "<main> uses no page profile (.pdl-listing-page, .pdl-detail-page, .pdl-workspace-page, .pdl-form-flow-page)");
  }
  for (const m of source.matchAll(/<td(?![^>]*pdl-table__num)[^>]*>\s*([₲$€£]?\s?-?[\d.,]+\s?%?)\s*<\/td>/g)) {
    report(file, source, m.index, "warning", "numeric-cell", `"${m[1].trim()}" looks like a figure — mark the cell (and its header) .pdl-table__num`);
  }
  for (const m of source.matchAll(/<(button|a)\b[^>]*class="[^"]*pdl-icon-button[^"]*"[^>]*>/g)) {
    if (!/aria-label=|aria-labelledby=|title=/.test(m[0])) report(file, source, m.index, "error", "icon-name", "icon button without an accessible name (aria-label)");
  }
}

const files = targets.flatMap(walk).filter(f => /\.(html?|css)$/.test(f));
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  if (file.endsWith(".css")) checkCss(file, source);
  else checkHtml(file, source);
}

// ── Render: grid alignment ───────────────────────────────────────────────
// Every column-bearing composition must start and end on a column line of
// its page container (12 or 8 columns, 16px gutter).
if (flags.has("--render")) {
  let chromium;
  try { ({ chromium } = await import("playwright")); } catch { findings.push({ file: "-", line: 0, level: "warning", rule: "render", message: "playwright is not installed: grid alignment not measured" }); }
  if (chromium) {
    let browser;
    try { browser = await chromium.launch({ executablePath: process.env.PDL_CHROMIUM_PATH || undefined }); }
    catch (error) {
      console.error(`pdl-check --render: could not start Chromium (${error.message.split("\n")[0]}).\nInstall it with "npx playwright install chromium" or point PDL_CHROMIUM_PATH at a Chrome/Chromium binary.`);
      process.exit(2);
    }
    for (const file of files.filter(f => /\.html?$/.test(f))) {
      for (const width of [1440, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: "load" });
        const misses = await page.evaluate(() => {
          const main = document.querySelector("main");
          if (!main) return [];
          const cs = getComputedStyle(main);
          const r = main.getBoundingClientRect();
          const left = r.left + parseFloat(cs.paddingLeft), right = r.right - parseFloat(cs.paddingRight);
          const root = getComputedStyle(document.documentElement);
          const cols = Number(root.getPropertyValue("--pdl-columns")) || 12;
          const gutter = parseFloat(root.getPropertyValue("--pdl-gutter")) * parseFloat(root.fontSize || 16) || 16;
          const col = (right - left - (cols - 1) * gutter) / cols;
          const lines = [];
          for (let i = 0; i < cols; i++) { lines.push(left + i * (col + gutter), left + i * (col + gutter) + col); }
          const on = x => lines.some(l => Math.abs(l - x) <= 1.5);
          const sel = ".pdl-stat-grid > *, .pdl-split--aside > *, .pdl-row > *, .pdl-table-toolbar--columns > *, .pdl-detail-page__summary > *, .pdl-detail-page__body > *, .pdl-grid > *";
          // Compositions as wide as the page container sit on its lines; a
          // nested row (inside a card or a form) has lines of its own.
          const fullWidth = e => { const p = e.parentElement.getBoundingClientRect(); return Math.abs(p.left - left) <= 1.5 && Math.abs(p.right - right) <= 1.5; };
          return [...main.querySelectorAll(sel)].filter(e => e.getClientRects().length && !e.closest("dialog") && fullWidth(e)).flatMap(e => {
            const b = e.getBoundingClientRect();
            if (on(b.left) && on(b.right)) return [];
            const name = e.tagName.toLowerCase() + (e.className ? "." + String(e.className).trim().split(/\s+/).join(".") : "");
            return [`${name} spans ${Math.round(b.left)}–${Math.round(b.right)}px, off the ${cols}-column lines`];
          });
        });
        for (const m of misses) findings.push({ file: path.relative(process.cwd(), file), line: 0, level: "error", rule: `grid@${width}`, message: m });
        await page.close();
      }
      // Tablet and phone: nothing spills past the viewport, and no figure or
      // title is cut by the card or metric that holds it.
      for (const width of [820, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: "load" });
        const problems = await page.evaluate(() => {
          const out = [];
          const doc = document.documentElement;
          if (doc.scrollWidth > innerWidth + 1) out.push(`the page scrolls sideways (${doc.scrollWidth}px wide)`);
          for (const e of document.querySelectorAll(".pdl-stat__value, .pdl-card__title, .pdl-page-title, .pdl-button")) {
            if (!e.getClientRects().length || e.closest("dialog")) continue;
            const box = e.closest(".pdl-stat, .pdl-card, .pdl-table-wrap, main");
            const b = e.getBoundingClientRect(), c = box?.getBoundingClientRect();
            if (e.scrollWidth > e.clientWidth + 1 || (c && b.right > c.right + 1)) out.push(`"${e.textContent.trim().slice(0, 40)}" is cut off (${e.className})`);
          }
          return out;
        });
        for (const m of problems) findings.push({ file: path.relative(process.cwd(), file), line: 0, level: "error", rule: `fit@${width}`, message: m });
        await page.close();
      }
    }
    await browser.close();
  }
}

const errors = findings.filter(f => f.level === "error").length;
const warnings = findings.length - errors;
if (flags.has("--json")) {
  console.log(JSON.stringify({ files: files.length, errors, warnings, findings }, null, 2));
} else {
  for (const f of findings) console.log(`${f.level === "error" ? "✗" : "!"} ${f.file}${f.line ? ":" + f.line : ""}  [${f.rule}]  ${f.message}`);
  console.log(`PDL CHECK: ${errors ? "FAIL" : "PASS"} (${files.length} files · ${errors} errors · ${warnings} warnings)`);
}
process.exit(errors ? 1 : 0);
