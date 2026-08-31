'use strict';
var DATA = __DATA__;
(function(){
  try{
    if(typeof window!=='undefined'&&window.addEventListener){
      window.addEventListener('error', function(e){
        if(e&&e.target&&e.target.tagName==='IMG')return;
        try{ console.error('程序错误:', e.message||e); }catch(err){}
      }, true);
      window.addEventListener('unhandledrejection', function(e){ try{ console.error('未处理异常:', e.reason); }catch(err){} });
    }
  }catch(err){}
})();
var R6=0.02,R5=0.08,R4=0.50;
var SPEED=160;
var BUSY=false;
var lastBatch=[];
var lastPullN=10;
var sessPulls=0;
var FORTUNES=['罗德岛今日运势：大吉，宜抽卡','博士，稳住心态，保底总会来的','今日出货率 +1%（心理作用加成）','非酋之光保佑你','好运正在路上，再抽亿发','罗德岛随时欢迎你回家','听说凌晨3点玄学出货率高','你的第六感在发光，抽吧'];
var FORTUNE_DETAILS=['今天适合十连：据罗德岛统计，十连出5★以上的概率更高（其实都一样，开心就好）','玄学提示：先单抽垫2发再十连，据说能提高出货率（信则有）','今日宜抽卡：博士的运势曲线正处于上升期，抓住机会','避坑提醒：抽卡前先去基建收个菜，转换一下运气','占卜结果：你与六星干员的缘分正在接近，保持耐心','幸运色：金色。建议把界面调成金色主题再抽','今日不宜：凌晨抽卡。早点睡，明天保底见','神秘信号：抽卡前心里默念想要的名字，会有奇效'];
function setFortune(){
  var f=$('fortune'); if(!f)return;
  var d=new Date();
  var seed=(d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()) + (state.history.length*7) + (state.collection.length*13) + (state.cur||'').length;
  var idx=Math.abs(seed)%FORTUNES.length;
  f.textContent=FORTUNES[idx];
  f.style.cursor='pointer';
  f.title='点击查看今日运势详解';
  f.onclick=function(){ openFortune(idx); };
}
function openFortune(idx){
  var h=['<h4 class="sect" style="margin-top:0">🍀 今日运势</h4>'];
  h.push('<div class="notice" style="font-size:15px; line-height:2">'+esc(FORTUNES[idx])+'</div>');
  h.push('<div class="notice" style="color:var(--gold)">'+esc(FORTUNE_DETAILS[idx]||FORTUNE_DETAILS[0])+'</div>');
  h.push('<div class="notice">玄学仅供参考，出货率与运势无关 😄</div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
}
var opByName={}, ops4=[], ops3=[], opBanners={}, limitedOps={}, limitedTotal=0;
(function(){
  var k,o;
  for(k in DATA.ops){
    o=DATA.ops[k]; opByName[k]=o;
    if(o.rarity===4)ops4.push(k);
    else if(o.rarity===3)ops3.push(k);
  }
  for(bi=0;bi<DATA.banners.length;bi++){
    var lb2=DATA.banners[bi];
    for(bj=0;bj<(lb2.limitedSix||[]).length;bj++){ limitedOps[lb2.limitedSix[bj]]=1; }
    for(bj=0;bj<(lb2.lim5||[]).length;bj++){ limitedOps[lb2.lim5[bj]]=1; }
  }
  limitedTotal=Object.keys(limitedOps).length;
  var bi,bj;
  for(bi=0;bi<DATA.banners.length;bi++){
    var bb=DATA.banners[bi];
    var names=bb.six.concat(bb.five);
    for(bj=0;bj<names.length;bj++){
      var nm=names[bj];
      if(!opByName[nm])continue;
      if(!opBanners[nm])opBanners[nm]=[];
      if(opBanners[nm].length<8&&opBanners[nm].filter(function(x){return x.full===bb.full;}).length===0)opBanners[nm].push({full:bb.full,id:bb.id});
    }
  }
})();
var LS_KEY='akgacha_v2';
var LS_OLD='akgacha_v1';
function defaultState(){ return { cur:null, jade:60000, theme:'default', pity:{}, spark:{}, sel:{}, cnt:{}, opCnt:{}, fav:{}, favOps:{}, wish:[], history:[], collection:[], sparkEx:0, claimed:{} }; }
function normalizeState(s){
  if(!s||typeof s!=='object')return defaultState();
  if(typeof s.jade!=='number')s.jade=60000;
  if(!s.pity||typeof s.pity!=='object')s.pity={};
  if(!s.spark||typeof s.spark!=='object')s.spark={};
  if(!s.sel||typeof s.sel!=='object')s.sel={};
  if(!s.cnt||typeof s.cnt!=='object')s.cnt={};
  if(!s.fav||typeof s.fav!=='object')s.fav={};
  if(!s.favOps||typeof s.favOps!=='object')s.favOps={};
  if(!s.opCnt||typeof s.opCnt!=='object'){
    s.opCnt={};
    for(var hi=0;hi<s.history.length;hi++){ var he=s.history[hi]; if(he&&he.op)s.opCnt[he.op]=(s.opCnt[he.op]||0)+1; }
  }
  if(!Array.isArray(s.history))s.history=[];
  if(!Array.isArray(s.collection))s.collection=[];
  if(!Array.isArray(s.wish))s.wish=[];
  if(typeof s.sparkEx!=='number')s.sparkEx=0;
  if(!s.claimed||typeof s.claimed!=='object')s.claimed={};
  if(!s.theme)s.theme='default';
  var sk2;
  for(sk2 in s.sel){ var sv=s.sel[sk2]; if(!sv||typeof sv!=='object'){ delete s.sel[sk2]; continue; } if(!Array.isArray(sv.six))sv.six=[]; if(!Array.isArray(sv.five))sv.five=[]; }
  return s;
}
function loadState(){
  try{
    var s=JSON.parse(localStorage.getItem(LS_KEY));
    if(s&&typeof s==='object'&&s.jade!=null)return normalizeState(s);
  }catch(e){}
  try{
    var old=JSON.parse(localStorage.getItem(LS_OLD));
    if(old&&typeof old==='object'&&old.jade!=null){
      var ns=defaultState();
      ns.jade=old.jade;
      ns.collection=(old.collection&&old.collection.ak)||[];
      ns.history=(old.history||[]).filter(function(h){return h.game==='ak';}).map(function(h){return {op:h.op,rar:h.rar,t:h.t};});
      return ns;
    }
  }catch(e){}
  return defaultState();
}
var state=loadState();
var STATE_VER=0;
var BATCH_SAVE=false;
function save(){ STATE_VER++; try{ localStorage.setItem(LS_KEY,JSON.stringify(state)); }catch(e){}
  try{
    var bkt=localStorage.getItem('akgacha_backup_t');
    if(!bkt||Date.now()-parseInt(bkt,10)>86400000){ localStorage.setItem('akgacha_backup_t',String(Date.now())); localStorage.setItem('akgacha_backup',JSON.stringify(state)); }
  }catch(e){}
}
function $(id){ return document.getElementById(id); }
function wire(id,fn){ var el=$(id); if(el&&fn)el.onclick=fn; }
function uniq(a){ var m={},r=[],i; for(i=0;i<a.length;i++){ if(!m[a[i]]){m[a[i]]=1;r.push(a[i]);} } return r; }
function rnd(a){ return a[Math.floor(Math.random()*a.length)]; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function stars(n){ var s=''; for(var i=0;i<n;i++)s+='★'; return s; }
var BID_INDEX={}, BFULL_INDEX={}, INDEXED=false;
function buildBannerIndex(){ if(INDEXED)return; var bs=DATA.banners,i; for(i=0;i<bs.length;i++){ BID_INDEX[bs[i].id]=bs[i]; BFULL_INDEX[bs[i].full]=bs[i]; } INDEXED=true; }
function bannerById(id){ buildBannerIndex(); return BID_INDEX[id]||DATA.banners[0]; }
function bannerByFull(full){ buildBannerIndex(); return BFULL_INDEX[full]||null; }
function opOf(name){ return opByName[name]; }
function thumbOf(art,name,variant,w){
  var m=art?art.match(/images\/arknights\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/):null;
  if(!m)return '';
  var fn='Pack '+name+' '+variant;
  return 'https://patchwiki.biligame.com/images/arknights/thumb/'+m[1]+'/'+m[2]+'/'+m[3]+'/'+w+'px-'+encodeURIComponent(fn.split(' ').join('_'));
}
var AV_CACHE={};
function avUrl(o){ if(!o)return ''; if(AV_CACHE[o.name]!==undefined)return AV_CACHE[o.name]; return AV_CACHE[o.name]=o.av?('https://media.prts.wiki/'+o.av+'/'+encodeURIComponent('头像_'+o.name+'.png')):(o.art||''); }
var ART_CACHE={};
function opArtT(o){ if(!o)return ''; var k=o.name+':'+(o.artV||2); if(ART_CACHE[k])return ART_CACHE[k]; return ART_CACHE[k]=thumbOf(o.art,o.name,'skin 0 '+(o.artV||2)+'.png',480)||o.art||avUrl(o); }
function pityKey(b){ if(isSelect(b))return b.id+':'+selKey(b); return b.type==='standard'?'std':(b.type==='zhongjian'?'zj':b.id); }
function calcPity(fails,n){
  var pNo=1, exp=0, i, p;
  for(i=1;i<=n;i++){
    p=Math.min(1, 0.02+Math.max(0, fails+i-1-49)*0.02);
    pNo*=(1-p);
    exp+=p;
  }
  return { prob:(1-pNo)*100, exp: exp };
}
var SOUND=true;
(function(){ try{ var ps=localStorage.getItem('akgacha_snd'); if(ps==='0')SOUND=false; }catch(e){} })();
var AC=(typeof window!=='undefined')&&(window.AudioContext||window.webkitAudioContext);
var audioCtx=null;
function playTone(freq,dur,type,vol){
  if(!SOUND||!AC)return;
  try{
    if(!audioCtx)audioCtx=new AC();
    var o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+dur);
    o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}
function playLimResult(){
  playTone(587,.12,'sine',.12); setTimeout(function(){playTone(740,.12,'sine',.12);},120); setTimeout(function(){playTone(880,.12,'sine',.14);},240); setTimeout(function(){playTone(1175,.4,'sine',.18);},380);
}
function playResult(c6,c5){
  if(c6){ playTone(523,.14,'square',.12); setTimeout(function(){playTone(659,.14,'square',.12);},140); setTimeout(function(){playTone(784,.14,'square',.12);},280); setTimeout(function(){playTone(1046,.35,'square',.18);},420); }
  else if(c5){ playTone(660,.12,'triangle',.1); setTimeout(function(){playTone(880,.18,'triangle',.12);},120); }
}
function isRestricted(b){ return b.type==='joint'||b.type==='direct'||b.type==='zjselect'||b.type==='special'; }
function isSelect(b){ return b.type==='direct'||b.type==='zjselect'; }
function selMax(b,rar){ if(b.type==='zjselect')return rar===6?2:3; return 3; }
function getSel(b){ if(!state.sel[b.id])state.sel[b.id]={six:[],five:[]}; return state.sel[b.id]; }
function selKey(b){ var s=getSel(b); return ((s.six||[]).join('+'))+'|'+((s.five||[]).join('+')); }
function selShort(sel){
  var parts=String(sel||'').split('|');
  var s6=parts[0]?parts[0].split('+'):[];
  var s5=parts[1]?parts[1].split('+'):[];
  var n6=s6.map(function(x){var o=opOf(x);return o?o.name:x;});
  var n5=s5.map(function(x){var o=opOf(x);return o?o.name:x;});
  var t6=n6.slice(0,2).join('+');
  var t5=n5.slice(0,2).join('+');
  if(s6.length>2)t6+='…';
  if(s5.length>2)t5+='…';
  return t6+(t5?' · '+t5:'');
}
function minSel(b,rar){ if(b.type==='zjselect')return rar===6?2:3; return 1; }
function ensureDefaultSel(b){
  var s=getSel(b);
  var changed=false;
  if(!s.six.length&&(b.six||[]).length&&!isSelect(b)){ s.six=b.six.slice(0,selMax(b,6)); changed=true; }
  if(!s.five.length&&(b.five||[]).length&&!isSelect(b)){ s.five=b.five.slice(0,selMax(b,5)); changed=true; }
  if(changed)save();
  return s;
}
function selUps(b,rar){
  var s=ensureDefaultSel(b);
  var key=rar===6?'six':'five';
  return s[key]||[];
}
function getPool(b){
  if(!b._pool){
    var restricted=isRestricted(b), p6, p5;
    if(b.type==='direct'){
      p6=selUps(b,6).slice();
      p5=selUps(b,5).slice();
    }else if(b.type==='zhongjian'){
      p6=restricted?b.six.slice():uniq(b.six.concat(DATA.zj6||DATA.std6));
      p5=restricted?b.five.slice():uniq(b.five.concat(DATA.zj5||DATA.std5));
    }else{
      p6=restricted?b.six.slice():uniq(b.six.concat(DATA.std6));
      p5=restricted?b.five.slice():uniq(b.five.concat(DATA.std5));
    }
    b._pool={p6:p6,p5:p5};
  }
  return b._pool;
}
function poolOthers(b,rar){
  var pool=getPool(b), ups=isSelect(b)?selUps(b,rar===6?6:5):(rar===6?b.six:b.five);
  var key=rar===6?'_o6':'_o5';
  if(!b[key]||b[key].ups!==ups){ b[key]={ups:ups,list:pool[(rar===6?'p6':'p5')].filter(function(n){return ups.indexOf(n)<0;})}; }
  return b[key].list;
}
function upShare(b,ups){
  if(b.type==='joint'||b.type==='special'||b.type==='direct')return 100;
  if(b.type==='zjselect'){
    if(ups.length>=2)return ups.length*35;
    if(ups.length===1)return 50;
    return 100;
  }
  if(ups.length>=2)return ups.length*b.rate6;
  return b.rate6;
}
function isUp6(b, op){ var ups=isSelect(b)?selUps(b,6):b.six; return ups.indexOf(op)>=0; }
function isUp5(b, op){ var ups=isSelect(b)?selUps(b,5):b.five; return ups.indexOf(op)>=0; }
function selUpsSB(b, rar, sb){
  var key=rar===6?'six':'five';
  if(!sb.sel[b.id])sb.sel[b.id]={six:[],five:[]};
  return sb.sel[b.id][key]||[];
}
function isUp6SB(b, op, sb){ var ups=isSelect(b)?selUpsSB(b,6,sb):b.six; return ups.indexOf(op)>=0; }
function isUp5SB(b, op, sb){ var ups=isSelect(b)?selUpsSB(b,5,sb):b.five; return ups.indexOf(op)>=0; }
function simPool(b, sb){
  if(b.type==='direct'){ return {p6:selUpsSB(b,6,sb).slice(), p5:selUpsSB(b,5,sb).slice()}; }
  return getPool(b);
}
function simOthers(b, rar, sb){
  var pool=simPool(b,sb), ups=isSelect(b)?selUpsSB(b,rar===6?6:5,sb):(rar===6?b.six:b.five);
  return pool[(rar===6?'p6':'p5')].filter(function(n){return ups.indexOf(n)<0;});
}
function simPick6(b, sb){
  var pool=simPool(b,sb), ups=isSelect(b)?selUpsSB(b,6,sb):b.six, r=Math.random()*100;
  var share=upShare(b,ups);
  if(ups.length&&r<share)return rnd(ups);
  var p6list=pool.p6.length?pool.p6:(ups.length?ups:DATA.std6);
  if(b.type==='special'){
    if(!sb.got6){
      var unowned=p6list.filter(function(n){ return sb.col.indexOf(n)<0; });
      if(unowned.length){ sb.got6=true; return rnd(unowned); }
      sb.got6=true;
    }
  }
  var others=simOthers(b,6,sb);
  if(!others.length)return rnd(p6list);
  return rnd(others);
}
function simPick5(b, sb){
  var pool=simPool(b,sb), ups=isSelect(b)?selUpsSB(b,5,sb):b.five;
  if(ups.length&&Math.random()<0.5)return rnd(ups);
  var p5list=pool.p5.length?pool.p5:(ups.length?ups:DATA.std5);
  var others=simOthers(b,5,sb);
  if(!others.length)return rnd(p5list);
  return rnd(others);
}
function pick6(b){
  var pool=getPool(b), ups=isSelect(b)?selUps(b,6):b.six, r=Math.random()*100;
  var share=upShare(b,ups);
  if(ups.length&&r<share)return rnd(ups);
  var p6list=pool.p6.length?pool.p6:(ups.length?ups:DATA.std6);
  if(b.type==='special'){
    var st6=state.pity[pityKey(b)]||(state.pity[pityKey(b)]={fails:0,batch:[]});
    if(!st6.got6){
      var unowned=p6list.filter(function(n){return state.collection.indexOf(n)<0;});
      if(unowned.length){ st6.got6=true; return rnd(unowned); }
      st6.got6=true;
    }
  }
  var others=poolOthers(b,6);
  if(!others.length)return rnd(p6list);
  return rnd(others);
}
function pick5(b){
  var pool=getPool(b), ups=isSelect(b)?selUps(b,5):b.five;
  if(ups.length&&Math.random()<0.5)return rnd(ups);
  var p5list=pool.p5.length?pool.p5:(ups.length?ups:DATA.std5);
  var others=poolOthers(b,5);
  if(!others.length)return rnd(p5list);
  return rnd(others);
}
function rollRar(p6){
  var r=Math.random();
  if(r<p6)return 6;
  if(r<p6+R5)return 5;
  if(r<p6+R5+R4)return 4;
  return 3;
}
function pullOne(b){
  var pk=pityKey(b);
  var st=state.pity[pk]||(state.pity[pk]={fails:0,batch:[]});
  var p6=Math.min(0.02+Math.max(0,st.fails-49)*0.02,1);
  var rar,i;
  if(st.batch.length===9){
    var has5=false;
    for(i=0;i<st.batch.length;i++){ if(st.batch[i]>=5)has5=true; }
    rar=has5?rollRar(p6):(Math.random()<p6?6:5);
  }else{ rar=rollRar(p6); }
  var op;
  if(rar===6){ op=pick6(b); st.fails=0; }
  else if(rar===5){ op=pick5(b); st.fails++; }
  else if(rar===4){ op=pick4(); st.fails++; }
  else{ op=pick3(); st.fails++; }
  st.batch.push(rar);
  if(st.batch.length===10)st.batch=[];
  if(b.spark)state.spark[b.id]=(state.spark[b.id]||0)+1;
  if(!state.cnt)state.cnt={};
  state.cnt[b.id]=(state.cnt[b.id]||0)+1;
  if(!state.opCnt)state.opCnt={};
  state.opCnt[op]=(state.opCnt[op]||0)+1;
  return {op:op,rar:rar};
}
function pick4(){ return rnd(ops4); }
function pick3(){ return rnd(ops3); }
function isNew(op){ return state.collection.indexOf(op)<0; }
var newPulse={};
function addCol(op){ if(state.collection.indexOf(op)<0){ state.collection.push(op); newPulse[op]=Date.now(); if(Object.keys(newPulse).length>50){ var cutoff=Date.now()-20000, kk2; for(kk2 in newPulse){ if(newPulse[kk2]<cutoff)delete newPulse[kk2]; } } if(!BATCH_SAVE)save(); return true; } return false; }
function copyBannerInfo(b){
  var NL=String.fromCharCode(10);
  var ups6=b.six.map(function(n){var o=opOf(n);return o?o.name:n;}).join('、')||'无';
  var ups5=b.five.map(function(n){var o=opOf(n);return o?o.name:n;}).join('、')||'无';
  var cf=(state.pity[pityKey(b)]||{fails:0}).fails;
  var ups4=b.four&&b.four.length?b.four.map(function(n){var o=opOf(n);return o?o.name:n;}).slice(0,3).join('、'):'无';
  var text=['【卡池信息】'+b.full,'时间：'+b.start+' ~ '+b.end,'类型：'+b.label,'UP 6★：'+ups6,'UP 5★：'+ups5,'UP 4★：'+ups4,'出率：6★2%（保底100抽）· 5★8% · 十连保底5★','当前保底：已抽 '+cf+' 抽 · 还剩 '+Math.max(0,100-cf)+' 抽必出'].join(NL);
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('卡池信息已复制'); }
  catch(e){ window.prompt('复制以下内容：', text); }
  ta.remove();
}
function sixBurst(names){
  var f=$('flash'), sb=$('sixBanner'), sn=$('sixName');
  if(!f||!sb)return;
  if(sn)sn.textContent=names.join('、');
  sb.classList.remove('show');
  void sb.offsetWidth;
  sb.classList.add('show');
  f.style.transition='opacity 1s';
  f.style.opacity='1';
  setTimeout(function(){ f.style.opacity='0'; }, 800);
  try{ if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate([80,50,120]); }catch(e){}
}
function toast(msg){
  var t=$('toast'); if(!t)return;
  t.innerHTML=msg; t.style.display='block';
  clearTimeout(t._h); t._h=setTimeout(function(){ t.style.display='none'; },2200);
}
var PLACEHOLDER='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#101a2b"/><text x="150" y="200" fill="#4a5c80" font-size="16" text-anchor="middle">图片加载失败</text></svg>');
document.addEventListener('error', function(e){
  var t=e.target;
  if(!t||t.tagName!=='IMG')return;
  var cur=t.getAttribute('src')||'';
  var c=t.getAttribute('data-c');
  if(c&&cur!==c){ t.setAttribute('data-c',''); t.src=c; return; }
  var a=t.getAttribute('data-a');
  if(a&&cur!==a){ t.setAttribute('data-a',''); t.src=a; return; }
  var b=t.getAttribute('data-b');
  if(b&&cur!==b){ t.setAttribute('data-b',''); t.src=b; return; }
  t.src=PLACEHOLDER;
}, true);

var MAX_START=null;
function getMaxStart(){ if(MAX_START===null){ var ms='', i2; for(i2=0;i2<DATA.banners.length;i2++){ if(DATA.banners[i2].start>ms)ms=DATA.banners[i2].start; } MAX_START=ms; } return MAX_START; }
var B_SEARCH=null, B_STAT=null;
function bannerHay(b){ return b.name+' '+b.six.join(' ')+' '+b.five.join(' ')+' '+(b.limitedSix||[]).join(' ')+' '+(b.four||[]).join(' '); }
var B_SEL_CACHE={};
function buildBStat(){ B_STAT={}; B_SEL_CACHE={}; var hi5; for(hi5=0;hi5<state.history.length;hi5++){ var hh5=state.history[hi5]; if(!hh5||!hh5.bid)continue; if(!B_STAT[hh5.bid])B_STAT[hh5.bid]={n:0,s6:0}; B_STAT[hh5.bid].n++; if(hh5.rar===6)B_STAT[hh5.bid].s6++; var kk5=hh5.bid+'|'+(hh5.sel||''); if(!B_SEL_CACHE[kk5])B_SEL_CACHE[kk5]={n:0,s6:0}; B_SEL_CACHE[kk5].n++; if(hh5.rar===6)B_SEL_CACHE[kk5].s6++; } }
var B_STAT_VER=-1;
var BS_CACHE={d:'',m:{}};
function bannerStatus(b){
  try{
    var d=new Date();
    var today=d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate();
    if(b&&b.id&&BS_CACHE.d===today&&BS_CACHE.m[b.id]!==undefined)return BS_CACHE.m[b.id];
    if(BS_CACHE.d!==today)BS_CACHE={d:today,m:{}};
    if(!b||!b.start||!b.end)return {s:'unknown',txt:''};
    if(b.start<=today&&today<=b.end){
      var ms=Math.max(0,new Date(b.end+'T03:59:59').getTime()-d.getTime());
      var days=Math.ceil(ms/86400000);
      var txt=days>=2?('⏳ 剩 '+days+' 天'):(days===1?('⏳ 剩 '+Math.max(1,Math.ceil(ms/3600000))+' 小时'):'⏳ 今日结束');
      var res={s:'active',txt:txt,days:days};
      if(b.id)BS_CACHE.m[b.id]=res;
      return res;
    }
    if(today<b.start){
      var ms2=Math.max(0,new Date(b.start+'T04:00:00').getTime()-d.getTime());
      var days2=Math.ceil(ms2/86400000);
      var txt2=days2>=2?('🔜 '+days2+' 天后开启'):(days2===1?('🔜 '+Math.max(1,Math.ceil(ms2/3600000))+' 小时后开启'):'🔜 今日开启');
      var res2={s:'soon',txt:txt2,days:days2};
      if(b.id)BS_CACHE.m[b.id]=res2;
      return res2;
    }
    var res3={s:'ended',txt:'已结束'};
    if(b.id)BS_CACHE.m[b.id]=res3;
    return res3;
  }catch(e){ return {s:'unknown',txt:''}; }
}
function drawerScrollRestore(el, v){ try{ if(el&&v>0)el.scrollTop=v; }catch(e){} }
function renderBannerList(){
  var list=$('bannerList'), bs=DATA.banners, html=[], i, b;
  var savedBl0=isMobile()&&list?(list.scrollTop||0):0;
  if(B_STAT_VER!==state.history.length){ B_STAT_VER=state.history.length; buildBStat(); }
  var yf=$('yearChips')._v, tf=$('typeChips')._v, q=($('searchBox').value||'').trim();
  var maxStart=getMaxStart();
  var matched=[];
  for(i=0;i<bs.length;i++){
    b=bs[i];
    if(yf!=='all'&&b.year!==yf)continue;
    if(tf==='fav'){ if(!state.fav[b.id])continue; }
    else if(tf!=='all'&&b.type!==tf)continue;
    if(q){
      if(B_SEARCH===null){ B_SEARCH=[]; var bi3; for(bi3=0;bi3<DATA.banners.length;bi3++)B_SEARCH.push(bannerHay(DATA.banners[bi3])); }
      if(B_SEARCH[i].indexOf(q)<0)continue;
    }
    matched.push(b);
  }
  var todayStrB=(function(){ var d2b=new Date(); return d2b.getFullYear()+'-'+(d2b.getMonth()<9?'0':'')+(d2b.getMonth()+1)+'-'+(d2b.getDate()<10?'0':'')+d2b.getDate(); })();
  matched.sort(function(a,b2){
    var aAct=a.start<=todayStrB&&a.end>=todayStrB?1:0, bAct=b2.start<=todayStrB&&b2.end>=todayStrB?1:0;
    if(aAct!==bAct)return bAct-aAct;
    var fa=state.fav[a.id]?1:0, fb=state.fav[b2.id]?1:0;
    if(fa!==fb)return fb-fa;
    return (b2.start||'').localeCompare(a.start||'');
  });
  for(i=0;i<matched.length;i++){
    b=matched[i];
    html.push('<div class="bcard'+(state.cur===b.id?' on':'')+((b.start<=todayStrB&&b.end>=todayStrB)?' active':'')+'" data-id="'+b.id+'">');
    html.push('<div class="thumb">');
    var shown=b.six.slice(0,2);
    if(i<40){ for(var j=0;j<shown.length;j++){ var o=opOf(shown[j]); if(o)html.push('<img loading="lazy" src="'+esc(avUrl(o))+'" alt="" onerror="this.remove()"/>'); }
     }html.push('</div>');
    html.push('<div class="meta"><div class="name">'+esc(b.name)+(b.start===maxStart?'<span class="now-badge">当前</span>':'')+'<span class="badge" style="background:'+b.color+'">'+esc(b.label)+'</span><span class="favbtn'+(state.fav[b.id]?' on':'')+'" data-id="'+b.id+'" title="收藏/取消收藏">★</span></div>');
    var cnt=(state.cnt||{})[b.id]||0;
    var bs2=B_STAT&&B_STAT[b.id];
    var bst3=bannerStatus(b);
    html.push('<div class="sub">'+esc(b.start)+' ~ '+esc(b.end)+(bst3.txt?' · <span class="bst '+bst3.s+'">'+esc(bst3.txt)+'</span>':'')+(cnt>0?' · 已抽 <b style="color:var(--gold)">'+cnt+'</b> 抽':'')+(bs2&&bs2.n>0&&bs2.s6>0?' · 6★率 <b style="color:#ff6e6e">'+(bs2.s6/bs2.n*100).toFixed(1)+'%</b>':'')+'</div></div>');
    html.push('</div>');
  }
  if(!matched.length)html.push('<div class="notice" style="padding:16px;text-align:center">没有符合条件的卡池，试试其他筛选或搜索</div>');
  list.innerHTML=html.join('');
  if(savedBl0>0)drawerScrollRestore(list,savedBl0);
}
function setChips(holder,vals,cur,cb){
  if(!holder)return;
  holder._v=cur;
  var h=[],i;
  h.push('<button class="chip'+(cur==='all'?' on':'')+'" data-v="all">全部</button>');
  for(i=0;i<vals.length;i++){
    h.push('<button class="chip'+(cur===vals[i][0]?' on':'')+'" data-v="'+vals[i][0]+'">'+vals[i][1]+'</button>');
  }
  holder.innerHTML=h.join('');
  holder.onclick=function(e){
    var t=e.target; if(t.tagName!=='BUTTON')return;
    holder._v=t.getAttribute('data-v');
    cb();
  };
}
function initFilters(){
  var bs=DATA.banners, yrs={}, i, b;
  for(i=0;i<bs.length;i++){ b=bs[i]; yrs[b.year]=(yrs[b.year]||0)+1; }
  var ykeys=Object.keys(yrs).sort().reverse();
  var yk=[],x;
  for(x=0;x<ykeys.length;x++)yk.push([ykeys[x],ykeys[x]]);
  setChips($('yearChips'),yk,'all',function(){renderBannerList();});
  setChips($('typeChips'),[['fav','⭐收藏'],['limited','限定'],['event','活动'],['joint','联合行动'],['direct','定向甄选'],['standard','标准'],['zhongjian','中坚'],['zjselect','中坚甄选'],['special','特殊']],'all',function(){renderBannerList();});
}
function openSelModal(b){
  ensureDefaultSel(b);
  var h=['<h4 class="sect" style="margin-top:0">🎯 选择UP干员 · '+esc(b.full)+'</h4>'];
  h.push('<div class="notice">'+(b.type==='zjselect'?'中坚甄选：选 <b>2</b> 位6★ + <b>3</b> 位5★':'定向甄选：选 <b>1-3</b> 位6★ + <b>1-3</b> 位5★')+' · 可取消所有选择，但<b>选不满不能抽</b> · 保底/记录按选择独立计算，切回原选择自动恢复</div>');
  h.push('<div class="wikisearch"><input id="selSearchInput" placeholder="搜索干员筛选..." value=""/></div>');
  h.push('<div id="selBody">'+selBoxHtml(b,6)+selBoxHtml(b,5)+'</div>');
  h.push('<button class="mini-btn" id="selConfirm" style="margin:10px auto;display:block">✅ 确定选择</button>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var sc=$('selConfirm'); if(sc)sc.onclick=function(){
    var s2=getSel(b);
    if(s2.six.length<minSel(b,6)||s2.five.length<minSel(b,5)){ toast('选不满不能抽：至少需 '+minSel(b,6)+' 位6★ + '+minSel(b,5)+' 位5★'); return; }
    b._pool=null;
    save();
    closeModal();
    renderBannerInfo(); renderStats(); renderHistory();
    toast('✅ 已确认UP选择，保底已按当前选择独立计算');
  };
  var ssi=$('selSearchInput');
  if(ssi){ var ssiDl=null; ssi.oninput=function(){ clearTimeout(ssiDl); var q=this.value.trim(); ssiDl=setTimeout(function(){ var body=$('selBody'); if(body)body.innerHTML=selBoxHtml(b,6,q)+selBoxHtml(b,5,q); bindSelOps(); },150); }; }
  function bindSelOps(){
    var box=$('selBody');
    var sels2=box?box.querySelectorAll('.selop'):[];
    for(var si7=0;si7<sels2.length;si7++){
      (function(el){
        el.onclick=function(){
          var b2=bannerById(state.cur), rar=+el.getAttribute('data-rar'), op=el.getAttribute('data-op');
          var s3=getSel(b2), key=rar===6?'six':'five', max=selMax(b2,rar);
          var cur=s3[key];
          if(cur.indexOf(op)>=0){
            s3[key]=cur.filter(function(x){return x!==op;});
          }
          else if(cur.length>=max){ toast('最多选择'+max+'位'); return; }
          else{ cur.push(op); }
          save();
          var q2=ssi?ssi.value.trim():'';
          var body2=$('selBody');
          if(body2)body2.innerHTML=selBoxHtml(b2,6,q2)+selBoxHtml(b2,5,q2);
          bindSelOps();
        };
      })(sels2[si7]);
    }
  }
  bindSelOps();
}
function selBoxHtml(b,rar,selQ){
  var list=rar===6?b.six:b.five, s=ensureDefaultSel(b), key=rar===6?'six':'five';
  if(selQ){ var so2=opOf; list=list.filter(function(n){ var o2=so2(n); return o2&&o2.name.indexOf(selQ)>=0; }); }
  var sel=s[key]||[];
  var max=selMax(b,rar);
  var h=['<div class="selbox"><div class="seltitle">选择UP干员（'+(rar===6?'6★':'5★')+' · 最多'+max+'位 · 已选'+Math.min(sel.length,max)+'/'+max+'）</div><div class="selgrid">'];
  var i,o;
  for(i=0;i<list.length;i++){
    o=opOf(list[i]); if(!o)continue;
    var on=sel.indexOf(list[i])>=0;
    h.push('<div class="selop'+(on?' on':' off')+'" data-op="'+esc(list[i])+'" data-rar="'+rar+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="ot'+(state.collection.indexOf(list[i])>=0?' have':' new')+'">'+(state.collection.indexOf(list[i])>=0?'✓':'NEW')+'</div><div class="sn">'+esc(o.name)+'</div></div>');
  }
  h.push('</div></div>');
  return h.join('');
}
function claimAt(b){ return b.collab?120:300; }
function bannerInfoHtml(b){
  var h=[];
  h.push('<button class="mini-btn" id="mBannerOpen">🎴 切换卡池</button>');
  var bst4=bannerStatus(b);
  h.push('<div class="row1"><button class="mini-btn navB" data-dir="-1">◀ 上期</button><h2>'+esc(b.full)+'</h2><span class="badge" style="background:'+b.color+'">'+esc(b.label)+'</span><span class="dates">'+esc(b.start)+' ~ '+esc(b.end)+(bst4.txt?'<span class="bst '+bst4.s+'" style="margin-left:6px">'+esc(bst4.txt)+'</span>':'')+'</span><button class="mini-btn navB" data-dir="1">下期 ▶</button></div>');
  h.push('<div class="rateup">');
  var colSet3={}, ci3;
  for(ci3=0;ci3<state.collection.length;ci3++)colSet3[state.collection[ci3]]=1;
  var ups=b.six,i,j,o;
  for(i=0;i<ups.length;i++){
    o=opOf(ups[i]); if(!o)continue;
    var lim=b.limitedSix.indexOf(ups[i])>=0;
    h.push('<div class="rup-card r'+o.rarity+'" data-op="'+esc(ups[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="ot'+(colSet3[ups[i]]?' have':' new')+'">'+(colSet3[ups[i]]?'✓ 已有':'NEW')+'</div>');
    h.push('<div class="rn">'+esc(o.name)+'</div>');
    h.push('<div class="rb">'+(lim?'限定':'UP')+'</div>');
    h.push('<div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  var ups5=b.five.slice(0,3);
  for(j=0;j<ups5.length;j++){
    o=opOf(ups5[j]); if(!o)continue;
    h.push('<div class="rup-card r'+o.rarity+'" data-op="'+esc(ups5[j])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="ot'+(colSet3[ups5[j]]?' have':' new')+'">'+(colSet3[ups5[j]]?'✓ 已有':'NEW')+'</div>');
    h.push('<div class="rn">'+esc(o.name)+'</div><div class="rb">UP</div><div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  var ups4=(b.four||[]).slice(0,3);
  for(j=0;j<ups4.length;j++){
    o=opOf(ups4[j]); if(!o)continue;
    h.push('<div class="rup-card r'+o.rarity+'" data-op="'+esc(ups4[j])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="rn">'+esc(o.name)+'</div><div class="rb">4★UP</div><div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  h.push('</div>');
  var poolB=getPool(b);
  h.push('<button class="mini-btn" id="btnPool">查看完整卡池（6★ '+poolB.p6.length+' · 5★ '+poolB.p5.length+'）</button>');
  var bkCnt=(state.cnt||{})[b.id]||0, bk6=B_STAT&&B_STAT[b.id]?B_STAT[b.id].s6:0;
  if(isSelect(b)){
    var sKey2=selKey(b), ss2=(B_SEL_CACHE&&B_SEL_CACHE[b.id+'|'+sKey2])||{n:0,s6:0};
    bkCnt=ss2.n; bk6=ss2.s6;
  }
  if(bkCnt>0)h.push('<div class="notice" style="color:var(--gold)">本池战绩：已抽 <b>'+bkCnt+'</b> 抽 · 出 6★ <b>'+bk6+'</b> 只'+(bkCnt>0?' · 6★率 <b>'+(bk6/bkCnt*100).toFixed(1)+'%</b>':'')+'</div>');
  if(b.collab)h.push('<div class="notice" style="color:#ff9a2e">🔗 联动限定寻访：联动干员仅当期获取，活动结束后不再复刻</div>');
  h.push('<div class="notice">6★出率 <b>2%</b>（51抽起每抽+2%，100抽必出）· 5★出率 <b>8%</b>（十连保底5★以上）· 4★ 50% · 3★ 40%');
  var ups6=isSelect(b)?selUps(b,6):b.six;
  if(ups6.length===1)h.push(' · 当期6★占6★出率的 <b>50%</b>');
  else if(ups6.length>=2)h.push(' · 当期6★各占6★出率的 <b>'+(b.type==='zjselect'?35:b.rate6)+'%</b>');
  if(b.limitedSix.length)h.push(' · 限定干员：<b>'+b.limitedSix.map(esc).join('、')+'</b>');
  if(b.spark)h.push(' · '+(b.collab?'120':'300')+'抽可免费领取当期'+(b.collab?'联动':'限定')+' · 300抽可兑换'+(b.collab?'联动干员':'限定干员'));
  h.push('</div>');
  var st0=state.pity[pityKey(b)]||{fails:0};
  if(st0.fails>=90)h.push('<div class="pityurgent">🚨 已接近保底！当前 '+st0.fails+' 抽，最多再 '+Math.max(0,100-st0.fails)+' 抽必出 6★</div>');
  h.push('<div class="pitybar"><div class="pbar"><i style="width:'+Math.min(100,st0.fails)+'%"></i></div><span>6★保底进度：已抽 <b>'+st0.fails+'</b> / 100（还剩 <b>'+(100-st0.fails)+'</b> 抽必出）</span></div>');
  h.push('<div class="calcrow"><span class="notice">保底预测：再抽</span><input id="calcN" type="number" min="1" max="200" value="10"/><span class="notice">抽 → 出6★概率</span><b id="calcP" style="color:var(--gold)">—</b><button class="mini-btn calcgo" data-n="10">10</button><button class="mini-btn calcgo" data-n="50">50</button><button class="mini-btn calcgo" data-n="100">100</button><span class="notice" id="calcNote"></span><button class="mini-btn" id="btnResetPity">重置本池保底</button><button class="mini-btn" id="btnCopyBanner">复制卡池信息</button></div>');
  if(isSelect(b)){
    var sB=getSel(b);
    if(sB.six.length<minSel(b,6)||sB.five.length<minSel(b,5)){
      h.push('<div class="notice">🎯 当前选择不满（至少需 '+minSel(b,6)+' 位6★ + '+minSel(b,5)+' 位5★），选不满不能抽卡（保底/记录按选择独立计算）</div>');
      h.push('<button class="mini-btn" id="btnOpenSel" style="margin:4px auto;display:block">🎯 '+(sB.six.length||sB.five.length?'继续选择UP':'开始选择UP')+'</button>');
    } else {
      h.push('<div class="rateup">');
      var s6o,si6b;
      for(si6b=0;si6b<sB.six.length;si6b++){ s6o=opOf(sB.six[si6b]); if(s6o)h.push('<div class="rup-card r6" data-op="'+esc(sB.six[si6b])+'"><img loading="lazy" src="'+esc(avUrl(s6o))+'" alt=""/><div class="rn">'+esc(s6o.name)+'</div><div class="rb">已选6★</div><div class="rr">'+stars(6)+'</div></div>'); }
      var s5o,si5b;
      for(si5b=0;si5b<sB.five.length;si5b++){ s5o=opOf(sB.five[si5b]); if(s5o)h.push('<div class="rup-card r5" data-op="'+esc(sB.five[si5b])+'"><img loading="lazy" src="'+esc(avUrl(s5o))+'" alt=""/><div class="rn">'+esc(s5o.name)+'</div><div class="rb">已选5★</div><div class="rr">'+stars(5)+'</div></div>'); }
      h.push('</div>');
      h.push('<button class="mini-btn" id="btnReSel" style="margin:4px auto;display:block">🔄 重新选择UP</button>');
      h.push('<div class="notice">当前选择：6★ '+sB.six.map(function(x){var oo=opOf(x);return oo?oo.name:x;}).join('、')+' · 5★ '+sB.five.map(function(x){var oo=opOf(x);return oo?oo.name:x;}).join('、')+'<br/>切换选择后保底/寻访记录独立计算，切回原选择自动恢复</div>');
    }
  }
  if(b.spark){
    var tok=state.spark[b.id]||0;
    h.push('<div class="spark"><span>'+(b.collab?'🔗 寻访数据契约（联动·300兑换联动限定）':'寻访数据契约')+'</span><div class="bar"><i style="width:'+Math.min(100,tok/3)+'%"></i></div><b>'+tok+' / 300</b>'+(tok<300?'<span class="sparkhint">还差 <b>'+(300-tok)+'</b> 抽可兑换'+(b.collab?'联动限定':'限定')+'</span>':'<span class="sparkhint done">已可兑换'+(b.collab?'联动限定':'限定干员')+'！</span>'));
    h.push('<button class="mini-btn" id="spark300" '+(tok>=300?'':'disabled')+'>'+(b.collab?'300兑换联动限定':'300兑换限定')+'</button>');
    var nonLim=b.six.filter(function(n){return b.limitedSix.indexOf(n)<0;});
    if(nonLim.length)h.push('<button class="mini-btn" id="spark200" '+(tok>=200?'':'disabled')+'>200兑换当期6★</button>');
    h.push('</div>');
    var pullsC=(state.cnt||{})[b.id]||0, caC=claimAt(b), clmC=state.claimed&&state.claimed[b.id];
    h.push('<div class="spark claim"><span>'+(b.collab?'🎁 免费领取联动限定（累计 '+pullsC+' / '+caC+' 抽':'🎁 免费领取当期限定（累计 '+pullsC+' / '+caC+' 抽')+(clmC?' · 已领取':'')+'）</span><div class="bar"><i style="width:'+Math.min(100,pullsC/caC*100)+'%"></i></div>'+(pullsC>=caC&&!clmC?'<button class="mini-btn" id="sparkClaim">🎁 免费领取</button>':'<span class="sparkhint">'+(clmC?'已领取过':'还差 <b>'+(caC-pullsC)+'</b> 抽可免费领取')+'</span>')+'</div>');
  }
  return h.join('');
}
var PRE6_DONE={};
function renderBannerInfo(){
  if(B_STAT_VER!==state.history.length){ B_STAT_VER=state.history.length; buildBStat(); }
  var b=bannerById(state.cur);
  if(!b)return;
  $('bannerInfo').innerHTML=bannerInfoHtml(b);
  var cards=$('bannerInfo').querySelectorAll('.rup-card'), i;
  for(i=0;i<cards.length;i++){
    cards[i].onclick=function(){ openModal(this.getAttribute('data-op')); };
  }
  var sels=$('bannerInfo').querySelectorAll('.selop');
  for(i=0;i<sels.length;i++){
    (function(el){
      el.onclick=function(){
        var b2=bannerById(state.cur), rar=+el.getAttribute('data-rar'), op=el.getAttribute('data-op');
        var s=ensureDefaultSel(b2), key=rar===6?'six':'five', max=selMax(b2,rar), minN=minSel(b2,rar);
        var cur=s[key];
        if(cur.indexOf(op)>=0){
          if(cur.length<=minN){ toast('至少保留 '+minN+' 位UP干员'); return; }
          s[key]=cur.filter(function(x){return x!==op;});
        }
        else if(cur.length>=max){ toast('最多选择'+max+'位'); return; }
        else{ cur.push(op); }
        b2._pool=null;
        save();
        renderBannerInfo();
        updateRateNote(b2);
      };
    })(sels[i]);
  }
  var s300=$('spark300'); if(s300)s300.onclick=function(){ sparkExchange(300); };
  var s200=$('spark200'); if(s200)s200.onclick=function(){ sparkExchange(200); };
  var sClm=$('sparkClaim'); if(sClm)sClm.onclick=function(){ sparkClaim(); };
  var mbo=$('mBannerOpen'); if(mbo)mbo.onclick=openDrawer;
  var nbs=$('bannerInfo').querySelectorAll('.navB');
  for(var ni=0;ni<nbs.length;ni++){ nbs[ni].onclick=function(){ navBanner(parseInt(this.getAttribute('data-dir'),10)||0); }; }
  if(isSelect(b))ensureDefaultSel(b);
  var bbn=$('barBanner'); if(bbn)bbn.textContent=b.full;
  if(typeof Image!=='undefined'&&!PRE6_DONE[b.id]){
    PRE6_DONE[b.id]=1;
    var pre6=b.six.slice(0,2), pj;
    for(pj=0;pj<pre6.length;pj++){ var po6=opOf(pre6[pj]); if(po6){ var pim=new Image(); pim.src=opArtT(po6); } }
  }
  var brp=$('btnResetPity'); if(brp)brp.onclick=function(){ state.pity[pityKey(b)]={fails:0,batch:[]}; save(); renderBannerInfo(); renderStats(); toast('已重置「'+esc(b.full)+'」的保底'); };
  var bcb=$('btnCopyBanner'); if(bcb)bcb.onclick=function(){ copyBannerInfo(b); };
  var bp=$('btnPool'); if(bp)bp.onclick=openPoolModal;
  var bos=$('btnOpenSel'); if(bos)bos.onclick=function(){ openSelModal(b); };
  var brs=$('btnReSel'); if(brs)brs.onclick=function(){ openSelModal(b); };
  var cn=$('calcN');
  if(cn){
    var doCalc=function(){
      var n=parseInt(cn.value,10); if(!n||isNaN(n))n=10; if(n<1)n=1; if(n>200)n=200;
      var fails=(state.pity[pityKey(b)]||{fails:0}).fails;
      var rr=calcPity(fails,n);
      var cp=$('calcP'); if(cp)cp.textContent=rr.prob.toFixed(1)+'%';
      var cno=$('calcNote'); if(cno)cno.textContent='期望约 '+rr.exp.toFixed(1)+' 只6★';
    };
    cn.oninput=doCalc;
    doCalc();
    var gos=$('bannerInfo').querySelectorAll('.calcgo');
    for(var gi=0;gi<gos.length;gi++){ gos[gi].onclick=function(){ cn.value=this.getAttribute('data-n'); doCalc(); }; }
  }
  updateRateNote(b);
}
function updateRateNote(b){
  var st=state.pity[pityKey(b)]||{fails:0};
  var p6=Math.min(0.02+Math.max(0,st.fails-49)*0.02,1);
  var msg='当前卡池：'+esc(b.full)+' · 距上次6★已抽 <b>'+st.fails+'</b> 抽 · 下次6★概率 <b>'+(p6*100).toFixed(1)+'%</b>';
  if(st.fails>=85)msg+='<br/><b style="color:var(--red)">⏳ 还剩 '+(100-st.fails)+' 抽必出6★！</b>';
  $('rateNote').innerHTML=msg;
  var pc=$('pityCount');
  if(pc){ if(st.fails>=85){ pc.textContent='⏳ 还剩 '+(100-st.fails)+' 抽必出6★'; pc.classList.add('show'); } else { pc.textContent=''; pc.classList.remove('show'); } }
}
var SPARK_N=24;
function sparkTargets(b, cost){
  if(cost===300)return b.collab?b.six.slice():b.limitedSix.slice();
  return b.six.filter(function(n){ return b.limitedSix.indexOf(n)<0; });
}
function sparkPickModal(b, list, title, onPick){
  if(!list.length){ toast('无可选干员'); return; }
  var h=['<h4 class="sect" style="margin-top:0">'+title+'</h4><div class="rateup">'];
  var i,o;
  var showAll=Math.min(list.length,SPARK_N);
  for(i=0;i<showAll;i++){
    o=opOf(list[i]); if(!o)continue;
    var owned=state.collection.indexOf(list[i])>=0;
    h.push('<div class="rup-card r'+o.rarity+(owned?' owned':'')+'" data-op="'+esc(list[i])+'"'+(owned?' title="已拥有：兑换将转化为潜能/资质凭证"':'')+'><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="rn">'+esc(o.name)+(owned?'（已有 · 兑换转潜能）':'')+'</div>');
    h.push('<div class="rb">'+(b.limitedSix.indexOf(list[i])>=0?'限定':'当期')+'</div>');
    h.push('<div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  if(list.length>showAll)h.push('<button class="mini-btn" id="sparkMore" style="margin:8px auto;display:block">加载更多（'+(list.length-showAll)+' 名）</button>');
  h.push('</div><div class="notice">点击干员卡片完成'+(title.indexOf('兑换')>=0?'兑换':'领取')+'（已拥有的干员也可选择，将转化为潜能/资质凭证）</div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var cards=$('mBody').querySelectorAll('.rup-card');
  for(i=0;i<cards.length;i++){
    (function(card){
      card.onclick=function(){ var opName=card.getAttribute('data-op'); if(!opName)return; onPick(opName, state.collection.indexOf(opName)>=0); };
    })(cards[i]);
  }
  var sm=$('sparkMore'); if(sm)sm.onclick=function(){ SPARK_N+=24; sparkPickModal(b,list,title,onPick); };
}
function sparkExchange(cost){
  var b=bannerById(state.cur);
  if(!b){ toast('卡池数据缺失'); return; }
  var tok=state.spark[b.id]||0;
  if(tok<cost){ toast('寻访数据契约不足'); return; }
  var list=sparkTargets(b, cost);
  sparkPickModal(b, list, '选择要兑换的干员（消耗 <b>'+cost+'</b> 契约 · 现有 '+tok+'）', function(opName, owned){
    var tokNow=state.spark[b.id]||0;
    if(tokNow<cost){ toast('契约不足（现有 '+(state.spark[b.id]||0)+' / '+cost+'）'); closeModal(); return; }
    state.spark[b.id]=tokNow-cost;
    state.sparkEx=(state.sparkEx||0)+1;
    addCol(opName);
    state.opCnt=state.opCnt||{}; state.opCnt[opName]=(state.opCnt[opName]||0)+1;
    save();
    closeModal();
    toast((owned?'已兑换 <b>'+esc(opOf(opName).name)+'</b>（已拥有 · 转化为潜能凭证）！':'已兑换 <b>'+esc(opOf(opName).name)+'</b>！'));
    renderBannerInfo(); renderStats(); renderCollection();
  });
}
function sparkClaim(){
  var b=bannerById(state.cur);
  if(!b){ toast('卡池数据缺失'); return; }
  if(state.claimed&&state.claimed[b.id]){ toast('本池已免费领取过当期限定'); return; }
  var pulls=(state.cnt||{})[b.id]||0;
  if(pulls<claimAt(b)){ toast('累计 '+pulls+' / '+claimAt(b)+' 抽，还差 '+(claimAt(b)-pulls)+' 抽可免费领取'); return; }
  var list=b.collab?b.six.slice():b.limitedSix.slice();
  sparkPickModal(b, list, '🎁 免费领取当期'+(b.collab?'联动限定':'限定')+'（累计 '+pulls+' 抽 · 不消耗寻访数据契约）', function(opName, owned){
    addCol(opName);
    state.opCnt=state.opCnt||{}; state.opCnt[opName]=(state.opCnt[opName]||0)+1;
    state.claimed=state.claimed||{}; state.claimed[b.id]=true;
    save();
    closeModal();
    toast('🎁 已免费领取 <b>'+esc(opOf(opName).name)+'</b>！');
    renderBannerInfo(); renderStats(); renderCollection();
  });
}
function renderCards(results,msg,has6,names6,has5){
  var wrap=$('cards'), html=[], i;
  for(i=0;i<results.length;i++){
    var r=results[i], o=opOf(r.op)||{name:r.op,rarity:r.rar,art:'',av:''}, nw=isNew(r.op);
    html.push('<div class="card r'+r.rar+'" data-i="'+i+'">');
    html.push('<div class="face back">罗德岛</div>');
    html.push('<div class="face front"><img loading="lazy" src="'+esc(opArtT(o))+'" data-a="'+esc(o.art||'')+'" data-b="'+esc(avUrl(o))+'" alt=""/>');
    html.push('<div class="nm">'+esc(o.name)+'</div>');
    html.push('<div class="st">'+stars(r.rar)+'</div>');
    if(nw)html.push('<div class="newtag">NEW</div>');
    html.push('</div></div>');
  }
  wrap.innerHTML=html.join('');
  var cards=wrap.querySelectorAll('.card');
  var cimgs=wrap.querySelectorAll('img');
  for(var ci5=0;ci5<cimgs.length;ci5++){ (function(im){ idbSrc(im.getAttribute('src'), im); })(cimgs[ci5]); }
  var order=[];
  for(i=0;i<results.length;i++)order.push(i);
  order.sort(function(a,b){ return results[a].rar-results[b].rar; });
  for(i=0;i<order.length;i++){
    (function(card,res,fi){
      card.onclick=function(){ openModal(res.op); };
      setTimeout(function(){ card.classList.add('flip'); }, 100+fi*SPEED);
    })(cards[order[i]],results[order[i]],i);
  }
  setTimeout(function(){
    if(lastBatch.length>10)msg+='<br/><button class="mini-btn" id="btnAllRes">查看全部 '+lastBatch.length+' 抽结果</button>';
    if(has6&&names6&&names6.length){
      var big6=[], bi2;
      for(bi2=0;bi2<results.length;bi2++){ if(results[bi2].rar===6)big6.push(results[bi2]); }
      if(big6.length){
        var bh=['<div class="sixstrip">'];
        var show6=Math.min(big6.length,3);
        for(bi2=0;bi2<show6;bi2++){ var bo6=opOf(big6[bi2].op); if(bo6)bh.push('<div class="sixcard'+(limitedOps[big6[bi2].op]?' lim':'')+'" data-op="'+esc(big6[bi2].op)+'"><img loading="lazy" src="'+esc(opArtT(bo6))+'"/>'+(limitedOps[big6[bi2].op]?'<div class="crown">👑</div>':'')+'<div class="sn6">'+esc(bo6.name)+'</div></div>'); }
        bh.push('</div>');
        msg=bh.join('')+msg;
        if(big6.length>3)msg+='<br/><span class="notice">……共 '+big6.length+' 只六星 · <a class="allreslink" id="sixAllLink">查看全部结果</a></span>';
      }
    }
    $('resultMsg').innerHTML=msg||'';
    if(has6&&names6&&names6.length){ toast('恭喜！获得六星干员：'+names6.join('、')); sixBurst(names6); var first6=wrap.querySelector('.card.r6'); if(first6&&first6.scrollIntoView){ try{ first6.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){ first6.scrollIntoView(); } } }
    if(has5&&!has6){ var f5=$('flash'); if(f5){ f5.style.background='radial-gradient(ellipse at center, rgba(245,185,74,.32), transparent 70%)'; f5.style.transition='opacity .8s'; f5.style.opacity='1'; setTimeout(function(){ f5.style.opacity='0'; f5.style.background=''; }, 750); } try{ if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(50); }catch(e){} }
    if(lastBatch.length>10){ var ab=$('btnAllRes'); if(ab)ab.onclick=openAllResults; msg+='<br/><button class="mini-btn" id="btnAgain">🔁 再来'+(lastPullN||10)+'抽</button>'; $('resultMsg').innerHTML=msg; var ab2=$('btnAgain'); if(ab2)ab2.onclick=function(){ doPull(lastPullN||10); }; }
    var sal=$('sixAllLink'); if(sal)sal.onclick=function(){ openAllResults(); };
    var sixcards=$('resultMsg').querySelectorAll('.sixcard');
    for(var si6=0;si6<sixcards.length;si6++){ (function(sc){ sc.onclick=function(){ openModal(sc.getAttribute('data-op')); }; })(sixcards[si6]); }
    var hasLim=false;
    for(si6=0;si6<results.length;si6++){ if(results[si6].rar===6&&limitedOps[results[si6].op]){hasLim=true;break;} }
    if(hasLim){ playLimResult(); } else { playResult(has6||false,has5||false); }
  }, 100+results.length*SPEED);
}
function setBusyUI(on){
  var ids=['btn1','btn10','btnUntil6','btnCustom'], i2, el2;
  for(i2=0;i2<ids.length;i2++){ el2=$(ids[i2]); if(el2)el2.disabled=on; }
  if(on){ var ft=$('fortune'); if(ft){ ft.textContent='✨ 抽卡中…'; ft.classList.add('busy'); } } else { var ft2=$('fortune'); if(ft2){ ft2.classList.remove('busy'); setFortune(); } }
}
function doPull(n){
  if(BUSY)return;
  var achBefore=achDoneSet();
  var b=bannerById(state.cur);
  if(!b)return;
  if(isSelect(b)){ var sChk=getSel(b); if(sChk.six.length<minSel(b,6)||sChk.five.length<minSel(b,5)){ toast('选不满不能抽：至少需 '+minSel(b,6)+' 位6★ + '+minSel(b,5)+' 位5★'); openSelModal(b); return; } }
  if(n<1)n=1; if(n>500)n=500;
  lastPullN=n;
  BUSY=true;
  setBusyUI(true);
  var results=[], i, r, newHist=[];
  var hadSet={}, hi2;
  for(hi2=0;hi2<state.collection.length;hi2++)hadSet[state.collection[hi2]]=1;
  BATCH_SAVE=true;
  for(i=0;i<n;i++){
    r=pullOne(b);
    results.push(r);
    if(isNew(r.op))addCol(r.op);
    newHist.push({op:r.op,rar:r.rar,t:Date.now(),type:b.type,bn:b.full,bid:b.id,sel:isSelect(b)?selKey(b):''});
  }
  BATCH_SAVE=false;
  if(newHist.length){ newHist.reverse(); state.history=newHist.concat(state.history); }
  if(state.history.length>2000)state.history.length=2000;
  sessPulls+=n;
  save();
  var shown=results;
  if(n>10){
    shown=results.filter(function(x){return x.rar>=5;}).slice(0,12);
    if(!shown.length)shown=results.slice(-10);
  }
  var c6=0,c5=0,c4=0,c3=0,names6=[];
  for(i=0;i<results.length;i++){
    var x=results[i];
    if(x.rar===6){c6++;var no6x=opOf(x.op);names6.push(no6x?no6x.name:x.op);}
    else if(x.rar===5)c5++;
    else if(x.rar===4)c4++;
    else c3++;
  }
  var msg='';
  if(names6.length)msg='<b>★ 六星干员：'+names6.join('、')+' ★</b>';
  msg=enhancePullMsg(results,hadSet,msg);
  msg+='<br/>本次 '+n+' 抽：6★×'+c6+' · 5★×'+c5+' · 4★×'+c4+' · 3★×'+c3;
  if(n>=50){ var batchRate=c6/n*100; var expRate=2.89; var diff=((batchRate-expRate)/expRate*100).toFixed(0); msg+='<br/><span class="batchrate">本批6★率 <b>'+(batchRate).toFixed(1)+'%</b>（期望 '+expRate+'% · '+(diff>=0?'+':'')+diff+'%）</span>'; var limInBatch=0, lib; for(lib=0;lib<results.length;lib++){ if(results[lib].rar===6&&limitedOps[results[lib].op])limInBatch++; } if(limInBatch)msg+='<br/><span class="wishhit">👑 本批限定干员 ×'+limInBatch+'</span>'; }
  if(n>10&&!names6.length)msg+='（本次未出高星，展示最后10张）';
  lastBatch=results;
  renderCards(shown,msg,c6>0,names6,c5>0);
  setTimeout(function(){ BUSY=false; setBusyUI(false); }, 100+shown.length*SPEED+600);
  renderStats();
  renderHistory();
  renderCollection();
  renderBannerInfo();
  checkNewAch(achBefore);
  setFortune();
}
function findTypeBanner(type){ var best=null, i3; for(i3=0;i3<DATA.banners.length;i3++){ var bb3=DATA.banners[i3]; if(bb3.type===type&&(!best||(bb3.start||'')>(best.start||'')))best=bb3; } return best; }
function openPityMap(){
  var h=['<h4 class="sect" style="margin-top:0">🛡 保底一览</h4><div class="notice">所有卡池的 6★ 保底进度总览，点击卡片切换到对应卡池</div>'];
  var seen={}, arr=[], pk2, b3;
  for(pk2 in state.pity){
    var stt=state.pity[pk2];
    if(!stt||!stt.fails||stt.fails<=0)continue;
    if(pk2==='std')b3=findTypeBanner('standard');
    else if(pk2==='zj')b3=findTypeBanner('zhongjian');
    else { var pkBid2=pk2.indexOf(':')>=0?pk2.slice(0,pk2.indexOf(':')):pk2; b3=bannerById(pkBid2); }
    if(!b3||seen[pk2])continue; seen[pk2]=1;
    arr.push({b:b3,fails:stt.fails,cnt:(state.cnt||{})[b3.id]||0});
  }
  var bsi, bk2;
  for(bsi=0;bsi<DATA.banners.length;bsi++){
    bk2=DATA.banners[bsi];
    var c2=(state.cnt||{})[bk2.id]||0;
    var pkx=pityKey(bk2);
    if(c2>0&&!seen[pkx]&&!seen[bk2.id]){ seen[pkx]=1; arr.push({b:bk2,fails:((state.pity[pkx]||{}).fails)||0,cnt:c2}); }
  }
  if(!arr.length){ h.push('<div class="notice">还没有抽过任何卡池，先去抽一发吧！</div>'); $('mBody').innerHTML=h.join(''); openModalBox(); return; }
  arr.sort(function(x,y){ return (y.fails*1000+y.cnt)-(x.fails*1000+x.cnt); });
  h.push('<div class="pitymap">');
  for(var ai=0;ai<arr.length;ai++){
    var bb=arr[ai].b, ff=arr[ai].fails, cc=arr[ai].cnt;
    var p6n=Math.min(0.02+Math.max(0,ff-49)*0.02,1)*100;
    h.push('<div class="pitymap-card'+(state.cur===bb.id?' on':'')+'" data-bid="'+bb.id+'">');
    h.push('<div class="pm-name">'+esc(bb.name)+'</div>');
    h.push('<div class="pm-bar"><i style="width:'+Math.min(100,ff)+'%"></i></div>');
    h.push('<div class="pm-sub">本池已抽 <b>'+cc+'</b> 抽 · 距上次6★ <b>'+(ff>0?ff+' 抽':'—')+'</b>');
    if(ff>=90)h.push('<br/><span class="pm-hot">🚨 已接近保底！最多再 '+(100-ff)+' 抽必出</span>');
    else h.push('<br/>当前6★概率 <b>'+(p6n).toFixed(1)+'%</b> · 距保底 '+(100-ff)+' 抽');
    h.push('</div></div>');
  }
  h.push('</div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var pcs=$('mBody').querySelectorAll('.pitymap-card');
  for(var pi2=0;pi2<pcs.length;pi2++){
    (function(pc){ pc.onclick=function(){ state.cur=pc.getAttribute('data-bid'); save(); renderBannerList(); renderBannerInfo(); renderStats(); closeModal(); }; })(pcs[pi2]);
  }
}
function buildReport(days){
  var cutoff=Date.now()-days*86400000;
  var prevCutoff=cutoff-days*86400000;
  var list=[], prevList=[], i, r;
  for(i=0;i<state.history.length;i++){ r=state.history[i]; if(r.t&&r.t>=cutoff)list.push(r); else if(r.t&&r.t>=prevCutoff)prevList.push(r); }
  var c6=0,c5=0,c4=0,c3=0, names6=[], firstSeen={}, nm2, hourMap={};
  for(i=list.length-1;i>=0;i--){ r=list[i];
    if(r.rar===6){ c6++; names6.push(opOf(r.op)?opOf(r.op).name:r.op); }
    else if(r.rar===5)c5++; else if(r.rar===4)c4++; else c3++;
    nm2=opOf(r.op)?opOf(r.op).name:r.op;
    if(!firstSeen[nm2])firstSeen[nm2]=r.t;
    if(r.rar===6&&r.t){ var hhD=new Date(r.t).getHours(); hourMap[hhD]=(hourMap[hhD]||0)+1; }
  }
  var preOps={};
  for(var poI=state.history.length-1;poI>=0;poI--){ var hxP=state.history[poI]; if(hxP.t&&hxP.t<cutoff)preOps[opOf(hxP.op)?opOf(hxP.op).name:hxP.op]=1; else if(hxP.t>=cutoff)break; }
  var newOps=[];
  for(nm2 in firstSeen){ if(firstSeen[nm2]>=cutoff&&!preOps[nm2])newOps.push(nm2); }
  var total=list.length;
  var bestTen=0;
  for(i=0;i<list.length;i++){ var t10=0; for(var tj=i;tj<list.length&&tj<i+10;tj++){ if(list[tj].rar===6)t10++; } if(t10>bestTen)bestTen=t10; }
  var maxG=0,last6=-1, gaps=[], trig=0;
  for(i=0;i<list.length;i++){ if(list[i].rar===6){ if(last6>=0){ var g=i-last6-1; gaps.push(g); if(g>maxG)maxG=g; if(g>=99)trig++; } last6=i; } }
  var prevC6=0;
  for(i=0;i<prevList.length;i++){ if(prevList[i].rar===6)prevC6++; }
  return {days:days,total:total,c6:c6,c5:c5,c4:c4,c3:c3,names6:names6,newOps:newOps,bestTen:bestTen,maxG:maxG,gaps:gaps,trig:trig,hourMap:hourMap,rate6:total?(c6/total*100):0,prevTotal:prevList.length,prevC6:prevC6};
}
function renderReport(days){
  var rep=buildReport(days);
  window.__lastReport=rep;
  var h=[];
  var label=days===7?'周报':'月报';
  if(!rep.total){ h.push('<div class="notice">最近 '+days+' 天暂无抽卡记录</div>'); $('rpOut').innerHTML=h.join(''); return; }
  h.push('<div class="luckbadge lv'+(rep.rate6>=3.4?5:(rep.rate6>=3.1?4:(rep.rate6>=2.6?3:(rep.rate6>=2.2?2:1))))+'"><div class="lb-score">'+rep.rate6.toFixed(2)+'%</div><div class="lb-label">'+label+' · 最近'+days+'天 '+rep.total+'抽 · 6★出率（期望2.89%）</div></div>');
  h.push('<div class="stats-grid">');
  h.push('<div class="stat"><div class="v red">'+rep.c6+'</div><div class="k">6★</div></div>');
  h.push('<div class="stat"><div class="v gold">'+rep.c5+'</div><div class="k">5★（'+(rep.total?(rep.c5/rep.total*100).toFixed(1):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v">'+rep.c4+'</div><div class="k">4★</div></div>');
  h.push('<div class="stat"><div class="v">'+rep.c3+'</div><div class="k">3★</div></div>');
  h.push('<div class="stat"><div class="v gold">'+rep.bestTen+'</div><div class="k">最欧十连</div></div>');
  h.push('<div class="stat"><div class="v'+(rep.maxG>=70?' red':'')+'">'+(rep.maxG||0)+'</div><div class="k">最长非酋</div></div>');
  h.push('<div class="stat"><div class="v'+(rep.trig?' red':'')+'">'+(rep.trig||0)+'</div><div class="k">保底触发（≥99抽）</div></div>');
  h.push('</div>');
  if(rep.prevTotal){
    var d6=rep.c6-rep.prevC6, prevLabel='上一'+(days===7?'周':'月');
    h.push('<div class="notice">📈 环比'+prevLabel+'：'+prevLabel+' '+rep.prevTotal+' 抽 · 6★×'+rep.prevC6+' → 本期 '+rep.c6+' 只'+(d6!==0?'（'+(d6>0?'⏫ 有进步 +'+d6:'⏬ 回落 '+Math.abs(d6))+'）':'（持平）')+'</div>');
  }
  h.push('<div class="notice">⏱ 日均 '+(rep.total/days).toFixed(1)+' 抽 · 日均6★ '+(rep.c6/days).toFixed(2)+' 只</div>');
  if(rep.names6.length)h.push('<div class="notice">✨ 期间6★：'+rep.names6.join('、')+'</div>');
  if(rep.newOps.length)h.push('<div class="notice">🆕 期间新干员：'+rep.newOps.join('、')+'</div>');
  if(rep.gaps&&rep.gaps.length){
    var bk=[0,0,0,0,0,0,0,0,0,0], bmax=1, bi;
    for(bi=0;bi<rep.gaps.length;bi++){ var bix=Math.min(9,Math.floor(rep.gaps[bi]/10)); bk[bix]++; if(bk[bix]>bmax)bmax=bk[bix]; }
    h.push('<h4 class="sect">保底间隔分布（'+rep.gaps.length+' 次间隔）</h4><div class="chart">');
    for(bi=0;bi<10;bi++){ h.push('<div class="crow"><span class="cl">'+(bi*10)+'-'+(bi*10+9)+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(bk[bi]/bmax*100))+'%"></i></div><span class="cv">'+bk[bi]+'</span></div>'); }
    h.push('</div>');
  }
  if(rep.hourMap&&Object.keys(rep.hourMap).length){
    var hmax=1, hk;
    for(hk=0;hk<24;hk++){ if((rep.hourMap[hk]||0)>hmax)hmax=rep.hourMap[hk]; }
    h.push('<h4 class="sect">出货时段（期间6★按小时）</h4><div class="chart">');
    for(hk=0;hk<24;hk++){ var hv=rep.hourMap[hk]||0; h.push('<div class="crow"><span class="cl">'+hk+'时</span><div class="cbar"><i style="width:'+Math.max(1,Math.round(hv/hmax*100))+'%"></i></div><span class="cv'+(hv===hmax&&hv>0?' luck-hi':'')+'">'+hv+'</span></div>'); }
    h.push('</div>');
  }
  $('rpOut').innerHTML=h.join('');
}
function copyReport(rep){
  var NL=String.fromCharCode(10);
  var lines=['【抽卡'+(rep.days===7?'周报':'月报')+'】','期间：最近 '+rep.days+' 天 · '+rep.total+' 抽','6★×'+rep.c6+'（'+rep.rate6.toFixed(2)+'%）· 5★×'+rep.c5+' · 4★×'+rep.c4+' · 3★×'+rep.c3,'最欧十连：'+rep.bestTen+'只6★ · 最长非酋：'+(rep.maxG||0)+'抽','环比上一'+(rep.days===7?'周':'月')+'：'+(rep.prevTotal?rep.prevTotal+' 抽 · 6★×'+rep.prevC6:'暂无数据')+(rep.prevTotal?(' → 本期 '+rep.c6+' 只'+(rep.c6-rep.prevC6>=0?'（+'+(rep.c6-rep.prevC6)+'）':'（'+(rep.c6-rep.prevC6)+'）')):''),'日均 '+(rep.total/rep.days).toFixed(1)+' 抽 · 日均6★ '+(rep.c6/rep.days).toFixed(2),'期间6★：'+(rep.names6.join('、')||'无'),'期间新干员：'+(rep.newOps.join('、')||'无')];
  var text=lines.join(NL);
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('报告已复制'); }
  catch(e){ window.prompt('复制以下内容：', text); }
  ta.remove();
}
var RAR_DB={'玛露希尔':6,'维什戴尔':6,'逻各斯':6,'缪尔赛思':6,'黍':6,'锏':6,'纯烬艾雅法拉':6,'麒麟X夜刀':6,'焰影苇草':6,'圣约送葬人':6,'马鹿':6,'42':6};
var SKIN_META={
 '能天使':{1:{name:'野地秘行',series:'生命之地/I',obtain:'游戏内购买',price:'18源石'},2:{name:'城市骑手',series:'KFC联动',obtain:'联动活动获取',price:'活动限定'},3:{name:'午夜邮差',series:'忒斯特收藏/IX',obtain:'游戏内购买',price:'18源石'}},
 '银灰':{1:{name:'崖心',series:'珊瑚海岸/I',obtain:'游戏内购买',price:'18源石'}},
 '艾雅法拉':{1:{name:'妍华',series:'生命之地/I',obtain:'游戏内购买',price:'18源石'}},
 '史尔特尔':{1:{name:'薄暮',series:'珊瑚海岸/IV',obtain:'游戏内购买',price:'18源石'}},
 '玛恩纳':{1:{name:'骑士精神',series:'无痕行者',obtain:'游戏内购买',price:'18源石'}},
 '塞雷娅':{1:{name:'坚城',series:'？？',obtain:'游戏内购买',price:'18源石'}},
 '煌':{1:{name:'玫兰莎',series:'？？',obtain:'游戏内购买',price:'18源石'}},
 '棘刺':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'18源石'}},
 '泥岩':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'18源石'}},
 '铃兰':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'15源石'}},
 '陈':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'18源石'}},
 '闪灵':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'18源石'}},
 '德克萨斯':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'15源石'}},
 '白面鸮':{1:{name:'？？',series:'？？',obtain:'游戏内购买',price:'15源石'}},
 '阿米娅':{1:{name:'？？',series:'？？',obtain:'主线剧情/活动',price:'活动获取'}},
};
var LOGISTICS_DB={
 '企鹅物流·α':'进驻贸易站时，订单获取效率+25%',
 '物流专家':'进驻贸易站时，订单获取效率+30%，订单上限+6',
 '龙门商法':'进驻贸易站时，订单获取效率+20%',
 '大帝的信任':'进驻贸易站时，订单获取效率+15%，订单上限+4',
 '标准化·α':'进驻制造站时，生产力+15%',
 '标准化·β':'进驻制造站时，生产力+25%',
 '金属工艺·α':'进驻制造站时，生产力+20%',
 '金属工艺·β':'进驻制造站时，生产力+30%',
 '作战指导录像':'进驻制造站时，作战记录类配方生产力+35%',
 '源石工艺·α':'进驻制造站时，源石类配方生产力+25%',
 '源石工艺·β':'进驻制造站时，源石类配方生产力+35%',
 '化学品·α':'进驻制造站时，化学品类配方生产力+20%',
 '化学品·β':'进驻制造站时，化学品类配方生产力+30%',
 '臭鼬':'进驻制造站时，生产黄金配方时可同时生产少量源石碎片',
 '烟火之邀':'进驻制造站时，生产源石类配方时可同时生产少量赤金',
 '线索整理·α':'进驻会客室时，线索搜集速度+15%',
 '线索整理·β':'进驻会客室时，线索搜集速度+25%',
 '线索整合·α':'进驻会客室时，线索搜集速度+20%',
 '线索整合·β':'进驻会客室时，线索搜集速度+30%',
 '感染监测':'进驻宿舍时，所有干员心情回复速度+0.15/小时',
 '康复专家':'进驻宿舍时，所有干员心情回复速度+0.15/小时',
 '外勤专员':'进驻宿舍时，使该宿舍内除自身以外心情未满的干员每小时恢复+0.2',
 '初醒':'进驻宿舍时，该宿舍内所有干员心情每小时恢复+0.15',
 '温暖':'进驻宿舍时，该宿舍内所有干员心情每小时恢复+0.2',
 '备用食材':'进驻宿舍时，该宿舍内所有干员心情每小时恢复+0.1',
 '烹饪':'进驻宿舍时，该宿舍内所有干员心情每小时恢复+0.15',
 '荒野生存·α':'进驻宿舍时，该宿舍内所有干员心情每小时恢复+0.1',
 '荒野生存·β':'进驻宿舍时，该宿舍内所有干员心情每小时恢复+0.2',
 '训练指导·α':'进驻训练室协助位时，干员训练速度+20%',
 '训练指导·β':'进驻训练室协助位时，干员训练速度+30%',
 '专精训练·α':'进驻训练室协助位时，干员训练速度+20%',
 '专精训练·β':'进驻训练室协助位时，干员训练速度+30%',
 '作战经验·α':'进驻训练室协助位时，干员训练速度+15%',
 '作战经验·β':'进驻训练室协助位时，干员训练速度+25%',
 '精英化·α':'进驻训练室协助位时，干员训练速度+25%',
 '精英化·β':'进驻训练室协助位时，干员训练速度+40%',
 '采购·α':'进驻贸易站时，订单获取效率+10%',
 '采购·β':'进驻贸易站时，订单获取效率+20%',
 '批发·α':'进驻贸易站时，订单获取效率+15%',
 '批发·β':'进驻贸易站时，订单获取效率+25%',
};
function parseMatDrops(html){
  var res={fixed:[],prob:[],rare:[]};
  var labels=[['固定掉落','fixed'],['概率掉落','prob'],['小概率掉落','rare']];
  for(var li=0;li<labels.length;li++){
    var idx=html.indexOf(labels[li][0]);
    if(idx<0)continue;
    var seg=html.slice(idx, idx+8000);
    var re=/(?:>|title=")((?:[A-Z]{0,2}[0-9]+|[A-Z]{1,3})(?:-[A-Z0-9]+)+)(?:<| )/g;
    var m;
    while((m=re.exec(seg))){
      var st=m[1];
      if(/^(19|20)[0-9]{2}-/.test(st))continue;
      if(res[labels[li][1]].indexOf(st)<0)res[labels[li][1]].push(st);
    }
  }
  return res;
}
function renderLiveDrops(drops, mn){
  drops=drops||{fixed:[],prob:[],rare:[]};
  var h=['<div class="mat-live"><h4>📡 PRTS 官方掉落（实时）</h4>'];
  var cats=[['fixed','固定掉落'],['prob','概率掉落'],['rare','小概率掉落']];
  var any=false;
  for(var ci=0;ci<cats.length;ci++){
    var list=drops[cats[ci][0]];
    if(!list||!list.length)continue;
    any=true;
    h.push('<div class="mat-live-cat"><b>'+cats[ci][1]+'</b><span>');
    for(var si=0;si<list.length;si++){
      var ch=chapterOf(list[si]);
      h.push('<span class="mat-live-stage">'+esc(list[si])+(ch?' · '+esc(ch):'')+apTxt(matApInfo(list[si], mn))+'</span>');
    }
    h.push('</span></div>');
  }
  if(!any)h.push('<div class="notice">实时同步未获取到数据（上方为本地数据）</div>');
  h.push('</div>');
  return h.join('');
}
var AP_DATA=(typeof DATA!=='undefined'&&DATA.apd)?DATA.apd:{};
function matApInfo(stage, mn){
  try{
    var e=AP_DATA[stage];
    if(!e||!e.per)return undefined;
    var v=e.per[mn];
    return v!==undefined?v:undefined;
  }catch(e2){ return undefined; }
}
var MAT_STAGES_CACHE={};
function matStagesOf(mn){
  if(MAT_STAGES_CACHE[mn]!==undefined)return MAT_STAGES_CACHE[mn];
  var arr=[], k, i;
  var d=MAT_FARM_DB[mn];
  if(d&&d.stages){ for(i=0;i<d.stages.length;i++){ var s=d.stages[i]; if(s.stage&&arr.indexOf(s.stage)<0)arr.push(s.stage); } }
  var b=MAT_BILL[mn];
  if(b){ var cats=['fixed','high','prob','rare','super','extra']; for(k=0;k<cats.length;k++){ var l=b[cats[k]]; if(l)for(i=0;i<l.length;i++){ if(arr.indexOf(l[i])<0)arr.push(l[i]); } } }
  MAT_STAGES_CACHE[mn]=arr;
  return arr;
}
function apTxt(ap){
  if(ap===undefined)return '';
  return ap<1?('（效率极高）'):('（约 '+ap.toFixed(1)+' 理智/个）');
}
function matStagesHtml(mn){
  var b=MAT_BILL[mn]||{};
  var h=[];
  var cats=[['fixed','固定掉落'],['high','大概率'],['prob','概率掉落'],['rare','小概率'],['super','罕见'],['extra','额外物资']];
  var any=false, ci, si;
  for(ci=0;ci<cats.length;ci++){
    var list=b[cats[ci][0]];
    if(!list||!list.length)continue;
    any=true;
    if(!h.length)h.push('<div class="wikisec"><h4>📦 掉落来源（bilibili Wiki 本地数据 · 理智/个为企鹅物流实测）</h4>');
    h.push('<div class="mat-live-cat"><b>'+cats[ci][1]+'</b><span>');
    var sorted=list.slice().sort(function(a,b){ var aa=matApInfo(a,mn), bb=matApInfo(b,mn); if(aa===undefined&&bb===undefined)return 0; if(aa===undefined)return 1; if(bb===undefined)return -1; return aa-bb; });
    for(si=0;si<sorted.length;si++){
      var st=sorted[si], ch=chapterOf(st);
      h.push('<span class="mat-live-stage">'+esc(st)+(ch?' · '+esc(ch):'')+apTxt(matApInfo(st, mn))+'</span>');
    }
    h.push('</span></div>');
  }
  if(b.build){
    if(!h.length)h.push('<div class="wikisec"><h4>🏭 基建生产</h4>');
    h.push('<div class="mat-live-cat"><b>🏭 基建生产</b><span>'+esc(b.build)+'</span></div>');
  }
  if(any||h.length)h.push('</div>');
  if(!any){
    var d=MAT_FARM_DB[mn];
    if(d&&d.stages&&d.stages.length){
      h.push('<div class="wikirows">');
      for(var i=0;i<d.stages.length;i++){
        var st2=d.stages[i];
        var ch2=chapterOf(st2.stage);
        var dropsHtml=(st2.drops&&st2.drops.length)?('<br/>其他产物：'+st2.drops.map(function(x){return matIconHtml(x)+'<span class="mat-drop">'+esc(x)+'</span>';}).join(' ')):'';
        var realAp2=matApInfo(st2.stage, mn);
        h.push('<div class="wrow"><b>'+esc(st2.stage)+'</b><span>'+(ch2?esc(ch2)+' · ':'')+(realAp2!==undefined?apTxt(realAp2):'（无实测掉率）')+dropsHtml+(st2.note?'<br/>'+esc(st2.note):'')+'</span></div>');
      }
      h.push('</div>');
      any=true;
    }
  }
  if(!any)h.push('<div class="notice">该材料暂未收录刷取数据</div>');
  h.push(matRecipeHtml(mn));
  if(Date.now()-WIKI_DOWN_T<300000){
    h.push(renderLiveDrops(null, mn));
  }else{
    h.push('<div class="notice" id="matLive">📡 正在同步 PRTS 官方掉落数据…（需联网）</div>');
    prtsFetch(mn, null, function(txt){
      var out=$('matLive');
      if(!out)return;
      var drops=txt?parseMatDrops(txt):null;
      out.outerHTML=renderLiveDrops(drops, mn);
    }, 'text', 2);
  }
  return h.join('');
}
var MAT_FARM_LIST_CACHE=null;
function matFarmList(){
  if(MAT_FARM_LIST_CACHE)return MAT_FARM_LIST_CACHE;
  var names=[], k;
  for(k in MAT_FARM_DB)if(names.indexOf(k)<0)names.push(k);
  for(k in MAT_BILL){
    var b=MAT_BILL[k];
    if(!b)continue;
    if(MAT_BLACK.indexOf(k)>=0)continue;
    if(b.type==='干员信物')continue;
    if((b.fixed&&b.fixed.length)||(b.high&&b.high.length)||(b.prob&&b.prob.length)||(b.rare&&b.rare.length)||(b.super&&b.super.length)||b.build){
      if(names.indexOf(k)<0)names.push(k);
    }
  }
  MAT_FARM_LIST_CACHE=names.sort();
  return MAT_FARM_LIST_CACHE;
}
function matCat(mn){
  var k=String(mn||'');
  if(k.indexOf('芯片')>=0)return 'chip';
  if(k.indexOf('技巧概要')>=0)return 'skill';
  if(k.indexOf('作战记录')>=0)return 'exp';
  if(k.indexOf('龙门币')>=0||k.indexOf('合成玉')>=0)return 'money';
  var b=MAT_BILL[k];
  var r=b?b.rarity:0;
  if(!r){
    if(k.indexOf('组')>=0||k.indexOf('块')>=0||k.indexOf('聚合')>=0||k.indexOf('双极')>=0||k.indexOf('D32')>=0||k.indexOf('晶体')>=0||k.indexOf('提纯')>=0)r=3;
    else r=1;
  }
  return r<=2?'base':'high';
}
function curMatCat(){
  var chEl=$('matChips'); if(!chEl)return 'all';
  var chips=chEl.querySelectorAll('.mat-chip.on');
  return chips.length?chips[0].getAttribute('data-cat'):'all';
}
var MAT_STATE={q:'',cat:'all'};
var MAT_CAT_LABEL={all:'全部',base:'基础',high:'高级',chip:'芯片',skill:'技能',exp:'经验',money:'特殊'};
function openMatQuery(){
  var h=['<h4 class="sect" style="margin-top:0">🧱 材料刷取查询</h4>'];
  h.push('<div class="wikisearch"><input id="matSearch" placeholder="搜索材料，如：固源岩 / 技巧概要..."/></div>');
  h.push('<div class="mat-chips" id="matChips"></div>');
  h.push('<div class="matgrid" id="matGrid"></div>');
  h.push('<div class="mat-count" id="matCount"></div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var cats=[['all','全部'],['base','基础'],['high','高级'],['chip','芯片'],['skill','技能'],['exp','经验'],['money','特殊']];
  var chEl=$('matChips');
  if(chEl){
    var ch='', i;
    for(i=0;i<cats.length;i++)ch+='<div class="mat-chip'+(cats[i][0]===MAT_STATE.cat?' on':'')+'" data-cat="'+cats[i][0]+'">'+cats[i][1]+'</div>';
    chEl.innerHTML=ch;
    var chips=chEl.querySelectorAll('.mat-chip');
    for(i=0;i<chips.length;i++){
      (function(el){
        el.onclick=function(){
          var all=chEl.querySelectorAll('.mat-chip');
          for(var j=0;j<all.length;j++)all[j].classList.remove('on');
          el.classList.add('on');
          renderMatGrid(($('matSearch')?$('matSearch').value:'').trim(), el.getAttribute('data-cat'));
        };
      })(chips[i]);
    }
  }
  var ms=$('matSearch'); if(ms)ms.value=MAT_STATE.q;
  renderMatGrid(MAT_STATE.q, MAT_STATE.cat);
  if(ms){ var msDl=null; ms.oninput=function(){ clearTimeout(msDl); var v=this.value.trim(); msDl=setTimeout(function(){ renderMatGrid(v, curMatCat()); },150); }; }
}
function renderMatGrid(q, cat){
  var names=matFarmList();
  var h=[], shown=0, i;
  for(i=0;i<names.length;i++){
    if(q&&names[i].indexOf(q)<0)continue;
    if(cat&&cat!=='all'&&matCat(names[i])!==cat)continue;
    shown++;
    var b=MAT_BILL[names[i]];
    var cnt=0;
    if(b)cnt=((b.fixed?b.fixed.length:0)+(b.high?b.high.length:0)+(b.prob?b.prob.length:0)+(b.rare?b.rare.length:0)+(b.super?b.super.length:0));
    else if(MAT_FARM_DB[names[i]]&&MAT_FARM_DB[names[i]].stages)cnt=MAT_FARM_DB[names[i]].stages.length;
    h.push('<div class="mat-item mc-'+matCat(names[i])+'" data-m="'+esc(names[i])+'">'+matIconHtml(names[i])+'<div class="mat-nm">'+esc(names[i])+'</div>'+(cnt?'<div class="mat-cnt">'+cnt+'关</div>':'')+'</div>');
  }
  if(!shown)h.push('<div class="notice">没有匹配的材料</div>');
  $('matGrid').innerHTML=h.join('');
  var mc=$('matCount'); if(mc)mc.textContent='共 '+shown+' 种材料'+(cat&&cat!=='all'?(' · '+MAT_CAT_LABEL[cat]||cat):'');
  var items=$('matGrid').querySelectorAll('.mat-item');
  for(i=0;i<items.length;i++){
    (function(el){
      el.onclick=function(){ openMatDetail(el.getAttribute('data-m')); };
    })(items[i]);
  }
  MAT_STATE.q=q||''; MAT_STATE.cat=cat||'all';
}
function openMatDetail(mn){
  var b=MAT_BILL[mn]||{};
  var h=['<h4 class="sect" style="margin-top:0">🧱 材料详情 · '+esc(mn)+'</h4>'];
  h.push('<button class="mini-btn" id="matBack" style="margin-bottom:8px">← 返回材料列表</button>');
  h.push('<div class="mat-detail-head">'+matIconHtml(mn)+'<span class="mat-detail-name">'+esc(mn)+'</span>'+(b.type?'<span class="mat-tag">'+esc(b.type)+'</span>':'')+(b.rarity?'<span class="mat-tag mat-tag-r'+b.rarity+'">★'+b.rarity+'</span>':'')+'<a class="mini-btn" href="https://prts.wiki/w/'+esc(encodeURIComponent(mn))+'" target="_blank" rel="noopener" style="margin-left:auto;text-decoration:none">🔗 PRTS</a></div>');
  if(b.desc)h.push('<div class="mat-desc">'+esc(b.desc)+'</div>');
  h.push(matStagesHtml(mn));
  $('mBody').innerHTML=h.join('');
  var mb=$('matBack'); if(mb)mb.onclick=function(){ openMatQuery(); };
  openModalBox();
}
function openReport(){
  var h=['<h4 class="sect" style="margin-top:0">📊 抽卡报告</h4><div class="controls" style="margin-bottom:8px"><button class="mini-btn" id="rpWeek">📅 周报（7天）</button><button class="mini-btn" id="rpMonth">📅 月报（30天）</button><button class="mini-btn" id="rpCopy">📋 复制报告</button></div><div id="rpOut"></div>'];
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var rw=$('rpWeek'); if(rw)rw.onclick=function(){ renderReport(7); };
  var rm=$('rpMonth'); if(rm)rm.onclick=function(){ renderReport(30); };
  var rc=$('rpCopy'); if(rc)rc.onclick=function(){ var rr=window.__lastReport; if(!rr){ toast('先生成报告'); return; } copyReport(rr); };
  renderReport(7);
}
function simulatePull(){
  var b=bannerById(state.cur); if(!b)return;
  if(isSelect(b)){ var sChkS=getSel(b); if(sChkS.six.length<minSel(b,6)||sChkS.five.length<minSel(b,5)){ toast('选不满不能抽：至少需 '+minSel(b,6)+' 位6★ + '+minSel(b,5)+' 位5★'); openSelModal(b); return; } }
  var selHint=isSelect(b)?(' · 当前选择 '+esc(selShort(selKey(b)))):'';
  var h=['<h4 class="sect" style="margin-top:0">🧪 模拟抽卡 · '+esc(b.full)+selHint+'</h4>'];
  h.push('<div class="notice">在独立保底进度上模拟 N 抽，展示 6★ 分布与保底触发情况，不影响真实存档与统计</div>');
  h.push('<div class="controls" style="margin-bottom:8px"><span class="notice">模拟抽数：</span><select id="simN"><option value="100">100</option><option value="500">500</option><option value="1000" selected>1000</option><option value="5000">5000</option></select><span class="notice">起始保底：</span><input id="simStart" type="number" min="0" max="99" value="0" style="width:64px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;color:var(--txt);padding:6px 8px;font-size:13px"/><span class="notice">抽（垫刀）</span><button class="mini-btn" id="simGo">开始模拟</button><button class="mini-btn" id="simMulti">📊 模拟10次统计</button></div><div id="simOut"></div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  function simStartV(){ var v=parseInt($('simStart')?$('simStart').value:0,10); if(!v||isNaN(v))v=0; return Math.min(99,Math.max(0,v)); }
  var sg=$('simGo'); if(sg)sg.onclick=function(){ runSim(b, parseInt($('simN').value,10)||1000, simStartV()); };
  var sm2=$('simMulti'); if(sm2)sm2.onclick=function(){ runSimMulti(b, parseInt($('simN').value,10)||1000, 10, simStartV()); };
}
function simRunOnce(b, n, startFails){
  var sb={col:state.collection.slice(), got6:false, sel:{}};
  var realSel=state.sel[b.id];
  if(isSelect(b)&&realSel){ sb.sel[b.id]={six:(realSel.six||[]).slice(), five:(realSel.five||[]).slice()}; }
  var st={fails:Math.min(99,Math.max(0,startFails||0)),batch:[]}, c6=0,c5=0,gaps=[],trig=0,up6=0,up5=0,i,j2,rar,op;
  for(i=0;i<n;i++){
    var p6=Math.min(0.02+Math.max(0,st.fails-49)*0.02,1);
    if(st.batch.length===9){
      var has5=false;
      for(j2=0;j2<st.batch.length;j2++){ if(st.batch[j2]>=5)has5=true; }
      rar=has5?rollRar(p6):(Math.random()<p6?6:5);
    }else rar=rollRar(p6);
    if(rar===6){ c6++; if(st.fails>=99)trig++; gaps.push(st.fails+1); st.fails=0; op=simPick6(b,sb); if(isUp6SB(b,op,sb))up6++; }
    else if(rar===5){ c5++; op=simPick5(b,sb); if(isUp5SB(b,op,sb))up5++; }
    else st.fails++;
    st.batch.push(rar);
    if(st.batch.length===10)st.batch=[];
  }
  return {c6:c6,c5:c5,gaps:gaps,trig:trig,up6:up6,up5:up5};
}
function runSim(b, n, startFails){
  var r=simRunOnce(b,n,startFails), c6=r.c6, c5=r.c5, gaps=r.gaps, trig=r.trig, up6=r.up6, up5=r.up5;
  var i;
  var rate6=n?(c6/n*100):0, sumG=0, avgG=0, maxG=0, minG=9999;
  for(i=0;i<gaps.length;i++){ sumG+=gaps[i]; if(gaps[i]>maxG)maxG=gaps[i]; if(gaps[i]<minG)minG=gaps[i]; }
  if(gaps.length)avgG=sumG/gaps.length;
  var lv=rate6>=3.4?5:(rate6>=3.1?4:(rate6>=2.6?3:(rate6>=2.2?2:1)));
  var h=['<div class="luckbadge lv'+lv+'"><div class="lb-score">'+rate6.toFixed(2)+'%</div><div class="lb-label">模拟 '+n+' 抽 · 6★出率（期望 2.89%）</div></div>'];
  h.push('<div class="stats-grid">');
  h.push('<div class="stat"><div class="v red">'+c6+'</div><div class="k">6★总数</div></div>');
  h.push('<div class="stat"><div class="v gold">'+up6+'</div><div class="k">UP 6★命中'+(c6?'（'+(up6/c6*100).toFixed(0)+'%）':'')+'</div></div>');
  h.push('<div class="stat"><div class="v gold">'+c5+'</div><div class="k">5★总数（'+(n?(c5/n*100).toFixed(1):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v'+(trig>0?' red':'')+'">'+trig+'</div><div class="k">保底触发（≥99抽）</div></div>');
  h.push('<div class="stat"><div class="v">'+(gaps.length?avgG.toFixed(1):'—')+'</div><div class="k">平均间隔（期望34.6）</div></div>');
  h.push('<div class="stat"><div class="v">'+(gaps.length?minG+' ~ '+maxG:'—')+'</div><div class="k">最短 ~ 最长间隔</div></div>');
  h.push('<div class="stat"><div class="v">'+(gaps.length?Math.round(34.6/avgG*100):'—')+'</div><div class="k">间隔效率（%）</div></div>');
  h.push('</div>');
  h.push('<div class="notice">💰 本次模拟 '+n+' 抽 ≈ <b>'+n*600+'</b> 合成玉（约 '+(Math.round(n*600/180*10)/10)+' 源石，按 180 合成玉/源石计）</div>');
  var diffTxt=rate6>=2.89?('高于期望 '+(n?(c6-Math.round(n*0.0289)):0)+' 只'):('低于期望 '+(n?Math.round(n*0.0289)-c6:0)+' 只');
  var upShareN=upShare(b,isSelect(b)?selUps(b,6):b.six);
  var upExpTxt=upShareN>=100?'当期6★必为UP':('UP 6★命中期望约 '+(b.six.length>=2?70:50)+'%');
  var real6n=0, ri6;
  for(ri6=0;ri6<state.history.length;ri6++){ if(state.history[ri6].rar===6)real6n++; }
  var realRate=state.history.length?(real6n/state.history.length*100):0;
  h.push('<div class="notice">6★率'+diffTxt+' · UP 6★命中 <b style="color:var(--acc)">'+up6+'</b> 只（'+upExpTxt+'）· 本次模拟未写入存档 · 结果随每次模拟浮动</div>');
  if(state.history.length>=20)h.push('<div class="notice">对比真实记录：你的真实6★率 <b style="color:var(--gold)">'+realRate.toFixed(2)+'%</b>（'+state.history.length+' 抽）'+(rate6>realRate?' · 本次模拟比真实更欧':' · 本次模拟比真实更非')+'</div>');
  h.push('<button class="mini-btn" id="simAgain" style="margin:6px auto;display:block">🔁 再来一次</button>');
  $('simOut').innerHTML=h.join('');
  var sa=$('simAgain'); if(sa)sa.onclick=function(){ runSim(b, n, startFails); };
}
function runSimMulti(b, n, times, startFails){
  times=Math.min(50,Math.max(2,times||10));
  var c6s=[], trigs=0, gapsAll=[], upAll=0, t2, g2;
  for(t2=0;t2<times;t2++){
    var rr=simRunOnce(b,n,startFails);
    c6s.push(rr.c6);
    trigs+=rr.trig;
    upAll+=rr.up6;
    for(g2=0;g2<rr.gaps.length;g2++)gapsAll.push(rr.gaps[g2]);
  }
  var sum=0, mx=0, mn=9999, i2;
  for(i2=0;i2<c6s.length;i2++){ sum+=c6s[i2]; if(c6s[i2]>mx)mx=c6s[i2]; if(c6s[i2]<mn)mn=c6s[i2]; }
  var avg=sum/times, totalPulls=n*times;
  var rate=totalPulls?(sum/totalPulls*100):0;
  var gsum=0, gmx=0, gmn=9999;
  for(i2=0;i2<gapsAll.length;i2++){ gsum+=gapsAll[i2]; if(gapsAll[i2]>gmx)gmx=gapsAll[i2]; if(gapsAll[i2]<gmn)gmn=gapsAll[i2]; }
  var gavg=gapsAll.length?gsum/gapsAll.length:0;
  var lv=rate>=3.4?5:(rate>=3.1?4:(rate>=2.6?3:(rate>=2.2?2:1)));
  var h=['<div class="luckbadge lv'+lv+'"><div class="lb-score">'+rate.toFixed(2)+'%</div><div class="lb-label">'+times+' × '+n+' 抽 · 平均6★率（期望 2.89%）</div></div>'];
  h.push('<div class="stats-grid">');
  h.push('<div class="stat"><div class="v red">'+avg.toFixed(1)+'</div><div class="k">平均6★数/次</div></div>');
  h.push('<div class="stat"><div class="v">'+mn+' ~ '+mx+'</div><div class="k">最少 ~ 最多6★</div></div>');
  h.push('<div class="stat"><div class="v">'+(mx-mn)+'</div><div class="k">波动范围</div></div>');
  h.push('<div class="stat"><div class="v'+(trigs>0?' red':'')+'">'+trigs+'</div><div class="k">保底触发总次（'+times+'次模拟）</div></div>');
  h.push('<div class="stat"><div class="v gold">'+(upAll/times).toFixed(1)+'</div><div class="k">平均UP 6★命中/次</div></div>');
  h.push('<div class="stat"><div class="v">'+(gapsAll.length?(gmn+' ~ '+gmx):'—')+'</div><div class="k">间隔范围</div></div>');
  h.push('<div class="stat"><div class="v">'+(gavg?gavg.toFixed(1):'—')+'</div><div class="k">平均间隔（期望34.6）</div></div>');
  h.push('</div>');
  h.push('<h4 class="sect">每次模拟6★数分布</h4><div class="chart">');
  var cmax=1;
  for(i2=0;i2<c6s.length;i2++){ if(c6s[i2]>cmax)cmax=c6s[i2]; }
  for(i2=0;i2<c6s.length;i2++){
    h.push('<div class="crow"><span class="cl">第'+(i2+1)+'次</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(c6s[i2]/cmax*100))+'%"></i></div><span class="cv'+(c6s[i2]>=mx?' luck-hi':'')+'">'+c6s[i2]+'只</span></div>');
  }
  h.push('</div>');
  h.push('<div class="notice">多次模拟展示随机波动：即使期望约 2.89%，单次结果也会在平均附近起伏 · 模拟不写入存档</div>');
  h.push('<button class="mini-btn" id="simMultiAgain" style="margin:6px auto;display:block">🔁 再模拟10次</button>');
  $('simOut').innerHTML=h.join('');
  var sma=$('simMultiAgain'); if(sma)sma.onclick=function(){ runSimMulti(b,n,times); };
}
function openWishList(){
  var wish=state.wish||[];
  var h=['<h4 class="sect" style="margin-top:0">💝 心愿单（'+wish.length+'）</h4>'];
  if(!wish.length){
    h.push('<div class="notice">心愿单为空 · 在干员详情点击「💝 心愿单」加入想抽的干员，抽到会自动移出</div>');
  } else {
    var gotN=0, i, o;
    for(i=0;i<wish.length;i++){ if(state.collection.indexOf(wish[i])>=0)gotN++; }
    h.push('<div class="notice">已拥有 <b>'+gotN+'</b> / '+wish.length+' · 点击干员查看详情，点击 📌 卡池快速跳转</div>');
    h.push('<div class="wishgrid">');
    for(i=0;i<wish.length;i++){
      o=opOf(wish[i]); if(!o)continue;
      var got=state.collection.indexOf(wish[i])>=0;
      var srcs=opBanners[wish[i]]||[];
      var poolTxt='';
      if(srcs.length){
        var latest=srcs[srcs.length-1];
        var lb=bannerById(latest.id);
        if(lb)poolTxt='<span class="wishpool jump" data-bid="'+lb.id+'">📌 '+esc(lb.full.slice(0,14))+'</span>';
      }
      h.push('<div class="wish-item r'+o.rarity+'" data-op="'+esc(wish[i])+'"><img loading="lazy" src="'+esc(opArtT(o))+'" alt=""/><div class="wn">'+esc(o.name)+'</div><div class="wr">'+stars(o.rarity)+'</div>'+(got?'<div class="wgot">✓ 已拥有</div>':'')+poolTxt+'</div>');
    }
    h.push('</div>');
    h.push('<button class="mini-btn warn" id="btnWishClear" style="margin:10px auto;display:block">🗑 清空心愿单</button>');
    if(gotN>0)h.push('<button class="mini-btn" id="btnWishGot" style="margin:6px auto;display:block">✔️ 移除已拥有（'+gotN+'）</button>');
  }
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var wc=$('btnWishClear'); if(wc)wc.onclick=function(){ if(confirm('确定清空心愿单吗？')){ state.wish=[]; save(); openWishList(); } };
  var wg=$('btnWishGot'); if(wg)wg.onclick=function(){ var ns2=(state.wish||[]).filter(function(w){ return state.collection.indexOf(w)<0; }); state.wish=ns2; save(); toast('已移除 '+gotN+' 名已拥有干员'); openWishList(); };;
  var items=$('mBody').querySelectorAll('.wish-item');
  for(var wi7=0;wi7<items.length;wi7++){ (function(el){ el.onclick=function(){ openModal(el.getAttribute('data-op')); }; })(items[wi7]); }
  var wps=$('mBody').querySelectorAll('.wishpool.jump');
  for(var wi8=0;wi8<wps.length;wi8++){ (function(el){ el.onclick=function(e){ if(e.stopPropagation)e.stopPropagation(); jumpBanner(el.getAttribute('data-bid')); }; })(wps[wi8]); }
}
function renderStats(){
  var b=bannerById(state.cur), st=state.pity[pityKey(b)]||{fails:0}, p6=Math.min(0.02+Math.max(0,st.fails-49)*0.02,1);
  var hist=state.history, c6=0,c5=0,c4=0,i;
  var today0=new Date(), dayStart=new Date(today0.getFullYear(),today0.getMonth(),today0.getDate()).getTime(), wkStart=Date.now()-7*86400000;
  var tToday=0,t6Today=0,w6=0;
  for(i=0;i<hist.length;i++){ var hhS=hist[i]; if(hhS.rar===6)c6++; else if(hhS.rar===5)c5++; else if(hhS.rar===4)c4++; if(hhS.t>=dayStart){ tToday++; if(hhS.rar===6)t6Today++; } if(hhS.t>=wkStart&&hhS.rar===6)w6++; }
  var rate6=hist.length?(c6/hist.length*100).toFixed(2)+'%':'—';
  var g=[];
  g.push(['距上次6★',st.fails+' 抽','red']);
  g.push(['下次6★概率',(p6*100).toFixed(1)+'%','gold']);
  g.push(['本服总抽数',hist.length>=1000?hist.length.toLocaleString():hist.length,'']);
  g.push(['本次会话抽数',sessPulls,'']);
  g.push(['6★总数',c6,'orange']);
  g.push(['6★出率',rate6,'']);
  g.push(['5★总数',c5,'']);
  g.push(['4★总数',c4,'']);
  g.push(['已拥有干员',state.collection.length+' / '+totalOps(),'']);
  g.push(['今日抽数',tToday>=1000?tToday.toLocaleString():tToday,'']);
  g.push(['今日6★',t6Today,'orange']);
  g.push(['近7天6★',w6,'gold']);
  var dupN=0, dk;
  for(dk in (state.opCnt||{})){ if(state.opCnt[dk]>1)dupN+=state.opCnt[dk]-1; }
  g.push(['重复干员',dupN+' 次','']);
  var totTok=0, tk2;
  for(tk2 in state.spark){ totTok+=state.spark[tk2]; }
  g.push(['限定契约',totTok+' 张','gold']);
  g.push(['成就达成',achCount()+' / '+calcAch().list.length,'gold']);
  var h=[];
  for(i=0;i<g.length;i++){
    h.push('<div class="stat"><div class="v '+(g[i][2]||'')+'">'+g[i][1]+'</div><div class="k">'+g[i][0]+'</div></div>');
  }
  $('statsGrid').innerHTML=h.join('');
}
function totalOps(){ return Object.keys(opByName).length; }
var RARITY_GROUPS=null;
function rarityGroups(){
  if(RARITY_GROUPS)return RARITY_GROUPS;
  RARITY_GROUPS={6:[],5:[],4:[],3:[]};
  for(var k5 in opByName){ var r5=opByName[k5].rarity; if(RARITY_GROUPS[r5])RARITY_GROUPS[r5].push(k5); }
  return RARITY_GROUPS;
}
var histF='all', histT='all', histTime='all', histN=60, histOp='', histSearch='', histGap='all', histRar='all', histBid='';
var HIST_FILTER_CACHE=null, HIST_FILTER_KEY='';
function histFilteredList(){
  var key=histF+':'+histRar+':'+histT+':'+histTime+':'+(histOp||'')+':'+(histBid||'')+':'+(histSearch||'')+':'+histGap+':'+state.history.length+':'+STATE_VER;
  if(HIST_FILTER_CACHE&&HIST_FILTER_KEY===key)return HIST_FILTER_CACHE;
  var all=state.history;
  var nowH=new Date();
  var dayS=new Date(nowH.getFullYear(),nowH.getMonth(),nowH.getDate()).getTime();
  var weekS=dayS-7*86400000;
  var monthS=new Date(nowH.getFullYear(),nowH.getMonth(),1).getTime();
  // 在完整抽卡序列上预计算"距上次6★"间隔（history 头=最新；gapArr[i]=all[i] 距更早方向最近6★的抽数，其后无6★则为-1）
  // 先算间隔再过滤，保证筛选（稀有度/卡池/搜索）不会扭曲间隔数值
  var gapArr=[], gi6=-1, gi;
  for(gi=all.length-1;gi>=0;gi--){
    if(all[gi].rar===6){ gi6=gi; gapArr[gi]=0; }
    else gapArr[gi]=(gi6>=0)?(gi6-gi):-1;
  }
  var list=[], i;
  for(i=0;i<all.length;i++){
    var hh=all[i];
    if(histF!=='all'&&String(hh.rar)!==histF)continue;
    if(histRar!=='all'&&String(hh.rar)!==histRar)continue;
    if(histT!=='all'&&(hh.type||'event')!==histT)continue;
    if(histTime==='today'&&(!hh.t||hh.t<dayS))continue;
    if(histTime==='week'&&(!hh.t||hh.t<weekS))continue;
    if(histTime==='month'&&(!hh.t||hh.t<monthS))continue;
    if(histOp&&hh.op!==histOp)continue;
    if(histBid){
      var hbIdx=histBid.indexOf(':');
      var wantBid=hbIdx>=0?histBid.slice(0,hbIdx):histBid;
      var wantSel=hbIdx>=0?histBid.slice(hbIdx+1):'';
      if(hh.bid!==wantBid)continue;
      if(wantSel&&(hh.sel||'')!==wantSel)continue;
    }
    if(histSearch){
      var o0=opOf(hh.op);
      var hay=(o0?o0.name:hh.op)+' '+(hh.bn||'');
      if(hay.indexOf(histSearch)<0)continue;
    }
    list.push(hh);
    try{ Object.defineProperty(list[list.length-1],'_gap',{value:gapArr[i],enumerable:false,writable:true,configurable:true}); }
    catch(e){ list[list.length-1]._gap=gapArr[i]; }
  }
  // 间隔筛选
  if(histGap!=='all'){
    var filtered=[];
    for(i=0;i<list.length;i++){
      var g=list[i]._gap;
      if(histGap==='gap1'&&g>=0&&g<=20)filtered.push(list[i]);
      else if(histGap==='gap2'&&g>=21&&g<=49)filtered.push(list[i]);
      else if(histGap==='gap3'&&g>=50&&g<=89)filtered.push(list[i]);
      else if(histGap==='gap4'&&g>=90&&g<=99)filtered.push(list[i]);
      else if(histGap==='gap5'&&g>=100)filtered.push(list[i]);
    }
    list=filtered;
  }
  HIST_FILTER_CACHE=list; HIST_FILTER_KEY=key;
  return list;
}
function renderHistory(){
  var hbc0=$('btnHistCur');
  if(hbc0){ var curBid0=state.cur||''; var hbBid0=histBid?(histBid.indexOf(':')>=0?histBid.slice(0,histBid.indexOf(':')):histBid):''; if(histBid&&hbBid0!==curBid0)histBid=''; hbc0.classList.toggle('on',!!histBid); hbc0.textContent=histBid?'🎯 当前池 ✓':'🎯 当前池'; }
  var list=histFilteredList();
  var show=list.slice(0,histN);
  var h=[],r,o,lastDay='',i;
  for(i=0;i<show.length;i++){
    r=show[i]; o=opOf(r.op);
    var dayKey='';
    if(r.t){ var dt2=new Date(r.t); dayKey=dt2.getFullYear()+'-'+(dt2.getMonth()+1)+'-'+dt2.getDate(); }
    if(dayKey&&dayKey!==lastDay){ lastDay=dayKey; h.push('<div class="histday">'+dayKey+'</div>'); }
    var gapTxt='';
    if(r._gap===0)gapTxt='<span class="hgap six">🎯 6★</span>';
    else if(r._gap>0)gapTxt='<span class="hgap">距上次6★ '+r._gap+' 抽</span>';
    var selTag=r.sel&&r.sel.indexOf('|')>=0?'<span class="hsel">'+esc(selShort(r.sel))+'</span>':'';
    h.push('<div class="hitem r'+r.rar+'"><span class="star">'+stars(r.rar)+'</span><span class="hopname'+(histOp===r.op?' on':'')+'" data-op="'+esc(r.op)+'">'+esc(o?o.name:r.op)+'</span>'+gapTxt+selTag+(r.bid?'<span class="hbn jump" data-bid="'+esc(r.bid)+'">'+esc(r.bn||'')+'</span>':'')+'<span class="ht">'+relTime(r.t)+'</span></div>');
  }
  var fc6=0,fc5=0;
  for(var fi2=0;fi2<list.length;fi2++){ if(list[fi2].rar===6)fc6++; else if(list[fi2].rar===5)fc5++; }
  h.push('<div class="hitem" style="justify-content:center">');
  if(show.length<list.length)h.push('<button class="mini-btn" id="histMore">加载更多（'+list.length+'条，已显示'+show.length+'）</button>');
  else if(list.length)h.push('<span style="color:#5a6c8e">共 '+list.length+' 条记录（6★×'+fc6+' · 5★×'+fc5+' · 6★率 '+(list.length?(fc6/list.length*100).toFixed(1):0)+'%）</span>');
  if(list.length&&(histF!=='all'||histT!=='all'||histTime!=='all'||histOp||histSearch||histGap!=='all'||histBid))h.push('<button class="mini-btn" id="btnExportHistFilt" style="margin-left:8px">📤 导出当前筛选</button><button class="mini-btn" id="btnCopyHistFilt" style="margin-left:8px">📋 复制当前筛选</button>');
  else if(histF!=='all'||histRar!=='all'||histT!=='all'||histTime!=='all'||histOp||histSearch||histGap!=='all'||histBid)h.push('<span style="color:#5a6c8e">没有符合条件的记录</span>');
  else h.push('<span style="color:#5a6c8e">暂无记录，开始抽卡吧</span>');
  h.push('</div>');
  if(list.length>=30){
    var segN=Math.ceil(list.length/50), segR=[], si7;
    for(si7=0;si7<segN;si7++)segR.push(0);
    for(si7=0;si7<list.length;si7++){ if(list[si7].rar===6)segR[Math.floor(si7/50)]++; }
    var segMax=1;
    for(si7=0;si7<segR.length;si7++){ if(segR[si7]>segMax)segMax=segR[si7]; }
    h.push('<div class="histtrend"><span class="ht-label">6★率趋势（每50抽）</span><div class="ht-bars">');
    for(si7=segR.length-1;si7>=0;si7--){ var luck2=segR[si7]/1.445*100; h.push('<div class="ht-cell"><i style="height:'+Math.max(4,Math.round(segR[si7]/segMax*100))+'%" class="'+(luck2>=130?'hi':(luck2<60?'lo':''))+'"></i><b>'+(segR[si7]||'')+'</b></div>'); }
    h.push('</div></div>');
  }
  if(isMobile()&&state.history.length>=2000)h.push('<div class="notice" style="color:#c9a14a">已保留最近 '+state.history.length+' 条记录（2000 条上限，最早的记录会被截断）</div>');
  $('history').innerHTML=h.join('');
  var hef=$('btnExportHistFilt'); if(hef)hef.onclick=function(){ exportHistory(true); };
  var chf=$('btnCopyHistFilt'); if(chf)chf.onclick=function(){ copyHistoryCsv(true); };
  var hm=$('histMore');
  if(hm)hm.onclick=function(){ histN+=60; renderHistory(); };
  var hc=$('history'); if(hc)hc.onclick=function(e){ var t=e.target; if(t&&t.classList){ if(t.classList.contains('hopname')){ histOp=(histOp===t.getAttribute('data-op'))?'':t.getAttribute('data-op'); histN=60; renderHistory(); } else if(t.classList.contains('jump')){ jumpBanner(t.getAttribute('data-bid')); } } };
}
var colF='all', colP='all', colSort='rarity', colSearch='', colNation='all';
var NATION_CN={'rhodes':'罗德岛','lungmen':'龙门','ursus':'乌萨斯','victoria':'维多利亚','yan':'炎国','columbia':'哥伦比亚','leithania':'莱塔尼亚','sargon':'萨尔贡','kjerag':'谢拉格','sami':'萨米','siracusa':'叙拉古','bolivar':'玻利瓦尔','rim':'雷姆必拓','laterano':'拉特兰','iberia':'伊比利亚','minos':'米诺斯','aegir':'阿戈尔','higashi':'东国','kazimierz':'卡西米尔','gaul':'高卢','durin':'杜林','abyssal':'深海猎人','sui':'岁','karlan':'卡兰','siracusa2':'叙拉古','?':'未知'};
var COL_SORT_CACHE=null, COL_SORT_KEY='';
function renderCollection(){
  var names;
  var colCacheKey=colSort+':'+STATE_VER+':'+((state.favOps&&Object.keys(state.favOps).length)||0);
  if(COL_SORT_KEY===colCacheKey&&COL_SORT_CACHE){ names=COL_SORT_CACHE; }
  else{
    var colPos2={}, cpi2;
    if(colSort==='got'){ for(cpi2=0;cpi2<state.collection.length;cpi2++)colPos2[state.collection[cpi2]]=cpi2; }
    names=Object.keys(opByName).sort(function(a,b){
    if(colSort==='fav'){ var fa=state.favOps&&state.favOps[a]?1:0, fb=state.favOps&&state.favOps[b]?1:0; if(fa!==fb)return fb-fa; }
    if(colSort==='got'){ var ia2=colPos2[a]; if(ia2===undefined)ia2=999999; var ib2=colPos2[b]; if(ib2===undefined)ib2=999999; if(ia2!==ib2)return ia2-ib2; }
    if(colSort==='cnt'){ var ca2=(state.opCnt&&state.opCnt[a])||0, cb2=(state.opCnt&&state.opCnt[b])||0; if(ca2!==cb2)return cb2-ca2; }
    if(colSort==='name')return a.localeCompare(b,'zh');
    if(colSort==='prof'){ var pa=(opByName[a]&&opByName[a].prof)||'', pb=(opByName[b]&&opByName[b].prof)||''; return pa.localeCompare(pb,'zh')||opByName[b].rarity-opByName[a].rarity; }
    return opByName[b].rarity-opByName[a].rarity||a.localeCompare(b,'zh');
  });
    COL_SORT_KEY=colCacheKey; COL_SORT_CACHE=names;
  }
  var h=[],i,o;
  var colSet={}, csi;
  for(csi=0;csi<state.collection.length;csi++)colSet[state.collection[csi]]=1;
  var wishSet={}, wsi2;
  if(state.wish)for(wsi2=0;wsi2<state.wish.length;wsi2++)wishSet[state.wish[wsi2]]=1;
  var nowCol=Date.now();
  for(i=0;i<names.length;i++){
    o=opOf(names[i]); if(!o)continue;
    var got=colSet[names[i]]?1:0;
    if(colF==='miss'&&got)continue;
    if(colF==='lim'&&!limitedOps[names[i]])continue;
    if(colF==='favop'&&!(state.favOps&&state.favOps[names[i]]))continue;
    if(colF==='wish'&&!wishSet[names[i]])continue;
    if(colF!=='all'&&colF!=='miss'&&colF!=='lim'&&colF!=='favop'&&colF!=='wish'&&String(o.rarity)!==colF)continue;
    if(colP!=='all'&&o.prof!==colP)continue;
    if(colNation!=='all'){ var natName=NATION_CN[o.nation]||o.nation||'未知'; if(natName!==colNation)continue; }
    if(colSearch&&o.name.indexOf(colSearch)<0)continue;
    var pul=(newPulse[names[i]]&&(nowCol-newPulse[names[i]])<20000);
    var ocnt=(state.opCnt||{})[names[i]]||0;
    h.push('<div class="cop'+(got?'':' miss')+(pul?' new':'')+(wishSet[names[i]]?' wished':'')+'" data-op="'+esc(names[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>'+(state.favOps&&state.favOps[names[i]]?'<div class="favstar">★</div>':'')+(wishSet[names[i]]?'<div class="wishmark">💝</div>':'')+(!got&&!wishSet[names[i]]?'<button class="quickwish" data-op="'+esc(names[i])+'" title="加入心愿单">💝</button>':'')+'<div class="cs">'+esc(o.name)+'</div>'+(ocnt>1?'<div class="cdup">×'+ocnt+'</div>':'')+'<div class="nb"></div></div>');
  }
  $('collection').innerHTML=h.join('');
  var cc=$('colCount'); if(cc)cc.textContent='已拥有 '+state.collection.length+' / '+totalOps()+' · 未拥有 '+(totalOps()-state.collection.length);
  var cc2=$('colRarity'); if(cc2){ var rk=[6,5,4,3], rh=['<div class="colrar">'], rn, rt, rgot, rgG;
    for(rn=0;rn<rk.length;rn++){ rt=rk[rn]; rgot=0; rgG=rarityGroups()[rt]||[]; for(var rgi2=0;rgi2<rgG.length;rgi2++){ if(colSet[rgG[rgi2]])rgot++; } rh.push('<span class="cr">'+rt+'★<b>'+rgot+'/'+rgG.length+'</b></span>'); }
    rh.push('</div>'); cc2.innerHTML=rh.join(''); }
  var cb=$('colBar'); if(cb)cb.innerHTML='<i style="width:'+(totalOps()?Math.round(state.collection.length/totalOps()*100):0)+'%"></i>';
  var colWrap=$('collection');
  if(colWrap&&!colWrap._delegated){ colWrap._delegated=true; colWrap.onclick=function(e){ var t=e.target; while(t&&t!==this){ if(t.classList&&t.classList.contains('quickwish')){ var qop=t.getAttribute('data-op'); if(!state.wish)state.wish=[]; if(state.wish.indexOf(qop)<0){ state.wish.push(qop); save(); toast('💝 已加入心愿单'); renderCollection(); } return; } if(t.classList&&t.classList.contains('cop')){ openModal(t.getAttribute('data-op')); return; } t=t.parentNode; } }; }
}
function openModal(opName){
  var o=opOf(opName); if(!o)return;
  var h=[];
  h.push('<button class="mini-btn" id="btnFavOp" style="margin-bottom:8px">'+(state.favOps&&state.favOps[opName]?'⭐ 已收藏':'☆ 收藏干员')+'</button><button class="mini-btn" id="btnWiki" style="margin-bottom:8px;margin-left:8px">📊 Wiki数据</button><button class="mini-btn" id="btnSkins" style="margin-bottom:8px;margin-left:8px">🎨 皮肤</button><button class="mini-btn" id="btnWish" style="margin-bottom:8px;margin-left:8px">'+(state.wish&&state.wish.indexOf(opName)>=0?'💝 已心愿':'💝 心愿单')+'</button>');
  h.push('<div class="mhead"><div class="mart" style="cursor:zoom-in"><img loading="lazy" id="martImg" src="'+esc(opArtT(o))+'" data-a="'+esc(o.art||'')+'" data-b="'+esc(avUrl(o))+'" onerror="this.onerror=null;this.src=this.dataset.fb" data-fb="'+esc(o.art||opArtT(o))+'" alt=""/></div><div class="minfo">');
  h.push('<h2>'+esc(o.name)+'</h2>');
  h.push('<div class="stars">'+stars(o.rarity)+'</div>');
  h.push('<div class="kv"><b>职业</b>'+esc(o.prof||'—')+'</div>');
  h.push('<div class="kv"><b>阵营</b>'+esc(o.nation||'—')+'</div>');
  h.push('<div class="kv"><b>标签</b>'+esc(o.tag||'—')+'</div>');
  try{
    var ciX=wikiCache[opName]&&wikiCache[opName].charInfo;
    if(ciX){
      var fmR=ciX.match(/\|种族=([^\n]*)/); if(fmR&&fmR[1])h.push('<div class="kv"><b>种族</b>'+esc(wikiClean(fmR[1]))+'</div>');
      var fmS=ciX.match(/\|性别=([^\n]*)/); if(fmS&&fmS[1])h.push('<div class="kv"><b>性别</b>'+esc(wikiClean(fmS[1]))+'</div>');
      var fmA=ciX.match(/\|画师=([^\n]*)/); if(fmA&&fmA[1])h.push('<div class="kv"><b>画师</b>'+esc(wikiClean(fmA[1]))+'</div>');
      var fmC=ciX.match(/\|CV=([^\n]*)/); if(fmC&&fmC[1])h.push('<div class="kv"><b>声优</b>'+esc(wikiClean(fmC[1]))+'</div>');
      var fmD=ciX.match(/\|出生年月=([^\n]*)/); if(fmD&&fmD[1])h.push('<div class="kv"><b>出生年月</b>'+esc(wikiClean(fmD[1]))+'</div>');
      var fmH=ciX.match(/\|身高=([^\n]*)/); if(fmH&&fmH[1])h.push('<div class="kv"><b>身高</b>'+esc(wikiClean(fmH[1]))+'</div>');
      var fmN=ciX.match(/\|干员编号=([^\n]*)/); if(fmN&&fmN[1])h.push('<div class="kv"><b>编号</b>'+esc(wikiClean(fmN[1]))+'</div>');
    }
  }catch(e){}
  try{
    var ciChar2=wikiCache[opName]&&wikiCache[opName].charInfo;
    if(ciChar2){ var fm2=ciChar2.match(new RegExp('\\|特性=([^\\n]*)')); if(fm2&&fm2[1])h.push('<div class="kv"><b>特性</b>'+esc(wikiClean(fm2[1]))+'</div>'); }
  }catch(e){}
  try{
    var sc4=loadSkinCache(opName);
    if(sc4&&sc4.length){ var skn4=0; for(var sk4i=0;sk4i<sc4.length;sk4i++){ if(!(sc4[sk4i].no==='0'||sc4[sk4i].no===0))skn4++; } if(skn4)h.push('<div class="kv"><b>皮肤</b>'+skn4+' 套（点击上方 🎨 皮肤 查看）</div>'); }
  }catch(e){}
  h.push('<div class="kv"><b>获取</b>'+(state.collection.indexOf(opName)>=0?'已拥有':'未获得')+(limitedOps[opName]?' · <span style="color:#ff6ec7">👑 限定干员</span>':'')+(o.gift?' · <span style="color:#ff9a2e">🎁 活动赠送干员</span>':'')+(o.collabOp?' · <span style="color:#c96ab6">🔗 联动限定</span>':'')+'</div>');
  var opC=(state.opCnt&&state.opCnt[opName])||0;
  var pullsOfOp=0, pi9;
  for(pi9=0;pi9<state.history.length;pi9++){ if(state.history[pi9].op===opName)pullsOfOp++; }
  h.push('<div class="kv"><b>已获得</b>'+opC+' 次（含抽卡/兑换/免费领取）'+(pullsOfOp>0?(' · 其中抽卡 '+pullsOfOp+' 次'):'')+'</div>');
  var gotIdx=state.collection.indexOf(opName);
  if(gotIdx>=0)h.push('<div class="kv"><b>获得顺序</b>第 '+(gotIdx+1)+' 个</div>');
  var firstT=null;
  for(var fi=state.history.length-1;fi>=0;fi--){ if(state.history[fi].op===opName){ firstT=state.history[fi].t; break; } }
  var lastT=null;
  for(var fl=0;fl<state.history.length;fl++){ if(state.history[fl].op===opName){ lastT=state.history[fl].t; break; } }
  if(firstT){ var fdt=new Date(firstT); h.push('<div class="kv"><b>首次获得</b>'+fdt.getFullYear()+'年'+(fdt.getMonth()+1)+'月'+fdt.getDate()+'日</div>'); }
  if(lastT&&lastT!==firstT){ var ldt=new Date(lastT); h.push('<div class="kv"><b>最近获得</b>'+ldt.getFullYear()+'年'+(ldt.getMonth()+1)+'月'+ldt.getDate()+'日</div>'); }
  var srcs=opBanners[opName];
  if(srcs&&srcs.length){
    var sl=[];
    var nowS=new Date(); var todayStr=nowS.getFullYear()+'-'+(nowS.getMonth()<9?'0':'')+(nowS.getMonth()+1)+'-'+(nowS.getDate()<10?'0':'')+nowS.getDate();
    for(var si=0;si<srcs.length;si++){ var sbl=bannerById(srcs[si].id); var active=sbl&&sbl.start<=todayStr&&sbl.end>=todayStr; sl.push('<a class="srcLink'+(active?' active':'')+'" data-bid="'+srcs[si].id+'" data-full="'+esc(srcs[si].full)+'">'+esc(srcs[si].full)+(active?' <b style="color:var(--gold)">●进行中</b>':'')+'</a>'); }
    h.push('<div class="kv"><b>UP卡池</b>'+sl.join('、')+'<span style="color:var(--gold)">（共 '+srcs.length+' 次UP）</span></div>');
  } else { h.push('<div class="kv"><b>UP卡池</b>—</div>'); }
  h.push('</div></div>');
  h.push('<div class="mdesc">立绘来源于 bilibili Wiki 与 PRTS，仅供娱乐参考。<a href="'+esc(o.art||'#')+'" target="_blank" rel="noopener">查看高清原图</a></div>');
  $('mBody').innerHTML=h.join('');
  var mi=$('martImg'); if(mi)mi.onclick=function(){ openLightbox(o.art||opArtT(o)); };
  function setMartImg2(img, src, fb, fb2){
    img.src=src;
    img.onerror=function(){
      if(this.dataset.fb2){ var fb2v=this.dataset.fb2; this.dataset.fb2=''; this.src=fb2v; return; }
      this.onerror=null; this.src=this.dataset.fb;
    };
    img.dataset.fb=fb;
    img.dataset.fb2=fb2||'';
  }
  var miInit2=$('martImg'); if(miInit2){ try{ miInit2.dataset.fb=o.art||opArtT(o); }catch(e){} idbSrc(opArtT(o), miInit2); }
  var bfo=$('btnFavOp'); if(bfo)bfo.onclick=function(){
    if(!state.favOps)state.favOps={};
    if(state.favOps[opName]){ delete state.favOps[opName]; bfo.textContent='☆ 收藏干员'; }
    else { state.favOps[opName]=true; bfo.textContent='⭐ 已收藏'; }
    save();
  };
  var bsk=$('btnSkins'); if(bsk)bsk.onclick=function(){ SKINS_FROM='modal'; openSkins(opName); };
  var bwh=$('btnWish'); if(bwh)bwh.onclick=function(){
    if(!state.wish)state.wish=[];
    var wi=state.wish.indexOf(opName);
    if(wi>=0){ state.wish.splice(wi,1); toast('已移出心愿单'); }
    else { state.wish.push(opName); toast('💝 已加入心愿单，抽到会提醒！'); }
    save();
    bwh.textContent=wi>=0?'💝 心愿单':'💝 已心愿';
    renderCollection();
  };
  var links=$('mBody').querySelectorAll('.srcLink');
  for(var li=0;li<links.length;li++){ links[li].onclick=function(){ jumpBanner(this.getAttribute('data-bid')); }; }
  var bwk=$('btnWiki'); if(bwk)bwk.onclick=function(){ __wikiBack=function(){ openModal(opName); }; $('mBody').innerHTML='<div id="wikiOut"></div>'; wikiDetail(opName,$('wikiOut')); };
  preloadSkins(opName);
  openModalBox();
}
function prtsApiUrl(page, section){
  return 'https://prts.wiki/api.php?action=parse&page='+encodeURIComponent(page)+'&prop=wikitext&format=json&section='+section;
}
function stripWiki(t){
  return String(t||'')
    .replace(/\{\{\{[^{}]*\}\}\}/g,'')
    .replace(/\{\{[^{}]*\}\}/g,'')
    .replace(/\[\[(?:文件|File|分类|Category):[^\]]*\]\]/gi,'')
    .replace(/\[\[[^\]]*\|?([^\]|]*)\]\]/g,'$1')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi,'')
    .replace(/<ref[^>]*\/?>/gi,'')
    .replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<\/?[a-z][^>]*>/gi,'')
    .replace(/'''/g,'').replace(/<br\/?>/gi,' ')
    .replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/\s+/g,' ').trim();
}
function wikiColor(t){ return String(t||'').replace(/\{\{color\|#[0-9A-Fa-f]{3,6}\|([^}]*)\}\}/g,'$1').replace(/\{\{术语\|(?:[^|]*\|)?([^}]*)\}\}/g,'$1'); }
function wikiProbe(box){
  if(!box)return;
  box.innerHTML='<div class="wikisec"><h4>🌐 Wiki 连通性检测</h4><div class="notice" id="wikiProbeBox">正在检测 PRTS Wiki 连通性…（约需数秒，请稍候）</div></div>';
  var probeUrl='https://prts.wiki/api.php?action=query&meta=siteinfo&format=json';
  var out=[];
  function step(i){
    var el=$('wikiProbeBox');
    if(el)el.innerHTML='⏳ 检测中（'+(i+1)+'/'+WIKI_METHODS.length+'）：'+WIKI_METHODS[i];
    var T0=Date.now();
    function advance(ok){
      out.push({name:WIKI_METHODS[i], ok:ok, ms:Date.now()-T0});
      if(i+1<WIKI_METHODS.length)setTimeout(function(){ step(i+1); }, 300);
      else renderProbeResult(box, out);
    }
    if(i===0){ wikiJsonp(probeUrl, function(d){ advance(!!(d&&d.query)); }); return; }
    if(typeof fetch!=='function'){ advance(false); return; }
    var ctl=null; try{ ctl=new AbortController(); }catch(e){}
    var to=ctl?setTimeout(function(){ try{ctl.abort();}catch(e){} },10000):null;
    var target=null, asText=false, outer=false;
    if(i===1||i===2){ target=probeUrl+'&origin=*'; }
    else if(i===3){ target='https://api.allorigins.win/get?url='+encodeURIComponent(probeUrl); outer=true; }
    else if(i===4){ target='https://corsproxy.io/?url='+encodeURIComponent(probeUrl); }
    else if(i===5){ target='https://api.allorigins.com/raw?url='+encodeURIComponent(probeUrl); }
    else if(i===6){ target='https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(probeUrl); }
    else { var raw='https://prts.wiki/index.php?title='+encodeURIComponent('能天使')+'&action=raw'; target='https://r.jina.ai/'+encodeURIComponent(raw); asText=true; }
    fetch(target,{signal:ctl?ctl.signal:undefined})
      .then(function(res){ return res.text(); })
      .then(function(txt){ if(to)clearTimeout(to);
        if(asText){ advance(looksLikeWiki(txt)); return; }
        var j=null; try{ j=JSON.parse(txt); }catch(e){}
        if(outer&&j&&typeof j.contents==='string'){ try{ j=JSON.parse(j.contents); }catch(e){} }
        advance(!!(j&&j.query));
      })
      .catch(function(){ if(to)clearTimeout(to); advance(false); });
  }
  step(0);
}
function renderProbeResult(box, out){
  var okN=0, directOk=false, proxyOk=false, h=['<div class="wikisec"><h4>🌐 Wiki 连通性检测</h4><div class="wikirows">'];
  for(var i=0;i<out.length;i++){
    if(out[i].ok)okN++;
    if(i<=2&&out[i].ok)directOk=true;
    if(i>=3&&out[i].ok)proxyOk=true;
    h.push('<div class="wrow"><b>'+(out[i].ok?'✅':'❌')+' '+esc(out[i].name)+'</b><span>'+(out[i].ok?('连通 · '+(out[i].ms<1000?(out[i].ms+'ms'):((out[i].ms/1000).toFixed(1)+'s'))):'失败')+'</span></div>');
  }
  h.push('</div>');
  var concl;
  if(directOk)concl='✅ PRTS Wiki 直连可用（'+okN+'/'+out.length+' 种方式可用）——代理失败不影响正常同步。';
  else if(proxyOk)concl='⚠️ PRTS 直连被拦截，但代理可用——Wiki 将通过代理同步（速度较慢）。';
  else concl='❌ 全部 8 种方式均不可达——PRTS 被网络拦截/限流，或浏览器代理/广告拦截扩展干扰；请检查网络后重试。';
  h.push('<div class="notice">'+concl+'</div></div>');
  box.innerHTML=h.join('');
}

var wikiSecCache={}, wikiQueue=[], wikiBusy=0;
(function(){ try{ var wr2=localStorage.getItem('akgacha_pw_v1'); if(wr2){ var wo=JSON.parse(wr2); for(var wk in wo){ if(wo[wk]&&typeof wo[wk].v==='string'&&Date.now()-wo[wk].t<7*86400000)wikiSecCache[wk]=wo[wk]; } } }catch(e){} })();
var __pwSaveT=null;
function persistSecCache(){
  try{ if(__pwSaveT)clearTimeout(__pwSaveT); }catch(e){}
  __pwSaveT=setTimeout(function(){
    try{
      var kArr=Object.keys(wikiSecCache);
      if(kArr.length>150){
        kArr.sort(function(a,b){ return (wikiSecCache[a].t||0)-(wikiSecCache[b].t||0); });
        for(var di=0;di<kArr.length-150;di++)delete wikiSecCache[kArr[di]];
      }
      var out={}; for(var pk in wikiSecCache)out[pk]=wikiSecCache[pk];
      localStorage.setItem('akgacha_pw_v1', JSON.stringify(out));
    }catch(e){}
  }, 600);
}
function extractWikiText(d){
  try{
    if(!d)return null;
    if(d.error){ return ''; }
    if(d.parse){
      if(d.parse.wikitext&&d.parse.wikitext['*']!==undefined)return d.parse.wikitext['*'];
      if(d.parse.text&&d.parse.text['*']!==undefined)return d.parse.text['*'];
    }
    return null;
  }catch(e){ return null; }
}
function prtsFetch(page, sec, cb, prop, maxA){
  var key='pw:'+page+':'+(sec===null||sec===undefined?'all':sec);
  var c=wikiSecCache[key];
  if(c){ cb(c.v); return; }
  wikiQueue.push({page:page,sec:sec,cb:cb,prop:prop||'wikitext',attempts:0,maxA:maxA});
  pumpWiki();
}
function pumpWiki(){
  while(wikiBusy<2&&wikiQueue.length){
    var it=wikiQueue.shift();
    wikiBusy++;
    doWikiFetch(it);
  }
}
var WIKI_METHODS=['JSONP 直连','CORS 直连','CORS 重试','allorigins 代理','corsproxy 代理','allorigins.com 代理','codetabs 代理','jina 代理(action=raw)'];
var wikiStatusHook=null, wikiLastErr='', WIKI_DOWN_T=0;
function wikiFinish(it, txt){
  wikiBusy--;
  var cooling=(Date.now()-WIKI_DOWN_T<300000);
  var cap=(it.maxA!==undefined&&it.maxA>=0)?it.maxA:(cooling?1:(WIKI_METHODS.length-1));
  if(txt===null&&it.attempts<cap){
    var fIdx=it.attempts; it.attempts++;
    wikiLastErr='方式 '+(fIdx+1)+'/'+WIKI_METHODS.length+'（'+WIKI_METHODS[fIdx]+'）失败';
    if(wikiStatusHook)wikiStatusHook(it.attempts,false);
    wikiQueue.push(it); setTimeout(pumpWiki,350); return;
  }
  var key='pw:'+it.page+':'+(it.sec===null||it.sec===undefined?'all':it.sec);
  if(typeof txt==='string'){ wikiSecCache[key]={t:Date.now(),v:txt}; persistSecCache(); wikiLastErr=''; WIKI_DOWN_T=0; }
  else if(txt===null){ WIKI_DOWN_T=Date.now(); }
  if(wikiStatusHook)wikiStatusHook(it.attempts,typeof txt==='string');
  it.cb(typeof txt==='string'?txt:'');
  pumpWiki();
}
function doWikiFetch(it){
  var url='https://prts.wiki/api.php?action=parse&page='+encodeURIComponent(it.page)+(it.sec===null||it.sec===undefined?'':'&section='+it.sec)+'&prop='+it.prop+'&format=json';
  if(it.attempts===0){ wikiJsonp(url, function(d){ wikiFinish(it, extractWikiText(d)); }); return; }
  if(typeof fetch!=='function'||typeof window==='undefined'){ wikiFinish(it, null); return; }
  var ctl=null; try{ ctl=new AbortController(); }catch(e){}
  var to=ctl?setTimeout(function(){ try{ctl.abort();}catch(e){} },(it.maxA!==undefined&&it.maxA>=0?8000:12000)):null;
  var target=null, asText=false, outer=false;
  if(it.attempts===1||it.attempts===2){
    target=url+(url.indexOf('?')>=0?'&':'?')+'origin=*';
  }else if(it.attempts===3){
    target='https://api.allorigins.win/get?url='+encodeURIComponent(url); outer=true;
  }else if(it.attempts===4){
    target='https://corsproxy.io/?url='+encodeURIComponent(url);
  }else if(it.attempts===5){
    target='https://api.allorigins.com/raw?url='+encodeURIComponent(url);
  }else if(it.attempts===6){
    target='https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(url);
  }else{
    // 最终回退：action=raw 直取 wikitext 纯文本，经 jina 代理（绕过 parse JSON 层与 CORS）
    var raw='https://prts.wiki/index.php?title='+encodeURIComponent(it.page)+'&action=raw';
    target='https://r.jina.ai/'+encodeURIComponent(raw); asText=true;
  }
  fetch(target,{signal:ctl?ctl.signal:undefined})
    .then(function(res){ return res.text(); })
    .then(function(txt){ if(to)clearTimeout(to);
      if(asText){ wikiFinish(it, looksLikeWiki(txt)?txt:null); return; }
      var j=null; try{ j=JSON.parse(txt); }catch(e){}
      if(outer&&j&&typeof j.contents==='string'){ try{ j=JSON.parse(j.contents); }catch(e){} }
      var w=extractWikiText(j); if(w===null)wikiFinish(it,null); else wikiFinish(it,w);
    })
    .catch(function(){ if(to)clearTimeout(to); wikiFinish(it,null); });
}
function looksLikeWiki(t){
  if(!t||typeof t!=='string')return false;
  var s=t.slice(0,400);
  return s.indexOf('{{')>=0||s.indexOf('[[')>=0||/^=+[^=\n]+=+\s*$/m.test(s);
}
function wikiJsonp(url, cb){
  try{
    if(typeof document==='undefined'||!document.createElement||!document.body){ cb(null); return; }
    var nm='_pw'+Math.floor(Math.random()*1e9);
    var sc=document.createElement('script');
    var done=false, to=null;
    function cleanup(){ try{ if(to)clearTimeout(to); }catch(e){} try{ delete window[nm]; }catch(e){} try{ if(sc.parentNode)sc.parentNode.removeChild(sc); }catch(e){} }
    window[nm]=function(d){ if(done)return; done=true; cleanup(); cb(d); };
    sc.onerror=function(){ if(done)return; done=true; cleanup(); cb(null); };
    to=setTimeout(function(){ if(done)return; done=true; cleanup(); cb(null); },12000);
    sc.src=url+'&callback='+nm;
    try{ document.body.appendChild(sc); }catch(e){ if(!done){ done=true; cleanup(); cb(null); } }
  }catch(e){ cb(null); }
}
function imgChain(im, fb, fb2){
  im.onerror=function(){
    if(fb){ var vf=fb; fb=''; im.src=vf; return; }
    if(fb2){ var v2=fb2; fb2=''; im.src=v2; return; }
    im.onerror=null;
  };
  im.dataset.fb=fb||''; im.dataset.fb2=fb2||'';
}
var wikiCache={};
(function(){ try{ var wRaw=localStorage.getItem('akgacha_wiki_v2'); if(wRaw){ var wObj=JSON.parse(wRaw); var wK; for(wK in wObj){ if(wObj[wK]&&Date.now()-wObj[wK].t<7*86400000)wikiCache[wK]=wObj[wK]; } } }catch(e){} })();
function persistWikiCache(){
  try{
    var wObj={}, wK2, wN=0;
    for(wK2 in wikiCache){ if(wN++>=60)break; wObj[wK2]=wikiCache[wK2]; }
    localStorage.setItem('akgacha_wiki_v2', JSON.stringify(wObj));
  }catch(e){}
}
function wikiFetch(name,target){
  var box=target||$('mBody');
  var ck=name;
  if(wikiCache[ck]&&Date.now()-wikiCache[ck].t<600000){ renderWikiData(name,wikiCache[ck],box); return; }
  box.innerHTML='<h4 class="sect" style="margin-top:0">📊 '+esc(name)+' · Wiki数据</h4><div class="notice" id="wikiSync">正在从 PRTS Wiki 同步数据…（需联网）</div>';
  openModalBox();
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
    box.innerHTML='<h4 class="sect" style="margin-top:0">📊 '+esc(name)+' · Wiki数据</h4><div class="notice">⚠️ 当前处于离线状态，无法同步 Wiki 数据，请联网后重试</div><div style="text-align:center;margin-top:8px"><button class="mini-btn" id="wikiRetry">🔄 重试</button></div>';
    var wr0=$('wikiRetry'); if(wr0)wr0.onclick=function(){ wikiFetch(name,box); };
    return;
  }
  wikiLastErr='';
  wikiStatusHook=function(a,ok){
    var el=$('wikiSync'); if(!el)return;
    if(ok)el.innerHTML='✅ 已获取 PRTS 数据（方式 '+(a+1)+'/'+WIKI_METHODS.length+'：'+WIKI_METHODS[a]+'）';
    else el.innerHTML='⏳ 正在同步…（方式 '+(a+1)+'/'+WIKI_METHODS.length+'：'+WIKI_METHODS[a]+'）';
  };
  prtsFetch(name, null, function(wt){
    wikiStatusHook=null;
    if(!wt){
      box.innerHTML='<h4 class="sect" style="margin-top:0">📊 '+esc(name)+' · Wiki数据</h4><div class="notice">⚠️ 同步失败：已尝试 '+WIKI_METHODS.length+' 种方式均未成功（PRTS 限流 / 网络被拦截 / 广告拦截扩展干扰等）。'+(wikiLastErr?'最近一次：'+esc(wikiLastErr)+'。':'')+'请稍后重试</div><div style="text-align:center;margin-top:8px"><button class="mini-btn" id="wikiRetry">🔄 重试同步</button><button class="mini-btn" id="wikiProbeBtn" style="margin-left:6px">🔍 连通性检测</button></div>';
      var wr=$('wikiRetry'); if(wr)wr.onclick=function(){ box.innerHTML='<div class="notice">正在从 PRTS Wiki 同步 <b>'+esc(name)+'</b> 的数据…（需联网）</div>'; wikiFetch(name,box); };
      var wpb=$('wikiProbeBtn'); if(wpb)wpb.onclick=function(){ wikiProbe(box); };
      return;
    }
    var pd=parseWikiPage(wt);
    wikiCache[ck]={t:Date.now(),acquire:pd.acquire||'',attr:pd.attr||'',talents:pd.talents||'',skills:pd.skills||'',mats:pd.mats||'',skillMats:pd.skillMats||''};
    persistWikiCache();
    renderWikiData(name,wikiCache[ck],box);
  });
}
function openWiki(opName){
  var o=opOf(opName); if(!o)return;
  __wikiBack=null;
  var name=o.name;
  $('mBody').innerHTML='<h4 class="sect" style="margin-top:0">📊 '+esc(name)+' · Wiki数据</h4><div class="notice">正在从 PRTS Wiki 同步数据…（需联网）</div>';
  openModalBox();
  wikiFetch(name);
}
function wikiClean(t){ return stripWiki(wikiColor(String(t||''))); }
var WD={};
var wikiVoiceCache={};
function wikiDetail(name, container){
  var box=container||$('wikiOut');
  var o=opOf(name);
  var h=[];
  h.push('<div style="margin-bottom:6px"><button class="mini-btn" id="wikiDetailBack">← 返回</button></div>');
  h.push('<div class="wikid-head">');
  h.push('<img loading="lazy" src="'+esc(o?opArtT(o):'')+'" onerror="this.onerror=null;this.src=this.dataset.fb" data-fb="'+esc(o?(o.art||''):'')+'" alt=""/>');
  h.push('<div class="wikid-meta"><div class="wikid-name">'+esc(name)+'</div>');
  h.push('<div class="wikid-sub">'+(o?(stars(o.rarity)+' · '+esc(o.profZh||o.prof||'')+(o.nation?' · '+esc(o.nation):'')):'')+'</div>');
  h.push('</div></div>');
  h.push('<div class="wikid-tabs">');
  var tabs=[['base','📋 基础'],['attr','📈 属性'],['skill','⚔️ 技能'],['pot','📊 潜能'],['mod','🧩 模组'],['mat','🧱 材料'],['file','📜 档案'],['voice','🎙 语音']];
  for(var i=0;i<tabs.length;i++){ h.push('<button class="wikid-tab'+(i===0?' on':'')+'" data-t="'+tabs[i][0]+'">'+tabs[i][1]+'</button>'); }
  h.push('</div>');
  h.push('<div id="wikiBody"><div class="notice" id="wikiSync">正在从 PRTS Wiki 同步数据…（需联网）</div></div>');
  box.innerHTML=h.join('');
  var wdb=$('wikiDetailBack'); if(wdb)wdb.onclick=function(){ if(__wikiBack)__wikiBack(); else closeModal(); };
  var tabsEl=box.querySelectorAll('.wikid-tab');
  for(i=0;i<tabsEl.length;i++){ (function(tb){ tb.onclick=function(){ var tt=tb.getAttribute('data-t'); var all=box.querySelectorAll('.wikid-tab'); for(var ti2=0;ti2<all.length;ti2++)all[ti2].classList.remove('on'); tb.classList.add('on'); renderWikiTab(name,tt); }; })(tabsEl[i]); }
  wikiFetchDetail(name, box);
}
function grabWikiTemplate(wt, tplName){
  var s=String(wt||'');
  var idx=s.indexOf('{{'+tplName);
  if(idx<0)return '';
  var depth=0, i=idx, n=s.length;
  for(;i<n;i++){
    if(s[i]==='{'&&s[i+1]==='{'){ depth++; i++; }
    else if(s[i]==='}'&&s[i+1]==='}'){ depth--; i++; if(depth===0)return s.slice(idx,i+1); }
  }
  return s.slice(idx);
}
function splitWikiSections(wt){
  var lines=String(wt||'').split('\n');
  var secs={}, cur='__lead__';
  secs[cur]=[];
  for(var i=0;i<lines.length;i++){
    var l=lines[i];
    var m=l.match(/^==+\s*(.+?)\s*==+\s*$/);
    if(m){ cur=m[1].trim(); if(!secs[cur])secs[cur]=[]; }
    else secs[cur].push(l);
  }
  return secs;
}
function wikiSecGet(secs, title, marker){
  if(secs[title]&&secs[title].join('\n').trim())return secs[title].join('\n');
  // 兼容 ===标题N=== 编号子节（PRTS 常用 模组1/模组2/技能1...）：合并所有「标题+数字」子节
  var parts=[];
  for(var k in secs){
    if(k!=='__lead__'&&k.indexOf(title)===0){
      var rest=k.slice(title.length);
      if(rest&&/^\d+$/.test(rest)){
        var c=secs[k].join('\n').trim();
        if(c)parts.push(c);
      }
    }
  }
  if(parts.length)return parts.join('\n\n');
  if(marker){
    for(var k2 in secs){ if(k2!=='__lead__'&&secs[k2].join('\n').indexOf(marker)>=0)return secs[k2].join('\n'); }
    if(secs['__lead__'].join('\n').indexOf(marker)>=0)return secs['__lead__'].join('\n');
  }
  return '';
}
function wikiModuleSec(secs){
  // 优先整节「模组」；否则合并所有以「模组」开头的子节（PRTS 常用 ===模组1===/===模组2===）
  if(secs['模组']&&secs['模组'].join('\n').trim())return secs['模组'].join('\n');
  var parts=[];
  for(var k in secs){ if(k!=='__lead__'&&k.indexOf('模组')===0){ var c=secs[k].join('\n').trim(); if(c)parts.push(c); } }
  if(parts.length)return parts.join('\n\n');
  if(secs['__lead__']&&secs['__lead__'].join('\n').indexOf('基础证章')>=0)return secs['__lead__'].join('\n');
  return '';
}
function parseWikiPage(wt){
  var secs=splitWikiSections(wt);
  var lead=secs['__lead__'].join('\n');
  var charInfo=grabWikiTemplate(lead,'干员信息')||wikiSecGet(secs,'干员信息','');
  return {
    charInfo: charInfo,
    acquire: wikiSecGet(secs,'获得方式','|获得方式='),
    attr: wikiSecGet(secs,'属性','精英0_1级_生命上限'),
    range: wikiSecGet(secs,'攻击范围','|精英0范围='),
    talents: wikiSecGet(secs,'天赋','|天赋1='),
    potential: wikiSecGet(secs,'潜能提升','|潜能2='),
    skills: wikiSecGet(secs,'技能','技能7描述='),
    support: wikiSecGet(secs,'后勤技能','|后勤技能1-1='),
    mats: wikiSecGet(secs,'精英化材料','材料消耗'),
    skillMats: wikiSecGet(secs,'技能升级材料','|技能1='),
    module: wikiModuleSec(secs),
    file: wikiSecGet(secs,'干员档案','|档案1='),
    story: wikiSecGet(secs,'干员密录','storySetName'),
    paradox: wikiSecGet(secs,'悖论模拟','悖论')
  };
}
function wikiFetchDetail(name, box){
  var ck=name;
  if(wikiCache[ck]&&wikiCache[ck].file!==undefined&&Date.now()-wikiCache[ck].t<600000){ WD[name]=wikiCache[ck]; renderWikiTab(name,'base'); return; }
  var body=$('wikiBody');
  if(body)body.innerHTML='<div class="notice" id="wikiSync">正在从 PRTS Wiki 同步数据…（需联网）</div>';
  prtsFetch(name, null, function(wt){
    var b2=$('wikiBody');
    if(!wt){
      if(b2)b2.innerHTML='<div class="notice">同步失败：无法连接 PRTS Wiki（需联网）或该干员页面不存在，也可能是 PRTS 限流，请稍后重试</div><div style="text-align:center;margin-top:8px"><button class="mini-btn" id="wikiRetry3">🔄 重试</button><button class="mini-btn" id="wikiProbeBtn3" style="margin-left:6px">🔍 连通性检测</button></div>';
      var wr=$('wikiRetry3'); if(wr)wr.onclick=function(){ wikiFetchDetail(name,box); };
      var wpb3=$('wikiProbeBtn3'); if(wpb3)wpb3.onclick=function(){ if(b2)wikiProbe(b2); };
      return;
    }
    var data=parseWikiPage(wt);
    data.t=Date.now();
    wikiCache[ck]=data; persistWikiCache();
    WD[name]=data;
    renderWikiTab(name,'base');
  });
}
function renderWikiTab(name, tab){
  var data=WD[name], body=$('wikiBody');
  if(!data){ if(body)body.innerHTML='<div class="notice">数据未就绪，请重试</div>'; return; }
  var h=[];
  if(tab==='base')h.push(wikiBaseTab(name,data));
  else if(tab==='attr')h.push(wikiAttrTab(name,data));
  else if(tab==='skill')h.push(wikiSkillTab(name,data));
  else if(tab==='mat')h.push(wikiMatTab(name,data));
  else if(tab==='pot')h.push(wikiPotTab(name,data));
  else if(tab==='mod')h.push(wikiModTab(name,data));
  else if(tab==='file')h.push(wikiFileTab(name,data));
  else h.push(wikiVoiceTab(name,data));
  if(body)body.innerHTML=h.join('');
  try{ var mBox=$('modal'); if(mBox&&mBox.querySelector){ var mbx=mBox.querySelector('.mbox'); if(mbx&&mbx.scrollTop!==undefined)mbx.scrollTop=0; } }catch(e){}
}
function wikiBaseTab(name,data){
  var o=opOf(name), h=[];
  if(data&&data.charInfo){
    var ci=String(data.charInfo||'');
    function ckv(k){ var m=ci.match(new RegExp('\\|'+k+'=([^\\n]*)')); return m?m[1].trim():''; }
    function pick(){ for(var pi2=0;pi2<arguments.length;pi2++){ var v=ckv(arguments[pi2]); if(v)return v; } return ''; }
    var feat=ckv('特性'), prof=ckv('职业'), branch=ckv('分支'), pos=ckv('位置'), tags=ckv('标签'), code=ckv('情报编号');
    var nation=pick('所属国家','阵营','国家'), org=pick('所属组织','组织'), painter=ckv('画师');
    var cnv=pick('中文配音','中文CV','中文声优','配音'), jpv=pick('日文配音','日文CV','日文声优');
    var intro0=ckv('精英0介绍'), intro2=ckv('精英2介绍');
    h.push('<div class="wikisec"><h4>🔎 干员档案</h4><div class="wikirows">');
    if(feat)h.push('<div class="wrow"><b>特性</b><span>'+esc(wikiClean(feat))+'</span></div>');
    if(prof)h.push('<div class="wrow"><b>职业</b><span>'+esc(wikiClean(prof))+(branch?' · '+esc(wikiClean(branch)):'')+'</span></div>');
    if(pos)h.push('<div class="wrow"><b>位置</b><span>'+esc(wikiClean(pos))+'</span></div>');
    if(tags)h.push('<div class="wrow"><b>标签</b><span>'+esc(wikiClean(tags))+'</span></div>');
    if(code)h.push('<div class="wrow"><b>情报编号</b><span>'+esc(wikiClean(code))+'</span></div>');
    if(nation||org)h.push('<div class="wrow"><b>所属</b><span>'+esc(wikiClean(nation))+(nation&&org?' · ':'')+esc(wikiClean(org))+'</span></div>');
    if(painter)h.push('<div class="wrow"><b>画师</b><span>'+esc(wikiClean(painter))+'</span></div>');
    if(cnv||jpv)h.push('<div class="wrow"><b>配音</b><span>中：'+esc(wikiClean(cnv||'—'))+(jpv?' · 日：'+esc(wikiClean(jpv)):'')+'</span></div>');
    h.push('</div>');
    var skArr=[];
    for(var sn2=1;sn2<=8;sn2++){
      var smN=ci.match(new RegExp('\\|时装'+sn2+'名称=([^\\n]*)'));
      var smS=ci.match(new RegExp('\\|时装'+sn2+'系列=([^\\n]*)'));
      if(smN&&smN[1])skArr.push({n:wikiClean(smN[1]),s:smS?wikiClean(smS[1]):''});
    }
    if(skArr.length){
      h.push('<div class="wikisec"><h4>👗 时装（'+skArr.length+'）</h4><div class="wikirows">');
      for(var si6=0;si6<skArr.length;si6++){ h.push('<div class="wrow"><b>'+esc(skArr[si6].n)+'</b><span>'+(skArr[si6].s?esc(skArr[si6].s):'')+'</span></div>'); }
      h.push('</div></div>');
    }
    if(intro0)h.push('<div class="notice" style="line-height:2">📷 精英0：'+esc(wikiClean(intro0))+'</div>');
    if(intro2)h.push('<div class="notice" style="line-height:2">🌟 精英2：'+esc(wikiClean(intro2))+'</div>');
    h.push('</div>');
  }
  if(data.acquire){
    var at=String(data.acquire||'');
    var am1=at.match(/\|获得方式=([^\n]*)/);
    var am2=at.match(/\|上线时间=([^\n]*)/);
    h.push('<div class="wikisec"><h4>🎁 获取方式</h4><div class="notice">'+(am1?'获得方式：'+esc(stripWiki(am1[1])):'')+(am2?'<br/>上线时间：'+esc(stripWiki(am2[1])):'')+'</div></div>');
  }
  if(data.talents){
    var talTxt=wikiColor(stripWiki(data.talents));
    h.push('<div class="wikisec"><h4>✨ 天赋</h4><div class="notice" style="white-space:pre-wrap;line-height:2">'+esc(talTxt)+'</div></div>');
  }
  if(data.attr){
    var at2=String(data.attr||'');
    function kv(k){ var m=at2.match(new RegExp('\\|'+k+'=(.*?)(\\n|$)')); return m?m[1].trim():''; }
    var rows=[['再部署',kv('再部署')],['部署费用',kv('部署费用')],['阻挡数',kv('阻挡数')],['攻击速度',kv('攻击速度')]];
    var filled=rows.filter(function(x){return x[1];});
    if(filled.length){
      h.push('<div class="wikisec"><h4>📋 基础数值</h4><div class="wikirows">');
      for(var i=0;i<filled.length;i++){ h.push('<div class="wrow"><b>'+filled[i][0]+'</b><span>'+esc(filled[i][1])+'</span></div>'); }
      h.push('</div></div>');
    }
    var tr=kv('信赖加成_生命上限'), ta=kv('信赖加成_攻击'), td=kv('信赖加成_防御');
    if(tr||ta||td)h.push('<div class="notice">❤️ 信赖加成：生命 +'+esc(tr||'0')+' · 攻击 +'+esc(ta||'0')+' · 防御 +'+esc(td||'0')+'</div>');
  }
  if(!h.length)h.push('<div class="notice">基础数据缺失（同步失败或该干员页面不完整）</div>');
  return h.join('');
}
function wikiAttrTab(name,data){
  if(!data||(!data.attr&&!data.range)){ return '<div class="notice">属性数据缺失</div>'; }
  var rangeHtml='';
  if(data.range){
    var rg=String(data.range||'');
    var rows=[];
    function rangeVal(key){
      var idx=rg.indexOf('|'+key+'=');
      if(idx<0)idx=rg.indexOf(key+'=');
      if(idx<0)return '';
      var seg=rg.slice(idx+key.length+1);
      var nl=seg.indexOf('\n');
      if(nl>=0)seg=seg.slice(0,nl);
      return seg.trim();
    }
    var keys=[['精英0','精英0范围'],['精英0','精英0'],['精英1','精英1范围'],['精英1','精英1'],['精英2','精英2范围'],['精英2','精英2']];
    var seen={};
    for(var ri2=0;ri2<keys.length;ri2++){
      var rk=keys[ri2][1];
      if(seen[rk])continue;
      seen[rk]=true;
      var rv=rangeVal(rk);
      if(rv){
        var cv=wikiClean(rv);
        rows.push('<div class="wrow"><b>'+keys[ri2][0]+'</b><span>'+esc(cv||rv)+'</span></div>');
      }
    }
    if(!rows.length){
      var cleanedAll=wikiClean(rg);
      if(cleanedAll&&cleanedAll.length>4&&!/^==/.test(cleanedAll))rows.push('<div class="wrow"><span>'+esc(cleanedAll)+'</span></div>');
      rows.push('<div class="wrow"><span>攻击范围为图表格式，<a href="https://prts.wiki/w/'+esc(encodeURIComponent(name))+'#攻击范围" target="_blank" rel="noopener">查看 PRTS 页面</a></span></div>');
    }
    rangeHtml='<div class="wikisec"><h4>🎯 攻击范围</h4><div class="wikirows">'+rows.join('')+'</div></div>';
  }
  var attr=data.attr, h=[];
  var kvCache={};
  function kv(k){ if(kvCache[k]!==undefined)return kvCache[k]; var m=attr.match(new RegExp('\\|'+k+'=(.*?)(\\n|$)')); kvCache[k]=m?m[1].trim():''; return kvCache[k]; }
  var stages=[['精英0·1级','精英0_1级'],['精英0·满级','精英0_满级'],['精英1·满级','精英1_满级'],['精英2·满级','精英2_满级']];
  h.push('<div class="wikisec"><h4>📈 属性数值（PRTS）</h4><div class="wikitbl"><table><tr><th>阶段</th><th>生命</th><th>攻击</th><th>防御</th><th>法抗</th></tr>');
  var ri;
  for(ri=0;ri<stages.length;ri++){ var st=stages[ri]; var hp=kv(st[1]+'_生命上限'), atk=kv(st[1]+'_攻击'), df=kv(st[1]+'_防御'), mr=kv(st[1]+'_法术抗性'); if(hp||atk)h.push('<tr><td>'+st[0]+'</td><td>'+esc(hp)+'</td><td>'+esc(atk)+'</td><td>'+esc(df)+'</td><td>'+esc(mr)+'</td></tr>'); }
  h.push('</table></div></div>');
  var e0=kv('精英0_满级_攻击'), e2=kv('精英2_满级_攻击');
  if(e0&&e2){ var grow=Math.round((parseInt(e2,10)-parseInt(e0,10))/parseInt(e0,10)*100); h.push('<div class="notice">📈 精英化攻击成长：满级 '+esc(e0)+' → '+esc(e2)+'（+'+grow+'%）</div>'); }
  var tr=kv('信赖加成_生命上限'), ta=kv('信赖加成_攻击'), td=kv('信赖加成_防御');
  if(tr||ta||td)h.push('<div class="notice">❤️ 信赖加成：生命 +'+esc(tr||'0')+' · 攻击 +'+esc(ta||'0')+' · 防御 +'+esc(td||'0')+'</div>');
  if(rangeHtml)h.push(rangeHtml);
  return h.join('');
}
function wikiSkillTab(name,data){
  if(!data||!data.skills){ return '<div class="notice">技能数据缺失</div>'; }
  var h=['<div class="wikisec"><h4>⚔️ 技能详情</h4>'];
  function clean(t){ return stripWiki(wikiColor(String(t||''))); }
  var blocks=String(data.skills||'').split(/'''技能[0-9]+（/);
  for(var bi=1;bi<blocks.length;bi++){
    var blk=blocks[bi];
    var endNm=blk.indexOf("'''");
    var nm=endNm>0?blk.slice(0,endNm):('技能'+bi);
    h.push('<div class="wskill"><div class="wskillname">'+esc(clean(nm))+'</div>');
    var sm=blk.match(/技能名=([^\n]*)/); if(sm)h.push('<div class="wskillnm">'+esc(clean(sm[1]))+'</div>');
    var t1=blk.match(/技能类型1=([^\n]*)/), t2=blk.match(/技能类型2=([^\n]*)/);
    if(t1||t2)h.push('<div class="wskilltype">'+esc(clean(t1?t1[1]:'')+(t1&&t2?' · ':'')+clean(t2?t2[1]:''))+'</div>');
    var lv7m=blk.match(/技能7描述=([^\n]*)/);
    var i7=blk.match(/技能7初始=([^\n]*)/), c7=blk.match(/技能7消耗=([^\n]*)/), d7=blk.match(/技能7持续=([^\n]*)/);
    if(lv7m)h.push('<div class="wskilldesc">'+esc(clean(lv7m[1]))+'</div>');
    if(i7||c7||d7)h.push('<div class="wskillnum">初始 '+(i7?esc(clean(i7[1])):'—')+' · 消耗 '+(c7?esc(clean(c7[1])):'—')+' · 持续 '+(d7&&d7[1]?esc(clean(d7[1])):'—')+'（7级）</div>');
    var m1=blk.match(/技能专精1描述=([^\n]*)/); if(m1)h.push('<div class="wskilldesc m">专精1：'+esc(clean(m1[1]))+'</div>');
    var m2=blk.match(/技能专精2描述=([^\n]*)/); if(m2)h.push('<div class="wskilldesc m">专精2：'+esc(clean(m2[1]))+'</div>');
    var m3=blk.match(/技能专精3描述=([^\n]*)/); if(m3)h.push('<div class="wskilldesc m">专精3：'+esc(clean(m3[1]))+'</div>');
    // 1-7级数值表（可展开）
    var rows=[];
    for(var lvi=1;lvi<=7;lvi++){
      var dm=blk.match(new RegExp('技能'+lvi+'描述=([^\n]*)'));
      var im=blk.match(new RegExp('技能'+lvi+'初始=([^\n]*)'));
      var cm=blk.match(new RegExp('技能'+lvi+'消耗=([^\n]*)'));
      var um=blk.match(new RegExp('技能'+lvi+'持续=([^\n]*)'));
      if(dm)rows.push('<tr><td>Lv'+lvi+'</td><td>'+esc(clean(dm[1]))+'</td><td>'+(im&&im[1]?esc(clean(im[1])):'—')+'</td><td>'+(cm&&cm[1]?esc(clean(cm[1])):'—')+'</td><td>'+(um&&um[1]?esc(clean(um[1])):'—')+'</td></tr>');
    }
    var m1r=blk.match(/技能专精1描述=([^\n]*)/), m1i=blk.match(/技能专精1初始=([^\n]*)/), m1c=blk.match(/技能专精1消耗=([^\n]*)/), m1u=blk.match(/技能专精1持续=([^\n]*)/);
    if(m1r)rows.push('<tr><td>专精1</td><td>'+esc(clean(m1r[1]))+'</td><td>'+(m1i&&m1i[1]?esc(clean(m1i[1])):'—')+'</td><td>'+(m1c&&m1c[1]?esc(clean(m1c[1])):'—')+'</td><td>'+(m1u&&m1u[1]?esc(clean(m1u[1])):'—')+'</td></tr>');
    var m2r=blk.match(/技能专精2描述=([^\n]*)/), m2i=blk.match(/技能专精2初始=([^\n]*)/), m2c=blk.match(/技能专精2消耗=([^\n]*)/), m2u=blk.match(/技能专精2持续=([^\n]*)/);
    if(m2r)rows.push('<tr><td>专精2</td><td>'+esc(clean(m2r[1]))+'</td><td>'+(m2i&&m2i[1]?esc(clean(m2i[1])):'—')+'</td><td>'+(m2c&&m2c[1]?esc(clean(m2c[1])):'—')+'</td><td>'+(m2u&&m2u[1]?esc(clean(m2u[1])):'—')+'</td></tr>');
    var m3r=blk.match(/技能专精3描述=([^\n]*)/), m3i=blk.match(/技能专精3初始=([^\n]*)/), m3c=blk.match(/技能专精3消耗=([^\n]*)/), m3u=blk.match(/技能专精3持续=([^\n]*)/);
    if(m3r)rows.push('<tr><td>专精3</td><td>'+esc(clean(m3r[1]))+'</td><td>'+(m3i&&m3i[1]?esc(clean(m3i[1])):'—')+'</td><td>'+(m3c&&m3c[1]?esc(clean(m3c[1])):'—')+'</td><td>'+(m3u&&m3u[1]?esc(clean(m3u[1])):'—')+'</td></tr>');
    if(rows.length)h.push('<details class="wskilllv"><summary>📊 全部等级数值（1-7 + 专精）</summary><div class="wikitbl" style="max-height:240px;overflow:auto"><table><tr><th>等级</th><th>效果</th><th>初始</th><th>消耗</th><th>持续</th></tr>'+rows.join('')+'</table></div></details>');
    h.push('</div>');
  }
  if(blocks.length<=1)h.push('<div class="notice">暂无技能数据</div>');
  h.push('</div>');
  return h.join('');
}
function parseMatsItems(line){
  var parts=String(line||'').split('{{');
  var out=[];
  for(var pi=0;pi<parts.length;pi++){
    var p=parts[pi];
    if(p.indexOf('材料消耗|')!==0)continue;
    var seg=p.slice(5).split('}}')[0].split('|');
    var nm=seg[0]?seg[0].trim():'';
    if(nm)out.push({name:nm, n:(seg[1]?parseInt(seg[1],10):1)||1});
  }
  return out;
}
function matFarmRec(mn){
  var stagesArr=matStagesOf(mn);
  var best=null, fi;
  for(fi=0;fi<stagesArr.length;fi++){
    var v=matApInfo(stagesArr[fi], mn);
    if(v!==undefined&&(!best||v<best.v))best={stage:stagesArr[fi], v:v};
  }
  if(!best)return '';
  var ap=best.v<1?'（效率极高）':('（约'+best.v.toFixed(1)+'理智/个）');
  return ' <em class="farm mat-rec">📌 推荐 <b>'+esc(best.stage)+'</b>'+ap+'</em>';
}
function matConsSpans(items){
  var sp=[];
  for(var ii=0;ii<items.length;ii++){
    sp.push('<span class="mat-cons">'+esc(items[ii].name)+(items[ii].n>1?'×'+items[ii].n:'')+matFarmRec(items[ii].name)+'</span>');
  }
  return sp.join(' + ');
}
function wikiMatTab(name,data){
  var h=['<div class="wikisec"><h4>🧱 精英化材料</h4>'];
  var hasAny=false;
  if(data&&data.mats){
    var matsLines=[];
    var matsTxt=String(data.mats||'');
    var ml=matsTxt.split('\n');
    for(var mi2=0;mi2<ml.length;mi2++){
      var l2=ml[mi2].trim();
      if(l2.indexOf('|精')>=0&&l2.indexOf('=')>=0){
        var kv2=l2.split('=');
        var items=parseMatsItems(kv2[1]||'');
        if(items.length){ hasAny=true; matsLines.push('<div class="wrow"><b>'+(kv2[0].indexOf('精1')>=0?'精1':'精2')+'</b><span>'+matConsSpans(items)+'</span></div>'); }
      }
    }
    if(matsLines.length)h.push('<div class="wikirows">'+matsLines.join('')+'</div>');
  }
  if(!hasAny)h.push('<div class="notice">暂无精英化材料数据</div>');
  h.push('</div>');
  if(data&&data.skillMats){
    h.push('<div class="wikisec"><h4>📚 技能升级材料</h4><div class="wikirows">');
    var smTxt=String(data.skillMats||'');
    var sml=smTxt.split('\n');
    var smAny=false;
    for(var smi=0;smi<sml.length;smi++){
      var sl2=sml[smi].trim();
      if(sl2.indexOf('|')===0&&sl2.indexOf('=')>=0){
        var kv3=sl2.slice(1).split('=');
        var lvName=kv3[0];
        var items2=parseMatsItems(kv3[1]||'');
        if(items2.length){ smAny=true; h.push('<div class="wrow"><b>'+esc(lvName.replace(/^一/,'专精'))+'</b><span>'+matConsSpans(items2)+'</span></div>'); }
      }
    }
    if(!smAny)h.push('<div class="notice">暂无技能升级材料数据</div>');
    h.push('</div></div>');
  }
  h.push('<div class="wikihint">📌 每个材料都给出推荐刷取关卡（取理智效率最优），理智为社区参考值（数据可能存在版本变动）。</div>');
  return h.join('');
}
function wikiPotTab(name,data){
  var h=[];
  if(data&&data.potential){
    var p=String(data.potential||'');
    h.push('<div class="wikisec"><h4>📊 潜能提升</h4><div class="wikirows">');
    var found=false;
    for(var pi=2;pi<=6;pi++){
      var m=p.match(new RegExp('\\|潜能'+pi+'=([^\\n]*)'));
      if(m){ found=true; h.push('<div class="wrow"><b>潜能'+pi+'</b><span>'+esc(wikiClean(m[1]))+'</span></div>'); }
    }
    if(!found)h.push('<div class="notice">暂无潜能数据</div>');
    h.push('</div></div>');
  }
  if(data&&data.support){
    var sp=String(data.support||'');
    h.push('<div class="wikisec"><h4>🏠 后勤技能</h4><div class="wikirows">');
    var idx=1, found2=false;
    while(idx<=6){
      var m1=sp.match(new RegExp('\\|后勤技能'+idx+'-1=([^\\n]*)'));
      var m1s=sp.match(new RegExp('\\|后勤技能'+idx+'-1阶段=([^\\n]*)'));
      var m2=sp.match(new RegExp('\\|后勤技能'+idx+'-2=([^\\n]*)'));
      var m2s=sp.match(new RegExp('\\|后勤技能'+idx+'-2阶段=([^\\n]*)'));
      if(!m1&&!m2)break;
      found2=true;
      if(m1){ var lg1=LOGISTICS_DB[wikiClean(m1[1])]; h.push('<div class="wrow"><b>'+(m1s&&m1s[1]?esc(wikiClean(m1s[1])):'')+'</b><span>'+esc(wikiClean(m1[1]))+(lg1?'<div class="lg-desc">'+esc(lg1)+'</div>':'<a class="lg-link" href="https://prts.wiki/w/'+esc(encodeURIComponent('后勤技能一览'))+'" target="_blank" rel="noopener">效果见后勤技能一览</a>')+'</span></div>'); }
      if(m2){ var lg2=LOGISTICS_DB[wikiClean(m2[1])]; h.push('<div class="wrow"><b>'+(m2s&&m2s[1]?esc(wikiClean(m2s[1])):'')+'</b><span>'+esc(wikiClean(m2[1]))+(lg2?'<div class="lg-desc">'+esc(lg2)+'</div>':'<a class="lg-link" href="https://prts.wiki/w/'+esc(encodeURIComponent('后勤技能一览'))+'" target="_blank" rel="noopener">效果见后勤技能一览</a>')+'</span></div>'); }
      idx++;
    }
    if(!found2)h.push('<div class="notice">暂无后勤技能数据</div>');
    h.push('</div></div>');
  }
  if(!h.length)h.push('<div class="notice">暂无数据</div>');
  return h.join('');
}
function wikiModTab(name,data){
  var mt=String((data&&data.module)||'');
  if(!mt.trim())return '<div class="notice">暂无模组数据</div>';
  var h=['<div class="wikisec"><h4>🧩 模组</h4>'];
  // 按 {{模组信息 模板切分（兼容 ==模组N== / ===模组N=== 各种标题样式）
  var segs=mt.split(/\{\{模组信息/);
  var found=false;
  for(var si=1;si<segs.length;si++){
    var body='{{模组信息'+segs[si];
    function kv(k){ var m=body.match(new RegExp('\\|'+k+'=([^\\n]*)')); return m?m[1].trim():''; }
    var title=kv('模组名');
    var type=kv('类型'), branch=kv('分支'), base=kv('基础证章');
    var hp=kv('生命'), atk=kv('攻击'), df=kv('防御'), rs=kv('法抗'), hp2=kv('生命2'), atk2=kv('攻击2'), hp3=kv('生命3'), atk3=kv('攻击3');
    var feat=kv('特性'), talent=kv('天赋2')||kv('天赋3');
    if(!title&&!type&&!branch&&!hp&&!atk&&!df&&!rs&&!feat&&!talent)continue;
    found=true;
    h.push('<div class="wskill"><div class="wskillname">'+esc(title||('模组'+(found?si:'')))+'</div>');
    if(type||branch)h.push('<div class="wskilltype">'+esc(wikiClean(type))+(type&&branch?' · ':'')+esc(wikiClean(branch))+'</div>');
    if(base){
      var baseTxt=wikiClean(base);
      h.push('<div class="wskillnum">基础证章'+(baseTxt&&baseTxt!=='基础证章'?('：'+esc(baseTxt)):'')+'</div>');
    }
    else if(hp||atk||df||rs){
      var st1=(hp?('生命 +'+wikiClean(hp)):'')+(hp&&atk?' · ':'')+(atk?('攻击 +'+wikiClean(atk)):'')+(atk&&df?' · ':'')+(df?('防御 +'+wikiClean(df)):'')+(df&&rs?' · ':'')+(rs?('法抗 +'+wikiClean(rs)):'');
      h.push('<div class="wskillnum">'+esc(st1)+'（1级）</div>');
      var st2=(hp2?('生命 +'+wikiClean(hp2)):'')+(hp2&&atk2?' · ':'')+(atk2?('攻击 +'+wikiClean(atk2)):'');
      if(st2)h.push('<div class="wskillnum">'+esc(st2)+'（2级）</div>');
      var st3=(hp3?('生命 +'+wikiClean(hp3)):'')+(hp3&&atk3?' · ':'')+(atk3?('攻击 +'+wikiClean(atk3)):'');
      if(st3)h.push('<div class="wskillnum">'+esc(st3)+'（3级）</div>');
    }
    if(feat)h.push('<div class="wskilldesc">特性：'+esc(wikiClean(feat))+'</div>');
    if(talent)h.push('<div class="wskilldesc m">天赋：'+esc(wikiClean(talent))+'</div>');
    h.push('</div>');
  }
  if(!found)h.push('<div class="notice">暂无模组数据</div>');
  h.push('</div>');
  return h.join('');
}
function wikiFileTab(name,data){
  var wt=String((data&&data.file)||'');
  var h=['<div class="wikisec"><h4>📜 干员档案（PRTS）</h4>'];
  var fLines=String(wt||'').split('\n');
  var fCur=null, fArr=[], fi2;
  for(fi2=0;fi2<fLines.length;fi2++){
    var fl2=fLines[fi2];
    if(fl2.indexOf('}}')>=0){ if(fCur)fArr.push(fCur); fCur=null; continue; }
    var fm2=fl2.match(/^\|档案(\d+)=(.+)$/);
    if(fm2){ if(fCur)fArr.push(fCur); fCur={no:fm2[1], title:stripWiki(fm2[2]), cond:'', txt:[]}; continue; }
    if(!fCur)continue;
    var fc2=fl2.match(/^\|档案\d+条件=(.*)$/);
    var ft2=fl2.match(/^\|档案\d+文本=(.*)$/);
    if(fc2){ fCur.cond=stripWiki(fc2[1]); }
    else if(ft2){ fCur.txt.push(ft2[1]); }
    else if(fCur.txt.length&&fl2.trim()!==''){ fCur.txt.push(fl2.trim()); }
  }
  if(fCur)fArr.push(fCur);
  var n=0;
  for(var fi3=0;fi3<fArr.length&&n<8;fi3++){
    var fe=fArr[fi3];
    if(!fe.title)continue;
    n++;
    var ftxt=stripWiki(fe.txt.join('\n'));
    if(ftxt)h.push('<div class="wikisec" style="border-left:2px solid var(--acc);padding-left:8px"><h5>'+esc(fe.title)+'</h5>'+(fe.cond&&fe.cond!==fe.title?'<div class="wikihint" style="margin:2px 0">🔒 '+esc(fe.cond)+'</div>':'')+'<div class="notice" style="white-space:pre-wrap;line-height:2">'+esc(ftxt)+'</div></div>');
  }
  if(!n)h.push('<div class="notice">该干员暂无档案数据（部分联动干员未收录）</div>');
  h.push('</div>');
  if(data&&data.story){
    var stTxt=String(data.story||'');
    var storyBlocks=stTxt.split(/\|storySetName=/);
    var stArr=[];
    for(var sti=1;sti<storyBlocks.length;sti++){
      var sb=storyBlocks[sti];
      var sName=sb.slice(0, sb.indexOf('\n')>=0?sb.indexOf('\n'):sb.length).trim();
      var sIntro=sb.match(/\|storyIntro1=([^\n]*)/);
      if(sName)stArr.push({n:wikiClean(sName),i:sIntro?wikiClean(sIntro[1]):''});
    }
    if(stArr.length){
      h.push('<div class="wikisec"><h4>📖 干员密录</h4><div class="wikirows">');
      for(var si5=0;si5<stArr.length;si5++){ h.push('<div class="wrow"><b>'+esc(stArr[si5].n)+'</b><span>'+(stArr[si5].i?esc(stArr[si5].i):'')+'</span></div>'); }
      h.push('</div></div>');
    }
  }
  if(data&&data.paradox){
    var pa=String(data.paradox||'');
    var pn=pa.match(/\|name=([^\n]*)/), pd=pa.match(/\|description=([\s\S]*?)(?=\n\|)/);
    if(pn||pd){
      h.push('<div class="wikisec"><h4>🧩 悖论模拟</h4>');
      if(pn)h.push('<div class="wskillname">'+esc(wikiClean(pn[1]))+'</div>');
      if(pd)h.push('<div class="notice" style="line-height:2">'+esc(wikiClean(pd[1]))+'</div>');
      h.push('</div>');
    }
  }
  return h.join('');
}
function parseVoiceLang(label){
  if(label.indexOf('日')>=0)return '日文';
  if(label.indexOf('英')>=0)return '英文';
  if(label.indexOf('韩')>=0)return '韩文';
  return '中文';
}
function voiceHtml(vd){
  var h=['<div class="wikisec"><h4>🎙 语音记录'+(vd&&vd.items&&vd.items.length?('（'+vd.items.length+' 条）'):'')+'</h4>'];
  if(!vd||!vd.items||!vd.items.length){ h.push('<div class="notice">暂无语音数据</div>'); return h.join(''); }
  var selLang=vd.selLang||'中文';
  if(vd.langs&&vd.langs.length>1){
    h.push('<div class="voice-langs">');
    for(var li=0;li<vd.langs.length;li++){
      var lg=vd.langs[li];
      h.push('<button class="mini-btn voice-lang'+(lg===selLang?' on':'')+'" data-lg="'+esc(lg)+'">'+esc(lg)+'</button>');
    }
    h.push('</div>');
  }
  for(var i=0;i<vd.items.length;i++){
    var it=vd.items[i];
    h.push('<div class="voice-item"><div class="wskillname">'+esc(it.title)+'</div>'+(it.text?'<div class="voice-txt">'+esc(it.text)+'</div><button class="mini-btn voice-copy" data-txt="'+esc(it.text)+'">📋 复制台词</button>':'')+'</div>');
  }
  h.push('<div class="notice">🔇 语音音频受 PRTS 反爬保护（返回验证页），无法在页面内播放；台词文本已完整展示，可前往 <a href="https://prts.wiki/w/'+esc(encodeURIComponent(vd.pageName||''))+'/语音记录" target="_blank" rel="noopener" style="color:var(--acc2)">PRTS 语音页试听</a>。</div>');
  return h.join('');
}
function attachVoiceHandlers(body, name, vd){
  if(!body)return;
  var btns=body.querySelectorAll('.voice-lang');
  for(var bi=0;bi<btns.length;bi++){
    (function(btn){ btn.onclick=function(){ vd.selLang=btn.getAttribute('data-lg'); renderVoiceHtml(name, vd, body); }; })(btns[bi]);
  }
  var cps=body.querySelectorAll('.voice-copy');
  for(var ci3=0;ci3<cps.length;ci3++){
    (function(cp){ cp.onclick=function(){
      var txt2=cp.getAttribute('data-txt')||'';
      if(!txt2){ toast('该条语音无台词文本'); return; }
      try{
        if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt2).then(function(){ toast('台词已复制'); },function(){ window.prompt('复制以下台词：', txt2); }); }
        else window.prompt('复制以下台词：', txt2);
      }catch(e){ window.prompt('复制以下台词：', txt2); }
    }; })(cps[ci3]);
  }
}
function renderVoiceHtml(name, vd, body){
  if(!body)return;
  body.innerHTML=voiceHtml(vd);
  attachVoiceHandlers(body, name, vd);
}
function wikiVoiceTab(name,data){
  var vc=wikiVoiceCache[name];
  if(vc&&Date.now()-vc.t<3600000){
    setTimeout(function(){ var b1=$('wikiBody'); if(b1&&b1.querySelector('.voice-langs'))renderVoiceHtml(name,vc,b1); else if(b1)renderVoiceHtml(name,vc,b1); },0);
    return voiceHtml(vc);
  }
  var h=['<div class="wikisec"><h4>🎙 语音记录</h4><div class="notice" id="voiceSync">正在从 PRTS 同步语音…（需联网）</div>'];
  prtsFetch(name+'/语音记录', null, function(txt){
    var body=$('wikiBody'); if(!body)return;
    var items=[], langs=[], paths={};
    if(txt){
      var pathM=txt.match(/\|路径=([^\n]*)/);
      if(pathM){
        var ps=pathM[1].split(',');
        for(var pi=0;pi<ps.length;pi++){
          var pv=ps[pi].split(':');
          var p2=pv.slice(1).join(':');
          if(!p2)continue;
          var lg=parseVoiceLang(pv[0]||'');
          if(!paths[lg])paths[lg]=p2.trim();
        }
      }
      var lines=txt.split('\n');
      var curTitle='', curFile='', curText='', hasFile=false;
      for(var vi=0;vi<lines.length;vi++){
        var l=lines[vi].trim();
        if(l.indexOf('|')===0&&l.indexOf('=')>0){
          var kvp=l.slice(1).split('=');
          var k=kvp[0].trim(), v=kvp.slice(1).join('=');
          if(k.indexOf('标题')===0&&!hasFile){ curTitle=wikiClean(v); }
          else if(k.indexOf('语音')===0){ curFile=wikiClean(v); hasFile=true; }
          else if(k.indexOf('台词')===0){
            var wm=v.match(/\{\{VoiceData\/word\|中文\|([^}]*)\}\}/);
            if(wm)curText=wikiClean(wm[1]);
          }
        }
        if(hasFile){
          items.push({title:curTitle||('语音'+(items.length+1)), file:curFile, text:curText});
          curTitle=''; curFile=''; curText=''; hasFile=false;
        }
      }
    }
    var langOrder=['中文','日文','英文','韩文'].filter(function(x){ return paths[x]; });
    var vd={t:Date.now(), items:items, langs:langOrder, paths:paths, selLang:(paths['中文']?'中文':(langOrder[0]||'中文')), pageName:name};
    wikiVoiceCache[name]=vd;
    renderVoiceHtml(name, vd, body);
  });
  return h.join('');
}
var WIKI_NAME_INDEX=null;
function wikiNameIndex(){
  if(WIKI_NAME_INDEX)return WIKI_NAME_INDEX;
  WIKI_NAME_INDEX=[];
  for(var k4 in opByName)WIKI_NAME_INDEX.push(opByName[k4]);
  return WIKI_NAME_INDEX;
}
function wikiSuggestHtml(v){
  var names=wikiNameIndex().filter(function(o5){ return o5.name.indexOf(v)>=0; }).map(function(o5){ return o5.name; }).slice(0,8);
  if(!names.length)return '';
  var html=[];
  for(var i2=0;i2<names.length;i2++){
    var o2=opByName[names[i2]];
    html.push('<div class="wikisuggest-item" data-n="'+esc(o2.name)+'"><span class="ws-name">'+esc(o2.name)+'</span><span class="ws-stars">'+stars(o2.rarity)+'</span>'+(o2.prof?'<span class="ws-prof">'+esc(o2.prof)+'</span>':'')+'</div>');
  }
  return html.join('');
}
function cmpAttr(txt, k){
  var m=String(txt||'').match(new RegExp('\\|'+k+'=([^\\n]*)'));
  return m?m[1].trim():'';
}
function cmpNum(v){ var n=parseInt(String(v||'').replace(/[^0-9-]/g,''),10); return isNaN(n)?null:n; }
function cmpHtml(a, c1a, c3a, b, c1b, c3b){
  var oa=opOf(a), ob=opOf(b);
  var h=['<div class="wikitbl"><table><tr><th></th><th>'+esc(oa?oa.name:a)+'</th><th>'+esc(ob?ob.name:b)+'</th></tr>'];
  function row(label, ka, kb){
    var va=cmpAttr(c1a||'',ka||label), vb=cmpAttr(c1b||'',kb||label);
    var na=cmpNum(va), nb=cmpNum(vb);
    var better='';
    if(na!==null&&nb!==null&&na!==nb)better=na>nb?'<span class="cmp-better">▲</span>':'<span class="cmp-better">▼</span>';
    if(!va&&!vb)return;
    h.push('<tr><td>'+label+'</td><td>'+esc(va||'—')+' '+better+'</td><td>'+esc(vb||'—')+' '+(better&&na<nb?'<span class="cmp-better">▲</span>':(better&&na>nb?'<span class="cmp-better">▼</span>':''))+'</td></tr>');
  }
  row('职业','职业');
  row('分支','分支');
  row('位置','位置');
  row('标签','标签');
  row('特性','特性');
  var stages=[['精英0·1级','精英0_1级'],['精英0·满级','精英0_满级'],['精英1·满级','精英1_满级'],['精英2·满级','精英2_满级']];
  var sts=[['生命','_生命上限'],['攻击','_攻击'],['防御','_防御'],['法抗','_法术抗性']];
  for(var si=0;si<stages.length;si++){
    for(var sj=0;sj<sts.length;sj++){
      row(stages[si][0]+'·'+sts[sj][0], stages[si][1]+sts[sj][1], stages[si][1]+sts[sj][1]);
    }
  }
  row('再部署','再部署');
  row('部署费用','部署费用');
  row('阻挡数','阻挡数');
  row('攻击速度','攻击速度');
  row('信赖·生命','信赖加成_生命上限');
  row('信赖·攻击','信赖加成_攻击');
  row('信赖·防御','信赖加成_防御');
  h.push('</table></div>');
  if((!c1a&&!c3a)||(!c1b&&!c3b))h.push('<div class="notice">部分干员数据同步失败（需联网访问 PRTS，或该干员未收录）</div>');
  return h.join('');
}
function openCompare(){
  __wikiBack=openCompare;
  var h=['<h4 class="sect" style="margin-top:0">⚖️ 干员对比</h4>'];
  h.push('<div class="wikisearch"><input id="cmpA" placeholder="干员A，如：能天使"/><input id="cmpB" placeholder="干员B，如：艾雅法拉"/><button class="mini-btn" id="cmpGo">对比</button></div>');
  h.push('<div class="wikihint">对比两位干员的基础信息与属性数值（实时同步 PRTS，已查询过的干员秒开）。▲为数值更高的一侧。</div>');
  h.push('<div id="cmpOut"><div class="notice">输入两位干员名后点击「对比」，或直接点击下方干员头像选择</div></div>');
  h.push('<div id="cmpPick" class="cmp-pick"></div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var ca=$('cmpA'), cb=$('cmpB'), cg=$('cmpGo');
  function go(){
    var a=ca?ca.value.trim():'', b2=cb?cb.value.trim():'';
    if(!a||!b2){ toast('请输入两位干员名'); return; }
    renderCompare(a,b2);
  }
  if(cg)cg.onclick=go;
  if(ca&&cb){ ca.onkeydown=function(e){ if(e.key==='Enter'&&cb)cb.focus(); }; cb.onkeydown=function(e){ if(e.key==='Enter')go(); }; }
  // 热门干员快捷选择
  var hot=['能天使','艾雅法拉','银灰','史尔特尔','玛恩纳','塞雷娅','凯尔希','棘刺','伊内丝','逻各斯'];
  var ph=['<div class="cmp-hot">'];
  for(var hi2=0;hi2<hot.length;hi2++){
    var ho=opOf(hot[hi2]);
    if(ho)ph.push('<span class="cmp-chip" data-n="'+esc(ho.name)+'">'+esc(ho.name)+'</span>');
  }
  ph.push('</div>');
  var pk=$('cmpPick'); if(pk)pk.innerHTML=ph.join('');
  var chips=pk?pk.querySelectorAll('.cmp-chip'):[];
  for(var ci2=0;ci2<chips.length;ci2++){
    (function(ch2){
      ch2.onclick=function(){
        pickCompareChip(ch2.getAttribute('data-n'), ca, cb);
        go();
      };
    })(chips[ci2]);
  }
}
function pickCompareChip(nn, ca, cb){
  if(!nn)return;
  var a2=ca?(ca.value||'').trim():'', b2=cb?(cb.value||'').trim():'';
  if(!a2){ if(ca)ca.value=nn; return; }
  if(b2===nn){ if(cb)cb.value=''; return; }
  if(a2===nn){ if(ca)ca.value=''; if(cb)cb.value=nn; return; }
  if(!b2){ if(cb)cb.value=nn; return; }
  if(cb)cb.value=nn;
}
function renderCompare(a,b){
  var out=$('cmpOut'); if(!out)return;
  a=String(a||'').trim(); b=String(b||'').trim();
  var oa2=opOf(a), ob2=opOf(b);
  var ca2=oa2?oa2.name:a, cb2=ob2?ob2.name:b;
  if(!a||!b){ out.innerHTML='<div class="notice">请输入两位干员名后再对比</div>'; return; }
  if(ca2===cb2){ out.innerHTML='<div class="notice">⚠️ 两位干员相同（'+esc(ca2)+'），请选择不同的干员进行对比</div>'; return; }
  out.innerHTML='<div class="notice">正在同步 <b>'+esc(ca2)+'</b> 与 <b>'+esc(cb2)+'</b> 的数据…（需联网）</div>';
  var gA='', gB='', done2=0;
  function fin(){
    done2++;
    if(done2<2)return;
    var pA=gA?parseWikiPage(gA):{charInfo:'',attr:''};
    var pB=gB?parseWikiPage(gB):{charInfo:'',attr:''};
    out.innerHTML=cmpHtml(a,pA.charInfo||'',pA.attr||'',b,pB.charInfo||'',pB.attr||'');
  }
  prtsFetch(a,null,function(t){ gA=t||''; fin(); });
  prtsFetch(b,null,function(t){ gB=t||''; fin(); });
}
var fhallF='all', fhallQ='', SKINS_FROM='modal';
function renderFashionHall(){
  var grid=$('fhallGrid'); if(!grid)return;
  var names=Object.keys(opByName).sort(function(a,b){ return opByName[b].rarity-opByName[a].rarity||a.localeCompare(b,'zh'); });
  var h=[], i, o, totalSkins=0, totalDyn=0;
  for(i=0;i<names.length;i++){
    o=opByName[names[i]];
    if(fhallF!=='all'&&String(o.rarity)!==fhallF)continue;
    if(fhallQ&&o.name.indexOf(fhallQ)<0)continue;
    var lsT=loadSkinCache(o.name);
    var cntT=0, dynT=0;
    if(lsT){ for(var siF=0;siF<lsT.length;siF++){ var sf=lsT[siF]; if(sf.no==='0'||sf.no===0)continue; if(sf.live)dynT++; else cntT++; } }
    totalSkins+=cntT; totalDyn+=dynT;
    h.push('<div class="fhall-item r'+o.rarity+'" data-op="'+esc(names[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="fhall-nm">'+esc(o.name)+'</div></div>');
  }
  grid.innerHTML=h.join('');
  var cntEl=$('fhallCount'); if(cntEl)cntEl.textContent='共 '+names.length+' 名干员 · 皮肤 '+totalSkins+' 套（点击干员查看时装详情）';
  var items=grid.querySelectorAll('.fhall-item');
  for(i=0;i<items.length;i++){ (function(el){ el.onclick=function(){ SKINS_FROM='fashion'; openSkins(el.getAttribute('data-op')); }; })(items[i]); }
}
function openFashionHall(){
  __wikiBack=openFashionHall;
  var h=['<h4 class="sect" style="margin-top:0">👗 时装回廊</h4>'];
  h.push('<div class="wikisearch"><input id="fhallSearch" placeholder="搜索干员名称..."/></div>');
  h.push('<div class="filters" id="fhallChips"></div>');
  h.push('<div class="mat-count" id="fhallCount"></div>');
  h.push('<div class="fhall-grid" id="fhallGrid"></div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  setChips($('fhallChips'),[['all','全部'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],'all',function(){ fhallF=$('fhallChips')._v; renderFashionHall(); });
  var fi=$('fhallSearch'); if(fi){ var fT=null; fi.oninput=function(){ fhallQ=this.value.trim(); clearTimeout(fT); fT=setTimeout(function(){ renderFashionHall(); },150); }; }
  renderFashionHall();
}
function openAbout(){
  __wikiBack=openAbout;
  var h=['<h4 class="sect" style="margin-top:0">ℹ️ 关于</h4>'];
  h.push('<div class="wikisec"><h4>📦 明日方舟 · 干员寻访模拟器 <b>v12.06</b></h4>');
  h.push('<div class="notice">单文件 HTML 应用，无需安装。按官方规则模拟抽卡：6★ 2%（51抽起每抽+2%，100抽必出）· 5★ 8% · 十连保底5★ · 限定池300井兑换。</div>');
  h.push('<div class="notice">✅ 功能一览：往期全部 442 个卡池（含倒计时）· 自选UP池 · 联动池300井 · 保底共享规则 · 抽卡统计/周月报/成就 · 模拟抽卡（垫刀/UP命中/多轮分布）· Wiki实时数据（属性/技能/材料/档案/语音，六重回退+连通性检测）· 双干员对比 · 皮肤图鉴（缓存秒开）· 材料刷取（内置bilibili掉落数据+逐项推荐刷取关卡）· 存档导入导出 · 四主题</div>');
  h.push('</div>');
  h.push('<div class="wikisec"><h4>⌨️ 快捷键</h4><div class="notice">1 单抽 · 2 十连 · 3 抽到6★ · ←/→ 切卡池 · F 收藏卡池 · G 画廊 · S 统计 · H 寻访记录 · W 心愿单 · P 保底一览</div></div>');
  h.push('<div class="wikisec"><h4>🗂 数据来源</h4><div class="notice">PRTS Wiki（卡池/干员/Wiki数据，更新至 2026-08-29）· bilibili Wiki（精二立绘· 皮肤 · 材料图标与掉落数据）· 图片在线加载，需联网；语音提供台词文本与 PRTS 试听链接</div></div>');
  h.push('<div class="wikisec"><h4>🌐 Wiki 连通性检测</h4><div class="notice">检测本机到 PRTS Wiki 各获取方式（JSONP/CORS/多级代理）的连通性，Wiki 同步失败时可用于排查原因。</div><div style="text-align:center;margin-top:6px"><button class="mini-btn" id="btnWikiProbe">🔍 开始检测</button></div><div id="wikiProbeOut"></div></div>');
  h.push('<div class="wikisec"><h4>📜 最近更新</h4><div id="aboutLog"><div class="notice">加载中…</div></div></div>');
  $('mBody').innerHTML=h.join('');
  var pb=$('btnWikiProbe'); if(pb)pb.onclick=function(){ var po=$('wikiProbeOut'); if(po)wikiProbe(po); };
  var al=$('aboutLog');
  if(al){
    var logTxt=['<b>v12.06</b> 详情出生年月身高编号 · ?快捷键 · Wiki标题渐变','<b>v12.05</b> 详情种族画师声优 · 类型空提示 · 标题渐变','<b>v12.04</b> 复制筛选记录 · 主题持久化 · 心愿清理','<b>v12.03</b> 限定图鉴进度 · 预加载去重','<b>v12.02</b> 紫夜主题 · 主题归一化 · 图标缓存','<b>v12.01</b> 报告出货时段 · 图表卡片化','<b>v12.00</b> 报告保底间隔分布 · 保底触发统计 · 图表动画','<b>v11.99</b> 材料配方全链分解 · 循环防护 · 紧凑节点','<b>v11.98</b> 配方表清理 · 成就计算合并 · 掉落分类徽章','<b>v11.97</b> 每日自动备份 · 批量保存提速 · 分数渐变','<b>v11.96</b> 编号子节兼容 · 掉落排序 · 最优高亮','<b>v11.95</b> 模组数据修复 · 头像缓存 · 类型徽章','<b>v11.94</b> 无障碍标签 · 动画暂停 · 抽卡按钮焕新','<b>v11.93</b> 上限提示 · 低数据模式 · 成就描边','<b>v11.92</b> 刘海安全区 · 键盘省绘制 · 按压反馈','<b>v11.91</b> 长按防误触 · 预加载限量 · 底栏渐变','<b>v11.90</b> 大图双击缩放 · 合成层收敛 · OLED深色','<b>v11.89</b> 回弹控制 · 翻牌加速 · 高对比模式','<b>v11.88</b> 防电话误识别 · 列表离屏渲染 · 横屏适配','<b>v11.87</b> 抽屉滚动记忆 · 模态绘制隔离 · 章节吸附','<b>v11.86</b> 视口声明完善 · 抽屉合成层 · 超窄屏两列','<b>v11.85</b> 减少动画降级 · 44px热区 · 网格离屏','<b>v11.84</b> 键盘弹起避让 · 离屏渲染 · 六星横幅横滚','<b>v11.83</b> 保底浮标避让 · 动画合成层 · 触控尺寸','<b>v11.82</b> 手机端防缩放 · 触摸优化 · 安全区适配','<b>v11.81</b> 战绩即时刷新 · 自选缓存 · 抽卡按钮光晕','<b>v11.80</b> 对比chip语义 · 稀有度分组 · 自选标题强调','<b>v11.79</b> 对比同名拦截 · 建议索引缓存 · 职业标签','<b>v11.78</b> 预加载单次请求 · 井选择分页 · 统计数字渐变','<b>v11.77</b> 统计页单遍聚合 · 井兑换快照校验 · 图表行悬停','<b>v11.76</b> 抽到6★顺序修正 · 图鉴排序提速 · 成就悬停','<b>v11.75</b> 历史筛选零污染 · 筛选结果缓存 · 日期胶囊','<b>v11.74</b> 皮肤图片失败占位 · 滑动窗口统计 · 热力图悬停','<b>v11.73</b> 跨期新干员修正 · 卡池状态缓存 · 语音美化','<b>v11.72</b> 历史标签 · 列表缓存 · 行悬停','<b>v11.71</b> 开启倒计时小时 · 关卡缓存 · Wiki美化','<b>v11.70</b> 模拟自选池拦截 · 空池防护 · 当前池高亮','<b>v11.69</b> 概率提示可见 · jsonp超时 · 输入聚焦','<b>v11.68</b> 运势每日固定 · 章节缓存 · 标题渐变','<b>v11.67</b> 清空重置领取 · 批量性能 · 卡片美化','<b>v11.66</b> 倒计时小时 · 皮肤缓存 · 美化','<b>v11.65</b> 删除动态皮肤数量显示','<b>v11.64</b> 真实掉率比值 · 删除真实记录','<b>v11.63</b> 删除不存在材料','<b>v11.62</b> 材料列表清理 · 兜底两字','<b>v11.61</b> 材料图标本地嵌入 · 离线可用','<b>v11.60</b> 材料实时快速失败 · PRTS冷却','<b>v11.59</b> 时装回廊动态角标 · 功能体检','<b>v11.58</b> 限定归类修正 · 兑换计入统计','<b>v11.57</b> 代理链扩充至8重 · 皮肤注释清理','<b>v11.56</b> 模拟等价消耗 · 详情皮肤数','<b>v11.55</b> 立绘画廊职业筛选 · 计数','<b>v11.54</b> 井兑换规则修正 · 联动文案','<b>v11.53</b> 成就扩充（联动/井中月/六星军团）','<b>v11.52</b> 关于面板更新 · 时装回廊统计','<b>v11.51</b> Wiki连通性检测 · 关于面板优化','<b>v11.50</b> 养成材料逐项推荐 · 皮肤泄漏/范围修复','<b>v11.49</b> 材料刷取查询重做 · 真图标','<b>v11.48</b> Wiki同步六重回退 · 进度提示','<b>v11.47</b> Wiki返回按钮 · 材料PRTS链接','<b>v11.46</b> 材料图标彩色兜底','<b>v11.45</b> 材料入口去重 · 图标重试','<b>v11.44</b> 皮肤懒加载缓存 · 时装角标','<b>v11.43</b> 特性行 · 时装列表','<b>v11.42</b> 联动池300井','<b>v11.41</b> 手机端卡池列表可滑动','<b>v11.40</b> Wiki整页获取 · 五重回退','<b>v11.37</b> 各卡池6★率排行 · 模拟vs真实对比','<b>v11.36</b> 历史筛选导出 · 手机端优化','<b>v11.35</b> 报告环比对比 · 异常干员防护','<b>v11.34</b> 模拟存档隔离修复 · 垫刀模拟','<b>v11.33</b> 模拟UP命中统计','<b>v11.32</b> 图鉴排序增强 · 快捷键扩充','<b>v11.31</b> 存档导入升级（文件拖拽+备份恢复）','<b>v11.30</b> 模拟10次统计 · 源石绿主题','<b>v11.29</b> 卡池倒计时 · 成就扩充至22项','<b>v11.28</b> 干员对比工具 · 皮肤图鉴缓存','<b>v11.27</b> 档案解析修复 · 搜索候选 · 并行预加载','<b>v11.26</b> Wiki引用重构（队列+分节缓存）'].join('<br/>');
    al.innerHTML=logTxt;
  }
  openModalBox();
}
function openWikiSearch(){
  __wikiBack=openWikiSearch;
  var h=['<h4 class="sect" style="margin-top:0">🔍 干员Wiki查询</h4>'];
  h.push('<div class="wikisearch"><input id="wikiSearchInput" placeholder="输入干员名，如：能天使 / 玛恩纳 / 缪尔赛思..."/><button class="mini-btn" id="wikiSearchGo">查询</button><button class="mini-btn" id="wikiCmp">⚖️ 对比</button></div>');
  h.push('<div id="wikiSuggest" class="wikisuggest"></div>');
  h.push('<div class="wikihint">对接 <b>PRTS Wiki</b>（prts.wiki）实时同步干员数据：属性数值 · 天赋 · 技能（含专精） · 精英化/技能升级材料。<br/>输入时下方实时显示本工具收录的干员候选，点击直接查询；也可查询<b>任意</b>PRTS 上存在的干员。</div>');
  h.push('<div id="wikiOut"></div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var wsi=$('wikiSearchInput'), wsgo=$('wikiSearchGo');
  function go(){ var v=wsi?wsi.value.trim():''; if(!v){ toast('请输入干员名'); return; } var sb=$('wikiSuggest'); if(sb)sb.innerHTML=''; wikiDetail(v,$('wikiOut')); }
  function renderSuggest(v){
    var sb=$('wikiSuggest'); if(!sb)return;
    if(!v){ sb.innerHTML=''; return; }
    var hh=wikiSuggestHtml(v);
    sb.innerHTML=hh;
    if(!hh)return;
    var its=sb.querySelectorAll('.wikisuggest-item');
    for(var si3=0;si3<its.length;si3++){
      (function(it){ it.onclick=function(){ var nn=it.getAttribute('data-n'); if(wsi)wsi.value=nn; sb.innerHTML=''; wikiDetail(nn,$('wikiOut')); }; })(its[si3]);
    }
  }
  if(wsgo)wsgo.onclick=go;
  var wcmp=$('wikiCmp'); if(wcmp)wcmp.onclick=function(){ openCompare(); };
  if(wsi){ wsi.onkeydown=function(e){ if(e.key==='Enter')go(); }; wsi.oninput=function(){ var v=this.value.trim(); clearTimeout(window.__wsT); window.__wsT=setTimeout(function(){ renderSuggest(v); },120); }; setTimeout(function(){ try{ wsi.focus(); }catch(e){} },120); }
}
var skinCache={};
function skinListUrl(name){
  return 'https://wiki.biligame.com/arknights/api.php?action=query&list=allimages&aiprefix='+encodeURIComponent('Pack '+name+' skin')+'&ailimit=50';
}
function skinThumb(skin,w){
  var m=skin.url.match(/images\/arknights\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/);
  if(!m)return skin.url;
  return 'https://patchwiki.biligame.com/images/arknights/thumb/'+m[1]+'/'+m[2]+'/'+m[3]+'/'+(w||480)+'px-'+encodeURIComponent(skin.name);
}
function jsonp(url,cb,timeout){
  var nm='_sk'+Math.floor(Math.random()*1e9);
  var sc=document.createElement('script');
  var done=false;
  function cleanup(){ try{ delete window[nm]; }catch(e){} if(sc.parentNode)sc.parentNode.removeChild(sc); }
  window[nm]=function(data){ if(done)return; done=true; cleanup(); cb(data); };
  sc.onerror=function(){ if(done)return; done=true; cleanup(); cb(null); };
  if(timeout)setTimeout(function(){ if(done)return; done=true; cleanup(); cb(null); },timeout);
  else setTimeout(function(){ if(done)return; done=true; cleanup(); cb(null); },12000);
  sc.src=url+'&format=json&callback='+nm;
  document.body.appendChild(sc);
}
var __wikiBack=null;
function renderWikiData(name,data,target){
  var box=target||$('mBody');
  function parseMatsLine(line){
    var parts=String(line||'').split('}}').map(function(x){x=x.trim(); if(x.indexOf('材料消耗|')>=0){ var seg=x.split('材料消耗|')[1]; return seg; } return '';}).filter(function(x){return x;});
    return parts.map(function(x){ var seg2=x.split('|'); return (seg2[0]||'')+(seg2[1]?'×'+seg2[1]:''); }).join(' + ');
  }
  var h=['<h4 class="sect" style="margin-top:0">📊 '+esc(name)+' · Wiki数据</h4><button class="mini-btn" id="wikiBack">← 返回干员详情</button>'];
  var o=opOf(name);
  if(data&&data.acquire){
    var acqTxt=String(data.acquire||'');
    var acqPieces=[];
    var am1=acqTxt.match(/\|获得方式=([^\n]*)/);
    var am2=acqTxt.match(/\|上线时间=([^\n]*)/);
    if(am1)acqPieces.push('获得方式：'+stripWiki(am1[1]));
    if(am2)acqPieces.push('上线时间：'+stripWiki(am2[1]));
    if(acqPieces.length)h.push('<div class="wikisec"><h4>🎁 获取方式</h4><div class="notice">'+esc(acqPieces.join('<br/>'))+'</div></div>');
  }
  if(data&&data.attr){
    var attr=data.attr;
    var kvCache={};
    function kv(k){ if(kvCache[k]!==undefined)return kvCache[k]; var m=attr.match(new RegExp('\\|'+k+'=(.*?)(\\n|$)')); kvCache[k]=m?m[1].trim():''; return kvCache[k]; }
    h.push('<div class="wikisec"><h4>📈 属性数值（PRTS）</h4>');
    var rows=[['再部署',kv('再部署')],['部署费用',kv('部署费用')],['阻挡数',kv('阻挡数')],['攻击速度',kv('攻击速度')]];
    h.push('<div class="wikirows">');
    for(var ri=0;ri<rows.length;ri++){ if(rows[ri][1])h.push('<div class="wrow"><b>'+rows[ri][0]+'</b><span>'+esc(rows[ri][1])+'</span></div>'); }
    h.push('</div>');
    var stages=[['精英0·1级','精英0_1级'],['精英0·满级','精英0_满级'],['精英1·满级','精英1_满级'],['精英2·满级','精英2_满级']];
    h.push('<div class="wikitbl"><table><tr><th>阶段</th><th>生命</th><th>攻击</th><th>防御</th><th>法抗</th></tr>');
    for(ri=0;ri<stages.length;ri++){ var st=stages[ri]; var hp=kv(st[1]+'_生命上限'), atk=kv(st[1]+'_攻击'), df=kv(st[1]+'_防御'), mr=kv(st[1]+'_法术抗性'); if(hp||atk)h.push('<tr><td>'+st[0]+'</td><td>'+esc(hp)+'</td><td>'+esc(atk)+'</td><td>'+esc(df)+'</td><td>'+esc(mr)+'</td></tr>'); }
    h.push('</table></div>');
    var e0=kv('精英0_满级_攻击'), e2=kv('精英2_满级_攻击'), grow=0;
    if(e0&&e2){ grow=Math.round((parseInt(e2,10)-parseInt(e0,10))/parseInt(e0,10)*100); }
    if(grow)h.push('<div class="notice">📈 精英化攻击成长：满级 '+esc(e0)+' → '+esc(e2)+'（+'+grow+'%）</div>');
    var tr=kv('信赖加成_生命上限'), ta=kv('信赖加成_攻击'), td=kv('信赖加成_防御');
    if(tr||ta||td)h.push('<div class="notice">❤️ 信赖加成：生命 +'+esc(tr||'0')+' · 攻击 +'+esc(ta||'0')+' · 防御 +'+esc(td||'0')+'</div>');
    h.push('</div>');
  }
  if(data&&data.talents){
    var talTxt=wikiColor(stripWiki(data.talents));
    h.push('<div class="wikisec"><h4>✨ 天赋</h4><div class="notice" style="white-space:pre-wrap;line-height:2">'+esc(talTxt)+'</div></div>');
  }
  if(data&&data.skills){
    h.push('<div class="wikisec"><h4>⚔️ 技能详情</h4>');
    var skills=data.skills;
    var blocks=skills.split(/'''技能[0-9]+（/);
    for(var bi=1;bi<blocks.length;bi++){ var blk=blocks[bi]; var endNm=blk.indexOf("'''"); var nm=endNm>0?blk.slice(0,endNm):('技能'+bi); var endNmDummy=endNm>=0?blk.slice(0,endNm):''; h.push('<div class="wskill"><div class="wskillname">'+esc(stripWiki(wikiColor(nm)))+'</div>'); var sm=blk.match(/技能名=([^\n]*)/); if(sm)h.push('<div class="wskillnm">'+esc(stripWiki(wikiColor(sm[1])))+'</div>'); var t1=blk.match(/技能类型1=([^\n]*)/), t2=blk.match(/技能类型2=([^\n]*)/); if(t1||t2)h.push('<div class="wskilltype">'+esc(stripWiki(wikiColor(t1?t1[1]:''))+(t1&&t2?' · ':'')+stripWiki(wikiColor(t2?t2[1]:'')))+'</div>'); var lv7m=blk.match(/技能7描述=([^\n]*)/); if(lv7m)h.push('<div class="wskilldesc">'+esc(stripWiki(wikiColor(lv7m[1])))+'</div>'); var i7=blk.match(/技能7初始=([^\n]*)/), c7=blk.match(/技能7消耗=([^\n]*)/), d7=blk.match(/技能7持续=([^\n]*)/); if(i7||c7||d7)h.push('<div class="wskillnum">初始 '+(i7?esc(stripWiki(wikiColor(i7[1]))):'—')+' · 消耗 '+(c7?esc(stripWiki(wikiColor(c7[1]))):'—')+' · 持续 '+(d7&&d7[1]?esc(stripWiki(wikiColor(d7[1]))):'—')+'（7级）</div>'); var m1=blk.match(/技能专精1描述=([^\n]*)/); if(m1)h.push('<div class="wskilldesc m">专精1：'+esc(stripWiki(wikiColor(m1[1])))+'</div>'); var m2=blk.match(/技能专精2描述=([^\n]*)/); if(m2)h.push('<div class="wskilldesc m">专精2：'+esc(stripWiki(wikiColor(m2[1])))+'</div>'); var m3=blk.match(/技能专精3描述=([^\n]*)/); if(m3)h.push('<div class="wskilldesc m">专精3：'+esc(stripWiki(wikiColor(m3[1])))+'</div>'); h.push('</div>'); }
    h.push('</div>');
  }
  if(data&&data.mats){
    var matsLines=[];
    var matsTxt=String(data.mats||'');
    var ml=matsTxt.split('\n');
    for(var mi2=0;mi2<ml.length;mi2++){ var l2=ml[mi2].trim(); if(l2.indexOf('|精')>=0&&l2.indexOf('=')>=0){ var kv2=l2.split('='); var itemsB=parseMatsItems(kv2[1]||''); if(itemsB.length)matsLines.push('<div class="wrow"><b>'+(kv2[0].indexOf('精1')>=0?'精1':'精2')+'</b><span>'+matConsSpans(itemsB)+'</span></div>'); } }
    if(matsLines.length){ h.push('<div class="wikisec"><h4>🧱 精英化材料</h4><div class="wikirows">'+matsLines.join('')+'</div></div>'); }
  }
  if(data&&data.skillMats){
    var smLines=[];
    var smTxt=String(data.skillMats||'');
    var sml=smTxt.split('\n');
    for(var smi=0;smi<sml.length;smi++){ var sl2=sml[smi].trim(); if(sl2.indexOf('|')===0&&sl2.indexOf('=')>=0){ var kv3=sl2.slice(1).split('='); var lvName=kv3[0]; var itemsS=parseMatsItems(kv3[1]||''); if(itemsS.length)smLines.push('<div class="wrow"><b>'+esc(lvName.replace(/^一/,'专精'))+'</b><span>'+matConsSpans(itemsS)+'</span></div>'); } }
    if(smLines.length){ h.push('<div class="wikisec"><h4>📚 技能升级材料</h4><div class="wikirows">'+smLines.join('')+'</div></div>'); }
  }
  h.push('<div class="notice">数据来源：PRTS Wiki（实时同步）· 点击板块标题可折叠</div>');
  box.innerHTML=h.join('');
  var wb=$('wikiBack'); if(wb)wb.onclick=function(){ if(__wikiBack)__wikiBack(); else openModal(name); };
  var wsecs=box.querySelectorAll('.wikisec');
  for(var wsi=0;wsi<wsecs.length;wsi++){
    (function(ws){
      var h4=ws.querySelector('h4');
      if(h4)h4.onclick=function(){ var body=ws.querySelectorAll('div'); for(var bi5=0;bi5<body.length;bi5++){ if(body[bi5]!==h4){ body[bi5].style.display=(body[bi5].style.display==='none')?'':'none'; } } ws.classList.toggle('collapsed'); };
    })(wsecs[wsi]);
  }
  openModalBox();
}
function preloadSkins(name, cb){
  var cache=skinCache[name];
  if(cache&&Date.now()-cache.t<600000){ if(cb)cb(cache.skins); return; }
  jsonp(skinListUrl(name),function(data){
    var skins=[];
    if(data&&data.query&&data.query.allimages){
      for(var i=0;i<data.query.allimages.length;i++){
        var it=data.query.allimages[i];
        var m=it.name.match(/skin_(\d+)(?:_live)?\.(png|gif)$/i);
        var isLive=it.name.toLowerCase().indexOf('_live')>=0||it.name.toLowerCase().indexOf('.gif')>=0;
        if(m&&parseInt(m[1],10)>=0){ skins.push({name:it.name,url:it.url,no:m[1],live:isLive}); }
      }
    }
    skinCache[name]={t:Date.now(),skins:skins};
    if(cb)cb(skins);
  },12000);
}
function saveSkinCache(name, skins){
  try{
    var raw=localStorage.getItem('akgacha_skins_v1');
    var o=raw?JSON.parse(raw):{};
    o[name]={t:Date.now(), s:skins.slice(0,30)};
    var ks=Object.keys(o);
    if(ks.length>80){ ks.sort(function(a,b){ return (o[a].t||0)-(o[b].t||0); }); for(var i=0;i<ks.length-80;i++)delete o[ks[i]]; }
    localStorage.setItem('akgacha_skins_v1', JSON.stringify(o));
  }catch(e){}
}
var SKIN_CACHE_PARSED=null, SKIN_CACHE_T=0;
function loadSkinCache(name){
  try{
    if(!SKIN_CACHE_PARSED||Date.now()-SKIN_CACHE_T>2000){ SKIN_CACHE_PARSED=null; var raw2=localStorage.getItem('akgacha_skins_v1'); if(raw2)SKIN_CACHE_PARSED=JSON.parse(raw2); SKIN_CACHE_T=Date.now(); }
    var e=SKIN_CACHE_PARSED&&SKIN_CACHE_PARSED[name];
    if(e&&e.s&&Date.now()-e.t<30*86400000)return e.s;
  }catch(e2){}
  return null;
}
function openSkins(opName){
  var o=opOf(opName); if(!o)return;
  var name=o.name;
  var cache=skinCache[name];
  if(cache&&Date.now()-cache.t<600000){ renderSkins(name,cache.skins); return; }
  var ls=loadSkinCache(name);
  if(ls){ skinCache[name]={t:Date.now(),skins:ls}; renderSkins(name,ls); return; }
  $('mBody').innerHTML='<div class="notice">正在加载 '+esc(name)+' 的皮肤…（需联网）</div>';
  openModalBox();
  jsonp(skinListUrl(name),function(data){
    var skins=[], failed=false;
    if(data&&data.query&&data.query.allimages){
      for(var i=0;i<data.query.allimages.length;i++){
        var it=data.query.allimages[i];
        var m=it.name.match(/skin_(\d+)(?:_live)?\.(png|gif)$/i);
        var isLive=it.name.toLowerCase().indexOf('_live')>=0||it.name.toLowerCase().indexOf('.gif')>=0;
        if(m&&parseInt(m[1],10)>=0){ skins.push({name:it.name,url:it.url,no:m[1],live:isLive}); }
      }
    } else failed=true;
    skinCache[name]={t:Date.now(),skins:skins};
    if(!failed)saveSkinCache(name,skins);
    renderSkins(name,skins,failed);
  },12000);
}
function skinImgFail(im){
  if(!im)return;
  if(im.dataset.fb){ var vf=im.dataset.fb; im.dataset.fb=''; im.src=vf; return; }
  if(im.dataset.fb2){ var v2=im.dataset.fb2; im.dataset.fb2=''; im.src=v2; return; }
  im.onerror=null;
  if(im.style)im.style.display='none';
  var p=im.parentNode;
  if(p&&p.classList&&p.classList.add)p.classList.add('imgfail');
}
function renderSkins(name,skins,failed){
  var o=opOf(name), h=[];
  var from=SKINS_FROM==='fashion'?'fashion':(SKINS_FROM==='gallery'?'gallery':'modal');
  var backTxt=from==='fashion'?'← 返回时装回廊':(from==='gallery'?'← 返回立绘画廊':'← 返回干员详情');
  h.push('<button class="mini-btn" id="btnSkinsBack" style="margin-bottom:8px">'+backTxt+'</button>'+(from!=='modal'?'<button class="mini-btn" id="btnSkinsDetail" style="margin-bottom:8px;margin-left:8px">👤 干员详情</button>':''));
  var skinList=skins.filter(function(s){return !(s.no==='0'||s.no===0);});
  h.push('<div class="mhead"><div class="minfo"><h2>'+esc(name)+' · 皮肤图鉴</h2><div class="kv"><b>皮肤数量</b>'+skinList.length+'</div></div></div>');
  h.push('<div class="wikihint">✨动态时装：动图请于游戏内查看（本工具显示静态图）。皮肤名称/系列/介绍来自 PRTS，获取方式/价格为社区整理，以游戏内为准。</div>');
  if(!skins.length){
    h.push('<div class="notice">该干员暂无皮肤'+(failed?'，或加载失败（需联网访问 bilibili Wiki）':'')+'</div>');
    if(failed)h.push('<div style="text-align:center;margin-top:6px"><button class="mini-btn" id="skinRetry">🔄 重试加载皮肤</button></div>');
  }
  else {
    h.push('<div class="skingrid">');
    var ciInfo=wikiCache[name]?wikiCache[name].charInfo:'';
    for(var i=0;i<skins.length;i++){
      var s=skins[i];
      if(s.no==='0'||s.no===0)continue;
      var no=parseInt(s.no,10)||1;
      var t480=skinThumb(s,480);
      var src=s.live&&s.url? s.url : (t480||s.url);
      var t200=skinThumb(s,200);
      var dynTag=s.live?'<span class="skin-dyn">✨动态时装</span>':'';
      // 皮肤名/系列/介绍：sec1 时装数据优先，其次 SKIN_META
      var sName='', sSeries='', sIntro='', sObtain='', sPrice='';
      if(ciInfo){
        var cim=ciInfo.match(new RegExp('\\|时装'+no+'名称=([^\\n]*)'));
        var cim2=ciInfo.match(new RegExp('\\|时装'+no+'系列=([^\\n]*)'));
        var cim3=ciInfo.match(new RegExp('\\|时装'+no+'介绍=([\\s\\S]*?)(?=\\n\\||\\n<!--|\\n}}|$)'));
        var cim4=ciInfo.match(new RegExp('\\|时装'+no+'价格=([^\\n]*)'))||ciInfo.match(new RegExp('\\|时装'+no+'售价=([^\\n]*)'));
        var cim5=ciInfo.match(new RegExp('\\|时装'+no+'获取方式=([^\\n]*)'))||ciInfo.match(new RegExp('\\|时装'+no+'获取=([^\\n]*)'))||ciInfo.match(new RegExp('\\|时装'+no+'获得方式=([^\\n]*)'));
        if(cim)sName=wikiClean(cim[1]);
        if(cim2)sSeries=wikiClean(cim2[1]);
        if(cim3)sIntro=wikiClean(cim3[1]);
        if(cim4)sPrice=wikiClean(cim4[1]);
        if(cim5)sObtain=wikiClean(cim5[1]);
      }
      var sm=(SKIN_META[name]||{})[no]||{};
      if(!sName)sName=sm.name||('皮肤 '+s.no);
      if(!sSeries)sSeries=sm.series||'';
      if(!sIntro)sIntro='';
      if(!sObtain)sObtain=sm.obtain||'游戏内时装商店';
      if(!sPrice)sPrice=sm.price||'以游戏内为准';
      var infoLine='<div class="skin-info"><b>'+esc(sName)+'</b>'+(sSeries?'（'+esc(sSeries)+'）':'')+'<br/>获取：'+esc(sObtain)+' · 价格：'+esc(sPrice)+(s.live?' · ✨动态时装（动图请于游戏内查看）':'')+(sIntro?'<br/>介绍：'+esc(sIntro):'')+'</div>';
      h.push('<div class="skin-item'+(s.live?' live':'')+'" data-url="'+esc(s.url)+'"><img loading="lazy" src="'+esc(src)+'" data-fb="'+esc(t200||s.url)+'" data-fb2="'+esc(s.url)+'" alt=""/><div class="skin-nm">'+esc(sName)+dynTag+'</div>'+infoLine+'</div>');
    }
    h.push('</div><div class="notice">点击皮肤查看高清原图</div>');
  }
  $('mBody').innerHTML=h.join('');
  var bb=$('btnSkinsBack'); if(bb)bb.onclick=function(){ if(from==='fashion')openFashionHall(); else if(from==='gallery')openGallery(); else openModal(name); };
  var bd=$('btnSkinsDetail'); if(bd)bd.onclick=function(){ openModal(name); };
  var sr=$('skinRetry'); if(sr)sr.onclick=function(){ try{ delete skinCache[name]; localStorage.removeItem('akgacha_skins_v1'); }catch(e){} openSkins(name); };
  var items=$('mBody').querySelectorAll('.skin-item');
  for(var j=0;j<items.length;j++){ (function(el){ el.onclick=function(){ if(el.classList&&el.classList.contains('imgfail')){ toast('图片未加载成功，无法查看大图'); return; } openLightbox(el.getAttribute('data-url')); }; })(items[j]); }
  var simgs=$('mBody').querySelectorAll('.skin-item img');
  for(var si2=0;si2<simgs.length;si2++){
    (function(im){ im.onerror=function(){ skinImgFail(im); }; })(simgs[si2]);
  }
  if(!ciInfo){
    prtsFetch(name,null,function(wt){
      if(!wt)return;
      try{ var pdi=parseWikiPage(wt); wikiCache[name]=wikiCache[name]||{}; wikiCache[name].charInfo=pdi.charInfo||''; }catch(e){}
      try{ if($('mBody')&&$('mBody').querySelector('.skingrid')){ var sc3=skinCache[name]; if(sc3&&sc3.skins)renderSkins(name,sc3.skins); } }catch(e){}
    });
  }
  openModalBox();
}
function jumpBanner(id){
  buildBannerIndex();
  if(!BID_INDEX[id]){ toast('该卡池数据不存在（可能已随数据更新移除）'); return; }
  state.cur=id; save(); closeModal();
  renderBannerList(); renderBannerInfo(); renderStats();
  if(isMobile())closeDrawer();
}
function copyBatch(){
  var res=lastBatch||[], NL=String.fromCharCode(10), cnt={}, i, nm;
  var c6=0,c5=0;
  for(i=0;i<res.length;i++){ var oo=opOf(res[i].op); nm=oo?oo.name:res[i].op; cnt[nm]=(cnt[nm]||0)+1; if(res[i].rar===6)c6++; else if(res[i].rar===5)c5++; }
  var names=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  var lines=[];
  for(i=0;i<names.length;i++){ lines.push(names[i]+' ×'+cnt[names[i]]); }
  var head='本次抽卡 '+res.length+' 抽（6★×'+c6+' · 5★×'+c5+' · 6★率 '+(res.length?(c6/res.length*100).toFixed(1):0)+'%）：';
  var text=head+NL+lines.join(NL);
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('本次结果已复制'); }
  catch(e){ window.prompt('复制以下内容：', text); }
  ta.remove();
}
function openAllResults(){
  var res=lastBatch||[], h=['<h4 class="sect" style="margin-top:0">本次抽卡结果（'+res.length+' 抽）</h4><button class="mini-btn" id="btnCopyBatch">复制本次结果</button><div id="allResList">'], i, rr, oo;
  var RES_N=window.__RES_N||200, resShow=Math.min(res.length,RES_N);
  for(i=0;i<resShow;i++){ rr=res[i]; oo=opOf(rr.op); h.push('<div class="hitem r'+rr.rar+' ares" data-op="'+esc(rr.op)+'"><span class="star">'+stars(rr.rar)+'</span><span>'+esc(oo?oo.name:rr.op)+'</span></div>'); }
  if(res.length>resShow)h.push('<button class="mini-btn" id="resMore" style="margin:6px auto;display:block">加载更多（'+(res.length-resShow)+'）</button>');
  h.push('</div>');
  $('mBody').innerHTML=h.join('');
  var cbb=$('btnCopyBatch'); if(cbb)cbb.onclick=copyBatch;
  var rm=$('resMore'); if(rm)rm.onclick=function(){ window.__RES_N=(window.__RES_N||200)+200; openAllResults(); };
  var ares=$('mBody').querySelectorAll('.ares');
  for(i=0;i<ares.length;i++){ ares[i].onclick=function(){ openModal(this.getAttribute('data-op')); }; }
  openModalBox();
}
function openLightbox(src){
  var lb=$('lightbox'), im=$('lbImg');
  if(!lb||!im||!src)return;
  im.src=src;
  lb.classList.add('show');
}
var lbTapT=0;
function lightboxTap(){
  var lb=$('lightbox');
  if(!lb)return;
  var now=Date.now();
  if(isMobile()&&now-(lbTapT||0)<300){ lb.classList.toggle('zoomed'); lbTapT=0; return; }
  if(!isMobile()){ closeLightbox(); return; }
  lbTapT=now;
  setTimeout(function(){ if(lbTapT===now){ lbTapT=0; closeLightbox(); } }, 320);
}
function closeLightbox(){ var lb=$('lightbox'); if(lb)lb.classList.remove('show'); }
function mobileA11y(){
  if(!isMobile())return;
  var mc=$('mClose'); if(mc&&!mc.getAttribute('aria-label'))mc.setAttribute('aria-label','关闭');
  var dc=$('drawerClose'); if(dc&&!dc.getAttribute('aria-label'))dc.setAttribute('aria-label','关闭抽屉');
}
function openModalBox(){ var md=$('modal'); if(md)md.classList.add('show'); try{ document.body.style.overflow='hidden'; }catch(e){} }
function closeModalBox(){ var md=$('modal'); if(md)md.classList.remove('show'); var sb=$('sidebar'); if(isMobile()&&sb&&sb.classList&&sb.classList.contains('open')){ try{ document.body.style.overflow='hidden'; }catch(e){} } else { try{ document.body.style.overflow=''; }catch(e){} } }
function closeModal(){ closeModalBox(); }
function isMobile(){ return (typeof window!=='undefined')&&!!window.innerWidth&&window.innerWidth<=720; }
function mobileKbdActive(vh, vvH){ return !!vh&&!!vvH&&(vh-vvH)>160; }
function mobileKbdResize(){
  if(!isMobile())return;
  var bar=$('gacha');
  if(!bar)return;
  var vv=(typeof visualViewport!=='undefined')?visualViewport:null;
  var vh=(typeof window!=='undefined')?window.innerHeight:0;
  var vvH=vv?vv.height:vh;
  bar.classList.toggle('kbd-hide', mobileKbdActive(vh, vvH));
}
function mobileKbdActive(vh, vvH){ return !!vh&&!!vvH&&(vh-vvH)>160; }
function mobileKbdResize(){
  if(!isMobile())return;
  var bar=$('gacha');
  if(!bar)return;
  var vv=(typeof visualViewport!=='undefined')?visualViewport:null;
  var vh=(typeof window!=='undefined')?window.innerHeight:0;
  var vvH=vv?vv.height:vh;
  bar.classList.toggle('kbd-hide', mobileKbdActive(vh, vvH));
}
function navBanner(dir){
  var bs=DATA.banners, curIdx=-1, qi;
  for(qi=0;qi<bs.length;qi++){ if(bs[qi].id===state.cur){curIdx=qi;break;} }
  if(curIdx<0)return;
  var next=(curIdx+dir+bs.length)%bs.length;
  state.cur=bs[next].id; save();
  renderBannerList(); renderBannerInfo(); renderStats();
}
function resetFilters(){
  var sb=$('searchBox'); if(sb)sb.value='';
  initFilters();
  renderBannerList();
  toast('筛选已重置');
}
function randomBanner(){
  var bs=DATA.banners;
  if(!bs.length)return;
  var good=bs.filter(function(x){return x.six&&x.six.length;}).filter(function(x){return x.id!==state.cur;});
  if(!good.length)good=bs;
  var r=good[Math.floor(Math.random()*good.length)];
  state.cur=r.id; save();
  renderBannerList(); renderBannerInfo(); renderStats();
  toast('🎲 随机到：'+esc(r.full));
  if(isMobile())closeDrawer();
}
function openDrawer(){ var s=$('sidebar'); if(s)s.classList.add('open'); var b=$('mBackdrop'); if(b)b.classList.add('show'); if(isMobile()){ try{ document.body.style.overflow='hidden'; }catch(e){} var sb=$('searchBox'); if(sb&&sb.focus)sb.focus(); } }
function closeDrawer(){ var s=$('sidebar'); if(s)s.classList.remove('open'); var b=$('mBackdrop'); if(b)b.classList.remove('show'); if(isMobile()){ try{ document.body.style.overflow=''; }catch(e){} } }
function enhancePullMsg(results, hadSet, msg){
  var newNames=[], wishHit=[], i2, nx2, o2;
  for(i2=0;i2<results.length;i2++){ nx2=results[i2]; o2=opOf(nx2.op); if(!hadSet[nx2.op]&&state.collection.indexOf(nx2.op)>=0)newNames.push(o2?o2.name:nx2.op); if(state.wish&&state.wish.indexOf(nx2.op)>=0)wishHit.push(o2?o2.name:nx2.op); }
  if(newNames.length)msg+='<br/><span class="newline">🆕 新干员：'+newNames.join('、')+'</span>';
  if(wishHit.length){ msg+='<br/><span class="wishhit">💝 心愿达成：'+wishHit.join('、')+'</span>'; var wishSet={}, wi6; for(wi6=0;wi6<wishHit.length;wi6++)wishSet[wishHit[wi6]]=1; state.wish=state.wish.filter(function(w){ var wn=opOf(w); var wname=wn?wn.name:w; return wishSet[wname]?false:true; }); save(); }
  return msg;
}
function doUntil6(){
  if(BUSY)return;
  var achBefore=achDoneSet();
  var b=bannerById(state.cur); if(!b)return;
  if(isSelect(b)){ var sChk=getSel(b); if(sChk.six.length<minSel(b,6)||sChk.five.length<minSel(b,5)){ toast('选不满不能抽：至少需 '+minSel(b,6)+' 位6★ + '+minSel(b,5)+' 位5★'); openSelModal(b); return; } }
  var results=[], newHist2=[];
  var hadSet={}, hi4;
  for(hi4=0;hi4<state.collection.length;hi4++)hadSet[state.collection[hi4]]=1;
  BATCH_SAVE=true;
  while(results.length<120){
    var r=pullOne(b);
    results.push(r);
    if(isNew(r.op))addCol(r.op);
    newHist2.push({op:r.op,rar:r.rar,t:Date.now(),type:b.type,bn:b.full,bid:b.id,sel:isSelect(b)?selKey(b):''});
    if(r.rar===6)break;
  }
  BATCH_SAVE=false;
  if(newHist2.length){ newHist2.reverse(); state.history=newHist2.concat(state.history); }
  if(state.history.length>2000)state.history.length=2000;
  sessPulls+=results.length;
  save();
  BUSY=true;
  setBusyUI(true);
  var total=results.length;
  var names6=results.filter(function(x){return x.rar===6;}).map(function(x){var no6=opOf(x.op);return no6?no6.name:x.op;});
  var msg=names6.length?('连抽 <b>'+total+'</b> 抽出货：'+names6.join('、')):('连抽 '+total+' 抽未出货（已达120抽上限）');
  msg=enhancePullMsg(results,hadSet,msg);
  var shown=results.slice(-12);
  lastBatch=results;
  lastPullN=results.length;
  renderCards(shown,msg,names6.length>0,names6,false);
  setTimeout(function(){ BUSY=false; setBusyUI(false); }, 100+shown.length*SPEED+600);
  renderStats(); renderHistory(); renderCollection(); renderBannerInfo();
  checkNewAch(achBefore);
  setFortune();
}
var POOL_N=36, POOL_Q='';
function openPoolModal(){
  var b=bannerById(state.cur); if(!b)return;
  var pool=getPool(b);
  var h=['<h4 class="sect" style="margin-top:0">'+esc(b.full)+' 完整卡池</h4><input id="poolSearch" placeholder="搜索池内干员..." value="'+esc(POOL_Q)+'"/>'];
  var i,o,q=POOL_Q,p6l=[],p5l=[];
  for(i=0;i<pool.p6.length;i++){ o=opOf(pool.p6[i]); if(o&&(!q||o.name.indexOf(q)>=0))p6l.push(pool.p6[i]); }
  for(i=0;i<pool.p5.length;i++){ o=opOf(pool.p5[i]); if(o&&(!q||o.name.indexOf(q)>=0))p5l.push(pool.p5[i]); }
  if(q)h.push('<div class="notice">搜索「'+esc(q)+'」命中：<b>6★×'+p6l.length+'</b> · <b>5★×'+p5l.length+'</b></div>');
  if(p6l.length){
    h.push('<div class="notice">6★干员（'+(q?p6l.length+'/'+pool.p6.length:pool.p6.length)+'）</div><div class="rateup">');
    var p6n=Math.min(p6l.length,POOL_N);
    for(i=0;i<p6n;i++){
      o=opOf(p6l[i]); if(!o)continue;
      h.push('<div class="rup-card r6" data-op="'+esc(p6l[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="ot'+(state.collection.indexOf(p6l[i])>=0?' have':' new')+'">'+(state.collection.indexOf(p6l[i])>=0?'✓ 已有':'NEW')+'</div><div class="rn">'+esc(o.name)+'</div><div class="rb">6★</div><div class="rr">'+stars(6)+'</div></div>');
    }
    h.push('</div>');
  }
  if(p5l.length){
    h.push('<div class="notice">5★干员（'+(q?p5l.length+'/'+pool.p5.length:pool.p5.length)+'）</div><div class="rateup">');
    var p5n=Math.min(p5l.length,POOL_N);
    for(i=0;i<p5n;i++){
      o=opOf(p5l[i]); if(!o)continue;
      h.push('<div class="rup-card r5" data-op="'+esc(p5l[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="ot'+(state.collection.indexOf(p5l[i])>=0?' have':' new')+'">'+(state.collection.indexOf(p5l[i])>=0?'✓ 已有':'NEW')+'</div><div class="rn">'+esc(o.name)+'</div><div class="rb">5★</div><div class="rr">'+stars(5)+'</div></div>');
    }
    h.push('</div>');
  }
  if(!p6l.length&&!p5l.length)h.push('<div class="notice">没有匹配「'+esc(q)+'」的干员，换个关键词试试</div>');
  if(p6l.length>POOL_N||p5l.length>POOL_N)h.push('<button class="mini-btn" id="poolMore" style="margin:8px auto;display:block">加载更多卡池干员</button>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var cards=$('mBody').querySelectorAll('.rup-card');
  for(i=0;i<cards.length;i++){ cards[i].onclick=function(){ openModal(this.getAttribute('data-op')); }; }
  var pm=$('poolMore'); if(pm)pm.onclick=function(){ POOL_N+=36; openPoolModal(); };
  var ps=$('poolSearch'); if(ps){ var pst=null; ps.oninput=function(){ POOL_Q=this.value.trim(); POOL_N=36; clearTimeout(pst); pst=setTimeout(function(){ openPoolModal(); },180); }; }
}
var galF='all', galV=2, galMode='art', galSearch='', galProf='all';
var GAL_PROFS=null;
function galProfList(){
  if(GAL_PROFS)return GAL_PROFS;
  GAL_PROFS=[];
  for(var pk54 in opByName){ var po54=opByName[pk54]; if(po54.prof&&GAL_PROFS.indexOf(po54.prof)<0)GAL_PROFS.push(po54.prof); }
  GAL_PROFS.sort(function(a,b){return a.localeCompare(b,'zh');});
  return GAL_PROFS;
}
var GAL_ART_CACHE={};
function galArt(o){ if(!o||!o.name)return ''; var ck=o.name+':2'; if(GAL_ART_CACHE[ck])return GAL_ART_CACHE[ck];
  return GAL_ART_CACHE[ck]=thumbOf(o.art,o.name,'skin 0 2.png',480)||o.art||avUrl(o); }
function openGallery(){
  var h=['<h4 class="sect" style="margin-top:0">立绘画廊</h4><input id="galSearch" placeholder="搜索干员..." value="'+esc(galSearch)+'"/><div class="filters" id="galChips"></div><div class="filters" id="galProfChips"></div><div class="galbar"><button class="mini-btn" id="galV2"'+(galV===2?' style="border-color:var(--acc)"':'')+'>精二立绘</button><button class="mini-btn" id="galSkin"'+(galMode==='skin'?' style="border-color:var(--acc)"':'')+'>🎨 皮肤模式</button><span class="gal-count" id="galCount"></span></div><div class="gallery" id="galGrid"></div>'];
  $('mBody').innerHTML=h.join('');
  setChips($('galChips'),[['all','全部'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],galF,function(){ galF=$('galChips')._v; renderGallery(); });
  var profChips54=[['all','全部职业']];
  var profList54=galProfList();
  for(var pi54=0;pi54<profList54.length;pi54++)profChips54.push([profList54[pi54],profList54[pi54]]);
  setChips($('galProfChips'),profChips54,galProf,function(){ galProf=$('galProfChips')._v; renderGallery(); });
  var gv2=$('galV2'); if(gv2)gv2.onclick=function(){ galV=2; galMode='art'; openGallery(); };
  var gsk=$('galSkin'); if(gsk)gsk.onclick=function(){ galMode=(galMode==='skin')?'art':'skin'; openGallery(); };
  var gsr=$('galSearch'); if(gsr){ var gst=null; gsr.oninput=function(){ galSearch=this.value.trim(); GAL_N=120; clearTimeout(gst); gst=setTimeout(function(){ renderGallery(); },180); }; }
  renderGallery();
  openModalBox();
}
var GAL_N=120;
var GAL_NAMES=null;
function renderGallery(){
  if(!GAL_NAMES)GAL_NAMES=Object.keys(opByName).sort(function(a,b){return opByName[b].rarity-opByName[a].rarity||a.localeCompare(b,'zh');});
  var names=GAL_NAMES;
  var h=[],i,o;
  var shown=0,totalMatch=0;
  for(i=0;i<names.length;i++){
    o=opByName[names[i]];
    if(galF!=='all'&&String(o.rarity)!==galF)continue;
    if(galProf!=='all'&&o.prof!==galProf)continue;
    if(galSearch&&o.name.indexOf(galSearch)<0)continue;
    totalMatch++;
    if(shown>=GAL_N)break;
    shown++;
    h.push('<div class="gal-item r'+o.rarity+'" data-op="'+esc(names[i])+'"><img loading="lazy" src="'+esc(galArt(o))+'" onerror="this.onerror=null;this.src=this.dataset.fb" data-fb="'+esc(o.art||opArtT(o))+'" alt=""/><div class="gal-nm">'+esc(o.name)+'</div><div class="gal-st">'+stars(o.rarity)+'</div></div>');
  }
  if(totalMatch>shown)h.push('<button class="mini-btn" id="galMore" style="margin:8px auto;display:block">加载更多（'+(totalMatch-shown)+'）</button>');
  if(!h.length)h.push('<div class="notice">暂无符合条件的干员</div>');
  $('galGrid').innerHTML=h.join('');
  var gcEl=$('galCount'); if(gcEl)gcEl.textContent='显示 '+shown+' / '+totalMatch+' 名干员'+(galProf!=='all'?'（'+galProf+'）':'');
  var items=$('galGrid').querySelectorAll('.gal-item');
  for(i=0;i<items.length;i++){ (function(it){ it.onclick=function(){ if(galMode==='skin'){ SKINS_FROM='gallery'; openSkins(it.getAttribute('data-op')); } else { openModal(it.getAttribute('data-op')); } }; })(items[i]); }
  var gm=$('galMore'); if(gm)gm.onclick=function(){ GAL_N+=120; renderGallery(); };
  var gimgs=$('galGrid').querySelectorAll('img');
  for(var gi3=0;gi3<gimgs.length;gi3++){ (function(im){ idbSrc(im.getAttribute('src'), im); })(gimgs[gi3]); }
}
var CHAPTER_MAP={
"1-":{ch:"第一章 黑暗时代·上"},
"2-":{ch:"第二章 乌萨斯的孩子"},
"3-":{ch:"第三章 二次呼吸"},
"4-":{ch:"第四章 急性衰竭"},
"5-":{ch:"第五章 靶向药物"},
"6-":{ch:"第六章 局部坏死"},
"7-":{ch:"第七章 苦难摇篮"},
"8-":{ch:"第八章 怒号光明"},
"9-":{ch:"第九章 风暴瞭望"},
"10-":{ch:"第十章 破碎日冕"},
"11-":{ch:"第十一章 淬火尘霾"},
"12-":{ch:"第十二章 惊霆无声"},
"13-":{ch:"第十三章 恶兆湍流"},
"14-":{ch:"第十四章 慈悲灯塔"},
"CE-":{ch:"龙门币本"},
"CA-":{ch:"技巧概要本"},
"PR-":{ch:"芯片本"},
 "S1-":{ch:"第一章 黑暗时代·上（突袭）"},"S2-":{ch:"第二章 乌萨斯的孩子（突袭）"},"S3-":{ch:"第三章 二次呼吸（突袭）"},"S4-":{ch:"第四章 急性衰竭（突袭）"},"S5-":{ch:"第五章 靶向药物（突袭）"},"S6-":{ch:"第六章 局部坏死（突袭）"},"S7-":{ch:"第七章 苦难摇篮（突袭）"},"S8-":{ch:"第八章 怒号光明（突袭）"},"S9-":{ch:"第九章 风暴瞭望（突袭）"},"S10-":{ch:"第十章 破碎日冕（突袭）"},"S11-":{ch:"第十一章 淬火尘霾（突袭）"},"S12-":{ch:"第十二章 惊霆无声（突袭）"},"S13-":{ch:"第十三章 恶兆湍流（突袭）"},"S14-":{ch:"第十四章 慈悲灯塔（突袭）"},
};
var MAT_FARM_DB={
 "源岩":{stages:[{stage:"1-7",ap:4.4,drops:["固源岩","龙门币"]},{stage:"S2-1",ap:4.6,drops:["固源岩","龙门币"]},]},
 "固源岩":{stages:[{stage:"1-7",ap:5,drops:["源岩","龙门币"]},{stage:"2-4",ap:6.5,drops:["源岩","装置"]},{stage:"4-6",ap:6,drops:["源岩"]},]},
 "固源岩组":{stages:[{stage:"4-6",ap:12,drops:["源岩","固源岩"]},{stage:"2-4",ap:14,drops:["固源岩","装置"]},{stage:"S3-3",ap:12.5,drops:["固源岩"]},]},
 "提纯源岩":{stages:[{stage:"7-10",ap:32,drops:["固源岩组"]},{stage:"9-9",ap:33,drops:["固源岩组","固源岩"]},]},
 "酯原料":{stages:[{stage:"1-9",ap:5,drops:["源岩","龙门币"]},]},
 "聚酸酯":{stages:[{stage:"S2-5",ap:5,drops:["酯原料","源岩"]},{stage:"1-8",ap:5.5,drops:["酯原料","龙门币"]},]},
 "聚酸酯组":{stages:[{stage:"4-4",ap:12.5,drops:["聚酸酯"]},{stage:"S3-4",ap:13,drops:["聚酸酯","酯原料"]},]},
 "聚酸酯块":{stages:[{stage:"7-12",ap:32,drops:["聚酸酯组"]},]},
 "装置":{stages:[{stage:"S2-6",ap:7.5,drops:["源岩","龙门币"]},{stage:"2-2",ap:8.5,drops:["源岩"]},]},
 "全新装置":{stages:[{stage:"4-10",ap:16,drops:["装置"]},{stage:"5-10",ap:17,drops:["装置","研磨石"]},]},
 "改量装置":{stages:[{stage:"7-11",ap:35,drops:["全新装置"]},]},
 "异铁":{stages:[{stage:"S2-4",ap:6.5,drops:["源岩"]},{stage:"2-5",ap:7,drops:["源岩","龙门币"]},]},
 "异铁组":{stages:[{stage:"4-5",ap:15,drops:["异铁"]},{stage:"5-1",ap:16,drops:["异铁","酮凝集"]},]},
 "异铁块":{stages:[{stage:"7-11",ap:35,drops:["异铁组"]},]},
 "酮凝集":{stages:[{stage:"2-6",ap:6.5,drops:["源岩"]},{stage:"2-8",ap:7,drops:["源岩","龙门币"]},]},
 "酮凝集组":{stages:[{stage:"4-7",ap:15,drops:["酮凝集"]},{stage:"3-1",ap:16,drops:["酮凝集","糖"]},]},
 "酮阵列":{stages:[{stage:"7-13",ap:32,drops:["酮凝集组"]},]},
 "糖":{stages:[{stage:"S2-9",ap:6.5,drops:["源岩"]},{stage:"1-10",ap:7,drops:["源岩","龙门币"]},]},
 "糖组":{stages:[{stage:"4-2",ap:14,drops:["糖"]},{stage:"3-1",ap:15,drops:["糖","酮凝集"]},]},
 "糖聚块":{stages:[{stage:"7-14",ap:32,drops:["糖组"]},]},
 "研磨石":{stages:[{stage:"S3-5",ap:9,drops:["源岩","固源岩"]},{stage:"3-3",ap:10,drops:["固源岩"]},]},
 "五水研磨石":{stages:[{stage:"4-8",ap:25,drops:["研磨石"]},{stage:"7-12",ap:26,drops:["研磨石","聚酸酯组"]},]},
 "扭转醇":{stages:[{stage:"4-4",ap:9.5,drops:["聚酸酯","聚酸酯组"]},{stage:"7-15",ap:10,drops:["聚酸酯"]},]},
 "轻锰矿":{stages:[{stage:"5-3",ap:9.5,drops:["异铁","异铁组"]},{stage:"3-2",ap:10.5,drops:["异铁"]},]},
 "三水锰矿":{stages:[{stage:"7-16",ap:25,drops:["轻锰矿"]},{stage:"4-8",ap:26,drops:["轻锰矿","研磨石"]},]},
 "凝胶":{stages:[{stage:"4-9",ap:9,drops:["固源岩组"]},{stage:"6-7",ap:9.5,drops:["固源岩组","源岩"]},]},
 "聚合凝胶":{stages:[{stage:"7-13",ap:40,drops:["凝胶"]},{stage:"12-7",ap:41,drops:["凝胶"]},]},
 "炽合金":{stages:[{stage:"6-8",ap:9.5,drops:["研磨石"]},{stage:"4-4",ap:10,drops:["研磨石","聚酸酯组"]},]},
 "炽合金块":{stages:[{stage:"7-15",ap:40,drops:["炽合金"]},]},
 "RMA70-12":{stages:[{stage:"6-11",ap:9.5,drops:["异铁组"]},{stage:"4-10",ap:10,drops:["异铁组","装置"]},]},
 "RMA70-24":{stages:[{stage:"7-11",ap:40,drops:["RMA70-12"]},{stage:"12-9",ap:41,drops:["RMA70-12"]},]},
 "晶体元件":{stages:[{stage:"7-9",ap:9.5,drops:["固源岩组"]},{stage:"9-3",ap:10,drops:["固源岩组"]},]},
 "晶体电路":{stages:[{stage:"7-15",ap:32,drops:["晶体元件"]},{stage:"9-15",ap:33,drops:["晶体元件"]},]},
 "晶体电子单元":{stages:[{stage:"9-11",ap:45,drops:["晶体电路"]},{stage:"12-5",ap:46,drops:["晶体电路"]},]},
 "龙门币":{stages:[{stage:"CE-5",ap:0.04,drops:[],note:"一次约7500"},{stage:"CE-6",ap:0.03,drops:[],note:"一次约10000"},]},
 "技巧概要·卷1":{stages:[{stage:"CA-1",ap:1,drops:[],note:"一次5个"},]},
 "技巧概要·卷2":{stages:[{stage:"CA-3",ap:1,drops:[],note:"一次5个"},]},
 "技巧概要·卷3":{stages:[{stage:"CA-5",ap:1,drops:[],note:"一次5个"},]},
 "双极纳米片":{stages:[{stage:"9-19",ap:45,drops:["晶体电子单元"]},]},
 "聚合剂":{stages:[{stage:"9-9",ap:45,drops:["提纯源岩"]},{stage:"12-9",ap:46,drops:["提纯源岩","RMA70-24"]},]},
 "D32钢":{stages:[{stage:"9-6",ap:45,drops:["五水研磨石"]},]},
 "白马醇":{stages:[{stage:"7-15",ap:30,drops:["扭转醇"]},{stage:"9-15",ap:31,drops:["扭转醇","晶体元件"]},]},
 "褐素纤维":{stages:[{stage:"7-12",ap:30,drops:["酮阵列"]},{stage:"9-12",ap:31,drops:["酮阵列"]},]},
 "化合切削液":{stages:[]},
 "半自然溶剂":{stages:[]},
 "精炼溶剂":{stages:[]},
 "转质盐组":{stages:[]},
 "转质盐聚块":{stages:[]},
 "环烃聚质":{stages:[]},
 "环烃预制体":{stages:[]},
 "近卫芯片":{stages:[{stage:"PR-D-1",ap:36},{stage:"PR-D-2",ap:45},]},
 "重装芯片":{stages:[{stage:"PR-B-1",ap:36},{stage:"PR-B-2",ap:45},]},
 "狙击芯片":{stages:[{stage:"PR-C-1",ap:36},{stage:"PR-C-2",ap:45},]},
 "术师芯片":{stages:[{stage:"PR-A-1",ap:36},{stage:"PR-A-2",ap:45},]},
 "医疗芯片":{stages:[{stage:"PR-A-1",ap:36},{stage:"PR-A-2",ap:45},]},
 "辅助芯片":{stages:[{stage:"PR-B-1",ap:36},{stage:"PR-B-2",ap:45},]},
 "先锋芯片":{stages:[{stage:"PR-D-1",ap:36},{stage:"PR-D-2",ap:45},]},
 "特种芯片":{stages:[{stage:"PR-C-1",ap:36},{stage:"PR-C-2",ap:45},]},
 "近卫双芯片":{stages:[{stage:"PR-D-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-D-2",ap:45,drops:[],note:"小概率掉落"},]},
 "重装双芯片":{stages:[{stage:"PR-B-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-B-2",ap:45,drops:[],note:"小概率掉落"},]},
 "狙击双芯片":{stages:[{stage:"PR-C-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-C-2",ap:45,drops:[],note:"小概率掉落"},]},
 "术师双芯片":{stages:[{stage:"PR-A-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-A-2",ap:45,drops:[],note:"小概率掉落"},]},
 "医疗双芯片":{stages:[{stage:"PR-A-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-A-2",ap:45,drops:[],note:"小概率掉落"},]},
 "辅助双芯片":{stages:[{stage:"PR-B-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-B-2",ap:45,drops:[],note:"小概率掉落"},]},
 "先锋双芯片":{stages:[{stage:"PR-D-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-D-2",ap:45,drops:[],note:"小概率掉落"},]},
 "特种双芯片":{stages:[{stage:"PR-C-1",ap:36,drops:[],note:"小概率掉落"},{stage:"PR-C-2",ap:45,drops:[],note:"小概率掉落"},]},
 "初级作战记录":{stages:[{stage:"LS-4",ap:30,drops:[],note:"经验本"},{stage:"LS-5",ap:36,drops:[],note:"经验本"},]},
 "中级作战记录":{stages:[{stage:"LS-5",ap:36,drops:[],note:"经验本"},{stage:"LS-6",ap:45,drops:[],note:"经验本"},]},
 "高级作战记录":{stages:[{stage:"LS-6",ap:45,drops:[],note:"经验本"},]},
};
var MAT_RECIPE={
 '固源岩组':{from:[['固源岩',3]]},'提纯源岩':{from:[['固源岩组',2]]},
 '聚酸酯组':{from:[['聚酸酯',2]]},'聚酸酯块':{from:[['聚酸酯组',2]]},
 '糖组':{from:[['糖',3]]},'糖聚块':{from:[['糖组',2]]},
 '异铁组':{from:[['异铁',3]]},'异铁块':{from:[['异铁组',2]]},
 '酮凝集组':{from:[['酮凝集',3]]},'酮阵列':{from:[['酮凝集组',2]]},
 '全新装置':{from:[['装置',2]]},'改量装置':{from:[['全新装置',2]]},
 '五水研磨石':{from:[['研磨石',2]]},'白马醇':{from:[['扭转醇',2]]},
 '三水锰矿':{from:[['轻锰矿',2]]},'聚合凝胶':{from:[['凝胶',2]]},
 '炽合金块':{from:[['炽合金',2]]},'RMA70-24':{from:[['RMA70-12',2]]},
 '晶体电路':{from:[['晶体元件',2]]},'晶体电子单元':{from:[['晶体电路',2]]},
 '双极纳米片':{from:[['晶体电子单元',1]],to:['晶体电子单元']},
 '聚合剂':{to:['提纯源岩']},'D32钢':{to:['五水研磨石']},
 '褐素纤维':{to:['酮阵列']},
 '源岩':{to:['固源岩']},'固源岩':{to:['固源岩组']},'固源岩组':{from:[['固源岩',3]],to:['提纯源岩']},
 '酯原料':{to:['聚酸酯']},'聚酸酯':{to:['聚酸酯组']},'聚酸酯组':{from:[['聚酸酯',2]],to:['聚酸酯块']},
 '糖':{to:['糖组']},'糖组':{from:[['糖',3]],to:['糖聚块']},
 '异铁':{to:['异铁组']},'异铁组':{from:[['异铁',3]],to:['异铁块']},
 '酮凝集':{to:['酮凝集组']},'酮凝集组':{from:[['酮凝集',3]],to:['酮阵列']},
 '装置':{to:['全新装置']},'全新装置':{from:[['装置',2]],to:['改量装置']},
 '研磨石':{to:['五水研磨石']},'扭转醇':{to:['白马醇']},'轻锰矿':{to:['三水锰矿']},
 '凝胶':{to:['聚合凝胶']},'炽合金':{to:['炽合金块']},'RMA70-12':{to:['RMA70-24']},
 '晶体元件':{to:['晶体电路']},'晶体电路':{from:[['晶体元件',2]],to:['晶体电子单元']},
 '晶体电子单元':{from:[['晶体电路',2]],to:['双极纳米片','聚合剂']},
};
function matRecipeTree(mn){
  var lines=[], seen={};
  function walk(name, depth, cnt, isRoot){
    if(depth>4||seen[name])return;
    seen[name]=true;
    var rp=MAT_RECIPE[name];
    var hasFrom=rp&&rp.from&&rp.from.length;
    lines.push('<div class="rt-node" style="margin-left:'+(depth*16)+'px"><span class="rt-dot"></span>'+esc(name)+'<span class="rt-cnt">'+((!isRoot&&cnt>1)?('×'+cnt):'')+'</span>'+(hasFrom?'<span class="rt-has"> ↓</span>':'')+'</div>');
    if(hasFrom&&depth<4){
      for(var i=0;i<rp.from.length;i++)walk(rp.from[i][0], depth+1, rp.from[i][1]||1, false);
    }
    seen[name]=false;
  }
  if(MAT_RECIPE[mn]&&MAT_RECIPE[mn].from&&MAT_RECIPE[mn].from.length)walk(mn,0,1,true);
  if(lines.length<=1)return '';
  return '<div class="rt-wrap"><div class="rt-title">🔗 全链分解</div>'+lines.join('')+'</div>';
}
function matRecipeHtml(mn){
  var rp=MAT_RECIPE[mn];
  if(!rp)return '';
  var h=[];
  if(rp.from&&rp.from.length)h.push('🧪 合成：'+rp.from.map(function(x){ return matIconHtml(x[0])+'<span class="mat-drop">'+esc(x[0])+'×'+x[1]+'</span>'; }).join(' + '));
  if(rp.to&&rp.to.length)h.push('⬆️ 用于合成：'+rp.to.map(function(x){ return matIconHtml(x)+'<span class="mat-drop">'+esc(x)+'</span>'; }).join(' '));
  if(!h.length&&!matRecipeTree(mn))return '';
  return '<div class="mat-recipe">'+h.join('')+matRecipeTree(mn)+'</div>';
}
var MTL_ICON={
 "源岩":"MTL_SL_G1",
 "固源岩":"MTL_SL_G2",
 "固源岩组":"MTL_SL_G3",
 "提纯源岩":"MTL_SL_G4",
 "酯原料":"MTL_SL_RUSH1",
 "聚酸酯":"MTL_SL_RUSH2",
 "聚酸酯组":"MTL_SL_RUSH3",
 "聚酸酯块":"MTL_SL_RUSH4",
 "糖":"MTL_SL_STRG2",
 "糖组":"MTL_SL_STRG3",
 "糖聚块":"MTL_SL_STRG4",
 "异铁":"MTL_SL_IRON2",
 "异铁组":"MTL_SL_IRON3",
 "异铁块":"MTL_SL_IRON4",
 "酮凝集":"MTL_SL_KETONE2",
 "酮凝集组":"MTL_SL_KETONE3",
 "酮阵列":"MTL_SL_KETONE4",
 "研磨石":"MTL_SL_PG1",
 "五水研磨石":"MTL_SL_PG2",
 "扭转醇":"MTL_SL_ALCOHOL1",
 "白马醇":"MTL_SL_ALCOHOL2",
 "轻锰矿":"MTL_SL_MANGANESE1",
 "三水锰矿":"MTL_SL_MANGANESE2",
 "凝胶":"MTL_SL_PGEL3",
 "聚合凝胶":"MTL_SL_PGEL4",
 "炽合金":"MTL_SL_IAM3",
 "炽合金块":"MTL_SL_IAM4",
 "RMA70-12":"MTL_SL_RMA7012",
 "RMA70-24":"MTL_SL_RMA7024",
 "晶体元件":"MTL_SL_OC3",
 "晶体电路":"MTL_SL_OC4",
 "晶体电子单元":"MTL_SL_OEU",
 "双极纳米片":"MTL_SL_BN",
 "聚合剂":"MTL_SL_PP",
 "D32钢":"MTL_SL_DS",
 "技巧概要·卷1":"MTL_SKILL1",
 "技巧概要·卷2":"MTL_SKILL2",
 "技巧概要·卷3":"MTL_SKILL3",
 "装置":"MTL_SL_BOSS2",
 "全新装置":"MTL_SL_BOSS3",
 "改量装置":"MTL_SL_BOSS4",
 "褐素纤维":"MTL_SL_XW",
};
var CHAPTER_CACHE={};
function chapterOf(stage){
  var s=String(stage||'');
  if(CHAPTER_CACHE[s]!==undefined)return CHAPTER_CACHE[s];
  var k=s.match(/^[A-Z]?\d+-/);
  return CHAPTER_CACHE[s]=(k&&CHAPTER_MAP[k[0]])?CHAPTER_MAP[k[0]].ch:'';
}
var MAT_BILL=(typeof DATA!=='undefined'&&DATA.mats)?DATA.mats:{}, MAT_BLACK=['理智','声望','至纯源石','家具零件','蜡烛','机械零件','模组数据块','数据增补条','数据增补仪','合成玉','代糖','双酮','切削液','干冰','异极矿','顶级作战记录'];
function matIconUrl(mn){
  var k=String(mn||'').trim();
  var b=MAT_BILL[k];
  if(b&&b.icon64)return b.icon64;
  if(b&&b.icon)return b.icon;
  var id=MTL_ICON[k];
  return id?('https://torappu.prts.wiki/assets/item_icon/'+id+'.png'):'';
}
var MAT_COLORS=[
  ['#3a6ea5','#5b8ac0'],['#7a4a9e','#9b6cc4'],['#b5651d','#d18a3f'],['#2e7d5b','#4f9e7c'],
  ['#a8325a','#c85a82'],['#4a6fb5','#6f92d8'],['#8a6d2f','#ad8f52'],['#3f7d8a','#63a0ad'],
  ['#7d3fa0','#9f66c2'],['#c0563a','#e07a58'],['#356a4e','#579170'],['#8a3f6d','#ac6390'],
  ['#4f6db5','#7491d6'],['#b08a2e','#d2ad52'],['#3f8a6a','#63ad8e'],['#a84a8a','#c86eac']
];
function matColor(mn){
  var h=0, s=String(mn||'');
  for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  return MAT_COLORS[h%MAT_COLORS.length];
}
var MAT_ICON_HTML={};
function matIconHtml(mn){
  if(MAT_ICON_HTML[mn]!==undefined)return MAT_ICON_HTML[mn];
  var u=matIconUrl(mn);
  var nmStr=String(mn||'');
  var ch=esc(nmStr.charAt(0)+(nmStr.charAt(1)||'')||'?');
  var c=matColor(mn);
  var st='background:linear-gradient(135deg,'+c[0]+','+c[1]+')';
  var out;
  if(!u)out='<span class="mat-fallback" style="'+st+'">'+ch+'</span>';
  else{
    var uE=(u.indexOf('data:')===0)?u:esc(u);
    out='<span class="mat-wrap"><span class="mat-fallback" style="'+st+'">'+ch+'</span><img class="mat-icon" loading="lazy" style="opacity:0" src="'+uE+'" onerror="matIconErr(this)" onload="this.style.opacity=1" data-u="'+uE+'" alt=""/></span>';
  }
  MAT_ICON_HTML[mn]=out;
  return out;
}
function matIconErr(im){
  if(im.dataset.rt){ try{ im.style.display='none'; }catch(e){} im.onerror=null; return; }
  im.dataset.rt='1';
  var u=im.dataset.u||im.src;
  setTimeout(function(){ try{ im.src=u; }catch(e){} }, 600);
}
function calcLuck(){
  var hist=state.history, i, c6=0,c5=0,bestTen=0,maxG=0,last6=-1;
  for(i=0;i<hist.length;i++){ var r=hist[i]; if(r.rar===6)c6++; else if(r.rar===5)c5++; }
  var win6=0;
  for(i=0;i<hist.length&&i<10;i++){ if(hist[i].rar===6)win6++; }
  if(hist.length)bestTen=win6;
  for(i=10;i<hist.length;i++){ if(hist[i].rar===6)win6++; if(hist[i-10].rar===6)win6--; if(win6>bestTen)bestTen=win6; }
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6){ if(last6>=0){ var g=i-last6-1; if(g>maxG)maxG=g; } last6=i; } }
  var total=hist.length, exp6=total*0.0289;
  var score6=exp6>0?(c6/exp6*100):100;
  var score5=total>0?Math.min(200,(c5/(total*0.08)*100)):100;
  var s6p=Math.max(0,Math.min(100,(score6-50)*1.5));
  var s5p=Math.max(0,Math.min(100,(score5-50)*1.2));
  var s10p=bestTen>=2?100:(bestTen===1?55:20);
  var sgp=Math.max(0,Math.min(100,(50-maxG)*2));
  var luckIdx=total?Math.round(s6p*0.5+s5p*0.15+s10p*0.15+sgp*0.2):50;
  var label=luckIdx>=85?'欧皇转世 ✨':luckIdx>=70?'运气爆棚':luckIdx>=45?'正常水平':luckIdx>=25?'有点非了':'非洲酋长 ☔';
  return {total:total,c6:c6,c5:c5,bestTen:bestTen,maxG:maxG,s6p:s6p,s5p:s5p,s10p:s10p,sgp:sgp,luckIdx:luckIdx,label:label,score6:score6,score5:score5};
}
var ACH_CACHE=null, ACH_KEY='';
function calcAch(){
  var hist=state.history, i, last6=-1, maxG=0;
  var first=hist.length>0, first6=false, double6=false, triple6=false, extreme=false, bigDrought=false, early6=false, night6=false, c5all=0;
  var lastH=hist[0], lastKey=lastH?(lastH.op+':'+lastH.rar+':'+lastH.t):'';
  var key=hist.length+':'+state.collection.length+':'+limitedTotal+':'+lastKey;
  if(ACH_CACHE&&ACH_KEY===key)return ACH_CACHE;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===5)c5all++;
    if(hist[i].rar===6){
      first6=true;
      var cnt=0, j;
      for(j=i;j<hist.length&&j<i+10;j++){ if(hist[j].rar===6)cnt++; }
      if(cnt>=2)double6=true;
      if(cnt>=3)triple6=true;
      if(hist[i].t){ var nh2=new Date(hist[i].t).getHours(); if(nh2>=23||nh2<5)night6=true; }
      if(last6>=0){ var g=i-last6-1; if(g>maxG)maxG=g; if(g>=90)extreme=true; }
      last6=i;
    }
  }
  var tail=hist.slice(Math.max(0,hist.length-10));
  for(i=0;i<tail.length;i++){ if(tail[i].rar===6)early6=true; }
  if(maxG>=70)bigDrought=true;
  var limCol=0, lk2, colSet2={}, csi2, col5N=0, col4N=0, col6N=0, collabN=0;
  for(csi2=0;csi2<state.collection.length;csi2++){
    var co=opByName[state.collection[csi2]];
    colSet2[state.collection[csi2]]=1;
    if(co){ if(co.rarity===6)col6N++; else if(co.rarity===5)col5N++; else if(co.rarity===4)col4N++; if(co.collabOp)collabN++; }
  }
  for(lk2 in limitedOps){ if(colSet2[lk2])limCol++; }
  var dayMap6={}, d6k, day3=false;
  for(csi2=0;csi2<hist.length;csi2++){ if(hist[csi2].rar===6&&hist[csi2].t){ var d6=new Date(hist[csi2].t); var d6key=d6.getFullYear()+'-'+(d6.getMonth()+1)+'-'+d6.getDate(); dayMap6[d6key]=(dayMap6[d6key]||0)+1; } }
  for(d6k in dayMap6){ if(dayMap6[d6k]>=3)day3=true; }
  var bird6=false;
  for(csi2=0;csi2<hist.length;csi2++){ if(hist[csi2].rar===6&&hist[csi2].t){ var bh=new Date(hist[csi2].t).getHours(); if(bh>=5&&bh<8)bird6=true; } }
  var totalOpsN=Object.keys(opByName).length;
  var res={ list:[
    {name:'初来乍到',desc:'完成第一次抽卡',icon:'🌱',done:first,prog:''},
    {name:'初见六星',desc:'抽到第一只六星干员',icon:'⭐',done:first6,prog:''},
    {name:'百抽初啼',desc:'累计抽卡≥100',icon:'🎈',done:hist.length>=100,prog:hist.length+' / 100'},
    {name:'十连双黄',desc:'10抽内出2只以上六星',icon:'🌈',done:double6,prog:''},
    {name:'十连三黄',desc:'10抽内出3只以上六星',icon:'🎆',done:triple6,prog:''},
    {name:'极限保底',desc:'90抽以上才出六星',icon:'⏳',done:extreme,prog:''},
    {name:'非酋之王',desc:'最长非酋纪录≥70抽',icon:'☔',done:bigDrought,prog:''},
    {name:'欧皇降临',desc:'最早10抽内出六星',icon:'✨',done:early6,prog:''},
    {name:'深夜玄学',desc:'凌晨23点-5点出过六星',icon:'🌙',done:night6,prog:''},
    {name:'五百抽老手',desc:'累计抽卡≥500',icon:'🎯',done:hist.length>=500,prog:hist.length+' / 500'},
    {name:'图鉴收藏家',desc:'已拥有干员≥200',icon:'📚',done:state.collection.length>=200,prog:state.collection.length+' / 200'},
    {name:'千抽达人',desc:'总抽数≥1000',icon:'🎰',done:hist.length>=1000,prog:hist.length+' / 1000'},
    {name:'五星常客',desc:'累计抽到50名5★干员',icon:'💠',done:c5all>=50,prog:c5all+' / 50'},
    {name:'深度博士',desc:'累计抽卡≥5000抽',icon:'📖',done:hist.length>=5000,prog:hist.length+' / 5000'},
    {name:'限定收藏家',desc:'集齐所有限定干员（'+limitedTotal+'）',icon:'👑',done:limCol>=limitedTotal&&limitedTotal>0,prog:limCol+' / '+limitedTotal},
    {name:'限定猎手',desc:'拥有限定干员≥5',icon:'🎗️',done:limCol>=5,prog:limCol+' / 5'},
    {name:'五星收藏家',desc:'拥有不同5★干员≥30',icon:'💎',done:col5N>=30,prog:col5N+' / 30'},
    {name:'四星集邮',desc:'拥有全部4★干员（'+ops4.length+'）',icon:'📮',done:col4N>=ops4.length&&ops4.length>0,prog:col4N+' / '+ops4.length},
    {name:'单日三黄',desc:'单日抽到3只以上6★',icon:'🌞',done:day3,prog:''},
    {name:'早鸟玄学',desc:'凌晨5-8点出过6★',icon:'🌅',done:bird6,prog:''},
    {name:'联动干员',desc:'获得任一联动干员（含活动赠送）',icon:'🔗',done:collabN>=1,prog:collabN+' / 1'},
    {name:'六星军团',desc:'拥有不同6★干员≥30',icon:'💪',done:col6N>=30,prog:col6N+' / 30'},
    {name:'井中月',desc:'在限定/联动池完成一次300契约兑换',icon:'🌙',done:(state.sparkEx||0)>=1,prog:(state.sparkEx||0)+' / 1'},
    {name:'全图鉴',desc:'拥有全部干员（'+totalOpsN+'）',icon:'🏅',done:state.collection.length>=totalOpsN,prog:state.collection.length+' / '+totalOpsN}
  ]};
  ACH_KEY=key; ACH_CACHE=res;
  return res;
}
function achCount(){ var r=calcAch(), n=0, i; for(i=0;i<r.list.length;i++){ if(r.list[i].done)n++; } return n; }
function achDoneSet(){ var r=calcAch(), s={}, i; for(i=0;i<r.list.length;i++){ if(r.list[i].done)s[r.list[i].name]=1; } return s; }
function checkNewAch(before){
  var after=achDoneSet(), nl=[], k;
  for(k in after){ if(after[k]&&!before[k])nl.push(k); }
  if(nl.length)toast('🏆 新成就达成：'+nl.join('、'));
}
function copyAch(){
  var r=calcAch(), NL=String.fromCharCode(10), lines=['【成就状态】'+achCount()+' / '+r.list.length], i;
  for(i=0;i<r.list.length;i++){ var a=r.list[i]; lines.push((a.done?'✓':'✗')+' '+a.name+(a.prog?'（'+a.prog+'）':'')+(a.done?'':' - '+a.desc)); }
  var text=lines.join(NL);
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('成就状态已复制'); }
  catch(e){ window.prompt('复制以下内容：', text); }
  ta.remove();
}
function openAch(){
  var r=calcAch(), acn=achCount();
  var h=['<h4 class="sect" style="margin-top:0">成就系统（'+acn+' / '+r.list.length+'）</h4>'];
  h.push('<div class="achhead"><div class="statbar"><i style="width:'+Math.round(acn/r.list.length*100)+'%"></i></div><span class="notice">完成度 '+acn+' / '+r.list.length+' · 继续抽卡解锁更多成就</span></div><button class="mini-btn" id="btnCopyAch">复制成就状态</button><div class="achgrid">');
  var i;
  for(i=0;i<r.list.length;i++){ var a=r.list[i];
    var bar='';
    if(a.prog){
      var ps=a.prog.split(' / '), pv=parseInt(ps[0],10)||0, pt=parseInt(ps[1],10)||1;
      var pw=Math.min(100,Math.round(pv/pt*100));
      bar='<div class="ap">'+a.prog+'</div><div class="apbar"><i style="width:'+pw+'%"></i></div>';
    }
    h.push('<div class="ach'+(a.done?'':' miss')+'"><div class="aic">'+a.icon+'</div><div class="an">'+a.name+'</div><div class="ad">'+a.desc+'</div>'+bar+'<div class="ast">'+(a.done?'✓ 已达成':'未达成')+'</div></div>');
  }
  h.push('</div>');
  $('mBody').innerHTML=h.join('');
  var bca=$('btnCopyAch'); if(bca)bca.onclick=copyAch;
  openModalBox();
}
function openRules(){
  var NL=String.fromCharCode(10);
  var txt=['【明日方舟干员寻访模拟器 · 规则说明】','','★ 出率（按官方规则模拟）','6★：2%（51抽起每抽+2%，100抽必出）','5★：8%（每次十连内必出5★以上）','4★：50% · 3★：40%','','★ 保底','· 常驻标准寻访之间保底共享；中坚寻访之间共享','· 限定/活动/联合行动/定向甄选各自独立','','★ UP 概率','· 单UP池：当期6★占6★出率的50%','· 双UP池（限定/标准轮换）：各占35%','· 定向甄选：只含选中的干员，等概率','· 中坚甄选：选2位各占35%','· 联合行动/跨年欢庆：池内等概率','','★ 限定寻访','· 每抽获得1张寻访数据契约','· 300契约可兑换限定干员，200契约兑换当期非限定6★','· 跨年欢庆池首次6★必为未拥有干员','','★ 工具功能','· 🛡 保底一览：所有卡池保底进度总览','· 🧪 模拟抽卡：独立保底模拟 N 抽，不污染存档','· 📊 抽卡报告：7天周报 / 30天月报 + 一键复制','· 💝 心愿单：集中查看心愿干员，抽到自动移出','· 🎨 主题切换：默认黑金 / 深空蓝 / 龙门暖','· 📖 Wiki数据：干员属性/技能/材料实时同步 PRTS','','★ 其他','· 快捷键：1 单抽 · 2 十连 · 3 抽到6★ · G 画廊 · S 统计 · H 寻访记录 · F 收藏卡池','· 存档保存在浏览器本地，可导出/导入','· 干员立绘/头像为在线加载，需联网'].join(NL);
  var h=['<h4 class="sect" style="margin-top:0">规则说明</h4><pre class="rules">'+esc(txt)+'</pre>'];
  $('mBody').innerHTML=h.join('');
  openModalBox();
}
function openStats(){
  var hist=state.history, i, r;
  var c6=0,c5=0,c4=0,c3=0, typeCnt={}, type6={}, gaps=[], last=-1, dayMap={}, heat={}, hourMap={}, poolAgg={}, monMap={}, upHit=0, upTot=0, upRows={};
  var segCount=Math.ceil(hist.length/100), segArr=[];
  for(i=0;i<segCount;i++)segArr.push(0);
  for(i=0;i<hist.length;i++){
    r=hist[i]; var rX=r.rar, tX=r.type||'event';
    if(rX===6)c6++; else if(rX===5)c5++; else if(rX===4)c4++; else c3++;
    typeCnt[tX]=(typeCnt[tX]||0)+1; if(rX===6)type6[tX]=(type6[tX]||0)+1;
    if(rX===6){ if(last>=0)gaps.push(i-last-1); last=i; segArr[Math.floor(i/100)]++; }
    if(rX===6&&r.t){
      var dtX=new Date(r.t);
      var keyX=(dtX.getMonth()+1)+'/'+dtX.getDate(); dayMap[keyX]=(dayMap[keyX]||0)+1;
      var hkX=dtX.getFullYear()+'-'+(dtX.getMonth()+1)+'-'+dtX.getDate(); heat[hkX]=(heat[hkX]||0)+1;
      hourMap[dtX.getHours()]=(hourMap[dtX.getHours()]||0)+1;
    }
    var pkK9=r.bid||r.bn||'未知'; if(!poolAgg[pkK9])poolAgg[pkK9]={n:0,s6:0,full:r.bn||''}; poolAgg[pkK9].n++; if(rX===6)poolAgg[pkK9].s6++;
    if(r.t){ var mdX=new Date(r.t); var mkX=mdX.getFullYear()+'-'+(mdX.getMonth()+1); if(!monMap[mkX])monMap[mkX]={n:0,s6:0}; monMap[mkX].n++; if(rX===6)monMap[mkX].s6++; }
    if(rX===6&&r.type!=='standard'&&r.type!=='zhongjian'&&r.type!=='joint'&&r.type!=='direct'&&r.type!=='zjselect'){
      var hbX=r.bid?bannerById(r.bid):(r.bn?bannerByFull(r.bn):null);
      if(hbX&&hbX.type!=='standard'&&hbX.type!=='zhongjian'){
        upTot++;
        var isUpX=hbX.six.indexOf(r.op)>=0;
        if(isUpX)upHit++;
        var ukX=(hbX.full||'').slice(0,10);
        if(!upRows[ukX])upRows[ukX]={hit:0,tot:0,full:hbX.full};
        upRows[ukX].tot++;
        if(isUpX)upRows[ukX].hit++;
      }
    }
  }
  var total=hist.length;
  var maxG=0,minG=999,sumG=0;
  for(i=0;i<gaps.length;i++){ if(gaps[i]>maxG)maxG=gaps[i]; if(gaps[i]<minG)minG=gaps[i]; sumG+=gaps[i]; }
  var avgG=gaps.length?(sumG/gaps.length).toFixed(1):'—';
  var buckets=[0,0,0,0,0,0,0,0,0,0], bi, bmax=1;
  for(i=0;i<gaps.length;i++){ bi=Math.min(9,Math.floor(gaps[i]/10)); buckets[bi]++; if(buckets[bi]>bmax)bmax=buckets[bi]; }
  var exp6=total*0.0289;
  var LK=calcLuck();
  var bestTen=LK.bestTen, maxG=LK.maxG, luckIdx=LK.luckIdx, label=LK.label, s6p=LK.s6p, s5p=LK.s5p, s10p=LK.s10p, sgp=LK.sgp;
  var TCN={limited:'限定',event:'活动',standard:'标准',zhongjian:'中坚',joint:'联合行动',direct:'定向甄选',zjselect:'中坚甄选',special:'特殊'};
  var h=[];
  h.push('<h4 class="sect" style="margin-top:0">总览</h4><div class="stats-grid">');
  h.push('<div class="stat"><div class="v orange">'+total+'</div><div class="k">总抽数</div></div>');
  h.push('<div class="stat"><div class="v red">'+c6+'</div><div class="k">6★（'+(total?(c6/total*100).toFixed(2):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v gold">'+c5+'</div><div class="k">5★（'+(total?(c5/total*100).toFixed(2):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v">'+c4+'</div><div class="k">4★（'+(total?(c4/total*100).toFixed(2):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v">'+c3+'</div><div class="k">3★（'+(total?(c3/total*100).toFixed(2):0)+'%）</div></div>');
  var badge=luckIdx>=85?'👑':luckIdx>=70?'🔥':luckIdx>=45?'⭐':luckIdx>=25?'🌧️':'☔';
  h.push('<div class="luckbadge lv'+(luckIdx>=85?5:(luckIdx>=70?4:(luckIdx>=45?3:(luckIdx>=25?2:1))))+'"><div class="lb-score">'+luckIdx+'</div><div class="lb-label">'+label+' '+badge+'</div></div>');
  h.push('<div class="luckdetail"><div class="ld-row"><span>6★出率 '+(total?(c6/total*100).toFixed(2):'—')+'%</span><div class="ld-bar"><i style="width:'+Math.round(s6p)+'%"></i></div><b>'+s6p.toFixed(0)+'分</b></div>');
  h.push('<div class="ld-row"><span>5★出率 '+(total?(c5/total*100).toFixed(2):'—')+'%</span><div class="ld-bar"><i style="width:'+Math.round(s5p)+'%"></i></div><b>'+s5p.toFixed(0)+'分</b></div>');
  h.push('<div class="ld-row"><span>最欧十连 '+bestTen+'只6★</span><div class="ld-bar"><i style="width:'+s10p+'%"></i></div><b>'+s10p+'分</b></div>');
  h.push('<div class="ld-row"><span>最长非酋 '+maxG+'抽</span><div class="ld-bar"><i style="width:'+sgp+'%"></i></div><b>'+sgp.toFixed(0)+'分</b></div></div>');
  h.push('<div class="stat"><div class="v" style="color:var(--acc2)">'+(total*600).toLocaleString()+'</div><div class="k">等价合成玉（600/抽）</div></div>');
  var limGotN=0, lk3, colSet3={}, ck3;
  for(ck3=0;ck3<state.collection.length;ck3++)colSet3[state.collection[ck3]]=1;
  for(lk3 in limitedOps){ if(colSet3[lk3])limGotN++; }
  h.push('<div class="stat"><div class="v" style="color:#ff6ec7">'+limGotN+'/'+limitedTotal+'</div><div class="k">限定图鉴完成度</div><div class="statbar"><i style="width:'+(limitedTotal?Math.round(limGotN/limitedTotal*100):0)+'%"></i></div></div>');
  h.push('<div class="stat"><div class="v gold">'+bestTen+'</div><div class="k">最欧十连（最多6★）</div></div>');
  h.push('</div>');
  h.push('<div class="notice">欧气指数 = 6★出率(50%) + 5★出率(15%) + 最欧十连(15%) + 最长非酋(20%) 综合加权 · 期望6★率约 2.89%</div>');
  h.push('<h4 class="sect">期望对比</h4><div class="chart">');
  var diffN=Math.round(c6-exp6);
  h.push('<div class="crow"><span class="cl">实际6★</span><div class="cbar"><i style="width:'+Math.min(100,Math.max(2,(exp6?c6/exp6*50:2)))+'%"></i></div><span class="cv">'+c6+' 只</span></div>');
  h.push('<div class="crow"><span class="cl">期望6★</span><div class="cbar"><i style="width:50%"></i></div><span class="cv">'+exp6.toFixed(1)+' 只</span></div>');
  h.push('<div class="notice">'+(total?'比期望 '+(diffN>=0?'多':'少')+' <b style="color:'+(diffN>=0?'var(--acc)':'var(--red)')+'">'+Math.abs(diffN)+'</b> 只6★'+(diffN<0?' · 理论上再抽 '+Math.round(Math.abs(diffN)*34.6)+' 抽可追上期望':'')+'':'暂无数据')+'</div>');
  h.push('</div>');
  h.push('<h4 class="sect">六星间隔分布（相邻六星之间抽数）</h4><div class="chart">');
  for(i=0;i<10;i++){ h.push('<div class="crow"><span class="cl">'+(i*10)+'-'+(i*10+9)+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(buckets[i]/bmax*100))+'%"></i></div><span class="cv">'+buckets[i]+'</span></div>'); }
  h.push('</div>');
  var avgN2=gaps.length?sumG/gaps.length:0;
  var verdict=avgN2===0?'暂无':(avgN2<34.6?'偏欧':(avgN2>34.6?'偏非':'标准'));
  var gTxt=gaps.length?('最短 '+minG+' 抽 · 最长 '+maxG+' 抽 · 平均 '+avgG+' 抽'):'暂无六星间隔数据';
  h.push('<div class="notice">'+gTxt+'（期望 34.6 抽 · '+verdict+'）</div>');
  h.push('<h4 class="sect">欧气走势（每100抽一段，从上到下由旧到新）</h4><div class="chart">');
  var smax=1;
  for(i=0;i<segArr.length;i++){ if(segArr[i]>smax)smax=segArr[i]; }
  for(i=segArr.length-1;i>=0;i--){
    var luck=segArr[i]/2.89*100;
    var lcls=luck>=130?' luck-hi':(luck<60?' luck-lo':'');
    var ltxt=luck>=130?'欧皇':luck>=100?'偏欧':luck>=70?'正常':'非酋';
    h.push('<div class="crow"><span class="cl">第'+(segArr.length-i)+'段</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(segArr[i]/smax*100))+'%"></i></div><span class="cv'+lcls+'">'+segArr[i]+'只·'+ltxt+'</span></div>');
  }
  if(!hist.length)h.push('<div class="notice">暂无数据</div>');
  h.push('</div>');
  h.push('<h4 class="sect">近14天六星出货</h4><div class="chart">');
  var days=[];
  for(var di=13;di>=0;di--){ var dv=new Date(Date.now()-di*86400000); days.push({key:(dv.getMonth()+1)+'/'+dv.getDate(),c:0}); }
  for(var di2=0;di2<days.length;di2++){ days[di2].c=dayMap[days[di2].key]||0; }
  var dmax=1;
  for(di2=0;di2<days.length;di2++){ if(days[di2].c>dmax)dmax=days[di2].c; }
  for(di2=0;di2<days.length;di2++){ h.push('<div class="crow"><span class="cl">'+days[di2].key+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(days[di2].c/dmax*100))+'%"></i></div><span class="cv">'+days[di2].c+'</span></div>'); }
  if(!hist.length)h.push('<div class="notice">暂无抽卡数据</div>');
  h.push('</div>');
  h.push('<h4 class="sect">近30天出货热力图</h4><div class="heat">');
  var hkk, maxH=1, hd2, cv2;
  for(hkk in heat){ if(heat[hkk]>maxH)maxH=heat[hkk]; }
  for(hd2=29;hd2>=0;hd2--){ var dd=new Date(Date.now()-hd2*86400000); var key2=dd.getFullYear()+'-'+(dd.getMonth()+1)+'-'+dd.getDate(); cv2=heat[key2]||0; var lvl=cv2===0?0:(cv2/maxH>=0.66?3:(cv2/maxH>=0.33?2:1)); h.push('<div class="hcell l'+lvl+'" title="'+key2+'：'+cv2+'只6★"></div>'); }
  h.push('</div>');
  h.push('<div class="notice">颜色越深当日出货越多 · '+(maxH>1?'最多一日 '+maxH+' 只':'暂无出货记录')+'</div>');
  h.push('<h4 class="sect">出货时段（6★按小时分布）</h4><div class="chart">');
  var hmax=1, hk, hv;
  for(hk=0;hk<24;hk++){ hv=hourMap[hk]||0; if(hv>hmax)hmax=hv; }
  for(hk=0;hk<24;hk++){ hv=hourMap[hk]||0; h.push('<div class="crow"><span class="cl">'+hk+'时</span><div class="cbar"><i style="width:'+Math.max(1,Math.round(hv/hmax*100))+'%"></i></div><span class="cv'+(hv===hmax&&hv>0?' luck-hi':'')+'">'+hv+'</span></div>'); }
  h.push('</div>');
  h.push('<h4 class="sect">各卡池6★率排行（抽≥10次）</h4><div class="chart">');
  var pkX;
  var poolArr9=[];
  for(pkX in poolAgg){ if(poolAgg[pkX].n>=10)poolArr9.push(poolAgg[pkX]); }
  poolArr9.sort(function(a,b){ return (b.s6/b.n)-(a.s6/a.n); });
  var prMax=1;
  for(i=0;i<poolArr9.length;i++){ var pr9=poolArr9[i].s6/poolArr9[i].n*100; if(pr9>prMax)prMax=pr9; }
  for(i=0;i<Math.min(10,poolArr9.length);i++){
    var pv9=poolArr9[i], pr9b=pv9.s6/pv9.n*100;
    h.push('<div class="crow"><span class="cl" title="'+esc(pv9.full)+'">'+esc(pv9.full.slice(0,14))+(pv9.full.length>14?'…':'')+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(pr9b/prMax*100))+'%"></i></div><span class="cv'+(pr9b>=2.89?' luck-hi':'')+'">'+pr9b.toFixed(1)+'%（'+pv9.s6+'/'+pv9.n+'）</span></div>');
  }
  if(!poolArr9.length)h.push('<div class="notice">暂无卡池达到 10 抽统计门槛</div>');
  h.push('</div>');
  h.push('<h4 class="sect">保底总览</h4><div class="chart">');
  var pkArr=[];
  for(var pk2 in state.pity){ var pv=state.pity[pk2]; if(pv&&typeof pv==='object'&&typeof pv.fails==='number')pkArr.push({k:pk2,f:pv.fails}); }
  pkArr.sort(function(a,b){return b.f-a.f;});
  var PKCN={std:'常驻标准',zj:'中坚寻访'};
  for(i=0;i<Math.min(10,pkArr.length);i++){
    var pk=pkArr[i];
    var pbK3=pk.k.indexOf(':')>=0?pk.k.slice(0,pk.k.indexOf(':')):pk.k;
    var pb=bannerById(pbK3);
    var lbl=PKCN[pk.k]||(pb&&pb.full?pb.full.slice(0,14):pk.k);
    h.push('<div class="crow"><span class="cl">'+esc(lbl)+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(pk.f))+'%"></i></div><span class="cv">'+pk.f+'抽</span></div>');
  }
  if(!pkArr.length)h.push('<div class="notice">暂无保底记录</div>');
  h.push('</div>');
  h.push('<h4 class="sect">限定寻访契约进度</h4><div class="chart">');
  var sk=Object.keys(state.spark||{}), sk2;
  for(sk2=0;sk2<sk.length;sk2++){
    var bk=sk[sk2], sb2=bannerById(bk);
    if(!sb2||!sb2.spark)continue;
    var tv=state.spark[bk]||0;
    h.push('<div class="crow"><span class="cl">'+esc(sb2.full.slice(0,12))+'</span><div class="cbar"><i style="width:'+Math.min(100,tv/3)+'%"></i></div><span class="cv">'+tv+'/300</span></div>');
  }
  if(!sk.length)h.push('<div class="notice">暂无限定寻访记录</div>');
  h.push('</div>');
  h.push('<h4 class="sect">按卡池类型分布</h4><div class="chart">');
  var tkeys=Object.keys(typeCnt);
  if(!tkeys.length)h.push('<div class="notice">暂无数据</div>');
  for(i=0;i<tkeys.length;i++){ var t2=tkeys[i]; var rate6=typeCnt[t2]?((type6[t2]||0)/typeCnt[t2]*100).toFixed(1)+'%':'0%'; h.push('<div class="crow"><span class="cl">'+(TCN[t2]||t2)+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(typeCnt[t2]/total*100))+'%"></i></div><span class="cv">'+typeCnt[t2]+'抽 · 6★率 '+rate6+'</span></div>'); }
  h.push('</div>');
  h.push('<h4 class="sect">每月统计</h4><div class="chart">');
  var mmkey, mmv;
  var mkeys=Object.keys(monMap).sort();
  var mmax=1;
  for(mmkey in monMap){ if(monMap[mmkey].n>mmax)mmax=monMap[mmkey].n; }
  for(i=0;i<mkeys.length;i++){ mmv=monMap[mkeys[i]]; h.push('<div class="crow"><span class="cl">'+mkeys[i]+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(mmv.n/mmax*100))+'%"></i></div><span class="cv'+(mmv.s6?' luck-hi':'')+'">'+mmv.n+'抽'+(mmv.s6?' · <b style="color:var(--gold)">6★×'+mmv.s6+'</b>':'')+'</span></div>'); }
  if(!mkeys.length)h.push('<div class="notice">暂无数据</div>');
  h.push('</div>');
  h.push('<h4 class="sect">UP命中率（6★出货中当期UP占比）</h4><div class="chart">');
  if(upTot){
    var upPct=Math.round(upHit/upTot*100);
    h.push('<div class="crow"><span class="cl">合计</span><div class="cbar"><i style="width:'+Math.max(2,upPct)+'%"></i></div><span class="cv'+(upPct>=60?' luck-hi':'')+'">'+upHit+'/'+upTot+'（'+upPct+'%）</span></div>');
    var ukeys=Object.keys(upRows);
    for(i=0;i<Math.min(6,ukeys.length);i++){
      var ur=upRows[ukeys[i]], up2=Math.round(ur.hit/ur.tot*100);
      h.push('<div class="crow"><span class="cl">'+esc(ur.full.slice(0,8))+'</span><div class="cbar"><i style="width:'+Math.max(2,up2)+'%"></i></div><span class="cv">'+ur.hit+'/'+ur.tot+'</span></div>');
    }
    if(ukeys.length>6)h.push('<div class="notice">……等共 '+ukeys.length+' 个卡池</div>');
  } else {
    h.push('<div class="notice">暂无UP池（限定/活动/定向）6★记录</div>');
  }
  h.push('</div>');
  h.push('<h4 class="sect">最近六星</h4>');
  var sixList=[];
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6)sixList.push(hist[i]); }
  for(i=0;i<Math.min(8,sixList.length);i++){ var s6=sixList[i], o6=opOf(s6.op); h.push('<div class="hitem r6"><span class="star">★★★★★★</span><span>'+esc(o6?o6.name:s6.op)+'</span></div>'); }
  if(!sixList.length)h.push('<div class="hitem" style="color:#5a6c8e">还没有六星干员，快去抽卡！</div>');
  var miss6=[];
  var missSet={}, msi;
  for(msi=0;msi<state.collection.length;msi++)missSet[state.collection[msi]]=1;
  for(var mk in opByName){ if(opByName[mk].rarity===6&&!missSet[mk])miss6.push(mk); }
  var missLim=[];
  for(var mlk in limitedOps){ if(!missSet[mlk])missLim.push(mlk); }
  if(missLim.length){ h.push('<h4 class="sect">还差这些限定（'+missLim.length+'）</h4><button class="mini-btn" id="btnCopyLim">复制限定缺卡</button><div class="rateup">'); for(i=0;i<Math.min(12,missLim.length);i++){ var ml6=opByName[missLim[i]]; if(ml6)h.push('<div class="rup-card r6" data-op="'+esc(missLim[i])+'"><img loading="lazy" src="'+esc(avUrl(ml6))+'"/><div class="rn">'+esc(ml6.name)+'</div><div class="rb lim">限定</div><div class="rr">'+stars(6)+'</div></div>'); } if(missLim.length>12)h.push('<div class="notice">……等共 '+missLim.length+' 名</div>'); h.push('</div>'); } else { h.push('<h4 class="sect">还差这些限定</h4><div class="notice">🎉 限定干员已全部集齐！</div>'); }
  h.push('<h4 class="sect">还差这些6★（'+miss6.length+'）</h4><button class="mini-btn" id="btnCopyMiss6">复制缺卡清单</button>');
  if(miss6.length){
    h.push('<div class="rateup">');
    for(i=0;i<Math.min(24,miss6.length);i++){
      var m6=miss6[i], o6=opByName[m6];
      h.push('<div class="rup-card r6" data-op="'+esc(m6)+'"><img loading="lazy" src="'+esc(avUrl(o6))+'" alt=""/><div class="rn">'+esc(o6.name)+'</div><div class="rb">6★</div><div class="rr">'+stars(6)+'</div></div>');
    }
    if(miss6.length>24)h.push('<div class="notice">……等共 '+miss6.length+' 名</div>');
    h.push('</div>');
  } else {
    h.push('<div class="notice">🎉 全部六星已集齐！</div>');
  }
  $('mBody').innerHTML=h.join('');
  var mc=$('mBody').querySelectorAll('.rup-card');
  for(i=0;i<mc.length;i++){ mc[i].onclick=function(){ openModal(this.getAttribute('data-op')); }; }
  var bcl=$('btnCopyLim'); if(bcl)bcl.onclick=function(){ var NL2=String.fromCharCode(10); var lm=missLim.map(function(x){return opByName[x]?opByName[x].name:x;}); var txt='还差这些限定（'+lm.length+'）：'+NL2+lm.join('、'); var ta2=document.createElement('textarea'); ta2.value=txt; ta2.style.position='fixed'; ta2.style.opacity='0'; document.body.appendChild(ta2); ta2.select(); try{ document.execCommand('copy'); toast('限定缺卡清单已复制'); }catch(e){ window.prompt('复制以下内容：', txt); } ta2.remove(); };
  var bm=$('btnCopyMiss6');
  if(bm)bm.onclick=function(){
    var NL=String.fromCharCode(10);
    var nml=miss6.map(function(x){return opByName[x]?opByName[x].name:x;});
    var text='还差这些6★（'+nml.length+'）：'+NL+nml.join('、');
    var ta=document.createElement('textarea');
    ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); toast('缺卡清单已复制'); }
    catch(e){ window.prompt('复制以下内容：', text); }
    ta.remove();
  };
  openModalBox();
}
function copyStats(){
  var hist=state.history, i, c6=0,c5=0,c4=0,c3=0;
  for(i=0;i<hist.length;i++){ var r=hist[i]; if(r.rar===6)c6++; else if(r.rar===5)c5++; else if(r.rar===4)c4++; else c3++; }
  var total=hist.length;
  var LK2=calcLuck();
  var score=LK2.luckIdx, maxG=LK2.maxG;
  var gaps=[], last=-1;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6){ if(last>=0)gaps.push(i-last-1); last=i; } }
  for(i=0;i<gaps.length;i++){ if(gaps[i]>maxG)maxG=gaps[i]; }
  var curFails=(state.pity[pityKey(bannerById(state.cur))]||{fails:0}).fails;
  var s6=hist.filter(function(x){return x.rar===6;}).slice(0,5).map(function(x){var o=opOf(x.op);return o?o.name:x.op;});
  var topOp='', topN=0;
  for(var k2 in (state.opCnt||{})){ if(state.opCnt[k2]>topN){ topN=state.opCnt[k2]; topOp=k2; } }
  var topName=topOp?(opOf(topOp)?opOf(topOp).name:topOp):'';
  var NL=String.fromCharCode(10);
  var text=['【明日方舟干员寻访模拟 · 抽卡总结】','总抽数：'+total+' 抽（6★×'+c6+' · 5★×'+c5+' · 4★×'+c4+' · 3★×'+c3+'）','6★出率：'+(total?(c6/total*100).toFixed(2):0)+'% · 欧气指数：'+score+'（'+LK2.label+'）','最长非酋纪录：'+(maxG||0)+' 抽 · 当前保底：'+curFails+' 抽','最近六星：'+(s6.join('、')||'暂无'),'出货最多：'+(topName||'暂无')+(topN?(' ×'+topN):'')].join(NL);
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('抽卡总结已复制到剪贴板'); }
  catch(e){ window.prompt('复制以下内容：', text); }
  ta.remove();
}
function resetAll(){
  if(!confirm('确定要重置所有存档（合成玉、保底、图鉴、记录）吗？'))return;
  try{ localStorage.removeItem(LS_KEY); }catch(e){}
  location.reload();
}
function exportSave(){
  var s=JSON.stringify(state);
  try{
    if(typeof Blob==='undefined')throw new Error('no blob');
    var blob=new Blob([s],{type:'application/json;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='抽卡模拟器存档_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(a.href); }catch(e){} a.remove(); },1000);
    toast('存档已下载（JSON 文件）');
  }catch(e){
    var ta=document.createElement('textarea');
    ta.value=s; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); toast('存档已复制到剪贴板'); }
    catch(e2){ window.prompt('复制以下存档内容：', s); }
    ta.remove();
  }
}
function importSave(){
  var hasBk=false;
  try{ hasBk=!!localStorage.getItem('akgacha_backup'); }catch(e){}
  var h=['<h4 class="sect" style="margin-top:0">📥 导入存档</h4>'];
  h.push('<div class="wikihint">支持两种方式：<b>选择 JSON 文件</b>（推荐，可拖拽到下方区域）或<b>粘贴存档文本</b>。导入前会自动备份当前存档。</div>');
  h.push('<div id="impDrop" class="imp-drop">📂 点击选择文件 · 或将 .json 拖拽到此处</div>');
  h.push('<input type="file" id="impFile" accept=".json,application/json" style="display:none"/>');
  h.push('<textarea id="impText" placeholder="或直接粘贴存档 JSON 文本…" style="min-height:90px"></textarea>');
  h.push('<div class="wikisearch"><button class="mini-btn" id="impGo">✅ 导入</button><button class="mini-btn" id="impBk"'+(hasBk?'':' disabled')+'>↩️ 恢复上次备份</button></div>');
  h.push('<div id="impOut"></div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var drop=$('impDrop'), fileIn=$('impFile'), txt=$('impText');
  function impMsg(msg,isErr){ var o=$('impOut'); if(o)o.innerHTML='<div class="notice" style="color:'+(isErr?'var(--red)':'var(--acc2)')+'">'+esc(msg)+'</div>'; }
  if(drop)drop.onclick=function(){ try{ fileIn.click(); }catch(e){} };
  if(fileIn)fileIn.onchange=function(){
    var f=fileIn.files&&fileIn.files[0];
    if(!f)return;
    if(f.size>10*1024*1024){ impMsg('文件过大（>10MB）',true); return; }
    if(typeof FileReader==='undefined'){ impMsg('当前环境不支持文件读取，请改用粘贴',true); return; }
    var rd=new FileReader();
    rd.onload=function(){ try{ txt.value=String(rd.result||''); impMsg('已读取 '+f.name+'（'+f.size+' 字节）· 点击「导入」确认'); }catch(e){} };
    rd.onerror=function(){ impMsg('文件读取失败',true); };
    rd.readAsText(f);
  };
  try{
    var dz=$('mBody');
    if(dz&&dz.addEventListener){
      dz.addEventListener('dragover',function(e){ try{e.preventDefault();}catch(x){} if(drop)drop.classList.add('over'); });
      dz.addEventListener('dragleave',function(){ if(drop)drop.classList.remove('over'); });
      dz.addEventListener('drop',function(e){
        try{e.preventDefault();}catch(x){}
        if(drop)drop.classList.remove('over');
        var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
        if(!f||typeof FileReader==='undefined')return;
        var rd=new FileReader();
        rd.onload=function(){ try{ txt.value=String(rd.result||''); impMsg('已读取 '+f.name+' · 点击「导入」确认'); }catch(e){} };
        rd.readAsText(f);
      });
    }
  }catch(e){}
  var go=$('impGo');
  if(go)go.onclick=function(){ doImport(txt?txt.value:''); };
  var bk=$('impBk');
  if(bk&&hasBk)bk.onclick=function(){
    try{
      var raw=localStorage.getItem('akgacha_backup');
      if(!raw){ impMsg('没有可恢复的备份',true); return; }
      var ns=JSON.parse(raw);
      if(!ns||typeof ns!=='object'){ impMsg('备份损坏',true); return; }
      state=normalizeState(ns); save(); try{ location.reload(); }catch(e){}
    }catch(e){ impMsg('恢复失败：'+e.message,true); }
  };
}
function doImport(s){
  var s2=String(s||'').trim();
  if(!s2){ toast('请先选择文件或粘贴存档内容'); return; }
  try{
    var ns=JSON.parse(s2);
    if(!ns||typeof ns!=='object'||!Array.isArray(ns.history)||!Array.isArray(ns.collection)||ns.jade==null){
      toast('存档格式无效（需包含 jade / history / collection）'); return;
    }
    try{ localStorage.setItem('akgacha_backup',JSON.stringify(state)); toast('已自动备份当前存档'); }catch(e){}
    state=normalizeState(ns); save(); try{ location.reload(); }catch(e){}
  }catch(e){ toast('JSON 解析失败：'+e.message); }
}
function toggleSound(){ SOUND=!SOUND; try{ localStorage.setItem('akgacha_snd',SOUND?'1':'0'); }catch(e){} var b=$('btnSound'); if(b){ b.textContent=SOUND?'音效: 开':'音效: 关'; b.classList.toggle('on',SOUND); } }
var THEME_NAMES={default:'默认黑金',blue:'深空蓝',amber:'龙门暖',green:'源石绿',purple:'紫夜'};
function applyTheme(){
  var t=state.theme||'default';
  if(!THEME_NAMES[t]){ t='default'; state.theme=t; try{ localStorage.setItem(LS_KEY,JSON.stringify(state)); }catch(e){} }
  try{ document.body.className=(t==='default')?'':'theme-'+t; }catch(e){}
  var b=$('btnTheme'); if(b)b.textContent='🎨 '+THEME_NAMES[t];
}
function nextTheme(){
  var keys=['default','blue','amber','green','purple'];
  var cur=keys.indexOf(state.theme||'default');
  state.theme=keys[(cur+1)%keys.length];
  save(); applyTheme(); toast('已切换主题：'+THEME_NAMES[state.theme]);
}
var opSort='cnt', opFilter='had', opSearch='', opProf='all';
function openOpStats(){
  var h=[];
  h.push('<div class="opstats">');
  h.push('<div class="controls"><input id="opSearch" placeholder="搜索干员名称..."/><select id="opSort"><option value="cnt">按出货数</option><option value="rarity">按稀有度</option><option value="name">按名称</option></select></div>');
  h.push('<div class="filters" id="opChips"></div>');
  h.push('<div class="filters" id="opProfChips"></div>');
  h.push('<div class="notice" id="opSum"></div>');
  h.push('<div id="opTable"></div>');
  h.push('</div>');
  $('mBody').innerHTML=h.join('');
  setChips($('opChips'),[['all','全部'],['had','出过'],['miss','未拥有'],['lim','限定'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],opFilter,function(){ opFilter=$('opChips')._v; renderOpStatsTable(); });
  var profSet={}, pk3;
  for(pk3 in opByName){ if(opByName[pk3].prof)profSet[opByName[pk3].prof]=1; }
  var profArr=[['all','职业:全部']];
  for(pk3 in profSet)profArr.push([pk3,pk3]);
  setChips($('opProfChips'),profArr,opProf,function(){ opProf=$('opProfChips')._v; renderOpStatsTable(); });
  var inp=$('opSearch'); if(inp){ var opT=null; inp.oninput=function(){ opSearch=this.value.trim(); clearTimeout(opT); opT=setTimeout(function(){ renderOpStatsTable(); },150); }; }
  var sel=$('opSort'); if(sel)sel.onchange=function(){ opSort=this.value; renderOpStatsTable(); };
  renderOpStatsTable();
  openModalBox();
}
var OP_N=200;
var OP_NAMES=null;
var colSetSt2={};
function renderOpStatsTable(){
  if(!OP_NAMES)OP_NAMES=Object.keys(opByName);
  var names=OP_NAMES, i, o, cnt, list=[], maxN=1;
  var total=0, had=0;
  colSetSt2={};
  for(i=0;i<state.collection.length;i++)colSetSt2[state.collection[i]]=1;
  for(i=0;i<names.length;i++){
    o=opByName[names[i]]; cnt=(state.opCnt||{})[names[i]]||0;
    if(opFilter==='had'&&cnt===0)continue;
    if(opFilter==='miss'&&cnt>0)continue;
    if(opFilter==='lim'&&!limitedOps[names[i]])continue;
    if(opProf!=='all'&&o.prof!==opProf)continue;
    if(opFilter==='6'&&o.rarity!==6)continue;
    if(opFilter==='5'&&o.rarity!==5)continue;
    if(opFilter==='4'&&o.rarity!==4)continue;
    if(opFilter==='3'&&o.rarity!==3)continue;
    if(opSearch&&o.name.indexOf(opSearch)<0)continue;
    list.push({n:names[i],o:o,c:cnt});
    total+=cnt; if(cnt>0)had++; if(cnt>maxN)maxN=cnt;
  }
  list.sort(function(a,b){
    if(opSort==='cnt'){ if(b.c!==a.c)return b.c-a.c; if(b.o.rarity!==a.o.rarity)return b.o.rarity-a.o.rarity; return a.n.localeCompare(b.n,'zh'); }
    if(opSort==='rarity'){ if(b.o.rarity!==a.o.rarity)return b.o.rarity-a.o.rarity; if(b.c!==a.c)return b.c-a.c; return a.n.localeCompare(b.n,'zh'); }
    return a.n.localeCompare(b.n,'zh');
  });
  var h=[];
  h.push('<div class="ophead">干员</div><div class="ophead">出数</div>');
  var showN=Math.min(list.length,OP_N);
  for(i=0;i<showN;i++){
    var it=list[i];
    h.push('<div class="optable-row'+(it.c===0?' zero':'')+'" data-op="'+esc(it.n)+'"><img loading="lazy" src="'+esc(avUrl(it.o))+'" alt=""/><span class="on">'+esc(it.o.name)+'</span><span class="ost">'+stars(it.o.rarity)+'</span><div class="obar"><i style="width:'+Math.max(1,Math.round(it.c/maxN*100))+'%"></i></div><span class="ocnt">'+it.c+(total?' · '+(it.c/total*100).toFixed(1)+'%':'')+'</span></div>');
  }
  if(list.length>showN)h.push('<button class="mini-btn" id="opMore" style="margin:6px auto;display:block">加载更多（'+(list.length-showN)+' 名）</button>');
  if(!list.length)h.push('<div class="hitem" style="color:#5a6c8e">没有符合条件的干员</div>');
  $('opTable').innerHTML=h.join('');
  var limGotSt=0, lkSt;
  for(lkSt in limitedOps){ if(colSetSt2[lkSt])limGotSt++; }
  var limPctSt=limitedTotal?Math.round(limGotSt/limitedTotal*100):0;
  $('opSum').innerHTML='统计范围：全部获得记录（抽卡/兑换/免费领取）· 共 <b>'+total+'</b> 次 · 出过 <b>'+had+'</b> 名干员 · 限定图鉴 <b>'+limGotSt+'/'+limitedTotal+'</b><div class="statbar"><i style="width:'+limPctSt+'%"></i></div>';
  var rows=$('opTable').querySelectorAll('.optable-row');
  for(i=0;i<rows.length;i++){ rows[i].onclick=function(){ openModal(this.getAttribute('data-op')); }; }
  var om=$('opMore'); if(om)om.onclick=function(){ OP_N+=200; renderOpStatsTable(); };
}
function relTime(t){
  if(!t)return '';
  var d=Date.now()-t, m=Math.floor(d/60000);
  if(m<1)return '刚刚';
  if(m<60)return m+'分钟前';
  var h=Math.floor(m/60);
  if(h<24)return h+'小时前';
  var day=Math.floor(h/24);
  if(day<30)return day+'天前';
  var dt=new Date(t);
  return (dt.getMonth()+1)+'月'+dt.getDate()+'日';
}
function exportBanners(){
  var NL=String.fromCharCode(10);
  var lines=['卡池,类型,开始,结束,UP6★,UP5★'];
  for(var i=0;i<DATA.banners.length;i++){ var b=DATA.banners[i];
    lines.push([csvEsc(b.full),csvEsc(b.label),csvEsc(b.start),csvEsc(b.end),csvEsc(b.six.map(function(n){var o=opOf(n);return o?o.name:n;}).join(' ')),csvEsc(b.five.map(function(n){var o=opOf(n);return o?o.name:n;}).join(' '))].join(','));
  }
  var text=String.fromCharCode(0xFEFF)+lines.join(NL);
  try{
    if(typeof Blob==='undefined')throw new Error('no blob');
    var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='明日方舟卡池清单.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(a.href); }catch(e){} a.remove(); },1000);
    toast('卡池清单已导出（共 '+DATA.banners.length+' 个）');
  }catch(e){ window.prompt('复制以下内容：', text); }
}
function csvEsc(v){ v=String(v==null?'':v); return v.indexOf(',')>=0||v.indexOf('"')>=0?'"'+v.split('"').join('""')+'"':v; }
function historyCsvText(useFilter){
  var arr=useFilter?histFilteredList():state.history;
  var NL=String.fromCharCode(10);
  var lines=['干员,稀有度,时间,卡池,卡池类型,UP组合,距上次6★(抽)'];
  var gapArr=[], gi6=-1, gi2;
  for(gi2=arr.length-1;gi2>=0;gi2--){
    if(arr[gi2].rar===6){ gi6=gi2; gapArr[gi2]=0; }
    else gapArr[gi2]=(gi6>=0)?(gi6-gi2):-1;
  }
  for(var i=0;i<arr.length;i++){ var r=arr[i], o=opOf(r.op), dt=new Date(r.t||Date.now()); var gapTxt=gapArr[i]>=0?String(gapArr[i]):'—';
    lines.push(csvEsc(o?o.name:r.op)+','+r.rar+'星,'+dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+' '+dt.getHours()+':'+(dt.getMinutes()<10?'0':'')+dt.getMinutes()+','+csvEsc(r.bn||'')+','+(r.type||'event')+','+csvEsc(r.sel?selShort(r.sel):'')+','+gapTxt); }
  return String.fromCharCode(0xFEFF)+lines.join(NL);
}
function copyHistoryCsv(useFilter){
  var text=historyCsvText(useFilter);
  var ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast((useFilter?'筛选记录已复制':'抽卡记录已复制')+'（共 '+((useFilter?histFilteredList():state.history).length)+' 条）'); }
  catch(e){ window.prompt('复制以下记录：', text); }
  ta.remove();
}
function exportHistory(useFilter){
  var text=historyCsvText(useFilter);
  var arr=useFilter?histFilteredList():state.history;
  try{
    if(typeof Blob==='undefined')throw new Error('no blob');
    var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='抽卡记录'+(useFilter?'_筛选':'')+'_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(a.href); }catch(e){} a.remove(); },1000);
    toast((useFilter?'筛选记录已导出':'抽卡记录已导出')+'（共 '+arr.length+' 条）');
  }catch(e){ window.prompt('复制以下记录：', text); }
}
function clearHistory(){
  if(!confirm('确定要清空寻访记录与干员图鉴吗？'))return;
  state.history=[];
  state.collection=[];
  state.pity={};
  state.spark={};
  state.opCnt={};
  state.cnt={};
  state.wish=[];
  state.claimed={};
  save();
  renderStats(); renderHistory(); renderCollection(); renderBannerInfo();
  toast('已清空记录');
}
function toggleSpeed(){
  if(SPEED>100)SPEED=30;
  else if(SPEED>0)SPEED=0;
  else SPEED=160;
  var cardsEl=$('cards'); if(cardsEl)cardsEl.classList.toggle('fast',SPEED<=100);
  var btn=$('btnSpeed'); if(!btn)return;
  btn.textContent=SPEED>100?'动画: 慢速':(SPEED===0?'动画: 关闭':'动画: 快速');
  btn.classList.toggle('on',SPEED!==160);
  btn.classList.toggle('off',SPEED===0);
  if(SPEED===0&&cardsEl){ cardsEl.querySelectorAll('.card').forEach(function(c){ if(c.classList&&!c.classList.contains('flip'))c.classList.add('flip'); }); }
}
var IDB=null, IDB_READY=false, IDB_STORE='img';
function idbOpen(){
  try{
    if(typeof indexedDB==='undefined')return;
    var req=indexedDB.open('akgacha_img',1);
    req.onupgradeneeded=function(e){ var db=e.target.result; if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE); };
    req.onsuccess=function(e){ IDB=e.target.result; IDB_READY=true; };
    req.onerror=function(){};
  }catch(e){}
}
function idbGet(url, cb){
  if(!IDB_READY||!IDB||!url)return cb(null);
  try{
    var tx=IDB.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(url);
    tx.onsuccess=function(){ cb(tx.result||null); };
    tx.onerror=function(){ cb(null); };
  }catch(e){ cb(null); }
}
function idbPut(url, blob){
  if(!IDB_READY||!IDB||!url||!blob)return;
  try{ IDB.transaction(IDB_STORE,'readwrite').objectStore(IDB_STORE).put(blob,url); }catch(e){}
}
function preloadImg(url){
  if(!url)return;
  if(typeof fetch==='undefined')return;
  idbGet(url,function(blob){
    if(blob)return;
    try{
      fetch(url).then(function(res){ return res.blob(); }).then(function(b){
        idbPut(url,b);
        if(typeof Image!=='undefined'&&typeof URL!=='undefined'&&URL.createObjectURL){ var im=new Image(); try{ im.src=URL.createObjectURL(b); }catch(e){} }
      }).catch(function(){});
    }catch(e){}
  });
}
function idbSrc(url, imgEl){
  if(!url||!imgEl)return;
  idbGet(url,function(blob){
    if(blob&&typeof URL!=='undefined'&&URL.createObjectURL){ try{ imgEl.src=URL.createObjectURL(blob); }catch(e){} }
  });
}
function preloadArtLimit(){ return isMobile()?120:0; }
function preloadAllArt(){
  idbOpen();
  if(isMobile()){
    try{ if(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-data: reduce)').matches)return; }catch(e){}
  }
  var keys=Object.keys(opByName);
  var order=keys.slice().sort(function(a,b){ return (opByName[b].rarity||0)-(opByName[a].rarity||0); });
  var lim=preloadArtLimit(); if(lim)order=order.slice(0,lim);
  var idx=0, WORKERS=3;
  function next(){
    if(idx>=order.length)return;
    var o=opByName[order[idx++]];
    preloadImg(opArtT(o));
    setTimeout(next, 8);
  }
  for(var w=0;w<WORKERS;w++)setTimeout(next, w*16);
}
function init(){
  var bs=DATA.banners, i;
  if(!state.cur||!bannerById(state.cur))state.cur=bs[0].id;
  if(!state.history.length&&!state.collection.length){ setTimeout(function(){ toast('👋 欢迎！选择卡池后点击抽卡开始 · 快捷键 1/2/3 · ←/→ 切换卡池'); }, 800); }
  initFilters();
  renderBannerList();
  renderBannerInfo();
  setTimeout(preloadAllArt, 800);
  renderStats();
  renderHistory();
  renderCollection();
  setFortune();
  try{ if(typeof visualViewport!=='undefined'&&visualViewport.addEventListener){ visualViewport.addEventListener('resize',mobileKbdResize); visualViewport.addEventListener('scroll',mobileKbdResize); } }catch(e){}
  mobileA11y();
  wire('btn1',function(){ doPull(1); });
  wire('btn10',function(){ doPull(10); });
  wire('btnUntil6',function(){ doUntil6(); });
  wire('btnCustom',function(){ var v=parseInt($('customN').value,10); if(!v||isNaN(v))v=50; doPull(Math.min(500,Math.max(1,v))); });
  wire('btn50',function(){ doPull(50); });
  wire('btn100',function(){ doPull(100); });
  wire('btn200',function(){ doPull(200); });
  wire('btnStats',openStats);
  wire('btnPityMap',openPityMap);
  wire('btnSim',simulatePull);
  wire('btnReport',openReport);
  wire('btnOpStats',openOpStats);
  wire('btnCopyStats',copyStats);
  wire('btnRules',openRules);
  wire('btnGallery',openGallery);
  wire('btnWishList',openWishList);
  wire('btnWikiSearch',openWikiSearch);
  wire('btnAbout',openAbout);
  wire('btnMatQueryTop',openMatQuery);
  wire('btnFashionHall',openFashionHall);
  wire('btnRandOp',function(){ var keys=Object.keys(opByName); if(!keys.length)return; openModal(keys[Math.floor(Math.random()*keys.length)]); });
  wire('btnAch',openAch);
  wire('btnExportHist',exportHistory);
  wire('btnRandom',randomBanner);
  wire('btnResetFilters',resetFilters);
  wire('btnExportBanners',exportBanners);
  var csb=$('colSearch'); var csDl=null;
  if(csb)csb.oninput=function(){ clearTimeout(csDl); var v=this.value; csDl=setTimeout(function(){ colSearch=v.trim(); renderCollection(); },150); };
  wire('mBackdrop',closeDrawer);
  wire('drawerClose',closeDrawer);
  wire('utilToggle',function(){ var ub=$('utilBar'); if(ub)ub.classList.toggle('show'); });
  wire('btnSpeed',toggleSpeed);
  wire('btnSound',toggleSound);
  wire('btnTheme',nextTheme);
  applyTheme();
  wire('btnExport',exportSave);
  wire('btnImport',importSave);
  wire('btnReset',resetAll);
  wire('btnReset2',clearHistory);
  var sb=$('searchBox'); var sbDl=null;
  if(sb)sb.oninput=function(){ clearTimeout(sbDl); var v=this.value; sbDl=setTimeout(function(){ renderBannerList(); },200); };
  wire('mClose',closeModal);
  wire('lightbox',lightboxTap);
  var md=$('modal'); if(md)md.onclick=function(e){ if(e.target===this)closeModal(); };
  document.addEventListener('keydown',function(e){
    if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'))return;
    if(e.key==='1')doPull(1);
    else if(e.key==='2')doPull(10);
    else if(e.key==='3')doUntil6();
    else if(e.key==='ArrowLeft')navBanner(-1);
    else if(e.key==='ArrowRight')navBanner(1);
    else if(e.key==='f'||e.key==='F'){ var cb=bannerById(state.cur); if(cb){ if(state.fav[cb.id])delete state.fav[cb.id]; else state.fav[cb.id]=true; save(); renderBannerList(); toast(state.fav[cb.id]?'⭐ 已收藏当前卡池':'已取消收藏'); } }
    else if(e.key==='g'||e.key==='G')openGallery();
    else if(e.key==='s'||e.key==='S')openStats();
    else if(e.key==='h'||e.key==='H'){ var hp=$('history'); if(hp&&hp.scrollIntoView)hp.scrollIntoView({behavior:'smooth',block:'start'}); }
    else if(e.key==='w'||e.key==='W')openWishList();
    else if(e.key==='p'||e.key==='P')openPityMap();
    else if(e.key==='?'||e.key==='/')openRules();
  });
  var bl=$('bannerList');
  if(bl)bl.onclick=function(e){
    var t=e.target;
    if(t&&t.classList&&t.classList.contains('favbtn')){
      var fid=t.getAttribute('data-id');
      if(state.fav[fid])delete state.fav[fid]; else state.fav[fid]=true;
      save(); renderBannerList();
      return;
    }
    var c=e.target.closest?e.target.closest('.bcard'):null;
    if(c){ state.cur=c.getAttribute('data-id'); save(); renderBannerList(); renderBannerInfo(); renderStats(); if(isMobile())closeDrawer(); }
  };
  setChips($('colChips'),[['all','全部'],['miss','未拥有'],['lim','限定'],['favop','收藏'],['wish','心愿'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],'all',function(){
    colF=$('colChips')._v; renderCollection();
  });
  setChips($('colProfChips'),[['all','职业:全部'],['先锋','先锋'],['近卫','近卫'],['重装','重装'],['狙击','狙击'],['术师','术师'],['医疗','医疗'],['辅助','辅助'],['特种','特种']],'all',function(){
    colP=$('colProfChips')._v; renderCollection();
  });
  var cs=$('colSortSel'); if(cs)cs.onchange=function(){ colSort=this.value; renderCollection(); };
  var cns=$('colNationSel'); if(cns)cns.onchange=function(){ colNation=this.value; renderCollection(); };
  setChips($('histChips'),[['all','全部'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],'all',function(){
    histF=$('histChips')._v; histRar='all'; var hrs0=$('histRarSel'); if(hrs0)hrs0.value='all'; histN=60; renderHistory();
  });
  setChips($('histTypeChips'),[['all','池:全部'],['limited','限定'],['event','活动'],['standard','标准'],['zhongjian','中坚'],['joint','联合行动'],['direct','定向甄选'],['zjselect','中坚甄选'],['special','特殊']],'all',function(){
    histT=$('histTypeChips')._v; histN=60; renderHistory();
  });
  setChips($('histTimeChips'),[['all','时间:全部'],['today','今天'],['week','近7天'],['month','本月']],'all',function(){
    histTime=$('histTimeChips')._v; histN=60; renderHistory();
  });
  var hs=$('histSearch'); if(hs){ var hsDl=null; hs.oninput=function(){ histSearch=this.value.trim(); histN=60; clearTimeout(hsDl); hsDl=setTimeout(function(){ renderHistory(); },180); }; }
  var hcs=$('histClearSearch'); if(hcs)hcs.onclick=function(){ histSearch=''; var hs2=$('histSearch'); if(hs2)hs2.value=''; histN=60; renderHistory(); };
  var hgs=$('histGapSel'); if(hgs)hgs.onchange=function(){ histGap=this.value; histN=60; renderHistory(); };
  var hrs=$('histRarSel'); if(hrs)hrs.onchange=function(){ histRar=this.value; histF='all'; var hc0=$('histChips'); if(hc0){ hc0._v='all'; var cbs0=hc0.querySelectorAll('.chip'); for(var cbi0=0;cbi0<cbs0.length;cbi0++)cbs0[cbi0].classList.remove('on'); if(cbs0.length)cbs0[0].classList.add('on'); } histN=60; renderHistory(); };
  var hbc=$('btnHistCur'); if(hbc)hbc.onclick=function(){ if(histBid){ histBid=''; } else { var cb2=bannerById(state.cur); if(cb2){ histBid=cb2.id+(isSelect(cb2)?':'+selKey(cb2):''); } } histN=60; hbc.classList.toggle('on',!!histBid); hbc.textContent=histBid?'🎯 当前池 ✓':'🎯 当前池'; renderHistory(); };
}
init();
