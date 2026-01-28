import { useState, useEffect, useCallback } from "react";
import { getCredentialStore } from "./credentials";
import type { GitHubAccount } from "./github-types";

const ACCOUNTS_KEY = "accounts";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

let accountsCache: GitHubAccount[] | null = null;

export async function loadAccounts(): Promise<GitHubAccount[]> {
  if (accountsCache !== null) {
    return accountsCache;
  }

  const store = getCredentialStore();
  try {
    const data = await store.get(ACCOUNTS_KEY);
    accountsCache = data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load accounts from credential store:", error);
    accountsCache = [];
  }
  return accountsCache ?? [];
}

async function saveAccounts(accounts: GitHubAccount[]): Promise<void> {
  const store = getCredentialStore();
  await store.set(ACCOUNTS_KEY, JSON.stringify(accounts));
  accountsCache = accounts;
  notifyListeners();
}

export function getAccount(id: string): GitHubAccount | null {
  return accountsCache?.find((a) => a.id === id) ?? null;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<GitHubAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadAccounts().then((data) => {
      setAccounts(data);
      setIsLoading(false);
    });

    const listener = () => {
      void loadAccounts().then(setAccounts);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { accounts, isLoading };
}

export function useAddAccount() {
  const addAccount = useCallback(async (account: Omit<GitHubAccount, "id">) => {
    const accounts = await loadAccounts();
    const id = `${account.login}~${account.host}`;

    const existingIndex = accounts.findIndex((a) => a.id === id);
    const newAccount: GitHubAccount = { ...account, id };

    if (existingIndex >= 0) {
      accounts[existingIndex] = newAccount;
    } else {
      accounts.push(newAccount);
    }

    await saveAccounts(accounts);
    return newAccount;
  }, []);

  return { addAccount };
}

export function useRemoveAccount() {
  const removeAccount = useCallback(async (id: string) => {
    const accounts = await loadAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    await saveAccounts(filtered);
  }, []);

  return { removeAccount };
}

export function useAddAccountDialog(initialOpen = false) {
  const [isOpen, setOpen] = useState(initialOpen);

  useEffect(() => {
    if (initialOpen) {
      setOpen(true);
    }
  }, [initialOpen]);

  return { isOpen, setOpen };
}

export async function validateToken(
  token: string,
  host: string = "github.com",
): Promise<{
  valid: boolean;
  user?: { login: string; avatarUrl: string };
  error?: string;
}> {
  try {
    const baseUrl =
      host === "github.com"
        ? "https://api.github.com"
        : `https://${host}/api/v3`;

    const response = await fetch(`${baseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: "Invalid token" };
      }
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      valid: true,
      user: {
        login: data.login,
        avatarUrl: data.avatar_url,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
