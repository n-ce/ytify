export default function nav() {
  const anchors = document.querySelectorAll('a');
  let selected = 0;


  // Set Initial Location
  if (!location.href.includes('#'))
    location.href += '#home';

  anchors.forEach((anchor, index) => {
    anchor.addEventListener('click', e => {
      if (selected === index) return;
      anchors[selected].classList.remove('selected');
      const element = e.target as HTMLAnchorElement;
      element.classList.add('selected');
      selected = index;
    })
  })
}