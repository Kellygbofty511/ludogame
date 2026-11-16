// register.js - logic for register.html

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "";

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  if (!isValidUsername(username)) {
    message.textContent =
      "Username must be 3 to 15 characters: letters, numbers or underscore.";
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    message.textContent = "Enter a valid email address.";
    return;
  }
  if (password.length < 6) {
    message.textContent = "Password must be at least 6 characters.";
    return;
  }
  if (password !== confirm) {
    message.textContent = "The two passwords do not match.";
    return;
  }
  if (findUser(username)) {
    message.textContent = "That username is taken. Try another one.";
    return;
  }
  const emailTaken = getUsers().some(function (u) {
    return u.email && u.email.toLowerCase() === email.toLowerCase();
  });
  if (emailTaken) {
    message.textContent = "An account with that email already exists.";
    return;
  }

  const users = getUsers();
  users.push({
    username: username,
    email: email,
    passwordHash: await hashPassword(password),
    wins: 0,
    played: 0
  });
  saveUsers(users);

  startSession(username);
  window.location.href = BOARD_PAGE;
});
