import "./style.css";
import { connect, inXara, mockApp, XaraGameError, type GameState } from "@xavatech/xara-game-sdk";
import { HIGH, LOW, guessesOf, hintBand, hintLine, secretOf, verdict, type GuessMove } from "./rules";

const HINT_PRICE = 100;

// Outside the app, a bar switches which player's phone this page is.
if (!inXara()) {
  mockApp({
    game: { id: 2, name: "Guess the Number" },
    players: [
      { id: 1, name: "Ada" },
      { id: 2, name: "Bayo" },
    ],
    approvePayment: (item, amount) => window.confirm(`Buy ${item} for ₦${amount}?`),
  });
}

type State = GameState<GuessMove>;

const xara = connect<GuessMove>();
const statusEl = document.getElementById("status")!;
const verdictEl = document.getElementById("verdict")!;
const hintEl = document.getElementById("hint-line")!;
const historyEl = document.getElementById("history")!;
const padEl = document.getElementById("pad")!;
const acceptEl = document.getElementById("accept") as HTMLButtonElement;
const buyEl = document.getElementById("hint") as HTMLButtonElement;
const noteEl = document.getElementById("note")!;
const playerEls = [document.getElementById("player-a")!, document.getElementById("player-b")!];
const nameEls = [document.getElementById("name-a")!, document.getElementById("name-b")!];

const keys = Array.from({ length: HIGH - LOW + 1 }, (_, index) => {
  const n = LOW + index;
  const button = document.createElement("button");
  button.className = "key";
  button.textContent = String(n);
  button.disabled = true;
  button.addEventListener("click", () => guess(n));
  padEl.append(button);
  return button;
});

/** Set once a hint is paid for, until the next state carries that purchase. */
let hinted = false;
/** My guess while the app sends it, shown at once. */
let pending: number | null = null;
let busy = false;

const nameOf = (state: State, playerId: number) =>
  state.players.find((player) => player.id === playerId)?.name ?? "Someone";

/** This phone's turn, including the starter's move while others are still invited. */
function myTurn(state: State): boolean {
  if (xara.isMyTurn()) return true;
  const mine = state.players.find((player) => player.you);
  return (
    !state.me.watching &&
    mine?.status === "accepted" &&
    state.session.status === "invited" &&
    state.session.turn === state.me.id
  );
}

const hintRef = (state: State) => `hint-${state.session.id}`;

function hasHint(state: State): boolean {
  return hinted || state.purchases.some((purchase) => purchase.status === "paid" && purchase.reference === hintRef(state));
}

function statusText(state: State): string {
  const { session, me } = state;
  switch (session.status) {
    case "invited": {
      const mine = state.players.find((player) => player.you);
      if (mine?.status === "invited") return "You've been invited to play";
      if (!myTurn(state)) return "Waiting for everyone to accept";
    }
    case "active": {
      if (!pending) return myTurn(state) ? "Your turn" : `${nameOf(state, session.turn ?? 0)}'s turn`;
      const index = state.players.findIndex((player) => player.id === me.id);
      return `${state.players[(index + 1) % state.players.length].name}'s turn`;
    }
    case "completed": {
      const outcome = session.outcome!;
      if (outcome.leftBy) return `${nameOf(state, outcome.leftBy)} left the game`;
      if (!outcome.winners.length) return "It's a draw";
      return outcome.winners.includes(me.id) ? "You won" : `${nameOf(state, outcome.winners[0])} won`;
    }
    case "declined":
      return "The invite was declined";
    default:
      return "This game was called off";
  }
}

