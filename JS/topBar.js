const topBtn = document.querySelectorAll('a');

// Delete data

topBtn[1].addEventListener('click',function(){
  localStorage.clear();
  location.reload();
});

// Toggle Input Bar

topBtn[2].addEventListener('click',function(){
  document.querySelector('input').classList.toggle('hidden');
});

// Toggle Themes

topBtn[3].addEventListener('click',function(){
  document.querySelector('#themes').classList.toggle('hidden');
});

