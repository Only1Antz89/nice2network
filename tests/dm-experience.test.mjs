import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("direct messages use a thin circle, pill, circle composer", () => {
  assert.match(page, /className="dm-composer"/);
  assert.match(page, /dm-circle-button dm-add-button/);
  assert.match(page, /<textarea[\s\S]*?rows=\{1\}/);
  assert.match(page, /<ArrowUpRight size=\{20\}/);
  assert.match(styles, /\.dm-composer\{[\s\S]*?grid-template-columns:44px minmax\(0,1fr\) 44px/);
  assert.match(styles, /\.dm-composer-main\{[\s\S]*?border:0/);
});

test("direct messages expose empty, sending, attachment, and error states", () => {
  assert.match(page, /className="chat-empty-state"/);
  assert.match(page, /disabled=\{isSending\}/);
  assert.match(page, /className="chat-attachment" role="status"/);
  assert.match(page, /className="chat-send-error"/);
  assert.match(page, /startVoiceRecording/);
  assert.match(page, /className="voice-recording"/);
});

test("message hover controls and participant activity stay attached to chat messages", () => {
  assert.match(page, /className="message-footer"/);
  assert.match(page, /<NudgeMark\/>/);
  assert.match(page, /setEditMessageTarget\(message\)/);
  assert.match(page, /setDeleteMessageTarget\(message\)/);
  assert.match(page, /className="chat-participant-activity"/);
  assert.match(page, /onPlay=\{\(\) => setSpeakingMessageId\(message\.id\)\}/);
  assert.match(styles, /\.chat-message-row:hover \.message-actions/);
  assert.match(styles, /\.nudge-mark em:first-child[\s\S]*?font-size:15px[\s\S]*?\.nudge-mark em:last-child[\s\S]*?font-size:9px/);
});

test("conversation rows reveal archive, snooze, and delete controls on hover", () => {
  assert.match(page, /className="message-list-row-actions"/);
  assert.match(page, /conversationListAction\(row, row\.archivedAt \? "restore" : "archive"\)/);
  assert.match(page, /conversationListAction\(row, "snooze"\)/);
  assert.match(page, /setChatDeleteTarget\(row\)/);
  assert.match(styles, /\.message-list-row:hover \.message-list-row-actions/);
});
