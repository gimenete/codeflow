import { useState, useEffect } from "react";
import { ClaudeIcon } from "@/components/ui/claude-icon";
import { CheckCircle2, Terminal } from "lucide-react";

interface AppInfo {
  appVersion: string;
  claudeCliVersion: string;
  claudeSdkVersion: string;
}

declare global {
  interface Window {
    appAPI?: {
      getInfo: () => Promise<AppInfo>;
    };
  }
}

export function WelcomeMessage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      if (window.appAPI?.getInfo) {
        try {
          const info = await window.appAPI.getInfo();
          setAppInfo(info);
        } catch {
          // Ignore errors
        }
      }
    }
    void fetchInfo();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="flex items-center gap-2 mb-4">
        <ClaudeIcon className="h-8 w-8 text-primary" />
        <h2 className="text-xl font-semibold">Claude Code</h2>
        {appInfo?.claudeCliVersion &&
          appInfo.claudeCliVersion !== "unknown" && (
            <span className="text-sm text-muted-foreground">
              v{appInfo.claudeCliVersion}
            </span>
          )}
      </div>

      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Chat with Claude about this branch. Claude has access to the files in
        your repository directory.
      </p>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span>Authenticated via Claude CLI</span>
        </div>
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          <span>
            Type <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">/</kbd>{" "}
            for commands,{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">@</kbd> to
            mention files
          </span>
        </div>
      </div>
    </div>
  );
}
