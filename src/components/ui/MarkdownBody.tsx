"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownBody({ body, className }: { body: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-2 mt-6 text-xl font-black text-white first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-1.5 mt-5 text-base font-black text-white first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-4 text-sm font-black text-white first:mt-0">{children}</h3>,
          p:  ({ children }) => <p className="mb-3 text-sm leading-relaxed text-slate-300 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-slate-300">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-slate-300">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-slate-300">{children}</li>,
          strong: ({ children }) => <strong className="font-black text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-xs text-cyan-300">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-300">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-cyan-300/40 pl-4 italic text-slate-400">{children}</blockquote>
          ),
          a: ({ href, children }) => {
            const safeHref =
              href?.startsWith("https://") ||
              href?.startsWith("http://") ||
              href?.startsWith("/")
                ? href
                : "#";
            return (
              <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-200">
                {children}
              </a>
            );
          },
          hr: () => <hr className="my-5 border-white/10" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-xs font-black uppercase text-slate-400">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-1.5 text-sm text-slate-300">{children}</td>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
