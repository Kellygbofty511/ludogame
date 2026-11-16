// login.js - logic for login.html

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "";

  const typed = document.getElementById("user").value.trim();
  const password = document.getElementById("password").value;

  if (typed === "" || password === "") {
    message.textContent = "Enter your username (or email) and password.";
    return;
  }

  // look the player up by username or by email
  const lower = typed.toLowerCase();
  const user = getUsers().find(function (u) {
    return (
      u.username.toLowerCase() === lower ||
      (u.email && u.email.toLowerCase() === lower)
    );
  });

  // guests have no password, so they can never log in
  const hash = await hashPassword(password);
  if (!user || !user.passwordHash || user.passwordHash !== hash) {
    message.textContent = "Wrong username or password.";
    return;
  }

  startSession(user.username);
  window.location.href = BOARD_PAGE;
});
