// game.js - Ludo for 2 to 4 players on one device.
// The board is the table already on the page. We only read it to find the
// cells; its markup is not changed. Tokens are added on top of the cells.

const COLORS = ["blue", "yellow", "red", "green"]; // clockwise from the top
const SEATS = { 2: ["blue", "red"], 3: ["blue", "yellow", "red"], 4: COLORS };
const STARTS = { blue: 0, yellow: 11, red: 22, green: 33 };

// The 44 white/start squares in clockwise order, as [row, column].
// Index 0 is blue's start square.
const RING = [
  [1, 7], [2, 7], [3, 7], [4, 7], [5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [6, 12], [7, 12],
  [7, 11], [7, 10], [7, 9], [7, 8], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [12, 6], [12, 5],
  [11, 5], [10, 5], [9, 5], [8, 5], [7, 4], [7, 3], [7, 2], [7, 1], [7, 0], [6, 0], [5, 0],
  [5, 1], [5, 2], [5, 3], [5, 4], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5], [0, 6], [0, 7]
];

// The coloured squares each player walks up at the end.
const HOME_COLUMN = {
  blue: [[1, 6], [2, 6], [3, 6], [4, 6]],
  yellow: [[6, 11], [6, 10], [6, 9], [6, 8]],
  red: [[11, 6], [10, 6], [9, 6], [8, 6]],
  green: [[6, 1], [6, 2], [6, 3], [6, 4]]
};

// The big coloured boxes where tokens wait: [row, column] of their top-left cell.
const BASE_CELL = { green: [0, 0], blue: [0, 8], red: [8, 0], yellow: [8, 8] };

// Token position: -1 = in base, 0 = start square, 1 to 42 = around the ring,
// 43 to 46 = home column, 47 = home (finished).
const FINISHED = 47;
const OFFSETS = [[0, 0], [12, 12], [-12, -12], [12, -12]];

const panel = document.getElementById("game-panel");
let game = null;

/* ---------- finding the cells on the table ---------- */

// grid[row][col] gives the td at that spot, even for cells that span several.
const grid = [];
const table = document.querySelector("#table table");
Array.from(table.rows).forEach(function (row, r) {
  grid[r] = grid[r] || [];
  let c = 0;
  Array.from(row.cells).forEach(function (td) {
    while (grid[r][c]) c++;
    for (let i = 0; i < td.rowSpan; i++) {
      for (let j = 0; j < td.colSpan; j++) {
        grid[r + i] = grid[r + i] || [];
        grid[r + i][c + j] = td;
      }
    }
    c += td.colSpan;
  });
});
// lets the tokens sit on a cell without making the cell bigger
table.querySelectorAll("td").forEach(function (td) {
  td.style.position = "relative";
});

/* ---------- small helpers ---------- */

function el(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== "" && text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}

