import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const publicShell = fs.readFileSync(new URL("../components/public-site-shell.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("footer credits link the blue-gradient IntAillium build credit", () => {
  for (const source of [app, publicShell]) {
    assert.match(source, /built by/);
    assert.match(source, /href="https:\/\/intaillium\.com"/);
    assert.match(source, /className="intaillium-credit"/);
    assert.doesNotMatch(source, /Built in partnership with IntAillium/);
  }
  assert.match(css, /\.intaillium-credit\{[^}]*linear-gradient\([^)]*#00a6ff[^)]*#3975ff/);
});
