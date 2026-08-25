import { describe, expect, it } from "vitest";
import { User } from "./User";

describe("User model", () => {
  it("normalizes a student user with safe defaults", () => {
    const user = new User({ email: " Student@Example.com ", displayName: "Student" });

    expect(user.email).toBe("student@example.com");
    expect(user.role).toBe("STUDENT");
    expect(user.status).toBe("ACTIVE");
  });
});
