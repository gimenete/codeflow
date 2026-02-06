/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import {
  GET_REPOSITORY_INFO,
  type RepositoryInfoResponse,
} from "@/queries/repository-info";
import { GET_MENTIONABLE_USERS } from "@/queries/mentionable-users";
import type {
  Account,
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
  RepositoryForkInfo,
} from "./github-types";
import type {
  GetIssueOrPrMetadataQuery,
  GetIssueTimelineQuery,
  GetPrTimelineQuery,
} from "@/generated/graphql";
import type { TimelineNode } from "@/components/timeline-events";
import { getAccount } from "./auth";

function getGraphQLClient(account: Account): GraphQLClient {
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

function getOctokit(account: Account): Octokit {
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
  account: Account,
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

  if (filters.milestone) {
    parts.push(`milestone:"${filters.milestone}"`);
  }

  return parts.join(" ");
}

const SEARCH_PER_PAGE = 50;

export async function searchIssuesAndPulls(
  account: Account,
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
      const pullRequest = isPullRequest
        ? (item.pull_request as { merged_at?: string | null })
        : null;
      const isMerged = pullRequest?.merged_at != null;

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
          state: isMerged ? "merged" : (item.state as "open" | "closed"),
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
  account: Account,
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
  account: Account,
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
            number: item.milestone.number,
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
            number: item.milestone.number,
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
  account: Account,
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
      viewerCanUpdate: pr.viewerCanUpdate,
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
            number: pr.milestone.number,
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
      viewerCanUpdate: issue.viewerCanUpdate,
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
            number: issue.milestone.number,
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
  account: Account,
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
  account: Account,
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
  account: Account,
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
  account: Account,
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
  account: Account,
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

export interface RepoIssueSearchResult {
  number: number;
  title: string;
  state: "open" | "closed";
  isPullRequest: boolean;
  isMerged: boolean;
}

export async function searchIssuesInRepo(
  account: Account,
  owner: string,
  repo: string,
  query: string,
): Promise<RepoIssueSearchResult[]> {
  if (!query || query.length < 1) return [];
  const octokit = getOctokit(account);
  const isNumeric = /^\d+$/.test(query);
  const q = isNumeric
    ? `repo:${owner}/${repo} ${query}`
    : `repo:${owner}/${repo} ${query} in:title`;

  const response = await octokit.search.issuesAndPullRequests({
    q,
    sort: "updated",
    order: "desc",
    per_page: 8,
  });

  return response.data.items.map((item) => {
    const isPullRequest = "pull_request" in item;
    const pullRequest = isPullRequest
      ? (item.pull_request as { merged_at?: string | null })
      : null;
    return {
      number: item.number,
      title: item.title,
      state: item.state as "open" | "closed",
      isPullRequest,
      isMerged: pullRequest?.merged_at != null,
    };
  });
}

export async function fetchMentionableUsers(
  account: Account,
  owner: string,
  repo: string,
): Promise<GitHubUser[]> {
  const client = getGraphQLClient(account);

  const response = await client.request<{
    repository: {
      mentionableUsers: {
        nodes: { login: string; avatarUrl: string }[];
      };
    };
  }>(GET_MENTIONABLE_USERS, { owner, repo });

  return response.repository.mentionableUsers.nodes.map((user) => ({
    login: user.login,
    avatarUrl: user.avatarUrl,
  }));
}

export async function fetchRecentIssues(
  account: Account,
  owner: string,
  repo: string,
): Promise<RepoIssueSearchResult[]> {
  const octokit = getOctokit(account);

  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    sort: "updated",
    direction: "desc",
    per_page: 8,
    state: "all",
  });

  return response.data.map((item) => {
    const isPullRequest = "pull_request" in item;
    const pullRequest = isPullRequest
      ? (item.pull_request as { merged_at?: string | null })
      : null;
    return {
      number: item.number,
      title: item.title,
      state: item.state as "open" | "closed",
      isPullRequest,
      isMerged: pullRequest?.merged_at != null,
    };
  });
}

// REST API hooks for PR files and diffs

