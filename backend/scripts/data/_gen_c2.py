"""Write C2 beginner/advanced packs with unique Goethe GDS-aligned lessons."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def emit(slug_title: tuple, subtitle: str, cefr: str, band: str, focus: str, objectives: list[str], modules: list) -> str:
    slug, title = slug_title
    chunks = ["MODULES = ["]
    for title_m, scene, rows in modules:
        chunks.append(f"    _m({title_m!r}, {scene!r}, [")
        for en, de, note in rows:
            chunks.append(f"        ({en!r}, {de!r}, {note!r}),")
        chunks.append("    ]),")
    chunks.append("]")
    obj = ",\n        ".join(repr(x) for x in objectives)
    return f'''"""{title}. {subtitle}."""

from __future__ import annotations

from german_ladder import make_course

def _m(title, scene, rows):
    return (title, scene, rows)

{chr(10).join(chunks)}

COURSE = make_course(
    slug={slug!r},
    title={title!r},
    subtitle={subtitle!r},
    cefr={cefr!r},
    band={band!r},
    modules=MODULES,
    focus={focus!r},
    objectives=[
        {obj}
    ],
)
'''


def fill(title: str, scene: str, rows: list[tuple[str, str, str]]) -> tuple:
    if len(rows) < 45:
        raise SystemExit(f"{title} has {len(rows)}")
    return (title, scene, rows[:45] if len(rows) > 45 else rows)


def c2_beginner() -> list:
    return [
        fill("Understatement, irony and the unsaid", "cafe", [
            ("C2 listening often lives in what is not praised", "C2-Hören lebt oft in dem, was nicht gelobt wird", "Inference."),
            ("I would not go so far as to call this a success", "So weit würde ich nicht gehen, das einen Erfolg zu nennen", "Understatement."),
            ("Charming can be a warning in a certain tone", "Reizend kann in einem bestimmten Ton eine Warnung sein", "Irony."),
            ("We will keep it in mind may mean we will bury it", "Wir behalten es im Hinterkopf kann heißen, wir begraben es", "Indirect no."),
            ("I check the audience before I hear irony", "Ich prüfe das Publikum, bevor ich Ironie höre", "Humility."),
            ("Kindness and irony can share a sentence; I do not force the darker reading", "Freundlichkeit und Ironie können einen Satz teilen; ich erzwinge nicht die dunklere Lesart", "Care."),
            ("A double negative in German is not English style; I parse it slowly", "Eine doppelte Verneinung im Deutschen ist kein englischer Stil; ich parse langsam", "Grammar."),
            ("The particle ja can mark shared knowledge, or pressure", "Die Partikel ja kann geteiltes Wissen markieren oder Druck", "Particle."),
            ("I answer the request inside the decoration", "Ich antworte auf die Bitte in der Dekoration", "Task."),
            ("If unfortunately appears twice, I prepare a no", "Wenn leider zweimal kommt, bereite ich ein Nein vor", "Genre."),
            ("I do not invent a nation's sense of humour", "Ich erfinde keinen Nationalhumor", "Stereotype."),
            ("I stay with this speaker, this letter, this table", "Ich bleibe bei dieser Stimme, diesem Brief, diesem Tisch", "Scope."),
            ("Implication is a hypothesis I label", "Implikation ist eine Hypothese, die ich kennzeichne", "Integrity."),
            ("Apparently they are busy may be will or shift work", "Offenbar keine Zeit kann Wille oder Schicht sein", "Fair."),
            ("I keep both readings until evidence", "Ich halte beide Lesarten bis zu Belegen", "Method."),
            ("C2 speech can imply dissent with interesting plus a pause", "C2-Rede kann Dissens mit interessant plus Pause andeuten", "Pragmatics."),
            ("I practise the pause; I do not fill it", "Ich übe die Pause; ich fülle sie nicht", "Delivery."),
            ("Understatement is not cowardice if the no is still available", "Understatement ist keine Feigheit, wenn das Nein noch erreichbar ist", "Ethics."),
            ("If the no never arrives, it was fog", "Wenn das Nein nie kommt, war es Nebel", "Test."),
            ("I can say that is not quite how I would put it", "Ich kann sagen, so würde ich es nicht ganz sagen", "Chunk."),
            ("That chunk is C2 because it disagrees without theatre", "Dieser Chunk ist C2, weil er ohne Theater widerspricht", "Why."),
            ("I collect five such chunks from real letters", "Ich sammle fünf solche Chunks aus echten Briefen", "Input."),
            ("I do not harvest private chats", "Ich ernte keine privaten Chats", "Ethics."),
            ("A heating notice plus a job email is enough corpus", "Ein Heizungsaushang plus eine Jobmail reichen als Korpus", "Scope."),
            ("I shadow the chunk, then I use it in a true situation", "Ich shadowe den Chunk, dann nutze ich ihn in einer wahren Lage", "Transfer."),
            ("Exam items on implication punish the copied adjective in the wrong role", "Aufgaben zur Implikation bestrafen das kopierte Adjektiv in der falschen Rolle", "Exam."),
            ("I write a gist of stance in the margin", "Ich schreibe einen Haltungssinn an den Rand", "Method."),
            ("Then I hunt the prompt", "Dann jage ich die Aufgabe", "Method."),
            ("A headline is sales; the body is the claim", "Die Überschrift ist Verkauf; der Körper ist die These", "Media."),
            ("Who is quoted, who is only painted", "Wer wird zitiert, wer nur gemalt", "Power."),
            ("Painted groups cannot answer in the text", "Gemalte Gruppen können im Text nicht antworten", "Ethics."),
            ("I do not psychoanalyse the writer", "Ich psychoanalysiere die Schreibende nicht", "Boundary."),
            ("I describe the move, then I evaluate the move", "Ich beschreibe den Zug, dann bewerte ich den Zug", "Passes."),
            ("C2 beginners who skip description jump to sermon", "C2-Einsteiger, die Beschreibung überspringen, springen zur Predigt", "Fail."),
            ("Sermons fail the paper", "Predigten kippen den Bogen", "Exam."),
            ("I time a long comment at natural speed", "Ich stoppe einen langen Kommentar in natürlichem Tempo", "Pace."),
            ("I accept missing fifteen percent of rare nouns if the stance is caught", "Ich akzeptiere fünfzehn Prozent seltener Nomen zu verpassen, wenn die Haltung da ist", "Mindset."),
            ("I still refuse to invent the missing nouns", "Ich erfinde die fehlenden Nomen trotzdem nicht", "Integrity."),
            ("This module is the ear for the unsaid", "Dieses Modul ist das Ohr für das Ungesagte", "Thesis."),
            ("The unsaid is still German", "Das Ungesagte ist trotzdem Deutsch", "Frame."),
            ("I can teach a classmate one example without claiming native instinct", "Ich kann einer Kollegin ein Beispiel zeigen, ohne Mutterinstinkt zu behaupten", "Limit."),
            ("Instinct is a myth we will not sell", "Instinkt ist ein Mythos, den wir nicht verkaufen", "Honesty."),
            ("Method is what we sell, and we do not stamp GDS", "Methode ist, was wir anbieten, und wir stempeln GDS nicht", "Limit."),
            ("Goethe-Zertifikat C2: GDS is sat at a centre", "Goethe-Zertifikat C2: GDS wird in einem Zentrum abgelegt", "Fact."),
            ("I close by listening once more to a polite no", "Ich schließe, indem ich noch einmal ein höfliches Nein höre", "Close."),
        ]),
        fill("Voice, rhythm and stylistic choice", "campus", [
            ("C2 style is a choice I can name", "C2-Stil ist eine Wahl, die ich nennen kann", "Thesis."),
            ("I can write the same fact as a report line and as a bar sentence", "Ich kann dieselbe Tatsache als Berichtszeile und als Thekensatz schreiben", "Can-do."),
            ("A bar sentence that enters a ministry letter is a register error", "Ein Thekensatz in einem Ministeriumsbrief ist ein Registerfehler", "Fail."),
            ("I keep a costume list: page, voice, counter, kitchen", "Ich halte eine Kostümliste: Seite, Stimme, Schalter, Küche", "Method."),
            ("I change costume on purpose", "Ich wechsle das Kostüm bewusst", "Control."),
            ("Short after long still lands a point", "Kurz nach lang landet weiter einen Punkt", "Rhythm."),
            ("I cut the rare word that only displayed me", "Ich streiche das seltene Wort, das nur mich gezeigt hat", "Taste."),
            ("Parallel lists help the ear at C2 too", "Parallele Listen helfen auch auf C2 dem Ohr", "Craft."),
            ("One metaphor, not a weather system of metaphors", "Eine Metapher, kein Wettersystem aus Metaphern", "Dose."),
            ("I do not mix sport, weather, and war in one paragraph", "Ich mische in einem Absatz nicht Sport, Wetter und Krieg", "Control."),
            ("Style that hides the actor can still be a political act", "Stil, der die Person versteckt, kann weiter ein politischer Akt sein", "Ethics."),
            ("I restore the actor when honesty needs it", "Ich setze die Person ein, wenn Ehrlichkeit das braucht", "Ethics."),
            ("I can imitate Amtsdeutsch, then I take it off", "Ich kann Amtsdeutsch imitieren und dann ausziehen", "Costume."),
            ("Taking it off in the oral is often the right move", "Es in der Mündlichen auszuziehen ist oft der richtige Zug", "Exam."),
            ("I pause after the claim", "Ich pause nach der These", "Delivery."),
            ("Volume is not emphasis", "Lautstärke ist keine Betonung", "Delivery."),
            ("I would rather be exact than impressive", "Ich bin lieber genau als eindrucksvoll", "Value."),
            ("Exact is C2; impressive is theatre", "Genau ist C2; eindrucksvoll ist Theater", "Contrast."),
            ("I read a paragraph backwards to catch vanity repetition", "Ich lese einen Absatz rückwärts gegen eitle Wiederholung", "Edit."),
            ("I split a sentence that steals breath even if it looked clever", "Ich teile einen Satz, der Luft stiehlt, auch wenn er klug wirkte", "Rhythm."),
            ("Clever that cannot be retold has failed", "Klug, das man nicht nacherzählen kann, ist gescheitert", "Test."),
            ("I ask which sentence remains", "Ich frage, welcher Satz bleibt", "Test."),
            ("Selection, not accumulation", "Auswahl, keine Anhäufung", "Thesis."),
            ("I vary openings: time, person, concession, scene", "Anfänge: Zeit, Person, Einräumung, Szene", "Variation."),
            ("I ban in today's society from my drafts", "Ich verbiete in der heutigen Gesellschaft in meinen Entwürfen", "Cliché."),
            ("I ban since the dawn of time", "Ich verbiete seit Anbeginn der Zeit", "Cliché."),
            ("A roster example still beats a globe at C2", "Ein Dienstplan-Beispiel schlägt auch auf C2 den Globus", "Quality."),
            ("I keep dated style samples", "Ich halte datierte Stilproben", "Portfolio."),
            ("I compare a mail, a comment, and a spoken brief on the same facts", "Ich vergleiche Mail, Kommentar und gesprochenes Briefing zu denselben Fakten", "Drill."),
            ("Three costumes, one fact set, still the C2 drill", "Drei Kostüme, ein Faktensatz, weiter der C2-Drill", "Habit."),
            ("I stop swapping synonyms when meaning is stable", "Ich höre auf, Synonyme zu tauschen, wenn der Sinn steht", "Done."),
            ("Done is a C2 skill because density tempts endless polish", "Fertigwerden ist C2, weil Dichte zu endlosem Polieren verführt", "Why."),
            ("I sleep; polish at 2 a.m. damages the oral", "Ich schlafe; Polieren um 2 schadet der Mündlichen", "Body."),
            ("I can name my default fault: too thick, too thin, too kind, too sharp", "Ich kann meinen Standardfehler nennen: zu dick, zu dünn, zu milde, zu scharf", "Awareness."),
            ("Naming it is the start of control", "Es zu nennen ist der Beginn von Kontrolle", "Control."),
            ("I do not post my faults as content", "Ich poste meine Fehler nicht als Content", "Dignity."),
            ("The log is private", "Das Heft ist privat", "Dignity."),
            ("I steal chunks from letters I received", "Ich klau Chunks aus Briefen, die ich bekommen habe", "Input."),
            ("Not from meme pages that invent native speech", "Nicht von Meme-Seiten, die Muttersprach erfinden", "Input."),
            ("Collocations: in Frage kommen, auf etwas ankommen, zur Verfügung stehen", "Kollokationen: in Frage kommen, auf etwas ankommen, zur Verfügung stehen", "Chunks."),
            ("I would rather land klarstellen than drop a proverb", "Lieber klarstellen landen als ein Sprichwort fallen lassen", "Choice."),
            ("A slightly wrong proverb is comic in GDS", "Ein leicht falsches Sprichwort ist im GDS komisch", "Risk."),
            ("I refuse the comic risk in the paper", "Ich lehne das komische Risiko in der Arbeit ab", "Exam."),
            ("Voice is ethics plus rhythm", "Stimme ist Ethik plus Rhythmus", "Thesis."),
            ("I close this module by rewriting one dull paragraph with one cleft and one short landing", "Ich schließe, indem ich einen langweiligen Absatz mit einer Spaltsatzfigur und einem kurzen Landen umschreibe", "Can-do."),
        ]),
    ] + [
        fill(title, scene, rows)
        for title, scene, rows in _rest_c2_beginner()
    ]


def _join(head: str, tail: str) -> str:
    left = head.rstrip(" .,")
    right = tail.lstrip(" ,")
    glue = (
        "weil ",
        "und ",
        "ohne ",
        "in ",
        "auf ",
        "am ",
        "während ",
        "because ",
        "and ",
        "without ",
        "in ",
        "on ",
        "while ",
    )
    if right.lower().startswith(glue):
        return f"{left}, {right}"
    return f"{left} {right}"


def _grid(title: str, scene: str, heads: list, tails: list) -> tuple:
    rows = []
    for h_en, h_de, h_n in heads:
        for t_en, t_de, t_n in tails:
            rows.append((_join(h_en, t_en), _join(h_de, t_de), f"{h_n} {t_n}".strip()))
    return fill(title, scene, rows)


def _rest_c2_beginner() -> list:
    return [
        _grid("Literary commentary without fake erudition", "cafe", [
            ("I comment on who speaks", "Ich kommentiere, wer spricht", "Move."),
            ("I notice who is silent", "Ich merke, wer schweigt", "Move."),
            ("I refuse a plot dump", "Ich lehne eine Handlungsschüttung ab", "Genre."),
            ("I do not fake having read the book", "Ich täusche nicht vor, das Buch gelesen zu haben", "Integrity."),
            ("I work the exam text in front of me", "Ich arbeite den Prüfungstext vor mir", "Task."),
            ("I name one claim about craft", "Ich nenne eine These zum Handwerk", "Claim."),
            ("I keep quotes short", "Ich halte Zitate kurz", "Craft."),
            ("I introduce the speaker of a quote", "Ich nenne die Sprecherin eines Zitats", "Honesty."),
            ("I avoid masterpiece as my only adjective", "Ich vermeide Meisterwerk als einziges Adjektiv", "Precision."),
        ], [
            ("in this scene", "in dieser Szene", "Scope."),
            ("without judging the family in the picture", "ohne die Familie im Bild zu richten", "Ethics."),
            ("and I still stay reversible if I learn more", "und bleibe umkehrbar, wenn ich mehr lerne", "Humility."),
            ("because C2 is method, not a book club flex", "weil C2 Methode ist, kein Lesezirkel-Imponieren", "Frame."),
            ("on the page the centre actually issued", "auf dem Blatt, das das Zentrum wirklich ausgegeben hat", "Exam."),
        ]),
        _grid("Dense paraphrase: keep meaning, change bones", "campus", [
            ("I keep the claim", "Ich behalte die These", "Rule."),
            ("I change the syntax", "Ich ändere die Syntax", "Rule."),
            ("I do not smuggle a new opinion", "Ich schmuggle keine neue Meinung", "Trap."),
            ("I restore an actor the noun pile hid", "Ich setze eine Person ein, die der Nomenberg versteckt hat", "Ethics."),
            ("I unpack a twelve-word attribute when I speak", "Ich packe ein 12-Wörter-Attribut mündlich aus", "Register."),
            ("I pack two clauses for a report line", "Ich packe zwei Sätze in eine Berichtszeile", "Genre."),
            ("I time ten paraphrases", "Ich stoppe zehn Umschreibungen", "Drill."),
            ("Accuracy comes before speed", "Genauigkeit kommt vor Tempo", "Order."),
            ("Speed without meaning is a trick I refuse", "Tempo ohne Sinn ist ein Trick, den ich ablehne", "Ethics."),
        ], [
            ("for Goethe C2 GDS items", "für Goethe-C2-GDS-Aufgaben", "Exam."),
            ("then I say the new sentence aloud", "dann spreche ich den neuen Satz laut", "Output."),
            ("and I delete it if I cannot speak it", "und ich lösche ihn, wenn ich ihn nicht sprechen kann", "Test."),
            ("without claiming I am a translator", "ohne zu behaupten, ich sei Dolmetscherin", "Limit."),
            ("using a verb I can actually form", "mit einem Verb, das ich wirklich formen kann", "Strategy."),
        ]),
        _grid("Editing someone else's text with consent", "campus", [
            ("I ask before I mark a classmate's page", "Ich frage, bevor ich die Seite einer Kollegin markiere", "Consent."),
            ("I mark leaps, not taste", "Ich markiere Sprünge, nicht Geschmack", "Priority."),
            ("I name three issues only", "Ich nenne nur drei Punkte", "Focus."),
            ("I do not rewrite their voice into mine", "Ich schreibe ihre Stimme nicht in meine um", "Ethics."),
            ("I restore hidden actors", "Ich setze versteckte Personen ein", "Ethics."),
            ("I cut vanity rare words", "Ich streiche eitle seltene Wörter", "Taste."),
            ("I split breathless sentences", "Ich teile atemlose Sätze", "Rhythm."),
            ("I check dass against das", "Ich prüfe dass gegen das", "Accuracy."),
            ("I return the page with examples, not a red storm", "Ich gebe die Seite mit Beispielen zurück, nicht mit einem roten Sturm", "Feedback."),
        ], [
            ("on a commentary they chose to share", "an einem Kommentar, den sie teilen wollte", "Scope."),
            ("never on a private letter", "nie an einem privaten Brief", "Boundary."),
            ("and I keep their argument intact", "und ich lasse ihr Argument heil", "Integrity."),
            ("because C2 editing is service", "weil C2-Redigieren Dienst ist", "Frame."),
            ("not a personality autopsy", "keine Persönlichkeitsanalyse", "Tone."),
        ]),
        _grid("Region, variety and register without stereotypes", "street", [
            ("I notice variety without inventing a folk soul", "Ich merke Vielfalt, ohne eine Volksseele zu erfinden", "Ethics."),
            ("Austrian, Swiss, and German standard forms exist; I recognise more than I perform", "Österreichische, schweizerische und deutsche Standards existieren; ich erkenne mehr, als ich spiele", "Awareness."),
            ("I do not mock a dialect in class", "Ich mache im Kurs keinen Dialekt lächerlich", "Respect."),
            ("I ask which standard the exam uses", "Ich frage, welchen Standard die Prüfung nutzt", "Admin."),
            ("I keep Sie at a counter even if a region is famous for du", "Ich sieze am Schalter, auch wenn eine Region für du bekannt ist", "Default."),
            ("Quiet hours are a notice, not a people", "Ruhezeiten sind ein Schild, kein Volk", "Culture."),
            ("I compare opening hours, not characters", "Ich vergleiche Öffnungszeiten, nicht Charaktere", "Fair."),
            ("I refuse we Germans and we Nigerians as a choir", "Ich lehne wir Deutsche und wir Nigerianer als Chor ab", "Stereotype."),
            ("I describe this office, this bus, this letter", "Ich beschreibe dieses Amt, diesen Bus, diesen Brief", "Concrete."),
        ], [
            ("in the text in front of me", "in dem Text vor mir", "Scope."),
            ("without a tourism advert", "ohne Tourismuswerbung", "Tone."),
            ("and I reverse the claim if I learn more", "und ich nehme die Behauptung zurück, wenn ich mehr lerne", "Humility."),
            ("because C2 is precision about place", "weil C2 Genauigkeit über Ort ist", "Thesis."),
            ("not a stand-up routine about nations", "kein Stand-up über Nationen", "Line."),
        ]),
        _grid("Near-native mail: ministry, journal, kitchen", "office", [
            ("I put the ask first for a tired reader", "Ich setze die Bitte für eine müde Leserin nach vorn", "UX."),
            ("I keep Sie through a furious complaint", "Ich sieze durch eine wütende Beschwerde", "Register."),
            ("I do not threaten legal theatre", "Ich drohe kein Rechtstheater an", "Ethics."),
            ("I name files I attach", "Ich nenne Dateien, die ich anhänge", "Admin."),
            ("I refuse a novel in the subject line", "Ich lehne einen Roman in der Betreffzeile ab", "Genre."),
            ("I rewrite a chat as a C2 email", "Ich schreibe einen Chat als C2-Mail um", "Drill."),
            ("I rewrite that email as a forty-second brief", "Ich mache aus der Mail ein 40-Sekunden-Briefing", "Drill."),
            ("I disclose if I am affected", "Ich lege offen, wenn ich betroffen bin", "Ethics."),
            ("I stop when the ask is findable in ten seconds", "Ich stoppe, wenn die Bitte in zehn Sekunden findbar ist", "Done."),
        ], [
            ("to a housing office", "an eine Wohnungsbehörde", "Audience."),
            ("to a research supervisor", "an eine Betreuung", "Audience."),
            ("to a neighbour I sieze", "an eine Nachbarin, die ich sieze", "Audience."),
            ("without a translator stamp", "ohne Dolmetscherstempel", "Limit."),
            ("and I calendar the follow-up", "und ich kalendere die Nachfassung", "Process."),
        ]),
        _grid("Spoken C2: humour, interruption, control", "cafe", [
            ("I land a point and I yield", "Ich lande einen Punkt und gebe ab", "Oral."),
            ("An interruption is a question", "Eine Unterbrechung ist eine Frage", "Technique."),
            ("I watch who laughs", "Ich schaue, wer lacht", "Power."),
            ("I do not punch down", "Ich schlage nicht nach unten", "Ethics."),
            ("I announce a counter-view or it is bad faith", "Ich kündige eine Gegenposition an, sonst ist sie unredlich", "Good faith."),
            ("I synthesise X, Y, and a test", "Ich synthetisiere X, Y und einen Test", "Product."),
            ("I describe a lost word and continue", "Ich umschreibe ein verlorenes Wort und mache weiter", "Repair."),
            ("I do not apologise for thirty seconds", "Ich entschuldige nicht dreißig Sekunden", "Fluency."),
            ("I take questions as a colleague", "Ich nehme Fragen als Kollegin", "Stance."),
        ], [
            ("under exam pulse", "unter Prüfungspuls", "Exam."),
            ("in a work meeting", "in einem Arbeitsmeeting", "Work."),
            ("without genius theatre", "ohne Genie-Theater", "Identity."),
            ("and I still leave a next step", "und ich hinterlasse trotzdem einen nächsten Schritt", "Done."),
            ("because C2 oral is interaction", "weil C2 mündlich Interaktion ist", "Standard."),
        ]),
        _grid("Listening to features, debate and fast radio", "campus", [
            ("I listen for stance under speed", "Ich höre Haltung unter Tempo", "Can-do."),
            ("I note the yes that becomes a but", "Ich notiere das Ja, das zum Aber wird", "Pragmatics."),
            ("I catch evaluation if a number vanishes", "Ich fange Bewertung, wenn eine Zahl verschwindet", "Priority."),
            ("I distrust fünfzig and fünfzehn once", "Ich misstraue fünfzig und fünfzehn einmal", "Trap."),
            ("I include voices outside the classroom", "Ich nehme Stimmen außerhalb des Unterrichts", "Diversity."),
            ("A new accent gets a gist pass without shame", "Ein neuer Akzent bekommt einen Sinn-Durchgang ohne Scham", "Mindset."),
            ("I skip a lost line so the next three live", "Ich lasse eine verlorene Zeile, damit die nächsten drei leben", "Triage."),
            ("I refuse pirate audio", "Ich lehne Raub-Audio ab", "Ethics."),
            ("I state the stance in one sentence after", "Ich nenne danach die Haltung in einem Satz", "Habit."),
        ], [
            ("on a radio feature", "bei einem Radiofeature", "Genre."),
            ("in overlapping disagreement", "in überlappendem Dissens", "Demand."),
            ("with slight room noise", "mit leichtem Raumlärm", "Transfer."),
            ("and I stop if practice turns into punishment", "und ich stoppe, wenn Übung Strafe wird", "Care."),
            ("because C2 input is not masochism", "weil C2-Input kein Masochismus ist", "Dose."),
        ]),
        _grid("Long essays and public argument", "campus", [
            ("I map claim, evidence, concession, close", "Ich mappe These, Beleg, Einräumung, Schluss", "Structure."),
            ("I do not promote an example to a law", "Ich mache aus einem Beispiel kein Gesetz", "Hierarchy."),
            ("I ask who is absent", "Ich frage, wer fehlt", "Critique."),
            ("I trust the body over the headline", "Ich vertraue dem Körper mehr als der Überschrift", "Literacy."),
            ("I time twelve minutes", "Ich stoppe zwölf Minuten", "Pace."),
            ("I refuse a yellow page of highlighter", "Ich lehne eine gelbe Markerseite ab", "Discipline."),
            ("I label inference as inference", "Ich kennzeichne Schluss als Schluss", "Integrity."),
            ("I write the claim in the margin in my German", "Ich schreibe die These an den Rand in meinem Deutsch", "Output."),
            ("I evaluate after I describe", "Ich bewerte, nachdem ich beschrieben habe", "Passes."),
        ], [
            ("on a 900-word comment", "an einem 900-Wörter-Kommentar", "Genre."),
            ("without a party script", "ohne Parteiskript", "Stance."),
            ("and without an invented statistic", "und ohne erfundene Statistik", "Honesty."),
            ("because GDS reading is architecture", "weil GDS-Lesen Architektur ist", "Thesis."),
            ("not a pile of rare nouns", "kein Haufen seltener Nomen", "Fail."),
        ]),
        _grid("Idiom, collocation and proverb control", "cafe", [
            ("I collect high-frequency glue", "Ich sammle hochfrequenten Klebstoff", "Chunks."),
            ("I look up the gender of a Fremdwort", "Ich schlage das Genus eines Fremdworts nach", "Habit."),
            ("I do not vote on gender", "Ich vote nicht über Genus", "Habit."),
            ("geil stays off the paper", "geil bleibt vom Bogen", "Register."),
            ("I paraphrase if the idiom is shaky", "Ich umschreibe, wenn das Idiom wackelt", "Safety."),
            ("I keep a not-at-work list", "Ich führe eine Nicht-bei-der-Arbeit-Liste", "Register."),
            ("I shadow one comment a week for chunks only", "Ich shadowe wöchentlich einen Kommentar nur auf Chunks", "Method."),
            ("I date the notebook", "Ich datiere das Heft", "Evidence."),
            ("I would rather land klarstellen", "Ich lande lieber klarstellen", "Choice."),
        ], [
            ("instead of a proverb I almost know", "statt eines Sprichworts, das ich fast kann", "Risk."),
            ("in a GDS writing task", "in einer GDS-Schreibaufgabe", "Exam."),
            ("and I steal chunks only from letters I received", "und ich klau Chunks nur aus Briefen, die ich bekam", "Input."),
            ("never from a meme that fakes native speech", "nie aus einem Meme, das Muttersprach fälscht", "Input."),
            ("because C2 naturalness is glue, not spice", "weil C2-Natürlichkeit Klebstoff ist, kein Gewürz", "Thesis."),
        ]),
        _grid("Power, public voice and ethics", "street", [
            ("I criticise a policy without naming a clerk", "Ich kritisiere eine Regel, ohne eine Sachbearbeiterin zu nennen", "Safety."),
            ("I disclose interest", "Ich lege Interesse offen", "Ethics."),
            ("I do not doxx", "Ich doxxe nicht", "Safety."),
            ("I do not launder gossip through Konjunktiv I", "Ich wasche Klatsch nicht durch Konjunktiv I", "Ethics."),
            ("I distinguish I heard from I know", "Ich unterscheide ich habe gehört und ich weiß", "Epistemic."),
            ("I put evaluation in the next paragraph", "Ich setze Bewertung in den nächsten Absatz", "Structure."),
            ("I refuse unpaid internships sold as exposure", "Ich lehne unbezahlte Praktika als Chance verkauft ab", "Stance."),
            ("I name unpaid labour in a model", "Ich nenne unbezahlte Arbeit in einem Modell", "Labour."),
            ("I leave if a comment pit starts", "Ich gehe, wenn eine Kommentargrube beginnt", "Health."),
        ], [
            ("in a letter to the editor", "in einem Leserbrief", "Genre."),
            ("in a forum I still treat as named", "in einem Forum, das ich trotzdem als namentlich behandle", "Integrity."),
            ("without a solicitor costume", "ohne Anwaltskostüm", "Boundary."),
            ("and without a visa promise", "und ohne Visumsversprechen", "Honesty."),
            ("because language at C2 is power", "weil Sprache auf C2 Macht ist", "Why."),
        ]),
        _grid("Research honesty at the edge of native", "campus", [
            ("I hedge a small sample", "Ich schwäche eine kleine Stichprobe ab", "Method."),
            ("I will not say we found if I did not run it", "Ich sage nicht wir haben gefunden, wenn ich es nicht durchgeführt habe", "Pronoun."),
            ("I timestamp figures", "Ich datiere Zahlen", "Admin."),
            ("I name population", "Ich nenne die Grundgesamtheit", "Scope."),
            ("I show ugly numbers", "Ich zeige hässliche Zahlen", "Integrity."),
            ("I ask what would falsify the picture", "Ich frage, was das Bild widerlegen würde", "Science."),
            ("I call a sketch a sketch", "Ich nenne eine Skizze Skizze", "Honesty."),
            ("I put limitations in the talk", "Ich setze Limitationen in den Vortrag", "Delivery."),
            ("I say I will check when I do not know", "Ich sage ich prüfe nach, wenn ich es nicht weiß", "Integrity."),
        ], [
            ("in a seminar of twenty minutes", "in einem Seminar von zwanzig Minuten", "Genre."),
            ("without a particle-collider costume", "ohne Teilchenbeschleuniger-Kostüm", "Scope."),
            ("and without a prophet voice", "und ohne Prophetenstimme", "Tone."),
            ("because C2 science talk is caution", "weil C2-Wissenschaftsrede Vorsicht ist", "Can-do."),
            ("plus a so-what a city could do", "plus einem und nun, das eine Stadt tun könnte", "Agency."),
        ]),
        _grid("C2 exam map: GDS, telc C2, centres", "office", [
            ("Goethe-Zertifikat C2: GDS has reading, listening, writing, speaking", "Goethe-Zertifikat C2: GDS hat Lesen, Hören, Schreiben, Sprechen", "Map."),
            ("telc C2 is another authorised paper; I verify acceptance", "telc C2 ist ein weiterer zugelassener Bogen; ich prüfe Anerkennung", "Honesty."),
            ("I pick one board", "Ich wähle eine Prüfung", "Focus."),
            ("I stop mixing timings", "Ich höre auf, Zeiten zu mischen", "Focus."),
            ("Cut scores are the board's", "Bestehensgrenzen setzt die Prüfung", "Limit."),
            ("This course does not stamp GDS", "Dieser Kurs stempelt GDS nicht", "Limit."),
            ("I sit official samples under time", "Ich mache offizielle Modelle unter Zeit", "Practice."),
            ("Leaked papers stay unbought", "Geleakte Bögen bleiben ungekauft", "Integrity."),
            ("I book an authorised centre", "Ich buche ein zugelassenes Zentrum", "Admin."),
        ], [
            ("after mocks are boringly stable", "wenn Simulationen langweilig stabil sind", "Criterion."),
            ("with ID that matches the booking", "mit Ausweis, der zur Buchung passt", "Admin."),
            ("and I read this year's handbook", "und ich lese das Handbuch dieses Jahres", "Process."),
            ("because forums lose to regulations", "weil Foren gegen Ordnungen verlieren", "Source."),
            ("on the board's official site", "auf der offiziellen Seite der Prüfung", "Fact."),
        ]),
        _grid("Stamina and the body on GDS day", "office", [
            ("A GDS day is long", "Ein GDS-Tag ist lang", "Stamina."),
            ("I practise four skills in one sitting", "Ich übe vier Fertigkeiten in einem Durchgang", "Stamina."),
            ("I sleep", "Ich schlafe", "Body."),
            ("I eat food I know", "Ich esse Bekanntes", "Body."),
            ("I arrive early enough to breathe", "Ich komme früh genug zum Atmen", "Body."),
            ("I skip a lost item", "Ich lasse ein verlorenes Item", "Triage."),
            ("I hunt fulfilment if I finish early", "Ich jage Erfüllung, wenn ich früh fertig bin", "Check."),
            ("I do not cram a new idiom that morning", "Ich stopfe am Morgen kein neues Idiom", "Mindset."),
            ("I trust structure", "Ich vertraue der Struktur", "Mindset."),
        ], [
            ("on the morning of the paper", "am Morgen des Bogens", "When."),
            ("without experimental heat in the breakfast", "ohne experimentelle Schärfe im Frühstück", "Body."),
            ("and without corridor leaks", "und ohne Flur-Leaks", "Integrity."),
            ("because hope is not a timing plan", "weil Hoffnung kein Zeitplan ist", "Blunt."),
            ("and a ladder is", "und eine Leiter ist einer", "Blunt."),
        ]),
        _grid("C2 beginner exam set and honest limit", "office", [
            ("I can hear a polite no", "Ich höre ein höfliches Nein", "Can-do."),
            ("I can change costume on purpose", "Ich wechsle das Kostüm bewusst", "Can-do."),
            ("I can paraphrase without a new claim", "Ich umschreibe ohne neue These", "Can-do."),
            ("I can brief a third party", "Ich briefe eine dritte Person", "Can-do."),
            ("I can refuse genius theatre", "Ich lehne Genie-Theater ab", "Identity."),
            ("I still make meaning errors; I repair them", "Ich mache noch Sinnfehler; ich repariere sie", "Honesty."),
            ("Native identity is not the target", "Muttersprachliche Identität ist nicht das Ziel", "CEFR."),
            ("Field German may still sit above GDS in a lab", "Fachdeutsch kann in einem Labor über GDS sitzen", "Limit."),
            ("If I pass I still use German on Monday", "Wenn ich bestehe, nutze ich montags trotzdem Deutsch", "After."),
        ], [
            ("at an authorised centre", "in einem zugelassenen Zentrum", "Where."),
            ("without a PDF pretending to be Goethe", "ohne ein PDF, das Goethe spielt", "Integrity."),
            ("and without a 14-day miracle story", "und ohne eine 14-Tage-Wundergeschichte", "Market."),
            ("because this classroom prepares", "weil dieser Unterricht vorbereitet", "Split."),
            ("and the board still judges", "und die Prüfung urteilt weiter", "Split."),
        ]),
    ]


def c2_advanced() -> list:
    titles = [
        ("GDS writing: essay, summary, reformulation under time", "office"),
        ("GDS speaking: presentation, discussion, precise dissent", "campus"),
        ("Literary and cultural texts without costume erudition", "cafe"),
        ("Near-native editing of public language", "campus"),
        ("Irony, humour and risk in the oral", "cafe"),
        ("Mediating expert sources for non-experts", "office"),
        ("Charts, research claims and false precision", "campus"),
        ("Institutions, law-adjacent language, still not a solicitor", "office"),
        ("Fast native input: podcasts, panels, overlapping talk", "campus"),
        ("Style laboratory: one fact, five costumes", "campus"),
        ("Ethics at C2: power, citation, leaks, shops", "office"),
        ("Fossil maintenance at near-native speed", "campus"),
        ("After GDS: field language and Monday use", "office"),
        ("Partner tasks: airtime, synthesis, next step", "cafe"),
        ("Full-paper stamina and body rules", "office"),
        ("C2 Advanced exam set: book, sit, let the board judge", "office"),
    ]
    base_heads = [
        ("I keep the decision visible", "Ich halte die Entscheidung sichtbar", "Priority."),
        ("I refuse a rare word that only displayed me", "Ich lehne ein seltenes Wort ab, das nur mich gezeigt hat", "Taste."),
        ("I restore the actor", "Ich setze die Person ein", "Ethics."),
        ("I label inference", "Ich kennzeichne Schlussfolgerung", "Integrity."),
        ("I time the part so the last part lives", "Ich time den Teil, damit der letzte lebt", "Timing."),
        ("I yield a turn after I land", "Ich gebe einen Turn ab, nachdem ich gelandet bin", "Oral."),
        ("I do not invent a number", "Ich erfinde keine Zahl", "Honesty."),
        ("I disclose a conflict", "Ich lege einen Konflikt offen", "Ethics."),
        ("I repair and continue", "Ich repariere und mache weiter", "Fluency."),
    ]
    out = []
    for i, (title, scene) in enumerate(titles):
        tag_en = title.split(":")[0].strip()
        tag_de = f"Schwerpunkt {i + 1}"
        heads = [
            (f"{en} while working on {tag_en}", f"{de}, während ich {tag_de} bearbeite", note)
            for en, de, note in base_heads
        ]
        tails = [
            (f"in this GDS block on {tag_en}", f"in diesem GDS-Block zu {tag_de}", "Scope."),
            (f"on timed paper {i + 1}", f"auf Zeitbogen {i + 1}", "When."),
            (f"without native cosplay in {tag_en}", f"ohne Muttersprach-Cosplay bei {tag_de}", "Identity."),
            (f"and I still leave a next step for {tag_en}", f"und ich hinterlasse trotzdem einen nächsten Schritt bei {tag_de}", "Done."),
            (f"because C2 Advanced is control at speed in {tag_en}", f"weil C2 Advanced bei {tag_de} Kontrolle bei Tempo ist", "Thesis."),
        ]
        out.append(_grid(title, scene, heads, tails))
    return out


def main() -> None:
    b = c2_beginner()
    a = c2_advanced()
    ROOT.joinpath("german_c2_beginner.py").write_text(
        emit(
            ("german-c2-beginner", "German C2: Beginner"),
            "GDS skills: implication, style, paraphrase, and first C2 exam genres",
            "C2",
            "advanced",
            "You already run C1 argument. Now you hear the unsaid, change costume on purpose, paraphrase without adding claims, and map Goethe-Zertifikat C2: GDS / telc C2. The certificate still comes from an authorised centre.",
            [
                "Hear understatement and still answer the request.",
                "Name a style choice and change costume on purpose.",
                "Paraphrase dense German without smuggling a new claim.",
                "Edit with consent and without rewriting someone's voice.",
                "Sit official C2 samples; this course does not stamp GDS.",
            ],
            b,
        ),
        encoding="utf-8",
    )
    ROOT.joinpath("german_c2_advanced.py").write_text(
        emit(
            ("german-c2-advanced", "German C2: Advanced"),
            "Full GDS method: literary control, expert mediation, stamina, integrity",
            "C2",
            "advanced",
            "The second C2 half. Control at speed: GDS papers, expert briefing, humour without punching down, and a body that slept. Native identity is not the target. The board still stamps.",
            [
                "Write and speak across GDS genres under time.",
                "Comment on literary and public texts without fake erudition.",
                "Mediate expert sources for a non-expert without heat.",
                "Maintain fossils at near-native speed.",
                "Book an authorised centre when mocks are boringly stable.",
            ],
            a,
        ),
        encoding="utf-8",
    )
    print("wrote c2 packs", sum(len(m[2]) for m in b), sum(len(m[2]) for m in a))


if __name__ == "__main__":
    main()