function render(state: State) {
  const secret = secretOf(state.session.id);
  const guesses = guessesOf(state.moves);
  const taken = new Set(guesses.map((guess) => guess.n));
  if (pending != null) taken.add(pending);
  const won = guesses.some((guess) => guess.n === secret) || pending === secret;
  const playable = myTurn(state) && !busy && !won;
  const band = hasHint(state) ? hintBand(secret) : null;
  const last = pending != null ? { n: pending, playerId: state.me.id } : guesses[guesses.length - 1];

  keys.forEach((button, index) => {
    const n = LOW + index;
    button.classList.toggle("taken", taken.has(n) && n !== secret);
    button.classList.toggle("won", won && n === secret);
    button.classList.toggle("in-hint", !!band && !won && n >= band.low && n <= band.high);
    button.classList.toggle("pending", pending === n);
    button.disabled = !playable || taken.has(n);
    button.setAttribute("aria-label", taken.has(n) ? `${n}, guessed` : `Guess ${n}`);
  });

  historyEl.replaceChildren(
    ...guesses.map((guess) => {
      const call = verdict(secret, guess.n);
      const row = document.createElement("li");
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = nameOf(state, guess.playerId);
      const result = document.createElement("span");
      result.className = call === "correct" ? "call correct" : "call";
      result.textContent = call === "correct" ? `${guess.n} is it` : call === "low" ? `${guess.n} is low` : `${guess.n} is high`;
      row.append(who, result);
      return row;
    }),
  );

  verdictEl.textContent = !last
    ? "Guess a number"
    : verdict(secret, last.n) === "correct"
      ? `${last.n} is the number`
      : verdict(secret, last.n) === "low"
        ? `${last.n} is too low`
        : `${last.n} is too high`;
  hintEl.textContent = band && !won ? hintLine(secret) : "";

  const turn = (state.session.status === "active" || state.session.status === "invited") && !pending ? state.session.turn : null;
  const winners = state.session.outcome?.winners ?? [];
  state.players.slice(0, 2).forEach((player, index) => {
    nameEls[index].textContent = player.name;
    playerEls[index].classList.toggle("turn", player.id === turn);
    playerEls[index].classList.toggle("winner", winners.includes(player.id));
  });

  statusEl.textContent = statusText(state);
  const mine = state.players.find((player) => player.you);
  show(acceptEl, state.session.status === "invited" && mine?.status === "invited" && !busy);
  show(buyEl, playable && !hasHint(state));
}

function show(button: HTMLButtonElement, visible: boolean) {
  button.classList.toggle("shown", visible);
  button.disabled = !visible;
  button.tabIndex = visible ? 0 : -1;
}

function say(message: string) {
  noteEl.textContent = message;
}

async function run(action: () => Promise<unknown>) {
  busy = true;
  say("");
  if (xara.state) render(xara.state);
  try {
    await action();
  } catch (error) {
    say(error instanceof XaraGameError ? error.message : "Something went wrong");
  } finally {
    busy = false;
    pending = null;
    if (xara.state) render(xara.state);
  }
}

function guess(n: number) {
  const state = xara.state;
  if (!state || !myTurn(state) || busy) return;
  const secret = secretOf(state.session.id);
  const taken = new Set(guessesOf(state.moves).map((guess) => guess.n));
  if (taken.has(n) || n < LOW || n > HIGH) return;
  pending = n;
  // Every player reads the same summary, so it can't say "you".
  const result = n === secret ? { winners: [state.me.id], summary: `${n} is the number` } : undefined;
  return run(() => xara.move({ n }, { outcome: result }));
}

acceptEl.addEventListener("click", () => run(() => xara.accept()));

buyEl.addEventListener("click", () =>
  run(async () => {
    const state = xara.state!;
    const paid = await xara.buy({
      item: "Hint",
      amount: HINT_PRICE,
      reference: hintRef(state),
    });
    if (paid.status === "success") hinted = true;
    else if (paid.status === "failed") say(paid.message ?? "The payment didn't go through");
  }),
);

xara.onChange((state) => {
  hinted = false;
  render(state);
});
xara.load().catch((error) => {
  statusEl.textContent = error instanceof XaraGameError ? error.message : "Couldn't start the game";
});
