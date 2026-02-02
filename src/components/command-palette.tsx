import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  useCommandPaletteContext,
  type CommandItem as CommandItemType,
} from "@/lib/command-palette";
import { useMemo } from "react";

export function CommandPalette() {
  const { commands, isOpen, setIsOpen } = useCommandPaletteContext();

  // Group commands by their group property
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandItemType[]>();

    for (const command of commands) {
      const existing = groups.get(command.group);
      if (existing) {
        existing.push(command);
      } else {
        groups.set(command.group, [command]);
      }
    }

    return groups;
  }, [commands]);

  const handleSelect = (command: CommandItemType) => {
    setIsOpen(false);
    command.onSelect();
  };

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      showCloseButton={false}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {Array.from(groupedCommands.entries()).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => handleSelect(command)}
              >
                {command.icon && (
                  <span className="mr-2 shrink-0">{command.icon}</span>
                )}
                <span>{command.label}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
