export type StoryPhrase = {
  id: string;
  source_text: string;
  target_text: string;
};

export type StoryModule = {
  id: string;
  title: string;
  phrases: StoryPhrase[];
};

export type ListenStory = {
  id: string;
  topic: string;
  moduleTitle: string;
  reason: string;
  beats: { de: string; en: string }[];
};

function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function glue(cefr: string, index: number, total: number): { de: string; en: string } {
  const c = cefr.toUpperCase();
  const high = c.startsWith("C") || c.startsWith("B2");
  if (index === 0) {
    return high
      ? { de: "Hören Sie die folgende kurze Geschichte.", en: "Listen to this short story." }
      : { de: "Hören Sie bitte zu. Das ist eine kleine Geschichte.", en: "Please listen. This is a short story." };
  }
  if (index === total - 1) {
    return high
      ? { de: "Damit endet die Geschichte. Was bleibt für Sie hängen?", en: "That is the end of the story. What stays with you?" }
      : { de: "Ende der Geschichte. Was haben Sie verstanden?", en: "End of the story. What did you understand?" };
  }
  const mid = high
    ? [
        { de: "Danach geschah Folgendes.", en: "Then this happened." },
        { de: "An dieser Stelle wird es genauer.", en: "This is where it gets more precise." },
        { de: "Man könnte einwenden, und trotzdem gilt:" , en: "You could object, and still this holds:" },
        { de: "Kurze Zeit später.", en: "A short time later." },
      ]
    : [
        { de: "Dann.", en: "Then." },
        { de: "Später.", en: "Later." },
        { de: "Und dann.", en: "And then." },
        { de: "Am nächsten Tag.", en: "The next day." },
      ];
  return mid[(index - 1) % mid.length]!;
}

export function finishedModuleIds(
  modules: { id: string; phrases: { id: string }[] }[],
  learned: Set<string>,
  passed: Set<string>,
): string[] {
  return modules
    .filter((row) => {
      if (passed.has(row.id)) return true;
      if (!row.phrases.length) return false;
      return row.phrases.every((item) => learned.has(item.id));
    })
    .map((row) => row.id);
}

export function moduleLabel(index: number, title: string): string {
  const clean = title.replace(/^lesson\s+\d+\s*[:.-]?\s*/i, "").trim();
  return clean && !/^module\s+\d+/i.test(clean) ? `Module ${index + 1}: ${clean}` : `Module ${index + 1}`;
}

export function buildListenStory(opts: {
  modules: StoryModule[];
  learned: Set<string>;
  passed: Set<string>;
  cefr: string;
  moduleId?: string;
  random?: () => number;
}): ListenStory {
  const random = opts.random ?? Math.random;
  const doneIds = finishedModuleIds(opts.modules, opts.learned, opts.passed);
  const chosen = opts.moduleId
    ? opts.modules.find((row) => row.id === opts.moduleId)
    : undefined;
  const topicModule = chosen ?? opts.modules[0];
  if (!topicModule) {
    return {
      id: "empty",
      topic: "Module 1",
      moduleTitle: "Module 1",
      reason: "This course has no modules with language yet.",
      beats: [
        { de: "Willkommen. Wählen Sie zuerst ein Modul.", en: "Welcome. Choose a module first." },
      ],
    };
  }

  const moduleIndex = Math.max(
    0,
    opts.modules.findIndex((row) => row.id === topicModule.id),
  );
  const label = moduleLabel(moduleIndex, topicModule.title);
  const learnedHere = topicModule.phrases.filter((row) => opts.learned.has(row.id));
  const source = (learnedHere.length >= 4 ? learnedHere : topicModule.phrases).filter((row) => row.target_text.trim());
  const picks = shuffle(source, random).slice(0, 8);
  const finished = doneIds.includes(topicModule.id);
  const reason = finished
    ? `Story from ${label}. You have finished this module.`
    : `Story from ${label}. You can practise this module even before you finish it.`;

  const beats: { de: string; en: string }[] = [];
  const intro = glue(opts.cefr, 0, picks.length + 2);
  beats.push({
    de: `${intro.de} Das Thema ist: ${label}.`,
    en: `${intro.en} The topic is: ${label}.`,
  });
  picks.forEach((row, index) => {
    const link = glue(opts.cefr, index + 1, picks.length + 2);
    beats.push({
      de: `${link.de} ${row.target_text}`.replace(/\s+/g, " ").trim(),
      en: `${link.en} ${row.source_text}`.replace(/\s+/g, " ").trim(),
    });
  });
  beats.push(glue(opts.cefr, picks.length + 1, picks.length + 2));

  return {
    id: `${topicModule.id}-${picks.map((row) => row.id).join("-").slice(0, 24)}-${Math.floor(random() * 1e6)}`,
    topic: label,
    moduleTitle: label,
    reason,
    beats,
  };
}
