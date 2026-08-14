import assert from "node:assert/strict";
import test from "node:test";
import { canAssignAdminRole, canManageAdminRole, roleAllows } from "../lib/admin-roles.ts";

test("Master Admin has the exclusive master permission", () => {
  assert.equal(roleAllows("master_admin", "admins.master"), true);
  assert.equal(roleAllows("super_admin", "admins.master"), false);
});

test("only Master Admin can manage Super Admin access", () => {
  assert.equal(canManageAdminRole("master_admin", "super_admin"), true);
  assert.equal(canManageAdminRole("super_admin", "super_admin"), false);
  assert.equal(canAssignAdminRole("super_admin", "super_admin"), false);
  assert.equal(canAssignAdminRole("master_admin", "super_admin"), true);
});

test("lower roles cannot manage a superior role", () => {
  assert.equal(canManageAdminRole("support_admin", "safety_admin"), false);
  assert.equal(canManageAdminRole("safety_admin", "support_admin"), true);
});
