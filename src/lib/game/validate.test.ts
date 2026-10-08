import { describe, expect, it } from "vitest";
import sample from "../../../public/sample-game.json";
import { createEmptyGame, draftFromUnknown, exportGame, gameProgress, parseGameJson, validateGame } from "./validate";

const clone = <T>(v: T): T => structuredClone(v);

function errorsOf(data: unknown): string[] {
  const r = validateGame(data);
  return r.ok ? [] : r.errors;
}

describe("validateGame", () => {
  it("accepts the sample game", () => {
    const r = validateGame(sample);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings).toEqual([]);
      expect(r.game.categories).toHaveLength(6);
      expect(r.game.categories.flatMap((c) => c.questions).filter((q) => q.bonus)).toHaveLength(2);
    }
  });

  it("needs exactly 6 categories", () => {
    const g = clone(sample);
    g.categories.pop();
    expect(errorsOf(g)).toContain("The game needs exactly 6 categories; this file has 5.");
  });

  it("needs exactly 5 questions per category and names the category", () => {
    const g = clone(sample);
    g.categories[1].questions.pop();
    expect(errorsOf(g)).toContain('Category 2 ("Lab Coats") needs exactly 5 questions; it has 4.');
  });

  it("points at the exact question with a missing answer", () => {
    const g = clone(sample);
    g.categories[3].questions[2].answer = "  ";
    expect(errorsOf(g)).toEqual(['Category 4 ("Food Court"), question 3: the answer is missing.']);
  });

  it("requires the final question", () => {
    const g: Record<string, unknown> = clone(sample);
    delete g.final;
    expect(errorsOf(g)).toEqual(["The final round question is missing."]);

    const h = clone(sample);
    h.final.answer = "";
    expect(errorsOf(h)).toEqual(["Final round: the answer is missing."]);
  });

  it("allows at most 2 bonus tiles and warns when there are none", () => {
    const g = clone(sample);
    g.categories[0].questions[0].bonus = true;
    expect(errorsOf(g)).toContain("A board can have at most 2 bonus tiles; this one has 3.");

    const h = clone(sample);
    h.categories.forEach((c) => c.questions.forEach((q) => (q.bonus = false)));
    const r = validateGame(h);
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toMatch(/no bonus tiles/);
  });

  it("defaults the timer to 30 s and rejects silly values", () => {
    const g: Record<string, unknown> = clone(sample);
    delete g.timerSeconds;
    const r = validateGame(g);
    expect(r.ok && r.game.timerSeconds).toBe(30);
    expect(errorsOf({ ...clone(sample), timerSeconds: 0 })[0]).toMatch(/timerSeconds/);
  });

  it("checks media type and src", () => {
    const g = clone(sample) as unknown as { categories: { questions: Record<string, unknown>[] }[] };
    g.categories[0].questions[0].media = { type: "hologram", src: "https://x.test/a.holo" };
    g.categories[0].questions[1].media = { type: "image", src: "ftp://nope" };
    g.categories[0].questions[2].media = { type: "image", src: "https://example.com/pic.jpg" };
    expect(errorsOf(g)).toEqual([
      'Category 1 ("Around the World"), question 1: media type must be "image", "audio" or "video".',
      'Category 1 ("Around the World"), question 2: media src must be a data: URI or an http(s) URL.',
    ]);
  });

  it("warns about oversized embedded media and mismatched types", () => {
    const g = clone(sample) as unknown as { categories: { questions: Record<string, unknown>[] }[] };
    g.categories[0].questions[0].media = { type: "audio", src: "data:image/png;base64," + "A".repeat(1_000_000) };
    const r = validateGame(g);
    expect(r.ok).toBe(true);
    expect(r.warnings.join("\n")).toMatch(/marked as audio but contains image\/png/);
    expect(r.warnings.join("\n")).toMatch(/about 732 KB/);
  });

  it("reports several problems at once", () => {
    expect(errorsOf({ categories: "lol" })).toEqual([
      "The game needs a title.",
      'The game needs a "categories" list with 6 categories.',
      "The final round question is missing.",
    ]);
  });
});

describe("parseGameJson / exportGame", () => {
  it("reports invalid JSON clearly", () => {
    const r = parseGameJson("{ nope");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^This file isn't valid JSON/);
  });

  it("round-trips through export and import", () => {
    const first = validateGame(sample);
    if (!first.ok) throw new Error();
    const again = parseGameJson(exportGame(first.game));
    expect(again.ok && again.game).toEqual(first.game);
  });

  it("drops unknown keys and trims text", () => {
    const g = { ...clone(sample), title: "  Spaced  ", extra: 1 };
    const r = validateGame(g);
    expect(r.ok && r.game.title).toBe("Spaced");
    expect(r.ok && "extra" in r.game).toBe(false);
  });

  it("a blank editor game is not playable yet", () => {
    const r = validateGame(createEmptyGame());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(30);
  });
});

describe("draftFromUnknown (editor import)", () => {
  it("keeps a valid game exactly", () => {
    const r = validateGame(sample);
    if (!r.ok) throw new Error();
    expect(draftFromUnknown(sample)).toEqual(r.game);
  });

  it("fills gaps in a partial file instead of rejecting it", () => {
    const draft = draftFromUnknown({
      title: "Half done",
      categories: [{ name: "Only one", questions: [{ question: "Q?", answer: "A" }] }],
    });
    expect(draft.categories).toHaveLength(6);
    expect(draft.categories[0].questions).toHaveLength(5);
    expect(draft.categories[0].questions[0]).toEqual({ value: 100, question: "Q?", answer: "A", bonus: false });
    expect(draft.categories[0].questions[4].value).toBe(500);
    expect(draft.final).toEqual({ category: "", question: "", answer: "" });
    expect(gameProgress(draft)).toEqual({ written: 1, total: 30, bonus: 0, namedCategories: 1, finalReady: false });
  });

  it("survives garbage", () => {
    expect(draftFromUnknown("nope")).toEqual(createEmptyGame());
    expect(draftFromUnknown({ categories: [null, 3, { questions: "x" }] }).categories).toHaveLength(6);
  });

  it("an exported draft round-trips through import", () => {
    const g = createEmptyGame("Draft");
    g.categories[2].questions[1].question = "Only a question";
    expect(draftFromUnknown(JSON.parse(exportGame(g)))).toEqual(g);
  });
});
