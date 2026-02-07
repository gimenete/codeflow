import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SmileyIcon } from "@primer/octicons-react";
import { ReactionContent } from "@/generated/graphql";

export interface ReactionGroup {
  content: ReactionContent;
  reactors: {
    totalCount: number;
    nodes: Array<{ login: string } | null | undefined> | null | undefined;
  };
  viewerHasReacted: boolean;
}

interface ReactionsProps {
  reactionGroups: ReactionGroup[];
  onToggleReaction: (
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
}

const REACTION_EMOJI: Record<ReactionContent, string> = {
  [ReactionContent.ThumbsUp]: "\u{1F44D}",
  [ReactionContent.ThumbsDown]: "\u{1F44E}",
  [ReactionContent.Laugh]: "\u{1F604}",
  [ReactionContent.Hooray]: "\u{1F389}",
  [ReactionContent.Confused]: "\u{1F615}",
  [ReactionContent.Heart]: "\u{2764}\u{FE0F}",
  [ReactionContent.Rocket]: "\u{1F680}",
  [ReactionContent.Eyes]: "\u{1F440}",
};

const REACTION_LABEL: Record<ReactionContent, string> = {
  [ReactionContent.ThumbsUp]: "+1",
  [ReactionContent.ThumbsDown]: "-1",
  [ReactionContent.Laugh]: "laugh",
  [ReactionContent.Hooray]: "hooray",
  [ReactionContent.Confused]: "confused",
  [ReactionContent.Heart]: "heart",
  [ReactionContent.Rocket]: "rocket",
  [ReactionContent.Eyes]: "eyes",
};

const PICKER_ORDER: ReactionContent[] = [
  ReactionContent.ThumbsUp,
  ReactionContent.ThumbsDown,
  ReactionContent.Laugh,
  ReactionContent.Hooray,
  ReactionContent.Confused,
  ReactionContent.Heart,
  ReactionContent.Rocket,
  ReactionContent.Eyes,
];

function getReactorSummary(group: ReactionGroup): string {
  const names = (group.reactors.nodes ?? [])
    .filter((n): n is { login: string } => n != null)
    .map((n) => n.login);
  const total = group.reactors.totalCount;
  const remaining = total - names.length;
  const label = REACTION_LABEL[group.content];

  if (names.length === 0) {
    return `${total} reacted with ${label}`;
  }

  const listed = names.join(", ");
  if (remaining > 0) {
    return `${listed}, and ${remaining} more reacted with ${label}`;
  }
  return `${listed} reacted with ${label}`;
}

export function Reactions({
  reactionGroups,
  onToggleReaction,
}: ReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const activeGroups = reactionGroups.filter((g) => g.reactors.totalCount > 0);

  const handlePickerReaction = (content: ReactionContent) => {
    const group = reactionGroups.find((g) => g.content === content);
    onToggleReaction(content, group?.viewerHasReacted ?? false);
    setPickerOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {activeGroups.map((group) => (
        <Tooltip key={group.content}>
          <TooltipTrigger asChild>
            <button
              onClick={() =>
                onToggleReaction(group.content, group.viewerHasReacted)
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-accent ${
                group.viewerHasReacted
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600"
                  : "border-border"
              }`}
            >
              <span>{REACTION_EMOJI[group.content]}</span>
              <span className="tabular-nums">{group.reactors.totalCount}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {getReactorSummary(group)}
          </TooltipContent>
        </Tooltip>
      ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-full opacity-0 group-hover/comment:opacity-100 transition-opacity"
          >
            <SmileyIcon size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" side="bottom" align="start">
          <div className="flex gap-0.5">
            {PICKER_ORDER.map((content) => {
              const group = reactionGroups.find((g) => g.content === content);
              const hasReacted = group?.viewerHasReacted ?? false;
              return (
                <button
                  key={content}
                  onClick={() => handlePickerReaction(content)}
                  className={`rounded p-1.5 text-base hover:bg-accent transition-colors ${
                    hasReacted ? "bg-blue-50 dark:bg-blue-950/30" : ""
                  }`}
                  title={REACTION_LABEL[content]}
                >
                  {REACTION_EMOJI[content]}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
