"use client";

import { useMemo } from "react";

type Token = { text: string; start: number; end: number; word: boolean };

function tokensOf(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+|\s+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      word: /\S/.test(match[0]),
    });
  }
  return tokens;
}

export function ListenFollowAlong({
  text,
  cursor,
  playing,
}: {
  text: string;
  cursor: number;
  playing: boolean;
}) {
  const tokens = useMemo(() => tokensOf(text), [text]);
  const idle = !playing && cursor <= 0;

  return (
    <p className="listen-script text-[1.2rem] font-semibold leading-[1.7] tracking-tight sm:text-[1.45rem] sm:leading-[1.75]">
      {tokens.map((token, index) => {
        if (!token.word) return <span key={`${token.start}-s`}>{token.text}</span>;
        const now = !idle && cursor >= token.start && cursor < token.end;
        const said = !idle && cursor >= token.end;
        const cls = idle ? "is-idle" : now ? "is-now" : said ? "is-said" : "is-wait";
        return (
          <span key={`${token.start}-${index}`} className={`listen-word ${cls}`}>
            {token.text}
          </span>
        );
      })}
    </p>
  );
}

export function listenSceneSrc(chapter: string) {
  if (/Café|Markt|Einkauf|Park|Apotheke/i.test(chapter)) return "/classroom/scenes/cafe.jpg";
  if (/Keller|Formular|Arbeit|Büro|Brief/i.test(chapter)) return "/classroom/scenes/office.jpg";
  if (/Campus|Stein|Volkshoch|Schule/i.test(chapter)) return "/classroom/scenes/campus.jpg";
  return "/classroom/scenes/street.jpg";
}
