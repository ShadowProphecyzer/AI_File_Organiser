// Optional interactive feature on scroll or load
document.addEventListener("DOMContentLoaded", () => {
  const fadeEls = document.querySelectorAll('.fade-in');
  fadeEls.forEach(el => {
    el.style.opacity = 1;
    el.style.transform = "translateY(0)";
  });
});
