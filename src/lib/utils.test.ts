import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class name utility)", () => {
  it("combines multiple class names", () => {
    const result = cn("bg-primary", "text-white", "p-4");
    expect(result).toBe("bg-primary text-white p-4");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("btn", isActive && "btn-active");
    expect(result).toBe("btn btn-active");
  });

  it("filters out falsy values", () => {
    const result = cn("btn", false, null, undefined, "", "btn-primary");
    expect(result).toBe("btn btn-primary");
  });

  it("handles arrays of classes", () => {
    const result = cn(["bg-primary", "text-white"]);
    expect(result).toBe("bg-primary text-white");
  });

  it("handles object notation", () => {
    const result = cn({
      "bg-primary": true,
      "text-white": true,
      "opacity-50": false,
    });
    expect(result).toBe("bg-primary text-white");
  });

  it("merges Tailwind classes correctly (twMerge)", () => {
    // twMerge should resolve conflicting classes
    const result = cn("px-4", "px-8");
    expect(result).toBe("px-8");
  });

  it("handles conflicting Tailwind utilities", () => {
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  it("handles mixed input types", () => {
    const result = cn(
      "base-class",
      ["array-class-1", "array-class-2"],
      { "object-class": true, "ignored-class": false },
      "conditional-class"
    );
    expect(result).toBe("base-class array-class-1 array-class-2 object-class conditional-class");
  });

  it("returns empty string for no input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("returns empty string for all falsy inputs", () => {
    const result = cn(false, null, undefined, "");
    expect(result).toBe("");
  });

  it("handles whitespace correctly", () => {
    const result = cn("  btn  ", "btn-primary");
    expect(result).toBe("btn btn-primary");
  });
});
