/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { GraphQLClient } from "graphql-request";
import { Octokit } from "@octokit/rest";
import { GET_ISSUE_OR_PR } from "@/queries/issue-or-pr-detail";
import { GET_ISSUE_OR_PR_METADATA } from "@/queries/issue-or-pr-metadata";
import {
  GET_ISSUE_TIMELINE,
  GET_PR_TIMELINE,
} from "@/queries/issue-or-pr-timeline";
import { GET_PR_COMMITS } from "@/queries/pr-commits";
import { GET_PR_STATUS, type PRStatusResponse } from "@/queries/pr-status";
import {
  SEARCH_WITH_CURSORS,
  type SearchNavigationItem,
  type SearchNavigationResponse,
} from "@/queries/search-navigation";
import type {
  GitHubAccount,
  PullRequest,
  Issue,
  PullRequestDetail,
  IssueDetail,
  PullRequestMetadata,
  IssueMetadata,
  TimelinePage,
  CommitsPage,
  QueryFilters,
  SavedQuery,
  StatusCheckRollupState,
  ReviewDecision,
  PRFileInfo,
  PRFilesPage,
  DiffSource,
  SearchResultsPage,
} from "./github-types";
import type {
  GetIssueOrPrMetadataQuery,
  GetIssueTimelineQuery,
  GetPrTimelineQuery,
} from "@/generated/graphql";
import type { TimelineNode } from "@/components/timeline-events";
import { getAccount } from "./auth";

function getGraphQLClient(account: GitHubAccount): GraphQLClient {
  const endpoint =
    account.host === "github.com"
      ? "https://api.github.com/graphql"
      : `https://${account.host}/api/graphql`;

  return new GraphQLClient(endpoint, {
    headers: {
      Authorization: `Bearer ${account.token}`,
    },
  });
}

function getOctokit(account: GitHubAccount): Octokit {
  const baseUrl =
    account.host === "github.com"
      ? "https://api.github.com"
      : `https://${account.host}/api/v3`;

  return new Octokit({
    auth: account.token,
    baseUrl,
  });
}

function resolveFilterValue(
  value: string,
  login: string,
): { prefix: string; resolved: string } {
  const isNegated = value.startsWith("-");
  const rawValue = isNegated ? value.slice(1) : value;
  const resolved = rawValue === "@me" ? login : rawValue;
  return { prefix: isNegated ? "-" : "", resolved };
}

export function buildSearchQuery(
  account: GitHubAccount,
  filters: QueryFilters,
  isPR: boolean,
): string {
  const parts: string[] = [];

  parts.push(isPR ? "is:pr" : "is:issue");

  if (filters.state && filters.state !== "all") {
    if (filters.state === "merged") {
      parts.push("is:merged");
    } else if (filters.state === "draft") {
      parts.push("draft:true");
    } else {
      parts.push(`is:${filters.state}`);
    }
  }

  if (filters.author) {
    const { prefix, resolved } = resolveFilterValue(
      filters.author,
      account.login,
    );
    parts.push(`${prefix}author:${resolved}`);
  }

  if (filters.assignee) {
    const { prefix, resolved } = resolveFilterValue(
      filters.assignee,
      account.login,
    );
    parts.push(`${prefix}assignee:${resolved}`);
  }

  if (filters.reviewRequested) {
    const { prefix, resolved } = resolveFilterValue(
      filters.reviewRequested,
      account.login,
    );
    parts.push(`${prefix}review-requested:${resolved}`);
  }

  if (filters.mentioned) {
    const { prefix, resolved } = resolveFilterValue(
      filters.mentioned,
      account.login,
    );
    parts.push(`${prefix}mentions:${resolved}`);
  }

  if (filters.repo) {
    const isNegated = filters.repo.startsWith("-");
    const repoValue = isNegated ? filters.repo.slice(1) : filters.repo;
    const prefix = isNegated ? "-" : "";
    parts.push(`${prefix}repo:${repoValue}`);
  }

  if (filters.label && filters.label.length > 0) {
    filters.label.forEach((l) => parts.push(`label:"${l}"`));
  }

  return parts.join(" ");
}

const SEARCH_PER_PAGE = 50;

