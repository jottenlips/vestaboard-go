import {
  calculateWinner,
  createGame,
  dispatch,
  printBoard,
  printVestaboard,
  sendTextToVestaboard,
  sleep,
} from "./game";
import { pickMove } from "./agent";

const BOARD_SIZE = 6;
let game = createGame(BOARD_SIZE);

console.log("Welcome to Go! You are Black (B).");
printBoard(game);
console.log(
  "Enter moves as: x y (e.g., '2 3'). Type 'endgame' to quit and determine the winner."
);

const play = async () => {
  while (game.phase !== "GameOver") {
    if (game.turn === "B") {
      const input = prompt("Your move:");
      if (!input) continue;

      const trimmed = input.trim();
      if (trimmed === "exit" || trimmed === "quit") {
        console.log("Exiting game.");
        break;
      }

      const gameover = trimmed === "endgame";
      if (gameover) {
        game = dispatch(game, { type: "FORCE_END" });
        const winner = calculateWinner(game);
        if (winner) {
          console.log(`Game over! Winner: ${winner}`);
          printVestaboard(
            game,
            `Game over! Winner: ${winner?.winner}. Score: B ${winner?.score.B}, W ${winner?.score.W}`
          );
        } else {
          console.log("Game over! No winner.");
          printVestaboard(game, "Game over! No winner.");
        }
        break;
      }

      const [xStr, yStr] = trimmed.split(/\s+/);
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);

      if (isNaN(x) || isNaN(y)) {
        printVestaboard(
          game,
          "Invalid input. Enter coordinates as two numbers, e.g., '2 3'"
        );
        await sleep(15_000);
        continue;
      }

      const next = dispatch(game, { type: "PLACE_STONE", x, y });
      if (next === game) {
        printVestaboard(game, "Illegal move. Try again.");
        await sleep(15_000);
        continue;
      }

      game = next;
      printVestaboard(game);
      await sleep(15_000);
    } else {
      printVestaboard(game, "GO Agent is thinking...");
      await sleep(15_000);
      const move = pickMove(game);
      if (move) {
        game = dispatch(game, { type: "PLACE_STONE", ...move });
        printVestaboard(game, `Agent plays at (${move.x}, ${move.y})`);
        await sleep(15_000);
      } else {
        printVestaboard(game, "Agent passes.");
        game = dispatch(game, { type: "PASS" });
      }
    }
  }
};

play();
