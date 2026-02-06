import { describe, it, expect } from "vitest";
import {
  parseRemoteUrl,
  buildRemoteUrl,
  getOwnerRepo,
  isGitHubUrl,
} from "../remote-url";

describe("parseRemoteUrl", () => {
  it("parses HTTPS GitHub URL", () => {
    const result = parseRemoteUrl("https://github.com/owner/repo");
    expect(result).toEqual({
      provider: "github",
      host: "github.com",
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses HTTPS GitHub URL with .git suffix", () => {
    const result = parseRemoteUrl("https://github.com/owner/repo.git");
    expect(result).toEqual({
      provider: "github",
      host: "github.com",
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses SSH GitHub URL", () => {
    const result = parseRemoteUrl("git@github.com:owner/repo.git");
    expect(result).toEqual({
      provider: "github",
      host: "github.com",
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses SSH GitHub URL without .git suffix", () => {
    const result = parseRemoteUrl("git@github.com:owner/repo");
    expect(result).toEqual({
      provider: "github",
      host: "github.com",
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses GitHub Enterprise HTTPS URL", () => {
    const result = parseRemoteUrl(
      "https://github.mycompany.com/team/project.git",
    );
    expect(result).toEqual({
      provider: "github",
      host: "github.mycompany.com",
      owner: "team",
      repo: "project",
    });
  });

  it("parses GitLab URL", () => {
    const result = parseRemoteUrl("https://gitlab.com/owner/repo");
    expect(result).toEqual({
      provider: "gitlab",
      host: "gitlab.com",
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses Bitbucket URL", () => {
    const result = parseRemoteUrl("https://bitbucket.org/owner/repo");
    expect(result).toEqual({
      provider: "bitbucket",
      host: "bitbucket.org",
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses unknown provider URL", () => {
    const result = parseRemoteUrl("https://selfhosted.example.com/owner/repo");
    expect(result).toEqual({
      provider: "unknown",
      host: "selfhosted.example.com",
      owner: "owner",
      repo: "repo",
    });
  });

  it("returns null for null input", () => {
    expect(parseRemoteUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseRemoteUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRemoteUrl("")).toBeNull();
  });

  it("returns null for invalid URL format", () => {
    expect(parseRemoteUrl("not-a-url")).toBeNull();
  });

  it("returns null for URL with only host (no owner/repo path)", () => {
    expect(parseRemoteUrl("https://github.com/onlyowner")).toBeNull();
  });

  it("parses HTTP URL (not HTTPS)", () => {
    const result = parseRemoteUrl("http://github.com/owner/repo");
    expect(result).toEqual({
      provider: "github",
      host: "github.com",
      owner: "owner",
      repo: "repo",
    });
  });
});

describe("buildRemoteUrl", () => {
  it("builds HTTPS URL from components", () => {
    expect(buildRemoteUrl("github.com", "owner", "repo")).toBe(
      "https://github.com/owner/repo",
    );
  });

  it("builds URL for GitHub Enterprise", () => {
    expect(buildRemoteUrl("github.mycompany.com", "team", "project")).toBe(
      "https://github.mycompany.com/team/project",
    );
  });
});

describe("getOwnerRepo", () => {
  it("returns owner/repo from HTTPS URL", () => {
    expect(getOwnerRepo("https://github.com/owner/repo")).toBe("owner/repo");
  });

  it("returns owner/repo from SSH URL", () => {
    expect(getOwnerRepo("git@github.com:owner/repo.git")).toBe("owner/repo");
  });

  it("returns null for null input", () => {
    expect(getOwnerRepo(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getOwnerRepo(undefined)).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(getOwnerRepo("not-a-url")).toBeNull();
  });
});

describe("isGitHubUrl", () => {
  it("returns true for github.com HTTPS URL", () => {
    expect(isGitHubUrl("https://github.com/owner/repo")).toBe(true);
  });

  it("returns true for github.com SSH URL", () => {
    expect(isGitHubUrl("git@github.com:owner/repo.git")).toBe(true);
  });

  it("returns true for GitHub Enterprise URL", () => {
    expect(isGitHubUrl("https://github.mycompany.com/owner/repo")).toBe(true);
  });

  it("returns false for GitLab URL", () => {
    expect(isGitHubUrl("https://gitlab.com/owner/repo")).toBe(false);
  });

  it("returns false for Bitbucket URL", () => {
    expect(isGitHubUrl("https://bitbucket.org/owner/repo")).toBe(false);
  });

  it("returns false for null input", () => {
    expect(isGitHubUrl(null)).toBe(false);
  });

  it("returns false for undefined input", () => {
    expect(isGitHubUrl(undefined)).toBe(false);
  });
});
