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
  // Conciliación entre cuentas
  for(const f of ['checking.csv','savings.csv']){ await pg.setInputFiles('#fCSV',path.join(FX,f)); await pg.waitForTimeout(300); await pg.selectOption('#mAcc','__new'); await pg.click('#mGo'); await pg.waitForTimeout(200); }
  const rc=await pg.evaluate(()=>{ const R=reconcile(); const cf=cashflowByMonth(); const t=S.tx.find(x=>x.desc==='CHASE CARDMEMBER SVC');
    return {st:R.stats,cat:t.cat,with:t.rec&&accName(t.rec.acc),sep:cf['2026-09'].cats['Hipoteca casa'],oct:cf['2026-10'].cats['Hipoteca casa'],keys:R.issues.map(i=>i.key.split(':')[0])}; });
  ok(rc.st.card===1&&rc.st.xfer===1&&rc.st.mort===2&&rc.cat==='Pago tarjeta'&&rc.with==='card','empareja pago de tarjeta, transferencia y cuotas ('+JSON.stringify(rc.st)+')');
  ok(rc.sep===4700&&rc.oct===4700,'hipoteca como cuota fija mensual aunque se pague adelantada ('+rc.sep+' / '+rc.oct+')');
  ok(rc.keys.includes('cardpay')&&!rc.keys.includes('mgap')&&!rc.keys.includes('mamt'),'aviso de pago a tarjeta no importada ('+rc.keys.join(',')+')');
  const rc2=await pg.evaluate(()=>{ const ch=S.accounts.find(a=>a.name==='checking'), m=S.accounts.find(a=>a.kind==='mortgage');
    upsertSnap(ch.id,'2026-08-31',10000); upsertSnap(ch.id,'2026-10-25',12300); upsertSnap(m.id,'2026-11-06',798500);
    S.tx.push({id:'dupx',date:'2026-10-01',desc:'PENNYMAC LOAN PAYMENT',amount:-4700,cat:'Hipoteca casa',acc:ch.id,src:'pdf'}); save();
    return reconcile().issues.map(i=>i.key.split(':')[0]); });
  ok(rc2.includes('bal')&&rc2.includes('mbal')&&rc2.includes('dup'),'saldos que no cuadran y duplicados ('+rc2.join(',')+')');
  await pg.goto(U+'#flujo'); await pg.waitForTimeout(400);
  if(process.env.SHOTS){ await pg.$eval('#recBox',e=>e.scrollIntoView()); await pg.screenshot({path:process.env.SHOTS+'/flujo-movil.png',fullPage:false}); }
  await pg.click('#recBox [data-ract^="del:"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!S.tx.some(t=>t.id==='dupx')),'borrar duplicado desde la conciliación');
  await pg.click('#recBox [data-rign^="bal:"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!reconcile().issues.some(i=>i.key.startsWith('bal:'))),'ignorar una diferencia');
  await pg.goto(U+'#resumen'); await pg.waitForTimeout(300); ok(/Conciliación/.test(await pg.$eval('#app',e=>e.innerText)),'aviso de conciliación en el resumen');
  // Noticias (terminal): la descarga pública se simula; el filtro de la cartera se hace en el navegador
  const ago=h=>new Date(Date.now()-h*3600e3).toISOString(); let newsHits=0;
  const NEWSFX={v:1,updated:ago(0.3),regions:[{id:'global',name:'Global'},{id:'us',name:'EE. UU.'},{id:'eu',name:'Europa'},{id:'es',name:'España'},{id:'gb',name:'Reino Unido',country:true},{id:'mx',name:'México',country:true},{id:'jp',name:'Japón',country:true}],
    universe:[{s:'VOO',n:'Vanguard S&P 500 ETF'},{s:'VXUS',n:'Vanguard Total International Stock ETF'},{s:'NFLX',n:'Netflix'}],
    feeds:[{id:'cnbc-top',region:'us',ok:true,n:3},{id:'gn-es',region:'es',ok:true,n:2},{id:'nasdaq-markets',region:'us',ok:false,n:0,err:'HTTP 403'}],tickers:{queried:50,ok:50,failed:0},
    items:[{t:'Wall Street cierra la semana con subidas en el S&P 500',u:'https://www.cnbc.com/2026/10/31/a.html',s:'CNBC',d:'cnbc.com',p:ago(1),r:['us','global']},
      {t:'Should you buy VOO before the end of the year?',u:'https://www.fool.com/x/voo',s:'The Motley Fool',d:'fool.com',p:ago(2),k:['VOO']},
      {t:'Netflix shares jump after strong subscriber growth',u:'https://finance.yahoo.com/news/nflx.html',s:'Yahoo Finance',d:'finance.yahoo.com',p:ago(3),r:['us']},
      {t:'El Ibex 35 cierra en máximos del año impulsado por la banca',u:'https://www.eleconomista.es/mercados/ibex.html',s:'elEconomista.es',d:'eleconomista.es',p:ago(1.5),r:['es']},
      {t:'El BCE mantiene los tipos de interés por tercera reunión',u:'https://www.europapress.es/economia/bce.html',s:'Europa Press',d:'europapress.es',p:ago(4),r:['es','eu']},
      {t:'FTSE 100 edges higher as Bank of England holds rates',u:'https://www.bbc.com/news/business-1',s:'BBC',d:'bbc.com',p:ago(2),r:['gb']},
      {t:'La Bolsa Mexicana avanza y el peso se aprecia frente al dólar',u:'https://www.eleconomista.com.mx/mercados/bmv',s:'El Economista México',d:'eleconomista.com.mx',p:ago(5),r:['mx']},
      {t:'Nikkei hits record as yen weakens against the dollar',u:'https://www.cnbc.com/2026/10/31/nikkei.html',s:'CNBC',d:'cnbc.com',p:ago(6),r:['jp']}]};
  await pg.route('https://raw.githubusercontent.com/**',r=>{ newsHits++; r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(NEWSFX)}); });
  await pg.goto(U+'#inversiones'); await pg.waitForTimeout(300); await pg.click('a.btn[href="#noticias"]'); await pg.waitForSelector('.term-row',{timeout:5000});
  const nv=await pg.evaluate(()=>({tab:S.settings.newsTab,rows:[...document.querySelectorAll('.term-row .hl')].map(a=>a.innerText),tk:[...document.querySelectorAll('.term-row .tk')].map(e=>e.innerText),nav:document.querySelector('nav a.on').getAttribute('href'),
    chips:[...document.querySelectorAll('[data-tk]')].map(b=>b.innerText.replace(/\s+/g,' ')),link:(a=>a&&{href:a.href,target:a.target,rel:a.rel})(document.querySelector('.term-row .hl'))}));
  ok(nv.tab==='cartera'&&nv.rows.length===2&&nv.tk.includes('VOO')&&nv.tk.includes('NFLX')&&nv.nav==='#inversiones','noticias de mis posiciones (símbolo del servidor + nombre detectado en el navegador) · '+nv.rows.length+' filas');
  ok(nv.link&&nv.link.target==='_blank'&&/noopener/.test(nv.link.rel)&&/^https:\/\/(www\.fool\.com|finance\.yahoo\.com)\//.test(nv.link.href),'enlace al medio que publica, en pestaña nueva');
  ok(newsHits===1&&nv.chips.some(c=>/^VXUS\s*0$/.test(c)),'una sola descarga pública, igual para todos ('+nv.chips.join(' | ')+')');
  if(process.env.SHOTS){ await pg.screenshot({path:process.env.SHOTS+'/noticias-movil.png'}); }
  await pg.click('[data-ntab="es"]'); await pg.waitForTimeout(150);
  ok(await pg.$$eval('.term-row .hl',a=>a.length===2&&a.every(x=>/Ibex|BCE/.test(x.innerText))),'pestaña España');
  await pg.keyboard.press('6'); await pg.waitForTimeout(150);
  const p1=await pg.$$eval('.term-row .hl',a=>a.map(x=>x.innerText)); await pg.click('[data-cty="mx"]'); await pg.waitForTimeout(150); const p2=await pg.$$eval('.term-row .hl',a=>a.map(x=>x.innerText));
  ok(p1.length===3&&p2.length===2&&!p2.some(x=>/Mexicana/.test(x))&&await pg.evaluate(()=>!S.settings.newsCountries.includes('mx')),'países seleccionables (atajo 6) y se recuerdan');
  await pg.click('[data-ntab="us"]'); await pg.fill('#tQ','netflix'); await pg.waitForTimeout(300);
  ok(await pg.$$eval('.term-row .hl',a=>a.length===1&&/Netflix/.test(a[0].innerText)),'filtro de titulares');
  await pg.fill('#tQ',''); await pg.waitForTimeout(250); await pg.click('.term-row .x[data-hide="cnbc.com"]'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>S.settings.newsHide.includes('cnbc.com')&&![...document.querySelectorAll('.term-row')].some(r=>/cnbc\.com/.test(r.innerText))),'ocultar una fuente');
  await pg.click('#tFoot summary'); await pg.click('[data-unhide="cnbc.com"]'); await pg.waitForTimeout(150); ok(await pg.evaluate(()=>!S.settings.newsHide.length),'recuperar una fuente oculta');
  if(process.env.SHOTS){ await pg.setViewportSize({width:1200,height:900}); await pg.click('[data-ntab="cartera"]'); await pg.waitForTimeout(200); await pg.screenshot({path:process.env.SHOTS+'/noticias-escritorio.png'}); await pg.click('[data-ntab="paises"]'); await pg.waitForTimeout(150); await pg.screenshot({path:process.env.SHOTS+'/noticias-paises-escritorio.png'}); await pg.setViewportSize({width:412,height:900}); await pg.click('[data-ntab="us"]'); await pg.waitForTimeout(150); await pg.screenshot({path:process.env.SHOTS+'/noticias-us-movil.png'}); }
  if(process.env.SHOTS){ await pg.setViewportSize({width:1200,height:900}); await pg.goto(U+'#flujo'); await pg.waitForTimeout(500); await pg.$eval('#recBox',e=>e.scrollIntoView()); await pg.screenshot({path:process.env.SHOTS+'/flujo-escritorio.png'}); await pg.goto(U+'#hipotecas'); await pg.waitForTimeout(400); await pg.screenshot({path:process.env.SHOTS+'/hipotecas-escritorio.png'}); await pg.setViewportSize({width:412,height:900}); }
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
