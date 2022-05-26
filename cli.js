const readline = require("readline");

// これが無いとCtrl+Cで終了できない
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const thin = (str) => `\x1b[2m${str}\x1b[0m`;
const bold = (str) => `\x1b[1m${str}\x1b[0m`;
const underline = (str) => `\x1b[4m${str}\x1b[0m`;
const swap = (str) => `\x1b[7m${str}\x1b[0m`;
const colorA = (str) => `\x1b[32m${str}\x1b[0m`;
const colorB = (str) => `\x1b[35m${str}\x1b[0m`;

const items = {
  playerA: colorA("You"),
  playerB: colorB("CPU"),
  portalA: colorA("---"),
  portalB: colorB("---"),
  turnA: `${colorA("あなた")}のターンです`,
  turnB: `${colorB("CPU")}のターンです`,
};

class Cell {
  constructor(game, pos, num = 0, state = null) {
    this.game = game;
    this.pos = pos;
    this.num = num;
    this.state = state;
    this.isMovable = false;
    this.isSelecting = false;
    this.isPlayer = false;
  }
  draw(num = this.num, state = this.state) {
    num = " " + String(num).padStart(1, "0") + " ";
    const stateDict = {
      playerA: colorA(num),
      playerB: colorB(num),
    };
    let result = stateDict[state] ?? num;
    if (this.isPlayer) {
      if (this.state === "playerA") {
        result = this.game.playerA();
      } else if (this.state === "playerB") {
        result = this.game.playerB();
      }
    }
    if (this.isMovable) {
      result = underline(result);
    }
    if (this.isSelecting) {
      result = swap(result);
    }
    return result;
  }
}

class Game {
  constructor() {
    this.cells = [
      [
        new Cell(this, [0, 0]),
        new Cell(this, [0, 1]),
        new Cell(this, [0, 2]),
        new Cell(this, [0, 3]),
      ],
      [new Cell(this, [1, 0]), new Cell(this, [1, 1]), new Cell(this, [1, 2])],
      [
        new Cell(this, [2, 0]),
        new Cell(this, [2, 1]),
        new Cell(this, [2, 2]),
        new Cell(this, [2, 3]),
      ],
    ];
    this.cellsMap = {
      portalA: [this.cells[2][1], this.cells[2][2]],
      portalB: [this.cells[0][2], this.cells[0][1]],
    };
    this.posA = null;
    this.posB = null;
    this.currentSide = "playerA";
    this.pointA = 0;
    this.pointB = 0;
    this.selectingId = 0;
    this.start();
  }
  start() {
    // https://note.affi-sapo-sv.com/nodejs-console-cursor-onoff.php
    console.log("\x1b[?25l");
    process.on("exit", () => process.stdout.write("\x1b[?25h"));
    process.on("SIGINT", () => process.exit(0));
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on("keypress", (str, key) => {
      const movable = this.searchMovable(this.currentSide);
      if (key.name === "right") {
        if (this.selectingId + 1 >= movable.length) {
          this.selectingId = 0;
        } else {
          this.selectingId++;
        }
        this.cells.map((row) => row.map((cell) => (cell.isSelecting = false)));
        movable[this.selectingId].isSelecting = true;
      } else if (key.name === "left") {
        if (this.selectingId - 1 < 0) {
          this.selectingId = movable.length - 1;
        } else {
          this.selectingId--;
        }
        this.cells.map((row) => row.map((cell) => (cell.isSelecting = false)));
        movable[this.selectingId].isSelecting = true;
      } else if (key.name === "space") {
        movable[this.selectingId].state = this.currentSide;
        // 移動時にisPlayerをリセット
        if (this.posA && this.currentSide === "playerA") {
          this.cells[this.posA[0]][this.posA[1]].isPlayer = false;
        } else if (this.posB && this.currentSide === "playerB") {
          this.cells[this.posB[0]][this.posB[1]].isPlayer = false;
        }
        movable[this.selectingId].isPlayer = true;
        if (this.currentSide === "playerA") {
          this.posA = movable[this.selectingId].pos;
        } else {
          this.posB = movable[this.selectingId].pos;
        }
        this.turn(this.nextSide(this.currentSide));
      }
      this.draw();
    });
    this.turn();
    this.draw();
  }
  static template(portalA, portalB, cells, text, pointA, pointB) {
    return `${items.playerA}: ${pointA} / ${items.playerB}: ${pointB}

      ${thin("(")}${portalB}${thin(")")}
${Game.cellsTemplate(cells)}
      ${thin("(")}${portalA}${thin(")")}

${text}`;
  }
  static cellsTemplate(cells) {
    let text = "";
    for (let rowIndex = 0; rowIndex < cells.length; rowIndex++) {
      if (rowIndex % 2 === 1) {
        text += "  ";
      }
      const row = cells[rowIndex];
      text += `${thin("|")}`;
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const cell = row[cellIndex];
        text += cell + `${thin("|")}`;
      }
      if (rowIndex !== cells.length - 1) {
        text += "\n";
      }
    }
    return text;
  }
  nextSide(side) {
    return side === "playerA" ? "playerB" : "playerA";
  }
  draw() {
    console.clear();
    console.log(
      Game.template(
        this.posA === null ? this.playerA() : items.portalA,
        this.posB === null ? this.playerB() : items.portalB,
        this.cells.map((row) => row.map((cell) => cell.draw())),
        this.currentSide === "playerA" ? items.turnA : items.turnB,
        this.pointA,
        this.pointB
      )
    );
  }
  playerA() {
    return this.currentSide === "playerA" ? bold(items.playerA) : items.playerA;
  }
  playerB() {
    return this.currentSide === "playerB" ? bold(items.playerB) : items.playerB;
  }
  searchMovable(side) {
    const pos = side === "playerA" ? this.posA : this.posB;
    if (this.posA === null && side === "playerA") {
      return this.cellsMap.portalA;
    } else if (this.posB === null && side === "playerB") {
      return this.cellsMap.portalB;
    } else {
      const result = [];
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          if (pos[0] % 2 === 0) {
            if (
              (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1] - 1) ||
              (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1]) ||
              (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] - 1) ||
              (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] + 1) ||
              (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1] - 1) ||
              (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1])
            ) {
              result.push(cell);
            }
          } else {
            if (
              (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1]) ||
              (cell.pos[0] === pos[0] - 1 && cell.pos[1] === pos[1] + 1) ||
              (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] - 1) ||
              (cell.pos[0] === pos[0] && cell.pos[1] === pos[1] + 1) ||
              (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1]) ||
              (cell.pos[0] === pos[0] + 1 && cell.pos[1] === pos[1] + 1)
            ) {
              result.push(cell);
            }
          }
        })
      );
      return result;
    }
  }
  turn(side = this.currentSide) {
    this.currentSide = side;
    this.selectingId = 0;
    this.cells.map((row) =>
      row.map((cell) => {
        cell.isMovable = false;
        cell.isSelecting = false;
      })
    );
    this.searchMovable(side).map((cell) => (cell.isMovable = true));
    this.searchMovable(side)[this.selectingId].isSelecting = true;
  }
}

new Game();

// process.exit();
// rl.question("入力してください > ", (inputString) => {
//   rl.write(`入力された文字：[${inputString}]`);
// });
