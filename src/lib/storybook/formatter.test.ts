import { describe, it, expect } from "vitest";
import { formatToW3C } from "./formatter";
import type { IToken } from "@/types/token";

function makeToken(overrides: Partial<IToken> = {}): IToken {
  return {
    _id: "id1",
    name: "color/primary",
    tokenType: "Color",
    lightValue: "#000",
    darkValue: "#fff",
    collection: "col1",
    group: "grp1",
    labels: [],
    associatedComponents: [],
    flagged: false,
    createdBy: "user1",
    updatedBy: "user1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as IToken;
}

describe("formatToW3C", () => {
  it("converts a single token to nested W3C structure", () => {
    const result = formatToW3C([makeToken({ name: "color/primary", lightValue: "#111" })]);
    expect(result).toEqual({
      color: { primary: { $value: "#111", $type: "color" } },
    });
  });

  it("maps Color tokenType to 'color'", () => {
    const result = formatToW3C([makeToken({ tokenType: "Color", lightValue: "#abc" })]);
    const leaf = (result as Record<string, unknown>).color as Record<string, unknown>;
    expect((leaf.primary as { $type: string }).$type).toBe("color");
  });

  it("maps Number tokenType to 'number'", () => {
    const result = formatToW3C([
      makeToken({ name: "spacing/sm", tokenType: "Number", lightValue: "8" }),
    ]);
    const leaf = (result.spacing as Record<string, unknown>).sm as { $type: string };
    expect(leaf.$type).toBe("number");
  });

  it("maps Boolean tokenType to 'boolean'", () => {
    const result = formatToW3C([
      makeToken({ name: "flag/enabled", tokenType: "Boolean", lightValue: "true" }),
    ]);
    const leaf = (result.flag as Record<string, unknown>).enabled as { $type: string };
    expect(leaf.$type).toBe("boolean");
  });

  it("maps unknown tokenType to 'string'", () => {
    const result = formatToW3C([
      makeToken({ name: "font/family", tokenType: "String", lightValue: "Inter" }),
    ]);
    const leaf = (result.font as Record<string, unknown>).family as { $type: string };
    expect(leaf.$type).toBe("string");
  });

  it("merges multiple tokens under shared parent keys", () => {
    const result = formatToW3C([
      makeToken({ name: "color/bg", lightValue: "#fff" }),
      makeToken({ _id: "id2", name: "color/fg", lightValue: "#000" }),
    ]);
    const color = result.color as Record<string, unknown>;
    expect(Object.keys(color)).toEqual(expect.arrayContaining(["bg", "fg"]));
  });

  it("uses lightValue for $value", () => {
    const result = formatToW3C([
      makeToken({ name: "color/brand", lightValue: "#1B6EF3", darkValue: "#5B9CF6" }),
    ]);
    const color = result.color as Record<string, { $value: string }>;
    expect(color.brand.$value).toBe("#1B6EF3");
  });

  it("returns empty object for empty token list", () => {
    expect(formatToW3C([])).toEqual({});
  });

  it("handles single-segment token names (no slash)", () => {
    const result = formatToW3C([makeToken({ name: "primary", lightValue: "#000" })]);
    expect(result).toEqual({ primary: { $value: "#000", $type: "color" } });
  });
});
