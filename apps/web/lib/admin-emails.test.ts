import { afterEach, describe, expect, it } from "vitest";
import { getAdminEmails, isAdminEmail } from "./admin-emails";

const original = process.env.ADMIN_EMAILS;
afterEach(() => {
  process.env.ADMIN_EMAILS = original;
});

describe("isAdminEmail", () => {
  it("matches an allowlisted email, case-insensitively", () => {
    process.env.ADMIN_EMAILS = "admin@example.com, other@example.com";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("ADMIN@example.com")).toBe(true);
  });

  it("rejects a non-allowlisted email", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isAdminEmail("intruder@example.com")).toBe(false);
  });

  it("rejects null, undefined, and empty", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("treats an unset ADMIN_EMAILS as no admins", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmails()).toEqual([]);
    expect(isAdminEmail("admin@example.com")).toBe(false);
  });
});
