"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/convex/_generated/api";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function renderMarkdown(markdown: string) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`my-3 pl-6 ${listType === "ol" ? "list-decimal" : "list-disc"} space-y-1 text-muted-foreground`}
      >
        {listItems.map((item, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  const inlineFormat = (text: string): string => {
    // bold
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>");
    // italic
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // links [text](url)
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline">$1</a>');
    return text;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="my-6 border-border" />);
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes: Record<number, string> = {
        1: "text-3xl",
        2: "text-2xl",
        3: "text-xl",
        4: "text-lg",
        5: "text-base",
        6: "text-sm",
      };
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      elements.push(
        <Tag
          key={`h-${i}`}
          className={`${sizes[level] ?? "text-base"} font-bold mt-8 mb-3 text-foreground`}
        >
          {text}
        </Tag>
      );
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(olMatch[1]);
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(ulMatch[1]);
      i++;
      continue;
    }

    flushList();

    // Paragraph (non-empty line)
    if (line.trim()) {
      elements.push(
        <p
          key={`p-${i}`}
          className="my-2 text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
        />
      );
    }

    i++;
  }

  flushList();
  return elements;
}

export default function HelpPage() {
  const markdown = useQuery(api.siteContent.getHelpContent);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="prose-custom">
          {markdown === undefined ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-3/5" />
            </div>
          ) : (
            renderMarkdown(markdown)
          )}
        </div>
      </div>
    </div>
  );
}
