import assert from "node:assert/strict";
import test from "node:test";
import { isSecureRequest } from "../lib/http.ts";

test("secure request detection follows HTTPS and the proxy protocol", () => {
  assert.equal(isSecureRequest(new Request("https://nice2.example/onboarding")), true);
  assert.equal(isSecureRequest(new Request("http://127.0.0.1:3100/onboarding")), false);
  assert.equal(isSecureRequest(new Request("http://internal/onboarding", {
    headers: { "x-forwarded-proto": "https" },
  })), true);
  assert.equal(isSecureRequest(new Request("https://nice2.example/onboarding", {
    headers: { "x-forwarded-proto": "http" },
  })), true);
});