export async function searchIssuesAndPulls(
  account: GitHubAccount,
  filters: QueryFilters,
  isPR: boolean,
  page: number = 1,
): Promise<SearchResultsPage> {
  const octokit = getOctokit(account);
  const query = buildSearchQuery(account, filters, isPR);

  try {
    const response = await octokit.search.issuesAndPullRequests({
      q: query,
      sort: "updated",
      order: "desc",
      per_page: SEARCH_PER_PAGE,
      page,
    });

    const items = response.data.items.map((item) => {
      const isPullRequest = "pull_request" in item;
      const baseResult = {
        id: String(item.id),
        number: item.number,
        title: item.title,
        state: item.state as "open" | "closed",
        author: {
          login: item.user?.login ?? "unknown",
          avatarUrl: item.user?.avatar_url ?? "",
        },
        labels: (item.labels ?? []).map((l) =>
          typeof l === "string"
            ? { name: l, color: "cccccc" }
            : { name: l.name ?? "", color: l.color ?? "cccccc" },
        ),
        repository: item.repository_url.replace(
          "https://api.github.com/repos/",
          "",
        ),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };

      if (isPullRequest) {
        return {
          ...baseResult,
          isDraft: item.draft ?? false,
        } as PullRequest;
      }
      return baseResult as Issue;
    });

    const totalFetched = (page - 1) * SEARCH_PER_PAGE + items.length;
    const hasNextPage = totalFetched < response.data.total_count;

    return {
      items,
      totalCount: response.data.total_count,
      hasNextPage,
    };
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
}

export async function getQueryCount(
  account: GitHubAccount,
  query: SavedQuery,
): Promise<number> {
  const octokit = getOctokit(account);
  const searchQuery = buildSearchQuery(
    account,
    query.filters,
    query.filters.type === "pulls",
  );

  try {
    const response = await octokit.search.issuesAndPullRequests({
      q: searchQuery,
      per_page: 1,
    });
    return response.data.total_count;
  } catch (error) {
    console.error("Count query failed:", error);
    return 0;
  }
}

export async function fetchIssueOrPRDetail(
  account: GitHubAccount,
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestDetail | IssueDetail> {
  const client = getGraphQLClient(account);

  const response = await client.request<{
    repository: {
      issueOrPullRequest: any;
    };
  }>(GET_ISSUE_OR_PR, { owner, repo, number });

  const item = response.repository.issueOrPullRequest;

  if (!item) {
    throw new Error("Not found");
  }

  const isPR = item.__typename === "PullRequest";

  const timeline = (item.timelineItems?.nodes ?? [])
    .filter(Boolean)
    .map((node: any) => {
      switch (node.__typename) {
        case "IssueComment":
          return {
            type: "comment",
            author: node.author ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
            bodyHTML: node.bodyHTML,
          };
        case "PullRequestReview":
          return {
            type: "review",
            author: node.author ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
            bodyHTML: node.bodyHTML,
            state: node.state,
          };
        case "PullRequestCommit":
          return {
            type: "commit",
            author: {
              login:
                node.commit.author?.user?.login ??
                node.commit.author?.name ??
                "unknown",
              avatarUrl: node.commit.author?.avatarUrl ?? "",
            },
            createdAt: node.commit.committedDate,
            sha: node.commit.oid,
            message: node.commit.message,
          };
        case "LabeledEvent":
          return {
            type: "labeled",
            author: node.actor ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
            label: node.label,
          };
        case "UnlabeledEvent":
          return {
            type: "unlabeled",
            author: node.actor ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
            label: node.label,
          };
        case "MergedEvent":
          return {
            type: "merged",
            author: node.actor ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
          };
        case "ClosedEvent":
          return {
            type: "closed",
            author: node.actor ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
          };
        case "ReopenedEvent":
          return {
            type: "reopened",
            author: node.actor ?? { login: "ghost", avatarUrl: "" },
            createdAt: node.createdAt,
          };
        default:
          return null;
      }
    })
    .filter(Boolean);

  if (isPR) {
    const prData: PullRequestDetail = {
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state.toLowerCase(),
      merged: item.merged,
      author: item.author ?? { login: "ghost", avatarUrl: "" },
      labels: (item.labels?.nodes ?? []).map((l: any) => ({
        name: l.name,
        color: l.color,
      })),
      assignees: (item.assignees?.nodes ?? []).map((a: any) => ({
        login: a.login,
        avatarUrl: a.avatarUrl,
      })),
      reviewRequests: (item.reviewRequests?.nodes ?? [])
        .filter((n: any) => n.requestedReviewer)
        .map((n: any) => ({
          login: n.requestedReviewer.login,
          name: n.requestedReviewer.name,
          avatarUrl: n.requestedReviewer.avatarUrl ?? "",
        })),
      latestReviews: (item.latestOpinionatedReviews?.nodes ?? [])
        .filter((n: any) => n.author)
        .map((n: any) => ({
          author: {
            login: n.author.login,
            avatarUrl: n.author.avatarUrl,
          },
          state: n.state,
        })),
      milestone: item.milestone
        ? {
            title: item.milestone.title,
            url: item.milestone.url,
            dueOn: item.milestone.dueOn,
            state: item.milestone.state,
          }
        : null,
      repository: `${owner}/${repo}`,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      bodyHTML: item.bodyHTML ?? "",
      headRef: item.headRefName,
      baseRef: item.baseRefName,
      additions: item.additions,
      deletions: item.deletions,
      changedFiles: item.changedFiles,
      timeline,
      commits: (item.commits?.nodes ?? []).map((n: any) => ({
        sha: n.commit.oid,
        message: n.commit.message,
        author: {
          login:
            n.commit.author?.user?.login ?? n.commit.author?.name ?? "unknown",
          avatarUrl: n.commit.author?.avatarUrl ?? "",
        },
        date: n.commit.committedDate,
      })),
      files: (item.files?.nodes ?? []).map((f: any) => ({
        path: f.path,
        additions: f.additions,
        deletions: f.deletions,
        status: f.changeType?.toLowerCase() ?? "modified",
      })),
    };
    return prData;
  } else {
    const issueData: IssueDetail = {
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state.toLowerCase(),
      author: item.author ?? { login: "ghost", avatarUrl: "" },
      labels: (item.labels?.nodes ?? []).map((l: any) => ({
        name: l.name,
        color: l.color,
      })),
      assignees: (item.assignees?.nodes ?? []).map((a: any) => ({
        login: a.login,
        avatarUrl: a.avatarUrl,
      })),
      milestone: item.milestone
        ? {
            title: item.milestone.title,
            url: item.milestone.url,
            dueOn: item.milestone.dueOn,
            state: item.milestone.state,
          }
        : null,
      repository: `${owner}/${repo}`,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      bodyHTML: item.bodyHTML ?? "",
      timeline,
    };
    return issueData;
  }
}

export function useIssueOrPRDetail(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const account = getAccount(accountId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["github-detail", accountId, owner, repo, number],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      return fetchIssueOrPRDetail(account, owner, repo, number);
    },
    staleTime: 30000,
    enabled: !!account,
  });

  return {
    data: data ?? null,
    isLoading,
    error,
  };
}

