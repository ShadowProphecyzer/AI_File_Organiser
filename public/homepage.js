// homepage.js

// Navbar background change on scroll
window.addEventListener('scroll', () => {
  console.log('[homepage.js] Scroll event triggered');
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('bg-opacity-70', 'backdrop-blur');
  } else {
    navbar.classList.remove('bg-opacity-70', 'backdrop-blur');
  }
});

document.addEventListener('DOMContentLoaded', function() {
  console.log('[homepage.js] DOMContentLoaded');
});
