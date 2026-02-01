import { ListTodo, Check, Clock, AlertCircle } from "lucide-react";
import type { SDKTaskNotificationMessage } from "@/lib/claude";
import { cn } from "@/lib/utils";

interface TaskNotificationMessageProps {
  message: SDKTaskNotificationMessage;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
    case "done":
      return <Check className="h-3.5 w-3.5 text-green-500" />;
    case "failed":
    case "error":
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function TaskNotificationMessage({
  message,
}: TaskNotificationMessageProps) {
  const isError = message.status === "failed" || message.status === "error";

  return (
    <div
      className={cn("flex items-center gap-2 text-xs py-1 my-1", {
        "text-red-500": isError,
        "text-muted-foreground": !isError,
      })}
    >
      <ListTodo className="h-3.5 w-3.5" />
      {getStatusIcon(message.status)}
      <span>
        Task {message.task_id}: {message.status}
        {message.message && ` - ${message.message}`}
      </span>
    </div>
  );
}
