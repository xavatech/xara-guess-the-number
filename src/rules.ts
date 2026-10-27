import type { PlayedMove } from "@xavatech/xara-game-sdk";

/** Whole numbers the players can guess. */
export const LOW = 1;
export const HIGH = 10;

/** What a player sends: the number they guessed. */
export type GuessMove = { n: number };

export type Verdict = "low" | "high" | "correct";

/**
 * The secret for this session, from 1 to 10. Every phone runs this on the
 * same session id, so they agree without a hidden server.
 */
export function secretOf(sessionId: number): number {
  const n = (Math.imul((sessionId | 0) + 17, 1103515245) + 12345) >>> 0;
  return (n % (HIGH - LOW + 1)) + LOW;
}

/** Guesses so far, oldest first. A repeat or a number outside 1–10 is ignored. */
export function guessesOf(moves: PlayedMove<GuessMove>[]): { playerId: number; n: number }[] {
  const seen = new Set<number>();
  const guesses: { playerId: number; n: number }[] = [];
  for (const played of moves) {
    const n = played.move?.n;
    if (!Number.isInteger(n) || n < LOW || n > HIGH || seen.has(n)) continue;
    seen.add(n);
    guesses.push({ playerId: played.playerId, n });
  }
  return guesses;
}

export function verdict(secret: number, n: number): Verdict {
  if (n === secret) return "correct";
  return n < secret ? "low" : "high";
}

/** A paid hint: a band of at most three numbers that contains the secret. */
export function hintBand(secret: number): { low: number; high: number } {
  return { low: Math.max(LOW, secret - 1), high: Math.min(HIGH, secret + 1) };
}

export function hintLine(secret: number): string {
  const { low, high } = hintBand(secret);
  return low === high ? `It's ${low}` : `It's between ${low} and ${high}`;
}
