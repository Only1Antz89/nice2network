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
  assert.match(styles, /\.conversation-composer-dock\{[\s\S]*?background:transparent/);
  assert.doesNotMatch(styles, /\.conversation-composer-dock\{[\s\S]*?background:linear-gradient/);
  assert.doesNotMatch(styles, /data-colour-theme="dark"\] (?:input|select|textarea)/);
  assert.doesNotMatch(styles, /data-colour-theme="system"\] (?:input|select|textarea)/);
});

test("direct messages expose empty, sending, attachment, and error states", () => {
  assert.match(page, /className="chat-empty-state"/);
  assert.match(page, /disabled=\{isSending\}/);
  assert.match(page, /className="chat-attachment" role="status"/);
  assert.match(page, /className="chat-send-error"/);
  assert.match(page, /startVoiceRecording/);
  assert.match(page, /className="voice-recording"/);
  assert.match(page, /function VoiceNotePlayer/);
  assert.match(page, /aria-label="Scrub voice note"/);
  assert.match(page, /audio\.volume = 1/);
  assert.doesNotMatch(page, /<audio src=\{message\.attachmentUrl\} controls/);
});

test("message hover controls and participant activity stay attached to chat messages", () => {
  assert.match(page, /className="message-footer"/);
  assert.match(page, /tabIndex=\{message\.status === "deleted" \? undefined : 0\}/);
  assert.match(page, /<NudgeMark\/>/);
  assert.match(page, /message\.senderId !== currentMember\.id && <button[\s\S]*?<NudgeMark\/>/);
  assert.match(page, /setEditMessageTarget\(message\)/);
  assert.match(page, /setDeleteMessageTarget\(message\)/);
  assert.match(page, /aria-label="Edit message"/);
  assert.match(page, /aria-label="Delete message"/);
  assert.match(page, /className="chat-participant-activity"/);
  assert.match(page, /onPlaybackChange=\{\(playing\) => setSpeakingMessageId/);
  assert.match(styles, /\.chat-message-row:hover \.message-actions/);
  assert.match(styles, /Message actions stay contextual[\s\S]*?\.message-footer \.message-actions\{opacity:0;visibility:hidden/);
  assert.match(page, /<span><em>⚡<\/em><\/span>/);
  assert.doesNotMatch(page, /<em>⚡<\/em><em>⚡<\/em>/);
  assert.match(styles, /\.nudge-mark>span\{[^}]*display:grid;place-items:center/);
});

test("the edit-message field uses a neutral focus treatment", () => {
  assert.match(styles, /\.action-dialog \.n2-editor-fields textarea:focus[\s\S]*?outline:none!important;[\s\S]*?box-shadow:none!important/);
});

test("all text entry fields suppress browser-blue focus rings", () => {
  assert.match(styles, /input:focus,input:focus-visible,[\s\S]*?\[contenteditable\]:focus-visible\{[\s\S]*?outline:none!important;[\s\S]*?box-shadow:none!important/);
  assert.doesNotMatch(styles, /data-enhanced-focus="true"[^\n]*#1d5fff/);
});

test("message search uses one continuous surface", () => {
  const darkStyles = readFileSync(new URL("../app/dark-theme.css", import.meta.url), "utf8");
  assert.match(darkStyles, /\.message-search input,[\s\S]*?\.conversation-search input[\s\S]*?background: transparent !important/);
});

test("conversation rows reveal archive, snooze, and delete controls on hover", () => {
  assert.match(page, /className="message-list-row-actions"/);
  assert.match(page, /conversationListAction\(row, row\.archivedAt \? "restore" : "archive"\)/);
  assert.match(page, /conversationListAction\(row, "snooze"\)/);
  assert.match(page, /setChatDeleteTarget\(row\)/);
  assert.match(styles, /\.message-list-row:hover \.message-list-row-actions/);
});

test("meet card controls remain contextual on pointer and touch layouts", () => {
  assert.match(page, /className="meet-card" key=\{meet\.id\} tabIndex=\{0\}/);
  assert.match(styles, /\.meet-card:hover \.meet-card-actions,\.meet-card:focus-within \.meet-card-actions/);
  assert.doesNotMatch(styles, /@media\(hover:none\)\{[^}]*\.meet-card-actions\{opacity:1/);
});
