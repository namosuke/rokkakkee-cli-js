const readline = require("readline");

// 標準入力と標準出力を制御する
readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// type Formatter = (str: string) => string;
const thin = (str) => `\x1b[2m${str}\x1b[0m`;
const bold = (str) => `\x1b[1m${str}\x1b[0m`;
const underline = (str) => `\x1b[4m${str}\x1b[0m`;
const swap = (str) => `\x1b[7m${str}\x1b[0m`;
const colorA = (str) => `\x1b[32m${str}\x1b[0m`;
const colorB = (str) => `\x1b[35m${str}\x1b[0m`;

// ({ game, displayedName, alias, portalAdjacentCells, color }: {
//   game: Game;
//   displayedName: string;
//   alias: string;
//   portalAdjacentCells: Cell[];
//   color: Formatter;
// }) => Player;
class Player {
  // private readonly #game: Game;
  // private readonly #displayedName: string;
  // private readonly #alias: string;
  // private readonly #portalAdjacentCells: Cell[];
  // color: Formatter;
  // currentCell: null | Cell;

  #game;

  #displayedName;

  #alias;

  #portalAdjacentCells;

  constructor({ game, displayedName, alias, portalAdjacentCells, color }) {
    this.#game = game;
    this.#displayedName = displayedName;
    this.#alias = alias;
    this.#portalAdjacentCells = portalAdjacentCells;

    this.color = color;
    this.currentCell = null;
  }

  // get portalAdjacentCells(): Cell[]
  get portalAdjacentCells() {
    return this.#portalAdjacentCells;
  }

  // get point(): number
  get point() {
    return this.#game.cells.flat().filter((cell) => cell.owner === this).length;
  }

  get portal() {
    const onPortal = this.currentCell === null;
    const portal = onPortal ? this.toString() : this.color("---");

    return `${thin("(")}${portal}${thin(")")}`;
  }

  // get turnMessage(): string
  get turnMessage() {
    return `${this.color(this.#alias)}のターンです`;
  }

  // get winningMessage(): string
  get winningMessage() {
    return `${this.color(this.#alias)}の勝ち！`;
  }

  // get pointMessage(): string
  get pointMessage() {
    return `${this.color(this.#displayedName)}: ${this.point}`;
  }

  respawn() {
    this.currentCell = null;
  }

  // (targetCell: Cell) => void
  moveTo(targetCell) {
    // (cell: Cell) => void
    const leave = (cell) => {
      cell.playerOnCell = false;
    };

    // (cell: Cell) => void
    const enter = (cell) => {
      this.currentCell = cell;
      cell.playerOnCell = true;
    };

    if (this.currentCell === targetCell) {
      throw Error("同じセルに移動できない。");
    }

    if (this.currentCell !== null) {
      leave(this.currentCell);
    }

    enter(targetCell);
  }

  // () => string
  toString() {
    // currentPlayer だけ bold で表示する
    // ゲーム終了時は bold で表示しない
    const useBold = this === this.#game.currentPlayer && !this.#game.isGameOver;

    let playerString = this.color(this.#displayedName);

    if (useBold) {
      playerString = bold(playerString);
    }

    return playerString;
  }
}

// type Position = [number, number];
// type Owner = null | Player;
// (
//   pos: Position,
//   owner?: Player,
//   def?: number,
// ) => Cell
class Cell {
  // private readonly #pos: Position;
  // private #owner: Owner;
  // def: number;
  // isMovable: boolean;
  // isSelecting: boolean;
  // playerOnCell: boolean;

  #pos;

  #owner;

  constructor(pos, owner = null, def = 0) {
    this.#pos = pos;
    this.#owner = owner;

    this.def = def;
    this.isMovable = false;
    this.isSelecting = false;
    this.playerOnCell = false;
  }

  // get pos(): Position
  get pos() {
    return this.#pos;
  }

  get owner() {
    return this.#owner;
  }

  // (owner: Owner) => void
  changeOwner(owner) {
    this.#owner = owner;
  }

  // () => string
  toString() {
    // マスの値を何桁で表示するかを指定する
    const digitDisplayed = 1;
    const formattedCellNumber = String(this.def).padStart(digitDisplayed, "0");
    const def = ` ${formattedCellNumber} `;

    let cellString = this.playerOnCell ? this.owner.toString() : def;

    if (this.#owner !== null) {
      cellString = this.#owner.color(cellString);
    }

    if (this.isMovable) {
      cellString = underline(cellString);
    }

    if (this.isSelecting) {
      cellString = swap(cellString);
    }

    return cellString;
  }
}

class Game {
  // private readonly #cells: Cell[][];
  // private readonly #players: Player[];
  // currentPlayer: Player;
  // private #selectedIdx: number;
  // private #movableCells: Cell[];

  #cells;

  #players;

  #selectedIdx;

  #movableCells;

  constructor() {
    this.#cells = [
      [new Cell([0, 0]), new Cell([0, 1]), new Cell([0, 2]), new Cell([0, 3])],
      [new Cell([1, 0]), new Cell([1, 1]), new Cell([1, 2])],
      [new Cell([2, 0]), new Cell([2, 1]), new Cell([2, 2]), new Cell([2, 3])],
    ];

