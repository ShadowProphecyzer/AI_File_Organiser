const username = localStorage.getItem("username");
if (!username) {
  window.location.href = "/sign-in-sign-up.html";
} else {
  document.getElementById("userGreeting").innerText = `Welcome, ${username}`;
}

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch("/upload", {
    method: "POST",
    body: formData
  });

  const status = document.getElementById("uploadStatus");
  if (res.ok) {
    status.style.color = "green";
    status.innerText = "File uploaded successfully!";
  } else {
    const err = await res.text();
    status.style.color = "red";
    status.innerText = `Upload failed: ${err}`;
  }

  // Trigger animation
  status.style.opacity = "0";
  status.classList.remove("status-msg");
  void status.offsetWidth; // Force reflow
  status.classList.add("status-msg");
});

function logout() {
  localStorage.removeItem("username");
  window.location.href = "/sign-in-sign-up.html";
}
