import { dispatch, createGame, printBoard } from "./game";

let game = createGame(6);

game = dispatch(game, { type: "PLACE_STONE", x: 1, y: 1 }); // B
printBoard(game);
game = dispatch(game, { type: "PLACE_STONE", x: 2, y: 1 }); // W
printBoard(game);

game = dispatch(game, { type: "PLACE_STONE", x: 2, y: 0 }); // B
printBoard(game);

game = dispatch(game, { type: "PLACE_STONE", x: 3, y: 3 }); // W
printBoard(game);

game = dispatch(game, { type: "PLACE_STONE", x: 3, y: 1 }); // B
printBoard(game);

game = dispatch(game, { type: "PLACE_STONE", x: 3, y: 4 }); // W

game = dispatch(game, { type: "PLACE_STONE", x: 2, y: 2 }); // B captures W at (2,1)
printBoard(game);
