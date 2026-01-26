import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { useAccounts } from "./auth";
import { useSavedQueryGroups } from "./saved-queries-store";

export interface BreadcrumbDropdownItem {
  label: string;
  onClick: () => void;
  avatarUrl?: string; // For account avatars
  icon?: React.ReactNode; // For saved search icons
}

export interface BreadcrumbDropdownSeparator {
  type: "separator";
}

export interface BreadcrumbDropdownLabel {
  type: "label";
  text: string;
}

export type BreadcrumbDropdownElement =
  | BreadcrumbDropdownItem
  | BreadcrumbDropdownSeparator
  | BreadcrumbDropdownLabel;

export interface BreadcrumbItem {
  label: string;
  href?: string;
  dropdown?: {
    items: BreadcrumbDropdownElement[];
  };
  isModified?: boolean; // Shows dot indicator
}

interface BreadcrumbContextValue {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([]);

  const setBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbsState(items);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs(items?: BreadcrumbItem[]) {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumbs must be used within a BreadcrumbProvider");
  }

  const { breadcrumbs, setBreadcrumbs } = context;

  useEffect(() => {
    if (items) {
      setBreadcrumbs(items);
    }
    return () => {
      // Clear breadcrumbs when component unmounts
      setBreadcrumbs([]);
    };
  }, [items, setBreadcrumbs]);

  return { breadcrumbs, setBreadcrumbs };
}

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error(
      "useBreadcrumbContext must be used within a BreadcrumbProvider",
    );
  }
  return context;
}

export function useAccountBreadcrumbDropdown(): BreadcrumbDropdownElement[] {
  const { accounts } = useAccounts();
  const navigate = useNavigate();

  return useMemo(
    () => [
      ...accounts.map((a) => ({
        label: `@${a.login}`,
        avatarUrl: a.avatarUrl,
        onClick: () => navigate({ to: "/$account", params: { account: a.id } }),
      })),
      { type: "separator" as const },
      {
        label: "Add Account",
        onClick: () => navigate({ to: "/", search: { addAccount: true } }),
      },
    ],
    [accounts, navigate],
  );
}

const savedSearchIconMap: Record<string, ReactNode> = {
  "git-pull-request": <GitPullRequestIcon size={16} />,
  "issue-opened": <IssueOpenedIcon size={16} />,
  eye: <EyeIcon size={16} />,
  mention: <MentionIcon size={16} />,
  search: <SearchIcon size={16} />,
  bookmark: <BookmarkIcon size={16} />,
  star: <StarIcon size={16} />,
  filter: <FilterIcon size={16} />,
};

export function useSavedSearchBreadcrumbDropdown(
  account: string,
): BreadcrumbDropdownElement[] {
  const navigate = useNavigate();
  const groups = useSavedQueryGroups(account);

  return useMemo(() => {
    const elements: BreadcrumbDropdownElement[] = [];

    groups.forEach((group, groupIndex) => {
      // Add separator between groups (not before first group)
      if (groupIndex > 0) {
        elements.push({ type: "separator" });
      }

      // Add label for the group
      elements.push({ type: "label", text: group.title });

      // Add queries in the group
      group.queries.forEach((q) => {
        elements.push({
          label: q.name,
          icon: q.icon ? savedSearchIconMap[q.icon] : undefined,
          onClick: () =>
            navigate({
              to: "/$account/$search",
              params: { account, search: q.id },
              search: {},
            }),
        });
      });
    });

    return elements;
  }, [account, navigate, groups]);
}

export { savedSearchIconMap };
