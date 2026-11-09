"use client";

import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      const safe = href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://");
      if (!safe) return link[1];
      return (
        <a
          key={i}
          href={href}
          className="font-semibold text-brand-accent underline-offset-2 hover:underline"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[#10244F]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function isHeading(line: string) {
  const trimmed = line.trim();
  return /^#{1,3}\s+\S/.test(trimmed) || (/^\*\*[^*]+\*\*:?$/.test(trimmed) && trimmed.length < 80);
}

function headingText(line: string) {
  return line
    .trim()
    .replace(/^#{1,3}\s+/, "")
    .replace(/^\*\*/, "")
    .replace(/\*\*:?$/, "");
}

function isNumbered(line: string) {
  return /^\d+\.\s+\S/.test(line.trim());
}

function isBullet(line: string) {
  return /^[*•-]\s+\S/.test(line.trim());
}

function isLabeled(line: string) {
  return /^\*\*[^*]{2,40}\*\*\s*[:—-]\s+\S/.test(line.trim()) || /^[A-Z][A-Za-z0-9 /&-]{1,32}:\s+\S/.test(line.trim());
}

export function GuidanceMessageContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    if (isHeading(lines[index]) && !isLabeled(lines[index])) {
      nodes.push(
        <p key={`h-${index}`} className="pt-1 text-[13px] font-bold tracking-[-0.01em] text-[#10244F]">
          {headingText(lines[index])}
        </p>,
      );
      index += 1;
      continue;
    }

    if (isNumbered(lines[index])) {
      const items: string[] = [];
      const start = index;
      while (index < lines.length && isNumbered(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, "").trim());
        index += 1;
      }
      nodes.push(
        <ol key={`ol-${start}`} className="space-y-2 pl-0">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-[11px] font-bold text-brand-accent">
                {itemIndex + 1}
              </span>
              <span className="min-w-0 pt-px">{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (isBullet(lines[index]) || isLabeled(lines[index])) {
      const items: string[] = [];
      const start = index;
      while (index < lines.length && (isBullet(lines[index]) || isLabeled(lines[index]))) {
        items.push(lines[index].replace(/^[*•-]\s+/, "").trim());
        index += 1;
      }
      nodes.push(
        <ul key={`ul-${start}`} className="space-y-2">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-2.5">
              <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span className="min-w-0">{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const chunk: string[] = [];
    const start = index;
    while (index < lines.length && lines[index].trim() && !isHeading(lines[index]) && !isNumbered(lines[index]) && !isBullet(lines[index]) && !isLabeled(lines[index])) {
      chunk.push(lines[index].trim());
      index += 1;
    }
    const text = chunk.join(" ");
    nodes.push(
      <p key={`p-${start}`} className="text-[15px] leading-relaxed text-[#10244F]">
        {renderInline(text)}
      </p>,
    );
  }

  return <div className="space-y-2 text-[15px] leading-relaxed text-[#111]">{nodes}</div>;
}
