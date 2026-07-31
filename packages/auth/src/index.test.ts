import { describe, expect, it } from "vitest";
import { EMAIL_PROVIDER } from "./index.js";

describe("@rishi/auth public API", () => {
  it("exports a stable email provider injection token", () => {
    expect(EMAIL_PROVIDER).toBe(Symbol.for("@rishi/auth/IEmailProvider"));
  });
});