    const playerA = new Player({
      game: this,
      displayedName: "You",
      alias: "あなた",
      portalAdjacentCells: [this.#cells[2][1], this.#cells[2][2]],
      color: colorA,
    });

    const playerB = new Player({
      game: this,
      displayedName: "CPU",
      alias: "CPU",
      portalAdjacentCells: [this.#cells[0][2], this.#cells[0][1]],
      color: colorB,
    });

    this.#players = [playerA, playerB];
    this.currentPlayer = this.#players.at(-1);
    this.#selectedIdx = 0;
    this.#movableCells = [];
  }

  get selectedIdx() {
    return this.#selectedIdx;
  }

  // set selectedIdx(num: number)
  set selectedIdx(num) {
    this.selectedCell.isSelecting = false;
    this.#selectedIdx =
      (num + this.#movableCells.length) % this.#movableCells.length;
    this.selectedCell.isSelecting = true;
  }

  // get selectedCell(): Cell
  get selectedCell() {
    return this.#movableCells[this.#selectedIdx];
  }

  get cells() {
    return this.#cells;
  }

  // get nextPlayer(): Player
  get nextPlayer() {
    let playerIdx = this.#players.findIndex(
      (player) => player === this.currentPlayer
    );
    playerIdx += 1;
    playerIdx %= this.#players.length;

    return this.#players.at(playerIdx);
  }

  // TODO: consider the case multiple players
  // get winner(): Player
  get winner() {
    const maxPoint = Math.max(...this.#players.map((player) => player.point));

    return this.#players.find((player) => player.point === maxPoint);
  }

  get isGameOver() {
    return (
      this.#cells.flat().filter((cell) => cell.owner === null).length === 0
    );
  }

  // (player: Player) => Cell[]
  searchMovable(player = this.currentPlayer) {
    if (player.currentCell === null) return player.portalAdjacentCells;

    const [row, col] = player.currentCell.pos;

    return [
      this.#cells[row + 1]?.[col + (row % 2 ? 0 : -1)], // 左下
      this.#cells[row]?.[col - 1], // 左
      this.#cells[row - 1]?.[col + (row % 2 ? 0 : -1)], // 左上
      this.#cells[row - 1]?.[col + (row % 2 ? 1 : 0)], // 右上
      this.#cells[row]?.[col + 1], // 右
      this.#cells[row + 1]?.[col + (row % 2 ? 1 : 0)], // 右下
    ].filter(Boolean);
  }

  nextTurn() {
    this.#movableCells.forEach((cell) => {
      cell.isMovable = false;
      cell.isSelecting = false;
    });

    if (this.isGameOver) return;

    this.currentPlayer = this.nextPlayer;
    // Can not change to this.selectedIdx
    this.#selectedIdx = 0;
    this.#movableCells = this.searchMovable();
    this.#movableCells.forEach((cell) => {
      cell.isMovable = true;
    });
    this.selectedCell.isSelecting = true;
  }

  draw() {
    const points = this.#players
      .map((player) => player.pointMessage)
      .join(" / ");
    const portalB = " ".repeat(6) + this.#players[1].portal;
    const portalA = " ".repeat(6) + this.#players[0].portal;
    const cells = this.#cells
      .map((row, rowIndex) => {
        const paddingSpacesAtBeginning = " ".repeat(rowIndex % 2 ? 2 : 0);
        const cellRow = row.map((cell) => cell.toString());
        const rowText = ["", ...cellRow, ""].join(thin("|")); // 前後に "|" をつける

        return paddingSpacesAtBeginning + rowText;
      })
      .join("\n");
    const info = this.isGameOver
      ? this.winner.winningMessage
      : this.currentPlayer.turnMessage;

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

    // 移動先のセルを選択
    process.stdin.on("keypress", (_str, key) => {
      if (key.name === "left") this.selectedIdx -= 1;
      if (key.name === "right") this.selectedIdx += 1;
    });

    // セルへ移動
    process.stdin.on("keypress", (_str, key) => {
      if (key.name === "up") {
        if (this.selectedCell.owner === null) {
          // 中立セル
          this.currentPlayer.moveTo(this.selectedCell);
          this.selectedCell.changeOwner(this.currentPlayer);
          this.selectedCell.def = 1;
        } else if (this.selectedCell.owner === this.currentPlayer) {
          // 自陣セル
          this.currentPlayer.moveTo(this.selectedCell);
          this.selectedCell.def += 1;
        } else if (this.selectedCell.playerOnCell) {
          // 敵陣セルかつ敵がいる
          this.currentPlayer.moveTo(this.selectedCell);
          this.selectedCell.owner.respawn();
          this.selectedCell.changeOwner(this.currentPlayer);
          this.selectedCell.def = 1;
        } else {
          // 敵陣セルかつ敵がいない
          this.selectedCell.def -= 1;

          if (this.selectedCell.def === 0) {
            this.selectedCell.changeOwner(null);
          }
        }

        this.nextTurn();
      }
    });

    // 描画
    process.stdin.on("keypress", () => this.draw());

    // ゲームオーバー処理
    process.stdin.on("keypress", () => {
      if (this.isGameOver) process.exit();
    });

    this.nextTurn();
    this.draw();
  }
}

const game = new Game();

game.start();
