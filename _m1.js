const fs=require('fs');
const mats=JSON.parse(fs.readFileSync('data/mat_bili.json','utf8'));
const names=Object.keys(mats);
console.log('材料数='+names.length);
console.log('前30: '+names.slice(0,30).join(' | '));
console.log('样例: '+JSON.stringify(mats['至纯源石']).slice(0,300));
