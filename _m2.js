const fs=require('fs');
const html=fs.readFileSync('抽卡模拟器.html','utf8');
const i=html.indexOf('干员轮换卡池192');
console.log('轮换192位置: '+i);
if(i>=0) console.log('上下文: '+html.slice(Math.max(0,i-100), i+150));
