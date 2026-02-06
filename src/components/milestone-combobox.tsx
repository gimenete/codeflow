import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useRepoMilestones } from "@/lib/github";

interface MilestoneComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  accountId: string;
  owner: string;
  repo: string;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function MilestoneCombobox({
  value,
  onChange,
  accountId,
  owner,
  repo,
  placeholder = "Milestone",
  label,
  className,
}: MilestoneComboboxProps) {
  const [open, setOpen] = useState(false);

  const displayValue = value ?? "";

  const { data: milestones } = useRepoMilestones(accountId, owner, repo);

  const handleSelect = (title: string) => {
    onChange(title);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 w-full justify-between font-normal",
              !displayValue && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {displayValue
                ? label
                  ? `${label}: ${displayValue}`
                  : displayValue
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Filter milestones..." />
            <CommandList>
              {displayValue && (
                <>
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleClear}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear selection</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              {milestones && milestones.length > 0 ? (
                <CommandGroup heading="Milestones">
                  {milestones.map((m) => (
                    <CommandItem
                      key={m.number}
                      value={m.title}
                      onSelect={() => handleSelect(m.title)}
                      className="flex items-center gap-2"
                    >
                      <span className="truncate">{m.title}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          displayValue === m.title
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No milestones found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
