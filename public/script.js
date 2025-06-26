// Get buttons and forms
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

// Show either login or register form by toggling 'active' class
function showForm(type) {
  if (type === "signin") {
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
    btnSignIn.classList.add("active");
    btnSignUp.classList.remove("active");
    authMessage.innerText = "";
    authMessage.style.color = "";
  } else {
    loginForm.classList.remove("active");
    registerForm.classList.add("active");
    btnSignIn.classList.remove("active");
    btnSignUp.classList.add("active");
    authMessage.innerText = "";
    authMessage.style.color = "";
  }
}

// Password validation (same as backend)
function isValidPassword(password) {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return pattern.test(password);
}

// On page load: check URL param to decide which form to show (default signin)
const params = new URLSearchParams(window.location.search);
const formParam = params.get("form");
if (formParam === "signup") {
  showForm("signup");
} else {
  showForm("signin");
}

// Add event listeners for toggle buttons
btnSignIn.addEventListener("click", () => showForm("signin"));
btnSignUp.addEventListener("click", () => showForm("signup"));

// LOGIN FORM SUBMIT HANDLER
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value.trim();

  if (!email || !password) {
    authMessage.style.color = "red";
    authMessage.innerText = "Please fill in all login fields.";
    return;
  }

  try {
    const response = await fetch("/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      const username = data.username || "User";
      localStorage.setItem("username", username); // Store for later use
      authMessage.style.color = "green";
      authMessage.innerText = `Welcome back, ${username}! Redirecting...`;
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      let errorMsg = "Login failed. Please try again.";
      try {
        const errData = await response.json();
        if (errData.message) errorMsg = errData.message;
      } catch {}
      authMessage.style.color = "red";
      authMessage.innerText = errorMsg;
    }
  } catch (err) {
    authMessage.style.color = "red";
    authMessage.innerText = "Network error. Please try again.";
  }
});

// REGISTER FORM SUBMIT HANDLER
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = registerForm.username.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value.trim();

  if (!username || !email || !password) {
    authMessage.style.color = "red";
    authMessage.innerText = "Please fill in all registration fields.";
    return;
  }

  if (!isValidPassword(password)) {
    authMessage.style.color = "red";
    authMessage.innerText =
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
    return;
  }

  try {
    const response = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username, email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("username", data.username || username); // Save for later use
      authMessage.style.color = "green";
      authMessage.innerText = "Registration successful! You can now log in.";
      showForm("signin");
    } else {
      let errorMsg = "Registration failed. Please try again.";
      try {
        const errData = await response.json();
        if (errData.message) errorMsg = errData.message;
      } catch {}
      authMessage.style.color = "red";
      authMessage.innerText = errorMsg;
    }
  } catch (err) {
    authMessage.style.color = "red";
    authMessage.innerText = "Network error. Please try again.";
  }
});