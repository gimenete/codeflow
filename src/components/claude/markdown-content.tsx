import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { CodeBlock } from "./code-block";

interface MarkdownContentProps {
  content: string;
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const isInline = !match && !String(children).includes("\n");

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <CodeBlock language={match?.[1]}>{String(children).trimEnd()}</CodeBlock>
    );
  },
  pre({ children }) {
    // Let CodeBlock handle the pre styling
    return <>{children}</>;
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
        {...props}
      >
        {children}
      </a>
    );
  },
  ul({ children, ...props }) {
    return (
      <ul className="list-disc list-outside pl-5 my-2 space-y-1" {...props}>
        {children}
      </ul>
    );
  },
  ol({ children, ...props }) {
    return (
      <ol className="list-decimal list-outside pl-5 my-2 space-y-1" {...props}>
        {children}
      </ol>
    );
  },
  li({ children, ...props }) {
    return (
      <li className="text-sm" {...props}>
        {children}
      </li>
    );
  },
  p({ children, ...props }) {
    return (
      <p className="my-2 text-sm leading-relaxed" {...props}>
        {children}
      </p>
    );
  },
  h1({ children, ...props }) {
    return (
      <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2({ children, ...props }) {
    return (
      <h2 className="text-lg font-bold mt-4 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3({ children, ...props }) {
    return (
      <h3 className="text-base font-bold mt-3 mb-1" {...props}>
        {children}
      </h3>
    );
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="border-l-4 border-muted-foreground/30 pl-4 my-2 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }) {
    return (
      <th
        className="border border-border px-3 py-2 bg-muted font-medium text-left"
        {...props}
      >
        {children}
      </th>
    );
  },
  td({ children, ...props }) {
    return (
      <td className="border border-border px-3 py-2" {...props}>
        {children}
      </td>
    );
  },
  hr({ ...props }) {
    return <hr className="my-4 border-border" {...props} />;
  },
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
