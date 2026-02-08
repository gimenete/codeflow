import { useEffect, useState } from "react";
import { isElectron } from "./platform";

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface UpdaterAPI {
  getStatus: () => Promise<{
    updateAvailable: UpdateInfo | null;
    updateDownloaded: boolean;
  }>;
  install: () => Promise<void>;
  check: () => Promise<{ updateAvailable: string | null }>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  removeAllListeners: () => void;
}

declare global {
  interface Window {
    updaterAPI?: UpdaterAPI;
  }
}

export interface UpdateState {
  updateAvailable: UpdateInfo | null;
  updateDownloaded: boolean;
  installing: boolean;
  installUpdate: () => void;
}

export function useUpdater(): UpdateState {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(
    null,
  );
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isElectron() || !window.updaterAPI) return;

    // Check current status on mount (in case update was found before component mounted)
    void window.updaterAPI.getStatus().then((status) => {
      if (status.updateAvailable) {
        setUpdateAvailable(status.updateAvailable);
      }
      if (status.updateDownloaded) {
        setUpdateDownloaded(true);
      }
    });

    // Listen for new updates
    window.updaterAPI.onUpdateAvailable((info) => {
      setUpdateAvailable(info);
    });

    window.updaterAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
    });

    return () => {
      window.updaterAPI?.removeAllListeners();
    };
  }, []);

  const installUpdate = () => {
    if (!window.updaterAPI || !updateDownloaded) return;
    setInstalling(true);
    void window.updaterAPI.install();
  };

  return { updateAvailable, updateDownloaded, installing, installUpdate };
}