export async function fetchIssueOrPullMetadata(
  account: GitHubAccount,
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestMetadata | IssueMetadata> {
  const client = getGraphQLClient(account);

  const response = await client.request<GetIssueOrPrMetadataQuery>(
    GET_ISSUE_OR_PR_METADATA,
    { owner, repo, number },
  );

  const item = response.repository?.issueOrPullRequest;

  if (!item) {
    throw new Error("Not found");
  }

  if (item.__typename === "PullRequest") {
    const pr = item;
    const prData: PullRequestMetadata = {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.prState.toLowerCase() as "open" | "closed",
      merged: pr.merged,
      isDraft: pr.isDraft,
      author: pr.author ?? { login: "ghost", avatarUrl: "" },
      labels: (pr.labels?.nodes ?? [])
        .filter((l): l is NonNullable<typeof l> => l != null)
        .map((l) => ({
          name: l.name,
          color: l.color,
        })),
      assignees: (pr.assignees.nodes ?? [])
        .filter((a): a is NonNullable<typeof a> => a != null)
        .map((a) => ({
          login: a.login,
          avatarUrl: a.avatarUrl,
        })),
      reviewRequests: (pr.reviewRequests?.nodes ?? [])
        .filter((n): n is NonNullable<typeof n> => n != null)
        .filter((n) => n.requestedReviewer != null)
        .map((n) => {
          const reviewer = n.requestedReviewer!;
          if (reviewer.__typename === "User") {
            return {
              login: reviewer.login,
              name: undefined,
              avatarUrl: reviewer.userAvatarUrl,
            };
          } else if (reviewer.__typename === "Team") {
            return {
              login: undefined,
              name: reviewer.name,
              avatarUrl: reviewer.teamAvatarUrl ?? "",
            };
          }
          return null;
        })
        .filter((r): r is NonNullable<typeof r> => r != null),
      latestReviews: (pr.latestOpinionatedReviews?.nodes ?? [])
        .filter((n): n is NonNullable<typeof n> => n != null)
        .filter((n) => n.author != null)
        .map((n) => ({
          author: {
            login: n.author!.login,
            avatarUrl: n.author!.avatarUrl,
          },
          state: n.state,
        })),
      milestone: pr.milestone
        ? {
            title: pr.milestone.title,
            url: pr.milestone.url,
            dueOn: pr.milestone.dueOn ?? null,
            state: pr.milestone.state,
          }
        : null,
      repository: `${owner}/${repo}`,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      bodyHTML: pr.bodyHTML,
      headRef: pr.headRefName,
      baseRef: pr.baseRefName,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      totalCommits: pr.commits.totalCount,
      mergeCommitSha: pr.mergeCommit?.oid ?? null,
      isCrossRepository: pr.isCrossRepository,
      headRepositoryOwner: pr.headRepository?.owner?.login ?? null,
      headRepositoryName: pr.headRepository?.name ?? null,
    };
    return prData;
  } else {
    const issue = item;
    const issueData: IssueMetadata = {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.issueState.toLowerCase() as "open" | "closed",
      author: issue.author ?? { login: "ghost", avatarUrl: "" },
      labels: (issue.labels?.nodes ?? [])
        .filter((l): l is NonNullable<typeof l> => l != null)
        .map((l) => ({
          name: l.name,
          color: l.color,
        })),
      assignees: (issue.assignees.nodes ?? [])
        .filter((a): a is NonNullable<typeof a> => a != null)
        .map((a) => ({
          login: a.login,
          avatarUrl: a.avatarUrl,
        })),
      milestone: issue.milestone
        ? {
            title: issue.milestone.title,
            url: issue.milestone.url,
            dueOn: issue.milestone.dueOn ?? null,
            state: issue.milestone.state,
          }
        : null,
      repository: `${owner}/${repo}`,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      bodyHTML: issue.bodyHTML,
    };
    return issueData;
  }
}

export function useIssueOrPullMetadata(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const account = getAccount(accountId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["github-metadata", accountId, owner, repo, number],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      return fetchIssueOrPullMetadata(account, owner, repo, number);
    },
    staleTime: 30000,
    enabled: !!account,
  });

  return {
    data: data ?? null,
    isLoading,
    error,
  };
}

