window.AlgNoteNormalize = (() => {
function normalizeDataset(entries) {
  const algset = entries["algset.json"];
  const groups = entries["groups.json"].groups || [];
  const cases = entries["cases.json"].cases || [];
  const svgs = entries["svgs.json"].svgs || {};

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const normalizedCases = cases.map((item) => ({
    ...item,
    groupName: groupById.get(item.group)?.name || item.group,
    svg: svgs[item.svgId || item.id] || "",
    algorithms: item.algorithms || [],
    scrambles: item.scrambles || [],
    tags: item.tags || {},
  }));

  return {
    schemaVersion: algset.schemaVersion,
    puzzle: algset.puzzle,
    algset: algset.id,
    name: algset.name,
    notes: algset.notes || [],
    groups,
    cases: normalizedCases,
  };
}


return {
  normalizeDataset,
};
})();
