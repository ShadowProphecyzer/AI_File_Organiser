// auth.js

const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const showSignIn = document.getElementById('showSignIn');
const showSignUp = document.getElementById('showSignUp');

// Popup notification logic
function showPopup(message) {
  const popup = document.getElementById('popup-notification');
  const popupMsg = document.getElementById('popup-message');
  popupMsg.textContent = message;
  popup.classList.add('show');
}
function hidePopup() {
  document.getElementById('popup-notification').classList.remove('show');
}
document.getElementById('popup-close').addEventListener('click', hidePopup);

// Toggle forms
showSignIn.addEventListener('click', () => {
  signInForm.classList.remove('hidden');
  signUpForm.classList.add('hidden');
  console.log('⬛ [User] Switched to Sign In form');
});

showSignUp.addEventListener('click', () => {
  signUpForm.classList.remove('hidden');
  signInForm.classList.add('hidden');
  console.log('⬛ [User] Switched to Sign Up form');
});

// Sign In submit
signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('⬛ [User] Attempting to sign in');

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
  console.log('⬛ [System] Sign in response:', data);

  if (res.ok) {
    console.log('⬛ [System] Redirecting to dashboard.html');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);
  }
});

// Sign Up submit
signUpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('⬛ [User] Attempting to sign up');

  const formData = {
    name: e.target.name.value,
    email: e.target.email.value,
    password: e.target.password.value
  };

  const res = await fetch('/signup', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(formData)
  });

  const data = await res.json();
  showPopup(data.message);
  console.log('⬛ [System] Sign up response:', data);

  if (res.ok) {
    console.log('⬛ [System] Switching to sign in form after sign up');
    setTimeout(() => {
      showSignIn.click();
    }, 1200);
  }
});

// Show correct form based on URL hash
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash === '#signin-section') {
    showSignIn.click();
    document.getElementById('signin-section').scrollIntoView({ behavior: 'smooth' });
  } else if (window.location.hash === '#signup-section') {
    showSignUp.click();
    document.getElementById('signup-section').scrollIntoView({ behavior: 'smooth' });
  }
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('bg-opacity-70', 'backdrop-blur');
    } else {
      navbar.classList.remove('bg-opacity-70', 'backdrop-blur');
    }
  }
});