export async function fetchIssueTimeline(
  account: GitHubAccount,
  owner: string,
  repo: string,
  number: number,
  cursor: string | null,
): Promise<TimelinePage> {
  const client = getGraphQLClient(account);

  const response = await client.request<GetIssueTimelineQuery>(
    GET_ISSUE_TIMELINE,
    { owner, repo, number, first: 50, after: cursor },
  );

  const timeline = response.repository?.issue?.timelineItems;
  if (!timeline) {
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const items = (timeline.nodes ?? []).filter(
    (node) => node !== null && node !== undefined,
  ) as TimelineNode[];

  return {
    items,
    pageInfo: {
      hasNextPage: timeline.pageInfo.hasNextPage,
      endCursor: timeline.pageInfo.endCursor ?? null,
    },
  };
}

export async function fetchPullTimeline(
  account: GitHubAccount,
  owner: string,
  repo: string,
  number: number,
  cursor: string | null,
): Promise<TimelinePage> {
  const client = getGraphQLClient(account);

  const response = await client.request<GetPrTimelineQuery>(GET_PR_TIMELINE, {
    owner,
    repo,
    number,
    first: 50,
    after: cursor,
  });

  const timeline = response.repository?.pullRequest?.timelineItems;
  if (!timeline) {
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const items = (timeline.nodes ?? []).filter(
    (node) => node !== null && node !== undefined,
  ) as TimelineNode[];

  return {
    items,
    pageInfo: {
      hasNextPage: timeline.pageInfo.hasNextPage,
      endCursor: timeline.pageInfo.endCursor ?? null,
    },
  };
}

export function useIssueOrPRTimeline(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
  isPR: boolean,
) {
  const account = getAccount(accountId);

  return useInfiniteQuery({
    queryKey: ["github-timeline", accountId, owner, repo, number, isPR],
    queryFn: async ({ pageParam }) => {
      if (!account) throw new Error("Account not found");
      if (isPR) {
        return fetchPullTimeline(account, owner, repo, number, pageParam);
      } else {
        return fetchIssueTimeline(account, owner, repo, number, pageParam);
      }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined,
    staleTime: 30000,
    enabled: !!account,
  });
}

// Type-specific hooks that enforce expected return types

export function usePullMetadata(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const result = useIssueOrPullMetadata(accountId, owner, repo, number);
  return {
    ...result,
    data: result.data as PullRequestMetadata | null,
  };
}

export function useIssueMetadata(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const result = useIssueOrPullMetadata(accountId, owner, repo, number);
  return {
    ...result,
    data: result.data,
  };
}

export function usePullTimeline(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  return useIssueOrPRTimeline(accountId, owner, repo, number, true);
}

export function useIssueTimeline(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  return useIssueOrPRTimeline(accountId, owner, repo, number, false);
}

export async function fetchPRCommits(
  account: GitHubAccount,
  owner: string,
  repo: string,
  number: number,
  cursor: string | null,
): Promise<CommitsPage> {
  const client = getGraphQLClient(account);

  const response = await client.request<{
    repository: {
      pullRequest: {
        commits: {
          totalCount: number;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: any[];
        };
      };
    };
  }>(GET_PR_COMMITS, { owner, repo, number, first: 50, after: cursor });

  const commits = response.repository.pullRequest.commits;
  const items = (commits.nodes ?? []).map((n: any) => ({
    sha: n.commit.oid,
    message: n.commit.message,
    author: {
      login: n.commit.author?.user?.login ?? n.commit.author?.name ?? "unknown",
      avatarUrl: n.commit.author?.avatarUrl ?? "",
    },
    date: n.commit.committedDate,
  }));

  return {
    items,
    pageInfo: {
      hasNextPage: commits.pageInfo.hasNextPage,
      endCursor: commits.pageInfo.endCursor,
    },
    totalCount: commits.totalCount,
  };
}

export function usePRCommits(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const account = getAccount(accountId);

  return useInfiniteQuery({
    queryKey: ["github-pr-commits", accountId, owner, repo, number],
    queryFn: async ({ pageParam }) => {
      if (!account) throw new Error("Account not found");
      return fetchPRCommits(account, owner, repo, number, pageParam);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined,
    staleTime: 30000,
    enabled: !!account,
  });
}

export function usePRDiff(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["pr-diff", accountId, owner, repo, number],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      const octokit = getOctokit(account);
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: number,
        mediaType: { format: "diff" },
      });
      return data as unknown as string; // Returns raw diff text
    },
    staleTime: 30000,
    enabled: !!account,
  });
}

