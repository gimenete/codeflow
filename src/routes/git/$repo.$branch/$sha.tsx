import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { FileText, Plus, Minus } from "lucide-react";
import { CommitHash } from "@/components/commit-hash";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepository, useCommitDetail, useBranches } from "@/lib/git";
import { useBreadcrumbs } from "@/lib/breadcrumbs";
import { DiffViewer } from "@/components/diff-viewer";
import { useState } from "react";

export const Route = createFileRoute("/git/$repo/$branch/$sha")({
  component: CommitDetailView,
});

function CommitDetailView() {
  const { repo, branch, sha } = Route.useParams();
  const navigate = useNavigate();
  const repository = useRepository(repo);
  const { branches, currentBranch } = useBranches(repository?.path);
  const { commit, files, isLoading } = useCommitDetail(repository?.path, sha);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const breadcrumbs = useMemo(() => {
    if (!repository) return [];
    return [
      {
        label: repository.name,
        href: `/git/${repo}/${branch}`,
        dropdown: {
          items: [
            {
              label: "All Repositories",
              onClick: () => navigate({ to: "/git" }),
            },
          ],
        },
      },
      {
        label: branch,
        href: `/git/${repo}/${branch}`,
        dropdown: {
          items: [
            {
              label: "Back to Branch",
              onClick: () =>
                navigate({
                  to: "/git/$repo/$branch",
                  params: { repo, branch },
                }),
            },
            ...branches.map((b) => ({
              label: b === currentBranch ? `${b} (current)` : b,
              onClick: () =>
                navigate({
                  to: "/git/$repo/$branch",
                  params: { repo, branch: b },
                }),
            })),
          ],
        },
      },
      {
        label: sha.substring(0, 7),
      },
    ];
  }, [repository?.name, branch, branches, currentBranch, repo, sha, navigate]);

  useBreadcrumbs(breadcrumbs);

  if (!repository) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-muted-foreground">Repository not found</p>
      </div>
    );
  }

  if (isLoading) {
    return <CommitDetailSkeleton sha={sha} />;
  }

  if (!commit) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-muted-foreground">Commit not found</p>
      </div>
    );
  }

  const selectedFileDiff = selectedFile
    ? files.find((f) => f.path === selectedFile)?.diff
    : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "added":
        return <Plus className="h-3 w-3 text-green-500" />;
      case "deleted":
        return <Minus className="h-3 w-3 text-red-500" />;
      default:
        return <FileText className="h-3 w-3 text-yellow-500" />;
    }
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="border-b px-4 py-3 space-y-2">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{commit.message}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{commit.author}</span>
            <span>{commit.date}</span>
            <CommitHash sha={sha} />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600">+{commit.additions ?? 0}</span>
          <span className="text-red-600">-{commit.deletions ?? 0}</span>
          <span className="text-muted-foreground">
            {files.length} file{files.length !== 1 && "s"} changed
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {files.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center gap-2 p-1.5 rounded text-sm cursor-pointer hover:bg-accent ${
                    selectedFile === file.path ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedFile(file.path)}
                >
                  {getStatusIcon(file.status)}
                  <span className="flex-1 truncate">{file.path}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile && selectedFileDiff ? (
            <>
              <div className="border-b px-4 py-2 flex items-center gap-2">
                <span className="text-sm font-mono truncate">
                  {selectedFile}
                </span>
              </div>
              <ScrollArea className="flex-1">
                <DiffViewer diff={selectedFileDiff} filePath={selectedFile} />
              </ScrollArea>
            </>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {files.map((file) => (
                  <div key={file.path}>
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-2">
                      {getStatusIcon(file.status)}
                      <span className="text-sm font-mono">{file.path}</span>
                    </div>
                    <DiffViewer diff={file.diff} filePath={file.path} />
                    <Separator className="mt-6" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommitDetailSkeletonProps {
  sha: string;
}

function CommitDetailSkeleton({ sha }: CommitDetailSkeletonProps) {
  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="border-b px-4 py-3 space-y-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <CommitHash sha={sha} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r p-2 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>

        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
