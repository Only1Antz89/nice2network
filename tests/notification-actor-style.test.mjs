import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification actor names use the prominent n2 green treatment", async () => {
  const [page, panel, styles] = await Promise.all([
    read("components/notifications-page.tsx"),
    read("components/notification-panel.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(page, /className="notification-actor"/);
  assert.match(panel, /className="notification-actor"/);
  assert.match(styles, /\.notification-actor\{color:var\(--green\);font:800 9px/);
});
