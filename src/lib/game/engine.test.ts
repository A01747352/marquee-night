import { describe, expect, it } from "vitest";
import sample from "../../../public/sample-game.json";
import {
  applyAction,
  createGameState,
  maxBonusWager,
  RuleError,
  timerRemaining,
} from "./engine";
import type { Action, GameFile, GameState } from "./types";
import { validateGame } from "./validate";
import { toHostView, toPublicView } from "./views";

const T0 = 1_000_000;

function loadSample(): GameFile {
  const result = validateGame(sample);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.game;
}

/** A game with no bonus tiles, except the ones listed as [col, row]. */
function gameWithBonus(...bonus: [number, number][]): GameFile {
  const game = loadSample();
  return {
    ...game,
    categories: game.categories.map((c, col) => ({
      ...c,
      questions: c.questions.map((q, row) => ({
        ...q,
        bonus: bonus.some(([bc, br]) => bc === col && br === row),
      })),
    })),
  };
}

function play(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => applyAction(s, a, T0), state);
}

function started(game: GameFile = gameWithBonus(), names = ["Owls", "Foxes", "Bears"]): GameState {
  const teams = names.map((name) => ({ name, color: "" }));
  return play(createGameState(game), { type: "setTeams", teams }, { type: "startGame" });
}

const scores = (s: GameState) => s.teams.map((t) => t.score);
const pick = (col: number, row: number): Action => ({ type: "pickTile", col, row });

