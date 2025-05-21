import { vbml } from "@vestaboard/vbml";
// helpers.ts
type Stone = "B" | "W" | null;
type Coord = [number, number];
type Player = "B" | "W";

export interface GameState {
  board: Stone[][];
  size: number;
  turn: Player;
  phase: "Idle" | "GameOver";
  passes: number;
}

export const createGame = (size = 9): GameState => ({
  board: Array.from({ length: size }, () => Array<Stone>(size).fill(null)),
  size,
  turn: "B",
  phase: "Idle",
  passes: 0,
});

export const switchTurn = (player: Player): Player =>
  player === "B" ? "W" : "B";

export const isValidMove = (state: GameState, x: number, y: number): boolean =>
  x >= 0 &&
  y >= 0 &&
  x < state.size &&
  y < state.size &&
  state.board[y][x] === null;

// @ts-ignore
export const getNeighbors = (state: GameState, x: number, y: number): Coord[] =>
  [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ].filter(
    ([nx, ny]) => nx >= 0 && ny >= 0 && nx < state.size && ny < state.size
  ) as Coord[];

export const getGroupAndLiberties = (
  state: GameState,
  x: number,
  y: number,
  enemy?: boolean
) => {
  const color = state.board[y][x];
  const visited = new Set<string>();
  const liberties = new Set<string>();
  const group: Coord[] = [];
  const stack: Coord[] = [[x, y]];

  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const key = `${cx},${cy}`;
    if (visited.has(key)) continue;

    visited.add(key);
    group.push([cx, cy]);

    getNeighbors(state, cx, cy).forEach(([nx, ny]) => {
      const neighbor = state.board[ny][nx];
      const nKey = `${nx},${ny}`;
      if (neighbor === null) liberties.add(nKey);
      else if (neighbor === color && !visited.has(nKey)) stack.push([nx, ny]);
    });
  }

  return { group, liberties };
};

export const removeGroup = (board: Stone[][], group: Coord[]) => {
  group.forEach(([x, y]) => {
    board[y][x] = null;
  });
};

export const sleep = async (time?: any) =>
  await new Promise((resolve) => setTimeout(resolve, time || 30_000));

export const printBoard = (state: GameState) => {
  console.log(
    state.board
      .map((row) => row.map((cell) => cell || ".").join(" "))
      .join("\n")
  );
};

export const sendTextToVestaboard = async (text: string) => {
  const characters = vbml.parse({
    components: [
      {
        style: {
          width: 22,
          height: 6,
        },
        template: text,
      },
    ],
  });
  await fetch("https://rw.vestaboard.com/", {
    headers: new Headers({
      "Content-Type": "application/json",
      "X-Vestaboard-Read-Write-Key": Bun.env.VESTABOARD_WRITE_KEY ?? "",
    }),
    method: "POST",
    body: JSON.stringify(characters),
  });
};

export const printVestaboard = async (state: GameState, text?: string) => {
  if (!Bun.env.VESTABOARD_WRITE_KEY) {
    printBoard(state);
    console.log(text ? text : `${state.turn}'s move`);
    return;
  }
  const yellowUNfilledBoard = 65;
  const blackStone = 70;
  const whiteStone = 69;
  const board = state.board.map((row) =>
    row.map((cell) => {
      if (cell === "B") return blackStone;
      if (cell === "W") return whiteStone;
      return yellowUNfilledBoard;
    })
  );
  const characters = vbml.parse({
    components: [
      {
        style: {
          width: state.size,
          height: state.size,
        },
        rawCharacters: board,
      },
      {
        style: {
          absolutePosition: {
            x: state.size + 1,
            y: 0,
          },

          width: 22 - state.size,
          height: 4,
        },
        template: text ? text : `${state.turn}'s move`,
      },
    ],
  });
  const response = await fetch("https://rw.vestaboard.com/", {
    headers: new Headers({
      "Content-Type": "application/json",
      "X-Vestaboard-Read-Write-Key": Bun.env.VESTABOARD_WRITE_KEY ?? "",
    }),
    method: "POST",
    body: JSON.stringify(characters),
  });
  console.log("Vestaboard response:", response.status);
  if (response.status !== 200) {
    console.error("Error sending to Vestaboard:", response.statusText);
  }
};

