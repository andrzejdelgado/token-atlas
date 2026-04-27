import type { IToken } from "@/types/token";

interface FigmaVariableValue {
  type: "FLOAT" | "STRING" | "BOOLEAN" | "COLOR";
  value: number | string | boolean | { r: number; g: number; b: number; a: number };
}

interface FigmaVariable {
  name: string;
  variableCollectionId: string;
  resolvedType: "FLOAT" | "STRING" | "BOOLEAN" | "COLOR";
  valuesByMode: Record<string, FigmaVariableValue>;
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return { r, g, b, a: 1 };
}

function tokenTypeToFigmaType(type: string): FigmaVariable["resolvedType"] {
  switch (type) {
    case "Color": return "COLOR";
    case "Number": return "FLOAT";
    case "Boolean": return "BOOLEAN";
    default: return "STRING";
  }
}

function valueToFigma(token: IToken, mode: "light" | "dark"): FigmaVariableValue["value"] {
  const raw = mode === "light" ? token.lightValue : (token.darkValue ?? token.lightValue);
  switch (token.tokenType) {
    case "Color": return hexToRgba(raw);
    case "Number": return parseFloat(raw);
    case "Boolean": return raw === "true";
    default: return raw;
  }
}

export function mapTokensToFigma(
  tokens: IToken[],
  collectionId: string,
  lightModeId: string,
  darkModeId: string
): FigmaVariable[] {
  return tokens.map((token) => ({
    name: token.name,
    variableCollectionId: collectionId,
    resolvedType: tokenTypeToFigmaType(token.tokenType),
    valuesByMode: {
      [lightModeId]: {
        type: tokenTypeToFigmaType(token.tokenType),
        value: valueToFigma(token, "light"),
      },
      [darkModeId]: {
        type: tokenTypeToFigmaType(token.tokenType),
        value: valueToFigma(token, "dark"),
      },
    },
  }));
}
