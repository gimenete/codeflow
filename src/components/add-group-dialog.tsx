import { useState, useCallback, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useRepoSearch } from "@/lib/queries";
import { useSavedQueriesStore, slugify } from "@/lib/saved-queries-store";
import type { SavedQuery, SavedQueryGroup } from "@/lib/github-types";
import type { GitHubRepo } from "@/lib/github";

interface AddGroupDialogProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function createRepoQueries(repo: string, accountId: string): SavedQuery[] {
  const slug = slugify(repo);
  return [
    {
      id: `${slug}-issues`,
      name: "Issues",
      icon: "issue-opened",
      filters: { type: "issues", state: "open", repo },
      accountId,
    },
    {
      id: `${slug}-pulls`,
      name: "Pull Requests",
      icon: "git-pull-request",
      filters: { type: "pulls", state: "open", repo },
      accountId,
    },
    {
      id: `${slug}-my-issues`,
      name: "Your issues",
      icon: "issue-opened",
      filters: { type: "issues", state: "open", repo, author: "@me" },
      accountId,
    },
    {
      id: `${slug}-my-pulls`,
      name: "Your pulls",
      icon: "git-pull-request",
      filters: { type: "pulls", state: "open", repo, author: "@me" },
      accountId,
    },
    {
      id: `${slug}-assigned-issues`,
      name: "Assigned issues",
      icon: "issue-opened",
      filters: { type: "issues", state: "open", repo, assignee: "@me" },
      accountId,
    },
    {
      id: `${slug}-review-requested`,
      name: "Review requested",
      icon: "eye",
      filters: { type: "pulls", state: "open", repo, reviewRequested: "@me" },
      accountId,
    },
  ];
}

export function AddGroupDialog({
  accountId,
  open,
  onOpenChange,
}: AddGroupDialogProps) {
  const [selectedRepo, setSelectedRepo] = useState<string | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: repos, isLoading } = useRepoSearch(accountId, debouncedQuery);
  const addGroup = useSavedQueriesStore((state) => state.addGroup);

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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedRepo(undefined);
      setInputValue("");
      setDebouncedQuery("");
    }
  }, [open]);

  // Reset input when popover closes
  useEffect(() => {
    if (!popoverOpen) {
      setInputValue("");
      setDebouncedQuery("");
    }
  }, [popoverOpen]);

  const handleSelect = useCallback((repo: GitHubRepo) => {
    setSelectedRepo(repo.fullName);
    setPopoverOpen(false);
  }, []);

  const handleSubmit = () => {
    if (!selectedRepo) return;

    const group: SavedQueryGroup = {
      id: slugify(selectedRepo),
      title: selectedRepo,
      queries: createRepoQueries(selectedRepo, accountId),
    };

    addGroup(accountId, group);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Repository Group</DialogTitle>
          <DialogDescription>
            Select a repository to create a group with predefined queries for
            issues, pull requests, and your activity.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  !selectedRepo && "text-muted-foreground",
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <RepoIcon size={14} className="shrink-0" />
                  <span className="truncate">
                    {selectedRepo ?? "Select a repository..."}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search repos..."
                  value={inputValue}
                  onValueChange={setInputValue}
                />
                <CommandList>
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
                              selectedRepo === repo.fullName
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedRepo}>
            Add Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