describe("setup", () => {
  it("assigns ids, default colors and zero scores", () => {
    const s = started();
    expect(s.teams.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(s.teams[0].color).toBe("#35d6ff");
    expect(scores(s)).toEqual([0, 0, 0]);
    expect(s.phase.kind).toBe("board");
  });

  it("rejects too few teams and duplicate names", () => {
    const base = createGameState(gameWithBonus());
    expect(() => play(base, { type: "setTeams", teams: [{ name: "Solo", color: "" }] })).toThrow(RuleError);
    expect(() =>
      play(base, {
        type: "setTeams",
        teams: [
          { name: "Owls", color: "" },
          { name: "owls", color: "" },
        ],
      }),
    ).toThrow(/Two teams/);
  });
});

describe("scoring a regular tile", () => {
  it("a correct answer adds the tile value to the picker", () => {
    const s = play(started(), pick(0, 2), { type: "correct" });
    expect(scores(s)).toEqual([300, 0, 0]);
    expect(s.phase).toMatchObject({ kind: "reveal", results: [{ teamId: "t1", delta: 300, steal: false }] });
  });

  it("a wrong answer subtracts the value and scores can go negative", () => {
    const s = play(started(), pick(1, 3), { type: "wrong" });
    expect(scores(s)).toEqual([-400, 0, 0]);
  });

  it("a wrong answer passes one steal attempt to the next team in turn order", () => {
    const s = play(started(), pick(0, 0), { type: "wrong" });
    expect(s.phase).toMatchObject({ kind: "question", stage: "steal", pickerId: "t1", answeringId: "t2" });
  });

  it("a correct steal adds the value to the stealer", () => {
    const s = play(started(), pick(2, 3), { type: "wrong" }, { type: "correct" });
    expect(scores(s)).toEqual([-400, 400, 0]);
    expect(s.phase).toMatchObject({
      kind: "reveal",
      results: [
        { teamId: "t1", delta: -400, steal: false },
        { teamId: "t2", delta: 400, steal: true },
      ],
    });
  });

  it("steals are risk-free: a wrong steal costs nothing", () => {
    const s = play(started(), pick(2, 3), { type: "wrong" }, { type: "wrong" });
    expect(scores(s)).toEqual([-400, 0, 0]);
    expect(s.phase.kind).toBe("reveal");
  });

  it("the stealer from the last team wraps around to the first", () => {
    let s = started();
    // Owls, Foxes answer correctly; now Bears pick.
    s = play(s, pick(0, 0), { type: "correct" }, { type: "continue" });
    s = play(s, pick(0, 1), { type: "correct" }, { type: "continue" });
    s = play(s, pick(0, 2), { type: "wrong" });
    expect(s.phase).toMatchObject({ pickerId: "t3", answeringId: "t1" });
  });

  it("nobody gets it: revealing the answer closes the tile with no score change", () => {
    const s = play(started(), pick(4, 4), { type: "revealAnswer" });
    expect(scores(s)).toEqual([0, 0, 0]);
    expect(s.phase).toMatchObject({ kind: "reveal", results: [] });
    expect(s.played[4][4]).toBe(true);
  });

  it("a played tile can't be picked again", () => {
    const s = play(started(), pick(0, 0), { type: "correct" }, { type: "continue" });
    expect(() => play(s, pick(0, 0))).toThrow(/already been played/);
  });
});

describe("turn order", () => {
  it("passes to the next team after every question", () => {
    let s = play(started(), pick(0, 0), { type: "correct" }, { type: "continue" });
    expect(s.turn).toBe(1);
    s = play(s, pick(0, 1), { type: "revealAnswer" }, { type: "continue" });
    expect(s.turn).toBe(2);
    s = play(s, pick(0, 2), { type: "correct" }, { type: "continue" });
    expect(s.turn).toBe(0);
  });

  it("passes to the picker's next team after a steal, not to the stealer's next", () => {
    const s = play(started(), pick(0, 0), { type: "wrong" }, { type: "correct" }, { type: "continue" });
    expect(s.turn).toBe(1); // Foxes stole, and it's simply Foxes' turn next
    expect(s.teams[s.turn].name).toBe("Foxes");
  });
});

describe("bonus tiles", () => {
  const bonusGame = () => started(gameWithBonus([3, 2]));

  it("shows the bonus reveal before the question", () => {
    const s = play(bonusGame(), pick(3, 2));
    expect(s.phase).toMatchObject({ kind: "bonusReveal", teamId: "t1" });
  });

  it("allows wagers up to the score, or up to 500 if the score is lower", () => {
    expect(maxBonusWager(0)).toBe(500);
    expect(maxBonusWager(-300)).toBe(500);
    expect(maxBonusWager(300)).toBe(500);
    expect(maxBonusWager(1200)).toBe(1200);

    const s = play(bonusGame(), pick(3, 2));
    expect(() => play(s, { type: "lockBonusWager", amount: 501 })).toThrow(/between 0 and 500/);
    expect(() => play(s, { type: "lockBonusWager", amount: -1 })).toThrow(RuleError);
    expect(() => play(s, { type: "lockBonusWager", amount: 12.5 })).toThrow(/whole number/);
  });

  it("lets a leading team wager their whole score", () => {
    let s = bonusGame();
    s = play(s, { type: "setScore", teamId: "t1", score: 1500 }, pick(3, 2));
    s = play(s, { type: "lockBonusWager", amount: 1500 }, { type: "correct" });
    expect(scores(s)).toEqual([3000, 0, 0]);
  });

  it("a correct answer adds the wager, not the tile value", () => {
    const s = play(bonusGame(), pick(3, 2), { type: "lockBonusWager", amount: 450 }, { type: "correct" });
    expect(scores(s)).toEqual([450, 0, 0]);
  });

  it("a wrong answer loses the wager and there is no steal", () => {
    const s = play(bonusGame(), pick(3, 2), { type: "lockBonusWager", amount: 200 }, { type: "wrong" });
    expect(scores(s)).toEqual([-200, 0, 0]);
    expect(s.phase.kind).toBe("reveal");
  });

  it("a zero wager changes nothing", () => {
    const s = play(bonusGame(), pick(3, 2), { type: "lockBonusWager", amount: 0 }, { type: "wrong" });
    expect(scores(s)).toEqual([0, 0, 0]);
  });
});

describe("host overrides and undo", () => {
  it("sets and adjusts scores at any time", () => {
    let s = play(started(), pick(0, 0));
    s = play(s, { type: "setScore", teamId: "t2", score: -700 }, { type: "adjustScore", teamId: "t3", delta: 100 });
    expect(scores(s)).toEqual([0, -700, 100]);
    expect(s.phase.kind).toBe("question");
  });

  it("undo reverts the last scoring action and reports its label", () => {
    let s = play(started(), pick(1, 3), { type: "wrong" });
    expect(toHostView(s, T0).lastAction).toBe("Owls −400");
    s = play(s, { type: "undo" });
    expect(scores(s)).toEqual([0, 0, 0]);
    expect(s.phase).toMatchObject({ kind: "question", stage: "picker" });
  });

  it("undo walks back multiple steps and fails when there's nothing left", () => {
    let s = play(started(), pick(0, 0), { type: "correct" }, { type: "continue" });
    s = play(s, { type: "undo" }, { type: "undo" }, { type: "undo" }, { type: "undo" }, { type: "undo" });
    expect(s.phase.kind).toBe("lobby");
    expect(() => play(s, { type: "undo" })).toThrow(/Nothing to undo/);
  });

  it("timer actions are not undo steps", () => {
    let s = play(started(), pick(0, 0), { type: "timerPause" });
    s = play(s, { type: "undo" });
    expect(s.phase.kind).toBe("board");
  });
});

describe("timer", () => {
  it("runs, pauses, resumes and skips", () => {
    let s = play(started(), pick(0, 0));
    if (s.phase.kind !== "question") throw new Error();
    expect(timerRemaining(s.phase.timer, T0 + 10_000)).toBe(20_000);

    s = applyAction(s, { type: "timerPause" }, T0 + 10_000);
    if (s.phase.kind !== "question") throw new Error();
    expect(timerRemaining(s.phase.timer, T0 + 99_000)).toBe(20_000);

    s = applyAction(s, { type: "timerStart" }, T0 + 50_000);
    if (s.phase.kind !== "question") throw new Error();
    expect(timerRemaining(s.phase.timer, T0 + 55_000)).toBe(15_000);
    expect(timerRemaining(s.phase.timer, T0 + 500_000)).toBe(0);

    s = applyAction(s, { type: "timerSkip" }, T0 + 51_000);
    if (s.phase.kind !== "question") throw new Error();
    expect(timerRemaining(s.phase.timer, T0 + 51_000)).toBe(0);
  });

  it("restarts in full for the steal attempt", () => {
    let s = play(started(), pick(0, 0));
    s = applyAction(s, { type: "wrong" }, T0 + 25_000);
    if (s.phase.kind !== "question") throw new Error();
    expect(timerRemaining(s.phase.timer, T0 + 25_000)).toBe(30_000);
  });
});

function clearBoard(s: GameState): GameState {
  for (let col = 0; col < 6; col++) {
    for (let row = 0; row < 5; row++) {
      if (!s.played[col][row]) s = play(s, pick(col, row), { type: "revealAnswer" }, { type: "continue" });
    }
  }
  return s;
}

describe("final round", () => {
  function atFinal(): GameState {
    let s = started(gameWithBonus(), ["Owls", "Foxes", "Bears", "Hawks"]);
    s = play(
      s,
      { type: "setScore", teamId: "t1", score: 1200 },
      { type: "setScore", teamId: "t2", score: 300 },
      { type: "setScore", teamId: "t3", score: 0 },
      { type: "setScore", teamId: "t4", score: -200 },
    );
    return clearBoard(s);
  }

  it("starts when the board is cleared, and only teams with a positive score play", () => {
    const s = atFinal();
    expect(s.phase).toEqual({ kind: "finalWager", wagers: { t1: null, t2: null } });
  });

  it("skips straight to the winner if nobody has a positive score", () => {
    const s = clearBoard(started());
    expect(s.phase.kind).toBe("winner");
  });

  it("the host can end the board early and go to the final", () => {
    const s = play(started(), { type: "setScore", teamId: "t2", score: 100 }, { type: "goToFinal" });
    expect(s.phase).toEqual({ kind: "finalWager", wagers: { t2: null } });
  });

  it("wagers are limited to the team's score and all must lock before the question", () => {
    let s = atFinal();
    expect(() => play(s, { type: "lockFinalWager", teamId: "t2", amount: 301 })).toThrow(/between 0 and 300/);
    expect(() => play(s, { type: "lockFinalWager", teamId: "t3", amount: 0 })).toThrow(/sits out/);
    s = play(s, { type: "lockFinalWager", teamId: "t1", amount: 1000 });
    expect(() => play(s, { type: "showFinalQuestion" })).toThrow(/Foxes hasn't locked/);
    s = play(s, { type: "lockFinalWager", teamId: "t2", amount: 300 }, { type: "showFinalQuestion" });
    expect(s.phase.kind).toBe("finalQuestion");
  });

  it("reveals lowest score first, applies ±wager, then shows the winner", () => {
    let s = play(
      atFinal(),
      { type: "lockFinalWager", teamId: "t1", amount: 1000 },
      { type: "lockFinalWager", teamId: "t2", amount: 300 },
      { type: "showFinalQuestion" },
      { type: "startFinalReveal" },
    );
    expect(s.phase).toMatchObject({ kind: "finalReveal", order: ["t2", "t1"] });
    expect(() => play(s, { type: "judgeFinal", teamId: "t1", correct: true })).toThrow(/Judge Foxes first/);
    expect(() => play(s, { type: "showWinner" })).toThrow(/Judge every/);

    s = play(
      s,
      { type: "judgeFinal", teamId: "t2", correct: true, answer: " Uranus " },
      { type: "judgeFinal", teamId: "t1", correct: false, answer: "Neptune" },
    );
    expect(scores(s)).toEqual([200, 600, 0, -200]);
    s = play(s, { type: "showWinner" });
    expect(s.phase.kind).toBe("winner");
  });
});

describe("views keep secrets off the TV", () => {
  const answerOf = (s: GameState, col: number, row: number) => s.game.categories[col].questions[row].answer;

  it("the public view has no answer while the question is live, even during a steal", () => {
    let s = play(started(), pick(0, 0));
    const answer = answerOf(s, 0, 0);
    expect(JSON.stringify(toPublicView(s, T0))).not.toContain(answer);
    expect(JSON.stringify(toHostView(s, T0))).toContain(answer);

    s = play(s, { type: "wrong" });
    expect(JSON.stringify(toPublicView(s, T0))).not.toContain(answer);

    s = play(s, { type: "revealAnswer" });
    expect(toPublicView(s, T0).phase).toMatchObject({ kind: "reveal", answer });
  });

  it("no answer anywhere in the public view on the board", () => {
    const s = started();
    const json = JSON.stringify(toPublicView(s, T0));
    for (const c of s.game.categories) for (const q of c.questions) expect(json).not.toContain(`"${q.answer}"`);
    expect(json).not.toContain(s.game.final.answer);
    expect(json).not.toContain('"bonus"');
  });

  it("final wagers and answer stay hidden until each team is revealed", () => {
    let s = started(gameWithBonus(), ["Owls", "Foxes"]);
    s = play(
      s,
      { type: "setScore", teamId: "t1", score: 900 },
      { type: "setScore", teamId: "t2", score: 400 },
      { type: "goToFinal" },
      { type: "lockFinalWager", teamId: "t1", amount: 777 },
    );
    expect(toPublicView(s, T0).phase).toEqual({
      kind: "finalWager",
      category: "Space",
      status: { t1: "locked", t2: "wagering" },
    });

    s = play(s, { type: "lockFinalWager", teamId: "t2", amount: 333 }, { type: "showFinalQuestion" });
    const q = JSON.stringify(toPublicView(s, T0));
    expect(q).not.toContain("777");
    expect(q).not.toContain(s.game.final.answer);

    s = play(s, { type: "startFinalReveal" }, { type: "judgeFinal", teamId: "t2", correct: true });
    const r = toPublicView(s, T0).phase;
    expect(r).toMatchObject({ kind: "finalReveal", revealed: { t2: { correct: true, wager: 333 } } });
    expect(JSON.stringify(r)).not.toContain("777");
  });
});
