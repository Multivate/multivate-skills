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

export type ListenDuration = 10 | 15 | 30 | 60;

export const LISTEN_DURATIONS: ListenDuration[] = [10, 15, 30, 60];

export type ListenStory = {
  id: string;
  topic: string;
  moduleTitle: string;
  reason: string;
  minutes: ListenDuration;
  chapter: string;
  beats: { de: string; en: string; chapter: string }[];
};

const WORDS_PER_MIN = 120;

type Scene = {
  chapterDe: string;
  chapterEn: string;
  de: (line: string) => string;
  en: (line: string) => string;
};

const SCENES: Scene[] = [
  {
    chapterDe: "Ankunft in Frankfurt",
    chapterEn: "Arrival in Frankfurt",
    de: (line) =>
      `Amara kommt mit einer großen Tasche in Frankfurt an. Die Halle ist hell, die Stimmen mischen sich, und sie sucht den Ausgang zur S-Bahn. Vor der Anzeige bleibt sie stehen, atmet einmal, und sagt zu sich: „${line}“ Ein junger Mann mit einem Namensschild hört das und kommt näher, ohne sie zu drängen.`,
    en: (line) =>
      `Amara arrives in Frankfurt with a big bag. The hall is bright, voices mix, and she looks for the way to the S-Bahn. She stops at the board, takes a breath, and says to herself: "${line}" A young man with a name badge hears that and comes closer without rushing her.`,
  },
  {
    chapterDe: "Mit Timo zur Stadt",
    chapterEn: "Into town with Timo",
    de: (line) =>
      `Timo heißt der Mann. Er arbeitet am Infostand und kennt den Weg in die Stadt. Am Gleis ist es windig. Amara zieht die Jacke zu. Timo fragt freundlich, und sie antwortet: „${line}“ Sie steigen zusammen ein. Durch das Fenster sieht Amara Kräne, Wasser, und die ersten roten Dächer.`,
    en: (line) =>
      `The man is Timo. He works at the information desk and knows the way into town. The platform is windy. Amara zips her jacket. Timo asks kindly, and she answers: "${line}" They get on together. Through the window Amara sees cranes, water, and the first red roofs.`,
  },
  {
    chapterDe: "Im Café am Markt",
    chapterEn: "In the café by the market",
    de: (line) =>
      `Am Markt steht ein kleines Café mit drei Tischen draußen. Amara bestellt Wasser, Timo nimmt einen Kaffee. Die Kellnerin wartet, der Lärm vom Markt kommt durch die Tür. Amara übt den Satz noch einmal, diesmal laut genug für den Tresen: „${line}“ Die Kellnerin nickt und schreibt nichts Falsches auf.`,
    en: (line) =>
      `A small café with three outdoor tables stands by the market. Amara orders water, Timo takes a coffee. The server waits, and market noise comes through the door. Amara practises the line again, loud enough for the counter: "${line}" The server nods and writes nothing wrong.`,
  },
  {
    chapterDe: "Die neue Straße",
    chapterEn: "The new street",
    de: (line) =>
      `Ihre Straße ist ruhig, die Klingeln haben Namen. Amara sucht ihre Nummer und findet sie hinter einem Fahrrad. Eine Nachbarin öffnet die Tür im Erdgeschoss, Leyla, mit einem Kind auf dem Arm. Leyla grüßt zuerst. Amara antwortet klar: „${line}“ Leyla zeigt den Briefkasten und den Schlüssel für den Hinterhof.`,
    en: (line) =>
      `Her street is quiet, and the bells have names. Amara looks for her number and finds it behind a bicycle. A neighbour opens the ground-floor door, Leyla, with a child on her arm. Leyla greets first. Amara answers clearly: "${line}" Leyla shows the letterbox and the key for the backyard.`,
  },
  {
    chapterDe: "Bei Frau Keller",
    chapterEn: "At Frau Keller's office",
    de: (line) =>
      `Am nächsten Vormittag sitzt Amara bei Frau Keller im Bürgeramt. Der Raum riecht nach Papier. Frau Keller öffnet eine Mappe, legt ein Formular hin, und wartet auf eine genaue Antwort. Amara liest die Zeile, hebt den Blick, und sagt: „${line}“ Frau Keller macht einen Haken, nicht mit Rot, mit Bleistift.`,
    en: (line) =>
      `The next morning Amara sits with Frau Keller at the citizens' office. The room smells of paper. Frau Keller opens a folder, puts down a form, and waits for a precise answer. Amara reads the line, looks up, and says: "${line}" Frau Keller ticks a box, not in red, in pencil.`,
  },
  {
    chapterDe: "Das Formular",
    chapterEn: "The form",
    de: (line) =>
      `Das Formular hat Felder für Name, Adresse, und Arbeit. Amara schreibt langsam. Ein Mann hinter ihr seufzt, aber Frau Keller bleibt bei Amara. „Lesen Sie die Zeile noch einmal laut“, sagt sie. Amara tut es: „${line}“ Die Zeile passt. Frau Keller gibt ihr eine Nummer für später.`,
    en: (line) =>
      `The form has fields for name, address, and work. Amara writes slowly. A man behind her sighs, but Frau Keller stays with Amara. "Read the line out loud once more," she says. Amara does: "${line}" The line fits. Frau Keller gives her a number for later.`,
  },
  {
    chapterDe: "Einkaufen ohne Hetze",
    chapterEn: "Shopping without rush",
    de: (line) =>
      `Am Nachmittag geht Amara in den Laden an der Ecke. Brot, Milch, Äpfel. An der Kasse ist eine Schlange. Die Kassiererin fragt etwas Schnelles. Amara lässt sich Zeit und sagt den Satz, den sie braucht: „${line}“ Die Kassiererin wiederholt nichts Spöttisches. Amara zahlt und atmet draußen aus.`,
    en: (line) =>
      `In the afternoon Amara goes to the shop on the corner. Bread, milk, apples. There is a queue at the till. The cashier asks something fast. Amara takes her time and says the line she needs: "${line}" The cashier does not mock her by repeating it. Amara pays and breathes out outside.`,
  },
  {
    chapterDe: "Abend bei Leyla",
    chapterEn: "Evening at Leyla's",
    de: (line) =>
      `Leyla kocht Reis und Gemüse. Das Kind malt auf einem Zettel. Amara erzählt von Ibadan, von der Hitze, von der Familie. Leyla hört zu und stellt eine einfache Frage. Amara antwortet mit dem Satz aus dem Unterricht, aber diesmal ist er echt: „${line}“ Das Kind klatscht, ohne den Sinn zu kennen.`,
    en: (line) =>
      `Leyla cooks rice and vegetables. The child draws on a scrap of paper. Amara talks about Ibadan, the heat, the family. Leyla listens and asks a simple question. Amara answers with the classroom line, but this time it is real: "${line}" The child claps without knowing the meaning.`,
  },
  {
    chapterDe: "Auf dem Campus",
    chapterEn: "On campus",
    de: (line) =>
      `Die Volkshochschule liegt hinter Bäumen. In Raum 12 sitzen zwölf Leute aus zwölf Ländern. Die Lehrerin, Frau Stein, schreibt ein Beispiel an die Tafel und bittet Amara um die Version aus ihrem Leben. Amara steht auf, nicht gern, und sagt: „${line}“ Zwei Nachbarn nicken. Frau Stein sagt nur: gut so, setzen.`,
    en: (line) =>
      `The adult education centre sits behind trees. In room 12 twelve people from twelve countries sit down. The teacher, Frau Stein, writes an example on the board and asks Amara for the version from her life. Amara stands, not gladly, and says: "${line}" Two neighbours nod. Frau Stein only says: good, sit.`,
  },
  {
    chapterDe: "Ein Anruf nach Hause",
    chapterEn: "A call home",
    de: (line) =>
      `Spät am Abend ruft Amara ihre Schwester in Ibadan an. Die Verbindung knackt. Die Schwester will hören, ob Deutschland kalt ist, ob die Leute freundlich sind, ob Amara isst. Amara lacht und versucht denselben Satz auf Deutsch, nur um zu zeigen, dass der Tag Arbeit war: „${line}“ Die Schwester wiederholt ihn falsch, und beide lachen.`,
    en: (line) =>
      `Late in the evening Amara calls her sister in Ibadan. The line crackles. The sister wants to know if Germany is cold, if people are kind, if Amara is eating. Amara laughs and tries the same line in German, only to show the day was work: "${line}" The sister repeats it wrong, and both laugh.`,
  },
  {
    chapterDe: "Der erste Arbeitstag",
    chapterEn: "The first work day",
    de: (line) =>
      `Timo holt Amara zur Probe im Büro ab. Es gibt Badges, einen Schrank, und zu viel Kaffee. Eine Kollegin, Nora, erklärt den Drucker in einem Satz, der zu schnell ist. Amara stoppt sie höflich und sagt, was sie wirklich braucht: „${line}“ Nora verlangsamt. Der Drucker macht danach, was er soll.`,
    en: (line) =>
      `Timo collects Amara for a trial day in the office. There are badges, a locker, and too much coffee. A colleague, Nora, explains the printer in one sentence that is too fast. Amara stops her politely and says what she actually needs: "${line}" Nora slows down. After that the printer does what it should.`,
  },
  {
    chapterDe: "In der Apotheke",
    chapterEn: "At the pharmacy",
    de: (line) =>
      `Amara hat Halsschmerzen. In der Apotheke ist es still und hell. Der Apotheker fragt nach Allergien und nach der Dauer. Amara kennt das Wort für weh, aber sie will den ganzen Satz richtig. Sie sagt: „${line}“ Er gibt ihr etwas Mildes und erklärt die Uhrzeiten auf der Packung noch einmal langsam.`,
    en: (line) =>
      `Amara has a sore throat. The pharmacy is quiet and bright. The pharmacist asks about allergies and how long it has lasted. Amara knows the word for pain, but she wants the whole line right. She says: "${line}" He gives her something mild and explains the times on the pack once more, slowly.`,
  },
  {
    chapterDe: "Sonntag im Park",
    chapterEn: "Sunday in the park",
    de: (line) =>
      `Sonntag. Der Park ist voller Räder und Hunde. Timo bringt Brot vom Markt. Sie sitzen auf einer Bank, nicht als Prüfung, nur als Pause. Ein Kind verliert einen Ball. Amara hebt ihn auf und sagt dem Kind denselben Satz, den sie die ganze Woche geübt hat, diesmal ohne Angst: „${line}“ Das Kind sagt danke und läuft weiter.`,
    en: (line) =>
      `Sunday. The park is full of bikes and dogs. Timo brings bread from the market. They sit on a bench, not as a test, only as a rest. A child loses a ball. Amara picks it up and says to the child the same line she practised all week, this time without fear: "${line}" The child says thanks and runs on.`,
  },
  {
    chapterDe: "Wieder bei Frau Stein",
    chapterEn: "Back with Frau Stein",
    de: (line) =>
      `In der nächsten Stunde arbeitet die Klasse in Paaren. Amara sitzt mit einem Mann aus Syrien, Karim. Sie sollen eine kurze Geschichte erzählen, nicht eine Liste. Amara beginnt mit einem Satz aus ihrem Modul, aber sie setzt ihn in ihre Woche: „${line}“ Karim antwortet mit seiner Version. Frau Stein geht vorbei und streicht nichts durch.`,
    en: (line) =>
      `In the next class the group works in pairs. Amara sits with a man from Syria, Karim. They should tell a short story, not a list. Amara starts with a line from her module, but she puts it into her week: "${line}" Karim answers with his version. Frau Stein walks past and crosses nothing out.`,
  },
  {
    chapterDe: "Ein Brief an sich selbst",
    chapterEn: "A note to herself",
    de: (line) =>
      `Abends schreibt Amara drei Zeilen in ein Heft, nicht für die Lehrerin, für sich. Draußen fährt eine Bahn. Sie will den Satz nicht vergessen, weil er ihr am Schalter geholfen hat. Sie schreibt ihn, liest ihn, und spricht ihn einmal gegen das geschlossene Fenster: „${line}“ Dann klappt sie das Heft zu.`,
    en: (line) =>
      `In the evening Amara writes three lines in a notebook, not for the teacher, for herself. A tram passes outside. She does not want to forget the line, because it helped her at the counter. She writes it, reads it, and says it once against the closed window: "${line}" Then she shuts the notebook.`,
  },
  {
    chapterDe: "Noch eine Woche",
    chapterEn: "Another week",
    de: (line) =>
      `Eine Woche später ist der Satz kein fremdes Ding mehr. Amara kauft Brot, grüßt Leyla, zeigt Nora den Drucker, und füllt bei Frau Keller das nächste Blatt. Irgendwo zwischen Tür und Treppe braucht sie die Wörter wieder. Sie sagt sie, ohne das Heft: „${line}“ Niemand klatscht. Das ist in Ordnung. Der Tag geht weiter.`,
    en: (line) =>
      `A week later the line is no longer a foreign object. Amara buys bread, greets Leyla, shows Nora the printer, and fills the next sheet with Frau Keller. Somewhere between a door and the stairs she needs the words again. She says them without the notebook: "${line}" Nobody claps. That is fine. The day goes on.`,
  },
];

