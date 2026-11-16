// storage.js
// Shared by every page. Everything is saved in the browser's localStorage,
// so accounts and rankings only exist on the device they were created on.

const USERS_KEY = "ludoUsers";
const SESSION_KEY = "ludoSession";
const BOARD_PAGE = "Ludo_Board_Project.html";

/* ---------- users ---------- */

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUser(name) {
  const lower = name.toLowerCase();
  return getUsers().find(function (u) {
    return u.username.toLowerCase() === lower;
  });
}

function isValidUsername(name) {
  return /^[A-Za-z0-9_]{3,15}$/.test(name);
}

// Turns a password into a SHA-256 string so it isn't saved as plain text.
// Falls back to btoa if the browser has no crypto.subtle (it is not secure).
async function hashPassword(password) {
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const buffer = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buffer))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }
  return btoa(password);
}

/* ---------- session ---------- */

function getCurrentUser() {
  const name = localStorage.getItem(SESSION_KEY);
  if (!name) return null;
  return findUser(name) || null;
}

function startSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

// Call at the top of any page that needs a signed-in player.
function requireLogin() {
  if (!getCurrentUser()) {
    window.location.href = "login.html";
  }
}

// Call at the top of login/register so signed-in players skip them.
function skipIfLoggedIn() {
  if (getCurrentUser()) {
    window.location.href = BOARD_PAGE;
  }
}

/* ---------- top bar ---------- */

function renderNav() {
  const holder = document.getElementById("nav");
  const user = getCurrentUser();
  if (!holder || !user) return;

  const page = window.location.pathname.split("/").pop();

  const bar = document.createElement("div");
  bar.className = "topbar";

  const links = document.createElement("div");
  links.className = "links";
  [
    ["Board", BOARD_PAGE],
    ["Ranking", "ranking.html"]
  ].forEach(function (item) {
    const a = document.createElement("a");
    a.textContent = item[0];
    a.href = item[1];
    if (page === item[1]) a.className = "current";
    links.appendChild(a);
  });

  const right = document.createElement("div");
  right.className = "user";
  const who = document.createElement("span");
  who.textContent = "Signed in as " + user.username;
  const btn = document.createElement("button");
  btn.textContent = "Log out";
  btn.addEventListener("click", logout);
  right.appendChild(who);
  right.appendChild(btn);

  bar.appendChild(links);
  bar.appendChild(right);
  holder.appendChild(bar);
}

/* ---------- ranking data ---------- */

// 3 points for a win, 1 point for playing and not winning.
function getPoints(user) {
  return user.wins * 3 + (user.played - user.wins);
}

// Sorted best first: points, then wins, then fewer games played, then name.
function getRanked() {
  return getUsers().sort(function (a, b) {
    return (
      getPoints(b) - getPoints(a) ||
      b.wins - a.wins ||
      a.played - b.played ||
      a.username.localeCompare(b.username)
    );
  });
}

// Call this when a game ends. The game itself can use it later:
// recordMatch("jude", ["jude", "sam", "ada"])
function recordMatch(winnerName, playerNames) {
  const users = getUsers();
  users.forEach(function (u) {
    if (playerNames.indexOf(u.username) !== -1) {
      u.played += 1;
      if (u.username === winnerName) u.wins += 1;
    }
  });
  saveUsers(users);
}
