window.AlgNoteImageStore = (() => {
  const DATABASE = "alg-note-images";
  const STORE = "overrides";

  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("dataset", "dataset");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function run(mode, action) {
    const database = await open();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        const request = action(transaction.objectStore(STORE));
        let result;
        request.onsuccess = () => { result = request.result; };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }

  const key = (dataset, caseId) => JSON.stringify([dataset, caseId]);
  const list = (dataset) => run("readonly", (store) => dataset === undefined ? store.getAll() : store.index("dataset").getAll(dataset));
  const save = (dataset, caseId, svg, imageState) => {
    const settings = { ...imageState };
    delete settings.svg;
    return run("readwrite", (store) => store.put({
      key: key(dataset, caseId), dataset, caseId, svg,
      imageState: Object.keys(settings).length ? settings : undefined,
    }));
  };
  const remove = (dataset, caseId) => run("readwrite", (store) => store.delete(key(dataset, caseId)));

  return { list, save, remove };
})();
