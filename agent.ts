import { GameState, dispatch, isValidMove, switchTurn } from "./game";

// Utility to count stones for a player
const countStones = (board: (string | null)[][], player: "B" | "W") =>
  board.flat().filter((cell) => cell === player).length;

function getLegalMoves(game: GameState): { x: number; y: number }[] {
  const moves: { x: number; y: number }[] = [];

  for (let y = 0; y < game.size; y++) {
    for (let x = 0; x < game.size; x++) {
      if (isValidMove(game, x, y)) {
        try {
          const next = dispatch(game, { type: "PLACE_STONE", x, y });
          if (next !== game) moves.push({ x, y });
        } catch {}
      }
    }
  }

  return moves;
}

function scoreMove(game: GameState, x: number, y: number): number {
  const currentPlayer = game.turn;

  // Simulate the move
  let simulated: GameState;
  try {
    simulated = dispatch(game, { type: "PLACE_STONE", x, y });
  } catch {
    return -Infinity;
  }

  // Check if the move was rejected (suicide or invalid)
  if (simulated === game) return -Infinity;

  // Heuristic 1: prefer central positions
  const center = game.size / 2;
  const dx = Math.abs(center - x);
  const dy = Math.abs(center - y);
  let score = -dx - dy; // closer to center is better

  // Heuristic 2: favor moves that reduce opponent stones (captures)
  const enemy = switchTurn(currentPlayer);
  const enemyBefore = countStones(game.board, enemy);
  const enemyAfter = countStones(simulated.board, enemy);
  const captured = enemyBefore - enemyAfter;
  score += captured * 10;

  return score;
}

export function pickMove(game: GameState): { x: number; y: number } | null {
  const legalMoves = getLegalMoves(game);
  if (legalMoves.length === 0) return null;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const score = scoreMove(game, move.x, move.y);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}