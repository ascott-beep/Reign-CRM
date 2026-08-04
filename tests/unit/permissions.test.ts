import { describe, it, expect } from "vitest";
import { canMutate, canManageSettings, canMergeRecords, canExport, canArchiveRecord } from "@/lib/permission-rules";
import type { SessionUser } from "@/lib/permission-rules";

function user(role: SessionUser["role"], id = "u1"): SessionUser {
  return { id, role, workspaceId: "w1", firstName: "Test", lastName: "User", email: "t@example.com" };
}

describe("role capability matrix", () => {
  it("Read Only users cannot mutate, export or manage settings", () => {
    expect(canMutate("READ_ONLY")).toBe(false);
    expect(canExport("READ_ONLY")).toBe(false);
    expect(canManageSettings("READ_ONLY")).toBe(false);
  });

  it("Standard users can mutate and export but not manage settings or merge", () => {
    expect(canMutate("STANDARD")).toBe(true);
    expect(canExport("STANDARD")).toBe(true);
    expect(canManageSettings("STANDARD")).toBe(false);
    expect(canMergeRecords("STANDARD")).toBe(false);
  });

  it("Admins can do everything", () => {
    expect(canMutate("ADMIN")).toBe(true);
    expect(canManageSettings("ADMIN")).toBe(true);
    expect(canMergeRecords("ADMIN")).toBe(true);
  });
});

describe("canArchiveRecord", () => {
  it("lets a Standard user archive records they own", () => {
    const owner = user("STANDARD", "owner-1");
    expect(canArchiveRecord(owner, { ownerId: "owner-1" })).toBe(true);
  });

  it("blocks a Standard user from archiving records owned by someone else", () => {
    const notOwner = user("STANDARD", "someone-else");
    expect(canArchiveRecord(notOwner, { ownerId: "owner-1" })).toBe(false);
  });

  it("lets an Admin archive any record regardless of ownership", () => {
    const admin = user("ADMIN", "admin-1");
    expect(canArchiveRecord(admin, { ownerId: "owner-1" })).toBe(true);
  });

  it("never lets a Read Only user archive anything", () => {
    const readOnly = user("READ_ONLY", "owner-1");
    expect(canArchiveRecord(readOnly, { ownerId: "owner-1" })).toBe(false);
  });
});
