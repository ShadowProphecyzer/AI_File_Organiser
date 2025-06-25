document.getElementById("contactForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  const statusMessage = document.getElementById("statusMessage");

  if (!name || !email || !message) {
    statusMessage.textContent = "Please fill out all fields.";
    return;
  }

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });

    const data = await response.json();
    statusMessage.textContent = data.message;
    if (response.ok) {
      document.getElementById("contactForm").reset();
      statusMessage.style.color = "green";
    } else {
      statusMessage.style.color = "red";
    }
  } catch (error) {
    statusMessage.textContent = "Error sending message.";
    statusMessage.style.color = "red";
  }
});
