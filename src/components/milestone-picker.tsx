import { useRef, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
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
import { useRepoMilestones } from "@/lib/github";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/lib/github-types";

interface MilestonePickerProps {
  accountId: string;
  owner: string;
  repo: string;
  currentMilestone: Milestone | null;
  onMilestoneChange: (milestoneNumber: number | null) => Promise<void>;
  children: (displayMilestone: Milestone | null) => React.ReactNode;
}

export function MilestonePicker({
  accountId,
  owner,
  repo,
  currentMilestone,
  onMilestoneChange,
  children,
}: MilestonePickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNumber, setPendingNumber] = useState<number | null>(
    currentMilestone?.number ?? null,
  );
  const { data: repoMilestones } = useRepoMilestones(accountId, owner, repo);

  const initialNumberRef = useRef<number | null>(null);

  // Sync pendingNumber from props when closed and props change
  const prevCurrentMilestoneRef = useRef(currentMilestone);
  if (!open && currentMilestone !== prevCurrentMilestoneRef.current) {
    prevCurrentMilestoneRef.current = currentMilestone;
    setPendingNumber(currentMilestone?.number ?? null);
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const num = currentMilestone?.number ?? null;
      setPendingNumber(num);
      initialNumberRef.current = num;
      setError(null);
    } else {
      if (pendingNumber !== initialNumberRef.current) {
        onMilestoneChange(pendingNumber).catch((e: unknown) => {
          setError(
            e instanceof Error ? e.message : "Failed to update milestone",
          );
        });
      }
    }
    setOpen(nextOpen);
  };

  const selectMilestone = (number: number | null) => {
    // Toggle: if already selected, clear it
    if (number === pendingNumber) {
      setPendingNumber(null);
    } else {
      setPendingNumber(number);
    }
  };

  // Always derive display from pendingNumber to avoid flash when closing
  const displayMilestone = buildDisplayMilestone(
    pendingNumber,
    currentMilestone,
    repoMilestones ?? [],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children(displayMilestone)}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter milestones..." />
          <CommandList>
            <CommandEmpty>No milestones found.</CommandEmpty>
            <CommandItem
              value="__none__"
              onSelect={() => selectMilestone(null)}
            >
              <Check
                className={cn(
                  "h-4 w-4 mr-2 shrink-0",
                  pendingNumber === null ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="text-muted-foreground">None</span>
            </CommandItem>
            {repoMilestones?.map((milestone) => (
              <CommandItem
                key={milestone.number}
                value={milestone.title}
                onSelect={() => selectMilestone(milestone.number)}
              >
                <Check
                  className={cn(
                    "h-4 w-4 mr-2 shrink-0",
                    pendingNumber === milestone.number
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                <span className="truncate">{milestone.title}</span>
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

function buildDisplayMilestone(
  pendingNumber: number | null,
  currentMilestone: Milestone | null,
  repoMilestones: {
    number: number;
    title: string;
    state: string;
    dueOn: string | null;
  }[],
): Milestone | null {
  if (pendingNumber === null) return null;
  if (currentMilestone && currentMilestone.number === pendingNumber) {
    return currentMilestone;
  }
  const found = repoMilestones.find((m) => m.number === pendingNumber);
  if (found) {
    return {
      number: found.number,
      title: found.title,
      url: "",
      dueOn: found.dueOn,
      state: found.state === "open" ? "OPEN" : "CLOSED",
    };
  }
  return null;
}
