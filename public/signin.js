// signin.js

const signInForm = document.getElementById('signInForm');

function showPopup(message) {
  let popup = document.getElementById('popup-notification');
  let popupMsg = document.getElementById('popup-message');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'popup-notification';
    popup.className = 'popup-notification';
    popup.innerHTML = '<span id="popup-message"></span><button class="popup-close" id="popup-close">Close</button>';
    document.body.appendChild(popup);
    document.getElementById('popup-close').addEventListener('click', hidePopup);
    popupMsg = document.getElementById('popup-message');
  }
  popupMsg.textContent = message;
  popup.classList.add('show');
}
function hidePopup() {
  const popup = document.getElementById('popup-notification');
  if (popup) popup.classList.remove('show');
}
if (document.getElementById('popup-close')) {
  document.getElementById('popup-close').addEventListener('click', hidePopup);
}

signInForm.addEventListener('submit', async (e) => {
  console.log('[signin.js] Sign in form submitted');
  e.preventDefault();
  const formData = {
    email: e.target.email.value,
    password: e.target.password.value
  };
  const res = await fetch('/signin', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(formData)
  });
  const data = await res.json();
  showPopup(data.message);
  if (res.ok) {
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);
  }
});

window.addEventListener('scroll', () => {
  console.log('[signin.js] Scroll event');
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('bg-opacity-70', 'backdrop-blur');
    } else {
      navbar.classList.remove('bg-opacity-70', 'backdrop-blur');
    }
  }
}); 