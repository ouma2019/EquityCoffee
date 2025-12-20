document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('main-nav');
  const navActions = document.querySelector('.nav-actions');
  const sidebar = document.querySelector('.sidebar');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      menuToggle.classList.toggle('active');
      
      if (mainNav) {
        mainNav.classList.toggle('active');
      }
      if (navActions) {
        navActions.classList.toggle('active');
      }
      if (sidebar) {
        sidebar.classList.toggle('open');
      }
      
      const isExpanded = menuToggle.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', isExpanded);
    });
  }
  
  document.addEventListener('click', function(e) {
    if (menuToggle && !menuToggle.contains(e.target) && 
        !mainNav?.contains(e.target) && 
        !navActions?.contains(e.target) &&
        !sidebar?.contains(e.target)) {
      menuToggle.classList.remove('active');
      if (mainNav) mainNav.classList.remove('active');
      if (navActions) navActions.classList.remove('active');
      if (sidebar) sidebar.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
  
  const navLinks = document.querySelectorAll('.nav-link, .nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (menuToggle) {
        menuToggle.classList.remove('active');
        if (mainNav) mainNav.classList.remove('active');
        if (navActions) navActions.classList.remove('active');
        if (sidebar) sidebar.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
});
