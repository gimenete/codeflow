import { Trash2, HelpCircle, type LucideIcon } from "lucide-react";

export interface Command {
  name: string;
  description: string;
  Icon: LucideIcon;
}

export const COMMANDS: Command[] = [
  {
    name: "clear",
    description: "Clear the conversation",
    Icon: Trash2,
  },
  {
    name: "help",
    description: "Show available commands",
    Icon: HelpCircle,
  },
];

export function filterCommands(filter: string): Command[] {
  if (!filter) return COMMANDS;
  const lowerFilter = filter.toLowerCase();
  return COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerFilter) ||
      cmd.description.toLowerCase().includes(lowerFilter),
  );
}
