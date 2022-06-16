// Type reference
// type Formatter = (str: string) => string;
// type Position = [number, number];
// type PlayerIdentifier = null | "playerA" | "playerB";

const readline = require("readline");

// 標準入力と標準出力を制御する
readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Formatter
const thin = (str) => `\x1b[2m${str}\x1b[0m`;
const bold = (str) => `\x1b[1m${str}\x1b[0m`;
const underline = (str) => `\x1b[4m${str}\x1b[0m`;
const swap = (str) => `\x1b[7m${str}\x1b[0m`;
const colorA = (str) => `\x1b[32m${str}\x1b[0m`;
const colorB = (str) => `\x1b[35m${str}\x1b[0m`;

// ({ color, displayedName, alias, portalAdjacentCells}: {
//   color: (str: string) => string;
//   displayedName: string;
//   alias: string;
//   portalAdjacentCells: [Cell, Cell];
// }) => Player;
class Player {
  // readonly game: Game;
  // readonly id: PlayerIdentifier;
  // readonly color: (str: string) => string;
  // readonly displayedName: string;
  // readonly turnMessage: string;
  // readonly winningMessage: string;
  // readonly portalAdjacentCells: [Cell, Cell];
  // pos: null | Position;

  constructor({
    game,
    id,
    color,
    displayedName,
    alias,
    portalAdjacentCells,
  }) {
    this.game = game;
    this.id = id;
    this.color = color;
    this.displayedName = color(displayedName);
    this.turnMessage = `${color(alias)}のターンです`;
    this.winningMessage = `${color(alias)}の勝ち！`;
    this.portalAdjacentCells = portalAdjacentCells;
    this.pos = null;
  }

  // () => number;
  get point() {
    return this.game.cells.flat().reduce((sum, cell) => (
      cell.player === this ? sum + 1 : sum
    ), 0);
  }

  get pointMessage() {
    return `${this.displayedName}: ${this.point}`;
  }

  get portal() {
    const onPortal = this.pos === null;
    const portal = onPortal ? this.toString() : this.color("---");

    return `${thin("(")}${portal}${thin(")")}`;
  }

  // () => string
  toString() {
    // currentPlayer だけ bold で表示する
    // ゲーム終了時は bold で表示しない
    const useBold = this === this.game.currentPlayer && !this.game.isGameOver;

    return useBold ? bold(this.displayedName) : this.displayedName;
  }
}

// (
//   game: Game,
//   pos: Position,
//   num?: number,
//   player?: Player,
// ) => Cell
class Cell {
  // readonly game: Game;
  // readonly pos: Position;
  // num: number;
  // player: Player;
  // isMoveable: boolean;
  // isSelecting: boolean;
  // isPlayer: boolean;

  constructor(game, pos, num, player) {
    this.game = game;
    this.pos = pos;
    this.num = num ?? 0;
    this.player = player ?? null;
    this.isMoveable = false;
    this.isSelecting = false;
    this.isPlayer = false;
  }

  // () => string
  toString() {
    // マスの値を何桁で表示するかを指定する
    const digitDisplayed = 1;
    const formattedCellNumber = String(this.num).padStart(digitDisplayed, "0");
    const num = ` ${formattedCellNumber} `;

    let result = this.player?.color(num) ?? num;

    if (this.isPlayer && this.player) {
      result = this.player.toString();
    }
    if (this.isMoveable) {
      result = underline(result);
    }
    if (this.isSelecting) {
      result = swap(result);
    }
    return result;
  }
}

class Game {
  // readonly cells: Cell[][];
  // readonly playerA: Player;
  // readonly playerB: Player;
  // currentPlayer: Player;
  // selectingId: number;

  constructor() {
    this.cells = [
      [
        new Cell(this, [0, 0]),
        new Cell(this, [0, 1]),
        new Cell(this, [0, 2]),
        new Cell(this, [0, 3]),
      ],
      [
        new Cell(this, [1, 0]),
        new Cell(this, [1, 1]),
        new Cell(this, [1, 2]),
      ],
      [
        new Cell(this, [2, 0]),
        new Cell(this, [2, 1]),
        new Cell(this, [2, 2]),
        new Cell(this, [2, 3]),
      ],
    ];

    this.playerA = new Player({
      game: this,
      id: "playerA",
      color: colorA,
      displayedName: "You",
      alias: "あなた",
      portalAdjacentCells: [this.cells[2][1], this.cells[2][2]],
    });

    this.playerB = new Player({
      game: this,
      id: "playerB",
      color: colorB,
      displayedName: "CPU",
      alias: "CPU",
      portalAdjacentCells: [this.cells[0][2], this.cells[0][1]],
    });

    this.currentPlayer = this.playerB;
    this.selectingId = 0;
  }

  get nextPlayer() {
    return this.currentPlayer === this.playerA ? this.playerB : this.playerA;
  }

  get winner() {
    return this.playerA.point > this.playerB.point ? this.playerA : this.playerB;
  }

  get isGameOver() {
    const maxPointAvailable = this.cells.flat().length;

    return this.playerA.point + this.playerB.point >= maxPointAvailable;
  }

