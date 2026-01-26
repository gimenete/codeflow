import {
  BookmarkIcon,
  EyeIcon,
  FilterIcon,
  GitPullRequestIcon,
  IssueOpenedIcon,
  MentionIcon,
  SearchIcon,
  StarIcon,
} from "@primer/octicons-react";

export const iconOptions = [
  { id: "git-pull-request", icon: GitPullRequestIcon },
  { id: "issue-opened", icon: IssueOpenedIcon },
  { id: "eye", icon: EyeIcon },
  { id: "mention", icon: MentionIcon },
  { id: "search", icon: SearchIcon },
  { id: "bookmark", icon: BookmarkIcon },
  { id: "star", icon: StarIcon },
  { id: "filter", icon: FilterIcon },
] as const;

export type IconId = (typeof iconOptions)[number]["id"];

export function getIconById(iconId: string) {
  const option = iconOptions.find((opt) => opt.id === iconId);
  return option?.icon ?? SearchIcon;
}
