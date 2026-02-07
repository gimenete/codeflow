import { useState, useCallback } from "react";
import { Check, ChevronsUpDown, UsersRound, X } from "lucide-react";
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
import { useOrgTeams } from "@/lib/queries";

interface TeamComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  accountId: string;
  owner: string;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function TeamCombobox({
  value,
  onChange,
  accountId,
  owner,
  placeholder = "Team",
  label,
  className,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: teams } = useOrgTeams(accountId, owner);

  const displayValue = value ?? "";

  const handleSelect = useCallback(
    (slug: string) => {
      onChange(slug);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
    setOpen(false);
  }, [onChange]);

  if (!teams || teams.length === 0) return null;

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
            <CommandInput placeholder="Search teams..." />
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
              {teams.length > 0 ? (
                <CommandGroup heading="Teams">
                  {teams.map((team) => (
                    <CommandItem
                      key={team.slug}
                      value={team.slug}
                      onSelect={() => handleSelect(team.combinedSlug)}
                      className="flex items-center gap-2"
                    >
                      <UsersRound className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{team.name}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          displayValue === team.combinedSlug
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No teams found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
