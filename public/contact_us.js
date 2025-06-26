const form = document.getElementById("contactForm");
const submitBtn = form.querySelector('button[type="submit"]');
const statusMessage = document.getElementById("statusMessage");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !message) {
    statusMessage.textContent = "Please fill out all fields.";
    statusMessage.style.color = "red";
    return;
  }

  // Disable button and show loading text
  submitBtn.disabled = true;
  const originalBtnText = submitBtn.textContent;
  submitBtn.textContent = "Sending...";

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });

    const data = await response.json();
    statusMessage.textContent = data.message;
    if (response.ok) {
      statusMessage.style.color = "green";
      form.reset();
    } else {
      statusMessage.style.color = "red";
    }
  } catch (error) {
    statusMessage.textContent = "Error sending message.";
    statusMessage.style.color = "red";
  } finally {
    // Re-enable button and restore text
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});
