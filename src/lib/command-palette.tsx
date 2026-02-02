import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  onSelect: () => void;
  icon?: React.ReactNode;
}

interface CommandPaletteContextValue {
  commands: CommandItem[];
  setCommands: (commands: CommandItem[]) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [commands, setCommandsState] = useState<CommandItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const setCommands = useCallback((items: CommandItem[]) => {
    setCommandsState(items);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{ commands, setCommands, isOpen, setIsOpen }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(items?: CommandItem[]) {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }

  const { commands, setCommands } = context;

  useEffect(() => {
    if (items) {
      setCommands(items);
    }
    return () => {
      // Clear commands when component unmounts
      setCommands([]);
    };
  }, [items, setCommands]);

  return { commands, setCommands };
}

export function useCommandPaletteContext() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPaletteContext must be used within a CommandPaletteProvider",
    );
  }
  return context;
}

export function useOpenCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useOpenCommandPalette must be used within a CommandPaletteProvider",
    );
  }

  const { isOpen, setIsOpen } = context;

  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const toggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  return { open, close, toggle };
}
