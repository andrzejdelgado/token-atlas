import { describe, it, expect } from "vitest";
import { flattenW3C, w3cTypeToTokenType } from "./w3c-tokens";

describe("flattenW3C", () => {
  it("flattens a single token at root level", () => {
    const result = flattenW3C({ primary: { $value: "#000", $type: "color" } });
    expect(result).toEqual([{ name: "primary", value: "#000", type: "color" }]);
  });

  it("flattens nested tokens with slash-joined paths", () => {
    const result = flattenW3C({
      color: {
        background: { $value: "#fff", $type: "color" },
      },
    });
    expect(result).toEqual([{ name: "color/background", value: "#fff", type: "color" }]);
  });

  it("flattens deeply nested tokens", () => {
    const result = flattenW3C({
      color: {
        text: {
          primary: { $value: "#111", $type: "color" },
          muted: { $value: "#666", $type: "color" },
        },
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("color/text/primary");
    expect(result[1].name).toBe("color/text/muted");
  });

  it("defaults type to String when $type is absent", () => {
    const result = flattenW3C({ myToken: { $value: "sans-serif" } });
    expect(result[0].type).toBe("String");
  });

  it("coerces numeric $value to string", () => {
    const result = flattenW3C({ gap: { $value: 16, $type: "number" } });
    expect(result[0].value).toBe("16");
  });

  it("coerces boolean $value to string", () => {
    const result = flattenW3C({ visible: { $value: true, $type: "boolean" } });
    expect(result[0].value).toBe("true");
  });

  it("returns empty array for empty tree", () => {
    expect(flattenW3C({})).toEqual([]);
  });

  it("prepends prefix when provided", () => {
    const result = flattenW3C({ token: { $value: "x" } }, "base");
    expect(result[0].name).toBe("base/token");
  });
});

describe("w3cTypeToTokenType", () => {
  it("maps color to Color", () => {
    expect(w3cTypeToTokenType("color")).toBe("Color");
  });

  it("is case-insensitive", () => {
    expect(w3cTypeToTokenType("COLOR")).toBe("Color");
    expect(w3cTypeToTokenType("Number")).toBe("Number");
  });

  it("maps number to Number", () => {
    expect(w3cTypeToTokenType("number")).toBe("Number");
  });

  it("maps boolean to Boolean", () => {
    expect(w3cTypeToTokenType("boolean")).toBe("Boolean");
  });

  it("maps unknown types to String", () => {
    expect(w3cTypeToTokenType("dimension")).toBe("String");
    expect(w3cTypeToTokenType("fontFamily")).toBe("String");
    expect(w3cTypeToTokenType("")).toBe("String");
  });
});
