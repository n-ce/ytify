export default function nav() {
  const hamBtn = document.querySelector('input');
  const nav = document.querySelector('nav');
  const navFg = document.getElementById('navFG');
  const anchors = document.querySelectorAll('a');
  let selected = 0;


  hamBtn?.addEventListener('click', () => {
    nav?.classList.toggle('show');
    navFg?.classList.toggle('active');

  })


  navFg?.addEventListener('click', () => {
    if (
      nav?.classList.contains('show')
      && hamBtn
    ) hamBtn?.click();
  });

  // Set Initial Location
  if (!location.href.includes('#'))
    location.href += '#home';

  anchors.forEach((anchor, index) => {
    anchor.addEventListener('click', e => {
      if (selected === index) return;
      anchors[selected].classList.remove('selected');
      const element = e.target as HTMLAnchorElement;
      element.classList.add('selected');
      hamBtn?.click();
      selected = index;
    })
  })
}