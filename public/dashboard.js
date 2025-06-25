// Get username from localStorage
const username = localStorage.getItem("username");

// Redirect to login if not found
if (!username) {
  window.location.href = "/signin-signup.html";
} else {
  // Set greeting text if the element exists
  const greeting = document.getElementById("userGreeting");
  if (greeting) {
    greeting.innerText = `Welcome, ${username}`;
  }

  // Set the 'My Files' redirect link
  const redirectLink = document.getElementById("redirectLink");
  if (redirectLink) {
    redirectLink.href = `../users/${username}/index.html`;
  }
}

// Handle file upload
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(uploadForm);

    try {
      const res = await fetch("/upload", {
        method: "POST",
        body: formData
      });

      const status = document.getElementById("uploadStatus");
      if (!status) return;

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
      void status.offsetWidth; // Reflow
      status.classList.add("status-msg");
    } catch (error) {
      console.error("Upload error:", error);
      const status = document.getElementById("uploadStatus");
      if (status) {
        status.style.color = "red";
        status.innerText = "Upload failed: Network error";
      }
    }
  });
}

// Logout function
function logout() {
  localStorage.removeItem("username");
  window.location.href = "/signin-signup.html";
}