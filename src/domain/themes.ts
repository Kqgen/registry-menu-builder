import type { ThemeId } from "./types.ts";

type ConsoleColorName =
  | "Black"
  | "DarkBlue"
  | "DarkGreen"
  | "DarkCyan"
  | "DarkRed"
  | "DarkMagenta"
  | "DarkYellow"
  | "Gray"
  | "DarkGray"
  | "Blue"
  | "Green"
  | "Cyan"
  | "Red"
  | "Magenta"
  | "Yellow"
  | "White";

type ConsoleColorNibble = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "A" | "B" | "C" | "D" | "E" | "F";

export interface ConsoleTheme {
  readonly id: ThemeId;
  readonly name: string;
  readonly consoleColor: `${ConsoleColorNibble}${ConsoleColorNibble}`;
  readonly swatch: string;
  readonly backgroundCss: string;
  readonly foregroundCss: string;
  readonly bannerPrimary: ConsoleColorName;
  readonly bannerSecondary: ConsoleColorName;
  readonly bannerPrimaryCss: string;
  readonly bannerSecondaryCss: string;
}

export const THEMES: readonly ConsoleTheme[] = [
  {
    id: "amber",
    name: "Ember",
    consoleColor: "0E",
    swatch: "#f9f1a5",
    backgroundCss: "#0c0c0c",
    foregroundCss: "#f9f1a5",
    bannerPrimary: "Yellow",
    bannerSecondary: "DarkRed",
    bannerPrimaryCss: "#f9f1a5",
    bannerSecondaryCss: "#c50f1f",
  },
  {
    id: "ice",
    name: "Ion",
    consoleColor: "0B",
    swatch: "#61d6d6",
    backgroundCss: "#0c0c0c",
    foregroundCss: "#61d6d6",
    bannerPrimary: "White",
    bannerSecondary: "Magenta",
    bannerPrimaryCss: "#f2f2f2",
    bannerSecondaryCss: "#b4009e",
  },
  {
    id: "matrix",
    name: "Vector",
    consoleColor: "0A",
    swatch: "#16c60c",
    backgroundCss: "#0c0c0c",
    foregroundCss: "#16c60c",
    bannerPrimary: "Green",
    bannerSecondary: "DarkGray",
    bannerPrimaryCss: "#16c60c",
    bannerSecondaryCss: "#767676",
  },
  {
    id: "paper",
    name: "Signal",
    consoleColor: "F0",
    swatch: "#0c0c0c",
    backgroundCss: "#f2f2f2",
    foregroundCss: "#0c0c0c",
    bannerPrimary: "DarkBlue",
    bannerSecondary: "DarkMagenta",
    bannerPrimaryCss: "#0037da",
    bannerSecondaryCss: "#881798",
  },
];

export function getTheme(themeId: ThemeId): ConsoleTheme {
  const theme = THEMES.find((candidate) => candidate.id === themeId);
  if (theme === undefined) {
    throw new Error(`Unknown theme: ${themeId}`);
  }
  return theme;
}
