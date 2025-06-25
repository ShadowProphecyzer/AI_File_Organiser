// Smooth fade-in animation trigger (optional)
document.addEventListener('DOMContentLoaded', () => {
  const aboutSection = document.querySelector('.about-section');
  if (aboutSection) {
    aboutSection.style.opacity = '1';
    aboutSection.style.transform = 'translateY(0)';
  }
});
