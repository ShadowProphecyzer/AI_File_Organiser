function toggleForm(type) {
  document.getElementById("loginForm").classList.toggle("hidden", type !== "login");
  document.getElementById("registerForm").classList.toggle("hidden", type !== "register");

  const authMessage = document.getElementById("authMessage");
  if (authMessage) authMessage.innerText = ""; // Clear messages when switching
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const authMessage = document.getElementById("authMessage");

  if (!email || !password) {
    authMessage.style.color = "red";
    authMessage.innerText = "Please fill in all login fields.";
    return;
  }

  const res = await fetch("/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) {
    const user = await res.json();
    authMessage.style.color = "green";
    authMessage.innerText = `Welcome back, ${user.username || user.name || "User"}! Redirecting...`;
    localStorage.setItem("username", user.username || user.name);
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 1500);
  } else {
    const errorMsg = await res.text();
    authMessage.style.color = "red";
    authMessage.innerText = `Error: ${errorMsg || 'Something went wrong. Please try again.'}`;
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const authMessage = document.getElementById("authMessage");

  if (!name || !email || !password) {
    authMessage.style.color = "red";
    authMessage.innerText = "Please fill in all registration fields.";
    return;
  }

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }), // ✅ Backend expects 'name'
  });

  if (res.ok) {
    authMessage.style.color = "green";
    authMessage.innerText = "Registration successful! You can now log in.";
    toggleForm("login"); // Optional: switch to login after success
  } else {
    const errorMsg = await res.text();
    authMessage.style.color = "red";
    authMessage.innerText = `Error: ${errorMsg}`;
  }
});
