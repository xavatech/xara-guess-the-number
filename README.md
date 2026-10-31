# Guess the Number for Xara

A two-player game that people start from a Xara chat. It is the short example of [`@xavatech/xara-game-sdk`](https://www.npmjs.com/package/@xavatech/xara-game-sdk): guess a number, and pay for a hint. Tic-Tac-Toe is the longer one.

Players take turns guessing a number from 1 to 10. Both phones work out the same secret from the session id, so a reload shows the same game. The first correct guess wins. A wrong guess says whether it was low or high. A ₦100 hint, approved with the player's PIN, narrows that to a band of three.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173, with a mock host: both players share the screen
npm test        # the rules
npm run build   # static files in dist/
```

`npm run dev` outside the app installs the SDK's mock host, so the game plays in a normal browser. A production build doesn't include it; opened outside Xara it says to open it from a chat.

## Ship it

1. Serve `dist/` over **https**. Xara only opens https games and only answers SDK calls from that URL's origin.
2. In the Xara business dashboard, open **Games → Submit a game** with the URL, 2 players, and SDK version `2.1.0`.
3. Once an admin approves it, people find it under **+ → Game** in their chats.

Xara serves this game with its other games from [xara-games](https://github.com/xavatech/xara-games), at `/guess-the-number/`.
