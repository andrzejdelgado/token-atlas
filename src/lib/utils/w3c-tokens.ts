export interface W3CToken {
  $value: string | number | boolean;
  $type?: string;
}

export type W3CTree = { [key: string]: W3CToken | W3CTree };

export function flattenW3C(
  tree: W3CTree,
  prefix = ""
): Array<{ name: string; value: string; type: string }> {
  const result: Array<{ name: string; value: string; type: string }> = [];
  for (const [key, val] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${key}` : key;
    if (val && typeof val === "object" && "$value" in val) {
      const token = val as W3CToken;
      result.push({
        name: path,
        value: String(token.$value),
        type: token.$type ?? "String",
      });
    } else {
      result.push(...flattenW3C(val as W3CTree, path));
    }
  }
  return result;
}

export function w3cTypeToTokenType(type: string): string {
  switch (type.toLowerCase()) {
    case "color":
      return "Color";
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    default:
      return "String";
  }
}
