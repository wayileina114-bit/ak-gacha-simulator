// fix_parser3.js — 解析全部卡池（前瞻式行合并）
const fs = require('fs');
function getPage(file) {
  const y = JSON.parse(fs.readFileSync('data/' + file + '.json', 'utf8'));
  const p = y.query.pages;
  const k = Object.keys(p)[0];
  return p[k].revisions?.[0]?.slots?.main?.['*'] || '';
}
function classifyType(name) {
  if (name.includes('限定寻访')) return 'limited';
  if (name.includes('联合行动')) return 'joint';
  if (name.includes('定向甄选')) return 'direct';
  if (name.includes('中坚甄选')) return 'zjselect';
  if (name.includes('跨年欢庆') && name.includes('中坚')) return 'zhongjian';
  if (name.includes('跨年欢庆')) return 'special';
  if (name.includes('中坚')) return 'zhongjian';
  return 'event';
}
function extractRows(wikitext) {
  const lines = wikitext.split(String.fromCharCode(10));
  const merged = [];
  let buf = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf('|-') === 0) {
      let next = '';
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== '') { next = lines[j]; break; }
      }
      const isRowStart = /^\|\[\[文件:/.test(next) || /^\|\d+$/.test(next) || /^\|style=/.test(next);
      if (isRowStart) { merged.push(buf); buf = []; }
    }
    buf.push(line);
  }
  if (buf.length) merged.push(buf);
  return merged.map(r => r.join(String.fromCharCode(10))).filter(r => r.indexOf('干员头像') >= 0);
}
function parseRow(row) {
  let name = '';
  const links = [...row.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
  for (const l of links) {
    if (l.startsWith('文件:')) continue;
    const parts = l.split('|');
    name = parts[parts.length - 1];
  }
  if (!name) {
    const m = row.match(/link=([^\]|]+)/);
    if (m) name = m[1].split('/').pop();
  }
  const dm = row.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2})~\s*<br\/>\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  const start = dm ? dm[1] : '';
  const end = dm ? dm[2] : '';
  const lines = row.split(String.fromCharCode(10));
  let section = null;
  const six = [], five = [];
  for (const line of lines) {
    if (line.indexOf('|{{干员头像|') === 0) {
      if (section === null) section = 'six';
      else if (section === 'six') section = 'five';
    }
    if (/可甄选[^|]{0,8}6[星★]/.test(line)) section = 'six';
    else if (/可甄选[^|]{0,8}5[星★]/.test(line)) section = 'five';
    else if (/寻访池内只有[^|]{0,4}5[星★]/.test(line)) section = 'five';
    else if (/寻访池内只有[^|]{0,4}6[星★]/.test(line)) section = 'six';
    const matches = line.match(/\{\{干员头像\|([^|}]+)(?:\|([^}]*))?\}\}/g);
    if (matches && section) {
      for (const x of matches) {
        const mm = x.match(/\{\{干员头像\|([^|}]+)(?:\|([^}]*))?\}\}/);
        const o = { name: mm[1], limited: /limited=1/.test(mm[2] || '') };
        if (section === 'six') six.push(o); else five.push(o);
      }
    }
  }
  return { name, start, end, six, five };
}
const all = [];
for (const r of extractRows(getPage('prts_limited'))) {
  const b = parseRow(r);
  if (!b.name || (!b.six.length && !b.five.length)) continue;
  all.push({ ...b, type: classifyType(b.name) });
}
for (const y of [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
  for (const r of extractRows(getPage('std_' + y))) {
    const b = parseRow(r);
    if (!b.name || (!b.six.length && !b.five.length)) continue;
    all.push({ ...b, type: 'standard' });
  }
}
for (const y of [2023, 2024, 2025, 2026]) {
  for (const r of extractRows(getPage('zj_' + y))) {
    const b = parseRow(r);
    if (!b.name || (!b.six.length && !b.five.length)) continue;
    const t = classifyType(b.name);
    all.push({ ...b, type: t === 'event' ? 'zhongjian' : t });
  }
}
const seen = new Set();
const uniq = [];
for (const b of all) {
  const key = b.name + '|' + b.start;
  if (seen.has(key)) continue;
  seen.add(key);
  uniq.push(b);
}
uniq.sort((a, b) => (b.start || '').localeCompare(a.start || ''));
fs.writeFileSync('data/banners.json', JSON.stringify(uniq));
const byType = {};
for (const b of uniq) byType[b.type] = (byType[b.type] || 0) + 1;
console.log('total:', uniq.length, '| byType:', JSON.stringify(byType));
console.log('newest:', uniq.slice(0, 3).map(b => b.start + ' ' + b.name).join(' | '));
