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

const bikes = [];
for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  const bikeName = row[h.indexOf('bike_name')];
  bikes.push({
    bikeName,
    year: row[h.indexOf('year_range')],
    model: row[h.indexOf('model_name')],
    engineOil: row[h.indexOf('engine_oil_change')],
    primaryOil: row[h.indexOf('プライマリーオイル')],
    transOil: row[h.indexOf('トランスミッションオイル')],
    filterSetBlack: row[h.indexOf('フィルターセット黒')],
    filterSetSilver: row[h.indexOf('フィルターセット銀')],
    filterHdBlack: row[h.indexOf('ハーレー純正エンジンオイルフィルター黒')],
    filterHdSilver: row[h.indexOf('ハーレー純正エンジンオイルフィルター銀')],
    filterAfterBlack: row[h.indexOf('社外品エンジンオイルフィルター黒')],
    filterAfterSilver: row[h.indexOf('社外品エンジンオイルフィルター銀')],
    filterSundanceBlack: row[h.indexOf('サンダンスオリジナルエンジンオイルフィルター黒')]
  });
}

console.log('Sample 1 (Sportster):', bikes[0]);
const nonSportster = bikes.find(b => !b.bikeName.includes('Sportster') && !b.bikeName.includes('スポーツスター'));
console.log('Sample 2 (Non-Sportster):', nonSportster);
