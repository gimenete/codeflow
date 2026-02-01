import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Circle,
  CircleDot,
  Square,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import type { Question } from "./sdk-messages/ask-user-question-block";

interface QuestionAnswererProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string | string[]>) => void;
  onCancel: () => void;
}

export function QuestionAnswerer({
  questions,
  onSubmit,
  onCancel,
}: QuestionAnswererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const currentQuestion = questions[currentIndex];
  const isMultiSelect = currentQuestion?.multiSelect ?? false;
  const totalQuestions = questions.length;

  const handleOptionClick = useCallback(
    (optionLabel: string) => {
      const key = currentIndex.toString();

      if (isMultiSelect) {
        const currentAnswers = (answers[key] as string[]) || [];
        const newAnswers = currentAnswers.includes(optionLabel)
          ? currentAnswers.filter((a) => a !== optionLabel)
          : [...currentAnswers, optionLabel];
        setAnswers({ ...answers, [key]: newAnswers });
      } else {
        setAnswers({ ...answers, [key]: optionLabel });
      }
    },
    [currentIndex, isMultiSelect, answers],
  );

  const handleCustomAnswer = useCallback(
    (customText: string) => {
      const key = currentIndex.toString();
      if (isMultiSelect) {
        const currentAnswers = (answers[key] as string[]) || [];
        // For multi-select, add custom text as an additional answer
        setAnswers({ ...answers, [key]: [...currentAnswers, customText] });
      } else {
        setAnswers({ ...answers, [key]: customText });
      }
    },
    [currentIndex, isMultiSelect, answers],
  );

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, totalQuestions]);

  const handleSubmit = useCallback(() => {
    onSubmit(answers);
  }, [answers, onSubmit]);

  const currentAnswer = answers[currentIndex.toString()];
  const hasCurrentAnswer = isMultiSelect
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : !!currentAnswer;

  // Check if all questions have been answered
  const allAnswered = questions.every((_, idx) => {
    const ans = answers[idx.toString()];
    return Array.isArray(ans) ? ans.length > 0 : !!ans;
  });

  const isLastQuestion = currentIndex === totalQuestions - 1;

  if (!currentQuestion) return null;

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      {totalQuestions > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{
                width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Question card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {currentQuestion.header && (
              <Badge variant="outline" className="text-xs">
                {currentQuestion.header}
              </Badge>
            )}
            {isMultiSelect && (
              <Badge variant="secondary" className="text-xs">
                Select multiple
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm font-medium">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {currentQuestion.options.map((option, oIndex) => {
              const isSelected = isMultiSelect
                ? (currentAnswer as string[])?.includes(option.label)
                : currentAnswer === option.label;

              const IconUnselected = isMultiSelect ? Square : Circle;
              const IconSelected = isMultiSelect ? CheckSquare2 : CircleDot;
              const Icon = isSelected ? IconSelected : IconUnselected;

              return (
                <button
                  key={oIndex}
                  onClick={() => handleOptionClick(option.label)}
                  className={`flex items-start gap-2 p-2 rounded-md w-full text-left transition-colors ${
                    isSelected
                      ? "bg-primary/20 border border-primary/40"
                      : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                  }`}
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
                </button>
              );
            })}

            {/* Other option - always available */}
            <OtherOption
              isMultiSelect={isMultiSelect}
              onSubmit={handleCustomAnswer}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {totalQuestions > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {!isLastQuestion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasCurrentAnswer}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </>
          )}

          {isLastQuestion && (
            <Button size="sm" onClick={handleSubmit} disabled={!allAnswered}>
              <Send className="h-4 w-4 mr-1" />
              Submit Answers
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface OtherOptionProps {
  isMultiSelect: boolean;
  onSubmit: (text: string) => void;
}

function OtherOption({ isMultiSelect, onSubmit }: OtherOptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState("");

  const handleSubmit = () => {
    if (customText.trim()) {
      onSubmit(customText.trim());
      setCustomText("");
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-start gap-2 p-2 rounded-md w-full text-left bg-muted/30 hover:bg-muted/50 border border-dashed border-muted-foreground/30"
      >
        {isMultiSelect ? (
          <Square className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
        ) : (
          <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">Other...</div>
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-primary/40">
      <input
        type="text"
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setIsEditing(false);
        }}
        placeholder="Type your answer..."
        className="flex-1 bg-transparent text-sm outline-none"
        autoFocus
      />
      <Button size="sm" variant="ghost" onClick={handleSubmit}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}