  // (player: Player) => Cell[]
  searchMoveable(player = this.currentPlayer) {
    const { pos } = player;

    if (pos === null) return player.portalAdjacentCells;

    const result = [];

    this.cells.forEach((row) => row.forEach((cell) => {
      if (pos[0] % 2 === 0) {
        if (
          (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1] - 1)
          || (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1])
          || (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] - 1)
          || (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] + 1)
          || (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1] - 1)
          || (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1])
        ) {
          result.push(cell);
        }
      } else {
        if (
          (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1])
          || (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1] + 1)
          || (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] - 1)
          || (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] + 1)
          || (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1])
          || (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1] + 1)
        ) {
          result.push(cell);
        }
      }
    }));

    result.sort((a, b) => {
      const orders = [0, 0];

      [a, b].forEach((cell, index) => {
        const diffY = this.currentPlayer.pos[0] - cell.pos[0];
        const diffX = this.currentPlayer.pos[1] - cell.pos[1];

        if (cell.pos[0] % 2 === 0) {
          if (diffY === -1 && diffX === 0) {
            orders[index] = 0;
          } else if (diffY === 0 && diffX === 1) {
            orders[index] = 1;
          } else if (diffY === 1 && diffX === 0) {
            orders[index] = 2;
          } else if (diffY === 1 && diffX === -1) {
            orders[index] = 3;
          } else if (diffY === 0 && diffX === -1) {
            orders[index] = 4;
          } else if (diffY === -1 && diffX === -1) {
            orders[index] = 5;
          }
        } else {
          if (diffY === -1 && diffX === 1) {
            orders[index] = 0;
          } else if (diffY === 0 && diffX === 1) {
            orders[index] = 1;
          } else if (diffY === 1 && diffX === 1) {
            orders[index] = 2;
          } else if (diffY === 1 && diffX === 0) {
            orders[index] = 3;
          } else if (diffY === 0 && diffX === -1) {
            orders[index] = 4;
          } else if (diffY === -1 && diffX === 0) {
            orders[index] = 5;
          }
        }
      });

      return orders[0] - orders[1];
    });

    return result;
  }

  turn() {
    this.currentPlayer = this.nextPlayer;
    this.selectingId = 0;

    this.cells.forEach((row) => row.forEach((cell) => {
      cell.isMoveable = false;
      cell.isSelecting = false;
    }));

    const moveableCells = this.searchMoveable();
    moveableCells.forEach((cell) => { cell.isMoveable = true; });
    moveableCells[this.selectingId].isSelecting = true;
  }

  draw() {
    const points = `${this.playerA.pointMessage} / ${this.playerB.pointMessage}`;
    const portalB = " ".repeat(6) + this.playerB.portal;
    const portalA = " ".repeat(6) + this.playerA.portal;
    const cells = this.cells.map((row, rowIndex) => {
      const paddingSpacesAtBeginning = " ".repeat(rowIndex % 2 ? 2 : 0);
      const cellRow = row.map((cell) => cell.toString());
      const rowText = ["", ...cellRow, ""].join(thin("|")); // 前後に "|" をつける

      return paddingSpacesAtBeginning + rowText;
    }).join("\n");
    const info = this.isGameOver ? this.winner.winningMessage : this.currentPlayer.turnMessage;

    console.clear();
    console.log(points);
    console.log();
    console.log(portalB);
    console.log(cells);
    console.log(portalA);
    console.log();
    console.log(info);
  }

  start() {
    // カーソルを隠す
    // https://note.affi-sapo-sv.com/nodejs-console-cursor-onoff.php
    console.log("\x1b[?25l");
    process.on("exit", () => process.stdout.write("\x1b[?25h"));

    process.stdin.on("keypress", (_str, key) => {
      if (this.isGameOver) return;

      const moveableCells = this.searchMoveable();

      if (key.name === "left" || key.name === "right") {
        if (key.name === "left") {
          if (this.selectingId - 1 < 0) {
            this.selectingId = moveableCells.length - 1;
          } else {
            this.selectingId--;
          }
        } else if (key.name === "right") {
          if (this.selectingId + 1 >= moveableCells.length) {
            this.selectingId = 0;
          } else {
            this.selectingId++;
          }
        }

        this.cells.forEach((row) => row.forEach((cell) => {
          cell.isSelecting = false;
        }));

        moveableCells[this.selectingId].isSelecting = true;
      }

      if (key.name === "up") {
        const selectingCell = moveableCells[this.selectingId];

        // 移動先が敵陣かつプレイヤーでないとき
        if (selectingCell.player === this.nextPlayer
        && selectingCell.pos !== this.nextPlayer.pos) {
          selectingCell.num -= 1;

          if (selectingCell.num === 0) {
            selectingCell.player = null;
          }
        } else {
          // もし敵プレイヤーなら
          if (selectingCell.pos === this.nextPlayer.pos) {
            this.nextPlayer.pos = null;
            selectingCell.num = 0;
          }

          selectingCell.player = this.currentPlayer;

          // 移動時にisPlayerをリセット
          if (this.currentPlayer.pos) {
            const { pos: [row, col] } = this.currentPlayer;
            this.cells[row][col].isPlayer = false;
            this.cells[row][col].num += 1;
          }

          selectingCell.isPlayer = true;
          this.currentPlayer.pos = selectingCell.pos;
        }

        this.turn();
      }

      if (this.isGameOver) {
        this.cells.forEach((row) => row.forEach((cell) => {
          cell.isMoveable = false;
          cell.isSelecting = false;
        }));
      }

      this.draw();
    });

    this.turn();
    this.draw();
  }
}

const game = new Game();

game.start();
