export type Posting = { title: string; company: string; description: string };
export type Tailored = { content: string; matched: number };

const STOPWORDS = new Set(
  (
    "the and for with you your our are will have has from that this who what their they them " +
    "about into over such been being also more most other than then these those able all any " +
    "can per via not but use using work working role team job join looking experience years " +
    "year ability strong including etc new help within across both each must should would"
  ).split(" "),
);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]/g) ?? [];
}

export function postingKeywords(posting: Posting): string[] {
  const all = words(`${posting.title} ${posting.description}`);
  return [...new Set(all)].filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// Only reorders the resume's own lines and blocks, so nothing can be invented.
export function tailorResume(content: string, posting: Posting): Tailored {
  const keywords = postingKeywords(posting);
  if (keywords.length === 0) {
    throw new Error("The job posting has no keywords to match against.");
  }
  const wanted = new Set(keywords);
  const score = (text: string) =>
    new Set(words(text).filter((w) => wanted.has(w))).size;
  const matched = score(content);

  const byScore = <T,>(items: T[], text: (i: T) => string) =>
    items
      .map((item, index) => ({ item, index, s: score(text(item)) }))
      .sort((a, b) => b.s - a.s || a.index - b.index)
      .map((x) => x.item);

  const [header, ...blocks] = content.trim().split(/\n\s*\n/);
  const tailoredBlocks = blocks.map((block) => {
    const [heading, ...lines] = block.split("\n");
    return { text: block, out: [heading, ...byScore(lines, (l) => l)].join("\n") };
  });
  const ordered = byScore(tailoredBlocks, (b) => b.text).map((b) => b.out);
  return { content: [header, ...ordered].join("\n\n"), matched };
}

export function matchReadout(matched: number, company: string): string {
  return `MATCH ${matched} KEYWORDS · ${company}`.toUpperCase();
}
