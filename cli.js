const readline = require("readline");

// これが無いとCtrl+Cで終了できない
readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const thin = (str) => `\x1b[2m${str}\x1b[0m`;
const bold = (str) => `\x1b[1m${str}\x1b[0m`;
const underline = (str) => `\x1b[4m${str}\x1b[0m`;
const swap = (str) => `\x1b[7m${str}\x1b[0m`;
const colorA = (str) => `\x1b[32m${str}\x1b[0m`;
const colorB = (str) => `\x1b[35m${str}\x1b[0m`;

const players = {
  playerA: {
    color: colorA,
    displayedName: colorA("You"),
    portal: colorA("---"),
    turnMessage: `${colorA("あなた")}のターンです`,
    winningMessage: `${colorA("あなた")}の勝ち！`,
  },
  playerB: {
    color: colorB,
    displayedName: colorB("CPU"),
    portal: colorB("---"),
    turnMessage: `${colorB("CPU")}のターンです`,
    winningMessage: `${colorB("CPU")}の勝ち！`,
  },
};

class Cell {
  constructor(game, pos, num = 0, state = null) {
    this.game = game;
    this.pos = pos;
    this.num = num;
    this.state = state;
    this.isMoveable = false;
    this.isSelecting = false;
    this.isPlayer = false;
  }

  draw() {
    // マスの値を何桁で表示するかを指定する
    const digitDisplayed = 1;
    const formattedCellNumber = String(this.num).padStart(digitDisplayed, "0");
    const num = ` ${formattedCellNumber} `;
    let result = players[this.state]?.color(num) ?? num;

    if (this.isPlayer && this.state) {
      result = this.game.drawPlayer(this.state);
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
    this.isGameOver = false;
    this.winner = null;
    this.gameEndCellCount = 11;
  }

  start() {
    // https://note.affi-sapo-sv.com/nodejs-console-cursor-onoff.php
    console.log("\x1b[?25l");
    process.on("exit", () => process.stdout.write("\x1b[?25h"));
    process.on("SIGINT", () => process.exit(0));
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on("keypress", (_str, key) => {
      if (this.isGameOver) {
        return;
      }
      const moveable = this.searchMoveable(this.currentSide);
      if (key.name === "right") {
        if (this.selectingId + 1 >= moveable.length) {
          this.selectingId = 0;
        } else {
          this.selectingId++;
        }
        this.cells.forEach((row) => row.forEach((cell) => {
          cell.isSelecting = false;
        }));
        moveable[this.selectingId].isSelecting = true;
      } else if (key.name === "left") {
        if (this.selectingId - 1 < 0) {
          this.selectingId = moveable.length - 1;
        } else {
          this.selectingId--;
        }
        this.cells.forEach((row) => row.forEach((cell) => {
          cell.isSelecting = false;
        }));
        moveable[this.selectingId].isSelecting = true;
      } else if (key.name === "up") {
        // 移動先が敵陣かつプレイヤーでないとき
        if (
          moveable[this.selectingId].state === this.nextSide &&
          this.poss[this.nextSide] !==
            moveable[this.selectingId].pos
        ) {
          if (moveable[this.selectingId].num === 1) {
            moveable[this.selectingId].state = null;
          }
          moveable[this.selectingId].num -= 1;
        } else {
          // もし敵プレイヤーなら
          if (
            this.poss[this.nextSide] ===
            moveable[this.selectingId].pos
          ) {
            this.poss[this.nextSide] = null;
            moveable[this.selectingId].num = 0;
          }
          moveable[this.selectingId].state = this.currentSide;
          // 移動時にisPlayerをリセット
          if (this.poss[this.currentSide]) {
            this.cells[this.poss[this.currentSide][0]][
              this.poss[this.currentSide][1]
            ].isPlayer = false;
            this.cells[this.poss[this.currentSide][0]][
              this.poss[this.currentSide][1]
            ].num += 1;
          }
          moveable[this.selectingId].isPlayer = true;
          this.poss[this.currentSide] = moveable[this.selectingId].pos;
        }
        this.turn(this.nextSide);
      }
      this.points.playerA = this.countPoint("playerA", this.cells);
      this.points.playerB = this.countPoint("playerB", this.cells);
      if (this.points.playerA + this.points.playerB >= this.gameEndCellCount) {
        this.isGameOver = true;
        this.winner =
          this.points.playerA > this.points.playerB ? "playerA" : "playerB";
        this.cells.forEach((row) => row.forEach((cell) => {
          cell.isMoveable = false;
          cell.isSelecting = false;
        }));
        this.currentSide = null;
      }
      this.draw();
    });
    this.turn();
    this.draw();
  }

  static template(portalA, portalB, cells, text, pointA, pointB) {
    return `${players.playerA.displayedName}: ${pointA} / ${players.playerB.displayedName}: ${pointB}

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
        text += `${cell}${thin("|")}`;
      }
      if (rowIndex !== cells.length - 1) {
        text += "\n";
      }
    }
    return text;
  }

  get nextSide() {
    return this.currentSide === "playerA" ? "playerB" : "playerA";
  }

  draw() {
    console.clear();
    console.log(
      Game.template(
        this.poss.playerA === null
          ? this.drawPlayer("playerA")
          : players.playerA.portal,
        this.poss.playerB === null
          ? this.drawPlayer("playerB")
          : players.playerB.portal,
        this.cells.map((row) => row.map((cell) => cell.draw())),
        this.isGameOver
          ? players[this.winner].winningMessage
          : players[this.currentSide].turnMessage,
        this.points.playerA,
        this.points.playerB,
      ),
    );
  }

  drawPlayer(side) {
    return this.currentSide === side
      ? bold(players[side].displayedName)
      : players[side].displayedName;
  }

  searchMoveable(side) {
    const pos = this.poss[side];

    if (pos === null) return this.cellsMap.portals[side];

    const result = [];

    this.cells.forEach((row) => row.forEach((cell) => {
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
    }));

    result.sort((a, b) => {
      const orders = [0, 0];

      [a, b].forEach((cell, index) => {
        const diffY = this.poss[this.currentSide][0] - cell.pos[0];
        const diffX = this.poss[this.currentSide][1] - cell.pos[1];

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

  turn(side = this.currentSide) {
    this.currentSide = side;
    this.selectingId = 0;
    this.cells.forEach((row) => row.forEach((cell) => {
      cell.isMoveable = false;
      cell.isSelecting = false;
    }));
    this.searchMoveable(side).forEach((cell) => {
      cell.isMoveable = true;
    });
    this.searchMoveable(side)[this.selectingId].isSelecting = true;
  }

  countPoint(side, cells) {
    let point = 0;
    cells.forEach((row) => row.forEach((cell) => {
      if (cell.state === side) point += 1;
    }));
    return point;
  }
}

const game = new Game();

game.start();
