import {
  Trash2,
  HelpCircle,
  Cpu,
  Minimize2,
  type LucideIcon,
} from "lucide-react";

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
    name: "compact",
    description: "Compact conversation with optional focus instructions",
    Icon: Minimize2,
  },
  {
    name: "help",
    description: "Show available commands",
    Icon: HelpCircle,
  },
  {
    name: "model",
    description: "Select or change the AI model",
    Icon: Cpu,
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
