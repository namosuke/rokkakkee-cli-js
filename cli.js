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
  players: {
    playerA: colorA("You"),
    playerB: colorB("CPU"),
  },
  portals: {
    playerA: colorA("---"),
    playerB: colorB("---"),
  },
  turns: {
    playerA: `${colorA("あなた")}のターンです`,
    playerB: `${colorB("CPU")}のターンです`,
  },
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
    if (this.isPlayer && this.state) {
      result = this.game.drawPlayer(this.state);
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
      portals: {
        playerA: [this.cells[2][1], this.cells[2][2]],
        playerB: [this.cells[0][2], this.cells[0][1]],
      },
    };
    this.poss = {
      playerA: null,
      playerB: null,
    };
    this.currentSide = "playerA";
    this.points = {
      playerA: 0,
      playerB: 0,
    };
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
        if (this.poss[this.currentSide]) {
          this.cells[this.poss[this.currentSide][0]][
            this.poss[this.currentSide][1]
          ].isPlayer = false;
        }
        movable[this.selectingId].isPlayer = true;
        this.poss[this.currentSide] = movable[this.selectingId].pos;
        this.turn(this.nextSide(this.currentSide));
      }
      this.draw();
    });
    this.turn();
    this.draw();
  }
  static template(portalA, portalB, cells, text, pointA, pointB) {
    return `${items.players.playerA}: ${pointA} / ${
      items.players.playerB
    }: ${pointB}

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
        this.poss.playerA === null
          ? this.drawPlayer("playerA")
          : items.portals.playerA,
        this.poss.playerB === null
          ? this.drawPlayer("playerB")
          : items.portals.playerB,
        this.cells.map((row) => row.map((cell) => cell.draw())),
        items.turns[this.currentSide],
        this.points.playerA,
        this.points.playerB
      )
    );
  }
  drawPlayer(side) {
    return this.currentSide === side
      ? bold(items.players[side])
      : items.players[side];
  }
  searchMovable(side) {
    const pos = this.poss[side];
    if (this.poss[side] === null) {
      return this.cellsMap.portals[side];
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
