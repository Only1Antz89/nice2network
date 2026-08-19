import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const roomPath = new URL("../app/meet/[meetingId]/page.tsx", import.meta.url);
const stylesPath = new URL("../app/globals.css", import.meta.url);
const chatApiPath = new URL("../app/api/meetings/[meetingId]/chat/route.ts", import.meta.url);

test("podcast rooms use the compact five-seat table and preserve stage overflow", async () => {
  const [room, styles] = await Promise.all([
    readFile(roomPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(room, /const orbitStage = stage\.slice\(0, 5\)/);
  assert.match(room, /const overflowStage = stage\.slice\(5\)/);
  assert.match(room, /className="podcast-round-stage"/);
  assert.match(room, /className="podcast-table-surface"/);
  assert.match(room, /LIVE PODCAST/);
  assert.match(room, /Recording/);
  assert.match(room, /className="podcast-stage-overflow"/);
  assert.match(styles, /\.podcast-round-stage\{[^}]*height:570px/);
  assert.match(styles, /\.podcast-table-surface\{[^}]*width:280px;aspect-ratio:1/);
  assert.match(styles, /\.podcast-stage-seat\.seat-upper-left/);
  assert.match(styles, /@media\(max-width:680px\)/);
  assert.match(styles, /\.podcast-stage-seats\{position:relative;inset:auto;display:grid;grid-template-columns:1fr/);
});

test("podcast controls stay visible and remain role aware", async () => {
  const [room, styles] = await Promise.all([
    readFile(roomPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(room, /\{isListener && <button[^>]+request-mic/);
  assert.match(room, /<Settings2\/>\s*<span>Settings<\/span>/);
  assert.match(room, /canModerate \? "Host console" : "Chat & questions"/);
  assert.match(room, /<span>Leave room<\/span>/);
  assert.doesNotMatch(room, /PodcastRoom[^\n]+controlsVisible=/);
  assert.match(styles, /\.podcast-controls\{position:fixed;[^}]*bottom:max\(18px,env\(safe-area-inset-bottom\)\)/);
});

test("listeners submit private prefixed questions in the normal orange chat feed", async () => {
  const [room, styles, chatApi] = await Promise.all([
    readFile(roomPath, "utf8"),
    readFile(stylesPath, "utf8"),
    readFile(chatApiPath, "utf8"),
  ]);

  assert.match(room, /\{canModerate && <nav className="podcast-chat-tabs"/);
  assert.match(room, /const prefixedQuestion = !canModerate && raw\.startsWith\("\?"\)/);
  assert.match(room, /const body = prefixedQuestion \? raw\.slice\(1\)\.trim\(\) : raw/);
  assert.match(room, /if \(!body\) return/);
  assert.match(room, /Start a message with <b>\?<\/b> to send a private question\. Only you, the host, and co-hosts will see it\./);
  assert.match(styles, /\.podcast-chat-feed article\.question p,[^{]+\{[^}]*color:#ff8a60/);
  assert.match(chatApi, /if \(question && !canSeeQuestions && row\.author\.id !== member\.id\) return \[\]/);
});
