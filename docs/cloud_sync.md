the local library can be seen as
- the library meta (which stores version and the lastupdated timestamp for other library_content)
- the library tracks, is the full track list
- the library content, the collections, the channels, playlists, albums

for cloud sync the library meta is the main bridge between server and client

intially the entire library is sent to the server. from there on dirty track syncing is used.

this includes only what has added or removed to reduce data costs.

Proper mechanisms are used to ensure multi device sync conflicts do not occur.
