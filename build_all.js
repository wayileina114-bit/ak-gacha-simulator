// build_all.js — AK only
const fs = require('fs');

const ops = JSON.parse(fs.readFileSync('data/ops_urls.json', 'utf8'));
const banners = JSON.parse(fs.readFileSync('data/banners.json', 'utf8'));
// 联动寻访池（联动限定：活动期后不复刻，获取规则与常规限定不同）
const COLLAB_POOL_NAMES = ['进攻、防守、战术交汇','进攻、防守、战术交汇·复刻','幽境狩人','砺火成锋','砺火成锋·复刻'];
// 联动活动赠送干员（非寻访UP，通过活动任务/关卡赠送获得）
const COLLAB_GIFT_OPS = ['麒麟R夜刀','火龙S黑角'];

const opMap = {};
for (const o of ops) {
  opMap[o.name] = {
    name: o.name, rarity: o.rarity, prof: o.profZh,
    nation: o.nationId || '', tag: (o.tag || '').slice(0, 60),
    av: (o.avatar.match(/media\.prts\.wiki\/([0-9a-f]\/[0-9a-f]{2})\//) || [])[1] || '',
    art: o.art || '', artV: o.artV || 2,
    gift: COLLAB_GIFT_OPS.indexOf(o.name) >= 0,
    collabOp: collabOps.has(o.name),
  };
}

const collabOps = new Set();
for (const b of banners) {
  if (COLLAB_POOL_NAMES.indexOf(b.name) >= 0) {
    for (const s of [...b.six, ...b.five]) collabOps.add((ALIAS[s.name]) || s.name);
  }
}
const limitedSet = new Set();
for (const b of banners) for (const s of b.six) if (s.limited) limitedSet.add(s.name);
for (const b of banners) for (const s of b.five) if (s.limited) limitedSet.add(s.name);
const std6 = ops.filter(o => o.rarity === 6 && !limitedSet.has(o.name)).map(o => o.name);
const std5 = ops.filter(o => o.rarity === 5 && !limitedSet.has(o.name)).map(o => o.name);

const ALIAS = { '麒麟X夜刀': '麒麟R夜刀' };

const TYPE_LABEL = { limited: '限定寻访', event: '活动寻访', standard: '常驻标准', zhongjian: '中坚寻访', joint: '联合行动', direct: '定向甄选', zjselect: '中坚甄选', special: '特殊寻访' };
const TYPE_COLOR = { limited: '#d64a4a', event: '#4a9bd6', standard: '#7a8aa0', zhongjian: '#8a7aa0', joint: '#3dbf8f', direct: '#c9a14a', zjselect: '#8a7aa0', special: '#c96ab6' };

const outBanners = [];
let bid = 0;
for (const b of banners) {
  const fix = (n) => ALIAS[n] || n;
  const sixAll = b.six.map(s => ({ name: fix(s.name), limited: s.limited }));
  const fiveAll = b.five.map(s => ({ name: fix(s.name), limited: s.limited }));
  const f6 = sixAll.filter(s => opMap[s.name] && opMap[s.name].rarity >= 6).map(s => s.name);
  const f5 = fiveAll.filter(s => opMap[s.name] && opMap[s.name].rarity >= 5).map(s => s.name);
  const f4 = [...sixAll.filter(s => opMap[s.name] && opMap[s.name].rarity < 6).map(s => s.name),
             ...fiveAll.filter(s => opMap[s.name] && opMap[s.name].rarity < 5).map(s => s.name)];
  if (!f6.length && !f5.length && !f4.length) continue;
  const type = b.type;
  const isCollab = COLLAB_POOL_NAMES.indexOf(b.name) >= 0;
  outBanners.push({
    id: 'b' + (bid++),
    name: b.name.replace(/^【[^】]*】/, ''),
    full: b.name,
    type: type,
    collab: isCollab,
    label: isCollab ? ('🔗联动·' + (TYPE_LABEL[type] || type)) : (TYPE_LABEL[type] || type),
    color: isCollab ? '#c96ab6' : (TYPE_COLOR[type] || '#888'),
    start: (b.start || '').slice(0, 10),
    end: (b.end || '').slice(0, 10),
    year: (b.start || '').slice(0, 4) || '—',
    six: f6, five: f5, four: f4,
    limitedSix: sixAll.filter(s => s.limited && opMap[s.name] && opMap[s.name].rarity >= 6).map(s => s.name),
    rate6: f6.length >= 2 ? 35 : 50,
    spark: type === 'limited',
  });
}

const zjSet6 = new Set(), zjSet5 = new Set();
for (const b of banners) {
  if (b.type === 'zhongjian' || b.type === 'zjselect') {
    for (const s of b.six) zjSet6.add(s.name);
    for (const s of b.five) zjSet5.add(s.name);
  }
}
const zj6 = [...zjSet6].filter(n => opMap[n]);
const zj5 = [...zjSet5].filter(n => opMap[n]);
const bundle = { ops: opMap, std6: std6, std5: std5, zj6: zj6, zj5: zj5, banners: outBanners };

const part1 = fs.readFileSync('app_part1.html', 'utf8');
const part2 = fs.readFileSync('app_part2.js', 'utf8');
const json = JSON.stringify(bundle);
let html = part1 + part2;
html = html.split('__DATA__').join(json);
html = html + '</script></body></html>';
fs.writeFileSync('抽卡模拟器.html', html);
console.log('HTML written:', html.length, 'bytes');
console.log('banners:', outBanners.length, '| ops:', Object.keys(opMap).length, '| std6:', std6.length, '| std5:', std5.length, '| zj6:', zj6.length, '| zj5:', zj5.length);
