import { useState, useCallback, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useUserSearch } from "@/lib/queries";
import { getAccount } from "@/lib/auth";
import type { GitHubUser } from "@/lib/github";

interface UserComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  accountId: string;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function UserCombobox({
  value,
  onChange,
  accountId,
  placeholder = "Search users...",
  label,
  className,
}: UserComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const displayValue = value ?? "";

  const { data: users, isLoading } = useUserSearch(accountId, debouncedQuery);

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

  const currentAccount = getAccount(accountId);

  const handleSelect = useCallback(
    (user: GitHubUser | string) => {
      onChange(typeof user === "string" ? user : user.login);
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
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search users..."
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
                      <span>Clear selection</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              {currentAccount && (
                <CommandGroup heading="Current user">
                  <CommandItem
                    value="@me"
                    onSelect={() => handleSelect("@me")}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={currentAccount.avatarUrl} />
                      <AvatarFallback>
                        {currentAccount.login.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>@me</span>
                    <span className="text-muted-foreground text-xs">
                      ({currentAccount.login})
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        displayValue === "@me" ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                </CommandGroup>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : users && users.length > 0 ? (
                <CommandGroup heading="Search results">
                  {users.map((user) => (
                    <CommandItem
                      key={user.login}
                      value={user.login}
                      onSelect={() => handleSelect(user)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                          {user.login.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.login}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          displayValue === user.login
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : debouncedQuery.length >= 2 ? (
                <CommandEmpty>No users found.</CommandEmpty>
              ) : undefined}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
