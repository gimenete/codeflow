import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  COMMANDS,
  filterCommands,
  type Command as CommandType,
} from "@/lib/commands";

export { filterCommands };
export type { Command } from "@/lib/commands";

interface CommandAutocompleteProps {
  filter: string;
  onSelect: (command: CommandType) => void;
  onClose: () => void;
  selectedIndex: number;
}

export function CommandAutocomplete({
  filter,
  onSelect,
  onClose,
  selectedIndex,
}: CommandAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const filteredCommands = filterCommands(filter);
  const displayCommands = filter ? filteredCommands : COMMANDS;

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0 && filter) {
    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-popover p-2 shadow-md"
      >
        <p className="text-sm text-muted-foreground">
          No command found: /{filter}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-popover shadow-md z-50 overflow-hidden"
    >
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        Commands
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {displayCommands.map((command, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={command.name}
              ref={isSelected ? selectedRef : undefined}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50",
              )}
              onClick={() => onSelect(command)}
            >
              <command.Icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium">/{command.name}</span>
                <span className="text-xs text-muted-foreground">
                  {command.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
