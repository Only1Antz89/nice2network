import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("N2Select provides controlled, uncontrolled, grouped, dynamic and form-backed values", async () => {
  const component = await read("components/n2-select.tsx");
  assert.match(component, /value\?: string/);
  assert.match(component, /defaultValue\?: string/);
  assert.match(component, /N2SelectGroup/);
  assert.match(component, /options\.flatMap/);
  assert.match(component, /type="hidden" name=\{name\}/);
  assert.match(component, /form\.addEventListener\("reset"/);
  assert.match(component, /forwardRef<HTMLButtonElement/);
  assert.match(component, /option\.disabled/);
});

test("N2Select exposes complete keyboard, focus, dismissal and ARIA behavior", async () => {
  const component = await read("components/n2-select.tsx");
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape", "Tab"]) assert.match(component, new RegExp(`event\\.key === "${key}"`));
  assert.match(component, /event\.key === " "/);
  assert.match(component, /typeaheadRef/);
  assert.match(component, /document\.addEventListener\("pointerdown"/);
  assert.match(component, /internalButtonRef\.current\?\.focus\(\)/);
  assert.match(component, /role="combobox"/);
  assert.match(component, /role="listbox"/);
  assert.match(component, /role="option"/);
  assert.match(component, /aria-activedescendant/);
  assert.match(component, /aria-selected/);
});

test("dropdown menus are portalled, viewport-aware and theme-accessible", async () => {
  const [component, styles] = await Promise.all([read("components/n2-select.tsx"), read("app/globals.css")]);
  assert.match(component, /createPortal/);
  assert.match(component, /getBoundingClientRect/);
  assert.match(component, /window\.innerHeight/);
  assert.match(component, /addEventListener\("scroll", reposition, true\)/);
  assert.match(component, /addEventListener\("resize", reposition\)/);
  assert.match(styles, /\.n2-select-list/);
  assert.match(styles, /var\(--control,#fff\)/);
  assert.match(styles, /@media\(forced-colors:active\)/);
});

test("application UI no longer renders native select menus", async () => {
  const roots = ["app", "components"];
  async function walk(path) {
    const url = new URL(`../${path}/`, import.meta.url);
    const entries = await readdir(url, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) files.push(...await walk(child));
      else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(child);
    }
    return files;
  }
  const files = (await Promise.all(roots.map(walk))).flat();
  for (const file of files) assert.doesNotMatch(await read(file), /<select\b/, file);
});
