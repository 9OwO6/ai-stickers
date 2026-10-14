// Runs only against a local intercepted fixture. No real AI account is used.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(process.env.STICKER_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),extension=path.join(root,'extension');
const screenshots=process.argv.includes('--screenshots');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ai-stickers-test-'));
let context;
(async()=>{
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://chatgpt.com/**',route=>route.fulfill({contentType:'text/html;charset=utf-8',body:`<meta charset=utf-8><title>随手表情 · 本地演示</title><style>body{margin:0;background:#f7f8f5;font:16px system-ui;color:#35523e}main{max-width:680px;margin:70px 60px}h1{font-size:36px;letter-spacing:-1px;margin-bottom:12px}small{color:#7e897b}.intro{margin-top:40px;padding:22px;border-radius:18px;background:white;line-height:1.8}#messages .message{display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin:30px 0}#messages img{width:90px;height:90px;object-fit:contain}#messages p{background:#e7f0dc;border-radius:14px;padding:12px 16px;margin:0}form{position:fixed;bottom:44px;left:60px;width:650px;padding:18px;border:1px solid #dce3d6;border-radius:20px;background:#fff}textarea{width:90%;height:55px;border:0;resize:none;font:16px system-ui;outline:none}#attachment img{width:70px}button[data-testid]{background:#436b51;color:white;border:0;border-radius:12px;padding:8px 14px}button:disabled{opacity:.4}</style><main><small>LOCAL DEMO · 非真实聊天记录</small><h1>有些话，一个表情就够了。</h1><div class=intro>不用找文件，也不用解释每一个表情。<br>把熟悉的收藏放在手边，聊天时随手发出去。</div><div id=messages></div></main><form><div id=attachment></div><textarea id=prompt-textarea placeholder="输入文字，或直接点一个表情…"></textarea><input type=file accept="image/*" id=upload hidden><button type=button data-testid=send-button aria-label=发送 disabled>发送</button></form><script>const t=document.querySelector('textarea'),b=document.querySelector('[data-testid=send-button]');upload.onchange=()=>{const r=new FileReader();r.onload=()=>{attachment.innerHTML='<img src="'+r.result+'">';b.disabled=false};r.readAsDataURL(upload.files[0]);};b.onclick=()=>{const row=document.createElement('div');row.className='message';const p=document.createElement('p');p.textContent=t.value;if(t.value)row.append(p);row.append(attachment.firstChild);messages.append(row);t.value='';b.disabled=true};</script>`}));
 await page.goto('https://chatgpt.com/');
 const samples=await page.evaluate(()=>Array.from({length:18},(_,n)=>{
   const c=document.createElement('canvas');c.width=c.height=192;const x=c.getContext('2d');
   const colors=['#e9f0d4','#f7e5dc','#e1ebf3','#f6eaca','#ece2f1','#d9ece4'];
   x.fillStyle=colors[n%colors.length];x.beginPath();x.roundRect(10,10,172,172,38);x.fill();
   x.fillStyle='#fffdfa';x.beginPath();x.arc(96,88,57,0,Math.PI*2);x.fill();x.fillStyle='#3f5849';
   for(const eye of [76,116]){x.beginPath();x.arc(eye,80,4,0,Math.PI*2);x.fill();}
   x.strokeStyle='#3f5849';x.lineWidth=4;x.lineCap='round';x.beginPath();
   if(n%3===0)x.arc(96,86,22,.1,Math.PI-.1);else if(n%3===1){x.moveTo(84,105);x.lineTo(108,105);}else x.arc(96,106,7,0,Math.PI*2);x.stroke();
   x.fillStyle='#dca49a';for(const cheek of [58,134]){x.beginPath();x.ellipse(cheek,97,9,5,0,0,Math.PI*2);x.fill();}
   x.fillStyle='#4b6550';x.font='bold 20px "Microsoft YaHei",sans-serif';x.textAlign='center';const labels=['好耶','已老实','嗯？','哈哈哈','收到','贴贴'];x.fillText(labels[n%6],96,160);x.fillRect(20+(n%6)*6,176,3+Math.floor(n/6)*2,2);
   return {name:`演示表情 ${n+1}`,group:'演示',meaning:'',fav:true,last:0,data:c.toDataURL('image/png')};
 }));
 const picker=()=>page.getByRole('button',{name:'打开表情收藏夹',exact:true});
 await picker().click();
 await page.locator('#ai-stickers-host').locator('#file').setInputFiles({name:'演示表情 1.png',mimeType:'image/png',buffer:Buffer.from(samples[0].data.split(',')[1],'base64')});
 await page.getByRole('button',{name:'发送 演示表情 1',exact:true}).waitFor();
 assert.equal(await page.locator('#ai-stickers-host').locator('.editor').isVisible(),false);
 const firstHeight=await page.locator('#ai-stickers-host').locator('.panel').evaluate(x=>x.getBoundingClientRect().height);
 await page.getByRole('button',{name:'管理',exact:true}).click();
 // Eighteen unique demo images; the first is already in the library to test deduplication.
 await page.locator('#ai-stickers-host').locator('#backup').setInputFiles({name:'demo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,items:samples}))});
 await page.waitForFunction(()=>document.getElementById('ai-stickers-host').shadowRoot.querySelector('#summary').textContent.includes('新增 17'));
 if(screenshots){fs.mkdirSync(path.join(root,'docs/images'),{recursive:true});await page.screenshot({path:path.join(root,'docs/images/import.png')});}
 await page.getByRole('button',{name:'确认导入 17 张',exact:true}).click();await page.waitForFunction(()=>document.getElementById('ai-stickers-host').shadowRoot.querySelector('.status').textContent.includes('新增 17'));
 await page.getByRole('button',{name:'完成',exact:true}).click();
 assert.equal(await page.locator('#ai-stickers-host').locator('.panel').evaluate(x=>x.getBoundingClientRect().height),firstHeight);assert.equal(await page.locator('#ai-stickers-host').locator('.pick').count(),15);await page.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await page.locator('#ai-stickers-host').locator('.pick').count(),3);await page.getByRole('button',{name:'上一页',exact:true}).click();
 if(screenshots)await page.screenshot({path:path.join(root,'docs/images/picker.png')});
 await page.locator('#prompt-textarea').fill('哈哈哈，被你拿捏了。');await page.getByRole('button',{name:'发送 演示表情 1',exact:true}).click();await page.locator('#messages .message').waitFor();
 assert.equal(await page.locator('#messages p').innerText(),'哈哈哈，被你拿捏了。');await page.locator('#ai-stickers-host').locator('.panel').waitFor({state:'hidden'});
 if(screenshots)await page.screenshot({path:path.join(root,'docs/images/text-and-sticker.png')});
 await picker().click();await page.getByRole('button',{name:'发送 演示表情 1',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#messages .message').length===2);await page.locator('#ai-stickers-host').locator('.panel').waitFor({state:'hidden'});
 await picker().click();await page.evaluate(()=>{const input=document.getElementById('upload'),original=input.onchange;input.onchange=e=>{document.querySelector('textarea').value='上传期间改写';original(e);};});
 await page.locator('#prompt-textarea').fill('原草稿');await page.locator('#ai-stickers-host').locator('.pick').first().click();await page.waitForFunction(()=>document.getElementById('ai-stickers-host').shadowRoot.querySelector('.status').textContent.includes('未自动发送'));
 assert.equal(await page.locator('#messages .message').count(),2);assert.equal(await page.locator('#prompt-textarea').inputValue(),'上传期间改写');assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: real extension load, auto-add, duplicate preview, import, stable size, text + image, pure-image send, dismissal, draft-change guard, no page errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(context)await context.close();if(profile.startsWith(path.join(os.tmpdir(),'ai-stickers-test-')))fs.rmSync(profile,{recursive:true,force:true});});

