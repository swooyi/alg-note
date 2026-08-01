const REQUIRED_FILES = ["algset.json", "groups.json", "cases.json", "svgs.json"];


window.AlgNoteLoader = (() => {
async function readJsonFile(file) {
  return JSON.parse(await file.text());
}


async function readHandleJson(directoryHandle, fileName) {
  const fileHandle = await directoryHandle.getFileHandle(fileName);
  return readJsonFile(await fileHandle.getFile());
}


async function loadFromDirectory() {
  if (!window.showDirectoryPicker) {
    throw new Error("이 브라우저는 폴더 선택을 지원하지 않습니다. JSON 선택을 사용하세요.");
  }

  const directoryHandle = await window.showDirectoryPicker();
  const entries = {};
  for (const fileName of REQUIRED_FILES) {
    entries[fileName] = await readHandleJson(directoryHandle, fileName);
  }
  return entries;
}


async function loadFromFiles(fileList) {
  const files = [...fileList];
  const entries = {};

  for (const fileName of REQUIRED_FILES) {
    const file = files.find((candidate) => candidate.name === fileName);
    if (!file) {
      throw new Error(`${fileName} 파일이 필요합니다.`);
    }
    entries[fileName] = await readJsonFile(file);
  }

  return entries;
}


return {
  loadFromDirectory,
  loadFromFiles,
};
})();
