"use client";

import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function isNumberedListLine(line: string) {
  return /^\d+\.\s+/.test(line.trim());
}

function isBulletListLine(line: string) {
  return /^[*•-]\s+/.test(line.trim());
}

export function GuidanceMessageContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter((b) => b.trim());

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim());
        if (lines.length === 0) return null;

        if (lines.every(isNumberedListLine)) {
          return (
            <ol key={blockIndex} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand-accent">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\d+\.\s+/, "").trim())}</li>
              ))}
            </ol>
          );
        }

        if (lines.every(isBulletListLine)) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1.5 pl-5 marker:text-brand-accent">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^[*•-]\s+/, "").trim())}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
