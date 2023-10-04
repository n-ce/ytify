/*

const openDb = indexedDB.open('library', 1);

let db: IDBDatabase;

//upgrade event

openDb.onupgradeneeded = () => {
  db = openDb.result;
  console.log("upgrade needed", db);
}

//on success

openDb.onsuccess = () => {

  console.log("success is called", db);

  // Create the history object store

  const historyStore = db.createObjectStore(
    'history', { keyPath: 'id' }
  );

  console.log(db.objectStoreNames)
}

openDb.onerror = () => {
  console.log('error : ', openDb.result)
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