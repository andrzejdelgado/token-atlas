import { describe, it, expect } from "vitest";
import { applyBulkRename, previewBulkRename } from "./token-names";

describe("applyBulkRename", () => {
  it("removes a substring", () => {
    expect(applyBulkRename("color/bg/primary", { remove: "color/" })).toBe("bg/primary");
  });

  it("removes all occurrences of the substring", () => {
    expect(applyBulkRename("a/a/b", { remove: "a/" })).toBe("b");
  });

  it("swaps a substring", () => {
    expect(applyBulkRename("color/background", { swap: { find: "background", replace: "bg" } })).toBe(
      "color/bg"
    );
  });

  it("swaps all occurrences", () => {
    expect(
      applyBulkRename("a/a/b", { swap: { find: "a", replace: "x" } })
    ).toBe("x/x/b");
  });

  it("adds a prefix", () => {
    expect(applyBulkRename("primary", { prefix: "color/" })).toBe("color/primary");
  });

  it("adds a suffix", () => {
    expect(applyBulkRename("primary", { suffix: "/default" })).toBe("primary/default");
  });

  it("applies remove before swap", () => {
    expect(
      applyBulkRename("old/color/bg", { remove: "old/", swap: { find: "color", replace: "clr" } })
    ).toBe("clr/bg");
  });

  it("applies prefix and suffix together", () => {
    expect(applyBulkRename("btn", { prefix: "comp/", suffix: "/base" })).toBe("comp/btn/base");
  });

  it("returns original name when no options match", () => {
    expect(applyBulkRename("color/primary", {})).toBe("color/primary");
  });
});

describe("previewBulkRename", () => {
  const tokens = [
    { _id: "1", name: "color/primary" },
    { _id: "2", name: "color/secondary" },
  ];

  it("returns one preview entry per token", () => {
    const result = previewBulkRename(tokens, { prefix: "new/" });
    expect(result).toHaveLength(2);
  });

  it("includes tokenId, originalName, and newName", () => {
    const result = previewBulkRename(tokens, { prefix: "new/" });
    expect(result[0].tokenId).toBe("1");
    expect(result[0].originalName).toBe("color/primary");
    expect(result[0].newName).toBe("new/color/primary");
  });

  it("includes a change entry for prefix", () => {
    const result = previewBulkRename(tokens, { prefix: "new/" });
    expect(result[0].changes).toContainEqual({ type: "prefix", segment: "new/" });
  });

  it("includes change entries for all active operations", () => {
    const result = previewBulkRename(tokens, {
      remove: "color/",
      swap: { find: "primary", replace: "brand" },
      prefix: "tok/",
      suffix: "/v2",
    });
    const types = result[0].changes.map((c) => c.type);
    expect(types).toEqual(["remove", "swap", "prefix", "suffix"]);
  });

  it("returns empty changes array when no options provided", () => {
    const result = previewBulkRename(tokens, {});
    expect(result[0].changes).toEqual([]);
  });
});
