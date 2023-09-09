const anchors = document.querySelectorAll('nav a');
const sections = document.querySelectorAll('section');
const params = (new URL(location.href)).searchParams;

function showSection(id: string) {
  sections.forEach((section, index) => {
    if (index > 3) return;
    if (id === '/') id += 'home';
    if (section.id === id.substring(1)) {
      section.classList.add('view');
      anchors[index].classList.add('active');
    } else {
      section.classList.remove('view');
      anchors[index].classList.remove('active');
    }

  })
}

for (const anchor of anchors) {
  anchor.addEventListener('click', _ => {
    _.preventDefault();
    /* query params to be shown :
    s => stream
    p => playlist
    t => timestamp
    q => search
    */

    const allowRoute = params.has('p') || params.has('s') ? '/' : params.has('q') ? '/search' : '';
    const url = anchor.id + (params.size && anchor.id === allowRoute ? '?' + params : '');

    history.pushState({}, '', new URL(url, location.origin));
    showSection(anchor.id);
  })
}

// load section if name found in address else load home
document.getElementById(['/upcoming', '/search', '/library'].find(_ => location.pathname === _) || '/')?.click();

// enables back button functionality
addEventListener('popstate', () => {
  showSection(location.pathname)
});
