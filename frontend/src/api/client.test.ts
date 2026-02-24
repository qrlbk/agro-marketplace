import { describe, it, expect } from "vitest";
import { productImageUrl, getErrorMessage } from "./client";

describe("productImageUrl", () => {
  it("returns empty string for null or undefined", () => {
    expect(productImageUrl(null)).toBe("");
    expect(productImageUrl(undefined)).toBe("");
  });

  it("returns url as-is when it starts with http", () => {
    expect(productImageUrl("https://example.com/img.png")).toBe("https://example.com/img.png");
    expect(productImageUrl("http://cdn.test/photo.jpg")).toBe("http://cdn.test/photo.jpg");
  });

  it("prepends API base to relative path", () => {
    const withSlash = productImageUrl("/uploads/1.jpg");
    const noSlash = productImageUrl("uploads/2.jpg");
    expect(withSlash).toMatch(/\/uploads\/1\.jpg$/);
    expect(noSlash).toMatch(/\/uploads\/2\.jpg$/);
    expect(withSlash).not.toBe("");
  });
});

describe("getErrorMessage", () => {
  it("returns default for null or undefined", () => {
    expect(getErrorMessage(null)).toBe("Ошибка");
    expect(getErrorMessage(undefined)).toBe("Ошибка");
  });

  it("returns string detail as-is", () => {
    expect(getErrorMessage("Invalid request")).toBe("Invalid request");
  });

  it("joins array of msg objects", () => {
    expect(getErrorMessage([{ msg: "Error 1" }, { msg: "Error 2" }])).toBe("Error 1 Error 2");
  });

  it("handles array of strings", () => {
    expect(getErrorMessage(["First", "Second"])).toBe("First Second");
  });

  it("returns Ошибка for empty array", () => {
    expect(getErrorMessage([])).toBe("Ошибка");
  });

  it("unwraps nested detail object", () => {
    expect(getErrorMessage({ detail: "Nested message" })).toBe("Nested message");
    expect(getErrorMessage({ detail: { detail: "Deep" } })).toBe("Deep");
  });

  it("stringifies other types", () => {
    expect(getErrorMessage(42)).toBe("42");
  });
});
