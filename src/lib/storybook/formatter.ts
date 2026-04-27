import type { IToken } from "@/types/token";

type W3CTokenValue = {
  $value: string | number | boolean;
  $type: string;
};

type W3CTokenTree = {
  [key: string]: W3CTokenValue | W3CTokenTree;
};

function w3cType(tokenType: string): string {
  switch (tokenType) {
    case "Color": return "color";
    case "Number": return "number";
    case "Boolean": return "boolean";
    default: return "string";
  }
}

function setNestedValue(obj: W3CTokenTree, path: string[], value: W3CTokenValue): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key] || typeof current[key] !== "object" || "$value" in (current[key] as object)) {
      current[key] = {} as W3CTokenTree;
    }
    current = current[key] as W3CTokenTree;
  }
  current[path[path.length - 1]] = value;
}

export function formatToW3C(tokens: IToken[]): W3CTokenTree {
  const result: W3CTokenTree = {};

  for (const token of tokens) {
    const parts = token.name.split("/");
    const value: W3CTokenValue = {
      $value: token.lightValue,
      $type: w3cType(token.tokenType),
    };
    setNestedValue(result, parts, value);
  }

  return result;
}
