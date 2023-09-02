export default function nav() {
  const radio = document.querySelectorAll('nav input[type="radio"]');
  const sections = document.querySelectorAll('section');

  radio.forEach((input, idxR) => {
    input.addEventListener('click', () => {
      sections.forEach((section, idxS) => {
        idxR === idxS ?
          section.classList.add('view') :
          section.classList.remove('view');
      })
    })
  })
  document.getElementById('-home')?.click();
}