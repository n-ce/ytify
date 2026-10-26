const SEARCH_RESULT_LIMIT = 50;

const removeDiacritics = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default (searchTerm: string, tracksMap: Collection) => {
  const toFind = removeDiacritics(searchTerm.toLowerCase());
  const results: TrackItem[] = [];
  let isTruncated = false;

  if (!toFind) {
    return { results, isTruncated };
  }

  const allItems = Object.values(tracksMap);

  for (const v of allItems) {
    if (results.length >= SEARCH_RESULT_LIMIT) {
      isTruncated = true;
      break;
    }
    if (!('title' in v && typeof v.title === 'string')) continue;
    const title = removeDiacritics(v.title.toLowerCase()).includes(toFind);
    if (!('author' in v && typeof v.author === 'string')) continue;
    const author = removeDiacritics(v.author.toLowerCase()).includes(toFind);

    if (title || author) {
      results.push(v);
    }
  }

  return { results, isTruncated };
};