export interface PRStatusResult {
  statusCheckRollup: StatusCheckRollupState;
  reviewDecision: ReviewDecision;
}

export function usePRStatus(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["pr-status", accountId, owner, repo, number],
    queryFn: async (): Promise<PRStatusResult> => {
      if (!account) throw new Error("Account not found");
      const client = getGraphQLClient(account);

      const response = await client.request<PRStatusResponse>(GET_PR_STATUS, {
        owner,
        repo,
        number,
      });

      const pr = response.repository.pullRequest;
      if (!pr) {
        return { statusCheckRollup: null, reviewDecision: null };
      }

      const statusCheckRollup =
        pr.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null;
      const reviewDecision = pr.reviewDecision ?? null;

      return {
        statusCheckRollup: statusCheckRollup as StatusCheckRollupState,
        reviewDecision,
      };
    },
    staleTime: 30000,
    enabled: !!account,
  });
}

export interface GitHubUser {
  login: string;
  avatarUrl: string;
}

export async function searchGitHubUsers(
  account: GitHubAccount,
  query: string,
): Promise<GitHubUser[]> {
  if (!query || query.length < 2) return [];

  const octokit = getOctokit(account);
  const response = await octokit.search.users({
    q: query,
    per_page: 8,
  });

  return response.data.items.map((user) => ({
    login: user.login,
    avatarUrl: user.avatar_url,
  }));
}

