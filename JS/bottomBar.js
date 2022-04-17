const topBtn = document.querySelectorAll('#configs a');

// info

topBtn[0].addEventListener('click', function() {
  if (confirm("The About Page will open a page in a new tab. Continue?")) {
    window.open("https://github.com/n-ce/ytify#about");
  }
});

// Delete data

topBtn[1].addEventListener('click', function() {
  localStorage.clear();
  location.reload();
});

// Toggle Input Bar

topBtn[2].addEventListener('click', function() {
  document.querySelector('input').classList.toggle('hidden');
});

// Toggle Themes

topBtn[3].addEventListener('click', function() {
  document.querySelector('#themes').classList.toggle('hidden');
});
