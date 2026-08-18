import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const darkTheme = readFileSync(new URL("../app/dark-theme.css", import.meta.url), "utf8");

test("dark project role hover keeps the plus visible on its white fill", () => {
  assert.match(darkTheme, /html\[data-colour-theme="dark"\] \.open-person:hover > svg/);
  assert.match(darkTheme, /background: #fff !important;\s+color: #111 !important;/);
});
