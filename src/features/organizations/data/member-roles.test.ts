import { describe, expect, it } from "vitest";

import { formatRole, hasRole } from "./member-roles";

describe("hasRole", () => {
  it("matches a single role", () => {
    expect(hasRole("admin", "owner", "admin")).toBe(true);
    expect(hasRole("member", "owner", "admin")).toBe(false);
  });

  it("matches any of several roles stored as one comma-separated string", () => {
    expect(hasRole("member,admin", "admin")).toBe(true);
    expect(hasRole("member, owner", "owner")).toBe(true);
  });

  it("does not match a role that merely contains the name", () => {
    expect(hasRole("co-owner", "owner")).toBe(false);
  });

  it("matches nothing without a role", () => {
    expect(hasRole(undefined, "member")).toBe(false);
    expect(hasRole("", "member")).toBe(false);
  });
});

describe("formatRole", () => {
  it("shows the label of each role, and an unknown role as it is", () => {
    expect(formatRole("owner")).toBe("Owner");
    expect(formatRole("member,admin")).toBe("Member, Admin");
    expect(formatRole("auditor")).toBe("auditor");
  });
});
