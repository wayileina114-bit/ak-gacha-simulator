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
var sessPulls=0;
var FORTUNES=['罗德岛今日运势：大吉，宜抽卡','博士，稳住心态，保底总会来的','今日出货率 +1%（心理作用加成）','非酋之光保佑你','好运正在路上，再抽亿发','罗德岛随时欢迎你回家','听说凌晨3点玄学出货率高','你的第六感在发光，抽吧'];
var FORTUNE_DETAILS=['今天适合十连：据罗德岛统计，十连出5★以上的概率更高（其实都一样，开心就好）','玄学提示：先单抽垫2发再十连，据说能提高出货率（信则有）','今日宜抽卡：博士的运势曲线正处于上升期，抓住机会','避坑提醒：抽卡前先去基建收个菜，转换一下运气','占卜结果：你与六星干员的缘分正在接近，保持耐心','幸运色：金色。建议把界面调成金色主题再抽','今日不宜：凌晨抽卡。早点睡，明天保底见','神秘信号：抽卡前心里默念想要的名字，会有奇效'];
function setFortune(){
  var f=$('fortune'); if(!f)return;
  var idx=Math.floor(Math.random()*FORTUNES.length);
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
function defaultState(){ return { cur:null, jade:60000, pity:{}, spark:{}, sel:{}, cnt:{}, opCnt:{}, fav:{}, favOps:{}, wish:[], history:[], collection:[] }; }
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
function save(){ try{ localStorage.setItem(LS_KEY,JSON.stringify(state)); }catch(e){} }
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
function avUrl(o){ return o.av?('https://media.prts.wiki/'+o.av+'/'+encodeURIComponent('头像_'+o.name+'.png')):(o.art||''); }
function opArtT(o){ return thumbOf(o.art,o.name,'skin 0 '+(o.artV||2)+'.png',480)||o.art||avUrl(o); }
function pityKey(b){ return b.type==='standard'?'std':(b.type==='zhongjian'?'zj':b.id); }
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
function playResult(c6,c5){
  if(c6){ playTone(523,.14,'square',.12); setTimeout(function(){playTone(659,.14,'square',.12);},140); setTimeout(function(){playTone(784,.14,'square',.12);},280); setTimeout(function(){playTone(1046,.35,'square',.18);},420); }
  else if(c5){ playTone(660,.12,'triangle',.1); setTimeout(function(){playTone(880,.18,'triangle',.12);},120); }
}
function isRestricted(b){ return b.type==='joint'||b.type==='direct'||b.type==='zjselect'||b.type==='special'; }
function isSelect(b){ return b.type==='direct'||b.type==='zjselect'; }
function selMax(b,rar){ if(b.type==='zjselect')return rar===6?2:3; return 3; }
function getSel(b){ if(!state.sel[b.id])state.sel[b.id]={six:[],five:[]}; return state.sel[b.id]; }
function minSel(b,rar){ if(b.type==='zjselect'&&rar===6)return 2; return 1; }
function ensureDefaultSel(b){
  var s=getSel(b);
  var changed=false;
  if(!s.six.length&&(b.six||[]).length){ s.six=b.six.slice(0,selMax(b,6)); changed=true; }
  if(!s.five.length&&(b.five||[]).length){ s.five=b.five.slice(0,selMax(b,5)); changed=true; }
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
function pick6(b){
  var pool=getPool(b), ups=isSelect(b)?selUps(b,6):b.six, r=Math.random()*100;
  var share=upShare(b,ups);
  if(ups.length&&r<share)return rnd(ups);
  var p6list=pool.p6.length?pool.p6:ups;
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
  var p5list=pool.p5.length?pool.p5:ups;
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
function addCol(op){ if(state.collection.indexOf(op)<0){ state.collection.push(op); newPulse[op]=Date.now(); if(Object.keys(newPulse).length>50){ var cutoff=Date.now()-20000, kk2; for(kk2 in newPulse){ if(newPulse[kk2]<cutoff)delete newPulse[kk2]; } } save(); return true; } return false; }
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
function renderBannerList(){
  var list=$('bannerList'), bs=DATA.banners, html=[], i, b;
  var yf=$('yearChips')._v, tf=$('typeChips')._v, q=($('searchBox').value||'').trim();
  var maxStart=getMaxStart();
  var matched=[];
  for(i=0;i<bs.length;i++){
    b=bs[i];
    if(yf!=='all'&&b.year!==yf)continue;
    if(tf==='fav'){ if(!state.fav[b.id])continue; }
    else if(tf!=='all'&&b.type!==tf)continue;
    if(q){
      var hay=b.name+' '+b.six.join(' ')+' '+b.five.join(' ')+' '+(b.limitedSix||[]).join(' ')+' '+(b.four||[]).join(' ');
      if(hay.indexOf(q)<0)continue;
    }
    matched.push(b);
  }
  matched.sort(function(a,b2){ return (state.fav[b2.id]?1:0)-(state.fav[a.id]?1:0); });
  for(i=0;i<matched.length;i++){
    b=matched[i];
    html.push('<div class="bcard'+(state.cur===b.id?' on':'')+'" data-id="'+b.id+'">');
    html.push('<div class="thumb">');
    var shown=b.six.slice(0,2);
    if(i<40){ for(var j=0;j<shown.length;j++){ var o=opOf(shown[j]); if(o)html.push('<img loading="lazy" src="'+esc(avUrl(o))+'" alt="" onerror="this.remove()"/>'); }
     }html.push('</div>');
    html.push('<div class="meta"><div class="name">'+esc(b.name)+(b.start===maxStart?'<span class="now-badge">当前</span>':'')+'<span class="badge" style="background:'+b.color+'">'+esc(b.label)+'</span><span class="favbtn'+(state.fav[b.id]?' on':'')+'" data-id="'+b.id+'" title="收藏/取消收藏">★</span></div>');
    var cnt=(state.cnt||{})[b.id]||0;
    html.push('<div class="sub">'+esc(b.start)+' ~ '+esc(b.end)+(cnt>0?' · 已抽 <b style="color:var(--gold)">'+cnt+'</b> 抽':'')+'</div></div>');
    html.push('</div>');
  }
  list.innerHTML=html.join('');
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
function selBoxHtml(b,rar){
  var list=rar===6?b.six:b.five, s=ensureDefaultSel(b), key=rar===6?'six':'five';
  var sel=s[key]||[];
  var max=selMax(b,rar);
  var h=['<div class="selbox"><div class="seltitle">选择UP干员（'+(rar===6?'6★':'5★')+' · 最多'+max+'位 · 已选'+Math.min(sel.length,max)+'/'+max+'）</div><div class="selgrid">'];
  var i,o;
  for(i=0;i<showN;i++){
    o=opOf(list[i]); if(!o)continue;
    var on=sel.indexOf(list[i])>=0;
    h.push('<div class="selop'+(on?' on':' off')+'" data-op="'+esc(list[i])+'" data-rar="'+rar+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="sn">'+esc(o.name)+'</div></div>');
  }
  h.push('</div></div>');
  return h.join('');
}
function bannerInfoHtml(b){
  var h=[];
  h.push('<button class="mini-btn" id="mBannerOpen">🎴 切换卡池</button>');
  h.push('<div class="row1"><button class="mini-btn navB" data-dir="-1">◀ 上期</button><h2>'+esc(b.full)+'</h2><span class="badge" style="background:'+b.color+'">'+esc(b.label)+'</span><span class="dates">'+esc(b.start)+' ~ '+esc(b.end)+'</span><button class="mini-btn navB" data-dir="1">下期 ▶</button></div>');
  h.push('<div class="rateup">');
  var ups=b.six,i,j,o;
  for(i=0;i<ups.length;i++){
    o=opOf(ups[i]); if(!o)continue;
    var lim=b.limitedSix.indexOf(ups[i])>=0;
    h.push('<div class="rup-card r'+o.rarity+'" data-op="'+esc(ups[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="rn">'+esc(o.name)+'</div>');
    h.push('<div class="rb">'+(lim?'限定':'UP')+'</div>');
    h.push('<div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  var ups5=b.five.slice(0,3);
  for(j=0;j<ups5.length;j++){
    o=opOf(ups5[j]); if(!o)continue;
    h.push('<div class="rup-card r'+o.rarity+'" data-op="'+esc(ups5[j])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="rn">'+esc(o.name)+'</div><div class="rb">UP</div><div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  var ups4=b.four.slice(0,3);
  for(j=0;j<ups4.length;j++){
    o=opOf(ups4[j]); if(!o)continue;
    h.push('<div class="rup-card r'+o.rarity+'" data-op="'+esc(ups4[j])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="rn">'+esc(o.name)+'</div><div class="rb">4★UP</div><div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  h.push('</div>');
  var poolB=getPool(b);
  h.push('<button class="mini-btn" id="btnPool">查看完整卡池（6★ '+poolB.p6.length+' · 5★ '+poolB.p5.length+'）</button>');
  h.push('<div class="notice">6★出率 <b>2%</b>（51抽起每抽+2%，100抽必出）· 5★出率 <b>8%</b>（十连保底5★以上）· 4★ 50% · 3★ 40%');
  var ups6=isSelect(b)?selUps(b,6):b.six;
  if(ups6.length===1)h.push(' · 当期6★占6★出率的 <b>50%</b>');
  else if(ups6.length>=2)h.push(' · 当期6★各占6★出率的 <b>'+(b.type==='zjselect'?35:b.rate6)+'%</b>');
  if(b.limitedSix.length)h.push(' · 限定干员：<b>'+b.limitedSix.map(esc).join('、')+'</b>');
  if(b.spark)h.push(' · 300抽可兑换限定干员');
  h.push('</div>');
  var st0=state.pity[pityKey(b)]||{fails:0};
  h.push('<div class="pitybar"><div class="pbar"><i style="width:'+Math.min(100,st0.fails)+'%"></i></div><span>6★保底进度：已抽 <b>'+st0.fails+'</b> / 100（还剩 <b>'+(100-st0.fails)+'</b> 抽必出）</span></div>');
  h.push('<div class="calcrow"><span class="notice">保底预测：再抽</span><input id="calcN" type="number" min="1" max="200" value="10"/><span class="notice">抽 → 出6★概率</span><b id="calcP" style="color:var(--gold)">—</b><button class="mini-btn calcgo" data-n="10">10</button><button class="mini-btn calcgo" data-n="50">50</button><button class="mini-btn calcgo" data-n="100">100</button><span class="notice" id="calcNote"></span><button class="mini-btn" id="btnResetPity">重置本池保底</button><button class="mini-btn" id="btnCopyBanner">复制卡池信息</button></div>');
  if(isSelect(b)){
    h.push(selBoxHtml(b,6));
    h.push(selBoxHtml(b,5));
  }
  if(b.spark){
    var tok=state.spark[b.id]||0;
    h.push('<div class="spark"><span>寻访数据契约</span><div class="bar"><i style="width:'+Math.min(100,tok/3)+'%"></i></div><b>'+tok+' / 300</b>'+(tok<300?'<span class="sparkhint">还差 <b>'+(300-tok)+'</b> 抽可兑换限定</span>':'<span class="sparkhint done">已可兑换限定干员！</span>'));
    h.push('<button class="mini-btn" id="spark300" '+(tok>=300?'':'disabled')+'>300兑换限定</button>');
    var nonLim=b.six.filter(function(n){return b.limitedSix.indexOf(n)<0;});
    if(nonLim.length)h.push('<button class="mini-btn" id="spark200" '+(tok>=200?'':'disabled')+'>200兑换当期6★</button>');
    h.push('</div>');
  }
  return h.join('');
}
function renderBannerInfo(){
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
  var mbo=$('mBannerOpen'); if(mbo)mbo.onclick=openDrawer;
  var nbs=$('bannerInfo').querySelectorAll('.navB');
  for(var ni=0;ni<nbs.length;ni++){ nbs[ni].onclick=function(){ navBanner(parseInt(this.getAttribute('data-dir'),10)||0); }; }
  if(isSelect(b))ensureDefaultSel(b);
  var bbn=$('barBanner'); if(bbn)bbn.textContent=b.full;
  if(typeof Image!=='undefined'){
    var pre6=b.six.slice(0,2), pj;
    for(pj=0;pj<pre6.length;pj++){ var po6=opOf(pre6[pj]); if(po6){ var pim=new Image(); pim.src=opArtT(po6); } }
  }
  var brp=$('btnResetPity'); if(brp)brp.onclick=function(){ state.pity[pityKey(b)]={fails:0,batch:[]}; save(); renderBannerInfo(); renderStats(); toast('已重置「'+esc(b.full)+'」的保底'); };
  var bcb=$('btnCopyBanner'); if(bcb)bcb.onclick=function(){ copyBannerInfo(b); };
  var bp=$('btnPool'); if(bp)bp.onclick=openPoolModal;
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
  $('rateNote').innerHTML=msg;
}
function sparkExchange(cost){
  var b=bannerById(state.cur), tok=state.spark[b.id]||0;
  if(tok<cost){ toast('寻访数据契约不足'); return; }
  var list=cost===300?b.limitedSix.slice():b.six.slice();
  if(!list.length){ toast('无可兑换干员'); return; }
  var h=['<h4 class="sect" style="margin-top:0">选择要兑换的干员（消耗 <b>'+cost+'</b> 契约 · 现有 '+tok+'）</h4><div class="rateup">'];
  var i,o;
  for(i=0;i<showN;i++){
    o=opOf(list[i]); if(!o)continue;
    var owned=state.collection.indexOf(list[i])>=0;
    h.push('<div class="rup-card r'+o.rarity+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>');
    h.push('<div class="rn">'+esc(o.name)+(owned?'（已有）':'')+'</div>');
    h.push('<div class="rb">'+(b.limitedSix.indexOf(list[i])>=0?'限定':'当期')+'</div>');
    h.push('<div class="rr">'+stars(o.rarity)+'</div></div>');
  }
  h.push('</div><div class="notice">点击干员卡片完成兑换，优先换未拥有的干员</div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var cards=$('mBody').querySelectorAll('.rup-card');
  for(i=0;i<cards.length;i++){
    (function(card,opName){
      card.onclick=function(){
        state.spark[b.id]=tok-cost;
        addCol(opName);
        save();
        closeModal();
        toast('已兑换 <b>'+esc(opOf(opName).name)+'</b>！');
        renderBannerInfo(); renderStats(); renderCollection();
      };
    })(cards[i],list[i]);
  }
}
function renderCards(results,msg,has6,names6,has5){
  var wrap=$('cards'), html=[], i;
  for(i=0;i<results.length;i++){
    var r=results[i], o=opOf(r.op), nw=isNew(r.op);
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
      if(big6.length&&big6.length<=3){
        var bh=['<div class="sixstrip">'];
        for(bi2=0;bi2<big6.length;bi2++){ var bo6=opOf(big6[bi2].op); if(bo6)bh.push('<div class="sixcard" data-op="'+esc(big6[bi2].op)+'"><img loading="lazy" src="'+esc(opArtT(bo6))+'"/><div class="sn6">'+esc(bo6.name)+'</div></div>'); }
        bh.push('</div>');
        msg=bh.join('')+msg;
      }
    }
    $('resultMsg').innerHTML=msg||'';
    if(has6&&names6&&names6.length){ toast('恭喜！获得六星干员：'+names6.join('、')); sixBurst(names6); var first6=wrap.querySelector('.card.r6'); if(first6&&first6.scrollIntoView){ try{ first6.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){ first6.scrollIntoView(); } } }
    if(has5&&!has6){ var f5=$('flash'); if(f5){ f5.style.background='radial-gradient(ellipse at center, rgba(245,185,74,.32), transparent 70%)'; f5.style.transition='opacity .8s'; f5.style.opacity='1'; setTimeout(function(){ f5.style.opacity='0'; f5.style.background=''; }, 750); } try{ if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(50); }catch(e){} }
    if(lastBatch.length>10){ var ab=$('btnAllRes'); if(ab)ab.onclick=openAllResults; msg+='<br/><button class="mini-btn" id="btnAgain">🔁 再来十连</button>'; $('resultMsg').innerHTML=msg; var ab2=$('btnAgain'); if(ab2)ab2.onclick=function(){ doPull(10); }; }
    var sixcards=$('resultMsg').querySelectorAll('.sixcard');
    for(var si6=0;si6<sixcards.length;si6++){ (function(sc){ sc.onclick=function(){ openModal(sc.getAttribute('data-op')); }; })(sixcards[si6]); }
    playResult(has6||false,has5||false);
  }, 100+results.length*SPEED);
}
function setBusyUI(on){
  var ids=['btn1','btn10','btnUntil6','btnCustom'], i2, el2;
  for(i2=0;i2<ids.length;i2++){ el2=$(ids[i2]); if(el2)el2.disabled=on; }
}
function doPull(n){
  if(BUSY)return;
  var achBefore=achDoneSet();
  var b=bannerById(state.cur);
  if(!b)return;
  if(n<1)n=1; if(n>500)n=500;
  BUSY=true;
  setBusyUI(true);
  var results=[], i, r;
  var hadSet={}, hi2;
  for(hi2=0;hi2<state.collection.length;hi2++)hadSet[state.collection[hi2]]=1;
  for(i=0;i<n;i++){
    r=pullOne(b);
    results.push(r);
    if(isNew(r.op))addCol(r.op);
    state.history.unshift({op:r.op,rar:r.rar,t:Date.now(),type:b.type,bn:b.full,bid:b.id});
  }
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
    if(x.rar===6){c6++;names6.push(opOf(x.op).name);}
    else if(x.rar===5)c5++;
    else if(x.rar===4)c4++;
    else c3++;
  }
  var msg='';
  if(names6.length)msg='<b>★ 六星干员：'+names6.join('、')+' ★</b>';
  msg=enhancePullMsg(results,hadSet,msg);
  msg+='<br/>本次 '+n+' 抽：6★×'+c6+' · 5★×'+c5+' · 4★×'+c4+' · 3★×'+c3;
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
function renderStats(){
  var b=bannerById(state.cur), st=state.pity[pityKey(b)]||{fails:0}, p6=Math.min(0.02+Math.max(0,st.fails-49)*0.02,1);
  var hist=state.history, c6=0,c5=0,c4=0,i;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6)c6++; else if(hist[i].rar===5)c5++; else if(hist[i].rar===4)c4++; }
  var rate6=hist.length?(c6/hist.length*100).toFixed(2)+'%':'—';
  var g=[];
  g.push(['距上次6★',st.fails+' 抽','red']);
  g.push(['下次6★概率',(p6*100).toFixed(1)+'%','gold']);
  g.push(['本服总抽数',hist.length,'']);
  g.push(['本次会话抽数',sessPulls,'']);
  g.push(['6★总数',c6,'orange']);
  g.push(['6★出率',rate6,'']);
  g.push(['5★总数',c5,'']);
  g.push(['4★总数',c4,'']);
  g.push(['已拥有干员',state.collection.length+' / '+totalOps(),'']);
  var today0=new Date(), dayStart=new Date(today0.getFullYear(),today0.getMonth(),today0.getDate()).getTime();
  var tToday=0,t6Today=0;
  for(i=0;i<hist.length;i++){ if(hist[i].t>=dayStart){ tToday++; if(hist[i].rar===6)t6Today++; } }
  g.push(['今日抽数',tToday,'']);
  g.push(['今日6★',t6Today,'orange']);
  var wk=Date.now()-7*86400000, w6=0;
  for(i=0;i<hist.length;i++){ if(hist[i].t>=wk&&hist[i].rar===6)w6++; }
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
var histF='all', histT='all', histTime='all', histN=60, histOp='';
function renderHistory(){
  var all=state.history;
  var nowH=new Date();
  var dayS=new Date(nowH.getFullYear(),nowH.getMonth(),nowH.getDate()).getTime();
  var weekS=dayS-7*86400000;
  var monthS=new Date(nowH.getFullYear(),nowH.getMonth(),1).getTime();
  var list=[];
  for(var i=0;i<all.length;i++){
    if(histF!=='all'&&String(all[i].rar)!==histF)continue;
    if(histT!=='all'&&(all[i].type||'event')!==histT)continue;
    if(histTime==='today'&&(!all[i].t||all[i].t<dayS))continue;
    if(histTime==='week'&&(!all[i].t||all[i].t<weekS))continue;
    if(histTime==='month'&&(!all[i].t||all[i].t<monthS))continue;
    if(histOp&&all[i].op!==histOp)continue;
    list.push(all[i]);
  }
  var show=list.slice(0,histN);
  var h=[],r,o;
  for(i=0;i<show.length;i++){
    r=show[i]; o=opOf(r.op);
    h.push('<div class="hitem r'+r.rar+'"><span class="star">'+stars(r.rar)+'</span><span class="hopname'+(histOp===r.op?' on':'')+'" data-op="'+esc(r.op)+'">'+esc(o?o.name:r.op)+'</span>'+(r.bid?'<span class="hbn jump" data-bid="'+esc(r.bid)+'">'+esc(r.bn||'')+'</span>':'')+'<span class="ht">'+relTime(r.t)+'</span></div>');
  }
  var fc6=0,fc5=0;
  for(var fi2=0;fi2<list.length;fi2++){ if(list[fi2].rar===6)fc6++; else if(list[fi2].rar===5)fc5++; }
  h.push('<div class="hitem" style="justify-content:center">');
  if(show.length<list.length)h.push('<button class="mini-btn" id="histMore">加载更多（'+list.length+'条，已显示'+show.length+'）</button>');
  else if(list.length)h.push('<span style="color:#5a6c8e">共 '+list.length+' 条记录（6★×'+fc6+' · 5★×'+fc5+'）</span>');
  else h.push('<span style="color:#5a6c8e">暂无记录，开始抽卡吧</span>');
  h.push('</div>');
  $('history').innerHTML=h.join('');
  var hm=$('histMore');
  if(hm)hm.onclick=function(){ histN+=60; renderHistory(); };
  var hc=$('history'); if(hc)hc.onclick=function(e){ var t=e.target; if(t&&t.classList){ if(t.classList.contains('hopname')){ histOp=(histOp===t.getAttribute('data-op'))?'':t.getAttribute('data-op'); histN=60; renderHistory(); } else if(t.classList.contains('jump')){ jumpBanner(t.getAttribute('data-bid')); } } };
}
var colF='all', colP='all', colSort='rarity', colSearch='';
var COL_SORT_CACHE=null, COL_SORT_KEY='';
function renderCollection(){
  var names;
  if(COL_SORT_KEY===colSort&&COL_SORT_CACHE){ names=COL_SORT_CACHE; }
  else{
    names=Object.keys(opByName).sort(function(a,b){
    if(colSort==='fav'){ var fa=state.favOps&&state.favOps[a]?1:0, fb=state.favOps&&state.favOps[b]?1:0; if(fa!==fb)return fb-fa; }
    if(colSort==='name')return a.localeCompare(b,'zh');
    if(colSort==='prof'){ var pa=(opByName[a]&&opByName[a].prof)||'', pb=(opByName[b]&&opByName[b].prof)||''; return pa.localeCompare(pb,'zh')||opByName[b].rarity-opByName[a].rarity; }
    return opByName[b].rarity-opByName[a].rarity||a.localeCompare(b,'zh');
  });
    COL_SORT_KEY=colSort; COL_SORT_CACHE=names;
  }
  var h=[],i,o;
  var colSet={}, csi;
  for(csi=0;csi<state.collection.length;csi++)colSet[state.collection[csi]]=1;
  for(i=0;i<names.length;i++){
    o=opOf(names[i]); if(!o)continue;
    var got=colSet[names[i]]?1:0;
    if(colF==='miss'&&got)continue;
    if(colF==='lim'&&!limitedOps[names[i]])continue;
    if(colF==='favop'&&!(state.favOps&&state.favOps[names[i]]))continue;
    if(colF==='wish'&&!(state.wish&&state.wish.indexOf(names[i])>=0))continue;
    if(colF!=='all'&&colF!=='miss'&&colF!=='lim'&&colF!=='favop'&&colF!=='wish'&&String(o.rarity)!==colF)continue;
    if(colP!=='all'&&o.prof!==colP)continue;
    if(colSearch&&o.name.indexOf(colSearch)<0)continue;
    var pul=(newPulse[names[i]]&&(Date.now()-newPulse[names[i]])<20000);
    var ocnt=(state.opCnt||{})[names[i]]||0;
    h.push('<div class="cop'+(got?'':' miss')+(pul?' new':'')+((state.wish&&state.wish.indexOf(names[i])>=0)?' wished':'')+'" data-op="'+esc(names[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/>'+(state.favOps&&state.favOps[names[i]]?'<div class="favstar">★</div>':'')+(state.wish&&state.wish.indexOf(names[i])>=0?'<div class="wishmark">💝</div>':'')+'<div class="cs">'+esc(o.name)+'</div>'+(ocnt>1?'<div class="cdup">×'+ocnt+'</div>':'')+'<div class="nb"></div></div>');
  }
  $('collection').innerHTML=h.join('');
  var cc=$('colCount'); if(cc)cc.textContent='已拥有 '+state.collection.length+' / '+totalOps()+' · 未拥有 '+(totalOps()-state.collection.length);
  var cc2=$('colRarity'); if(cc2){ var rk=[6,5,4,3], rh=['<div class="colrar">'], rn, rt, rgot;
    for(rn=0;rn<rk.length;rn++){ rt=rk[rn]; rgot=0; var rcnt=0; for(var rk2 in opByName){ if(opByName[rk2].rarity===rt){ rcnt++; if(colSet[rk2])rgot++; } } rh.push('<span class="cr">'+rt+'★<b>'+rgot+'/'+rcnt+'</b></span>'); }
    rh.push('</div>'); cc2.innerHTML=rh.join(''); }
  var cb=$('colBar'); if(cb)cb.innerHTML='<i style="width:'+(totalOps()?Math.round(state.collection.length/totalOps()*100):0)+'%"></i>';
  var colWrap=$('collection');
  if(colWrap&&!colWrap._delegated){ colWrap._delegated=true; colWrap.onclick=function(e){ var t=e.target; while(t&&t!==this){ if(t.classList&&t.classList.contains('cop')){ openModal(t.getAttribute('data-op')); return; } t=t.parentNode; } }; }
}
function openModal(opName){
  var o=opOf(opName); if(!o)return;
  var h=[];
  h.push('<button class="mini-btn" id="btnFavOp" style="margin-bottom:8px">'+(state.favOps&&state.favOps[opName]?'⭐ 已收藏':'☆ 收藏干员')+'</button><button class="mini-btn" id="btnSkins" style="margin-bottom:8px;margin-left:8px">🎨 皮肤</button><button class="mini-btn" id="btnWish" style="margin-bottom:8px;margin-left:8px">'+(state.wish&&state.wish.indexOf(opName)>=0?'💝 已心愿':'💝 心愿单')+'</button>');
  h.push('<div class="mhead"><div class="mart" style="cursor:zoom-in"><img loading="lazy" id="martImg" src="'+esc(opArtT(o))+'" data-a="'+esc(o.art||'')+'" data-b="'+esc(avUrl(o))+'" alt=""/></div><div class="minfo">');
  h.push('<h2>'+esc(o.name)+'</h2>');
  h.push('<div class="stars">'+stars(o.rarity)+'</div>');
  h.push('<div class="kv"><b>职业</b>'+esc(o.prof||'—')+'</div>');
  h.push('<div class="kv"><b>阵营</b>'+esc(o.nation||'—')+'</div>');
  h.push('<div class="kv"><b>标签</b>'+esc(o.tag||'—')+'</div>');
  h.push('<div class="kv"><b>获取</b>'+(state.collection.indexOf(opName)>=0?'已拥有':'未获得')+'</div>');
  h.push('<div class="kv"><b>已抽到</b>'+(state.opCnt&&state.opCnt[opName]?state.opCnt[opName]:0)+' 次</div>');
  var gotIdx=state.collection.indexOf(opName);
  if(gotIdx>=0)h.push('<div class="kv"><b>获得顺序</b>第 '+(gotIdx+1)+' 个</div>');
  var firstT=null;
  for(var fi=state.history.length-1;fi>=0;fi--){ if(state.history[fi].op===opName){ firstT=state.history[fi].t; break; } }
  if(firstT){ var fdt=new Date(firstT); h.push('<div class="kv"><b>首次获得</b>'+(fdt.getMonth()+1)+'月'+fdt.getDate()+'日</div>'); }
  var srcs=opBanners[opName];
  if(srcs&&srcs.length){
    var sl=[];
    for(var si=0;si<srcs.length;si++){ sl.push('<a class="srcLink" data-bid="'+srcs[si].id+'" data-full="'+esc(srcs[si].full)+'">'+esc(srcs[si].full)+'</a>'); }
    h.push('<div class="kv"><b>UP卡池</b>'+sl.join('、')+'<span style="color:var(--gold)">（共 '+srcs.length+' 次UP）</span></div>');
  } else { h.push('<div class="kv"><b>UP卡池</b>—</div>'); }
  h.push('</div></div>');
  h.push('<div class="mdesc">立绘来源于 bilibili Wiki 与 PRTS，仅供娱乐参考。<a href="'+esc(o.art||'#')+'" target="_blank" rel="noopener">查看高清原图</a></div>');
  $('mBody').innerHTML=h.join('');
  var mi=$('martImg'); if(mi)mi.onclick=function(){ openLightbox(o.art||opArtT(o)); };
  var bfo=$('btnFavOp'); if(bfo)bfo.onclick=function(){
    if(!state.favOps)state.favOps={};
    if(state.favOps[opName]){ delete state.favOps[opName]; bfo.textContent='☆ 收藏干员'; }
    else { state.favOps[opName]=true; bfo.textContent='⭐ 已收藏'; }
    save();
  };
  var bsk=$('btnSkins'); if(bsk)bsk.onclick=function(){ openSkins(opName); };
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
  openModalBox();
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
  sc.src=url+'&format=json&callback='+nm;
  document.body.appendChild(sc);
}
function openSkins(opName){
  var o=opOf(opName); if(!o)return;
  var name=o.name;
  var cache=skinCache[name];
  if(cache&&Date.now()-cache.t<600000){ renderSkins(name,cache.skins); return; }
  $('mBody').innerHTML='<div class="notice">正在加载 '+esc(name)+' 的皮肤…（需联网）</div>';
  openModalBox();
  jsonp(skinListUrl(name),function(data){
    var skins=[];
    if(data&&data.query&&data.query.allimages){
      for(var i=0;i<data.query.allimages.length;i++){
        var it=data.query.allimages[i];
        var m=it.name.match(/skin_(\d+)\.png$/);
        if(m&&parseInt(m[1],10)>=1){ skins.push({name:it.name,url:it.url,no:m[1]}); }
      }
    }
    skinCache[name]={t:Date.now(),skins:skins};
    renderSkins(name,skins);
  },12000);
}
function renderSkins(name,skins){
  var o=opOf(name), h=[];
  h.push('<button class="mini-btn" id="btnSkinsBack" style="margin-bottom:8px">← 返回干员详情</button>');
  h.push('<div class="mhead"><div class="minfo"><h2>'+esc(name)+' · 皮肤图鉴</h2><div class="kv"><b>皮肤数量</b>'+skins.length+'</div></div></div>');
  if(!skins.length){ h.push('<div class="notice">该干员暂无皮肤，或加载失败（需联网访问 bilibili Wiki）</div>'); }
  else {
    h.push('<div class="skingrid">');
    for(var i=0;i<skins.length;i++){
      var s=skins[i];
      h.push('<div class="skin-item" data-url="'+esc(s.url)+'"><img loading="lazy" src="'+esc(skinThumb(s,480))+'"/><div class="skin-nm">皮肤 '+s.no+'</div></div>');
    }
    h.push('</div><div class="notice">点击皮肤查看高清原图</div>');
  }
  $('mBody').innerHTML=h.join('');
  var bb=$('btnSkinsBack'); if(bb)bb.onclick=function(){ openModal(name); };
  var items=$('mBody').querySelectorAll('.skin-item');
  for(var j=0;j<items.length;j++){ (function(el){ el.onclick=function(){ openLightbox(el.getAttribute('data-url')); }; })(items[j]); }
  openModalBox();
}
function jumpBanner(id){
  state.cur=id; save(); closeModal();
  renderBannerList(); renderBannerInfo(); renderStats();
  if(isMobile())closeDrawer();
}
function copyBatch(){
  var res=lastBatch||[], NL=String.fromCharCode(10), cnt={}, i, nm;
  for(i=0;i<res.length;i++){ var oo=opOf(res[i].op); nm=oo?oo.name:res[i].op; cnt[nm]=(cnt[nm]||0)+1; }
  var names=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  var lines=[];
  for(i=0;i<names.length;i++){ lines.push(names[i]+' ×'+cnt[names[i]]); }
  var text='本次抽卡 '+res.length+' 抽：'+NL+lines.join(NL);
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
function closeLightbox(){ var lb=$('lightbox'); if(lb)lb.classList.remove('show'); }
function openModalBox(){ var md=$('modal'); if(md)md.classList.add('show'); if(isMobile()){ try{ document.body.style.overflow='hidden'; }catch(e){} } }
function closeModalBox(){ var md=$('modal'); if(md)md.classList.remove('show'); if(isMobile()){ try{ document.body.style.overflow=''; }catch(e){} } }
function closeModal(){ closeModalBox(); }
function isMobile(){ return (typeof window!=='undefined')&&!!window.innerWidth&&window.innerWidth<=720; }
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
  var newNames=[], wishHit=[], i2, nx2;
  for(i2=0;i2<results.length;i2++){ nx2=results[i2]; if(!hadSet[nx2.op]&&state.collection.indexOf(nx2.op)>=0)newNames.push(opOf(nx2.op).name); if(state.wish&&state.wish.indexOf(nx2.op)>=0)wishHit.push(opOf(nx2.op).name); }
  if(newNames.length)msg+='<br/><span class="newline">🆕 新干员：'+newNames.join('、')+'</span>';
  if(wishHit.length){ msg+='<br/><span class="wishhit">💝 心愿达成：'+wishHit.join('、')+'</span>'; state.wish=state.wish.filter(function(w){return wishHit.indexOf(opOf(w)?opOf(w).name:w)<0;}); save(); }
  return msg;
}
function doUntil6(){
  if(BUSY)return;
  var achBefore=achDoneSet();
  var b=bannerById(state.cur); if(!b)return;
  var results=[];
  var hadSet={}, hi4;
  for(hi4=0;hi4<state.collection.length;hi4++)hadSet[state.collection[hi4]]=1;
  while(results.length<120){
    var r=pullOne(b);
    results.push(r);
    if(isNew(r.op))addCol(r.op);
    state.history.unshift({op:r.op,rar:r.rar,t:Date.now(),type:b.type,bn:b.full,bid:b.id});
    if(r.rar===6)break;
  }
  if(state.history.length>2000)state.history.length=2000;
  sessPulls+=results.length;
  save();
  BUSY=true;
  setBusyUI(true);
  var total=results.length;
  var names6=results.filter(function(x){return x.rar===6;}).map(function(x){return opOf(x.op).name;});
  var msg=names6.length?('连抽 <b>'+total+'</b> 抽出货：'+names6.join('、')):('连抽 '+total+' 抽未出货（已达120抽上限）');
  msg=enhancePullMsg(results,hadSet,msg);
  var shown=results.slice(-12);
  lastBatch=results;
  renderCards(shown,msg,names6.length>0,names6,false);
  setTimeout(function(){ BUSY=false; setBusyUI(false); }, 100+shown.length*SPEED+600);
  renderStats(); renderHistory(); renderCollection(); renderBannerInfo();
  checkNewAch(achBefore);
  setFortune();
}
function openPoolModal(){
  var b=bannerById(state.cur); if(!b)return;
  var pool=getPool(b);
  var h=['<h4 class="sect" style="margin-top:0">'+esc(b.full)+' 完整卡池</h4>'];
  var i,o;
  h.push('<div class="notice">6★干员（'+pool.p6.length+'）</div><div class="rateup">');
  for(i=0;i<pool.p6.length;i++){
    o=opOf(pool.p6[i]); if(!o)continue;
    h.push('<div class="rup-card r6" data-op="'+esc(pool.p6[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="rn">'+esc(o.name)+'</div><div class="rb">6★</div><div class="rr">'+stars(6)+'</div></div>');
  }
  h.push('</div><div class="notice">5★干员（'+pool.p5.length+'）</div><div class="rateup">');
  for(i=0;i<pool.p5.length;i++){
    o=opOf(pool.p5[i]); if(!o)continue;
    h.push('<div class="rup-card r5" data-op="'+esc(pool.p5[i])+'"><img loading="lazy" src="'+esc(avUrl(o))+'" alt=""/><div class="rn">'+esc(o.name)+'</div><div class="rb">5★</div><div class="rr">'+stars(5)+'</div></div>');
  }
  h.push('</div>');
  $('mBody').innerHTML=h.join('');
  openModalBox();
  var cards=$('mBody').querySelectorAll('.rup-card');
  for(i=0;i<cards.length;i++){ cards[i].onclick=function(){ openModal(this.getAttribute('data-op')); }; }
}
var galF='all', galV=2;
var GAL_ART_CACHE={};
function galArt(o){ if(!o||!o.name)return ''; var ck=o.name+':'+galV; if(GAL_ART_CACHE[ck])return GAL_ART_CACHE[ck]; return GAL_ART_CACHE[ck]=thumbOf(o.art,o.name,'skin 0 '+(galV===0?0:2)+'.png',480)||o.art||avUrl(o); }
function openGallery(){
  var h=['<h4 class="sect" style="margin-top:0">立绘画廊</h4><div class="filters" id="galChips"></div><div class="galbar"><button class="mini-btn" id="galV2"'+(galV===2?' style="border-color:var(--acc)"':'')+'>精二立绘</button><button class="mini-btn" id="galV0"'+(galV===0?' style="border-color:var(--acc)"':'')+'>初始立绘</button></div><div class="gallery" id="galGrid"></div>'];
  $('mBody').innerHTML=h.join('');
  setChips($('galChips'),[['all','全部'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],galF,function(){ galF=$('galChips')._v; renderGallery(); });
  var gv2=$('galV2'); if(gv2)gv2.onclick=function(){ galV=2; openGallery(); };
  var gv0=$('galV0'); if(gv0)gv0.onclick=function(){ galV=0; openGallery(); };
  renderGallery();
  openModalBox();
}
var GAL_N=120;
function renderGallery(){
  var names=Object.keys(opByName).sort(function(a,b){return opByName[b].rarity-opByName[a].rarity||a.localeCompare(b,'zh');});
  var h=[],i,o;
  var shown=0;
  for(i=0;i<names.length;i++){
    o=opByName[names[i]];
    if(galF!=='all'&&String(o.rarity)!==galF)continue;
    if(shown>=GAL_N)break;
    shown++;
    h.push('<div class="gal-item r'+o.rarity+'" data-op="'+esc(names[i])+'"><img loading="lazy" src="'+esc(galArt(o))+'" alt=""/><div class="gal-nm">'+esc(o.name)+'</div><div class="gal-st">'+stars(o.rarity)+'</div></div>');
  }
  var totalMatch=0;
  for(var gi2=0;gi2<names.length;gi2++){ if(galF==='all'||String(opByName[names[gi2]].rarity)===galF)totalMatch++; }
  if(totalMatch>shown)h.push('<button class="mini-btn" id="galMore" style="margin:8px auto;display:block">加载更多（'+(totalMatch-shown)+'）</button>');
  if(!h.length)h.push('<div class="notice">暂无符合条件的干员</div>');
  $('galGrid').innerHTML=h.join('');
  var items=$('galGrid').querySelectorAll('.gal-item');
  for(i=0;i<items.length;i++){ items[i].onclick=function(){ openModal(this.getAttribute('data-op')); }; }
  var gm=$('galMore'); if(gm)gm.onclick=function(){ GAL_N+=120; renderGallery(); };
}
function calcAch(){
  var hist=state.history, i, last6=-1, maxG=0;
  var first=hist.length>0, first6=false, double6=false, extreme=false, bigDrought=false, early6=false;
  for(i=0;i<hist.length;i++){
    if(hist[i].rar===6){
      first6=true;
      var cnt=0, j;
      for(j=i;j<hist.length&&j<i+10;j++){ if(hist[j].rar===6)cnt++; }
      if(cnt>=2)double6=true;
      if(last6>=0){ var g=i-last6-1; if(g>maxG)maxG=g; if(g>=90)extreme=true; }
      last6=i;
    }
  }
  var tail=hist.slice(Math.max(0,hist.length-10));
  for(i=0;i<tail.length;i++){ if(tail[i].rar===6)early6=true; }
  if(maxG>=70)bigDrought=true;
  var limCol=0, lk2;
  for(lk2 in limitedOps){ if(state.collection.indexOf(lk2)>=0)limCol++; }
  var totalOpsN=Object.keys(opByName).length;
  return { list:[
    {name:'初来乍到',desc:'完成第一次抽卡',icon:'🌱',done:first,prog:''},
    {name:'初见六星',desc:'抽到第一只六星干员',icon:'⭐',done:first6,prog:''},
    {name:'十连双黄',desc:'10抽内出2只以上六星',icon:'🌈',done:double6,prog:''},
    {name:'极限保底',desc:'90抽以上才出六星',icon:'⏳',done:extreme,prog:''},
    {name:'非酋之王',desc:'最长非酋纪录≥70抽',icon:'☔',done:bigDrought,prog:''},
    {name:'欧皇降临',desc:'最早10抽内出六星',icon:'✨',done:early6,prog:''},
    {name:'图鉴收藏家',desc:'已拥有干员≥200',icon:'📚',done:state.collection.length>=200,prog:state.collection.length+' / 200'},
    {name:'千抽达人',desc:'总抽数≥1000',icon:'🎰',done:hist.length>=1000,prog:hist.length+' / 1000'},
    {name:'限定收藏家',desc:'集齐所有限定干员（'+limitedTotal+'）',icon:'👑',done:limCol>=limitedTotal&&limitedTotal>0,prog:limCol+' / '+limitedTotal},
    {name:'全图鉴',desc:'拥有全部干员（'+totalOpsN+'）',icon:'🏅',done:state.collection.length>=totalOpsN,prog:state.collection.length+' / '+totalOpsN}
  ]};
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
  var r=calcAch(), h=['<h4 class="sect" style="margin-top:0">成就系统（'+achCount()+' / '+r.list.length+'）</h4><button class="mini-btn" id="btnCopyAch">复制成就状态</button><div class="achgrid">'], i;
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
  var txt=['【明日方舟干员寻访模拟器 · 规则说明】','','★ 出率（按官方规则模拟）','6★：2%（51抽起每抽+2%，100抽必出）','5★：8%（每次十连内必出5★以上）','4★：50% · 3★：40%','','★ 保底','· 常驻标准寻访之间保底共享；中坚寻访之间共享','· 限定/活动/联合行动/定向甄选各自独立','','★ UP 概率','· 单UP池：当期6★占6★出率的50%','· 双UP池（限定/标准轮换）：各占35%','· 定向甄选：只含选中的干员，等概率','· 中坚甄选：选2位各占35%','· 联合行动/跨年欢庆：池内等概率','','★ 限定寻访','· 每抽获得1张寻访数据契约','· 300契约可兑换限定干员，200契约兑换当期非限定6★','· 跨年欢庆池首次6★必为未拥有干员','','★ 其他','· 快捷键：1 单抽 · 2 十连 · 3 抽到6★','· 存档保存在浏览器本地，可导出/导入','· 干员立绘/头像为在线加载，需联网'].join(NL);
  var h=['<h4 class="sect" style="margin-top:0">规则说明</h4><pre class="rules">'+esc(txt)+'</pre>'];
  $('mBody').innerHTML=h.join('');
  openModalBox();
}
function openStats(){
  var hist=state.history, i, r;
  var c6=0,c5=0,c4=0,c3=0, typeCnt={}, type6={};
  for(i=0;i<hist.length;i++){ r=hist[i]; if(r.rar===6)c6++; else if(r.rar===5)c5++; else if(r.rar===4)c4++; else c3++; var t=r.type||'event'; typeCnt[t]=(typeCnt[t]||0)+1; if(r.rar===6)type6[t]=(type6[t]||0)+1; }
  var total=hist.length;
  var gaps=[], last=-1;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6){ if(last>=0)gaps.push(i-last-1); last=i; } }
  var maxG=0,minG=999,sumG=0;
  for(i=0;i<gaps.length;i++){ if(gaps[i]>maxG)maxG=gaps[i]; if(gaps[i]<minG)minG=gaps[i]; sumG+=gaps[i]; }
  var avgG=gaps.length?(sumG/gaps.length).toFixed(1):'—';
  var buckets=[0,0,0,0,0,0,0,0,0,0], bi, bmax=1;
  for(i=0;i<gaps.length;i++){ bi=Math.min(9,Math.floor(gaps[i]/10)); buckets[bi]++; if(buckets[bi]>bmax)bmax=buckets[bi]; }
  var exp6=total*0.0289;
  var score=exp6>0?Math.round(c6/exp6*100):100;
  var label=score>=150?'欧皇转世 ✨':score>=110?'运气爆棚':score>=85?'正常水平':score>=60?'有点非了':'非洲酋长 ☔';
  var TCN={limited:'限定',event:'活动',standard:'标准',zhongjian:'中坚',joint:'联合行动',direct:'定向甄选',zjselect:'中坚甄选',special:'特殊'};
  var h=[];
  h.push('<h4 class="sect" style="margin-top:0">总览</h4><div class="stats-grid">');
  h.push('<div class="stat"><div class="v orange">'+total+'</div><div class="k">总抽数</div></div>');
  h.push('<div class="stat"><div class="v red">'+c6+'</div><div class="k">6★（'+(total?(c6/total*100).toFixed(2):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v gold">'+c5+'</div><div class="k">5★（'+(total?(c5/total*100).toFixed(2):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v">'+c4+'</div><div class="k">4★（'+(total?(c4/total*100).toFixed(2):0)+'%）</div></div>');
  h.push('<div class="stat"><div class="v">'+c3+'</div><div class="k">3★（'+(total?(c3/total*100).toFixed(2):0)+'%）</div></div>');
  var badge=score>=150?'👑':score>=110?'🔥':score>=85?'⭐':score>=60?'🌧️':'☔';
  h.push('<div class="stat"><div class="v gold">'+score+'</div><div class="k">欧气评分：'+label+' '+badge+'</div></div>');
  h.push('<div class="stat"><div class="v" style="color:var(--acc2)">'+(total*600).toLocaleString()+'</div><div class="k">等价合成玉（600/抽）</div></div>');
  var limGotN=0, lk3;
  for(lk3 in limitedOps){ if(state.collection.indexOf(lk3)>=0)limGotN++; }
  h.push('<div class="stat"><div class="v" style="color:#ff6ec7">'+limGotN+'/'+limitedTotal+'</div><div class="k">限定图鉴完成度</div><div class="statbar"><i style="width:'+(limitedTotal?Math.round(limGotN/limitedTotal*100):0)+'%"></i></div></div>');
  h.push('</div>');
  h.push('<div class="notice">欧气评分 = 实际6★数 ÷ 期望6★数 × 100（期望按保底机制约每 34.6 抽一只）</div>');
  h.push('<h4 class="sect">六星间隔分布（相邻六星之间抽数）</h4><div class="chart">');
  for(i=0;i<10;i++){ h.push('<div class="crow"><span class="cl">'+(i*10)+'-'+(i*10+9)+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(buckets[i]/bmax*100))+'%"></i></div><span class="cv">'+buckets[i]+'</span></div>'); }
  h.push('</div>');
  var avgN2=gaps.length?sumG/gaps.length:0;
  var verdict=avgN2===0?'暂无':(avgN2<34.6?'偏欧':(avgN2>34.6?'偏非':'标准'));
  h.push('<div class="notice">最短 '+minG+' 抽 · 最长 '+maxG+' 抽 · 平均 '+avgG+' 抽（期望 34.6 抽 · '+verdict+'）</div>');
  h.push('<h4 class="sect">欧气走势（每100抽一段，从上到下由旧到新）</h4><div class="chart">');
  var segCount=Math.ceil(hist.length/100), segArr=[];
  for(i=0;i<segCount;i++)segArr.push(0);
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6)segArr[Math.floor(i/100)]++; }
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
  var dayMap={};
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6&&hist[i].t){ var dtx=new Date(hist[i].t); var keyx=(dtx.getMonth()+1)+'/'+dtx.getDate(); dayMap[keyx]=(dayMap[keyx]||0)+1; } }
  var days=[];
  for(var di=13;di>=0;di--){ var dv=new Date(Date.now()-di*86400000); days.push({key:(dv.getMonth()+1)+'/'+dv.getDate(),c:0}); }
  for(var di2=0;di2<days.length;di2++){ days[di2].c=dayMap[days[di2].key]||0; }
  var dmax=1;
  for(di2=0;di2<days.length;di2++){ if(days[di2].c>dmax)dmax=days[di2].c; }
  for(di2=0;di2<days.length;di2++){ h.push('<div class="crow"><span class="cl">'+days[di2].key+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(days[di2].c/dmax*100))+'%"></i></div><span class="cv">'+days[di2].c+'</span></div>'); }
  if(!hist.length)h.push('<div class="notice">暂无抽卡数据</div>');
  h.push('</div>');
  h.push('<h4 class="sect">近30天出货热力图</h4><div class="heat">');
  var heat={}, hkk, maxH=1, hd2, cv2;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6&&hist[i].t){ var hdv=new Date(hist[i].t); var hk3=hdv.getFullYear()+'-'+(hdv.getMonth()+1)+'-'+hdv.getDate(); heat[hk3]=(heat[hk3]||0)+1; } }
  for(hkk in heat){ if(heat[hkk]>maxH)maxH=heat[hkk]; }
  for(hd2=29;hd2>=0;hd2--){ var dd=new Date(Date.now()-hd2*86400000); var key2=dd.getFullYear()+'-'+(dd.getMonth()+1)+'-'+dd.getDate(); cv2=heat[key2]||0; var lvl=cv2===0?0:(cv2/maxH>=0.66?3:(cv2/maxH>=0.33?2:1)); h.push('<div class="hcell l'+lvl+'" title="'+key2+'：'+cv2+'只6★"></div>'); }
  h.push('</div>');
  h.push('<div class="notice">颜色越深当日出货越多 · '+(maxH>1?'最多一日 '+maxH+' 只':'暂无出货记录')+'</div>');
  h.push('<h4 class="sect">出货时段（6★按小时分布）</h4><div class="chart">');
  var hourMap={}, hmax=1, hk, hv;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6&&hist[i].t){ var hx=new Date(hist[i].t).getHours(); hourMap[hx]=(hourMap[hx]||0)+1; } }
  for(hk=0;hk<24;hk++){ hv=hourMap[hk]||0; if(hv>hmax)hmax=hv; }
  for(hk=0;hk<24;hk++){ hv=hourMap[hk]||0; h.push('<div class="crow"><span class="cl">'+hk+'时</span><div class="cbar"><i style="width:'+Math.max(1,Math.round(hv/hmax*100))+'%"></i></div><span class="cv'+(hv===hmax&&hv>0?' luck-hi':'')+'">'+hv+'</span></div>'); }
  h.push('</div>');
  h.push('<h4 class="sect">保底总览</h4><div class="chart">');
  var pkArr=[];
  for(var pk2 in state.pity){ var pv=state.pity[pk2]; if(pv&&typeof pv==='object'&&typeof pv.fails==='number')pkArr.push({k:pk2,f:pv.fails}); }
  pkArr.sort(function(a,b){return b.f-a.f;});
  var PKCN={std:'常驻标准',zj:'中坚寻访'};
  for(i=0;i<Math.min(10,pkArr.length);i++){
    var pk=pkArr[i];
    var pb=bannerById(pk.k);
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
  for(i=0;i<tkeys.length;i++){ var t2=tkeys[i]; var rate6=typeCnt[t2]?((type6[t2]||0)/typeCnt[t2]*100).toFixed(1)+'%':'0%'; h.push('<div class="crow"><span class="cl">'+(TCN[t2]||t2)+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(typeCnt[t2]/total*100))+'%"></i></div><span class="cv">'+typeCnt[t2]+'抽 · 6★率 '+rate6+'</span></div>'); }
  h.push('</div>');
  h.push('<h4 class="sect">每月统计</h4><div class="chart">');
  var monMap={}, mmkey, mmv;
  for(i=0;i<hist.length;i++){ if(!hist[i].t)continue; var mdt=new Date(hist[i].t); var mk2=mdt.getFullYear()+'-'+(mdt.getMonth()+1); if(!monMap[mk2])monMap[mk2]={n:0,s6:0}; monMap[mk2].n++; if(hist[i].rar===6)monMap[mk2].s6++; }
  var mkeys=Object.keys(monMap).sort();
  var mmax=1;
  for(mmkey in monMap){ if(monMap[mmkey].n>mmax)mmax=monMap[mmkey].n; }
  for(i=0;i<mkeys.length;i++){ mmv=monMap[mkeys[i]]; h.push('<div class="crow"><span class="cl">'+mkeys[i]+'</span><div class="cbar"><i style="width:'+Math.max(2,Math.round(mmv.n/mmax*100))+'%"></i></div><span class="cv'+(mmv.s6?' luck-hi':'')+'">'+mmv.n+'抽'+(mmv.s6?' · <b style="color:var(--gold)">6★×'+mmv.s6+'</b>':'')+'</span></div>'); }
  if(!mkeys.length)h.push('<div class="notice">暂无数据</div>');
  h.push('</div>');
  h.push('<h4 class="sect">UP命中率（6★出货中当期UP占比）</h4><div class="chart">');
  var upHit=0, upTot=0, upRows={};
  for(i=0;i<hist.length;i++){
    var hr=hist[i]; if(hr.rar!==6)continue;
    if(hr.type==='standard'||hr.type==='zhongjian'||hr.type==='joint')continue;
    var hbb=hr.bid?bannerById(hr.bid):(hr.bn?bannerByFull(hr.bn):null);
    if(!hbb||hbb.type==='standard'||hbb.type==='zhongjian')continue;
    upTot++;
    var isUp=hbb.six.indexOf(hr.op)>=0;
    if(isUp)upHit++;
    var ukey=(hbb.full||'').slice(0,10);
    if(!upRows[ukey])upRows[ukey]={hit:0,tot:0,full:hbb.full};
    upRows[ukey].tot++; if(isUp)upRows[ukey].hit++;
  }
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
  var exp6=total*0.0289;
  var score=exp6>0?Math.round(c6/exp6*100):100;
  var gaps=[], last=-1, maxG=0;
  for(i=0;i<hist.length;i++){ if(hist[i].rar===6){ if(last>=0)gaps.push(i-last-1); last=i; } }
  for(i=0;i<gaps.length;i++){ if(gaps[i]>maxG)maxG=gaps[i]; }
  var curFails=(state.pity[pityKey(bannerById(state.cur))]||{fails:0}).fails;
  var s6=hist.filter(function(x){return x.rar===6;}).slice(0,5).map(function(x){var o=opOf(x.op);return o?o.name:x.op;});
  var topOp='', topN=0;
  for(var k2 in (state.opCnt||{})){ if(state.opCnt[k2]>topN){ topN=state.opCnt[k2]; topOp=k2; } }
  var topName=topOp?(opOf(topOp)?opOf(topOp).name:topOp):'';
  var NL=String.fromCharCode(10);
  var text=['【明日方舟干员寻访模拟 · 抽卡总结】','总抽数：'+total+' 抽（6★×'+c6+' · 5★×'+c5+' · 4★×'+c4+' · 3★×'+c3+'）','6★出率：'+(total?(c6/total*100).toFixed(2):0)+'% · 欧气评分：'+score,'最长非酋纪录：'+(maxG||0)+' 抽 · 当前保底：'+curFails+' 抽','最近六星：'+(s6.join('、')||'暂无'),'出货最多：'+(topName||'暂无')+(topN?(' ×'+topN):'')].join(NL);
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
  var ta=document.createElement('textarea');
  ta.value=s; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('存档已复制到剪贴板'); }
  catch(e){ window.prompt('复制以下存档内容：', s); }
  ta.remove();
}
function importSave(){
  var s=window.prompt('粘贴存档JSON（从导出功能获得）：');
  if(!s)return;
  try{
    var ns=JSON.parse(s);
    if(ns&&typeof ns==='object'&&ns.jade!=null&&ns.history&&ns.collection){ state=normalizeState(ns); save(); location.reload(); }
    else toast('存档格式无效');
  }catch(e){ toast('存档格式无效'); }
}
function toggleSound(){ SOUND=!SOUND; try{ localStorage.setItem('akgacha_snd',SOUND?'1':'0'); }catch(e){} var b=$('btnSound'); if(b){ b.textContent=SOUND?'音效: 开':'音效: 关'; b.classList.toggle('on',SOUND); } }
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
function renderOpStatsTable(){
  if(!OP_NAMES)OP_NAMES=Object.keys(opByName);
  var names=OP_NAMES, i, o, cnt, list=[], maxN=1;
  var total=0, had=0;
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
  $('opSum').innerHTML='统计范围：全部抽卡记录（含历史）· 共出 <b>'+total+'</b> 次 · 出过 <b>'+had+'</b> 名干员';
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
function exportHistory(){
  var NL=String.fromCharCode(10);
  var lines=['干员,稀有度,时间,卡池,卡池类型,距上次6★(抽)'];
  var last6i=-1;
  for(var i=0;i<state.history.length;i++){ var r=state.history[i], o=opOf(r.op), dt=new Date(r.t||Date.now()); var gapTxt='';
    if(r.rar===6){ gapTxt=last6i>=0?String(i-last6i-1):'首个6★'; last6i=i; }
    lines.push(csvEsc(o?o.name:r.op)+','+r.rar+'星,'+dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+' '+dt.getHours()+':'+(dt.getMinutes()<10?'0':'')+dt.getMinutes()+','+csvEsc(r.bn||'')+','+(r.type||'event')+','+gapTxt); }
  var text=String.fromCharCode(0xFEFF)+lines.join(NL);
  try{
    if(typeof Blob==='undefined')throw new Error('no blob');
    var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='抽卡记录_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(a.href); }catch(e){} a.remove(); },1000);
    toast('抽卡记录已导出（共 '+state.history.length+' 条）');
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
function init(){
  var bs=DATA.banners, i;
  if(!state.cur||!bannerById(state.cur))state.cur=bs[0].id;
  if(!state.history.length&&!state.collection.length){ setTimeout(function(){ toast('👋 欢迎！选择卡池后点击抽卡开始 · 快捷键 1/2/3 · ←/→ 切换卡池'); }, 800); }
  initFilters();
  renderBannerList();
  renderBannerInfo();
  renderStats();
  renderHistory();
  renderCollection();
  setFortune();
  wire('btn1',function(){ doPull(1); });
  wire('btn10',function(){ doPull(10); });
  wire('btnUntil6',function(){ doUntil6(); });
  wire('btnCustom',function(){ var v=parseInt($('customN').value,10); if(!v||isNaN(v))v=50; doPull(Math.min(500,Math.max(1,v))); });
  wire('btn50',function(){ doPull(50); });
  wire('btn100',function(){ doPull(100); });
  wire('btn200',function(){ doPull(200); });
  wire('btnStats',openStats);
  wire('btnOpStats',openOpStats);
  wire('btnCopyStats',copyStats);
  wire('btnRules',openRules);
  wire('btnGallery',openGallery);
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
  wire('btnExport',exportSave);
  wire('btnImport',importSave);
  wire('btnReset',resetAll);
  wire('btnReset2',clearHistory);
  var sb=$('searchBox'); var sbDl=null;
  if(sb)sb.oninput=function(){ clearTimeout(sbDl); var v=this.value; sbDl=setTimeout(function(){ renderBannerList(); },200); };
  wire('mClose',closeModal);
  wire('lightbox',closeLightbox);
  var md=$('modal'); if(md)md.onclick=function(e){ if(e.target===this)closeModal(); };
  document.addEventListener('keydown',function(e){
    if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'))return;
    if(e.key==='1')doPull(1);
    else if(e.key==='2')doPull(10);
    else if(e.key==='3')doUntil6();
    else if(e.key==='ArrowLeft')navBanner(-1);
    else if(e.key==='ArrowRight')navBanner(1);
    else if(e.key==='f'||e.key==='F'){ var cb=bannerById(state.cur); if(cb){ if(state.fav[cb.id])delete state.fav[cb.id]; else state.fav[cb.id]=true; save(); renderBannerList(); toast(state.fav[cb.id]?'⭐ 已收藏当前卡池':'已取消收藏'); } }
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
  setChips($('histChips'),[['all','全部'],['6','6★'],['5','5★'],['4','4★'],['3','3★']],'all',function(){
    histF=$('histChips')._v; histN=60; renderHistory();
  });
  setChips($('histTypeChips'),[['all','池:全部'],['limited','限定'],['event','活动'],['standard','标准'],['zhongjian','中坚'],['joint','联合行动'],['direct','定向甄选'],['zjselect','中坚甄选'],['special','特殊']],'all',function(){
    histT=$('histTypeChips')._v; histN=60; renderHistory();
  });
  setChips($('histTimeChips'),[['all','时间:全部'],['today','今天'],['week','本周'],['month','本月']],'all',function(){
    histTime=$('histTimeChips')._v; histN=60; renderHistory();
  });
}
init();
