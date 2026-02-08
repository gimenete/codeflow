import { useRef, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { GitHubLabel } from "@/components/github-label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { useRepoLabels } from "@/lib/github";
import { cn } from "@/lib/utils";

interface LabelPickerProps {
  accountId: string;
  owner: string;
  repo: string;
  currentLabels: { name: string; color: string }[];
  onLabelsChange: (labels: string[]) => Promise<void>;
  children: (
    displayLabels: { name: string; color: string }[],
  ) => React.ReactNode;
}

export function LabelPicker({
  accountId,
  owner,
  repo,
  currentLabels,
  onLabelsChange,
  children,
}: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNames, setPendingNames] = useState<Set<string>>(
    () => new Set(currentLabels.map((l) => l.name)),
  );
  const { data: repoLabels } = useRepoLabels(accountId, owner, repo);

  // Snapshot the initial selection when opening so we can diff on close
  const initialNamesRef = useRef<Set<string>>(new Set());

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Opening: snapshot current selection
      const names = new Set(currentLabels.map((l) => l.name));
      setPendingNames(names);
      initialNamesRef.current = new Set(names);
      setError(null);
    } else {
      // Closing: flush to server if changed
      const initial = initialNamesRef.current;
      const changed =
        pendingNames.size !== initial.size ||
        [...pendingNames].some((n) => !initial.has(n));
      if (changed) {
        onLabelsChange(Array.from(pendingNames)).catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Failed to update labels");
        });
      }
    }
    setOpen(nextOpen);
  };

  const toggleLabel = (labelName: string) => {
    setPendingNames((prev) => {
      const next = new Set(prev);
      if (next.has(labelName)) {
        next.delete(labelName);
      } else {
        next.add(labelName);
      }
      return next;
    });
  };

  // When open, show pending selections; when closed, show current server state
  const displayLabels = open
    ? buildDisplayLabels(pendingNames, currentLabels, repoLabels ?? [])
    : currentLabels;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children(displayLabels)}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter labels..." />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            {repoLabels?.map((label) => (
              <CommandItem
                key={label.id}
                value={label.name}
                onSelect={() => toggleLabel(label.name)}
              >
                <Check
                  className={cn(
                    "h-4 w-4 mr-2 shrink-0",
                    pendingNames.has(label.name) ? "opacity-100" : "opacity-0",
                  )}
                />
                <GitHubLabel name={label.name} color={label.color} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive p-2 border-t">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function buildDisplayLabels(
  names: Set<string>,
  currentLabels: { name: string; color: string }[],
  repoLabels: { name: string; color: string }[],
): { name: string; color: string }[] {
  const colorMap = new Map<string, string>();
  for (const l of currentLabels) colorMap.set(l.name, l.color);
  for (const l of repoLabels) colorMap.set(l.name, l.color);
  return Array.from(names).map((name) => ({
    name,
    color: colorMap.get(name) ?? "cccccc",
  }));
}
