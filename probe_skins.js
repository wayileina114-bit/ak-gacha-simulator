// probe_skins.js — 探测 biligame 皮肤文件列表
const https = require('https');
function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, function () { req.destroy(); resolve(null); });
  });
}
(async () => {
  // 1) 陈的皮肤文件
  let u = 'https://wiki.biligame.com/arknights/api.php?action=query&list=allimages&aiprefix=' + encodeURIComponent('Pack 陈 skin') + '&ailimit=20&format=json';
  let raw = await get(u);
  if (raw) {
    const d = JSON.parse(raw);
    const names = (d.query.allimages || []).map(f => f.name);
    console.log('陈 skin 文件:', names.join(' | '));
  }
  // 2) 能天使
  u = 'https://wiki.biligame.com/arknights/api.php?action=query&list=allimages&aiprefix=' + encodeURIComponent('Pack 能天使 skin') + '&ailimit=20&format=json';
  raw = await get(u);
  if (raw) {
    const d = JSON.parse(raw);
    console.log('能天使 skin 文件:', (d.query.allimages || []).map(f => f.name).join(' | '));
  }
  // 3) JSONP callback 是否可用
  u = 'https://wiki.biligame.com/arknights/api.php?action=query&list=allimages&aiprefix=' + encodeURIComponent('Pack 陈 skin') + '&ailimit=3&format=json&callback=test123';
  raw = await get(u);
  console.log('JSONP 返回头:', raw ? raw.slice(0, 80) : 'NULL');
})();