export async function fetchPRFilesREST(
  account: Account,
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
  account: Account,
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
  account: Account,
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
  account: Account,
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
  account: Account,
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

// Repository info functions for fork detection and default branch

export async function fetchRepositoryInfo(
  account: Account,
  owner: string,
  repo: string,
): Promise<RepositoryForkInfo> {
  const client = getGraphQLClient(account);

  const response = await client.request<RepositoryInfoResponse>(
    GET_REPOSITORY_INFO,
    { owner, repo },
  );

  const repository = response.repository;
  if (!repository) {
    throw new Error("Repository not found");
  }

  return {
    isFork: repository.isFork,
    defaultBranch: repository.defaultBranchRef?.name ?? "main",
    parent: repository.parent
      ? {
          owner: repository.parent.owner.login,
          name: repository.parent.name,
          defaultBranch: repository.parent.defaultBranchRef?.name ?? "main",
        }
      : null,
  };
}

export function useRepositoryInfo(
  accountId: string,
  owner: string,
  repo: string,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["github-repo-info", accountId, owner, repo],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      return fetchRepositoryInfo(account, owner, repo);
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: !!account && !!owner && !!repo,
  });
}

// Fetch remote branches via REST API

export interface RemoteBranch {
  name: string;
  protected: boolean;
}

export async function fetchRemoteBranches(
  account: Account,
  owner: string,
  repo: string,
): Promise<RemoteBranch[]> {
  const octokit = getOctokit(account);

  const response = await octokit.repos.listBranches({
    owner,
    repo,
    per_page: 100,
  });

  return response.data.map((branch) => ({
    name: branch.name,
    protected: branch.protected,
  }));
}

export function useRemoteBranches(
  accountId: string,
  owner: string | undefined,
  repo: string | undefined,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["github-remote-branches", accountId, owner, repo],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      if (!owner || !repo) throw new Error("Owner and repo required");
      return fetchRemoteBranches(account, owner, repo);
    },
    staleTime: 30000,
    enabled: !!account && !!owner && !!repo,
  });
}

// Create pull request via REST API

export interface CreatePullRequestParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string; // For forks: "username:branch", for same repo: "branch"
  base: string;
}

export interface CreatedPullRequest {
  number: number;
  url: string;
  htmlUrl: string;
}

export async function createPullRequest(
  account: Account,
  params: CreatePullRequestParams,
): Promise<CreatedPullRequest> {
  const octokit = getOctokit(account);

  const response = await octokit.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base,
  });

  return {
    number: response.data.number,
    url: response.data.url,
    htmlUrl: response.data.html_url,
  };
}

// Milestone functions

export interface RepoMilestone {
  number: number;
  title: string;
  state: string;
  dueOn: string | null;
  description: string | null;
}

export async function fetchRepoMilestones(
  account: Account,
  owner: string,
  repo: string,
): Promise<RepoMilestone[]> {
  const octokit = getOctokit(account);
  const response = await octokit.issues.listMilestones({
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  return response.data.map((m) => ({
    number: m.number,
    title: m.title,
    state: m.state,
    dueOn: m.due_on ?? null,
    description: m.description ?? null,
  }));
}

export function useRepoMilestones(
  accountId: string,
  owner: string,
  repo: string,
) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["github-repo-milestones", accountId, owner, repo],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      return fetchRepoMilestones(account, owner, repo);
    },
    staleTime: 120_000,
    enabled: !!account,
  });
}

// Assignee / reviewer / milestone mutation functions

export async function updateAssignees(
  account: Account,
  owner: string,
  repo: string,
  issueNumber: number,
  addLogins: string[],
  removeLogins: string[],
): Promise<void> {
  const octokit = getOctokit(account);
  if (removeLogins.length > 0) {
    await octokit.issues.removeAssignees({
      owner,
      repo,
      issue_number: issueNumber,
      assignees: removeLogins,
    });
  }
  if (addLogins.length > 0) {
    await octokit.issues.addAssignees({
      owner,
      repo,
      issue_number: issueNumber,
      assignees: addLogins,
    });
  }
}

export async function updateReviewRequests(
  account: Account,
  owner: string,
  repo: string,
  pullNumber: number,
  addLogins: string[],
  removeLogins: string[],
): Promise<void> {
  const octokit = getOctokit(account);
  if (removeLogins.length > 0) {
    await octokit.pulls.removeRequestedReviewers({
      owner,
      repo,
      pull_number: pullNumber,
      reviewers: removeLogins,
    });
  }
  if (addLogins.length > 0) {
    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: pullNumber,
      reviewers: addLogins,
    });
  }
}

