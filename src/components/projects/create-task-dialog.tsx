import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, GitBranch, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranches, createBranch } from "@/lib/git";
import { useTasksStore, useTaskByBranch } from "@/lib/tasks-store";

interface CreateTaskDialogProps {
  projectId: string;
  projectPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({
  projectId,
  projectPath,
  open,
  onOpenChange,
}: CreateTaskDialogProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [newBranchName, setNewBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, currentBranch } = useBranches(projectPath);
  const addTask = useTasksStore((state) => state.addTask);
  const navigate = useNavigate();
  const { project: projectSlug } = useParams({ strict: false });

  // Check if a task already exists for the selected branch
  const existingTask = useTaskByBranch(
    projectId,
    mode === "existing" ? selectedBranch : newBranchName,
  );

  // Set default branch on open
  useEffect(() => {
    if (open && branches.length > 0) {
      // Try to select a non-main branch by default if available
      const nonMainBranch = branches.find(
        (b) => b !== "main" && b !== "master" && b !== currentBranch,
      );
      setSelectedBranch(nonMainBranch ?? branches[0]);
    }
  }, [open, branches, currentBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const branch = mode === "existing" ? selectedBranch : newBranchName.trim();

    if (!branch) {
      setError("Please select or enter a branch name");
      return;
    }

    if (existingTask) {
      setError("A task already exists for this branch");
      return;
    }

    setIsLoading(true);

    try {
      // Create new branch if needed
      if (mode === "new") {
        const result = await createBranch(projectPath, branch, true);
        if (!result.success) {
          setError(result.error ?? "Failed to create branch");
          setIsLoading(false);
          return;
        }
      }

      // Create the task
      const task = addTask({
        projectId,
        branch,
        worktreePath: null,
        conversationId: null,
      });

      // Reset and close
      setSelectedBranch("");
      setNewBranchName("");
      setMode("existing");
      onOpenChange(false);

      // Navigate to the new task
      void navigate({
        to: "/projects/$project/tasks/$task",
        params: { project: projectSlug!, task: task.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedBranch("");
      setNewBranchName("");
      setMode("existing");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Create a new task from an existing branch or create a new branch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "existing" | "new")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">
                <GitBranch className="h-4 w-4 mr-2" />
                Existing Branch
              </TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="h-4 w-4 mr-2" />
                New Branch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                        {branch === currentBranch && " (current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newBranch">Branch Name</Label>
                <Input
                  id="newBranch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/my-feature"
                />
                <p className="text-xs text-muted-foreground">
                  The branch will be created from the current HEAD and checked
                  out.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {existingTask && (
            <p className="text-sm text-amber-600">
              A task already exists for this branch.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (mode === "existing" && !selectedBranch) ||
                (mode === "new" && !newBranchName.trim()) ||
                !!existingTask
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
