import { cn } from "@/lib/utils";

interface GitHubLabelProps {
  name: string;
  color: string; // hex without #
  className?: string;
}

function getContrastColor(hexColor: string): "white" | "black" {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "black" : "white";
}

export function GitHubLabel({ name, color, className }: GitHubLabelProps) {
  const textColor = getContrastColor(color);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: `#${color}`,
        color: textColor,
      }}
    >
      {name}
    </span>
  );
}