type Event =
  | { type: "PLACE_STONE"; x: number; y: number }
  | { type: "PASS" }
  | { type: "FORCE_END" };

export const dispatch = (state: GameState, event: Event): GameState => {
  if (state.phase === "GameOver") {
    console.log("Game has ended.");
    return state;
  }

  if (event.type === "PLACE_STONE") {
    const { x, y } = event;

    // Reject if invalid move (out of bounds or occupied)
    if (!isValidMove(state, x, y)) {
      console.log("Invalid move");
      return state;
    }

    // Clone state for immutability
    const newState = structuredClone(state);

    // Place stone
    newState.board[y][x] = state.turn;

    // Identify enemy player
    const enemy = switchTurn(state.turn);

    const groupsToCapture: Coord[][] = [];

    for (const [nx, ny] of getNeighbors(newState, x, y)) {
      if (newState.board[ny][nx] === enemy) {
        const { group, liberties } = getGroupAndLiberties(
          newState,
          nx,
          ny,
          true
        );
        if (liberties.size === 0) {
          groupsToCapture.push(group);
        }
      }
    }

    for (const group of groupsToCapture) {
      removeGroup(newState.board, group);
    }

    // Check suicide on newly placed stone (using newState again)
    const { liberties } = getGroupAndLiberties(newState, x, y);
    if (liberties.size === 0) {
      console.log("Suicide move, rejected");
      return state; // reject suicide move
    }

    // Switch turns and reset passes
    newState.turn = enemy;
    newState.passes = 0;

    return newState;
  }

  if (event.type === "PASS") {
    const newState = structuredClone(state);
    newState.passes += 1;

    if (newState.passes >= 2) {
      newState.phase = "GameOver";
      console.log("Both players passed. Game over.");
    } else {
      newState.turn = switchTurn(newState.turn);
      console.log(`${newState.turn}'s turn (after pass)`);
    }

    return newState;
  }

  if (event.type === "FORCE_END") {
    const newState = structuredClone(state);
    newState.phase = "GameOver";
    return newState;
  }

  return state;
};

type Score = {
  B: number;
  W: number;
};

export function calculateWinner(state: GameState): {
  winner: Player | "Tie";
  score: Score;
} {
  const visited = new Set<string>();
  const score: Score = { B: 0, W: 0 };

  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      const stone = state.board[y][x];

      if (stone === "B") score.B++;
      else if (stone === "W") score.W++;
      else {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const territory = getTerritoryOwner(state, x, y, visited);
        if (territory === "B") score.B++;
        else if (territory === "W") score.W++;
      }
    }
  }

  const winner = score.B > score.W ? "B" : score.W > score.B ? "W" : "Tie";

  return { winner, score };
}

function getTerritoryOwner(
  state: GameState,
  x: number,
  y: number,
  visited: Set<string>
): Player | null {
  const queue: [number, number][] = [[x, y]];
  const localVisited = new Set<string>();
  const borderColors = new Set<Player>();
  let isEnclosed = true;

  while (queue.length) {
    const [cx, cy] = queue.pop()!;
    const key = `${cx},${cy}`;
    if (visited.has(key) || localVisited.has(key)) continue;

    localVisited.add(key);
    visited.add(key);

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) {
        isEnclosed = false;
        continue;
      }

      const neighbor = state.board[ny][nx];
      if (neighbor === null) {
        queue.push([nx, ny]);
      } else {
        borderColors.add(neighbor);
      }
    }
  }

  if (!isEnclosed || borderColors.size !== 1) return null;
  return [...borderColors][0];
}
