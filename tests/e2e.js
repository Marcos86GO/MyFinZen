// Pruebas end-to-end de MyFinZen con Playwright (Chromium).
// Cubre: alta de bóveda, passkey (autenticador virtual con PRF), cifrado en IndexedDB,
// importación de PDFs/CSVs, clave de API (mock), copia cifrada, bloqueo, recuperación y modo offline.
// Uso: npm i && npx playwright install chromium && npm run fixtures && npm test
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..'), FX=path.join(__dirname,'fixtures'), PORT=8899;
const types={'.html':'text/html','.js':'application/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(ROOT,f);if(!fp.startsWith(ROOT)||!fs.existsSync(fp)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':types[path.extname(fp)]||'text/plain'});fs.createReadStream(fp).pipe(r);}).listen(PORT);
let failed=0; const ok=(c,m)=>{ console.log((c?'✓ ':'✗ ')+m); if(!c) failed++; };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:900}}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const cdp=await ctx.newCDPSession(pg); await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,hasPrf:true,automaticPresenceSimulation:true}});
  await pg.route('https://api.anthropic.com/**',r=>{ const body=JSON.parse(r.request().postData());
    if(!body.stream) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:'OK'}],stop_reason:'end_turn'})});
    const ev=[{type:'content_block_delta',delta:{type:'text_delta',text:'#### Plan\n- Paso 1'}},{type:'message_delta',delta:{stop_reason:'end_turn'}}];
    r.fulfill({status:200,contentType:'text/event-stream',body:ev.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')}); });
  const U=`http://localhost:${PORT}/`, PASS='frase de prueba larga 1';
  await pg.goto(U); await pg.waitForTimeout(600);
  ok(await pg.$eval('#gate h2',e=>e.innerText)==='Crea tu contraseña maestra','pantalla de alta');
  await pg.fill('#g1',PASS); await pg.fill('#g2',PASS); await pg.click('#gGo'); await pg.waitForSelector('.reccode',{timeout:20000});
  const rec=await pg.$eval('.reccode',e=>e.innerText); ok(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){5}$/.test(rec),'clave de recuperación');
  await pg.check('#gOk'); await pg.click('#gNext'); await pg.waitForTimeout(300); await pg.click('#gPk'); await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>VAULT.meta.pk.length)===1,'passkey PRF creada');
  if(await pg.$('#mc')) await pg.click('#mc');
  await pg.evaluate(()=>{ S.accounts.push({id:'m1',kind:'brokerage',name:'CuentaSecretaXYZ',institution:'M1 Finance'}); save(); }); await pg.waitForTimeout(600);
  ok(!/CuentaSecretaXYZ/.test(await pg.evaluate(()=>IDB.get('vault').then(v=>JSON.stringify(v)))),'IndexedDB sin texto en claro');
  await pg.goto(U+'#importar'); await pg.waitForTimeout(300);
  await pg.setInputFiles('#fCSV',path.join(FX,'Holdings-Oct-30-2026.csv')); await pg.waitForTimeout(300);
  ok(/3 posiciones/.test(await pg.$eval('#impOut',e=>e.innerText)),'CSV de Holdings'); await pg.click('#hOk');
  await pg.setInputFiles('#fCSV',path.join(FX,'card.csv')); await pg.waitForTimeout(300); ok(/3 movimientos/.test(await pg.$eval('#impOut',e=>e.innerText)),'CSV de tarjeta'); await pg.click('#mGo');
  await pg.setInputFiles('#fPDF',path.join(FX,'mortgage.pdf')); await pg.waitForTimeout(2000);
  ok(/Hipoteca detectada/.test(await pg.$eval('#impOut h2',e=>e.innerText))&&await pg.$eval('#pB',e=>e.value)==='800000','PDF de hipoteca (no confundido con impuestos)'); await pg.click('#pOk');
  await pg.setInputFiles('#fPDF',path.join(FX,'bank.pdf')); await pg.waitForTimeout(2000);
  ok(await pg.$eval('#gV',e=>e.value)==='12000'&&(await pg.$$('#impOut tbody tr')).length===5,'PDF de banco: saldo y movimientos'); await pg.click('#gCancel');
  await pg.setInputFiles('#fPDF',path.join(FX,'w2.pdf')); await pg.waitForTimeout(2000);
  ok(await pg.$eval('[data-k=wages]',e=>e.value)==='150000'&&await pg.$eval('[data-k=k401]',e=>e.value)==='24500','W-2'); await pg.click('#tOk');
  await pg.setInputFiles('#fPDF',path.join(FX,'c1099.pdf')); await pg.waitForTimeout(2000);
  ok(await pg.$eval('[data-k=qualifiedDiv]',e=>e.value)==='900','1099 consolidado'); await pg.click('#tOk');
  const tax=await pg.evaluate(()=>{ const r=computeTaxes(2026); return {agi:Math.round(r.agi),std:r.C.std}; });
  ok(tax.std===32200&&tax.agi>150000,'cálculo fiscal 2026 ('+JSON.stringify(tax)+')');
  await pg.goto(U+'#ajustes'); await pg.waitForTimeout(300); await pg.fill('#sKey','sk-ant-test'); await pg.click('#sKeySave'); await pg.waitForTimeout(300);
  await pg.click('#sKeyTest'); await pg.waitForTimeout(600); ok(/Funciona/.test(await pg.$eval('#sKeyMsg',e=>e.innerText)),'clave de API (mock)');
  await pg.fill('#bP','copia123'); const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#bExp')]); const bk=fs.readFileSync(await dl.path(),'utf8');
  ok(!/sk-ant/.test(bk)&&!/CuentaSecretaXYZ/.test(bk),'copia cifrada sin clave de API');
  await pg.click('#lockBtn'); await pg.waitForTimeout(500); ok(await pg.evaluate(()=>S===null),'bloqueo');
  await pg.fill('#gP','incorrecta'); await pg.click('#gGo'); await pg.waitForTimeout(2500); ok(await pg.evaluate(()=>S===null),'contraseña incorrecta rechazada');
  await pg.fill('#gP',PASS); await pg.click('#gGo'); await pg.waitForTimeout(2500); ok(await pg.evaluate(()=>!!S&&S.accounts.length>=2),'desbloqueo con contraseña');
  await pg.click('#lockBtn'); await pg.waitForTimeout(400); await pg.click('#gPk'); await pg.waitForTimeout(1500); ok(await pg.evaluate(()=>!!S),'desbloqueo con passkey');
  await pg.click('#lockBtn'); await pg.waitForTimeout(400); await pg.click('#gRec'); await pg.fill('#gR',rec.toLowerCase()); await pg.fill('#g1','otra frase segura 22'); await pg.fill('#g2','otra frase segura 22'); await pg.click('#gGo');
  await pg.waitForSelector('.reccode',{timeout:20000}); ok(true,'recuperación con clave'); await pg.check('#gOk'); await pg.click('#gNext'); await pg.waitForTimeout(300); if(await pg.$('#gSkip')) await pg.click('#gSkip');
  ok(await pg.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())),'service worker registrado');
  await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(800); ok(await pg.evaluate(()=>document.title==='MyFinZen'),'carga sin conexión'); await ctx.setOffline(false);
  ok(errs.length===0,'sin errores en consola'+(errs.length?': '+errs.join(' | '):''));
  await b.close(); srv.close(); console.log(failed?`\n${failed} prueba(s) fallida(s)`:'\nTodo OK'); process.exit(failed?1:0);
})().catch(e=>{ console.error(e); srv.close(); process.exit(1); });
