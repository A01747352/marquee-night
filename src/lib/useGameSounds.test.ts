import { describe, expect, it } from "vitest";
import sample from "../../public/sample-game.json";
import { applyAction, createGameState, toPublicView, validateGame, type Action, type GameState } from "@/lib/game";
import { soundFor } from "./useGameSounds";

function start(): GameState {
  const r = validateGame(sample);
  if (!r.ok) throw new Error();
  return [
    { type: "setTeams", teams: [{ name: "A", color: "" }, { name: "B", color: "" }] },
    { type: "startGame" },
  ].reduce((s, a) => applyAction(s, a as Action, 0), createGameState(r.game));
}

/** Applies `action` and returns the sting for that transition. */
function stingAfter(state: GameState, action: Action) {
  const next = applyAction(state, action, 0);
  return { next, sound: soundFor(toPublicView(state, 0).phase, toPublicView(next, 0).phase)?.name ?? null };
}

describe("soundFor", () => {
  it("stays quiet on first render", () => {
    expect(soundFor(null, toPublicView(start(), 0).phase)).toBeNull();
  });

  it("whooshes when a tile opens, dings on correct", () => {
    const opened = stingAfter(start(), { type: "pickTile", col: 0, row: 0 });
    expect(opened.sound).toBe("tileOpen");
    expect(stingAfter(opened.next, { type: "correct" }).sound).toBe("correct");
  });

  it("buzzes on a wrong answer, again on a missed steal, and dings on a good steal", () => {
    const opened = stingAfter(start(), { type: "pickTile", col: 0, row: 0 }).next;
    const steal = stingAfter(opened, { type: "wrong" });
    expect(steal.sound).toBe("wrong");
    expect(stingAfter(steal.next, { type: "wrong" }).sound).toBe("wrong");
    expect(stingAfter(steal.next, { type: "correct" }).sound).toBe("correct");
  });

  it("is silent when the host just reveals the answer", () => {
    const opened = stingAfter(start(), { type: "pickTile", col: 0, row: 0 }).next;
    expect(stingAfter(opened, { type: "revealAnswer" }).sound).toBeNull();
    const steal = stingAfter(opened, { type: "wrong" }).next;
    expect(stingAfter(steal, { type: "revealAnswer" }).sound).toBeNull();
  });

  it("plays the bonus sting on a bonus tile (Food Court 300 in the sample)", () => {
    expect(stingAfter(start(), { type: "pickTile", col: 3, row: 2 }).sound).toBe("bonus");
  });

  it("judges each final reveal and plays the fanfare for the winner", () => {
    let s = applyAction(start(), { type: "setScore", teamId: "t1", score: 500 }, 0);
    s = [
      { type: "goToFinal" },
      { type: "lockFinalWager", teamId: "t1", amount: 100 },
      { type: "showFinalQuestion" },
      { type: "startFinalReveal" },
    ].reduce((acc, a) => applyAction(acc, a as Action, 0), s);
    const judged = stingAfter(s, { type: "judgeFinal", teamId: "t1", correct: false });
    expect(judged.sound).toBe("wrong");
    expect(stingAfter(judged.next, { type: "showWinner" }).sound).toBe("winner");
  });

  it("plays the ominous sting when a deep-cut (last row) tile opens", () => {
    expect(stingAfter(start(), { type: "pickTile", col: 0, row: 4 }).sound).toBe("deepCut");
  });

  it("follows the ding with the streak sting from 3 in a row", () => {
    let s = start();
    // Team A gets three right; B passes with a reveal each time.
    const tiles: [number, number][] = [[0, 0], [1, 0], [2, 0]];
    let last: ReturnType<typeof soundFor> = null;
    tiles.forEach(([col, row], i) => {
      s = applyAction(s, { type: "pickTile", col, row }, 0);
      const before = toPublicView(s, 0).phase;
      s = applyAction(s, { type: "correct" }, 0);
      last = soundFor(before, toPublicView(s, 0).phase);
      s = applyAction(s, { type: "continue" }, 0);
      if (i < 2) {
        s = [{ type: "pickTile", col, row: 1 }, { type: "revealAnswer" }, { type: "continue" }].reduce(
          (acc, a) => applyAction(acc, a as Action, 0),
          s,
        );
      }
    });
    expect(last).toMatchObject({ name: "correct", then: { name: "streak" } });
  });

  it("dings on Closest Wins when anyone scored, even if a loser is listed last", () => {
    const r = validateGame(sample);
    if (!r.ok) throw new Error();
    r.game.categories[0].questions[1] = { ...r.game.categories[0].questions[1], type: "closest", target: 10, bonus: false };
    let s = [
      { type: "setTeams", teams: [{ name: "A", color: "" }, { name: "B", color: "" }] },
      { type: "startGame" },
      { type: "pickTile", col: 0, row: 1 },
    ].reduce((acc, a) => applyAction(acc, a as Action, 0), createGameState(r.game));
    const before = toPublicView(s, 0).phase;
    s = applyAction(s, { type: "judgeClosest", guesses: { t1: 10, t2: 99 } }, 0);
    expect(soundFor(before, toPublicView(s, 0).phase)?.name).toBe("correct");
  });

  it("doesn't re-ding when nothing new happened (e.g. timer pause)", () => {
    const opened = stingAfter(start(), { type: "pickTile", col: 0, row: 0 }).next;
    expect(stingAfter(opened, { type: "timerPause" }).sound).toBeNull();
  });
});
