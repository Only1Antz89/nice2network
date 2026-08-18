import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const roomPath = new URL("../app/meet/[meetingId]/page.tsx", import.meta.url);
const stylesPath = new URL("../app/globals.css", import.meta.url);

test("video meets request mobile media access from an explicit join action", async () => {
  const room = await readFile(roomPath, "utf8");

  assert.match(room, /Camera and microphone are checked only after you tap Join/);
  assert.match(room, /onClick=\{\(\) => beginJoin\(false\)\}/);
  assert.match(room, /Join with camera & microphone off/);
  assert.match(room, /On mobile, open this site’s controls or browser settings/);
  assert.match(room, /On iPhone and iPad/);
});

test("video meets preserve Safari tracks and queue early ICE candidates", async () => {
  const room = await readFile(roomPath, "utf8");

  assert.match(room, /event\.streams\[0\] \?\? new MediaStream\(\[event\.track\]\)/);
  assert.match(room, /pendingIce\.current\.set/);
  assert.match(room, /createOffer\(\{ iceRestart: true \}\)/);
});

test("video meets adapt capture, sender bandwidth and measured call quality", async () => {
  const room = await readFile(roomPath, "utf8");

  assert.match(room, /echoCancellation: \{ ideal: true \}/);
  assert.match(room, /noiseSuppression: \{ ideal: true \}/);
  assert.match(room, /high: \{ width: 1920, height: 1080, fps: 30/);
  assert.match(room, /standard: \{ width: 1280, height: 720, fps: 30/);
  assert.match(room, /data: \{ width: 640, height: 360, fps: 20/);
  assert.match(room, /sender\.setParameters\(parameters\)/);
  assert.match(room, /pc\.getStats\(\)/);
  assert.match(room, /qualityLimitationReason/);
  assert.match(room, /availableOutgoingBitrate/);
  assert.match(room, /signal\("quality", \{ presentation:/);
  assert.match(room, /Auto \(recommended\)/);
  assert.match(room, /quality-marker/);
});

test("participant video feeds use a bottom-centered filmstrip", async () => {
  const styles = await readFile(stylesPath, "utf8");

  assert.match(styles, /\.video-room \.participant-filmstrip\{left:50%;right:auto;bottom:94px/);
  assert.match(styles, /justify-content:center;transform:translateX\(-50%\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /@media\(max-height:560px\) and \(pointer:coarse\)/);
});