export async function updateMilestoneOnIssue(
  account: Account,
  owner: string,
  repo: string,
  issueNumber: number,
  milestoneNumber: number | null,
): Promise<void> {
  const octokit = getOctokit(account);
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    milestone: milestoneNumber ?? (null as unknown as undefined),
  });
}

// Pull request review

export async function createPullReview(
  account: Account,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
): Promise<void> {
  const octokit = getOctokit(account);
  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    body,
    event,
  });
}

// Mutation functions for comments, state changes, and labels

export async function createComment(
  account: Account,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const octokit = getOctokit(account);
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function updateIssueOrPullState(
  account: Account,
  owner: string,
  repo: string,
  number: number,
  state: "open" | "closed",
  isPR: boolean,
): Promise<void> {
  const octokit = getOctokit(account);
  if (isPR) {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: number,
      state,
    });
  } else {
    await octokit.issues.update({
      owner,
      repo,
      issue_number: number,
      state,
    });
  }
}

export async function setLabels(
  account: Account,
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[],
): Promise<void> {
  const octokit = getOctokit(account);
  await octokit.issues.setLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels,
  });
}

export interface RepoLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export async function fetchRepoLabels(
  account: Account,
  owner: string,
  repo: string,
): Promise<RepoLabel[]> {
  const octokit = getOctokit(account);
  const response = await octokit.issues.listLabelsForRepo({
    owner,
    repo,
    per_page: 100,
  });
  return response.data.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description ?? null,
  }));
}

export function useRepoLabels(accountId: string, owner: string, repo: string) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["github-repo-labels", accountId, owner, repo],
    queryFn: async () => {
      if (!account) throw new Error("Account not found");
      return fetchRepoLabels(account, owner, repo);
    },
    staleTime: 120_000,
    enabled: !!account,
  });
}

export function useTimelineMutations(
  accountId: string,
  owner: string,
  repo: string,
  number: number,
  isPR: boolean,
) {
  const account = getAccount(accountId);
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["github-timeline", accountId, owner, repo, number, isPR],
    });
    void queryClient.invalidateQueries({
      queryKey: ["github-metadata", accountId, owner, repo, number],
    });
  };

  const submitComment = async (body: string) => {
    if (!account) throw new Error("Account not found");
    await createComment(account, owner, repo, number, body);
    invalidate();
  };

  const changeState = async (state: "open" | "closed") => {
    if (!account) throw new Error("Account not found");
    await updateIssueOrPullState(account, owner, repo, number, state, isPR);
    invalidate();
  };

  const commentAndChangeState = async (
    body: string,
    state: "open" | "closed",
  ) => {
    if (!account) throw new Error("Account not found");
    await createComment(account, owner, repo, number, body);
    await updateIssueOrPullState(account, owner, repo, number, state, isPR);
    invalidate();
  };

  const updateLabels = async (labels: string[]) => {
    if (!account) throw new Error("Account not found");
    await setLabels(account, owner, repo, number, labels);
    invalidate();
  };

  const mutateAssignees = async (add: string[], remove: string[]) => {
    if (!account) throw new Error("Account not found");
    await updateAssignees(account, owner, repo, number, add, remove);
    invalidate();
  };

  const mutateReviewRequests = async (add: string[], remove: string[]) => {
    if (!account) throw new Error("Account not found");
    await updateReviewRequests(account, owner, repo, number, add, remove);
    invalidate();
  };

  const mutateMilestone = async (milestoneNumber: number | null) => {
    if (!account) throw new Error("Account not found");
    await updateMilestoneOnIssue(account, owner, repo, number, milestoneNumber);
    invalidate();
  };

  const submitReview = async (
    body: string,
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  ) => {
    if (!account) throw new Error("Account not found");
    await createPullReview(account, owner, repo, number, body, event);
    invalidate();
  };

  return {
    submitComment,
    changeState,
    commentAndChangeState,
    updateLabels,
    updateAssignees: mutateAssignees,
    updateReviewRequests: mutateReviewRequests,
    updateMilestone: mutateMilestone,
    submitReview,
  };
}
