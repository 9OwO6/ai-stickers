'use strict';
const LEGACY='aiStickersV1';
const dbReady=new Promise((resolve,reject)=>{
  const request=indexedDB.open('ai-stickers-library',1);
  request.onupgradeneeded=()=>{const db=request.result;const s=db.createObjectStore('stickers',{keyPath:'id'});s.createIndex('hash','hash',{unique:true});db.createObjectStore('settings');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
const result=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const done=t=>new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onabort=()=>reject(t.error||Error('存储事务中断'));t.onerror=()=>{};});
function unpack(data){if(typeof data!=='string'||data.length>7500000||!/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('图片格式或大小无效');const mime=data.slice(5,data.indexOf(';'));const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return new Blob([bytes],{type:mime});}
async function hash(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function pack(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let n=0;n<bytes.length;n+=32768)binary+=String.fromCharCode(...bytes.subarray(n,n+32768));return `data:${blob.type};base64,${btoa(binary)}`;}
async function thumbnail(blob){const bitmap=await createImageBitmap(blob);try{const scale=Math.min(1,96/Math.max(bitmap.width,bitmap.height));const c=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);return await pack(await c.convertToBlob({type:'image/png'}));}finally{bitmap.close();}}
const meta=({blob,...rest})=>rest;
async function row(input){
  const blob=unpack(input.data);if(!blob.size||blob.size>5*1024*1024)throw Error('单图超过 5 MB 或为空');
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>60||typeof input.meaning!=='string'||input.meaning.length>240)throw Error('表情信息无效');
  return {id:crypto.randomUUID(),name:input.name.trim(),meaning:input.meaning,group:typeof input.group==='string'?input.group.slice(0,160):'未分组',fav:!!input.fav,last:Number(input.last)||0,hash:await hash(blob),size:blob.size,blob,thumb:await thumbnail(blob)};
}
let migration;
async function migrate(){
  if(migration)return migration;
  migration=(async()=>{
    const db=await dbReady;if(await result(db.transaction('settings').objectStore('settings').get('legacyMigrated')))return;
    const old=(await chrome.storage.local.get(LEGACY))[LEGACY];
    const rows=[];for(const i of old?.items||[])rows.push(await row({...i,group:'原有收藏'}));
    const tx=db.transaction(['stickers','settings'],'readwrite'),completed=done(tx),s=tx.objectStore('stickers');
    // Transaction serializes concurrent extension tabs; hash index avoids duplication.
    for(const r of new Map(rows.map(r=>[r.hash,r])).values()){const found=s.index('hash').get(r.hash);found.onsuccess=()=>{if(!found.result)s.put(r);};}
    tx.objectStore('settings').put(true,'legacyMigrated');await completed;
    // Keep legacy source intact as a recovery copy; never delete it during migration.
  })();
  try{await migration;}catch(e){migration=null;throw e;}
}
async function handle(m){
  await migrate();const db=await dbReady;
  if(m.action==='list')return (await result(db.transaction('stickers').objectStore('stickers').getAll())).map(meta);
  if(m.action==='get'){const r=await result(db.transaction('stickers').objectStore('stickers').get(m.id));if(!r)throw Error('表情不存在');return await pack(r.blob);}
  if(m.action==='add'){
    if(!Array.isArray(m.items)||m.items.length>500)throw Error('一次最多导入 500 张');
    const rows=[];let bytes=0;for(const i of m.items){bytes+=i.data?.length||0;if(bytes>280000000)throw Error('一次导入内容过大');rows.push(await row(i));}
    const unique=new Map(rows.map(r=>[r.hash,r]));
    const tx=db.transaction('stickers','readwrite'),completed=done(tx),s=tx.objectStore('stickers');let added=0,duplicates=rows.length-unique.size;
    for(const r of unique.values()){const q=s.index('hash').get(r.hash);q.onsuccess=()=>{if(q.result)duplicates++;else{added++;s.put(r);}};}
    await completed;return {added,duplicates};
  }
  if(m.action==='update'){
    const changes=m.changes||{};
    if(changes.name!==undefined&&(typeof changes.name!=='string'||!changes.name.trim()||changes.name.length>60))throw Error('名称无效');
    if(changes.meaning!==undefined&&(typeof changes.meaning!=='string'||changes.meaning.length>240))throw Error('备注无效');
    if(changes.group!==undefined&&(typeof changes.group!=='string'||changes.group.length>160))throw Error('分组无效');
    const tx=db.transaction('stickers','readwrite'),completed=done(tx),s=tx.objectStore('stickers'),q=s.get(m.id);
    q.onsuccess=()=>{if(!q.result){tx.abort();return;}const r=q.result;for(const k of ['name','meaning','group','fav','last'])if(changes[k]!==undefined)r[k]=changes[k];s.put(r);};await completed;return true;
  }
  if(m.action==='delete'){const tx=db.transaction('stickers','readwrite'),completed=done(tx);tx.objectStore('stickers').delete(m.id);await completed;return true;}
  throw Error('未知存储操作');
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id)return false;
  handle(message).then(value=>reply({ok:true,value}),e=>reply({ok:false,error:e.message||'存储失败'}));return true;
});
