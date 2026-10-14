(() => {
  'use strict';
  if (document.getElementById('ai-stickers-host')) return;
  let state = {items: []}, tab = 'all', busy = false, page = 0, pending = [], importing = false;
  const RECOVERY='扩展已更新或重新加载，当前网页仍在使用旧脚本。请刷新此网页后重试；尚未保存的表情需要重新选择。';
  const rpc=async(action,extra={})=>{
    try{
      if(!chrome.runtime?.id)throw Error('Extension context invalidated');
      const response=await chrome.runtime.sendMessage({action,...extra});if(!response?.ok)throw Error(response?.error||'存储服务未响应，请重新加载扩展和网页');return response.value;
    }catch(e){
      if(/context invalidated|Extension context/i.test(e.message||'')){$('#recover').hidden=false;throw Error(RECOVERY);}
      throw e;
    }
  };
  const host = document.createElement('div'); host.id = 'ai-stickers-host';
  const root = host.attachShadow({mode:'open'}); (document.body || document.documentElement).append(host);
  root.innerHTML = `<style>
    :host{all:initial;font-family:system-ui,"Microsoft YaHei",sans-serif;color:#253c33}
    *{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}
    .launch{position:fixed;right:24px;bottom:110px;z-index:2147483646;border:1px solid #cedcd2;border-radius:24px;background:#eff6ee;color:#304c37;padding:12px 18px;box-shadow:0 6px 24px #0002;font-weight:600}
    .panel{position:fixed;right:24px;bottom:166px;width:380px;max-width:calc(100vw - 24px);max-height:calc(100vh - 190px);z-index:2147483647;background:#fbfcf8;border:1px solid #d6e0d5;border-radius:22px;box-shadow:0 16px 60px #0003;overflow:auto;padding:20px}
    [hidden]{display:none!important}.head{display:flex;align-items:center;justify-content:space-between}.head strong{font-size:20px}.muted{font-size:12px;color:#65796b;line-height:1.7;margin:8px 0 14px}
    button{border:0;border-radius:10px;padding:8px 10px;background:#eaf0e7;color:#35563e}.close{background:transparent;font-size:20px}.tabs{display:flex;gap:6px;margin:12px 0}.tabs .active{background:#375f45;color:white}
    input[type=search],input[type=text],textarea{width:100%;border:1px solid #d8e1d6;background:white;border-radius:10px;padding:10px;margin:5px 0;outline-color:#5b8664}textarea{resize:vertical;min-height:65px}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;min-height:150px;padding:4px 0 12px}.tile{min-width:0;text-align:center}.pick{width:100%;height:76px;background:white;border:1px solid #e0e8dc;padding:5px}.pick img{width:100%;height:100%;object-fit:contain}.name{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px}.tools{display:flex;justify-content:center;gap:2px}.tools button{padding:3px 6px;font-size:12px;background:transparent}.empty{grid-column:1/-1;text-align:center;padding:30px 12px;color:#758371;font-size:13px;line-height:1.8}
    .bar{display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid #e2e8dc;padding-top:12px}.primary{background:#375f45;color:white}.status{font-size:12px;line-height:1.6;min-height:22px;margin:10px 0 0;color:#52674f}.setting{font-size:12px;display:flex;gap:8px;align-items:center;margin-top:14px}
    .editor{border-top:1px solid #ddd;padding-top:12px;margin-top:12px}.editor img{display:block;max-width:100%;height:80px;object-fit:contain;margin:auto}.editor label{display:block;font-size:12px;margin-top:8px}.editor .bar{border:0}.drop{outline:3px dashed #83a779}
    select{width:100%;border:1px solid #d8e1d6;border-radius:10px;padding:8px;background:white;color:#35563e}.pager{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:10px}.batch{border-top:1px solid #d8e1d6;margin-top:12px;padding-top:12px}.previews{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;max-height:180px;overflow:auto}.previews img{width:65px;height:65px;object-fit:contain}.previews label{font-size:10px;overflow:hidden}.issues{font-size:11px;max-height:90px;overflow:auto;color:#7c5749;white-space:pre-wrap}
    .panel:has(.batch:not([hidden]))>.grid,.panel:has(.batch:not([hidden]))>.pager{display:none}
    @media(max-width:480px){.launch{right:12px;bottom:88px}.panel{right:12px;bottom:144px;max-height:calc(100vh - 162px)}}
  </style>
  <button class="launch" aria-expanded="false" aria-label="打开表情收藏夹">表情</button>
  <section class="panel" hidden aria-label="表情收藏夹">
    <div class="head"><strong>随手表情</strong><div><button id="manage" aria-pressed="false">管理</button><button class="close" aria-label="关闭">×</button></div></div>
    <p class="muted">点一个表情，直接发出去。<br>只发送图片，不附说明文字。</p>
    <div class="filters"><input type="search" placeholder="搜索表情" aria-label="搜索表情"><select id="groups" aria-label="筛选分组"><option value="">所有分组</option></select></div>
    <div class="tabs"><button data-tab="all" class="active">全部</button><button data-tab="fav">收藏</button><button data-tab="recent">最近</button></div>
    <div class="grid"></div>
    <div class="pager"><button id="prev">上一页</button><span id="count"></span><button id="next">下一页</button></div>
    <div class="bar"><button class="primary" id="add">＋ 添加表情</button><button id="multi">多图导入</button><button id="folder">文件夹导入</button><button id="export">导出备份</button><button id="import">导入备份</button></div>
    <p class="status" role="status">点击表情即尝试上传并直接发送。</p>
    <button id="recover" hidden>刷新网页恢复扩展</button>
    <div class="editor" hidden><img alt="待保存表情预览"><label>名称（仅用于收藏夹）<input type="text" id="name" maxlength="60" placeholder="例如：已老实小狗"></label><label>分组<input type="text" id="group" maxlength="160" placeholder="例如：小狗"></label><label>搜索备注（仅本地，不逐张解释）<textarea id="meaning" maxlength="240" placeholder="例如：小狗、自嘲、撒娇"></textarea></label><div class="bar"><button id="save" class="primary">保存表情</button><button id="cancel">取消</button></div></div>
    <div class="batch" hidden><strong>导入预览</strong><p id="summary" class="muted"></p><input type="text" id="batch-group" maxlength="160" placeholder="统一分组（留空保留文件夹分组）"><div class="tabs"><button id="select-all">全选</button><button id="select-none">全不选</button></div><div class="previews"></div><p class="issues"></p><div class="bar"><button id="commit" class="primary">确认导入</button><button id="discard">取消导入</button></div></div>
    <input type="file" id="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
    <input type="file" id="backup" accept="application/json,.json" hidden>
    <input type="file" id="many" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden>
    <input type="file" id="directory" webkitdirectory multiple hidden>
  </section>`;
  const $ = s => root.querySelector(s), panel=$('.panel'), grid=$('.grid');
  const polish=document.createElement('style');polish.textContent=`
    .panel{width:460px;height:490px;padding:14px;display:flex;flex-direction:column;gap:8px;border-radius:18px;overflow:hidden;max-height:calc(100vh - 190px)}
    .panel>*{flex-shrink:0}.head strong{font-size:17px}.head .close{padding:4px 8px}.head #manage{padding:5px 8px;font-size:12px;background:transparent}
    .panel>.muted{display:none}.filters{display:flex;gap:8px;align-items:center}.filters input{width:62%;margin:0;height:34px;padding:8px}.filters select{width:38%;height:34px;padding:6px;font-size:12px}
    .tabs{margin:0;gap:6px}.tabs button{padding:6px 10px;font-size:12px}.grid{flex:1;min-height:0;padding:0;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:6px;overflow:hidden}
    .tile{position:relative;min-height:0}.pick{height:100%;border:0;background:transparent;border-radius:10px;padding:6px;transition:background .15s}.pick:hover{background:#e9f1e5}.pick img{max-height:76px}.name{display:none}.tools{position:absolute;bottom:0;left:0;right:0;background:#fbfcf8eF;border-radius:6px;display:none}.managing .tools,.tile:hover .tools{display:flex}.tools button{padding:2px 6px}
    .pager{margin:0;height:28px}.pager button{padding:5px 8px;font-size:11px}.bar{padding-top:8px;gap:5px}.bar button{font-size:12px;padding:7px 9px}.panel>.bar button:not(#add){display:none}.panel.managing>.bar button{display:block}.status{margin:0;min-height:18px;font-size:11px;max-height:36px;overflow:auto}
    .editor,.batch{position:absolute;inset:48px 14px 14px;background:#fbfcf8;overflow:auto;padding:12px;z-index:2;border-radius:12px;margin:0}.editor .bar button,.batch .bar button{display:block}
    .launch{display:flex;gap:8px;align-items:center;padding:10px 14px}.launch svg{width:22px;height:22px}
    @media(max-width:480px){.panel{width:calc(100vw - 24px);height:460px;max-height:calc(100vh - 162px)}}
  `;root.append(polish);
  $('.launch').innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h18a4 4 0 0 1 4 4v14L19 29H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z" fill="#426d52"/><path d="M19 29v-5a3 3 0 0 1 3-3h7" fill="#a9cc93"/><circle cx="11" cy="12" r="1.5" fill="#fff"/><circle cx="21" cy="12" r="1.5" fill="#fff"/><path d="M10 17q6 7 12 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg><span>表情</span>';
  $('#manage').onclick=()=>{const managing=panel.classList.toggle('managing');$('#manage').setAttribute('aria-pressed',String(managing));$('#manage').textContent=managing?'完成':'管理';};
  const status = msg => {$('.status').textContent=msg;};
  $('#recover').onclick=()=>{const c=composer();const hasDraft=c&&(read(c).trim()||scopeFor(c).querySelector('img'));if(hasDraft&&!confirm('输入区有文字或附件，刷新可能丢失草稿。确定刷新吗？'))return;location.reload();};
  async function refresh(){state.items=await rpc('list');render();}
  function open(value){panel.hidden=!value;$('.launch').setAttribute('aria-expanded',String(value));if(value)refresh().catch(e=>status(e.message));}
  $('.launch').onclick=()=>open(panel.hidden);$('.close').onclick=()=>open(false);
  root.addEventListener('keydown', e=>{if(e.key==='Escape')open(false);});
  function render(){
    const q=$('input[type=search]').value.toLowerCase();
    let group=$('#groups').value;const groups=[...new Set(state.items.map(i=>i.group||'未分组'))].sort();if(!groups.includes(group))group='';$('#groups').replaceChildren(new Option('所有分组',''),...groups.map(g=>new Option(g,g)));$('#groups').value=group;
    $('#export').title=group?'导出当前分组的备份':'导出整个表情库的备份';
    let list=state.items.filter(i=>(!group||(i.group||'未分组')===group)&&(tab!=='fav'||i.fav)&&(tab!=='recent'||i.last)&&`${i.name} ${i.meaning}`.toLowerCase().includes(q));
    if(tab==='recent')list.sort((a,b)=>b.last-a.last);
    const pages=Math.max(1,Math.ceil(list.length/15));page=Math.min(page,pages-1);$('#count').textContent=`${list.length} 个 · ${page+1}/${pages} 页`;$('#prev').disabled=page===0;$('#next').disabled=page===pages-1;list=list.slice(page*15,(page+1)*15);
    grid.replaceChildren();
    if(!list.length){const d=document.createElement('div');d.className='empty';d.textContent=q?'没有找到这个表情。':'还没有表情。点击「添加表情」，也可以把图片拖到面板或在面板内粘贴。';grid.append(d);}
    for(const i of list){
      const d=document.createElement('div');d.className='tile';
      const b=document.createElement('button');b.className='pick';b.title=`${i.name}：${i.meaning || '结合上下文理解'}`;b.setAttribute('aria-label',`发送 ${i.name}`);b.disabled=busy;
      const img=document.createElement('img');img.src=i.thumb;img.loading='lazy';img.alt=i.name;b.append(img);b.onclick=()=>send(i);
      const n=document.createElement('div');n.className='name';n.textContent=i.name;
      const t=document.createElement('div');t.className='tools';
      for(const [label,title,fn] of [[i.fav?'♥':'♡','切换收藏',async()=>{await rpc('update',{id:i.id,changes:{fav:!i.fav}});await refresh();}],['✎','编辑',()=>edit(i)],['×','删除',async()=>{if(confirm(`删除「${i.name}」？`)){await rpc('delete',{id:i.id});await refresh();}}]]){
        const btn=document.createElement('button');btn.textContent=label;btn.title=title;btn.setAttribute('aria-label',`${title} ${i.name}`);btn.onclick=()=>Promise.resolve(fn()).catch(e=>status(e.message));t.append(btn);
      }d.append(b,n,t);grid.append(d);
    }
  }
  $('input[type=search]').oninput=()=>{page=0;render();};$('#groups').onchange=()=>{page=0;render();};$('#prev').onclick=()=>{page--;render();};$('#next').onclick=()=>{page++;render();};
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{page=0;tab=b.dataset.tab;root.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));render();});
  let editing=null;
  function edit(i){editing={...i};$('.editor').hidden=false;$('.editor img').src=i.thumb||i.data;$('#name').value=i.name;$('#group').value=i.group||'未分组';$('#meaning').value=i.meaning;$('#name').focus();}
  async function prepare(file){
    const ext=file.name.split('.').pop().toLowerCase(),types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'},type=types[ext]||file.type;
    if(!['image/png','image/jpeg','image/gif','image/webp'].includes(type))throw Error('不支持此文件格式（微信加密 .dat 需先导出为普通图片）');
    if(!file.size||file.size>5*1024*1024)throw Error('单张需在 5 MB 内且不能为空');
    file=new File([file],file.name,{type});
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
    const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('图片无法解码。'));i.src=data;});
    const scale=Math.min(1,96/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const thumb=canvas.toDataURL('image/png');
    const base=file.name.replace(/\.[^.]+$/,'');const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
    return {name:/^[a-f0-9-]{20,}$/i.test(base)?'新表情':base.slice(0,60),meaning:'',data,thumb,fav:true,last:0,hash};
  }
  async function addFile(file){
    status('正在添加表情…');
    const item=await prepare(file),group=$('#groups').value||'未分组';
    const result=await rpc('add',{items:[{...item,group}]});
    tab='all';page=0;$('input[type=search]').value='';
    root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='all'));
    await refresh();
    status(result.added?'已添加。点表情就能发送。':'这张表情已在库中，直接点它发送即可。');
  }
  $('#add').onclick=()=>$('#file').click();$('#file').onchange=async()=>{try{if($('#file').files[0])await addFile($('#file').files[0]);}catch(e){status(e.message);}$('#file').value='';};
  $('#cancel').onclick=()=>{$('.editor').hidden=true;editing=null;};
  $('#save').onclick=async()=>{try{
    if(!editing)return;const name=$('#name').value.trim();if(!name)throw Error('请填写表情名称。');
    const changes={name,meaning:$('#meaning').value.trim(),group:$('#group').value.trim()||'未分组'};
    if(editing.id)await rpc('update',{id:editing.id,changes});else await rpc('add',{items:[{...editing,...changes}]});
    $('.editor').hidden=true;editing=null;await refresh();status('已保存。点击表情即可直接发送。');
  }catch(e){status(e.message);}};
  panel.addEventListener('dragover',e=>{e.preventDefault();panel.classList.add('drop');});panel.addEventListener('dragleave',()=>panel.classList.remove('drop'));
  panel.addEventListener('drop',async e=>{e.preventDefault();panel.classList.remove('drop');try{const files=[...e.dataTransfer.files];if(files.length>1)await stage(files);else if(files[0])await addFile(files[0]);}catch(err){status(err.message);}});
  panel.addEventListener('paste',async e=>{const file=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile();if(file){e.preventDefault();try{await addFile(file);}catch(err){status(err.message);}}});
  $('#export').onclick=async()=>{try{const group=$('#groups').value,rows=state.items.filter(i=>!group||i.group===group),items=[];let bytes=0;$('#export').disabled=true;for(const [n,i] of rows.entries()){const {thumb,hash,size,id,...meta}=i;const data=await rpc('get',{id});bytes+=data.length;if(bytes>190*1024*1024)throw Error('备份超过 190 MB，请按分组分别导出。');items.push({...meta,data});if(n%10===0)status(`正在导出 ${n+1}/${rows.length}…`);}const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,items})],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='随手表情备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status(`备份已生成：${group?'当前分组':'全部'} ${items.length} 张。`);}catch(e){status(e.message);}finally{$('#export').disabled=false;}};
  $('#import').onclick=()=>$('#backup').click();
  $('#backup').onchange=async()=>{try{
    const f=$('#backup').files[0];if(!f)return;if(f.size>200*1024*1024)throw Error('备份超过 200 MB，请分批导入。');const data=JSON.parse(await f.text());
    if(![1,2].includes(data.version)||!Array.isArray(data.items)||data.items.length>5000)throw Error('备份无效，或超过 5000 张上限。');
    const files=data.items.map((i,n)=>{if(typeof i.data!=='string'||i.data.length>7500000||!/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(i.data)||typeof i.name!=='string'||!i.name.trim()||i.name.length>60||typeof i.meaning!=='string'||i.meaning.length>240)throw Error(`备份中第 ${n+1} 张无效。`);const mime=i.data.slice(5,i.data.indexOf(';')),bytes=Uint8Array.from(atob(i.data.split(',')[1]),c=>c.charCodeAt(0));return new File([bytes],`备份${n+1}.${mime.split('/')[1]}`,{type:mime});});
    await stage(files,data.items);
  }catch(e){status(e.message);}$('#backup').value='';};
  $('#multi').onclick=()=>{if(!importing)$('#many').click();};$('#folder').onclick=()=>{if(!importing)$('#directory').click();};
  for(const id of ['many','directory'])$('#'+id).onchange=async()=>{try{await stage([...$('#'+id).files]);}catch(e){status(e.message);}$('#'+id).value='';};
  let stageToken=0;
  $('#discard').onclick=()=>{if(importing)return;stageToken++;pending=[];$('.batch').hidden=true;status('已取消，没有导入图片。');};
  async function stage(files,metadata){
    if(importing)throw Error('正在导入，请稍后。');
    const token=++stageToken;pending=[];$('.batch').hidden=false;$('.editor').hidden=true;$('#commit').disabled=true;$('#batch-group').value='';$('.previews').replaceChildren();$('.issues').textContent='';
    const seen=new Set(state.items.map(i=>i.hash));let duplicates=0,skipped=0,total=0;const issues=[];
    if(files.length>(metadata?5000:500)){ $('.batch').hidden=true;throw Error('单批最多 500 张，请选择较小的文件夹或分批多选。');}
    for(const [n,file] of files.entries()){
      if(token!==stageToken)return;
      $('#summary').textContent=`正在检查 ${n+1}/${files.length}…`;
      try{
        if(total+file.size>150*1024*1024)throw Error('本批总大小超过 150 MB');
        const item=await prepare(file);if(token!==stageToken)return;
        if(seen.has(item.hash)){duplicates++;continue;}seen.add(item.hash);total+=file.size;
        const parts=(file.webkitRelativePath||'').split('/');item.group=parts.length>1?parts.slice(0,-1).join('/').slice(0,160):'批量导入';
        if(metadata){const m=metadata[n];Object.assign(item,{name:m.name,meaning:m.meaning,group:typeof m.group==='string'?m.group.slice(0,160):'导入备份',fav:!!m.fav,last:Number(m.last)||0});}
        else if(item.name==='新表情')item.name=`新表情 ${pending.length+1}`;
        pending.push({...item,selected:true});
      }catch(e){skipped++;if(issues.length<30)issues.push(`${file.name}：${e.message}`);}
    }
    if(token!==stageToken)return;
    $('#summary').textContent=`新增 ${pending.length} 张 · 重复 ${duplicates} 张 · 无法导入 ${skipped} 张。`;
    $('.issues').textContent=issues.join('\n');
    drawPending();status('请检查预览后确认导入。图片不会发送给 AI。');
  }
  function drawPending(){
    $('.previews').replaceChildren();
    pending.forEach(i=>{const label=document.createElement('label'),checkbox=document.createElement('input'),img=document.createElement('img'),text=document.createElement('div');checkbox.type='checkbox';checkbox.checked=i.selected;checkbox.disabled=importing;checkbox.onchange=()=>{i.selected=checkbox.checked;$('#commit').textContent=`确认导入 ${pending.filter(x=>x.selected).length} 张`;};img.src=i.thumb;img.loading='lazy';img.alt=i.name;text.textContent=i.name;label.title=`${i.name} · ${i.group}`;label.append(checkbox,img,text);$('.previews').append(label);});
    $('#commit').textContent=`确认导入 ${pending.filter(x=>x.selected).length} 张`;$('#commit').disabled=importing||!pending.some(i=>i.selected);
  }
  $('#select-all').onclick=()=>{if(!importing){pending.forEach(i=>i.selected=true);drawPending();}};$('#select-none').onclick=()=>{if(!importing){pending.forEach(i=>i.selected=false);drawPending();}};
  $('#commit').onclick=async()=>{
    if(importing)return;const items=pending.filter(i=>i.selected);if(!items.length){status('请选择至少一张表情。');return;}
    importing=true;drawPending();$('#discard').disabled=true;$('#batch-group').disabled=true;let added=0,duplicates=0;
    try{
      const group=$('#batch-group').value.trim();
      // Small transactions stay below Chrome message limits and report partial progress.
      for(let n=0;n<items.length;){const chunk=[];let size=0;while(n<items.length&&chunk.length<10&&(size+items[n].data.length<20000000||!chunk.length)){const i=items[n++];size+=i.data.length;chunk.push(group?{...i,group}:i);}const r=await rpc('add',{items:chunk});added+=r.added;duplicates+=r.duplicates;const committed=new Set(chunk.map(i=>i.hash));pending=pending.filter(i=>!committed.has(i.hash));status(`已导入 ${added} 张，处理 ${n}/${items.length}…`);}
      pending=[];$('.batch').hidden=true;await refresh();status(`导入完成：新增 ${added} 张，重复跳过 ${duplicates} 张。`);
    }catch(e){await refresh().catch(()=>{});status(`已新增 ${added} 张；剩余 ${pending.filter(i=>i.selected).length} 张未导入：${e.message}。可重新确认或取消。`);}finally{importing=false;drawPending();$('#discard').disabled=false;$('#batch-group').disabled=false;}
  };
  const visible=e=>e&&e.getClientRects().length>0;
  const read=c=>c instanceof HTMLTextAreaElement?c.value:c.innerText;
  function composer(){return [...document.querySelectorAll('#prompt-textarea,textarea,[contenteditable="true"][role="textbox"],[contenteditable="true"][data-lexical-editor]')].find(visible);}
  function scopeFor(c){return c.closest('form')||c.closest('[data-type="composer"]')||(location.hostname==='muse.ai'?c.parentElement.parentElement.parentElement:c.parentElement.parentElement);}
  function sendButton(c){const scope=scopeFor(c);return [...scope.querySelectorAll('button')].find(b=>visible(b)&&(/send-button/.test(b.dataset.testid||'')||/^(send( message)?|发送(消息)?|提交)$/i.test((b.getAttribute('aria-label')||b.title||b.textContent||'').trim())));}
  async function until(fn,ms=12000){const start=Date.now();while(Date.now()-start<ms){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,200));}return null;}
  async function send(i){
    if(busy)return;busy=true;render();
    try{
      const chatUrl=location.href;
      const c=composer();if(!c)throw Error('没有找到聊天输入框。请先打开一个聊天；此页面可能尚未适配。');
      const draft=read(c);
      const scope=scopeFor(c);
      if(scope.querySelector('img,button[aria-label*="Remove"],button[aria-label*="移除"]'))throw Error('输入区可能已有附件，请先处理附件再选择表情。');
      if(document.querySelector('[data-testid="stop-button"]'))throw Error('AI 正在回复，请稍后再发表情。');
      const inputs=[...document.querySelectorAll('input[type="file"]')].filter(x=>!x.hasAttribute('capture'));
      const input=inputs.find(x=>scope.contains(x)&&x.accept==='image/*')||inputs.find(x=>scope.contains(x)&&(!x.accept||/image|png|jpg|gif|webp/.test(x.accept)))||(location.hostname==='chatgpt.com'?inputs.find(x=>/image/.test(x.accept)):null);
      if(!input)throw Error('未找到图片上传入口。请先点网页的附件按钮，再尝试；Muse 的入口尚待实测。');
      const data=await rpc('get',{id:i.id});
      if(location.href!==chatUrl||composer()!==c||read(c)!==draft)throw Error('读取表情期间聊天或草稿已变化，本次未上传或发送。');
      const mime=data.match(/^data:([^;]+);/)[1],bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
      const file=new File([bytes],`聊天表情.${mime.split('/')[1]}`,{type:mime});
      const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      const preview=await until(()=>scope.querySelector('img,button[aria-label*="Remove"],button[aria-label*="移除"]'));
      if(!preview)throw Error('无法确认图片已加入输入区。请检查网页附件状态；本次未自动发送。');
      const active=composer();if(!active)throw Error('图片已添加，但输入框发生变化，本次未自动发送，请检查附件。');
      if(location.href!==chatUrl||active!==c)throw Error('聊天页面在上传期间发生变化，本次未自动发送，请检查附件。');
      if(read(active)!==draft)throw Error('上传期间你输入了文字，本次未自动发送，请检查附件。');
      const b=await until(()=>{const x=sendButton(active);return x&&!x.disabled&&x.getAttribute('aria-disabled')!=='true'?x:null;},15000);
      if(!b)throw Error('图片已准备，发送按钮暂不可用，请检查上传状态。');
      if(location.href!==chatUrl||composer()!==active||read(active)!==draft)throw Error('聊天或草稿已变化，本次未自动发送。');
      b.click();
      i.last=Date.now();
      const cleared=await until(()=>!scope.querySelector('img,button[aria-label*="Remove"],button[aria-label*="移除"]'),6000);
      status(cleared?'已发送表情。':'已点击发送，请核实聊天记录；附件尚未清空。');
      if(cleared)open(false);
      try{await rpc('update',{id:i.id,changes:{last:i.last}});}catch(e){status('已点击发送，但最近使用记录保存失败：'+e.message);}
    }catch(e){status(e.message);}finally{busy=false;render();}
  }
  // ChatGPT hydrates the entire document and can remove third-party nodes.
  // Reattach this same host so event handlers, editing state and storage survive.
  const keepMounted = new MutationObserver(() => {
    if (!host.isConnected && document.body) document.body.append(host);
  });
  keepMounted.observe(document, {childList:true, subtree:true});
  refresh().catch(e=>status(`本地存储读取失败：${e.message}`));
})();
