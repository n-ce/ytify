The library albums are designed to take less data space and encourage offline use.
It is stored in the localstorage key : 'library_albums'

```typescript

  type Album = {
    name: string, // name of album
    artist: string, // artist name
    thumbnail: string, // thumbnail id
    tracks: string[] // track id array
  };

  // the id of the album is used to index it, this id usually starts with OLAK5uy... this is the actual  youtube music album id.

  type LibraryAlbums = { [id: string]: Album };
  
```

the album id has no other purpose other than indexing, once the album is in the local library, we stop fetching the album data using the id from yt music, and use our locally stored list

the `tracks[]` is a reference id array to the library tracksmap, which is the complete library collection consisting of indexed CollectionItems.

only the stored tracks from the album will have an albumId property to them in the tracksmap

procedure:

- network loads album
- liststore gets all the required data
- user clicks on `save to library` or unsaving, (the button state is dependent on whether that liststore id is in library albums or not)
- saving to library is handled by the same subscription handler as channels or playlists internally
- but is functionally different due to different data type than channels/playlists
- the required properties to save the album are taken from liststore, and library utils are utilized to store the tracks to tracksmap and saving to library_albums
- unsaving means first extracting the tracks array then removal of the data from the library_albums, using the tracks array removing the tracks from the tracksmap utilizing existing library utility
- the library utilities should have control flows specifically designed to handle tracks removal that are referenced by albums
