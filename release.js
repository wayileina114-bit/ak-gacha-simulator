'use strict';
// 用法: node release.js v6.6
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const TOKEN = process.env.GH_TOKEN || '';
const VER = process.argv[2] || 'v6.6';
const ZIP = 'akgacha_' + VER + '.zip';
const GIT = 'C:/Users/36087/Downloads/抽卡/PortableGit/bin/git.exe';
const DIR = 'C:/Users/36087/Downloads/抽卡';
function run(cmd){ return execSync(cmd, { cwd: DIR, encoding: 'utf8' }); }
function api(path, method, body){ return new Promise(function(resolve){
  const data = body ? JSON.stringify(body) : null;
  const req = https.request({ hostname:'api.github.com', path:path, method:method||'GET', headers:{ 'Authorization':'Bearer '+TOKEN, 'Accept':'application/vnd.github+json', 'User-Agent':'ak', ...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{}) } }, function(res){
    let d='';
    res.on('data',function(c){ d+=c; });
    res.on('end',function(){ resolve({status:res.statusCode, body:d}); });
  });
  req.on('error',function(e){ resolve({status:0, body:e.message}); });
  if(data)req.write(data);
  req.end();
}); }
async function main(){
  const msg = run(GIT + ' -C "' + DIR + '" log -1 --format=%s').trim();
  console.log('commit: ' + msg);
  const rel = await api('/repos/wayileina114-bit/ak-gacha-simulator/releases', 'POST', { tag_name: VER, name: VER, body: msg + '\n\n详情见 CHANGELOG.md，压缩包见附件。', draft:false, prerelease:false });
  console.log('RELEASE:' + rel.status);
  let rid = null;
  try{ rid = JSON.parse(rel.body).id; }catch(e){}
  if(rid){
    const url = '/repos/wayileina114-bit/ak-gacha-simulator/releases/' + rid + '/assets?name=' + ZIP;
    const zip = fs.readFileSync(ZIP);
    const req = https.request({ hostname:'uploads.github.com', path:url, method:'POST', headers:{ 'Authorization':'Bearer '+TOKEN, 'Content-Type':'application/zip', 'Content-Length':zip.length, 'User-Agent':'ak' } }, function(res){
      let d='';
      res.on('data',function(c){ d+=c; });
      res.on('end',function(){ console.log('ASSET:' + res.statusCode); });
    });
    req.on('error',function(e){ console.log('ASSET_ERR:' + e.message); });
    req.write(zip);
    req.end();
  } else { console.log(rel.body.slice(0,300)); }
}
main();