import type { BulkRenameOptions, BulkRenamePreview } from "@/types/token";

export function applyBulkRename(name: string, options: BulkRenameOptions): string {
  let result = name;
  if (options.remove) {
    result = result.split(options.remove).join("");
  }
  if (options.swap) {
    result = result.split(options.swap.find).join(options.swap.replace);
  }
  if (options.prefix) {
    result = options.prefix + result;
  }
  if (options.suffix) {
    result = result + options.suffix;
  }
  return result;
}

export function previewBulkRename(
  tokens: Array<{ _id: string; name: string }>,
  options: BulkRenameOptions
): BulkRenamePreview[] {
  return tokens.map((token) => {
    const changes: BulkRenamePreview["changes"] = [];

    if (options.remove) {
      changes.push({ type: "remove", segment: options.remove });
    }
    if (options.swap) {
      changes.push({ type: "swap", segment: options.swap.find });
    }
    if (options.prefix) {
      changes.push({ type: "prefix", segment: options.prefix });
    }
    if (options.suffix) {
      changes.push({ type: "suffix", segment: options.suffix });
    }

    return {
      tokenId: token._id,
      originalName: token.name,
      newName: applyBulkRename(token.name, options),
      changes,
    };
  });
}
