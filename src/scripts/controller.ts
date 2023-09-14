//@ts-nocheck

import { getSaved } from './utils';
export default function controller() {

  // ls => data
  const collections = JSON.parse(getSaved('collections'));

  const xCollections =
    [
      {
        "name": "history",
        "streams": ["ax", "by", "cz"]
      },
      {
        "name": "favorites",
        "streams": ["sd", "es", "ee"]
      }
    ];

  const stream = [{
    "title": "heellow bideo",
    "thumbnailurl": "",
    "author": "",
    "node": ["playlist2", "favorites"]
  }]
  /*
  when node.length = 0; remove stream data from database, run this fx for every db change
  */

  // data => library
  for (const xCollection of xCollections) {
    const streams = xCollection.streams;
    const summary = streams.length + ' | ' + xCollection.name;
    for (const stream of streams) {
      const data = 
    }

  }



}
