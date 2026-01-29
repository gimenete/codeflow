/**
 * Remote URL parsing and building utilities
 * Supports HTTPS, SSH, and various Git hosting providers
 */

export interface RemoteInfo {
  provider: "github" | "gitlab" | "bitbucket" | "unknown";
  host: string;
  owner: string;
  repo: string;
}

/**
 * Parse a remote URL and extract provider, host, owner, and repo
 * Supports:
 * - HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
 * - SSH: git@github.com:owner/repo.git
 * - GitHub Enterprise: https://github.mycompany.com/owner/repo
 */
export function parseRemoteUrl(
  url: string | null | undefined,
): RemoteInfo | null {
  if (!url) return null;

  let host: string;
  let path: string;

  // Try SSH format: git@host:path.git
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    host = sshMatch[1];
    path = sshMatch[2];
  } else {
    // Try HTTPS format: https://host/path or https://host/path.git
    const httpsMatch = url.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      host = httpsMatch[1];
      path = httpsMatch[2];
    } else {
      return null;
    }
  }

  // Extract owner and repo from path (owner/repo)
  const pathParts = path.split("/").filter(Boolean);
  if (pathParts.length < 2) return null;

  const owner = pathParts[0];
  const repo = pathParts[1];

  // Determine provider based on host
  const provider = getProviderFromHost(host);

  return {
    provider,
    host,
    owner,
    repo,
  };
}

/**
 * Determine the provider from host name
 */
function getProviderFromHost(
  host: string,
): "github" | "gitlab" | "bitbucket" | "unknown" {
  const lowerHost = host.toLowerCase();
  if (lowerHost === "github.com" || lowerHost.includes("github")) {
    return "github";
  }
  if (lowerHost === "gitlab.com" || lowerHost.includes("gitlab")) {
    return "gitlab";
  }
  if (lowerHost === "bitbucket.org" || lowerHost.includes("bitbucket")) {
    return "bitbucket";
  }
  return "unknown";
}

/**
 * Build an HTTPS remote URL from components
 */
export function buildRemoteUrl(
  host: string,
  owner: string,
  repo: string,
): string {
  return `https://${host}/${owner}/${repo}`;
}

/**
 * Get owner/repo string from a remote URL
 * Returns "owner/repo" or null if invalid
 */
export function getOwnerRepo(url: string | null | undefined): string | null {
  const info = parseRemoteUrl(url);
  if (!info) return null;
  return `${info.owner}/${info.repo}`;
}

/**
 * Check if a remote URL is for GitHub (including GitHub Enterprise)
 */
export function isGitHubUrl(url: string | null | undefined): boolean {
  const info = parseRemoteUrl(url);
  return info?.provider === "github";
}
