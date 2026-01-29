import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { isElectron } from "@/lib/platform";
import "@/lib/terminal"; // Import for type augmentation

interface TerminalPanelProps {
  cwd: string;
  className?: string;
  active?: boolean; // Only initialize terminal when true (lazy initialization)
}

export function TerminalPanel({
  cwd,
  className,
  active = true,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle terminal input - send to PTY
  const handleInput = useCallback((data: string) => {
    if (sessionIdRef.current && window.ptyAPI) {
      void window.ptyAPI.write(sessionIdRef.current, data);
    }
  }, []);

  // Handle PTY resize
  const handleResize = useCallback(
    ({ cols, rows }: { cols: number; rows: number }) => {
      if (sessionIdRef.current && window.ptyAPI) {
        void window.ptyAPI.resize(sessionIdRef.current, cols, rows);
      }
    },
    [],
  );

  useEffect(() => {
    // Skip initialization when not active (lazy loading)
    if (!active) return;

    if (!isElectron() || !window.ptyAPI || !containerRef.current) {
      if (!isElectron()) {
        setError("Terminal is only available in the desktop app");
      }
      return;
    }

    const container = containerRef.current;
    let terminal: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cleanup = false;

    async function initTerminal() {
      try {
        if (cleanup) return;

        // Create terminal instance
        terminal = new Terminal({
          cols: 80,
          rows: 24,
          cursorBlink: true,
          fontSize: 13,
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          theme: {
            background: "#1a1a1a",
            foreground: "#d4d4d4",
            cursor: "#d4d4d4",
            selectionBackground: "rgba(255, 255, 255, 0.3)",
            black: "#000000",
            red: "#cd3131",
            green: "#0dbc79",
            yellow: "#e5e510",
            blue: "#2472c8",
            magenta: "#bc3fbc",
            cyan: "#11a8cd",
            white: "#e5e5e5",
            brightBlack: "#666666",
            brightRed: "#f14c4c",
            brightGreen: "#23d18b",
            brightYellow: "#f5f543",
            brightBlue: "#3b8eea",
            brightMagenta: "#d670d6",
            brightCyan: "#29b8db",
            brightWhite: "#ffffff",
          },
        });

        terminalRef.current = terminal;

        // Create and load fit addon
        fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        terminal.loadAddon(fitAddon);

        // Open terminal in container
        terminal.open(container);

        // Fit terminal to container
        fitAddon.fit();

        // Set up ResizeObserver for automatic resizing (xterm.js doesn't have observeResize)
        resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
          }
        });
        resizeObserver.observe(container);
        resizeObserverRef.current = resizeObserver;

        if (cleanup) {
          terminal.dispose();
          resizeObserver.disconnect();
          return;
        }

        // Create PTY session
        const { sessionId } = await window.ptyAPI!.create(cwd);
        sessionIdRef.current = sessionId;

        if (cleanup) {
          void window.ptyAPI!.kill(sessionId);
          terminal.dispose();
          resizeObserver.disconnect();
          return;
        }

        // Resize PTY to match terminal dimensions
        void window.ptyAPI!.resize(sessionId, terminal.cols, terminal.rows);

        // Set up terminal input handler
        terminal.onData(handleInput);

        // Set up terminal resize handler
        terminal.onResize(handleResize);

        // Set up PTY output listener
        window.ptyAPI!.onOutput(({ sessionId: sid, data }) => {
          if (sid === sessionIdRef.current && terminalRef.current) {
            terminalRef.current.write(data);
          }
        });

        // Set up PTY exit listener
        window.ptyAPI!.onExit(({ sessionId: sid, exitCode }) => {
          if (sid === sessionIdRef.current && terminalRef.current) {
            terminalRef.current.writeln(
              `\r\n[Process exited with code ${exitCode}]`,
            );
          }
        });

        setIsReady(true);
      } catch (err) {
        console.error("Terminal initialization error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create terminal",
        );
      }
    }

    void initTerminal();

    return () => {
      cleanup = true;

      // Kill PTY session
      if (sessionIdRef.current && window.ptyAPI) {
        void window.ptyAPI.kill(sessionIdRef.current);
        sessionIdRef.current = null;
      }

      // Remove PTY listeners
      window.ptyAPI?.removeAllListeners();

      // Disconnect resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Dispose terminal
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }

      fitAddonRef.current = null;
    };
  }, [cwd, handleInput, handleResize, active]);

  // Return placeholder when not active (lazy initialization)
  if (!active) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          backgroundColor: "#1a1a1a",
          padding: "4px",
          overflow: "hidden",
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive bg-[#1a1a1a]">
        <div className="text-center p-4">
          <p className="text-sm font-medium">Terminal Error</p>
          <p className="text-xs mt-1 opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        backgroundColor: "#1a1a1a",
        padding: "4px",
        overflow: "hidden",
      }}
    >
      {!isReady && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <span className="text-sm">Initializing terminal...</span>
        </div>
      )}
    </div>
  );
}
