'use strict';
// 明日方舟抽卡记录自动获取后端（本地服务）
// 用法: node server/index.js [端口]   默认端口 8723
// 依赖: 无（纯 Node）
// 说明：鹰角官方接口为社区逆向公开，端点/签名可能随游戏版本变动；若失效请更新常量与 sign。
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const PORT = parseInt(process.argv[2] || '8723', 10);
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const AK_AUTH = 'https://ak-api.hypergryph.com';
const AK_API = 'https://ak.hypergryph.com';
const AK_GACHA = 'https://ak-gacha-log.hypergryph.com';
function reqJson(url, method, headers, body){
  return new Promise(function(resolve, reject){
    var u;
    try{ u = new URL(url); }catch(e){ return reject(new Error('URL 错误: ' + url)); }
    var payload = body ? Buffer.from(JSON.stringify(body)) : null;
    var req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: method || 'GET',
      headers: Object.assign({ 'User-Agent': UA, 'Content-Type': 'application/json', 'Accept': 'application/json' }, headers || {}, payload ? { 'Content-Length': payload.length } : {}),
    }, function(res){
      var d = '';
      res.on('data', function(c){ d += c; });
      res.on('end', function(){ var json=null; try{ json = JSON.parse(d); }catch(e){} resolve({ status: res.statusCode, json: json, raw: d }); });
    });
    req.on('error', function(e){ reject(new Error('网络错误: ' + e.message)); });
    req.setTimeout(15000, function(){ req.destroy(); reject(new Error('请求超时')); });
    if (payload) req.write(payload);
    req.end();
  });
}
async function login(phone, password){
  var r = await reqJson(AK_AUTH + '/user/auth/v1/token_by_phone_password', 'POST', {}, { phone: phone, password: password, platform: 0 });
  if (r.status !== 200 || !r.json || !r.json.result){
    var code = r.json && r.json.code;
    if (code === 10001) throw new Error('风控/验证码：请先在游戏内完成验证再试');
    throw new Error('登录失败（HTTP ' + r.status + '）' + (r.json && r.json.msg ? '：' + r.json.msg : ''));
  }
  var res = r.json.result;
  return { token: res.token, tokenType: res.tokenType || '', userId: res.userId || '' };
}
async function grant(token){
  var r = await reqJson(AK_API + '/user/api/v2/user/grant', 'POST', { Authorization: token }, { gameId: 0, platform: 0 });
  if (r.status !== 200 || !r.json) throw new Error('凭证获取失败（HTTP ' + r.status + '）');
  var data = r.json.data || {};
  if (!data.cred) throw new Error('凭证为空：' + (r.raw || '').slice(0, 200));
  return { cred: data.cred, uid: data.uid || data.userId || '', platform: data.platform != null ? data.platform : 1 };
}
function gachaSign(secret, page, ts, token){
  return crypto.createHash('md5').update(secret + 'page=' + page + '&token=' + token + '&ts=' + ts).digest('hex');
}
async function gachaQuery(cred, platform, page){
  var ts = Math.floor(Date.now() / 1000);
  var secret = '';
  var sign = secret ? gachaSign(secret, page, ts, cred) : '';
  var body = { deviceId: 'sim-' + crypto.randomBytes(8).toString('hex'), platform: platform, page: page, token: cred, ts: ts };
  if (sign) body.sign = sign;
  var r = await reqJson(AK_GACHA + '/api/gacha/query', 'POST', { Authorization: cred }, body);
  if (r.status !== 200 || !r.json) throw new Error('抽卡记录请求失败（HTTP ' + r.status + '）：' + (r.raw || '').slice(0, 200));
  if (r.json.code && r.json.code !== 0 && !r.json.data) throw new Error('接口返回错误 code=' + r.json.code + '（可能接口已变动或凭证失效）');
  return r.json.data || r.json;
}
function json(res, code, obj){
  var body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' });
  res.end(body);
}
var server = http.createServer(async function(req, res){
  if (req.method === 'OPTIONS'){ res.writeHead(204); return res.end(); }
  var raw = '';
  req.on('data', function(c){ raw += c; });
  req.on('end', async function(){
    try{
      var url = req.url || '/';
      var body = {};
      if (raw){ try{ body = JSON.parse(raw); }catch(e){ return json(res, 400, { ok: false, error: '请求体不是合法 JSON' }); } }
      if (url === '/api/ping') return json(res, 200, { ok: true, name: 'ak-gacha-backend', port: PORT });
      if (url === '/api/login'){
        if (!body.phone || !body.password) return json(res, 400, { ok: false, error: '缺少 phone/password' });
        var t = await login(String(body.phone), String(body.password));
        return json(res, 200, { ok: true, token: t.token, tokenType: t.tokenType, userId: t.userId });
      }
      if (url === '/api/grant'){
        if (!body.token) return json(res, 400, { ok: false, error: '缺少 token' });
        var g = await grant(String(body.token));
        return json(res, 200, { ok: true, cred: g.cred, uid: g.uid, platform: g.platform });
      }
      if (url === '/api/gacha'){
        if (!body.cred) return json(res, 400, { ok: false, error: '缺少 cred（凭证）' });
        var platform = body.platform != null ? parseInt(body.platform, 10) : 1;
        var all = [];
        var page = body.page ? parseInt(body.page, 10) : 1;
        var maxPages = body.maxPages ? parseInt(body.maxPages, 10) : 20;
        var guard = 0;
        while (page <= maxPages && guard < 50){
          guard++;
          var data = await gachaQuery(String(body.cred), platform, page);
          var list = (data && (data.list || data.records || data.gacha)) || [];
          for (var i = 0; i < list.length; i++) all.push(list[i]);
          var hasMore = data && (data.hasMore === true || data.hasMore === 1);
          if (!hasMore || !list.length) break;
          page++;
        }
        return json(res, 200, { ok: true, total: all.length, pages: page, records: all });
      }
      if (url === '/api/skland'){
        if (!body.token) return json(res, 400, { ok: false, error: '缺少 token（森空岛凭证）' });
        const token = String(body.token).trim();
        let player = {};
        let records = [];
        try {
          const info = await reqJson(AK_API + '/api/player/info/v1', 'GET', { cred: token }, null);
          player = (info.json && (info.json.data || info.json)) || {};
        } catch (e) { /* 信息接口可能变动 */ }
        try {
          const g = await gachaQuery(token, 1, 1);
          const list = (g && (g.list || g.records || g.gacha)) || [];
          for (const it of list) records.push(it);
        } catch (e) { /* 抽卡接口可能变动，仅返回账号信息 */ }
        return json(res, 200, { ok: true, player: player, total: records.length, records: records });
      }
      if (url === '/'){
        return json(res, 200, { ok: true, endpoints: ['/api/ping', '/api/login', '/api/grant', '/api/gacha', '/api/skland'], note: 'POST JSON 调用，见 README' });
      }
      json(res, 404, { ok: false, error: '未找到接口: ' + url });
    }catch(e){
      json(res, 500, { ok: false, error: e.message });
    }
  });
});
server.listen(PORT, function(){
  console.log('AK 抽卡记录后端已启动: http://127.0.0.1:' + PORT);
  console.log('接口: /api/login(账号登录) /api/grant(获取凭证) /api/gacha(拉取记录)');
});