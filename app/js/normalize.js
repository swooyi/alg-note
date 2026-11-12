window.AlgNoteNormalize = (() => {
// TCP shares the original case objects and SVGs; it has its own learning state.
const bundled = window.AlgNoteBundledData;
if (bundled?.["1l3t"]) {
  const source = bundled["1l3t"];
  const groups = source["groups.json"].groups.filter((group) => ["t-even", "t-odd"].includes(group.id));
  const groupIds = new Set(groups.map((group) => group.id));
  bundled.tcp = {
    "algset.json": { ...source["algset.json"], id: "tcp", name: "TCP", sourceAlgset: "1l3t" },
    "groups.json": { ...source["groups.json"], algset: "tcp", groups },
    "cases.json": { ...source["cases.json"], algset: "tcp", cases: source["cases.json"].cases.filter((item) => groupIds.has(item.group)) },
    "svgs.json": source["svgs.json"],
  };
}

function normalizeDataset(entries) {
  const algset = entries["algset.json"];
  const groups = entries["groups.json"].groups || [];
  const cases = entries["cases.json"].cases || [];
  const svgs = entries["svgs.json"].svgs || {};

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const normalizedCases = cases.map((item) => ({
    ...item,
    groupName: groupById.get(item.group)?.name || item.group,
    svg: item.imageState?.svg || svgs[item.svgId || item.id] || "",
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
