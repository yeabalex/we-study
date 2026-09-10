'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Check,
  Copy,
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

interface CourseMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Preprocesses markdown to clean up ASCII diagrams, LaTeX spacing, and headers
 */
function preprocessMarkdown(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Ensure numbered headings like "1. Defining..." or "## 1. Defining..." have clean spacing
  text = text.replace(/^(#+)\s*(\d+\.?\s+)/gm, '$1 $2');

  // 2. Fix standalone LaTeX blocks $$ ... $$ ensuring newlines before and after
  text = text.replace(/([^\n])\s*\$\$([\s\S]*?)\$\$\s*([^\n])/g, '$1\n\n$$$$2$$\n\n$3');

  return text;
}

/**
 * Custom Code Block with Copy Button and ASCII Art support
 */
function CodeBlock({ inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code
        className="px-1.5 py-0.5 mx-0.5 rounded-md bg-neutral-100 text-amber-900 border border-neutral-200/80 font-mono text-xs font-semibold"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Multi-line code block or ASCII diagram
  return (
    <div className="relative my-5 rounded-2xl bg-[#141518] border border-neutral-800 text-neutral-100 overflow-hidden shadow-md group">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1C1E23] border-b border-neutral-800 text-xs text-neutral-400 font-mono">
        <span className="uppercase text-[10px] tracking-wider font-bold">
          {language || 'DIAGRAM / CODE'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all text-xs font-sans font-medium"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code / ASCII Content */}
      <pre className="p-4 overflow-x-auto text-xs sm:text-[13px] font-mono leading-relaxed text-neutral-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/**
 * Custom Blockquote that parses GitHub alerts [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], [!CAUTION]
 */
function CustomBlockquote({ children }: any) {
  // Extract text representation to check for alert prefixes
  const textContent = React.Children.toArray(children)
    .map((child: any) => {
      if (typeof child === 'string') return child;
      if (child?.props?.children) {
        return Array.isArray(child.props.children)
          ? child.props.children.join('')
          : String(child.props.children);
      }
      return '';
    })
    .join('');

  if (textContent.includes('[!NOTE]')) {
    return (
      <div className="my-5 p-4 sm:p-5 rounded-2xl bg-blue-50/80 border-2 border-blue-200/90 text-blue-950 shadow-sm flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <div className="font-extrabold uppercase tracking-wider text-[11px] text-blue-900">
            Note
          </div>
          <div className="text-blue-900 font-medium">
            {removeAlertPrefix(children, '[!NOTE]')}
          </div>
        </div>
      </div>
    );
  }

  if (textContent.includes('[!TIP]')) {
    return (
      <div className="my-5 p-4 sm:p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-200/90 text-amber-950 shadow-sm flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <div className="font-extrabold uppercase tracking-wider text-[11px] text-amber-900">
            Exam Strategy & Tip
          </div>
          <div className="text-amber-950 font-medium">
            {removeAlertPrefix(children, '[!TIP]')}
          </div>
        </div>
      </div>
    );
  }

  if (textContent.includes('[!WARNING]')) {
    return (
      <div className="my-5 p-4 sm:p-5 rounded-2xl bg-rose-50/80 border-2 border-rose-200/90 text-rose-950 shadow-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <div className="font-extrabold uppercase tracking-wider text-[11px] text-rose-900">
            Exam Trap & Warning
          </div>
          <div className="text-rose-950 font-medium">
            {removeAlertPrefix(children, '[!WARNING]')}
          </div>
        </div>
      </div>
    );
  }

  if (textContent.includes('[!IMPORTANT]')) {
    return (
      <div className="my-5 p-4 sm:p-5 rounded-2xl bg-purple-50/80 border-2 border-purple-200/90 text-purple-950 shadow-sm flex items-start gap-3">
        <Flame className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <div className="font-extrabold uppercase tracking-wider text-[11px] text-purple-900">
            High-Yield Concept
          </div>
          <div className="text-purple-950 font-medium">
            {removeAlertPrefix(children, '[!IMPORTANT]')}
          </div>
        </div>
      </div>
    );
  }

  // Standard blockquote
  return (
    <blockquote className="my-4 pl-4 border-l-4 border-amber-400 bg-amber-50/40 p-3 rounded-r-xl text-neutral-700 italic text-sm">
      {children}
    </blockquote>
  );
}

function removeAlertPrefix(children: any, prefix: string): any {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return child.replace(prefix, '').trim();
    }
    if (child?.props?.children) {
      return React.cloneElement(child, {
        children: removeAlertPrefix(child.props.children, prefix),
      });
    }
    return child;
  });
}

export function CourseMarkdown({ content, className = '' }: CourseMarkdownProps) {
  const processed = preprocessMarkdown(content);

  return (
    <div className={`prose prose-neutral max-w-none font-sans text-neutral-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-8 mb-4 pb-2.5 border-b-2 border-neutral-200 flex items-center gap-2"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-lg sm:text-xl font-bold text-neutral-900 mt-7 mb-3 pb-1.5 border-b border-neutral-100 flex items-center gap-2"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-base font-bold text-neutral-800 mt-5 mb-2 flex items-center gap-1.5"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-sm font-bold text-neutral-700 mt-4 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm sm:text-base text-neutral-700 leading-relaxed my-3.5" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 my-3.5 space-y-1.5 text-sm sm:text-base text-neutral-700 marker:text-amber-500" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 my-3.5 space-y-1.5 text-sm sm:text-base text-neutral-700 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-1" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-neutral-900" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-neutral-800" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-neutral-100" {...props} />
          ),
          code: CodeBlock,
          blockquote: CustomBlockquote,
          table: ({ node, ...props }) => (
            <div className="my-6 overflow-x-auto rounded-2xl border border-neutral-200 shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-neutral-100 text-neutral-900 border-b border-neutral-200 uppercase tracking-wider text-[11px] font-bold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="p-3.5 font-bold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="p-3.5 border-b border-neutral-100 text-neutral-700" {...props} />
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
