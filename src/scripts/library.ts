/*
const openDb = indexedDB.open('library', 1);

//upgrade event

openDb.onupgradeneeded = (e) => {
  const db = e.target as IDBOpenDBRequest;
  console.log("upgrade needed", db.result);
}

//on success

openDb.onsuccess = (e) => {
  const db = e.target as IDBOpenDBRequest;
  console.log("success is called", db.result);

  // Create the history object store

  const historyStore = db.result.createObjectStore(
    'history', { keyPath: 'id' }
  );
  console.log(historyStore);
  console.log(db.result.objectStoreNames)
}

openDb.onerror = (e) => {
  console.log('error : ', e)
}

// deletion procedure 
function deleteDB() {
  const deletion_request = indexedDB.deleteDatabase('library')
  deletion_request.onerror = _ => console.log('Error : ', _);
  deletion_request.onsuccess = _ => console.log('Success : ', _);
}


// to view existing dbs in eruda
indexedDB.databases().then(_ => _.forEach($ => console.log($)))

*/