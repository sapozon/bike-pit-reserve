const fs = require('fs');

function parseLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim());
  return res;
}

const lines = fs.readFileSync('data/Harley-Davidson/Harley-Davidson.csv', 'utf-8').split(/\r?\n/).filter(Boolean);
const h = parseLine(lines[0].replace(/^\uFEFF/, ''));

const allFilters = new Set();
const allSets = new Set();

for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  ['ハーレー純正エンジンオイルフィルター黒', 'ハーレー純正エンジンオイルフィルター銀', '社外品エンジンオイルフィルター黒', '社外品エンジンオイルフィルター銀', 'サンダンスオリジナルエンジンオイルフィルター黒'].forEach(col => {
    const idx = h.indexOf(col);
    if (idx !== -1 && row[idx]) allFilters.add(col + ': ' + row[idx]);
  });
  ['フィルターセット黒', 'フィルターセット銀'].forEach(col => {
    const idx = h.indexOf(col);
    if (idx !== -1 && row[idx]) allSets.add(col + ': ' + row[idx]);
  });
}

console.log('Single Filter varieties:', Array.from(allFilters));
console.log('Filter Set varieties:', Array.from(allSets));
