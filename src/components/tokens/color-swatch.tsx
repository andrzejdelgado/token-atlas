import { cn } from "@/lib/utils";

interface ColorSwatchProps {
  lightValue: string;
  darkValue?: string;
  size?: "sm" | "md";
  className?: string;
}

export function ColorSwatch({ lightValue, darkValue, size = "sm", className }: ColorSwatchProps) {
  const isColor = /^#|^rgb|^hsl|^oklch/.test(lightValue);
  if (!isColor) return null;

  const sz = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        className={cn("border-border/50 shrink-0 rounded border", sz)}
        style={{ backgroundColor: lightValue }}
        title={`Light: ${lightValue}`}
      />
      {darkValue && darkValue !== lightValue && (
        <span
          className={cn("border-border/50 shrink-0 rounded border", sz)}
          style={{ backgroundColor: darkValue }}
          title={`Dark: ${darkValue}`}
        />
      )}
    </div>
  );
}
