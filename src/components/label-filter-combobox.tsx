import { useState } from "react";
import { Check, ChevronsUpDown, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubLabel } from "@/components/github-label";
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
import { useRepoLabels } from "@/lib/github";

interface LabelFilterComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  accountId: string;
  owner: string;
  repo: string;
  className?: string;
}

export function LabelFilterCombobox({
  value,
  onChange,
  accountId,
  owner,
  repo,
  className,
}: LabelFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: repoLabels } = useRepoLabels(accountId, owner, repo);

  const toggleLabel = (labelName: string) => {
    if (value.includes(labelName)) {
      onChange(value.filter((l) => l !== labelName));
    } else {
      onChange([...value, labelName]);
    }
  };

  const handleClear = () => {
    onChange([]);
    setOpen(false);
  };

  const displayText =
    value.length === 0
      ? "Labels"
      : value.length === 1
        ? `Label: ${value[0]}`
        : `Labels: ${value.length} selected`;

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
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <Tag className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span className="truncate">{displayText}</span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Filter labels..." />
            <CommandList>
              {value.length > 0 && (
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
              {repoLabels && repoLabels.length > 0 ? (
                <CommandGroup heading="Labels">
                  {repoLabels.map((label) => (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={() => toggleLabel(label.name)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value.includes(label.name)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <GitHubLabel name={label.name} color={label.color} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No labels found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
