import { describe, expect, test } from "vitest";
import type { PlayedMove } from "@xavatech/xara-game-sdk";
import { guessesOf, hintBand, hintLine, secretOf, verdict, type GuessMove } from "./rules";

const move = (n: number, playerId = 1, step = 1): PlayedMove<GuessMove> => ({
  step,
  playerId,
  move: { n },
  at: "",
});

describe("Guess the Number", () => {
  test("the secret stays inside 1–10 and is the same every time for a session", () => {
    const first = secretOf(9);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThanOrEqual(10);
    expect(secretOf(9)).toBe(first);
    expect(secretOf(10)).not.toBe(secretOf(9));
  });

  test("rebuilds guesses and ignores repeats and numbers outside 1–10", () => {
    expect(guessesOf([move(4, 1, 1), move(4, 2, 2), move(0, 2, 3), move(8, 2, 4)])).toEqual([
      { playerId: 1, n: 4 },
      { playerId: 2, n: 8 },
    ]);
  });

  test("says whether a guess is low, high, or the number", () => {
    expect(verdict(7, 3)).toBe("low");
    expect(verdict(7, 9)).toBe("high");
    expect(verdict(7, 7)).toBe("correct");
  });

  test("a hint is a band of at most three that contains the secret", () => {
    for (let secret = 1; secret <= 10; secret++) {
      const band = hintBand(secret);
      expect(band.low).toBeLessThanOrEqual(secret);
      expect(band.high).toBeGreaterThanOrEqual(secret);
      expect(band.high - band.low).toBeLessThanOrEqual(2);
      expect(hintLine(secret)).toContain(String(band.low));
    }
    expect(hintLine(1)).toBe("It's between 1 and 2");
    expect(hintLine(7)).toBe("It's between 6 and 8");
  });
});