function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

export function estimatedMinutes(beats: { de: string }[], paceWords = WORDS_PER_MIN): number {
  const words = beats.reduce((sum, row) => sum + wordCount(row.de), 0);
  return Math.max(1, Math.round(words / paceWords));
}

export function buildListenStory(opts: {
  modules: StoryModule[];
  learned: Set<string>;
  passed: Set<string>;
  cefr: string;
  moduleId?: string;
  minutes?: ListenDuration;
  random?: () => number;
}): ListenStory {
  const random = opts.random ?? Math.random;
  const minutes: ListenDuration = opts.minutes && LISTEN_DURATIONS.includes(opts.minutes) ? opts.minutes : 10;
  const doneIds = finishedModuleIds(opts.modules, opts.learned, opts.passed);
  const chosen = opts.moduleId ? opts.modules.find((row) => row.id === opts.moduleId) : undefined;
  const topicModule = chosen ?? opts.modules[0];
  if (!topicModule) {
    return {
      id: "empty",
      topic: "Module 1",
      moduleTitle: "Module 1",
      reason: "This course has no modules with language yet.",
      minutes,
      chapter: "Start",
      beats: [{ de: "Willkommen. Wählen Sie zuerst ein Modul.", en: "Welcome. Choose a module first.", chapter: "Start" }],
    };
  }

  const moduleIndex = Math.max(
    0,
    opts.modules.findIndex((row) => row.id === topicModule.id),
  );
  const label = moduleLabel(moduleIndex, topicModule.title);
  const learnedHere = topicModule.phrases.filter((row) => opts.learned.has(row.id));
  const here = (learnedHere.length >= 4 ? learnedHere : topicModule.phrases).filter((row) => row.target_text.trim());
  const earlier = opts.modules
    .slice(0, moduleIndex)
    .flatMap((row) => row.phrases)
    .filter((row) => row.target_text.trim());
  const pool = [...here, ...(minutes >= 30 ? earlier : [])];
  const source = pool.length ? pool : here;
  const finished = doneIds.includes(topicModule.id);
  const reason = finished
    ? `A continuous story from ${label}. You finished this module, so the lines you learned sit inside Amara's week in Germany.`
    : `A continuous story from ${label}. Amara uses the German from this module in real places, not as a list of "and then".`;

  const target = minutes * WORDS_PER_MIN;
  const beats: ListenStory["beats"] = [];
  if (!source.length) {
    beats.push({
      de: "In diesem Modul fehlen noch Sätze für eine Geschichte.",
      en: "This module does not have lines for a story yet.",
      chapter: label,
    });
  } else {
    let guard = 0;
    while (beats.reduce((sum, row) => sum + wordCount(row.de), 0) < target && guard < 400) {
      const phrase = source[guard % source.length]!;
      const scene = SCENES[guard % SCENES.length]!;
      beats.push({
        de: scene.de(phrase.target_text.trim()),
        en: scene.en(phrase.source_text.trim()),
        chapter: scene.chapterDe,
      });
      guard += 1;
    }
  }

  return {
    id: `${topicModule.id}-${minutes}-${Math.floor(random() * 1e6)}`,
    topic: label,
    moduleTitle: label,
    reason,
    minutes,
    chapter: beats[0]?.chapter ?? label,
    beats,
  };
}
