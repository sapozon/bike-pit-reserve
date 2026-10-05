const fs = require('fs');
const path = require('path');

function parseNum(val) {
  if (!val) return null;
  const match = val.match(/([0-9]+(\.[0-9]+)?)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function getDispCategory(dispStr) {
  const n = parseNum(dispStr);
  if (n === null || isNaN(n)) return 'その他';
  if (n <= 50) return '50ccまで';
  if (n <= 125) return '51cc～125cc';
  if (n <= 250) return '126cc～250cc';
  if (n <= 400) return '251cc～400cc';
  if (n <= 750) return '401cc～750cc';
  if (n <= 1000) return '751cc～1000cc';
  return '1001cc以上';
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  
  function parseLine(line) {
    const res = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
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

  const header = parseLine(lines[0].replace(/^\uFEFF/, ''));
  const mfgIdx = header.indexOf('manufacturer');
  const dispIdx = header.indexOf('haikiryo');
  const yearIdx = header.indexOf('year_range');
  const modelIdx = header.indexOf('model_name');
  const nameIdx = header.indexOf('bike_name');
  const scooterIdx = header.indexOf('scooter');
  const dctIdx = header.indexOf('DCT');
  const oilIdx = header.indexOf('engine_oil_change');
  const primaryIdx = header.indexOf('プライマリーオイル');
  const transIdx = header.indexOf('トランスミッションオイル');
  const filterIdx = header.indexOf('engine_filter_change');

  // Harley specific filter columns
  const filterSetBlackIdx = header.indexOf('フィルターセット黒');
  const filterSetSilverIdx = header.indexOf('フィルターセット銀');
  const filterHdBlackIdx = header.indexOf('ハーレー純正エンジンオイルフィルター黒');
  const filterHdSilverIdx = header.indexOf('ハーレー純正エンジンオイルフィルター銀');
  const filterAfterBlackIdx = header.indexOf('社外品エンジンオイルフィルター黒');
  const filterAfterSilverIdx = header.indexOf('社外品エンジンオイルフィルター銀');
  const filterSundanceBlackIdx = header.indexOf('サンダンスオリジナルエンジンオイルフィルター黒');

  const frontTireIdx = header.indexOf('front_tire');
  const rearTireIdx = header.indexOf('rear_tire');
  const imgIdx = header.indexOf('画像ファイル');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (!cols || cols.length <= nameIdx) continue;
    const name = cols[nameIdx];
    if (!name) continue;

    const rawDisp = cols[dispIdx] || '';
    const cat = getDispCategory(rawDisp);

    // Harley filter choices builder
    const harleyFilters = {};
    if (filterHdBlackIdx !== -1 && cols[filterHdBlackIdx]) harleyFilters.hdBlack = cols[filterHdBlackIdx];
    if (filterHdSilverIdx !== -1 && cols[filterHdSilverIdx]) harleyFilters.hdSilver = cols[filterHdSilverIdx];
    if (filterAfterBlackIdx !== -1 && cols[filterAfterBlackIdx]) harleyFilters.afterBlack = cols[filterAfterBlackIdx];
    if (filterAfterSilverIdx !== -1 && cols[filterAfterSilverIdx]) harleyFilters.afterSilver = cols[filterAfterSilverIdx];
    if (filterSundanceBlackIdx !== -1 && cols[filterSundanceBlackIdx]) harleyFilters.sundanceBlack = cols[filterSundanceBlackIdx];

    const harleyFilterSets = {};
    if (filterSetBlackIdx !== -1 && cols[filterSetBlackIdx]) harleyFilterSets.setBlack = cols[filterSetBlackIdx];
    if (filterSetSilverIdx !== -1 && cols[filterSetSilverIdx]) harleyFilterSets.setSilver = cols[filterSetSilverIdx];

    rows.push({
      m: cols[mfgIdx] || '',
      d: rawDisp,
      cat: cat,
      y: cols[yearIdx] || '',
      mo: cols[modelIdx] || '',
      n: name,
      scooter: scooterIdx !== -1 ? (cols[scooterIdx] || '') : '',
      dct: dctIdx !== -1 ? (cols[dctIdx] || '') : '',
      oil: cols[oilIdx] || '',
      primaryOil: primaryIdx !== -1 ? (cols[primaryIdx] || '') : '',
      transOil: transIdx !== -1 ? (cols[transIdx] || '') : '',
      fil: filterIdx !== -1 ? (cols[filterIdx] || '') : '',
      hFilters: Object.keys(harleyFilters).length > 0 ? harleyFilters : null,
      hFilterSets: Object.keys(harleyFilterSets).length > 0 ? harleyFilterSets : null,
      ft: frontTireIdx !== -1 ? (cols[frontTireIdx] || '') : '',
      rt: rearTireIdx !== -1 ? (cols[rearTireIdx] || '') : '',
      img: cols[imgIdx] || ''
    });
  }
  return rows;
}

const dirs = ['HONDA', 'Kawasaki', 'BMW', 'Harley-Davidson'];
const all = [];

dirs.forEach(mfg => {
  const p = path.join(__dirname, 'data', mfg, `${mfg}.csv`);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf-8');
  const parsed = parseCSV(content);
  parsed.forEach(item => {
    if (!item.m) item.m = mfg;
    if (item.img) {
      item.img = `data/${mfg}/bike_images/${item.img}`;
    }
    all.push(item);
  });
});

console.log('Parsed bikes count:', all.length);
fs.writeFileSync(path.join(__dirname, 'bikes_data.json'), JSON.stringify(all));
fs.writeFileSync(path.join(__dirname, 'bikes_data.js'), 'window.BIKES_DATABASE = ' + JSON.stringify(all) + ';');
console.log('Saved bikes_data.json and bikes_data.js successfully!');
