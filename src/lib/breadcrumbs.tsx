import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

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
