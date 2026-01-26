import { DeleteQueryDialog } from "@/components/delete-query-dialog";
import { EditQueryDialog } from "@/components/edit-query-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedQuery } from "@/lib/github-types";
import { getIconById } from "@/lib/query-icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

interface SavedQueryListItemProps {
  accountId: string;
  query: SavedQuery;
}

export function SavedQueryListItem({
  accountId,
  query,
}: SavedQueryListItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: query.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getIconById(query.icon);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 rounded-md ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <Icon size={16} />

        <Link
          to="/$account/$search"
          params={{ account: accountId, search: query.id }}
          search={{}}
          className="flex-1 truncate font-medium hover:underline"
        >
          {query.name}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
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

      <EditQueryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        accountId={accountId}
        query={query}
      />
      <DeleteQueryDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        accountId={accountId}
        query={query}
      />
    </>
  );
}
