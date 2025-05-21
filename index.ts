// play.ts
import { createGame, dispatch, printBoard } from "./game";

const BOARD_SIZE = 6;
let game = createGame(BOARD_SIZE);

console.log("Welcome to Go!");
printBoard(game);
console.log("Enter moves as: x y (e.g., '2 3'). Type 'exit' to quit.");

while (true) {
  const input = prompt("Your move:");
  if (!input) continue;

  const trimmed = input.trim();
  if (trimmed === "exit" || trimmed === "quit") {
    console.log("Exiting game.");
    break;
  }

  const [xStr, yStr] = trimmed.split(/\s+/);
  const x = parseInt(xStr, 10);
  const y = parseInt(yStr, 10);

  if (isNaN(x) || isNaN(y)) {
    console.log("Invalid input. Enter coordinates as two numbers, e.g., '2 3'");
    continue;
  }

  try {
    game = dispatch(game, { type: "PLACE_STONE", x, y });
    printBoard(game);
  } catch (err) {
    console.log("Invalid move:", err instanceof Error ? err.message : err);
  }
}
