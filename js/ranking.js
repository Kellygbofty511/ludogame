// ranking.js - logic for ranking.html (uses the helpers in storage.js)

renderNav();

const rankBody = document.getElementById("rankBody");
const playerList = document.getElementById("playerList");
const winnerSelect = document.getElementById("winner");
const matchForm = document.getElementById("matchForm");
const matchMessage = document.getElementById("matchMessage");
const guestForm = document.getElementById("guestForm");
const guestMessage = document.getElementById("guestMessage");

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/* ---------- ranking table ---------- */

function renderTable() {
  const players = getRanked();
  const me = getCurrentUser();
  rankBody.innerHTML = "";

  if (players.length === 0) {
    const tr = document.createElement("tr");
    const td = cell("No players yet. Register an account or add a guest below.", "empty");
    td.colSpan = 7;
    tr.appendChild(td);
    rankBody.appendChild(tr);
    return;
  }

  let rank = 0;
  players.forEach(function (p, i) {
    // same points and wins as the player above = same rank
    const prev = players[i - 1];
    if (!prev || getPoints(prev) !== getPoints(p) || prev.wins !== p.wins) {
      rank = i + 1;
    }

    const losses = p.played - p.wins;
    const rate = p.played === 0 ? "-" : Math.round((p.wins / p.played) * 100) + "%";

    const row = document.createElement("tr");
    if (me && p.username === me.username) row.className = "me";

    row.appendChild(cell(rank));
    row.appendChild(cell(p.username + (p.guest ? " (guest)" : ""), "name"));
    row.appendChild(cell(p.played));
    row.appendChild(cell(p.wins));
    row.appendChild(cell(losses));
    row.appendChild(cell(rate));
    row.appendChild(cell(getPoints(p)));
    rankBody.appendChild(row);
  });
}

/* ---------- record a game form ---------- */

function renderForm() {
  // keep whatever was ticked / selected when the list is rebuilt
  const ticked = Array.from(playerList.querySelectorAll("input:checked")).map(function (c) {
    return c.value;
  });
  const chosenWinner = winnerSelect.value;

  playerList.innerHTML = "";
  winnerSelect.innerHTML = "";

  getUsers()
    .sort(function (a, b) {
      return a.username.localeCompare(b.username);
    })
    .forEach(function (p) {
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = p.username;
      box.checked = ticked.indexOf(p.username) !== -1;
      label.appendChild(box);
      label.appendChild(document.createTextNode(p.username));
      playerList.appendChild(label);

      const option = document.createElement("option");
      option.value = p.username;
      option.textContent = p.username;
      winnerSelect.appendChild(option);
    });

  if (chosenWinner) winnerSelect.value = chosenWinner;
}

matchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  matchMessage.className = "message";
  matchMessage.textContent = "";

  const players = Array.from(playerList.querySelectorAll("input:checked")).map(function (c) {
    return c.value;
  });
  const winner = winnerSelect.value;

  if (players.length < 2 || players.length > 4) {
    matchMessage.textContent = "Pick between 2 and 4 players.";
    return;
  }
  if (players.indexOf(winner) === -1) {
    matchMessage.textContent = "The winner must be one of the players you ticked.";
    return;
  }

  recordMatch(winner, players);
  matchMessage.className = "message ok";
  matchMessage.textContent = "Result saved. " + winner + " won.";

  // clear the ticks for the next game
  playerList.querySelectorAll("input").forEach(function (c) {
    c.checked = false;
  });
  renderTable();
});

/* ---------- guests ---------- */

guestForm.addEventListener("submit", function (event) {
  event.preventDefault();
  guestMessage.className = "message";
  guestMessage.textContent = "";

  const name = document.getElementById("guestName").value.trim();

  if (!isValidUsername(name)) {
    guestMessage.textContent =
      "Name must be 3 to 15 characters: letters, numbers or underscore.";
    return;
  }
  if (findUser(name)) {
    guestMessage.textContent = "A player with that name already exists.";
    return;
  }

  const users = getUsers();
  users.push({ username: name, guest: true, wins: 0, played: 0 });
  saveUsers(users);

  document.getElementById("guestName").value = "";
  guestMessage.className = "message ok";
  guestMessage.textContent = name + " added.";
  renderForm();
  renderTable();
});

/* ---------- reset ---------- */

document.getElementById("resetBtn").addEventListener("click", function () {
  if (!confirm("Reset wins and games played for every player? Accounts are kept.")) {
    return;
  }
  const users = getUsers();
  users.forEach(function (u) {
    u.wins = 0;
    u.played = 0;
  });
  saveUsers(users);
  renderTable();
});

renderForm();
renderTable();