export interface GitHubRepo {
  fullName: string;
  description: string | null;
}

export async function searchGitHubRepos(
  account: GitHubAccount,
  query: string,
): Promise<GitHubRepo[]> {
  if (!query || query.length < 2) return [];

  const octokit = getOctokit(account);
  const response = await octokit.search.repos({
    q: query,
    per_page: 8,
  });

  return response.data.items.map((repo) => ({
    fullName: repo.full_name,
    description: repo.description,
  }));
}

// REST API hooks for PR files and diffs

export async function fetchPRFilesREST(
  account: GitHubAccount,
  owner: string,
  repo: string,
  number: number,
  page: number,
): Promise<PRFilesPage> {
  const octokit = getOctokit(account);
  const perPage = 100;

  const response = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: number,
    per_page: perPage,
    page,
  });

  const files: PRFileInfo[] = response.data.map((f) => ({
    path: f.filename,
    sha: f.sha,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    blobUrl: f.blob_url,
    rawUrl: f.raw_url,
    contentsUrl: f.contents_url,
  }));

  return {
    files,
    hasNextPage: response.data.length === perPage,
  };
}

export function usePRFilesREST(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
) {
  const account = getAccount(accountId);

  return useInfiniteQuery({
    queryKey: ["github-pr-files", accountId, owner, repo, number],
    queryFn: async ({ pageParam }) => {
      if (!account) throw new Error("Account not found");
      return fetchPRFilesREST(account, owner, repo, number, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNextPage ? lastPageParam + 1 : undefined,
    staleTime: 30000,
    enabled: !!account,
  });
}

export async function fetchCommitDiff(
  account: GitHubAccount,
  owner: string,
  repo: string,
  sha: string,
): Promise<string> {
  const octokit = getOctokit(account);
  const { data } = await octokit.repos.getCommit({
    owner,
    repo,
    ref: sha,
    mediaType: { format: "diff" },
  });
  return data as unknown as string;
}

export function useCommitDiff(
  accountId: string,
  owner: string,
  repo: string,
  sha: string | undefined,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["github-commit-diff", accountId, owner, repo, sha],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      if (!sha) throw new Error("Commit SHA required");
      return fetchCommitDiff(account, owner, repo, sha);
    },
    staleTime: 60000, // Commit diffs don't change
    enabled: !!account && !!sha,
  });
}

export interface ComparisonResult {
  diffText: string;
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
}

export async function fetchBranchComparison(
  account: GitHubAccount,
  owner: string,
  repo: string,
  base: string,
  head: string,
  headOwner: string | null,
): Promise<ComparisonResult> {
  const octokit = getOctokit(account);

  // For fork PRs, use headOwner:headRef format
  const headRef = headOwner ? `${headOwner}:${head}` : head;

  const { data } = await octokit.repos.compareCommits({
    owner,
    repo,
    base,
    head: headRef,
    mediaType: { format: "diff" },
  });

  // The diff format returns raw diff text
  const diffText = data as unknown as string;

  // For the stats, we need a separate request without diff format
  const statsResponse = await octokit.repos.compareCommits({
    owner,
    repo,
    base,
    head: headRef,
  });

  return {
    diffText,
    aheadBy: statsResponse.data.ahead_by,
    behindBy: statsResponse.data.behind_by,
    totalCommits: statsResponse.data.total_commits,
  };
}

export function useBranchComparison(
  accountId: string,
  owner: string,
  repo: string,
  base: string | undefined,
  head: string | undefined,
  headOwner: string | null | undefined,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: [
      "github-compare",
      accountId,
      owner,
      repo,
      base,
      head,
      headOwner ?? null,
    ],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      if (!base || !head) throw new Error("Base and head refs required");
      return fetchBranchComparison(
        account,
        owner,
        repo,
        base,
        head,
        headOwner ?? null,
      );
    },
    staleTime: 30000,
    enabled: !!account && !!base && !!head,
  });
}

