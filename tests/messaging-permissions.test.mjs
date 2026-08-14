import assert from "node:assert/strict";
import test from "node:test";
import { getMessageEligibility } from "../lib/messaging-permissions.ts";

const base = { permission: "connections", sharedProject: false, mutual: false, senderIsAdmin: false, recipientIsAdmin: false };

test("active n2 admins can message one another without reciprocal follows", () => {
  assert.deepEqual(getMessageEligibility({ ...base, senderIsAdmin: true, recipientIsAdmin: true }), { canMessage: true, reason: "n2 admin team" });
});

test("admin messaging does not override an explicit nobody preference", () => {
  assert.equal(getMessageEligibility({ ...base, permission: "nobody", senderIsAdmin: true, recipientIsAdmin: true }).canMessage, false);
});

test("the admin exception does not extend to admin-member conversations", () => {
  assert.equal(getMessageEligibility({ ...base, senderIsAdmin: true }).canMessage, false);
  assert.equal(getMessageEligibility({ ...base, recipientIsAdmin: true }).canMessage, false);
});
