import { useState, useCallback, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
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
import { useRepoSearch } from "@/lib/queries";
import type { GitHubRepo } from "@/lib/github";

interface RepoComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  accountId: string;
  className?: string;
}

export function RepoCombobox({
  value,
  onChange,
  accountId,
  className,
}: RepoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const displayValue = value ?? "";

  const { data: repos, isLoading } = useRepoSearch(accountId, debouncedQuery);

  // Debounce the search query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue]);

  // Reset input when popover closes
  useEffect(() => {
    if (!open) {
      setInputValue("");
      setDebouncedQuery("");
    }
  }, [open]);

  const handleSelect = useCallback(
    (repo: GitHubRepo) => {
      onChange(repo.fullName);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
    setOpen(false);
  }, [onChange]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 w-40 justify-between font-normal",
              !displayValue && "text-muted-foreground",
            )}
          >
            <div className="flex items-center gap-1.5 truncate">
              <RepoIcon size={14} className="shrink-0" />
              <span className="truncate">
                {displayValue ? `Repo: ${displayValue}` : "All repos"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search repos..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {displayValue && (
                <>
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleClear}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : repos && repos.length > 0 ? (
                <CommandGroup heading="Search results">
                  {repos.map((repo) => (
                    <CommandItem
                      key={repo.fullName}
                      value={repo.fullName}
                      onSelect={() => handleSelect(repo)}
                      className="flex items-center gap-2"
                    >
                      <RepoIcon size={14} className="shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{repo.fullName}</span>
                        {repo.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {repo.description}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0",
                          displayValue === repo.fullName
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : debouncedQuery.length >= 2 ? (
                <CommandEmpty>No repos found.</CommandEmpty>
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
