const fs = require('fs');
const s = JSON.parse(fs.readFileSync('dist/stats.json', 'utf8'));

const modules = [];

for (const [partUid, part] of Object.entries(s.nodeParts)) {
  const meta = s.nodeMetas[part.metaUid];
  if (meta) {
    modules.push({
      id: meta.id,
      renderedLength: part.renderedLength,
      gzipLength: part.gzipLength
    });
  }
}

// Consolidate parts by ID
const modMap = {};
for (const mod of modules) {
  if (!modMap[mod.id]) {
    modMap[mod.id] = { id: mod.id, renderedLength: 0 };
  }
  modMap[mod.id].renderedLength += mod.renderedLength;
}

const list = Object.values(modMap);
list.sort((a,b) => b.renderedLength - a.renderedLength);

console.log("TOP 15 MODULES BY SIZE:");
console.log(list.slice(0, 15).map(l => {
  return `${(l.renderedLength / 1024).toFixed(2)} KB - ${l.id}`;
}).join('\n'));
