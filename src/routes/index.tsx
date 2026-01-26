import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MoreHorizontal, Pencil, Plus, Trash2, User } from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccounts, useAddAccountDialog } from "@/lib/auth";
import type {
  GitHubAccount,
  SavedQuery,
  SavedQueryGroup,
} from "@/lib/github-types";
import { useLocalRepositories, useAddRepositoryDialog } from "@/lib/git";
import { isTauri } from "@/lib/platform";
import {
  useSavedQueryGroups,
  useSavedQueriesStore,
} from "@/lib/saved-queries-store";
import { useSearchResults } from "@/lib/queries";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { AddRepositoryDialog } from "@/components/add-repository-dialog";
import { AddGroupDialog } from "@/components/add-group-dialog";
import { SavedQueryListItem } from "@/components/saved-query-list-item";
import {
  SearchResultItem,
  SearchResultItemSkeleton,
} from "@/components/search-result-item";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    addAccount: search.addAccount === true,
  }),
  component: HomePage,
});

function HomePage() {
  const { addAccount } = Route.useSearch();
  const { accounts } = useAccounts();
  const { repositories } = useLocalRepositories();
  const { isOpen: isAddAccountOpen, setOpen: setAddAccountOpen } =
    useAddAccountDialog(addAccount);
  const { isOpen: isAddRepoOpen, setOpen: setAddRepoOpen } =
    useAddRepositoryDialog();

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome to Codeflow</h1>
        </div>

        {isTauri() && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <RepoIcon size={20} />
                Local Repositories
              </h2>
              <Button size="sm" onClick={() => setAddRepoOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Repository
              </Button>
            </div>

            {repositories.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No local repositories configured.
                  <br />
                  Click "Add Repository" to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repositories.map((repo) => (
                  <Link
                    key={repo.id}
                    to="/git/$repo"
                    params={{ repo: repo.id }}
                    className="block"
                  >
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{repo.name}</CardTitle>
                        <CardDescription className="text-xs truncate">
                          {repo.path}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              GitHub Accounts
            </h2>
            <Button size="sm" onClick={() => setAddAccountOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No GitHub accounts configured.
                <br />
                Click "Add Account" to connect your GitHub account.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {accounts.map((account) => (
                <AccountQueries key={account.id} account={account} />
              ))}
            </div>
          )}
        </section>

        <AddAccountDialog
          open={isAddAccountOpen}
          onOpenChange={setAddAccountOpen}
        />
        {isTauri() && (
          <AddRepositoryDialog
            open={isAddRepoOpen}
            onOpenChange={setAddRepoOpen}
          />
        )}
      </div>
    </div>
  );
}

function AccountQueries({ account }: { account: GitHubAccount }) {
  const groups = useSavedQueryGroups(account.id);
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  // Separate default (high priority) group from other groups
  const defaultGroup = groups.find((g) => g.id === "default");
  const otherGroups = groups.filter((g) => g.id !== "default");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={account.avatarUrl} />
          <AvatarFallback>
            {account.login.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">@{account.login}</span>
        <span>{account.host}</span>
      </div>

      {/* High Priority group with tabs */}
      {defaultGroup && defaultGroup.queries.length > 0 && (
        <HighPriorityGroup accountId={account.id} group={defaultGroup} />
      )}

      {/* Other groups in horizontal scroll with cards */}
      {(otherGroups.length > 0 || defaultGroup) && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-min">
            {otherGroups.map((group) => (
              <QueryGroupColumn
                key={group.id}
                accountId={account.id}
                group={group}
              />
            ))}
            <AddGroupColumn onAddClick={() => setAddGroupOpen(true)} />
          </div>
        </div>
      )}

      <AddGroupDialog
        accountId={account.id}
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
      />
    </div>
  );
}

function HighPriorityGroup({
  accountId,
  group,
}: {
  accountId: string;
  group: SavedQueryGroup;
}) {
  const [activeTab, setActiveTab] = useState(group.queries[0]?.id ?? "");
  const activeQuery = group.queries.find((q) => q.id === activeTab);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{group.title}</h3>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {group.queries.map((query) => (
            <TabsTrigger key={query.id} value={query.id}>
              {query.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="mt-3">
          {activeQuery && (
            <QueryResultsTable accountId={accountId} query={activeQuery} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueryResultsTable({
  accountId,
  query,
}: {
  accountId: string;
  query: SavedQuery;
}) {
  const isPR = query.filters.type === "pulls";
  const { results, isLoading, error } = useSearchResults(
    accountId,
    query.id,
    undefined,
  );

  if (isLoading) {
    return (
      <div className="border rounded-lg divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <SearchResultItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-4 text-center text-destructive">
        Error loading results: {error.message}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No results found
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {results.slice(0, 10).map((item) => (
        <SearchResultItem
          key={item.id}
          item={item}
          accountId={accountId}
          searchId={query.id}
          isPR={isPR}
          urlFilters={{}}
        />
      ))}
      {results.length > 10 && (
        <Link
          to="/$account/$search"
          params={{ account: accountId, search: query.id }}
          search={{}}
          className="block px-4 py-3 text-center text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          View all {results.length} results
        </Link>
      )}
    </div>
  );
}

function AddGroupColumn({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="min-w-[280px] flex-shrink-0 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center min-h-[200px]">
      <Button variant="ghost" onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add group
      </Button>
    </div>
  );
}

function QueryGroupColumn({
  accountId,
  group,
}: {
  accountId: string;
  group: SavedQueryGroup;
}) {
  const groups = useSavedQueryGroups(accountId);
  const currentGroup = groups.find((g) => g.id === group.id);
  const queries = currentGroup?.queries ?? [];
  const reorderQueries = useSavedQueriesStore((state) => state.reorderQueries);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = queries.findIndex((q) => q.id === active.id);
      const newIndex = queries.findIndex((q) => q.id === over.id);
      const newOrder = [...queries];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      reorderQueries(
        accountId,
        group.id,
        newOrder.map((q) => q.id),
      );
    }
  };

  return (
    <>
      <Card className="min-w-[280px] flex-shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {group.title}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={queries.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {queries.map((query) => (
                  <SavedQueryListItem
                    key={query.id}
                    accountId={accountId}
                    query={query}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <RenameGroupDialog
        accountId={accountId}
        group={group}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteGroupDialog
        accountId={accountId}
        group={group}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

function RenameGroupDialog({
  accountId,
  group,
  open,
  onOpenChange,
}: {
  accountId: string;
  group: SavedQueryGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(group.title);
  const updateGroup = useSavedQueriesStore((state) => state.updateGroup);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      updateGroup(accountId, group.id, { title: title.trim() });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Group</DialogTitle>
          <DialogDescription>
            Enter a new name for this group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGroupDialog({
  accountId,
  group,
  open,
  onOpenChange,
}: {
  accountId: string;
  group: SavedQueryGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteGroup = useSavedQueriesStore((state) => state.deleteGroup);

  const handleDelete = () => {
    deleteGroup(accountId, group.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{group.title}"? All queries in this
            group will be deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
