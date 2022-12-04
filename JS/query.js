// new func : query catcher
    const query = (new URL(location.href)).searchParams.get('q');
    if (query != null) console.log(query);

    let c = 0;
    const nextUrl = `http://localhost:7700/?q=`;

    // url changer
    document
      .querySelector('#playButton')
      .addEventListener('click',
        () => {
          history.pushState('', '', nextUrl + c);
          history.replaceState('', '', nextUrl + c);
          c++;
        });