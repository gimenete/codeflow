import { useMemo } from "react";
import { formatRelativeDate } from "@/lib/format";

interface RelativeTimeProps {
  date: string;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const { relative, absolute } = useMemo(() => {
    const dateObj = new Date(date);
    return {
      relative: formatRelativeDate(date),
      absolute: dateObj.toLocaleString(),
    };
  }, [date]);

  return (
    <time dateTime={date} title={absolute} className={className}>
      {relative}
    </time>
  );
}
