import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("direct messages use a spacious multiline composer", () => {
  assert.match(page, /className="dm-composer"/);
  assert.match(page, /<textarea[\s\S]*?rows=\{3\}/);
  assert.match(page, /Enter to send · Shift \+ Enter for a new line/);
  assert.match(styles, /\.dm-composer textarea\{[\s\S]*?min-height:64px/);
  assert.match(styles, /\.dm-composer\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 62px/);
});

test("direct messages expose empty, sending, attachment, and error states", () => {
  assert.match(page, /className="chat-empty-state"/);
  assert.match(page, /disabled=\{isSending \|\| \(!draft\.trim\(\) && !attachment\)\}/);
  assert.match(page, /className="chat-attachment" role="status"/);
  assert.match(page, /className="chat-send-error"/);
});
