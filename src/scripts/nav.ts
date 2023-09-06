export default function nav() {
  const radio = document.querySelectorAll('nav input[type="radio"]');
  const sections = document.querySelectorAll('section');

  radio.forEach((input, idxR) => {
    input.addEventListener('click', () => {

      history.pushState({}, '', location.origin + input.id)
      sections.forEach((section, idxS) => {
        idxR === idxS ?
          section.classList.add('view') :
          section.classList.remove('view');
      })
    })
  })

  const routes = ['/upcoming', '/search', '/library'];


  const route = routes.find(e => location.pathname === e) || '/home';

  document.getElementById(route)?.click();
}