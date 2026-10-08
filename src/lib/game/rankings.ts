import { PLACEMENT_POINTS, POINTS_PER_CORRECT } from "./constants";

export interface TeamFinish {
  score: number;
  correct: number;
}

/**
 * 1-based finishing place per team (same order as the input). Tied scores
 * share the better place, like 1, 2, 2, 4.
 */
export function finishPlaces(teams: TeamFinish[]): number[] {
  return teams.map((t) => 1 + teams.filter((o) => o.score > t.score).length);
}

/** Season points for one finish: placement points plus a point per correct answer. */
export function rankingPoints(place: number, correct: number): number {
  const placement = PLACEMENT_POINTS[place - 1] ?? 0;
  return placement + correct * POINTS_PER_CORRECT;
}

export function placeLabel(place: number): string {
  const suffix = place % 100 >= 11 && place % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][place % 10] ?? "th";
  return `${place}${suffix}`;
}
