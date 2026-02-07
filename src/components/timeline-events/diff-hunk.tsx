interface DiffHunkProps {
  diffHunk: string;
  path: string;
}

export function DiffHunk({ diffHunk, path }: DiffHunkProps) {
  if (!diffHunk) return null;

  const lines = diffHunk.split("\n");

  return (
    <div className="border rounded overflow-hidden text-xs font-mono my-2">
      <div className="bg-muted px-3 py-1 text-muted-foreground border-b font-sans text-xs">
        {path}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              let bgClass = "";
              let textClass = "text-foreground";

              if (line.startsWith("@@")) {
                bgClass = "bg-blue-500/10";
                textClass = "text-blue-600 dark:text-blue-400";
              } else if (line.startsWith("+")) {
                bgClass = "bg-green-500/15";
                textClass = "text-green-700 dark:text-green-400";
              } else if (line.startsWith("-")) {
                bgClass = "bg-red-500/15";
                textClass = "text-red-700 dark:text-red-400";
              }

              return (
                <tr key={i} className={bgClass}>
                  <td
                    className={`px-3 py-0 whitespace-pre select-text ${textClass}`}
                  >
                    {line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
