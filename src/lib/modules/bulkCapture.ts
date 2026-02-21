import { convertSStoHHMMSS, addToCollection } from "@utils";
import { setStore } from "@stores";

export default function(ids: string[]): Promise<void> {
  setStore('snackbar', 'Processing pasted links...'); // Notify user of process start
  const collectionItems: TrackItem[] = [];

  const processId = async (id: string): Promise<void> => {
    const { default: getStreamData } = await import("./getStreamData");
    return getStreamData(id)
      .then(streamData => {
        if ("error" in streamData) {
          console.error(`Error fetching stream data for ID ${id}: ${streamData.message}`);
          return; // Don't add to collectionItems if there's an error
        }

        collectionItems.push({
          id: id,
          title: streamData.title,
          author: streamData.author,
          authorId: streamData.authorId,
          duration: convertSStoHHMMSS(streamData.lengthSeconds),
        });
      })
      .catch(error => {
        console.error(`Failed to process stream ID ${id}:`, error);
      });
  };

  return Promise.all(ids.map(processId))
    .then(() => {
      if (collectionItems.length > 0) {
        const collectionName = window.prompt('Enter collection name:', 'Pasted Streams') || 'Pasted Streams';
        addToCollection(collectionName, collectionItems);
        setStore('snackbar', `Added ${collectionItems.length} items to ${collectionName}`);
      } else {
        setStore('snackbar', 'No valid items to add to collection.');
      }
    });
}