export function useDiff(
  accountId: string,
  owner: string,
  repo: string,
  diffSource: DiffSource | null,
) {
  const account = getAccount(accountId);

  // Use commit diff when source is a specific commit
  const commitDiff = useQuery({
    queryKey: [
      "github-diff-commit",
      accountId,
      owner,
      repo,
      diffSource?.type === "commit" ? diffSource.sha : null,
    ],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      if (diffSource?.type !== "commit") throw new Error("Invalid diff source");
      return fetchCommitDiff(account, owner, repo, diffSource.sha);
    },
    staleTime: 60000,
    enabled: !!account && diffSource?.type === "commit",
  });

  // Use branch comparison for other cases
  const compareDiff = useQuery({
    queryKey: [
      "github-diff-compare",
      accountId,
      owner,
      repo,
      diffSource?.type === "compare" ? diffSource.base : null,
      diffSource?.type === "compare" ? diffSource.head : null,
      diffSource?.type === "compare" ? diffSource.headOwner : null,
    ],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      if (diffSource?.type !== "compare")
        throw new Error("Invalid diff source");
      const result = await fetchBranchComparison(
        account,
        owner,
        repo,
        diffSource.base,
        diffSource.head,
        diffSource.headOwner,
      );
      return result.diffText;
    },
    staleTime: 30000,
    enabled: !!account && diffSource?.type === "compare",
  });

  if (diffSource?.type === "commit") {
    return {
      data: commitDiff.data,
      isLoading: commitDiff.isLoading,
      error: commitDiff.error,
    };
  }

  return {
    data: compareDiff.data,
    isLoading: compareDiff.isLoading,
    error: compareDiff.error,
  };
}

// Search navigation functions for prev/next item navigation

export interface SearchResultWithCursor {
  cursor: string;
  number: number;
  title: string;
  owner: string;
  repo: string;
}

function parseSearchNavigationResponse(
  response: SearchNavigationResponse,
): SearchResultWithCursor[] {
  return response.search.edges
    .filter((edge) => edge.node !== null)
    .map((edge) => ({
      cursor: edge.cursor,
      number: edge.node!.number,
      title: edge.node!.title,
      owner: edge.node!.repository.owner.login,
      repo: edge.node!.repository.name,
    }));
}

export interface AdjacentItems {
  prev: SearchNavigationItem | null;
  next: SearchNavigationItem | null;
}

export async function searchAdjacentItems(
  account: GitHubAccount,
  queryString: string,
  cursor: string,
): Promise<AdjacentItems> {
  const client = getGraphQLClient(account);

  // Make two parallel queries: one for previous item, one for next item
  const [prevResponse, nextResponse] = await Promise.all([
    client.request<SearchNavigationResponse>(SEARCH_WITH_CURSORS, {
      query: queryString,
      last: 1,
      before: cursor,
    }),
    client.request<SearchNavigationResponse>(SEARCH_WITH_CURSORS, {
      query: queryString,
      first: 1,
      after: cursor,
    }),
  ]);

  const prevItems = parseSearchNavigationResponse(prevResponse);
  const nextItems = parseSearchNavigationResponse(nextResponse);

  return {
    prev: prevItems.length > 0 ? prevItems[0] : null,
    next: nextItems.length > 0 ? nextItems[0] : null,
  };
}

export interface SearchCursorsPage {
  items: SearchResultWithCursor[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export async function searchWithCursors(
  account: GitHubAccount,
  queryString: string,
  first: number,
  after?: string,
): Promise<SearchCursorsPage> {
  const client = getGraphQLClient(account);

  // Add one extra to determine if there's a next page
  const response = await client.request<SearchNavigationResponse>(
    SEARCH_WITH_CURSORS,
    {
      query: queryString,
      first: first + 1,
      after: after ?? null,
    },
  );

  const items = parseSearchNavigationResponse(response);
  const hasNextPage = items.length > first;
  const resultItems = hasNextPage ? items.slice(0, first) : items;
  const endCursor =
    resultItems.length > 0 ? resultItems[resultItems.length - 1].cursor : null;

  return {
    items: resultItems,
    hasNextPage,
    endCursor,
  };
}
