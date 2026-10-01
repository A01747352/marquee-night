export const CATEGORY_COUNT = 6;
export const QUESTIONS_PER_CATEGORY = 5;
export const STANDARD_VALUES = [100, 200, 300, 400, 500] as const;

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export const DEFAULT_TIMER_SECONDS = 30;
export const MIN_TIMER_SECONDS = 5;
export const MAX_TIMER_SECONDS = 300;

export const MAX_BONUS_TILES = 2;
/** A bonus wager may go up to the team's score, or this floor if their score is lower. */
export const BONUS_WAGER_FLOOR = 500;

export const MAX_UNDO = 50;

/** Team colors in assignment order (design spec). */
export const TEAM_COLORS = [
  "#35d6ff", // cyan
  "#b18cff", // violet
  "#7ee06b", // lime
  "#ff8a5c", // coral
  "#ffd35c", // yellow
  "#ff6b9a", // pink
] as const;
