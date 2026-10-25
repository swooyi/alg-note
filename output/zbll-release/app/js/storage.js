window.AlgNoteStorage = (() => {
const PREFIX = "algNote.";


function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}


function saveJson(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}


function datasetKey(dataset) {
  return `${dataset.puzzle}:${dataset.algset}`;
}


return {
  datasetKey,
  loadJson,
  saveJson,
};
})();
