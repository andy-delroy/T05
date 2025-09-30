(function(){
  // Highlight active nav item based on file name
  const path = location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html': 'home',
    'televisions.html': 'televisions',
    'about.html': 'about'
  };
  const current = map[path] || 'home';
  document.querySelectorAll('.nav-link').forEach(a => {
    const isActive = a.dataset.page === current;
    a.classList.toggle('active', isActive);
    if(isActive) a.setAttribute('aria-current', 'page');
  });

  // Year in footer
  const y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();
})();