function capital(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function isStartSquare(index) {
  return COLORS.some(function (c) {
    return STARTS[c] === index;
  });
}

/* ---------- setting up a game ---------- */

function showSetup() {
  game = null;
  drawTokens();
  panel.innerHTML = "";
  panel.appendChild(el("h2", "New game"));

  const countLabel = el("label", "Number of players ");
  const count = document.createElement("select");
  [2, 3, 4].forEach(function (n) {
    count.appendChild(new Option(n, n));
  });
  countLabel.appendChild(count);
  panel.appendChild(countLabel);

  const seatBox = el("div", "", "seats");
  const message = el("p", "", "msg");
  const startBtn = el("button", "Start game", "btn");
  panel.appendChild(seatBox);
  panel.appendChild(message);
  panel.appendChild(startBtn);
  panel.appendChild(soundButton());

  function drawSeats() {
    seatBox.innerHTML = "";
    const me = getCurrentUser();
    const users = getUsers().sort(function (a, b) {
      return a.username.localeCompare(b.username);
    });
    SEATS[count.value].forEach(function (color, i) {
      const label = el("label", "", "seat");
      label.appendChild(el("span", "", "chip " + color));
      label.appendChild(document.createTextNode(capital(color) + " "));
      const select = document.createElement("select");
      users.forEach(function (u) {
        select.appendChild(new Option(u.username + (u.guest ? " (guest)" : ""), u.username));
      });
      select.appendChild(new Option("Guest (not ranked)", ""));
      select.value = i === 0 && me ? me.username : "";
      label.appendChild(select);
      seatBox.appendChild(label);
    });
  }

  count.addEventListener("change", drawSeats);
  drawSeats();

  startBtn.addEventListener("click", function () {
    const chosen = Array.from(seatBox.querySelectorAll("select")).map(function (s) {
      return s.value;
    });
    const names = chosen.filter(Boolean);
    const repeated = names.some(function (n, i) {
      return names.indexOf(n) !== i;
    });
    if (repeated) {
      message.textContent = "A player can only take one colour.";
      return;
    }
    startGame(
      SEATS[count.value].map(function (color, i) {
        return {
          color: color,
          name: chosen[i],
          label: chosen[i] || capital(color) + " guest",
          tokens: [-1, -1, -1, -1]
        };
      })
    );
  });
}

function startGame(players) {
  game = { players: players, turn: 0, dice: 0, phase: "roll", sixes: 0, movable: [], message: "", saved: false };
  refresh();
}

/* ---------- playing ---------- */

function roll() {
  if (!game || game.phase !== "roll") return;
  const player = game.players[game.turn];

  game.dice = Math.floor(Math.random() * 6) + 1;
  game.sixes = game.dice === 6 ? game.sixes + 1 : 0;
  playSound("roll");
  if (game.sixes === 3) {
    game.message = player.label + " rolled three sixes in a row and loses the turn.";
    playSound("nomove", 0.5);
    endTurn();
    return;
  }

  // a token can leave base on a 6, and needs an exact roll to reach home
  game.movable = [];
  player.tokens.forEach(function (t, i) {
    const canLeave = t === -1 && game.dice === 6;
    const canWalk = t >= 0 && t < FINISHED && t + game.dice <= FINISHED;
    if (canLeave || canWalk) game.movable.push(i);
  });

  if (game.movable.length === 0) {
    game.message = player.label + " rolled " + game.dice + " and can't move.";
    playSound("nomove", 0.5);
    endTurn();
  } else if (game.movable.length === 1) {
    move(game.movable[0], 0.5); // only one choice, so play it (after the dice sound)
  } else {
    game.phase = "move";
    game.message = "Rolled " + game.dice + ". Click a token to move it.";
    refresh();
  }
}

function move(i, soundDelay) {
  const player = game.players[game.turn];
  let extraTurn = game.dice === 6;
  let captured = false;

  player.tokens[i] = player.tokens[i] === -1 ? 0 : player.tokens[i] + game.dice;
  const spot = player.tokens[i];
  game.message = player.label + " moved a " + player.color + " token.";

  // landing on the ring: send opponents on the same square back to base
  if (spot <= 42) {
    const index = (STARTS[player.color] + spot) % 44;
    if (!isStartSquare(index)) {
      let sent = 0;
      game.players.forEach(function (other) {
        if (other === player) return;
        other.tokens.forEach(function (t, k) {
          if (t >= 0 && t <= 42 && (STARTS[other.color] + t) % 44 === index) {
            other.tokens[k] = -1;
            sent++;
          }
        });
      });
      if (sent > 0) {
        captured = true;
        extraTurn = true;
        game.message += " " + sent + " opponent token" + (sent > 1 ? "s" : "") + " sent back to base.";
      }
    }
  }

  if (spot === FINISHED) {
    extraTurn = true;
    game.message = player.label + " got a token home.";
  }

  const allHome = player.tokens.every(function (t) {
    return t === FINISHED;
  });

  // one sound per move, the most important event wins
  if (allHome) playSound("win", soundDelay);
  else if (spot === FINISHED) playSound("home", soundDelay);
  else if (captured) playSound("capture", soundDelay);
  else playSound("move", soundDelay);

  if (allHome) {
    finish(player);
  } else if (extraTurn) {
    game.phase = "roll";
    game.movable = [];
    game.message += " Roll again.";
    refresh();
  } else {
    endTurn();
  }
}

function endTurn() {
  game.sixes = 0;
  game.turn = (game.turn + 1) % game.players.length;
  game.phase = "roll";
  game.movable = [];
  refresh();
}

function finish(winner) {
  game.phase = "over";
  game.message = winner.label + " wins!";
  // registered players get the result in the ranking. A guest winner has
  // no name, so it only counts as a game played for the others.
  const names = game.players
    .map(function (p) {
      return p.name;
    })
    .filter(Boolean);
  if (names.length > 0) {
    recordMatch(winner.name, names);
    game.saved = true;
  }
  refresh();
}

/* ---------- drawing ---------- */

function refresh() {
  drawPanel();
  drawTokens();
}

function drawPanel() {
  const current = game.players[game.turn];
  const over = game.phase === "over";
  panel.innerHTML = "";

  const top = el("div", "", "line");
  const turn = el("div", "", "turn");
  turn.appendChild(el("span", "", "chip " + current.color));
  turn.appendChild(document.createTextNode(over ? game.message : current.label + "'s turn"));
  const dice = el("div", game.dice || "-", "dice");
  const rollBtn = el("button", "Roll dice", "btn");
  rollBtn.disabled = game.phase !== "roll";
  rollBtn.addEventListener("click", roll);
  top.appendChild(turn);
  top.appendChild(dice);
  top.appendChild(rollBtn);
  panel.appendChild(top);

  panel.appendChild(el("p", over ? "" : game.message, "msg"));

  const list = el("div", "", "players");
  game.players.forEach(function (p) {
    const home = p.tokens.filter(function (t) {
      return t === FINISHED;
    }).length;
    const item = el("div", "", "player" + (p === current && !over ? " active" : ""));
    item.appendChild(el("span", "", "chip " + p.color));
    item.appendChild(document.createTextNode(p.label + ": " + home + "/4 home"));
    list.appendChild(item);
  });
  panel.appendChild(list);

  const actions = el("div", "", "line actions");
  const again = el("button", over ? "Play again" : "New game", "btn small-btn");
  again.addEventListener("click", showSetup);
  actions.appendChild(again);
  actions.appendChild(soundButton());
  if (over && game.saved) {
    const link = el("a", "Result saved. View ranking");
    link.href = "ranking.html";
    actions.appendChild(link);
  }
  panel.appendChild(actions);
}

function drawTokens() {
  document.querySelectorAll(".token").forEach(function (t) {
    t.remove();
  });
  if (!game) return;

  const current = game.players[game.turn];
  const perCell = new Map();

  game.players.forEach(function (player) {
    player.tokens.forEach(function (t, i) {
      if (t === FINISHED) return;

      let td, dx, dy;
      if (t === -1) {
        const base = BASE_CELL[player.color];
        td = grid[base[0]][base[1]];
        dx = i % 2 ? 50 : -50;
        dy = i < 2 ? -65 : 65;
      } else {
        const spot = t <= 42 ? RING[(STARTS[player.color] + t) % 44] : HOME_COLUMN[player.color][t - 43];
        td = grid[spot[0]][spot[1]];
        const n = perCell.get(td) || 0;
        perCell.set(td, n + 1);
        dx = OFFSETS[n % 4][0];
        dy = OFFSETS[n % 4][1];
      }

      const token = el("div", "", "token " + player.color);
      token.style.left = "calc(50% + " + dx + "px)";
      token.style.top = "calc(50% + " + dy + "px)";

      if (game.phase === "move" && player === current && game.movable.indexOf(i) !== -1) {
        token.classList.add("movable");
        token.tabIndex = 0;
        token.setAttribute("role", "button");
        token.setAttribute("aria-label", "Move " + player.color + " token");
        token.addEventListener("click", function () {
          move(i);
        });
        token.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            move(i);
          }
        });
      }
      td.appendChild(token);
    });
  });
}

showSetup();
