import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Circle, CircleDot, Square, CheckSquare2 } from "lucide-react";
import type { ToolUseBlock } from "@/lib/claude";

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface Question {
  question: string;
  header?: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

export interface AskUserQuestionInput {
  questions: Question[];
}

interface AskUserQuestionBlockProps {
  block: ToolUseBlock;
  selectedAnswers?: Record<string, string | string[]>;
}

function isAskUserQuestionInput(input: unknown): input is AskUserQuestionInput {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  return Array.isArray(obj.questions);
}

export function AskUserQuestionBlock({
  block,
  selectedAnswers,
}: AskUserQuestionBlockProps) {
  const input = block.input;

  if (!isAskUserQuestionInput(input)) {
    return (
      <div className="text-sm text-muted-foreground">
        Invalid AskUserQuestion format
      </div>
    );
  }

  return (
    <div className="space-y-3 my-3">
      {input.questions.map((question, qIndex) => (
        <Card key={qIndex} className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {question.header && (
                <Badge variant="outline" className="text-xs">
                  {question.header}
                </Badge>
              )}
            </div>
            <CardTitle className="text-sm font-medium">
              {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {question.options.map((option, oIndex) => {
                const isSelected = selectedAnswers?.[qIndex.toString()]
                  ? question.multiSelect
                    ? (
                        selectedAnswers[qIndex.toString()] as string[]
                      )?.includes(option.label)
                    : selectedAnswers[qIndex.toString()] === option.label
                  : false;

                const IconUnselected = question.multiSelect ? Square : Circle;
                const IconSelected = question.multiSelect
                  ? CheckSquare2
                  : CircleDot;
                const Icon = isSelected ? IconSelected : IconUnselected;

                return (
                  <div
                    key={oIndex}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/30"
                  >
                    <Icon
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        isSelected ? "text-primary" : "text-muted-foreground/50"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Type guard to check if a tool_use block is an AskUserQuestion
export function isAskUserQuestionBlock(block: ToolUseBlock): boolean {
  return block.name === "AskUserQuestion";
}
