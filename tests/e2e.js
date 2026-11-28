// Pruebas end-to-end de MyFinZen con Playwright (Chromium).
// Cubre: alta de bóveda, passkey (autenticador virtual con PRF), cifrado en IndexedDB,
// importación de PDFs/CSVs, clave de API (mock), copia cifrada, bloqueo, recuperación y modo offline.
// Uso: npm i && npx playwright install chromium && npm run fixtures && npm test
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..'), FX=path.join(__dirname,'fixtures'), PORT=8899;
const types={'.html':'text/html','.js':'application/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(ROOT,f);if(!fp.startsWith(ROOT)||!fs.existsSync(fp)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':types[path.extname(fp)]||'text/plain'});fs.createReadStream(fp).pipe(r);}).listen(PORT);
let failed=0; const ok=(c,m)=>{ console.log((c?'✓ ':'✗ ')+m); if(!c) failed++; };
// Respuesta "envenenada" de Claude, como si el texto de un PDF hubiera intentado manipularla
const EVIL={doc_type:'bank_statement',institution:'<img src=x onerror="window.__pwn=1">',account_kind:'cash',period_end:'2026-10-12"><img src=x onerror="window.__pwn=2">',ending_balance:'1"><img src=x onerror="window.__pwn=3">',
  transactions:[{date:'<img src=x onerror="window.__pwn=4">',description:'x',amount:5},{date:'2026-10-01',description:'<img src=x onerror="window.__pwn=5">',amount:-10},{date:'2026-10-02',description:'y',amount:'9"><img src=x>'}],tax_forms:[]};
// Ticket de restaurante leído de una foto (inventado), también con intentos de inyección
const TICKET={place:'<img src=x onerror="window.__pwn=20">Bistró Prueba',date:'2026-11-27',currency:'usd',guests:4,subtotal:55,discount:null,tax:5.09,service:null,tip:null,total:60.09,
  items:[{name:'Hamburguesa Prueba',qty:1,price:18.5},{name:'Ensalada Prueba',qty:1,price:14},{name:'Cerveza Prueba',qty:2,price:16},{name:'<img src=x onerror="window.__pwn=21">',qty:1,price:6.5},{name:'Malo',qty:1,price:'12"><img src=x>'}]};
const RECEIPT_REQ=[];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:900},locale:'es-ES'}); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>{ errs.push(e.message); console.log('PAGEERR',e.stack); }); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const cdp=await ctx.newCDPSession(pg); await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,hasPrf:true,automaticPresenceSimulation:true}});
  await pg.route('https://api.anthropic.com/**',r=>{ const body=JSON.parse(r.request().postData());
    const ct=body.messages&&body.messages[0]&&body.messages[0].content;
    if(Array.isArray(ct)&&ct.some(c=>c.type==='text'&&/^You read restaurant receipts/.test(c.text))){ RECEIPT_REQ.push(r.request().postData()); return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:'```json\n'+JSON.stringify(TICKET)+'\n```'}],stop_reason:'end_turn'})}); }
    const prompt=String(body.messages&&body.messages[0]&&body.messages[0].content||'');
    if(!body.stream&&prompt.startsWith('You extract data')) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify(EVIL)}],stop_reason:'end_turn'})});
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
  // Cuentas → Importar: sin pestaña propia en el menú; la primera cuenta se crea desde un extracto
  await pg.goto(U+'#cuentas'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!document.querySelector('nav a[href="#importar"]')&&!!document.querySelector('#fFirst')&&!!document.querySelector('.tabs-inline a[href="#importar"]')),'Importar está dentro de Cuentas');
  await pg.setInputFiles('#fFirst',path.join(FX,'checking.csv')); await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>location.hash==='#importar'&&document.querySelector('nav a.on').getAttribute('href')==='#cuentas'&&document.querySelector('#mAcc').value==='__new'),'primera cuenta desde un extracto ("cuenta nueva" preseleccionada)');
  await pg.click('#mCancel');
  await pg.evaluate(()=>{ S.accounts.push({id:'m1',kind:'brokerage',name:'CuentaSecretaXYZ',institution:'M1 Finance'}); save(); }); await pg.waitForTimeout(600);
  ok(!/CuentaSecretaXYZ/.test(await pg.evaluate(()=>IDB.get('vault').then(v=>JSON.stringify(v)))),'IndexedDB sin texto en claro');
  await pg.goto(U+'#importar'); await pg.waitForTimeout(300);
  await pg.setInputFiles('#fCSV',path.join(FX,'Holdings-Oct-30-2026.csv')); await pg.waitForTimeout(300);
  ok(/3 posiciones/.test(await pg.$eval('#impOut',e=>e.innerText)),'CSV de Holdings'); await pg.click('#hOk');
  await pg.setInputFiles('#fCSV',path.join(FX,'card.csv')); await pg.waitForTimeout(300); ok(/3 movimientos/.test(await pg.$eval('#impOut',e=>e.innerText)),'CSV de tarjeta'); await pg.click('#mGo');
  await pg.setInputFiles('#fPDF',path.join(FX,'mortgage.pdf')); await pg.waitForTimeout(2000);
  ok(/Hipoteca detectada/.test(await pg.$eval('#impOut h2',e=>e.innerText))&&await pg.$eval('#pB',e=>e.value)==='800000','PDF de hipoteca (no confundido con impuestos)'); await pg.click('#pOk');
  await pg.setInputFiles('#fPDF',path.join(FX,'bank.pdf')); await pg.waitForSelector('#gV',{timeout:15000});
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
  await pg.goto(U+'#resumen'); await pg.waitForTimeout(300); ok(/Conciliación/.test(await pg.$eval('#alertBox',e=>e.textContent))&&/por revisar/.test(await pg.$eval('#alertBox summary',e=>e.innerText)),'aviso de conciliación en el resumen (plegado en una línea)');
  // Noticias: la descarga pública se simula; el filtro de la cartera se hace en el navegador
  const ago=h=>new Date(Date.now()-h*3600e3).toISOString(); let newsHits=0;
  const NEWSFX={v:1,updated:ago(0.3),regions:[{id:'global',name:'Global'},{id:'us',name:'EE. UU.'},{id:'eu',name:'Europa'},{id:'es',name:'España'},{id:'gb',name:'Reino Unido',country:true},{id:'mx',name:'México',country:true},{id:'jp',name:'Japón',country:true}],
    universe:[{s:'VOO',n:'Vanguard S&P 500 ETF'},{s:'VXUS',n:'Vanguard Total International Stock ETF'},{s:'NFLX',n:'Netflix'}],
    feeds:[{id:'cnbc-top',region:'us',ok:true,n:3},{id:'gn-es',region:'es',ok:true,n:2},{id:'nasdaq-markets',region:'us',ok:false,n:0,err:'HTTP 403'}],tickers:{queried:50,ok:50,failed:0},
    items:[{t:'Wall Street cierra la semana con subidas en el S&P 500',u:'https://www.cnbc.com/2026/10/31/a.html',s:'CNBC',d:'cnbc.com',p:ago(1),r:['us','global'],i:2,n:3,o:[{s:'AP News',u:'https://apnews.com/article/ws',d:'apnews.com'},{s:'NPR',u:'https://www.npr.org/2026/10/31/ws',d:'npr.org'}]},
      {t:'Vanguard S&P 500 ETF draws record inflows as investors pile into index funds',u:'https://apnews.com/article/voo',s:'AP News',d:'apnews.com',p:ago(2),k:['VOO'],i:1},
      {t:'Netflix shares jump after strong subscriber growth',u:'https://www.cnbc.com/2026/10/31/nflx.html',s:'CNBC',d:'cnbc.com',p:ago(1.2),r:['us'],i:1},
      {t:'Starbucks names new head of its China business',u:'https://www.npr.org/2026/10/31/sbux',s:'NPR',d:'npr.org',p:ago(2.5),r:['us'],i:0},
      {t:'El Ibex 35 cierra en máximos del año impulsado por la banca',u:'https://www.eleconomista.es/mercados/ibex.html',s:'elEconomista.es',d:'eleconomista.es',p:ago(1.5),r:['es'],i:1},
      {t:'El BCE mantiene los tipos de interés por tercera reunión',u:'https://www.europapress.es/economia/bce.html',s:'Europa Press',d:'europapress.es',p:ago(4),r:['es','eu'],i:2},
      {t:'FTSE 100 edges higher as Bank of England holds rates',u:'https://www.theguardian.com/business/ftse',s:'The Guardian',d:'theguardian.com',p:ago(2),r:['gb'],i:2},
      {t:'La Bolsa Mexicana avanza y el peso se aprecia frente al dólar',u:'https://www.eleconomista.com.mx/mercados/bmv',s:'El Economista México',d:'eleconomista.com.mx',p:ago(5),r:['mx'],i:1},
      {t:'Nikkei hits record as yen weakens against the dollar',u:'https://www.cnbc.com/2026/10/31/nikkei.html',s:'CNBC',d:'cnbc.com',p:ago(6),r:['jp'],i:1},
      {t:'CalPERS boosts its stake in green bonds as Sacramento weighs new rules',u:'https://calmatters.org/economy/calpers',s:'CalMatters',d:'calmatters.org',p:ago(7),r:['us'],i:1}]};
  const dd=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10); const RS=(v,a)=>({d:dd(1),v,ad:dd(29),a});
  const RATESFX={v:1,updated:new Date().toISOString(),series:{OBMMIC30YF:{...RS(6.30,6.45),h:[[dd(300),6.9],[dd(150),6.6],[dd(1),6.3]]},OBMMIC15YF:RS(5.60,5.70),OBMMIJUMBO30YF:RS(6.55,6.60),OBMMIFHA30YF:RS(6.05,6.20),OBMMIVA30YF:RS(5.85,5.95),MORTGAGE30US:{...RS(6.22,6.30),h:[[dd(302),6.8],[dd(152),6.5],[dd(3),6.22]]},MORTGAGE15US:RS(5.45,5.50),
    OBMMIC30YFLVLE80FGE740:RS(6.25,6.40),OBMMIC30YFLVLE80FB720A739:RS(6.35,6.5),OBMMIC30YFLVLE80FB700A719:RS(6.45,6.5),OBMMIC30YFLVLE80FB680A699:RS(6.60,6.7),OBMMIC30YFLVLE80FLT680:RS(6.80,6.9),
    OBMMIC30YFLVGT80FGE740:RS(6.40,6.5),OBMMIC30YFLVGT80FB720A739:RS(6.48,6.5),OBMMIC30YFLVGT80FB700A719:RS(6.55,6.6),OBMMIC30YFLVGT80FB680A699:RS(6.70,6.8),OBMMIC30YFLVGT80FLT680:RS(6.95,7),
    'BAD<img src=x>':RS(5,5),MALO:{d:'ayer',v:4},ABSURDO:{d:dd(1),v:99}}};
  await pg.route('https://raw.githubusercontent.com/**',r=>{ const rt=/rates\.json/.test(r.request().url()); if(!rt) newsHits++; r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(rt?RATESFX:NEWSFX)}); });
  await pg.goto(U+'#inversiones'); await pg.waitForTimeout(300); await pg.click('a.btn[href="#noticias"]'); await pg.waitForSelector('.nw',{timeout:5000});
  const nv=await pg.evaluate(()=>({tab:S.settings.newsTab,rows:[...document.querySelectorAll('.nw .nw-t')].map(a=>a.innerText),tk:[...document.querySelectorAll('.nw .tk')].map(e=>e.innerText),nav:document.querySelector('nav a.on').getAttribute('href'),
    chips:[...document.querySelectorAll('[data-tk]')].map(b=>b.innerText.replace(/\s+/g,' ')),link:(a=>a&&{href:a.href,target:a.target,rel:a.rel})(document.querySelector('.nw .nw-t'))}));
  ok(nv.tab==='cartera'&&nv.rows.length===2&&nv.tk.includes('VOO')&&nv.tk.includes('NFLX')&&nv.nav==='#inversiones','noticias de mis posiciones (símbolo del servidor + nombre detectado en el navegador) · '+nv.rows.length+' filas');
  ok(nv.link&&nv.link.target==='_blank'&&/noopener/.test(nv.link.rel)&&/^https:\/\/(apnews\.com|www\.cnbc\.com)\//.test(nv.link.href),'enlace al medio que publica, en pestaña nueva');
  ok(newsHits===1&&nv.chips.some(c=>/^VXUS\s*0$/.test(c)),'una sola descarga pública, igual para todos ('+nv.chips.join(' | ')+')');
  if(process.env.SHOTS){ await pg.screenshot({path:process.env.SHOTS+'/noticias-movil.png'}); }
  await pg.click('[data-ntab="es"]'); await pg.waitForTimeout(150);
  ok(await pg.$$eval('.nw .nw-t',a=>a.length===2&&a.every(x=>/Ibex|BCE/.test(x.innerText))),'pestaña España');
  ok(await pg.evaluate(()=>{ const r=[...document.querySelectorAll('.nw')].map(n=>({t:n.querySelector('.nw-t').innerText,tp:n.querySelector('.ntp').innerText.trim(),o:(n.querySelector('.nrg')||{}).innerText||'',logo:n.querySelector('.nlogo').innerText}));
    const ib=r.find(x=>/Ibex/.test(x.t)), bce=r.find(x=>/BCE/.test(x.t)); return ib.tp==='Mercados'&&/🇪🇸\s*España/.test(ib.o)&&ib.logo==='EL'&&bce.tp==='Economía'&&/España/.test(bce.o); }),'noticias con tema, origen y logo del medio');
  ok(await pg.evaluate(()=>[...document.querySelectorAll('[data-topic]')].map(b=>b.dataset.topic).join()==='all,economia,mercados'),'chips de tema con los que hay');
  await pg.click('[data-topic="economia"]'); await pg.waitForTimeout(150); ok(await pg.$$eval('.nw .nw-t',a=>a.length===1&&/BCE/.test(a[0].innerText)),'filtrar por tema');
  await pg.click('[data-topic="all"]'); await pg.click('[data-ntab="us"]'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>{ const n=[...document.querySelectorAll('.nw')].find(x=>/CalPERS/.test(x.innerText)); return n&&/California/.test(n.querySelector('.nrg').innerText)&&!!document.querySelector('.nday'); }),'origen California y titulares agrupados por día');
  await pg.click('[data-ntab="es"]'); await pg.waitForTimeout(150);
  await pg.keyboard.press('6'); await pg.waitForTimeout(150);
  const p1=await pg.$$eval('.nw .nw-t',a=>a.map(x=>x.innerText)); await pg.click('[data-cty="mx"]'); await pg.waitForTimeout(150); const p2=await pg.$$eval('.nw .nw-t',a=>a.map(x=>x.innerText));
  ok(p1.length===3&&p2.length===2&&!p2.some(x=>/Mexicana/.test(x))&&await pg.evaluate(()=>!S.settings.newsCountries.includes('mx')),'países seleccionables (atajo 6) y se recuerdan');
  // Hipotecas: tipos de hoy (rates.json de la rama news) y calculadora
  await pg.goto(U+'#hipotecas'); await pg.waitForSelector('#mRates .rtab',{timeout:5000}); await pg.waitForTimeout(150);
  const rt=await pg.evaluate(()=>({rows:[...document.querySelectorAll('#mRates .rtab tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')),txt:$('#mRates').innerText,keys:Object.keys(RATES.data.series),chart:!!document.querySelector('#rChart svg'),mine:document.querySelectorAll('#mRates .rlist li').length}));
  ok(rt.rows.length===5&&/^740\+ 6\.25% ▼0\.15 6\.40% ▼0\.10/.test(rt.rows[0])&&/Jumbo 30 años\s+6\.55%/.test(rt.txt)&&/Hasta \$832,750/.test(rt.txt)&&/Hasta \$1,249,125/.test(rt.txt)&&rt.chart&&!rt.keys.some(k=>/BAD|MALO|ABSURDO/.test(k)),'tipos de hoy por FICO y entrada, otros productos, límites de California, gráfico y datos validados ('+rt.rows[0]+')');
  ok(/Tus hipotecas frente a hoy/.test(rt.txt)&&rt.mine>=4,'compara tus hipotecas con el tipo de hoy');
  const mc=async(sel,v)=>{ await pg.fill(sel,String(v)); await pg.waitForTimeout(80); return pg.evaluate(()=>({out:$('#mcOut').innerText.replace(/\s+/g,' '),c:{...S.settings.mortCalc}})); };
  await pg.fill('#mcRate',''); await mc('#mcPrice',1000000); let c1=await mc('#mcDown',200000);
  const pi=(L,r)=>{ const i=r/100/12; return L*i/(1-Math.pow(1+i,-360)); }; const f2=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  ok(c1.out.includes(f2(pi(800000,6.25)))&&/Conforme · LTV 80%/.test(c1.out)&&/6\.250%/.test(c1.out)&&!/PMI/.test(c1.out),'calculadora: préstamo conforme con el tipo de hoy para FICO 740+ y 20% de entrada ('+f2(pi(800000,6.25))+')');
  c1=await mc('#mcDown',100000);
  ok(c1.out.includes(f2(pi(900000,6.40)))&&/importe alto/.test(c1.out)&&/PMI/.test(c1.out),'más de $832,750 en un condado de alto coste: high-balance, tipo con menos del 20% y PMI');
  await pg.selectOption('#mcLim','832750'); await pg.waitForTimeout(80); c1=await pg.evaluate(()=>$('#mcOut').innerText.replace(/\s+/g,' '));
  ok(c1.includes(f2(pi(900000,6.55)))&&/jumbo/i.test(c1)&&!/PMI \(/.test(c1),'con el límite general pasa a jumbo con su tipo');
  c1=await mc('#mcRate',7);
  ok(c1.out.includes(f2(pi(900000,7)))&&/el que has escrito/.test(c1.out)&&c1.c.rate===7&&c1.c.limit===832750,'un tipo escrito a mano manda y todo se recuerda');
  ok(await pg.evaluate(()=>{ const k=sanitizeState(JSON.parse(JSON.stringify(S))).settings.mortCalc; return k.price===1000000&&k.down===100000&&k.rate===7&&k.fico==='GE740'; }),'la calculadora se guarda en la bóveda');
  await pg.fill('#mcRate',''); await pg.selectOption('#mcLim','1249125'); await pg.fill('#mcDown','200000'); await pg.waitForTimeout(80);
  if(process.env.SHOTS){ await pg.screenshot({path:process.env.SHOTS+'/hipotecas-calc-movil.png',fullPage:true}); }
  await pg.goto(U+'#noticias'); await pg.waitForSelector('.nw',{timeout:5000});
  // Impacto, medios que publican la misma noticia y aprendizaje de preferencias
  await pg.click('[data-ntab="us"]'); await pg.waitForTimeout(150);
  const us1=await pg.evaluate(()=>{ const r=[...document.querySelectorAll('.nw')]; const ws=r.find(n=>/Wall Street/.test(n.innerText));
    return {titles:r.map(n=>n.querySelector('.nw-t').innerText),imp:!!ws.querySelector('.nimp'),cor:(ws.querySelector('.ncor')||{}).innerText||'',also:[...ws.querySelectorAll('.nalso a')].map(a=>a.innerText+'|'+a.target).join(),low:($('#tLow')||{}).innerText||''}; });
  ok(!us1.titles.some(t=>/Starbucks/.test(t))&&us1.imp&&/3 medios/.test(us1.cor)&&us1.also==='AP News|_blank,NPR|_blank'&&/Ver 1 de menor impacto/.test(us1.low),'alto impacto, "3 medios" con enlaces a los demás y lo de menor impacto plegado ('+JSON.stringify(us1)+')');
  await pg.click('#tLow'); await pg.waitForTimeout(100); ok(await pg.$$eval('.nw .nw-t',a=>a.some(x=>/Starbucks/.test(x.innerText))),'mostrar las de menor impacto'); await pg.click('#tLow'); await pg.waitForTimeout(100);
  const firstUS=()=>pg.evaluate(()=>{ const s=NEWS.shown, a=s.findIndex(x=>/Netflix/.test(x.t)), b=s.findIndex(x=>/Wall Street/.test(x.t)); return new Date(s[a].p).toDateString()!==new Date(s[b].p).toDateString()?'otro día':a<b?'netflix':'wall'; });
  const before=await firstUS();
  await pg.evaluate(()=>{ const a=[...document.querySelectorAll('.nw-t')].find(x=>/Netflix/.test(x.innerText)); a.addEventListener('click',e=>e.preventDefault(),{once:true}); a.click(); });
  ok(await pg.evaluate(()=>{ const P=S.settings.newsPrefs; return P.pend&&/Netflix/.test(P.pend.t)&&P.w['t:empresas']>0&&P.w['s:cnbc.com']>0&&!$('#nfb'); }),'abrir una noticia queda pendiente de valorar y cuenta un poco a su favor');
  await pg.evaluate(()=>{ S.settings.newsPrefs.pend.at-=5000; document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForSelector('#nfb',{timeout:3000});
  ok(await pg.evaluate(()=>/relevante/.test($('#nfb').innerText)&&/Netflix/.test($('#nfb .nfb-t').innerText)),'al volver pregunta si la noticia ha sido relevante');
  await pg.click('#nfb [data-fb="1"]'); await pg.waitForTimeout(150);
  const fb=await pg.evaluate(()=>{ const P=S.settings.newsPrefs; const n=[...document.querySelectorAll('.nw')].find(x=>/Netflix/.test(x.innerText));
    return {gone:!$('#nfb'),n:P.n,pend:P.pend,rated:P.rated['https://www.cnbc.com/2026/10/31/nflx.html'],fy:!!n.querySelector('.nfy'),thumb:!!n.querySelector('.nrated.up'),kept:sanitizeState(JSON.parse(JSON.stringify(S))).settings.newsPrefs.n}; });
  const after=await firstUS();
  ok(fb.gone&&fb.n===1&&fb.pend===null&&fb.rated===1&&fb.fy&&fb.thumb&&fb.kept===1&&before!=='netflix'&&(after==='netflix'||after==='otro día'),'"Sí, relevante" aprende: "Para ti" y la sube dentro del día ('+before+' → '+after+')');
  await pg.click('[data-nsort="rec"]'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>S.settings.newsSort==='rec'&&NEWS.shown.every((x,i,a)=>!i||a[i-1].p>=x.p)),'orden "Recientes" por hora'); await pg.click('[data-nsort="para"]'); await pg.waitForTimeout(100);
  await pg.click('#tLow'); await pg.evaluate(()=>{ const a=[...document.querySelectorAll('.nw-t')].find(x=>/Starbucks/.test(x.innerText)); a.addEventListener('click',e=>e.preventDefault(),{once:true}); a.click(); S.settings.newsPrefs.pend.at-=5000; window.dispatchEvent(new Event('focus')); });
  await pg.waitForSelector('#nfb',{timeout:3000}); await pg.click('#nfb [data-fb="-1"]'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>{ const P=S.settings.newsPrefs; return P.n===2&&P.rated['https://www.npr.org/2026/10/31/sbux']===-1&&P.w['w:starbucks']<0; }),'"No me interesa" también aprende');
  await pg.click('#tLow'); await pg.click('#tFoot #tPrefs summary'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>{ const t=$('#tPrefs').innerText; return /2 valoraciones/.test(t)&&/Te interesa: .*Empresas/.test(t)&&/Te interesa menos: .*«starbucks»/.test(t); }),'"Lo que ha aprendido" lo muestra');
  await pg.click('#tPrefReset'); await pg.click('#tPrefReset'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>{ const P=S.settings.newsPrefs; return P.n===0&&!Object.keys(P.w).length&&!Object.keys(P.rated).length; }),'olvidar lo aprendido');
  await pg.click('[data-ntab="us"]'); await pg.fill('#tQ','netflix'); await pg.waitForTimeout(300);
  ok(await pg.$$eval('.nw .nw-t',a=>a.length===1&&/Netflix/.test(a[0].innerText)),'filtro de titulares');
  await pg.fill('#tQ',''); await pg.waitForTimeout(250); await pg.click('.nw .x[data-hide="cnbc.com"]'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>S.settings.newsHide.includes('cnbc.com')&&![...document.querySelectorAll('.nw')].some(r=>/cnbc\.com/.test(r.innerText))),'ocultar una fuente');
  await pg.click('#tFoot summary'); await pg.click('[data-unhide="cnbc.com"]'); await pg.waitForTimeout(150); ok(await pg.evaluate(()=>!S.settings.newsHide.length),'recuperar una fuente oculta');
  if(process.env.SHOTS){ await pg.setViewportSize({width:1200,height:900}); await pg.click('[data-ntab="cartera"]'); await pg.waitForTimeout(200); await pg.screenshot({path:process.env.SHOTS+'/noticias-escritorio.png'}); await pg.click('[data-ntab="paises"]'); await pg.waitForTimeout(150); await pg.screenshot({path:process.env.SHOTS+'/noticias-paises-escritorio.png'}); await pg.setViewportSize({width:412,height:900}); await pg.click('[data-ntab="us"]'); await pg.waitForTimeout(150); await pg.screenshot({path:process.env.SHOTS+'/noticias-us-movil.png'}); }
  // Iconos de ayuda, manual y categorías propias
  await pg.setViewportSize({width:412,height:900}); await pg.goto(U+'#resumen'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>{ const ks=[...new Set([...document.documentElement.outerHTML.matchAll(/data-help="([a-z_]+)"/g)].map(m=>m[1]))]; return ks.length>=5&&ks.every(k=>HELP[k]&&HELP[k].es&&HELP[k].en)?true:ks.join(','); })===true,'iconos de ayuda con texto en los dos idiomas');
  await pg.click('#app .ib'); await pg.waitForTimeout(200); ok(await pg.$eval('#modal',e=>/Cómo usarlo/.test(e.innerText)),'ayuda de una sección');
  await pg.click('#hMan'); await pg.waitForTimeout(400); ok(await pg.evaluate(()=>location.hash==='#ayuda'&&!!document.getElementById('man-rec')&&/Primeros pasos/.test(document.body.innerText)),'manual de usuario');
  await pg.goto(U+'#flujo'); await pg.waitForTimeout(300); await pg.click('#catMgr'); await pg.click('#ucAdd'); await pg.fill('#ncN','Mascotas'); await pg.click('#ncOk'); await pg.waitForTimeout(200); await pg.click('#ucClose'); await pg.waitForTimeout(300);
  // Movimientos agrupados por día; tocar uno abre su ficha para cambiar la categoría
  await pg.click('#txList .txr >> nth=0'); await pg.waitForTimeout(150);
  ok(await pg.$eval('#tsCat',e=>e.options.length>20),'ficha del movimiento con todas las categorías');
  await pg.selectOption('#tsCat','Mascotas'); await pg.waitForTimeout(200); if(await pg.$('#rNo')) await pg.click('#rNo'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>catType('Mascotas')==='expense'&&S.tx.some(t=>t.cat==='Mascotas'&&t.manual)&&[...document.querySelectorAll('#fCat option')].some(o=>o.value==='Mascotas')),'categoría propia creada y usada');
  ok(await pg.evaluate(()=>{ const hs=[...document.querySelectorAll('.txday-h')]; const l=document.querySelector('#txList'); return hs.length>=2&&hs.every(h=>h.innerText.trim().length>2)&&document.documentElement.scrollWidth<=window.innerWidth+1&&l.scrollWidth<=l.clientWidth+1; }),'movimientos por día sin desbordar en el móvil');
  const nTx=await pg.evaluate(()=>S.tx.length); await pg.click('#txList .txr >> nth=0'); await pg.click('#tsDel'); await pg.waitForTimeout(200); ok(await pg.evaluate(n=>S.tx.length===n-1,nTx),'borrar un movimiento desde su ficha');
  // Orden de Movimientos: gasto por categoría, ingresos/gastos/ahorro y después la lista
  ok(await pg.evaluate(()=>{ const y=e=>e.getBoundingClientRect().top+window.scrollY; const cat=document.querySelector('[data-help="cat_chart"]').closest('.card'), cf=document.querySelector('#cCF').closest('.card'), l=document.querySelector('#txList'); return y(cat)<y(cf)&&y(cf)<y(l); }),'Movimientos: categorías, luego ingresos y gastos, luego la lista');
  // Categorías automáticas: palabras completas, sin el nombre del titular; si no está claro, "Otros" y aviso
  const cz=await pg.evaluate(()=>[categorize('ZELLE PAYMENT TO PEDRO TARCOS',-50),categorize('ACME DES:PAYROLL ID:123 INDN:PEDRO TARCOS CO ID:9 PPD',4000),categorize('ARCO #42123 ANYTOWN CA',-45),categorize('COSTCO GAS #0453',-60),categorize('COSTCO WHSE #0453',-200),categorize('T-MOBILE AUTO PAY',-90),categorize('MOBILE DEPOSIT',300),categorize('SOME UNKNOWN LLC',-30),categorize('TST* JOES TACOS',-20),categorize('Zelle payment from TENANT for "May rent"',2500)]);
  ok(cz.join('|')==='Transferencia|Nómina|Gasolina|Gasolina|Supermercado|Suministros|||Restaurantes|Renta alquiler','categorías automáticas por palabras completas ('+cz.join('|')+')');
  await pg.evaluate(()=>{ const a=S.accounts.find(x=>x.kind==='cash'); importTxInto(a.id,[{date:'2026-10-21',desc:'SOME UNKNOWN LLC',amount:-30},{date:'2026-10-22',desc:'ANOTHER MYSTERY SHOP',amount:-12}],'csv'); save(); });
  await pg.goto(U+'#resumen'); await pg.waitForTimeout(300); await pg.click('#alertBox summary'); await pg.waitForTimeout(100);
  await pg.locator('#alertBox .ab',{hasText:'sin categoría'}).click(); await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>location.hash==='#flujo'&&flujoFilter.cat==='__none'&&document.querySelectorAll('#txList .txr').length>=2&&[...document.querySelectorAll('#txList .txr')].every(r=>r.classList.contains('unc'))),'aviso de movimientos sin categoría lleva a revisarlos');
  const order=()=>pg.evaluate(()=>[...document.querySelectorAll('#txList .txr')].map(b=>S.tx.find(t=>t.id===b.dataset.tx)).map(t=>({d:t.date,a:Math.abs(t.amount)})));
  await pg.selectOption('#fSort','amt_desc'); await pg.waitForTimeout(250); let o=await order();
  ok(o.length>=2&&o.every((x,i)=>!i||o[i-1].a>=x.a)&&!(await pg.$('#txList .txday-h'))&&await pg.evaluate(()=>flujoFilter.cat==='__none'&&/\d{4}/.test(document.querySelector('#txList .txr .lm span').innerText)),'sin categoría: ordenar por importe (con fecha en cada fila)');
  await pg.selectOption('#fSort','amt_asc'); await pg.waitForTimeout(250); o=await order(); ok(o.every((x,i)=>!i||o[i-1].a<=x.a),'ordenar por importe de menor a mayor');
  await pg.selectOption('#fSort','date_asc'); await pg.waitForTimeout(250); o=await order(); ok(o.every((x,i)=>!i||o[i-1].d<=x.d)&&!!(await pg.$('#txList .txday-h')),'ordenar por fecha, más antigua primero');
  await pg.selectOption('#fSort','date_desc'); await pg.waitForTimeout(250);
  await pg.click('#txList .txr >> nth=0'); await pg.selectOption('#tsCat','Compras'); await pg.waitForTimeout(150); if(await pg.$('#rNo')) await pg.click('#rNo'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>S.tx.filter(isUncat).length>=1&&S.tx.some(t=>t.cat==='Compras'&&t.manual&&/UNKNOWN|MYSTERY/.test(t.desc))),'asignar la categoría a mano');
  ok(await pg.evaluate(()=>{ const keep=S.rules.slice(), cv=S.settings.catVer; S.settings.catVer=0; S.rules=[{pattern:OLD_DEFAULT_PATTERNS[8],cat:'Gasolina'},{pattern:'MIREGLA',cat:'Ocio'}]; const t={id:'migr1',date:'2026-10-01',desc:'ZELLE TO PEDRO TARCOS',amount:-5,cat:'Gasolina',acc:null,src:'csv'}; S.tx.push(t);
    migrateCats(); const ok=S.rules.length===1&&S.rules[0].pattern==='MIREGLA'&&t.cat==='Transferencia'&&S.settings.catVer===2; S.tx=S.tx.filter(x=>x!==t); S.rules=keep; S.settings.catVer=cv; save(); return ok; }),'migración: quita las reglas antiguas y recategoriza');
  // Avisos: la × los ignora y se pueden volver a mostrar; tocar uno lleva a su sitio
  await pg.goto(U+'#resumen'); await pg.waitForTimeout(300); await pg.click('#alertBox summary'); await pg.waitForTimeout(100);
  const nA=await pg.$$eval('#alertBox [data-aign]',x=>x.length);
  await pg.click('#alertBox [data-aign] >> nth=0'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(n=>document.querySelectorAll('#alertBox [data-aign]').length===n-1&&S.settings.alertIgnore.length===1&&!!document.querySelector('#aRestore'),nA),'ignorar un aviso');
  await pg.click('#aRestore'); await pg.waitForTimeout(200); ok(await pg.evaluate(n=>document.querySelectorAll('#alertBox [data-aign]').length===n&&!S.settings.alertIgnore.length,nA),'volver a mostrar los avisos ignorados');
  if(await pg.$('#alertBox .ab:has-text("Conciliación")')){ await pg.click('#alertBox .ab:has-text("Conciliación")'); await pg.waitForTimeout(300); ok(await pg.evaluate(()=>location.hash==='#flujo'&&!!document.querySelector('#recBox')),'aviso de conciliación lleva a Movimientos'); }
  await pg.goto(U+'#flujo'); await pg.waitForTimeout(300);
  // Menú lateral y botón +
  await pg.click('#menuBtn'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>document.body.classList.contains('menu-open')&&[...document.querySelectorAll('#nav > a')].map(a=>a.getAttribute('href')).join()==='#resumen,#flujo,#cuentas,#inversiones,#hipotecas,#impuestos,#calendario'&&[...document.querySelectorAll('#navMore a')].map(a=>a.getAttribute('href')).join()==='#dividir,#alquiler,#claude,#ayuda,#ajustes'),'menú lateral con el orden pedido y "Más"');
  await pg.click('#nav a[href="#cuentas"]'); await pg.waitForTimeout(300); ok(await pg.evaluate(()=>!document.body.classList.contains('menu-open')&&location.hash==='#cuentas'&&document.querySelector('#pageTitle').innerText==='Cuentas'),'el menú se cierra al elegir y el título cambia');
  await pg.click('#fab'); await pg.click('#fabTx'); await pg.fill('#nAmt','12.5'); await pg.fill('#nDesc','Café de prueba'); await pg.selectOption('#nCat','Restaurantes'); await pg.click('#nAdd'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>S.tx.some(t=>t.desc==='Café de prueba'&&t.amount===-12.5&&t.src==='manual')),'botón +: añadir un movimiento');
  await pg.goto(U+'#flujo'); await pg.waitForTimeout(300);
  // Importación por lotes: PDF y CSV mezclados, asignación automática y aprendizaje
  await pg.evaluate(()=>{ S.accounts.find(a=>a.name==='checking').last4='6789'; save(); });
  const fx=n=>({name:n,mimeType:/\.pdf$/.test(n)?'application/pdf':'text/csv',buffer:fs.readFileSync(path.join(FX,n))}), mem=(n,t)=>({name:n,mimeType:'text/csv',buffer:Buffer.from(t)});
  await pg.goto(U+'#importar'); await pg.waitForTimeout(300);
  await pg.setInputFiles('#fAll',[mem('Checking6789_activity_2026-11-15.csv','Posting Date,Description,Amount\n11/03/2026,TRADER JOES #12,-45.10\n11/05/2026,ACME CORP PAYROLL,8000.00\n'),fx('bank.pdf'),fx('mortgage.pdf'),fx('w2.pdf'),mem('MyBankDownload.csv','Date,Description,Amount\n11/02/2026,SOMETHING,-5\n'),fx('Holdings-Oct-30-2026.csv')]);
  await pg.waitForFunction(()=>BATCH&&!BATCH.running,null,{timeout:30000}); await pg.waitForTimeout(200);
  const bt=await pg.evaluate(()=>Object.fromEntries(BATCH.res.map(r=>[r.name,r.status+(r.acc?':'+acc(r.acc).name:'')+(r.added!=null?':'+r.added:'')])));
  ok(bt['Checking6789_activity_2026-11-15.csv']==='ok:checking:2'&&/^ok:checking/.test(bt['bank.pdf'])&&bt['mortgage.pdf']==='skip'&&bt['w2.pdf']==='skip'&&bt['MyBankDownload.csv']==='review'&&bt['Holdings-Oct-30-2026.csv']==='skip','importación por lotes: cada archivo a su cuenta; lo ya importado se salta ('+JSON.stringify(bt)+')');
  // Extractos repetidos: se detectan aunque se suban otro día; "Importar de nuevo" reemplaza sin duplicar
  const dupInfo=await pg.evaluate(()=>{ const r=BATCH.res.find(x=>x.name==='mortgage.pdf'); return {msg:r.msg,btn:!!document.querySelector('[data-bforce]'),imports:S.imports.length,snaps:S.snapshots.length,docs:Object.values(S.tax).reduce((n,t)=>n+t.docs.length,0)}; });
  ok(/Ya importado el/.test(dupInfo.msg)&&dupInfo.btn,'extracto ya importado: aviso y botón para importarlo de nuevo');
  await pg.click(`[data-bforce="${await pg.evaluate(()=>BATCH.res.findIndex(x=>x.name==='mortgage.pdf'))}"]`); await pg.waitForTimeout(800);
  ok(await pg.evaluate(d=>{ const r=BATCH.res.find(x=>x.name==='mortgage.pdf'); return r.status==='ok'&&S.imports.length===d.imports&&S.snapshots.length===d.snaps; },dupInfo),'importar de nuevo reemplaza la importación anterior sin duplicar saldos');
  await pg.click(`[data-bforce="${await pg.evaluate(()=>BATCH.res.findIndex(x=>x.name==='w2.pdf'))}"]`).catch(()=>{}); await pg.waitForTimeout(800);
  ok(await pg.evaluate(d=>Object.values(S.tax).reduce((n,t)=>n+t.docs.length,0)===d.docs,dupInfo),'un formulario fiscal importado de nuevo no se duplica');
  if(process.env.SHOTS){ await pg.$eval('#batchOut',e=>e.scrollIntoView()); await pg.screenshot({path:process.env.SHOTS+'/lote-movil.png'}); }
  await pg.click('#batchOut [data-brev]'); await pg.waitForTimeout(400); ok(/MyBankDownload/.test(await pg.$eval('#impOut h2',e=>e.innerText)),'revisar un archivo del lote');
  await pg.selectOption('#mAcc',{label:'savings'}); await pg.click('#mGo'); await pg.waitForTimeout(200);
  await pg.setInputFiles('#fAll',[mem('MyBankDownload (2).csv','Date,Description,Amount\n11/09/2026,OTHER THING,-7\n')]); await pg.waitForFunction(()=>BATCH&&!BATCH.running,null,{timeout:10000});
  ok(await pg.evaluate(()=>BATCH.res[0].status==='ok'&&acc(BATCH.res[0].acc).name==='savings'),'aprende a qué cuenta va cada archivo');
  // Extractos con la estructura de bancos reales (datos inventados): crea las cuentas y lo concilia todo
  const nAcc=await pg.evaluate(()=>S.accounts.length);
  await pg.setInputFiles('#fAll',['bofa_card_aug.pdf','bofa_card_sep.pdf','bofa_checking.pdf','bofa_savings.pdf','m1_cash.pdf','empower_q3.pdf','wf_mortgage.pdf'].map(fx).concat([{name:'copia.pdf',mimeType:'application/pdf',buffer:fs.readFileSync(path.join(FX,'wf_mortgage.pdf'))}]));
  await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res.length===8,null,{timeout:60000}); await pg.waitForTimeout(200);
  { const asked=await pg.evaluate(()=>!!document.querySelector('#modal #kPr')&&$('#kPr').value==='__new'); await pg.fill('#kPnN','Casa Lote Prueba'); await pg.uncheck('#kPnR'); await pg.fill('#kPnV','900000'); await pg.click('#kOk'); await pg.waitForTimeout(150);
    ok(asked&&await pg.evaluate(()=>{ const m=acc(BATCH.res.find(r=>r.name==='wf_mortgage.pdf').acc); const p=propOf(m); return !!p&&!p.rental&&lastSnap(p.id).value===900000; }),'al importar una hipoteca nueva pregunta de qué inmueble es y lo crea'); }
  const rb=await pg.evaluate(()=>{ const by=n=>BATCH.res.find(r=>r.name===n); const A=n=>{const r=by(n);return r&&r.acc?acc(r.acc):null;}; const R=reconcile();
    return {st:BATCH.res.map(r=>r.status).join(','),created:BATCH.res.filter(r=>r.created).length,card:A('bofa_card_sep.pdf'),same:A('bofa_card_aug.pdf')&&A('bofa_card_aug.pdf').id===A('bofa_card_sep.pdf').id,
      chk:A('bofa_checking.pdf'),sav:A('bofa_savings.pdf'),m1:A('m1_cash.pdf'),emp:A('empower_q3.pdf'),wf:A('wf_mortgage.pdf'),dupSkip:by('copia.pdf').status==='skip',
      cardTx:S.tx.filter(t=>t.acc===A('bofa_card_sep.pdf').id).map(t=>t.date+' '+t.amount).sort().join(','),cardBal:lastSnap(A('bofa_card_sep.pdf').id).value,
      payRec:S.tx.some(t=>t.acc===A('bofa_checking.pdf').id&&t.amount===-2000&&t.rec&&t.rec.type==='card'),xfer:S.tx.some(t=>t.acc===A('bofa_checking.pdf').id&&t.amount===-1500&&t.rec&&t.rec.type==='xfer'),
      mort:S.tx.some(t=>t.acc===A('bofa_checking.pdf').id&&t.amount===-3000&&t.rec&&t.rec.type==='mortgage'),
      bal:R.issues.filter(i=>/^bal:/.test(i.key)&&[A('bofa_card_sep.pdf').id,A('bofa_checking.pdf').id].some(id=>i.t.includes(acc(id).name))).length,n:S.accounts.length}; });
  ok(rb.st==='ok,ok,ok,ok,ok,ok,ok,skip'&&rb.created===6&&rb.n===nAcc+7&&rb.same&&rb.dupSkip,'extractos reales: crea cada cuenta una vez y salta el archivo repetido ('+rb.st+')');
  ok(rb.card.kind==='credit'&&rb.card.last4==='4321'&&/BofA Visa Signature ···4321/.test(rb.card.name)&&rb.chk.kind==='cash'&&rb.chk.last4==='9876'&&rb.sav.kind==='cash'&&rb.m1.kind==='cash'&&rb.m1.last4==='7777'&&rb.emp.kind==='retirement'&&rb.wf.kind==='mortgage'&&rb.wf.payment===2500&&rb.wf.escrow===500,
    'tipo, nombre y últimos 4 dígitos de cada cuenta ('+[rb.card.name,rb.chk.name,rb.sav.name,rb.m1.name,rb.emp.name,rb.wf.name].join(' | ')+')');
  ok(rb.cardTx==='2026-07-21 -2000,2026-08-06 -250,2026-08-11 -1000,2026-08-20 2000'&&rb.cardBal===1250&&rb.bal===0,'tarjeta: fecha de anotación, importe en la línea siguiente y saldo que cuadra ('+rb.cardTx+')');
  ok(rb.payRec&&rb.xfer&&rb.mort,'concilia pago de tarjeta, transferencia y cuota de Wells Fargo');
  // 401(k): los fondos del extracto se guardan como posiciones, con su tipo de activo, y todo cuadra
  const ek=await pg.evaluate(()=>{ const r=BATCH.res.find(x=>x.name==='empower_q3.pdf'); const a=acc(r.acc); const H=(a.holdings&&a.holdings.rows)||[];
    return {n:H.length,names:H.map(x=>x.name).join('|'),cls:H.map(x=>assetClass(x)).join('|'),sum:r2(H.reduce((s,x)=>s+x.value,0)),date:a.holdings&&a.holdings.date,check:r.check&&r.check.ok,funds:r.funds,
      cards:[...BATCH.res].filter(x=>x.check).map(x=>x.name+':'+x.check.ok).join(',')}; });
  ok(ek.n===3&&ek.names==='Vanguard 500 Index Admiral|Vanguard Developed Markets Index Admiral|Vanguard Total Bond Market Index Admiral'&&ek.cls==='EE. UU. grandes|Internacional|Bonos'&&ek.sum===108500&&ek.date==='2026-09-30'&&ek.check&&ek.funds===3,'401(k): fondos del extracto con su tipo de activo ('+ek.names+' · '+ek.cls+')');
  ok(/bofa_card_sep\.pdf:true/.test(ek.cards)&&/bofa_checking\.pdf:true/.test(ek.cards)&&/bofa_savings\.pdf:true/.test(ek.cards)&&/m1_cash\.pdf:true/.test(ek.cards)&&!/false/.test(ek.cards),'cada extracto se comprueba contra sus propios totales ('+ek.cards+')');
  await pg.goto(U+'#inversiones'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>{ const c=[...document.querySelectorAll('[data-help="holdings"]')].map(b=>b.closest('.card')).find(c=>/Empower/.test(c.innerText)); return c&&/Fondos/.test(c.innerText)&&/Bonos/.test(c.innerText)&&/cambiar de fondo no paga impuestos/.test(c.innerText)&&!/tax-loss/.test(c.innerText); }),'Inversiones muestra la distribución del 401(k)');
  // Aportaciones leídas del extracto y estimación de la jubilación
  ok(await pg.evaluate(()=>{ const a=S.accounts.find(x=>x.kind==='retirement'&&x.institution==='Empower'); const c=a&&a.contrib401; return c&&c.employee===5000&&c.employer===1000&&c.total===6000&&c.months===3; }),'aportaciones del 401(k) leídas del extracto (tú, empresa y meses)');
  await pg.click('.tabs-inline a[href="#jubilacion"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>location.hash==='#jubilacion'&&document.querySelector('nav a.on').getAttribute('href')==='#inversiones'&&/Pon tu año de nacimiento/.test(document.querySelector('#rOut').innerText)),'pestaña Jubilación pide el año de nacimiento');
  await pg.fill('#rBy','1986'); await pg.waitForTimeout(150);
  { const vp=pg.viewportSize(); await pg.focus('#rC'); await pg.setViewportSize({width:vp.width,height:Math.round(vp.height*0.55)}); await pg.waitForTimeout(400);
    ok(await pg.evaluate(()=>document.activeElement&&document.activeElement.id==='rC'),'al abrir el teclado (cambia solo la altura) la casilla no pierde el foco');
    await pg.setViewportSize(vp); await pg.waitForTimeout(400); await pg.evaluate(()=>document.activeElement.blur()); }
  const jb=await pg.evaluate(()=>{ const d=retireData(); const p=retireAt(d,65); let B=d.bal; for(let i=0;i<d.ra-d.age;i++) B=B*1.05+d.contrib;
    return {age:d.age,contrib:d.contrib,bal:d.bal,ok:Math.abs(p.B-B)<0.01,shown:document.querySelector('#rB').innerText,exp:fmt(B),rows:document.querySelectorAll('#rOut tbody tr').length,tips:document.querySelector('#rTips').innerText}; });
  ok(jb.age===2026-1986&&jb.contrib===24000&&jb.ok&&jb.shown===jb.exp&&jb.rows===6,'estimación a los 65 en dólares de hoy ('+jb.shown+', aportación '+jb.contrib+')');
  ok(/máximo de 2026 es \$24,500/.test(jb.tips)&&/empresa aporta unos \$4,000/.test(jb.tips)&&/Acciones: 90%/.test(jb.tips)&&/Antes de los 59½/.test(jb.tips)===false,'recomendaciones del 401(k): máximo del IRS, aportación de la empresa y reparto');
  await pg.fill('#rG','9000'); await pg.evaluate(()=>{ const r=$('#rA'); r.value='60'; r.dispatchEvent(new Event('input')); }); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>/te faltarían unos/.test($('#rOut').innerText)&&/Antes de los 59½/.test($('#rTips').innerText)===false&&S.settings.retire.age===60),'objetivo de ingreso y cambio de edad');
  await pg.evaluate(()=>{ const r=$('#rA'); r.value='57'; r.dispatchEvent(new Event('input')); }); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>/Antes de los 59½/.test($('#rTips').innerText)),'aviso de penalización antes de los 59½');
  await pg.evaluate(()=>{ S.settings.retire={}; save(); });
  await pg.goto(U+'#importar'); await pg.waitForTimeout(300);
  // El mismo extracto con otro nombre y otros bytes (descargado otro día) se detecta por su contenido
  await pg.goto(U+'#importar'); await pg.waitForTimeout(300);
  await pg.setInputFiles('#fAll',[{name:'eStmt_copia.pdf',mimeType:'application/pdf',buffer:Buffer.concat([fs.readFileSync(path.join(FX,'bofa_savings.pdf')),Buffer.from('\n% otra descarga\n')])}]);
  await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res[0].name==='eStmt_copia.pdf',null,{timeout:20000});
  ok(await pg.evaluate(()=>BATCH.res[0].status==='skip'&&!!BATCH.res[0].dupOf),'extracto repetido con otro nombre: no se vuelve a sumar');
  // Borrar una cuenta borra todo lo que vino de ella
  const sv=await pg.evaluate(()=>{ const a=S.accounts.find(x=>x.last4==='5555'); return {id:a.id,tx:S.tx.filter(t=>t.acc===a.id).length,imp:S.imports.filter(e=>e.acc===a.id).length,xferRec:S.tx.some(t=>t.rec&&t.rec.type==='xfer'&&t.rec.acc===a.id)}; });
  await pg.goto(U+'#cuentas'); await pg.waitForTimeout(300); await pg.click(`[data-acc="${sv.id}"]`); await pg.click('#modal [data-edit]'); await pg.click('#eDel'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>/movimientos/.test($('#modal').innerText)&&/extractos registrados/.test($('#modal').innerText)),'aviso de todo lo que se borra con la cuenta');
  await pg.click('#dOk'); await pg.waitForTimeout(300);
  ok(sv.tx>0&&sv.imp>0&&await pg.evaluate(id=>!acc(id)&&!S.tx.some(t=>t.acc===id||(t.rec&&t.rec.acc===id))&&!S.snapshots.some(x=>x.acc===id)&&!S.imports.some(e=>e.acc===id),sv.id),'borrar una cuenta: sin movimientos, saldos, emparejamientos ni registro');
  await pg.goto(U+'#importar'); await pg.waitForTimeout(300); await pg.setInputFiles('#fAll',[fx('bofa_savings.pdf')]);
  await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res[0].name==='bofa_savings.pdf',null,{timeout:20000});
  ok(await pg.evaluate(()=>BATCH.res[0].status==='ok'&&BATCH.res[0].created&&acc(BATCH.res[0].acc).last4==='5555'),'tras borrarla, el extracto se puede importar como nuevo');
  // Botón "Importar" de una cuenta: el archivo va a esa cuenta aunque el nombre no diga nada
  await pg.goto(U+'#cuentas'); await pg.waitForTimeout(300);
  const svId=await pg.evaluate(()=>S.accounts.find(a=>a.name==='savings').id);
  await pg.click(`[data-acc="${svId}"]`); await pg.waitForTimeout(150); ok(await pg.evaluate(()=>!!document.querySelector('#modal .actgrid [data-snap]')&&!!document.querySelector('#modal .sheet-big')),'ficha de la cuenta con sus acciones');
  const [fc]=await Promise.all([pg.waitForEvent('filechooser'),pg.click(`#modal [data-imp="${svId}"]`)]);
  await fc.setFiles([mem('export.csv','Date,Description,Amount\n11/12/2026,PER ACCOUNT TEST,-3\n')]); await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res[0].name==='export.csv',null,{timeout:10000});
  ok(await pg.evaluate(id=>BATCH.res[0].status==='ok'&&BATCH.res[0].acc===id&&/savings/.test(document.querySelector('#impFor').innerText)&&location.hash==='#importar',svId),'importar desde una cuenta');
  await pg.click('#impAny'); ok(await pg.evaluate(()=>IMPORT_FOR===null&&!document.querySelector('#impFor').innerText),'volver a importar en cualquier cuenta');
  await pg.goto(U+'#cuentas'); await pg.waitForTimeout(200); await pg.click('#addA'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>!!document.querySelector('#modal #fNew')&&!!document.querySelector('#modal #nNoDoc')),'añadir cuenta empieza por un extracto');
  await pg.click('#nNoDoc'); await pg.waitForTimeout(150); ok(await pg.evaluate(()=>/Nueva cuenta/.test(document.querySelector('#modal').innerText)&&!!document.querySelector('#modal input')),'crear cuenta sin documento'); await pg.evaluate(()=>closeModal());
  // Extractos del mes: qué falta, avisos, importar por cuenta, soltar archivos y el botón +
  await pg.evaluate(()=>{ const t=today(), m=n=>isoAddMonths(t,n);
    S.accounts.push({id:'rtA',kind:'cash',name:'Rutina Banco',institution:'Banco Rutina'},{id:'rtB',kind:'retirement',name:'Rutina 401k',institution:'Plan Rutina'},{id:'rtC',kind:'cash',name:'Rutina Efectivo',institution:''});
    S.imports.push({id:'ri1',acc:'rtA',kind:'pdf',date:m(-5),fp:'rt1',added:t},{id:'ri2',acc:'rtA',kind:'pdf',date:m(-4),fp:'rt2',added:t},{id:'ri3',acc:'rtA',kind:'pdf',date:m(-2),fp:'rt3',added:t},{id:'ri4',acc:'rtB',kind:'pdf',date:m(-4),fp:'rt4',added:t},{id:'ri5',acc:'rtB',kind:'pdf',date:m(-1),fp:'rt5',added:t}); save(); });
  await pg.goto(U+'#importar'); await pg.waitForSelector('#routineBody .srow');
  const sr=await pg.evaluate(()=>{ const r=id=>document.querySelector(`[data-sacc="${id}"]`); const exp=stmtLabel(isoAddMonths(today(),-1)), gap=stmtLabel(isoAddMonths(today(),-3),true);
    return {a:r('rtA').innerText.replace(/\s+/g,' '),aDue:!!r('rtA').querySelector('.sst.due'),exp,gap,b:r('rtB').innerText.replace(/\s+/g,' '),bOk:!!r('rtB').querySelector('.sst.ok'),c:!!r('rtC').querySelector('[data-soff]'),badge:!!document.querySelector('.tabs-inline a[href="#importar"] .tbadge'),
      alert:computeAlerts().some(x=>/^stmt:/.test(x.key)&&x.go.h==='importar'&&/Falta|Faltan/.test(x.t))&&stmtList().some(x=>x.a.id==='rtA'&&x.state==='due'),first:document.querySelector('#routineBody .srow').dataset.sacc}; });
  ok(sr.aDue&&sr.a.includes('Falta el de '+sr.exp)&&sr.a.includes('también falta '+sr.gap)&&sr.bOk&&/trimestral/.test(sr.b)&&sr.c&&sr.badge&&sr.alert,'extractos del mes: falta el del mes pasado, huecos, 401(k) trimestral, aviso y recuento ('+sr.a+' | '+sr.b+')');
  await pg.click('[data-soff="rtC"]'); ok(await pg.evaluate(()=>S.settings.stmtOff.includes('rtC')&&!!document.querySelector('[data-son="rtC"]')&&sanitizeState(JSON.parse(JSON.stringify(S))).settings.stmtOff.includes('rtC')),'"No necesita" quita una cuenta del recordatorio');
  await pg.click('[data-son="rtC"]'); ok(await pg.evaluate(()=>!S.settings.stmtOff.includes('rtC')),'"Recordar" la vuelve a poner');
  await pg.goto(U+'#cuentas'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>/Falta/.test(document.querySelector('[data-acc="rtA"]').innerText)&&!!document.querySelector('#dueBanner')),'Mis cuentas marca la cuenta a la que le falta el extracto');
  await pg.goto(U+'#importar'); await pg.waitForSelector('[data-simp="rtA"]');
  const td=new Date(), us=`${String(td.getMonth()+1).padStart(2,'0')}/${String(td.getDate()).padStart(2,'0')}/${td.getFullYear()}`;
  const [fcR]=await Promise.all([pg.waitForEvent('filechooser'),pg.click('[data-simp="rtA"]')]);
  await fcR.setFiles([mem('rutina.csv',`Date,Description,Amount\n${us},RUTINA MENSUAL,-4\n`)]); await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res[0].name==='rutina.csv',null,{timeout:10000});
  ok(await pg.evaluate(()=>BATCH.res[0].status==='ok'&&BATCH.res[0].acc==='rtA'&&stmtInfo(acc('rtA')).state==='ok'&&!!document.querySelector('[data-sacc="rtA"] .sst.ok')),'Importar en una fila guarda en esa cuenta y la deja al día');
  await pg.evaluate(()=>{ const dt=new DataTransfer(); dt.items.add(new File(['Date,Description,Amount\n11/02/2026,SOLTADO EN LA APP,-2\n'],'soltado.csv',{type:'text/csv'})); document.querySelector('#pageTitle').dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true})); window.__drag=document.body.classList.contains('dragging'); document.querySelector('#pageTitle').dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true})); });
  await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res[0].name==='soltado.csv',null,{timeout:10000});
  ok(await pg.evaluate(()=>window.__drag&&!document.body.classList.contains('dragging')&&location.hash==='#importar'),'soltar archivos en cualquier parte de la app los importa');
  await pg.goto(U+'#resumen'); await pg.waitForTimeout(200); await pg.click('#fab'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>!!document.querySelector('#modal #fNew')&&!!document.querySelector('#modal #fabTx')&&!!document.querySelector('#modal #nNoDoc')&&/Compartir|arrastra|Archivos/.test(document.querySelector('#modal').innerText)),'el botón + abre una sola hoja: extractos, movimiento o cuenta sin extractos');
  await pg.setInputFiles('#fNew',[mem('Checking6789_activity_fab.csv',`Posting Date,Description,Amount\n${us},DESDE EL BOTON MAS,-6\n`)]); await pg.waitForFunction(()=>BATCH&&!BATCH.running&&BATCH.res[0].name==='Checking6789_activity_fab.csv',null,{timeout:10000});
  ok(await pg.evaluate(()=>location.hash==='#importar'&&!document.querySelector('#modal.show')),'elegir extractos desde el + los importa sin más pasos');
  await pg.evaluate(()=>{ ['rtA','rtB','rtC'].forEach(id=>deleteAccount(id)); save(); });
  ok(await pg.evaluate(()=>{ const d=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10); S.accounts.push({id:'hpX',kind:'property',name:'Casa Prueba Valor'}); S.snapshots.push({id:'hpS',acc:'hpX',date:d(60),value:500000});
    const has=re=>computeAlerts().some(x=>re.test(x.key)&&/Casa Prueba Valor/.test(x.t)); const r1=!has(/^stale:/)&&!has(/^val:/);
    S.snapshots.find(x=>x.id==='hpS').date=d(400); const r2=has(/^val:/)&&!has(/^stale:/); deleteAccount('hpX'); return r1&&r2; }),'una casa no pide el saldo cada mes, solo revisar su valor una vez al año');
  // Nómina a final de mes → cuenta para el mes siguiente
  const ps=await pg.evaluate(()=>{ closeModal(); const cur=ym(today()), prev=isoAddMonths(today(),-1).slice(0,7), p2=isoAddMonths(today(),-2).slice(0,7), p3=isoAddMonths(today(),-3).slice(0,7);
    S.tx.filter(isPay).forEach(t=>{ t.cat='Otros ingresos'; t._ps=1; }); S.settings.payShift=0; delete S.settings.payShiftAsked; S.accounts.push({id:'psA',kind:'cash',name:'Banco Nómina Prueba'});
    [p3,p2,prev].forEach((m,i)=>S.tx.push({id:'psN'+i,acc:'psA',date:m+'-25',desc:'NOMINA PRUEBA',amount:9000,cat:'Nómina'})); S.tx.push({id:'psG',acc:'psA',date:cur+'-01',desc:'GASTO PRUEBA',amount:-7000,cat:'Compras'});
    const b=cashflowByMonth()[cur]; flujoFilter.month=cur; flujoFilter.cat='all'; location.hash='#flujo'; route(); return {cur,inc0:b.income,guess:payShiftGuess()}; });
  await pg.waitForSelector('#payAsk [data-pay="25"]'); await pg.click('#payAsk [data-pay="25"]'); await pg.waitForTimeout(150);
  const ps2=await pg.evaluate(c=>{ const b=cashflowByMonth()[c]; return {inc:b.income,carried:b.carried.length,note:/incl\. nómina del/.test(document.querySelector('.tiles').textContent),ask:!!document.querySelector('#payAsk')}; },ps.cur);
  ok(ps.guess===25&&ps2.inc-ps.inc0===9000&&ps2.carried===1&&ps2.note&&!ps2.ask,'nómina de final de mes: la app lo detecta y, al aceptarlo, cuenta para el mes siguiente ('+JSON.stringify([ps,ps2])+')');
  await pg.evaluate(()=>{ location.hash='#ajustes'; }); await pg.waitForSelector('#psOn'); await pg.uncheck('#psOn'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(c=>!S.settings.payShift&&cashflowByMonth()[c].carried.length===0,ps.cur),'la opción de la nómina se puede quitar en Ajustes');
  await pg.evaluate(()=>{ deleteAccount('psA'); S.tx.filter(t=>t._ps).forEach(t=>{ t.cat='Nómina'; delete t._ps; }); delete S.settings.payShiftAsked; save(); });
  // Cobertura de datos y nómina esperada
  const cv=await pg.evaluate(()=>{ closeModal(); const prev=isoAddMonths(today(),-1).slice(0,7), p2=isoAddMonths(today(),-2).slice(0,7), p3=isoAddMonths(today(),-3).slice(0,7);
    S.accounts.push({id:'cvA',kind:'cash',name:'Banco Cobertura Prueba'}); S.imports.push({id:'cvI',acc:'cvA',kind:'pdf',date:prev+'-15',fp:'cv',added:today()});
    [p3,p2].forEach((m,i)=>S.tx.push({id:'cvN'+i,acc:'cvA',date:m+'-25',desc:'NOMINA COBERTURA',amount:8800+i*200,cat:'Nómina',src:'pdf'}));
    S.tx.push({id:'cvG',acc:'cvA',date:prev+'-10',desc:'GASTO COBERTURA',amount:-100,cat:'Compras',src:'pdf'});
    const est=payEstimates().filter(t=>t.acc==='cvA'), c=cashflowByMonth()[prev], mc=monthCov(prev);
    flujoFilter.month=prev; flujoFilter.cat='all'; location.hash='#flujo'; route();
    return {prev,est:est.map(t=>t.date+':'+t.amount).join(),inEst:c.est.some(t=>t.acc==='cvA'),lag:mc.lag.some(x=>x.a.id==='cvA'),complete:mc.complete}; });
  await pg.waitForTimeout(200);
  const cvUI=await pg.evaluate(()=>({note:/Provisional/.test(($('#covNote')||{}).textContent||''),est:/estimada/.test(document.querySelector('.tiles').textContent),prov:/provisional/.test(document.querySelector('.tiles').textContent)}));
  ok(cv.est===cv.prev+'-25:9000'&&cv.inEst&&cv.lag&&!cv.complete&&cvUI.note&&cvUI.est&&cvUI.prov,'banco con extracto hasta el 15: mes provisional, dice qué falta y estima la nómina del 25 ('+JSON.stringify([cv,cvUI])+')');
  ok(await pg.evaluate(p=>{ S.tx.push({id:'cvR',acc:'cvA',date:p+'-24',desc:'NOMINA COBERTURA',amount:9100,cat:'Nómina',src:'csv'}); const r=!payEstimates().some(t=>t.acc==='cvA'); S.tx=S.tx.filter(t=>t.id!=='cvR'); return r; },cv.prev),'la nómina estimada desaparece en cuanto llega la real');
  // Actividad reciente (CSV) → el extracto (PDF) la sustituye sin duplicar
  const rcx=await pg.evaluate(()=>{ S.accounts.push({id:'rcA',kind:'cash',name:'Banco Actividad Prueba'}); const d=n=>isoAddMonths(today(),-1).slice(0,7)+'-'+String(n).padStart(2,'0');
    const a=importTxInto('rcA',[{date:d(3),desc:'CAFE PENDIENTE',amount:-5.25},{date:d(5),desc:'TIENDA',amount:-40},{date:d(8),desc:'RESTAURANTE',amount:-30}],'csv');
    const b=importTxInto('rcA',[{date:d(4),desc:'CAFE SHOP 123',amount:-5.25},{date:d(5),desc:'TIENDA XYZ',amount:-40},{date:d(9),desc:'RESTAURANTE',amount:-36},{date:d(12),desc:'NUEVO',amount:-12}],'pdf',{end:d(15)});
    S.imports.push({id:'rcI',acc:'rcA',kind:'pdf',date:d(15),fp:'rc',added:today()});
    const c=importTxInto('rcA',[{date:d(3),desc:'CAFE PENDIENTE',amount:-5.25},{date:d(8),desc:'RESTAURANTE',amount:-30},{date:d(18),desc:'DESPUES',amount:-7}],'csv');
    const tx=S.tx.filter(t=>t.acc==='rcA'); return {a,b,c,n:tx.length,pdf:tx.filter(t=>t.src==='pdf').length,sum:tx.reduce((s,t)=>s+t.amount,0)}; });
  ok(rcx.a.added===3&&rcx.b.repl===2&&rcx.b.gone===1&&rcx.b.added===2&&rcx.c.added===1&&rcx.c.dup===2&&rcx.n===5&&rcx.pdf===4&&Math.abs(rcx.sum+100.25)<0.01,'la actividad reciente del banco se sustituye por el extracto sin duplicar ('+JSON.stringify(rcx)+')');
  await pg.evaluate(()=>{ deleteAccount('cvA'); deleteAccount('rcA'); save(); });
  // "Sin categoría" separado de "Otros"
  const uc=await pg.evaluate(()=>{ closeModal(); S.accounts.push({id:'ucA',kind:'cash',name:'Banco Categorías Prueba'}); const d=today();
    importTxInto('ucA',[{date:d,desc:'QWXZ PLKJ 9981',amount:-77.5}],'csv'); const t=S.tx.find(x=>x.acc==='ucA');
    const cf=cashflowByMonth()[ym(d)]; return {id:t.id,cat:t.cat,unc:isUncat(t),inExp:(cf.cats[UNCAT]||0)>=77.5}; });
  await pg.evaluate(id=>txSheet(id),uc.id); await pg.waitForSelector('#tsCat');
  const ucSel=await pg.$eval('#tsCat',e=>e.value); await pg.selectOption('#tsCat','Otros gastos'); await pg.waitForTimeout(150); await pg.evaluate(()=>closeModal());
  const uc2=await pg.evaluate(id=>{ const t=S.tx.find(x=>x.id===id); return {cat:t.cat,unc:isUncat(t)}; },uc.id);
  ok(uc.cat==='Sin categoría'&&uc.unc&&uc.inExp&&ucSel==='Sin categoría'&&uc2.cat==='Otros gastos'&&!uc2.unc,'lo no reconocido queda "Sin categoría" (no "Otros") y se resuelve eligiendo cualquiera, también Otros');
  ok(await pg.evaluate(()=>{ S.tx.push({id:'ucM1',acc:'ucA',date:today(),desc:'ZZQQ AUTO',amount:-5,cat:'Otros gastos'},{id:'ucM2',acc:'ucA',date:today(),desc:'ZZQQ ELEGIDO',amount:-6,cat:'Otros gastos',manual:true}); S.settings.catVer=2; migrateUncat();
    return S.tx.find(t=>t.id==='ucM1').cat===UNCAT&&S.tx.find(t=>t.id==='ucM2').cat==='Otros gastos'&&S.settings.catVer===3; }),'migración: lo automático que estaba en Otros pasa a Sin categoría; lo que elegiste se queda');
  await pg.evaluate(()=>{ deleteAccount('ucA'); save(); });
  // Hipoteca ↔ inmueble: no puede quedar una hipoteca suelta
  await pg.evaluate(()=>{ closeModal(); S.accounts.push({id:'hpA',kind:'property',name:'Piso Alquiler Prueba',rental:true}); editAccount(null,'mortgage'); });
  await pg.selectOption('#xPr','__new'); await pg.fill('#eN','Hipoteca Prueba H'); await pg.fill('#xPnN','Casa Prueba H'); await pg.fill('#xPnV','650000'); await pg.uncheck('#xPnR'); await pg.fill('#xR','6'); await pg.fill('#xP','2000'); await pg.fill('#eB','400000'); await pg.click('#eOk');
  const hp1=await pg.evaluate(()=>{ const m=S.accounts.find(a=>a.name==='Hipoteca Prueba H'), p=m&&propOf(m); return {ok:!!p&&p.name==='Casa Prueba H'&&!p.rental&&lastSnap(p.id).value===650000, mid:m&&m.id, pid:p&&p.id}; });
  ok(hp1.ok,'una hipoteca nueva pide su inmueble y puede crearlo en el momento (nombre, valor, vivienda)');
  await pg.evaluate(()=>{ S.accounts.push({id:'hpM',kind:'mortgage',name:'Hipoteca Suelta Prueba',rate:5,payment:1500}); S.snapshots.push({id:'hpMs',acc:'hpM',date:today(),value:300000}); goAlert(computeAlerts().find(x=>x.key==='mprop:hpM').go); });
  await pg.waitForSelector('#kPr'); await pg.selectOption('#kPr','hpA'); await pg.click('#kOk'); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>acc('hpM').propertyId==='hpA'&&!computeAlerts().some(x=>x.key==='mprop:hpM')&&isRentalMortgage(acc('hpM'))),'una hipoteca suelta avisa y se une a su inmueble desde el aviso (y cuenta como alquiler)');
  await pg.evaluate(id=>accountSheet(id),hp1.pid); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>/Hipoteca Prueba H/.test($('#modal .plink').textContent)&&/250,000/.test($('#modal .plink').textContent)),'la ficha del inmueble muestra su hipoteca y el capital propio');
  await pg.evaluate(()=>{ closeModal(); editAccount('hpA'); }); await pg.click('#eDel'); await pg.waitForTimeout(100);
  const delTxt=await pg.$eval('#modal',e=>e.textContent); await pg.click('#dOk'); await pg.waitForTimeout(100);
  ok(/Hipoteca Suelta Prueba/.test(delTxt)&&await pg.evaluate(()=>!acc('hpA')&&!acc('hpM')&&!S.snapshots.some(x=>x.acc==='hpM')),'al borrar un inmueble se borra también su hipoteca (y lo avisa antes)');
  await pg.evaluate(ids=>{ deleteAccount(ids.mid); deleteAccount(ids.pid); save(); },hp1);
  // Calendario: extractos y actividad disponibles, pagos recurrentes y aviso de pagos importantes (con datos propios; al final se restauran los de las demás pruebas)
  const cal=await pg.evaluate(()=>{ closeModal(); const now=today(), mo=n=>isoAddMonths(now,-n).slice(0,7), d=(n,day)=>mo(n)+'-'+String(day).padStart(2,'0');
    window.__calKeep={accounts:S.accounts,tx:S.tx,snapshots:S.snapshots,imports:S.imports,recurring:S.recurring,cal:S.settings.cal,ign:S.settings.alertIgnore};
    S.accounts=[{id:'clA',kind:'cash',name:'Banco Calendario Prueba'},{id:'clS',kind:'credit',name:'Tarjeta Calendario Prueba'},{id:'clH',kind:'property',name:'Casa Calendario Prueba',taxYear:12000,insYear:1800},
      {id:'clM',kind:'mortgage',name:'Hipoteca Calendario Prueba',rate:5,payment:3000,extra:100,propertyId:'clH',nextDue:isoAddMonths(now,1).slice(0,7)+'-01'}];
    S.snapshots=[{id:'clHs',acc:'clH',date:now,value:900000},{id:'clMs',acc:'clM',date:now,value:500000}];
    S.imports=[3,2,1].map(i=>({id:'clI'+i,acc:'clS',kind:'pdf',date:d(i,12),fp:'clS'+i,added:now}));
    S.tx=[]; S.recurring=[]; S.settings.cal={min:500,sys:false,payDays:[],noSug:[]}; let n=0;
    const tx=(date,desc,amount,cat)=>{ if(date<=now) S.tx.push({id:'clT'+(n++),acc:'clA',date,desc,amount,cat,src:'pdf'}); };
    for(let i=5;i>=0;i--){ tx(d(i,25),'NOMINA EMPRESA PRUEBA',9000,'Nómina'); tx(d(i,3),'NETFLIX PRUEBA 866-579-7172',-15.49,'Suscripciones'); tx(d(i,2),'COMPANIA LUZ PRUEBA',-(100+i*17),'Suministros'); tx(d(i,1+i*3),'TIENDA SUELTA PRUEBA',-(40+i*55),'Compras'); }
    for(let i=9;i>=5;i--) tx(d(i,4),'CANCELADO PRUEBA',-9.99,'Suscripciones');
    tx(d(7,2),'SEGURO COCHE PRUEBA',-600,'Seguros'); tx(d(1,2),'SEGURO COCHE PRUEBA',-600,'Seguros'); tx(d(2,9),'MEMBRESIA CLUB PRUEBA',-320,'Suscripciones'); tx(d(1,26),'APP NUEVA PRUEBA*4K2Z9X',-7.99,'Suscripciones'); tx(d(2,15),'INTERNET PRUEBA',-60,'Suministros'); tx(d(1,15),'INTERNET PRUEBA',-60,'Suministros'); tx(d(3,9),'POLIZA HOGAR PRUEBA',-450,'Seguros');
    // El mismo comercio escrito de dos formas, anotado un mes el 24 (compra del 21, fin de semana) y otro el 21: es un solo pago, el día 21
    tx(d(2,24),'PURCHASE '+d(2,21).slice(5,7)+'21 Videoclub.com videoclub.com CA',-8.99,'Suscripciones'); tx(d(1,21),'CHECKCARD '+d(1,21).slice(5,7)+'21 VIDEOCLUB.COM LOS GATOS CA',-8.99,'Suscripciones');
    tx(d(2,23),'CINEPLUS MENSUAL UNO',-6.5,'Suscripciones'); tx(d(1,20),'CINEPLUS CUOTA DOS',-6.5,'Suscripciones');   // sin fecha en el texto: 23 y 20 → día 20
    for(const i of [2,1]){ tx(d(i,5),'DUOAPP PLAN UNO',-5,'Suscripciones'); tx(d(i,12),'DUOAPP PLAN DOS',-5,'Suscripciones'); }   // dos pagos de verdad del mismo comercio: siguen siendo dos
    for(let i=5;i>=0;i--) tx(d(i,7),'PLATAFORMA PRUEBA*'+'QWERTY'[i]+(i*7+3)+'K9Z 800-555-01'+i+i,-12.99,'Ocio');
    calDirty(); let all=recurringAll(); const by=k=>all.find(r=>r.name===k), nf=by('Netflix Prueba'), luz=by('Compania Luz Prueba'), seg=by('Seguro Coche Prueba'), mort=all.find(r=>r.key==='mort:clM'), p1=all.find(r=>r.key==='ptax1:clH'), p2=all.find(r=>r.key==='ptax2:clH');
    const det={nf:!!nf&&nf.freq==='m'&&nf.amount===15.49&&recurNext(nf)>=now,luz:!!luz&&luz.freq==='m'&&luz.amount>=100&&luz.amount<=185,seg:!!seg&&seg.freq==='s'&&seg.amount===600,no:!by('Tienda Suelta Prueba')&&!by('Cancelado Prueba')&&!by('Poliza Hogar Prueba')};
    const vc=all.filter(r=>/^Videoclub/.test(r.name)), cp=all.filter(r=>/^Cineplus/.test(r.name)), du=all.filter(r=>/^Duoapp/.test(r.name)), evOf=r=>calEvents(now,addDays(now,75)).filter(e=>e.type==='pay'&&e.r.key===r.key&&!e.paid);
    const one={merged:vc.length===1&&vc[0].name==='Videoclub'&&vc[0].freq==='m'&&vc[0].n===2&&!vc[0].guess,day:vc.length===1&&recurNext(vc[0]).slice(8)==='21'&&evOf(vc[0]).length>=2&&evOf(vc[0]).every(e=>e.d.slice(8)==='21')&&new Set(evOf(vc[0]).map(e=>e.d.slice(0,7))).size===evOf(vc[0]).length,
      early:cp.length===1&&recurNext(cp[0]).slice(8)==='20',apart:du.length===2&&du.every(r=>r.freq==='m')};
    const s1=by('App Nueva Prueba'), s2=by('Membresia Club Prueba'), s3=by('Internet Prueba'), s4=by('Plataforma Prueba'); const subs={one:!!s1&&s1.guess===true&&s1.freq==='m'&&s1.amount===7.99&&recurNext(s1)>=now,big:!!s2&&s2.guess===true&&s2.freq==='y'&&s2.amount===320,two:!!s3&&!s3.guess&&s3.freq==='m'&&s3.amount===60,codes:!!s4&&s4.freq==='m'&&s4.amount===12.99&&s4.n>=5&&all.filter(r=>/Plataforma/.test(r.name)).length===1};
    const der={mort:!!mort&&mort.amount===3100&&mort.freq==='m'&&recurNext(mort).slice(8)==='01',ptax:!!p1&&!!p2&&p1.amount===6000&&recurNext(p1).slice(5)==='12-10'&&recurNext(p2).slice(5)==='04-10'};
    acc('clM').escrow=400; calDirty(); der.escrow=!recurringAll().some(r=>r.ptax); acc('clM').escrow=0; calDirty();
    const plan=payPlan(), est=payDays(now,addDays(now,70)).filter(p=>p.est);
    const pay={plan:!!plan&&plan.mode==='auto'&&plan.kind==='dom'&&plan.days.join()==='25',est:est.length>=2&&est.every(p=>{ const day=+p.d.slice(8,10), wd=new Date(p.d+'T12:00:00').getDay(); return day>=23&&day<=25&&wd!==0&&wd!==6&&p.amt===9000; })};
    // Aviso: un pago de 900 que vence mañana se avisa con la nómina anterior (ya cobrada); uno de 20 no
    S.recurring=[{id:'clR1',name:'COLEGIO PRUEBA',amount:900,freq:'m',next:addDays(now,1)},{id:'clR2',name:'REVISTA PRUEBA',amount:20,freq:'m',next:addDays(now,1)}]; calDirty();
    const N=calNotices(), paysAll=payDays(addDays(now,-62),addDays(now,220)).map(p=>p.d), has=k=>N.some(g=>g.items.some(e=>e.r.name===k||e.r.key===k)), a1=computeAlerts().find(a=>a.key.startsWith('pay:'));
    const al={grp:N.length>0&&N.every(g=>!g.noPay&&g.items.every(e=>g.pay<e.d&&!paysAll.some(p=>p>g.pay&&p<e.d))),active:N.filter(g=>g.active).some(g=>g.items.some(e=>e.r.name==='COLEGIO PRUEBA')),
      alert:!!a1&&/COLEGIO PRUEBA/.test(a1.t)&&!/REVISTA PRUEBA/.test(a1.t)&&a1.go.h==='calendario',big:has('mort:clM')&&isSig(recurringAll().find(r=>r.key==='ptax1:clH')),small:!has('REVISTA PRUEBA')&&!has('Netflix Prueba')};
    S.settings.cal.min=100000; al.high=!computeAlerts().some(a=>a.key.startsWith('pay:')); S.recurring[1].notify=true; calDirty(); al.forced=/REVISTA PRUEBA/.test((computeAlerts().find(a=>a.key.startsWith('pay:'))||{t:''}).t);
    S.settings.cal.min=500; delete S.recurring[1].notify; calDirty();
    // Extractos (cierre del último + 1 mes + 3 días) y actividad del mes (día 3)
    const close=isoAddMonths(d(1,12),1), evS=()=>calEvents(addDays(close,-1),addDays(close,40)).filter(e=>e.type==='stmt'&&e.a.id==='clS'), e0=evS();
    const st={first:e0.length>1&&e0[0].close===close&&e0[0].d===addDays(close,3)&&e0[0].pend===(addDays(close,3)<=now),second:e0.length>1&&e0[1].close===isoAddMonths(d(1,12),2)};
    acc('clS').stmtDay=20; st.day=evS()[0].d===close.slice(0,8)+'20'&&stmtLagOf(acc('clS'),close)===8; delete acc('clS').stmtDay;
    const nm=ymNext(ym(now)), evA=calEvents(nm+'-01',monthEnd(nm)).filter(e=>e.type==='act'); st.act=evA.length===1&&evA[0].d===nm+'-03'&&evA[0].m===ym(now)&&evA[0].n===2&&!evA[0].pend;
    // Validación de lo que llega de una copia o de la nube
    const sz=sanitizeState(JSON.parse(JSON.stringify(Object.assign({},S,{recurring:[{id:'ok1',name:'  Bueno  ',amount:'12.5',freq:'m',next:'2027-01-05',notify:true,extra:'<img>'},{id:'bad1',name:'<b>x</b>',amount:-5,freq:'zz',next:'ayer'},{id:'ov1',key:'auto:abc',off:true},{id:'ov2',key:'<script>'}],
      settings:Object.assign({},S.settings,{cal:{min:'-3',sys:'yes',payDays:[25,99,'x',25,1],noSug:['ins:clH','<img>']}}),accounts:S.accounts.map(a=>a.id==='clS'?Object.assign({},a,{stmtDay:45}):a)}))));
    const san=JSON.stringify(sz.recurring)==='[{"id":"ok1","name":"Bueno","amount":12.5,"freq":"m","next":"2027-01-05","notify":true},{"id":"ov1","key":"auto:abc","off":true}]'&&JSON.stringify(sz.settings.cal)==='{"min":500,"sys":false,"payDays":[25,1],"noSug":["ins:clH"]}'&&sz.accounts.find(a=>a.id==='clS').stmtDay===undefined;
    save(); location.hash='#calendario'; route(); return {det,subs,one,der,pay,al,st,san,nfKey:nf&&nf.key,in40:addDays(now,40),annual:isoAddMonths(d(3,9),12)}; });
  const allTrue=o=>Object.values(o).every(v=>v===true);
  ok(allTrue(cal.det),'pagos recurrentes detectados: suscripción fija, factura variable y seguro semestral; no las compras sueltas, lo cancelado ni un cargo único ('+JSON.stringify(cal.det)+')');
  ok(allTrue(cal.subs),'suscripciones: cuentan desde el primer cargo (mensual, o anual desde 100 USD), las facturas con 2 cargos, y los códigos que cambian en cada cargo no las separan ('+JSON.stringify(cal.subs)+')');
  ok(allTrue(cal.one),'un pago mensual que el banco escribe de dos formas y anota en días distintos es un solo pago, el día de cobro más temprano; dos pagos de verdad del mismo comercio siguen separados ('+JSON.stringify(cal.one)+')');
  ok(allTrue(cal.der),'pagos deducidos de las cuentas: cuota de la hipoteca e impuesto de propiedad (10 dic y 10 abr; con escrow no) ('+JSON.stringify(cal.der)+')');
  ok(allTrue(cal.pay),'días de cobro detectados (día 25) y próximas nóminas esperadas, nunca en fin de semana ('+JSON.stringify(cal.pay)+')');
  ok(allTrue(cal.al),'pagos importantes: se avisan con la nómina anterior a su vencimiento, según el importe elegido o la opción de cada pago ('+JSON.stringify(cal.al)+')');
  ok(allTrue(cal.st),'calendario de extractos (cierre + 1 mes + 3 días, o el día que diga el usuario) y actividad del mes el día 3 ('+JSON.stringify(cal.st)+')');
  ok(cal.san,'los pagos recurrentes y los ajustes del calendario se validan al restaurar');
  await pg.waitForSelector('#calCard .cd.today'); await pg.waitForTimeout(200);
  const calUI=await pg.evaluate(()=>({days:document.querySelectorAll('#calCard .cd[data-day]').length===+monthEnd(ym(today())).slice(8),nav:document.querySelector('nav a.on').getAttribute('href')==='#calendario'&&$('#pageTitle').innerText==='Calendario',
    now:/COLEGIO PRUEBA/.test(($('#calNow')||{}).textContent||''),rec:/Netflix Prueba/.test($('#calRec').textContent)&&/Hipoteca Calendario Prueba/.test($('#calRec').textContent)&&!/Tienda Suelta/.test($('#calRec').textContent),
    sug:document.querySelectorAll('#calRec [data-sug]').length===2,plan:/día 25/.test($('#calPlan').textContent),next:/COLEGIO PRUEBA/.test($('#calNext').textContent)&&/Nómina esperada/.test($('#calNext').textContent)&&/Lo que queda de/.test($('#calNext h2').textContent),fold:$('#calNextBody').hidden===true&&$('#calNextBtn').getAttribute('aria-expanded')==='false',day:/Hoy/.test($('#calDay').textContent)&&!!($('#calCard .calg').compareDocumentPosition($('#calDay'))&4)&&!!($('#calDay').compareDocumentPosition($('#calCard .legend'))&4)}));
  await pg.click('#calNextBtn'); await pg.waitForTimeout(100); const unfold=await pg.evaluate(()=>!$('#calNextBody').hidden&&$('#calNextBtn').textContent==='Ocultar'&&$('#calNextBody .cev').offsetParent!==null&&!calEvents(today(),addDays(today(),400)).filter(e=>e.d>monthEnd(ymNext(ym(today())))).some(e=>$('#calNextBody').textContent.includes(calDayLabel(e.d))));
  ok(unfold,'la lista de lo que queda del mes y del siguiente está plegada y se despliega con su botón');
  ok(allTrue(calUI),'pantalla Calendario: mes, lo del día elegido justo debajo, lista del mes plegada, pagos recurrentes, sugerencias y aviso ('+JSON.stringify(calUI)+')');
  if(process.env.SHOTS){ await pg.screenshot({path:process.env.SHOTS+'/calendario-movil.png',fullPage:true}); await pg.setViewportSize({width:1200,height:900}); await pg.waitForTimeout(400); await pg.screenshot({path:process.env.SHOTS+'/calendario-escritorio.png',fullPage:true}); await pg.setViewportSize({width:412,height:900}); await pg.waitForTimeout(400); }
  await pg.click('#calNextM'); await pg.waitForTimeout(100); const noSel=await pg.evaluate(()=>/Toca un día/.test($('#calDay').textContent)); await pg.click('#calCard .cd[data-day$="-03"]'); await pg.waitForTimeout(100);
  ok(noSel&&await pg.evaluate(()=>/Actividad de/.test($('#calDay').textContent)&&!!document.querySelector('#calCard .cd.sel[data-day$="-03"]')),'cambiar de mes y tocar un día muestra lo de ese día'); await pg.click('#calToday'); await pg.waitForTimeout(100);
  await pg.click('#recAdd'); await pg.click('#rcOk'); await pg.waitForTimeout(100); const needName=await pg.evaluate(()=>$('#modalBg').classList.contains('show')&&!(S.recurring||[]).some(r=>!r.name));
  await pg.fill('#rcN','SEGURO HOGAR PRUEBA'); await pg.fill('#rcA','1800'); await pg.selectOption('#rcF','y'); await pg.fill('#rcD',cal.in40); await pg.selectOption('#rcC','Seguros'); await pg.click('#rcOk'); await pg.waitForTimeout(200);
  ok(needName&&await pg.evaluate(d=>{ const r=S.recurring.find(x=>x.name==='SEGURO HOGAR PRUEBA'); return !!r&&r.amount===1800&&r.freq==='y'&&r.next===d&&r.cat==='Seguros'&&!r.key&&/SEGURO HOGAR PRUEBA/.test($('#calRec').textContent)&&calNotices().some(g=>g.items.some(e=>e.r.name==='SEGURO HOGAR PRUEBA'&&e.d===d)); },cal.in40),'añadir un pago recurrente a mano (pide nombre, importe y fecha) y entra en los avisos');
  await pg.click(`#calRec [data-rec="${cal.nfKey}"]`); await pg.fill('#rcN','Netflix casa'); await pg.click('#rcOk'); await pg.waitForTimeout(200);
  const ov1=await pg.evaluate(k=>{ const o=S.recurring.find(x=>x.key===k), r=recurringAll().find(x=>x.key===k); return !!o&&Object.keys(o).sort().join()==='id,key,name'&&r.name==='Netflix casa'&&r.amount===15.49; },cal.nfKey);
  await pg.click(`#calRec [data-rec="${cal.nfKey}"]`); await pg.click('#rcOff'); await pg.waitForTimeout(200);
  const ov2=await pg.evaluate(k=>recurringAll().find(x=>x.key===k).off===true&&!calEvents(today(),addDays(today(),60)).some(e=>e.type==='pay'&&e.r.key===k)&&!/Netflix casa/.test($('#calRec').textContent)&&!document.querySelector('.coff')&&Math.abs(recStats().total-recurringAll().filter(r=>r.key!==k&&!r.off).reduce((t,r)=>t+recMonthly(r)*12,0))<0.01&&recurringAll().some(r=>r.key===k&&r.off)&&!!$('#recGone'),cal.nfKey);
  await pg.click('#recGone'); await pg.waitForSelector(`#modal [data-unoff="${cal.nfKey}"]`); const goneTxt=await pg.$eval('#modal',e=>/Netflix casa/.test(e.textContent)); await pg.click(`#modal [data-unoff="${cal.nfKey}"]`); await pg.waitForTimeout(200);
  ok(ov1&&ov2&&goneTxt&&await pg.evaluate(k=>{ const r=recurringAll().find(x=>x.key===k); return !r.off&&r.name==='Netflix casa'&&!!document.querySelector(`#calRec [data-rec="${k}"]`)&&!$('#recGone'); },cal.nfKey),'un pago detectado se puede renombrar (solo se guarda el cambio), quitar del todo con "Quitar: no es recurrente" (lista, calendario y gráficos) y recuperar');
  await pg.click('#calRec [data-nosug="0"]'); await pg.waitForTimeout(150); const sg1=await pg.evaluate(()=>document.querySelectorAll('#calRec [data-sug]').length===1&&S.settings.cal.noSug.join()==='ins:clH');
  await pg.click('#calRec [data-sug="0"]'); await pg.waitForSelector('#rcN'); const sg2=await pg.evaluate(d=>$('#rcN').value==='Poliza Hogar Prueba'&&$('#rcA').value==='450'&&$('#rcF').value==='y'&&$('#rcD').value===d,cal.annual); await pg.click('#rcOk'); await pg.waitForTimeout(200);
  ok(sg1&&sg2&&await pg.evaluate(()=>S.recurring.some(r=>/^sug:/.test(r.key||'')&&r.amount===450&&r.freq==='y')&&!document.querySelector('#calRec [data-sug]')),'sugerencias: un cargo único grande se confirma como anual o se descarta');
  const txr=await pg.evaluate(()=>{ const t=S.tx.filter(x=>x.desc==='TIENDA SUELTA PRUEBA').pop(); txSheet(t.id); return {btn:!!$('#tsRec'),amt:-t.amount}; }); await pg.click('#tsRec'); await pg.waitForSelector('#rcN');
  const txr2=await pg.evaluate(a=>$('#rcN').value==='Tienda Suelta Prueba'&&+$('#rcA').value===a&&$('#rcF').value==='m'&&$('#rcD').value>=today(),txr.amt); await pg.selectOption('#rcF','q'); await pg.click('#rcOk'); await pg.waitForTimeout(200);
  const txr3=await pg.evaluate(k=>{ const r=recurringAll().find(x=>x.name==='Tienda Suelta Prueba'); S.recurring.find(o=>o.key===k).off=true; calDirty(); const n=S.tx.find(x=>/^NETFLIX PRUEBA/.test(x.desc)); txSheet(n.id); $('#tsRec').click(); const same=$('#rcN').value==='Netflix casa'&&!recurringAll().find(x=>x.key===k).off; closeModal(); const inc=S.tx.find(x=>x.amount>0); txSheet(inc.id); const noBtn=!$('#tsRec'); closeModal(); return !!r&&r.freq==='q'&&/^auto:/.test(r.key)&&recurringAll().filter(x=>x.name==='Tienda Suelta Prueba').length===1&&same&&noBtn; },cal.nfKey);
  ok(txr.btn&&txr2&&txr3,'desde la ficha de un movimiento se anota como pago recurrente (o abre el que ya existe, y lo recupera si estaba quitado); en los ingresos no aparece');
  await pg.evaluate(()=>route()); await pg.waitForTimeout(150);
  const stt=await pg.evaluate(()=>{ const st=recStats(), on=recurringAll().filter(r=>!r.off), tot=on.reduce((s,r)=>s+recMonthly(r)*12,0), sum=a=>a.reduce((s,x)=>s+x.v,0), near=(a,b)=>Math.abs(a-b)<0.01;
    const pcts=g=>[...g.querySelectorAll('.v b')].map(b=>parseFloat(b.textContent)), gs=[...document.querySelectorAll('#calStats .hb')], order=st.freq.map(f=>f.k).join();
    return {total:st.total>0&&near(st.total,tot)&&near(sum(st.freq),tot)&&near(sum(st.cat),tot)&&st.freq.reduce((s,x)=>s+x.n,0)===on.length,two:gs.length===2&&gs.every(g=>Math.abs(pcts(g).reduce((a,b)=>a+b,0)-100)<1.5),
      freq:/Mensual/.test(gs[0].textContent)&&/Anual/.test(gs[0].textContent)&&order.indexOf('Mensual')<order.indexOf('Anual'),cat:st.cat.every((c,i)=>!i||st.cat[i-1].v>=c.v)&&st.cat.length<=8&&/Hipoteca casa/.test(gs[1].textContent),last:!!($('#calNotify').compareDocumentPosition($('#calStats'))&4),tip:!!$('#calStats [data-st]')&&/pago/.test($('#calStats [data-st]').dataset.st)}; });
  ok(allTrue(stt),'al final del Calendario, dos gráficos: porcentaje del gasto anual recurrente por frecuencia de pago y por tipo de gasto ('+JSON.stringify(stt)+')');
  await pg.fill('#calMin','100000'); await pg.dispatchEvent('#calMin','change'); await pg.waitForTimeout(150); const th1=await pg.evaluate(()=>S.settings.cal.min===100000&&!$('#calNow')&&!computeAlerts().some(a=>a.key.startsWith('pay:')));
  await pg.fill('#calMin','500'); await pg.dispatchEvent('#calMin','change'); await pg.waitForTimeout(150); await pg.fill('#calPay','10, 24'); await pg.dispatchEvent('#calPay','change'); await pg.waitForTimeout(150);
  const th2=await pg.evaluate(()=>S.settings.cal.min===500&&!!$('#calNow')&&S.settings.cal.payDays.join()==='10,24'&&payPlan().mode==='manual'&&/día 10 y el 24/.test($('#calPlan').textContent)); await pg.fill('#calPay',''); await pg.dispatchEvent('#calPay','change'); await pg.waitForTimeout(150);
  ok(th1&&th2&&await pg.evaluate(()=>payPlan().mode==='auto'),'el usuario elige el importe desde el que un pago es importante y puede escribir sus días de cobro');
  await pg.evaluate(()=>[...document.querySelectorAll('#calNext .cev')].find(b=>/Extracto · Tarjeta Calendario Prueba/.test(b.textContent)).click()); await pg.waitForSelector('#stD'); await pg.fill('#stD','20'); await pg.click('#stOk'); await pg.waitForTimeout(150);
  const sh1=await pg.evaluate(()=>acc('clS').stmtDay===20); await pg.evaluate(()=>{ delete acc('clS').stmtDay; [...document.querySelectorAll('#calNext .cev')].find(b=>/Actividad de/.test(b.textContent)).click(); }); await pg.waitForSelector('#acImp');
  ok(sh1&&await pg.evaluate(()=>/Banco Calendario Prueba/.test($('#modal').textContent)&&/Datos hasta/.test($('#modal').textContent)&&!!$('#modal .sst')),'tocar un extracto permite decir qué día sale; tocar la actividad del mes muestra hasta dónde llega cada cuenta'); await pg.click('#mc');
  // Notificación: sin permiso del navegador (headless clásico) no se activa ni se guarda nada fuera de la bóveda
  await pg.click('#calSys'); await pg.waitForTimeout(400); const np1=await pg.evaluate(async()=>!$('#calSys').checked&&S.settings.cal.sys===false&&(await IDB.get('calsched'))===undefined);
  ok(np1&&await pg.evaluate(async()=>{ S.settings.cal.sys=true; await calSysCheck(); const r=(await IDB.get('calsched'))===undefined, t=await calSysStatus(); S.settings.cal.sys=false; return r&&t.length>20; }),'sin permiso de notificaciones no se activa ni se guarda nada fuera de la bóveda (tampoco si se activó en otro dispositivo)');
  await pg.waitForTimeout(400); ok(!/COLEGIO PRUEBA|SEGURO HOGAR|Netflix casa/.test(await pg.evaluate(()=>IDB.get('vault').then(v=>JSON.stringify(v)))),'los pagos recurrentes van cifrados en la bóveda');
  await pg.goto(U+'#resumen'); await pg.waitForTimeout(300); const ra=await pg.evaluate(()=>/COLEGIO PRUEBA/.test($('#alertBox').textContent)); await pg.evaluate(()=>goAlert(computeAlerts().find(a=>a.key.startsWith('pay:')).go)); await pg.waitForTimeout(200);
  ok(ra&&await pg.evaluate(()=>location.hash==='#calendario'&&!!$('#calNow')),'el aviso de pagos importantes sale en el Resumen y lleva al Calendario');
  await pg.evaluate(()=>setLang('en')); await pg.waitForTimeout(250); const calEn=[(await pg.$eval('body',e=>e.innerText)).match(/\b(Añadir|Guardar|Cancelar|movimientos|Ingresos|Gastos|Saldo|Cuentas|Editar|Importar|Borrar|también|según|Resumen|Hipotecas|cuota|Impuestos|Familia|Ahorro|Patrimonio|Cartera|Noticias|titulares|fuentes|Pagos|Nómina|Extracto|Hoy|próximo|Mensual|Anual)\b/)];
  await pg.click('#recAdd'); await pg.waitForSelector('#rcN'); calEn.push((await pg.$eval('#modal',e=>e.innerText)).match(/\b(Nombre|Importe|Categoría|Aviso|Aceptar|Cancelar|Siempre|Nunca|Mensual)\b/)); await pg.click('#mc');
  if(process.env.SHOTS) await pg.screenshot({path:process.env.SHOTS+'/en-calendario-movil.png',fullPage:true});
  ok(calEn.every(m=>!m)&&await pg.evaluate(()=>/Significant payment alerts/.test($('#calNotify').textContent)&&/Recurring payments/.test($('#calRec').textContent)&&$('#pageTitle').innerText==='Calendar'),'Calendario en inglés'+(calEn.some(Boolean)?' — quedan textos: '+calEn.filter(Boolean).map(m=>m[0]).join(', '):''));
  await pg.evaluate(()=>setLang('es'));
  ok(await pg.evaluate(()=>{ closeModal(); S.recurring.push({id:'clOv',key:'mort:clM',notify:false}); deleteAccount('clM'); const r=!S.recurring.some(x=>x.key&&x.key.includes('clM'));
    const k=window.__calKeep; S.accounts=k.accounts; S.tx=k.tx; S.snapshots=k.snapshots; S.imports=k.imports; if(k.recurring===undefined) delete S.recurring; else S.recurring=k.recurring; if(k.cal===undefined) delete S.settings.cal; else S.settings.cal=k.cal; S.settings.alertIgnore=k.ign;
    delete window.__calKeep; CAL.m=null; REC=null; save(); location.hash='#resumen'; route(); return r; }),'al borrar una cuenta se quitan los cambios sobre sus pagos');
  await pg.waitForTimeout(300);
  // Resumen → Adónde va tu gasto: todo el gasto por categoría (no solo el recurrente), con periodo y enlace a Movimientos
  { await pg.goto(U+'#resumen'); await pg.waitForTimeout(300);
    const r=await pg.evaluate(()=>{ const cf=cashflowByMonth(), cur=ym(today()), last=Object.keys(cf).filter(m=>m<cur).sort().pop(), d=spendData(cf,last,1);
      const rows=document.querySelectorAll('#cSpend .hb .bar').length, sum=d?d.items.reduce((s,x)=>s+x.v,0):0;
      return {rows,last,match:!!d&&Math.abs(sum-cf[last].expense)<1&&d.items.length>0,pressed:document.querySelector('#cSpend [data-sp="12"]').getAttribute('aria-pressed')}; });
    await pg.click('#cSpend [data-sp="1"]'); await pg.waitForTimeout(100);
    const one=await pg.evaluate(()=>({on:document.querySelector('#cSpend [data-sp="1"]').classList.contains('pri'),txt:document.querySelector('#cSpend .sub').innerText}));
    if(process.env.SHOTS){ for(const [lg,w,n] of [['es',412,'gasto-movil'],['es',1200,'gasto-escritorio'],['en',412,'en-gasto-movil'],['en',1200,'en-gasto-escritorio']]){ await pg.setViewportSize({width:w,height:900}); await pg.evaluate(l=>setLang(l),lg); await pg.waitForTimeout(250); await pg.$eval('#spendCard',e=>e.scrollIntoView()); await pg.locator('#spendCard').screenshot({path:process.env.SHOTS+'/'+n+'.png'}); }
      await pg.setViewportSize({width:412,height:900}); await pg.evaluate(()=>setLang('es')); await pg.waitForTimeout(200); }
    const cat=await pg.evaluate(()=>{ const a=document.querySelector('#cSpend [data-spc="0"]'); return a?a.dataset.spc:null; }); const want=await pg.evaluate(()=>{ const cf=cashflowByMonth(), last=Object.keys(cf).filter(m=>m<ym(today())).sort().pop(); return {cat:spendData(cf,last,1).items[0].cat,last}; });
    await pg.click('#cSpend [data-spc="0"]'); await pg.waitForTimeout(300);
    const go=await pg.evaluate(()=>({h:location.hash,cat:flujoFilter.cat,month:flujoFilter.month}));
    ok(r.rows>0&&r.match&&r.pressed==='true'&&one.on&&cat==='0'&&go.h==='#flujo'&&go.cat===want.cat&&go.month===want.last,'Resumen: «Adónde va tu gasto» reparte todo el gasto del mes por categoría y lleva a sus movimientos '+JSON.stringify([r,one.on,go]));
    await pg.evaluate(()=>{ flujoFilter.cat='all'; flujoFilter.month='all'; SPEND_P=12; }); }
  // Inglés en todas las pantallas
  await pg.evaluate(()=>setLang('en')); const views=['resumen','flujo','hipotecas','inversiones','jubilacion','noticias','alquiler','cuentas','importar','calendario','dividir','claude','ayuda','ajustes']; const bad=[];
  const ES=/\b(Añadir|Guardar|Cancelar|movimientos|Ingresos|Gastos|Saldo|Cuentas|Editar|Importar|Borrar|también|según|Resumen|Hipotecas|cuota|Impuestos|Familia|Ahorro|Patrimonio|Cartera|Noticias|titulares|fuentes)\b/;
  for(const v of views){ await pg.goto(U+'#'+v); await pg.waitForTimeout(250); const t=await pg.$eval('body',e=>e.innerText); const m=t.match(ES); if(m) bad.push(v+': '+m[0]); }
  for(const tab of ['resumen','perfil','optimizar','turbotax']){ await pg.goto(U+'#impuestos'); await pg.evaluate(t=>{taxSel.tab=t;route();},tab); await pg.waitForTimeout(250); const t=await pg.$eval('body',e=>e.innerText); const m=t.match(ES); if(m) bad.push('impuestos/'+tab+': '+m[0]); }
  ok(!bad.length,'todas las pantallas en inglés'+(bad.length?' — quedan textos: '+bad.join(' | '):''));
  if(process.env.SHOTS){ const sh=async(h,n,fn)=>{ await pg.goto(U+'#'+h); await pg.waitForTimeout(300); if(fn) await fn(); await pg.waitForTimeout(250); await pg.screenshot({path:process.env.SHOTS+'/'+n+'.png',fullPage:true}); };
    await pg.setViewportSize({width:1200,height:900}); await sh('resumen','en-resumen-escritorio'); await sh('ayuda','en-manual-escritorio'); await sh('ajustes','en-ajustes-escritorio');
    await sh('impuestos','en-optimizar-escritorio',()=>pg.evaluate(()=>{taxSel.tab='optimizar';route();})); await sh('cuentas','en-editar-cuenta',async()=>{ await pg.click('[data-acc]'); await pg.click('#modal [data-edit]'); });
    await pg.click('#mc'); await sh('flujo','en-categorias',()=>pg.click('#catMgr')); await pg.click('#ucClose'); await pg.setViewportSize({width:412,height:900}); }
  if(process.env.SHOTS){ await pg.goto(U+'#flujo'); await pg.waitForTimeout(400); await pg.screenshot({path:process.env.SHOTS+'/en-flujo-movil.png'}); await pg.click('#app .ib'); await pg.waitForTimeout(200); await pg.screenshot({path:process.env.SHOTS+'/en-ayuda-movil.png'}); await pg.click('#mc'); }
  if(process.env.SHOTS){ await pg.setViewportSize({width:412,height:900}); await pg.goto(U+'#flujo'); await pg.waitForTimeout(300); await pg.$eval('#txList',e=>e.scrollIntoView()); await pg.screenshot({path:process.env.SHOTS+'/movs-movil-en.png'}); await pg.setViewportSize({width:1200,height:900}); await pg.goto(U+'#flujo'); await pg.waitForTimeout(300); await pg.$eval('#txList',e=>e.scrollIntoView()); await pg.screenshot({path:process.env.SHOTS+'/movs-escritorio-en.png'}); await pg.setViewportSize({width:412,height:900}); }
  await pg.evaluate(()=>setLang('es')); await pg.waitForTimeout(200);
  if(process.env.SHOTS){ await pg.setViewportSize({width:1200,height:900}); await pg.goto(U+'#flujo'); await pg.waitForTimeout(500); await pg.$eval('#recBox',e=>e.scrollIntoView()); await pg.screenshot({path:process.env.SHOTS+'/flujo-escritorio.png'}); await pg.goto(U+'#hipotecas'); await pg.waitForTimeout(400); await pg.screenshot({path:process.env.SHOTS+'/hipotecas-escritorio.png'}); await pg.setViewportSize({width:412,height:900}); }
  await pg.goto(U+'#ajustes'); await pg.waitForTimeout(300); await pg.fill('#sKey','sk-ant-test'); await pg.click('#sKeySave'); await pg.waitForTimeout(300);
  await pg.click('#sKeyTest'); await pg.waitForTimeout(600); ok(/Funciona/.test(await pg.$eval('#sKeyMsg',e=>e.innerText)),'clave de API (mock)');
  // Dividir la cuenta: foto del ticket → Claude (simulado) → reparto a partes iguales y por consumo entre tarjetas
  { await pg.goto(U+'#dividir'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(()=>!!$('#spCam')&&$('#spCam').getAttribute('capture')==='environment'&&!!$('#spPick')&&!!$('#spManual')&&document.querySelector('nav a.on').getAttribute('href')==='#dividir'&&$('#pageTitle').innerText==='Dividir la cuenta'),'Dividir la cuenta: foto con la cámara, elegir fotos o a mano');
    await pg.setInputFiles('#spPick',path.join(ROOT,'icons','icon-192.png')); await pg.waitForSelector('#spNoAsk',{timeout:5000});
    const asked=await pg.evaluate(()=>/no se guarda en MyFinZen/.test($('#modal').innerText)&&!!$('#modal .sp-thumbs img')); await pg.click('#cY'); await pg.waitForSelector('#spTicket',{timeout:8000}); await pg.waitForTimeout(200);
    const req=RECEIPT_REQ[0]||'', rq=req?JSON.parse(req).messages[0].content:[];
    ok(asked&&RECEIPT_REQ.length===1&&rq[0].type==='image'&&rq[0].source.type==='base64'&&rq[0].source.media_type==='image/jpeg'&&rq[0].source.data.length>200&&!/icon-192/.test(req),'pide permiso y envía a Claude solo la foto reducida en JPEG');
    const t1=await pg.evaluate(()=>{ const s=spCurrent(), T=spTotals(s), E=spEven(s,T); return {pwn:window.__pwn,img:[...document.querySelectorAll('#app img')].every(i=>i.closest('.sp-thumbs')),n:s.items.length,cur:s.cur,people:s.people,cards:s.cards.map(c=>c.n).join(),
      tip:T.tip,total:T.total,amts:E.rows.map(r=>r.v).join(),shown:[...document.querySelectorAll('[data-amt]')].map(e=>e.innerText).join(),chk:$('#spChk').innerText,tot:$('#spTotV').innerText}; });
    ok(t1.pwn===undefined&&t1.img&&t1.n===4&&t1.cur==='USD'&&t1.people===4&&t1.cards==='2,2'&&t1.tip===9.9&&t1.total===69.99&&t1.amts==='35,34.99'&&t1.shown==='$35.00,$34.99'&&/subtotal del ticket/.test(t1.chk)&&/Cuadra con el total/.test(t1.chk)&&!/⚠/.test(t1.chk)&&t1.tot==='$69.99','lee el ticket (sin inyecciones), comprueba subtotal y total, propina del 18 % y 4 personas con 2 tarjetas '+JSON.stringify(t1));
    await pg.click('#spCards [data-d="1"]'); await pg.waitForTimeout(150);
    const t2=await pg.evaluate(()=>{ const s=spCurrent(), E=spEven(s,spTotals(s)); return {people:s.people,amts:E.rows.map(r=>r.v).join(),shown:[...document.querySelectorAll('[data-amt]')].map(e=>e.innerText).join()}; });
    ok(t2.people===5&&t2.amts==='42,27.99'&&t2.shown==='$42.00,$27.99','a partes iguales: una tarjeta cubre 3 personas y otra 2, y la suma da el total '+JSON.stringify(t2));
    await pg.fill('#spFtax','6.09'); await pg.waitForTimeout(150);
    ok(await pg.evaluate(()=>/⚠/.test($('#spChk').innerText)&&$('#spTotV').innerText==='$70.99'&&!!document.activeElement&&document.activeElement.id==='spFtax'),'al cambiar los impuestos se recalcula sin perder el foco y avisa si no cuadra');
    await pg.fill('#spFtax','5.09'); await pg.click('[data-tip="20"]'); await pg.waitForTimeout(150);
    ok(await pg.evaluate(()=>{ const T=spTotals(spCurrent()); return T.tip===11&&T.total===71.09&&S.settings.split.tip===20&&$('[data-tip="20"]').classList.contains('on'); }),'propina del 20 % sobre el subtotal (y se recuerda)');
    await pg.click('[data-mode="items"]'); await pg.waitForTimeout(150);
    const ids=await pg.evaluate(()=>{ const s=spCurrent(); return {it:s.items.map(i=>i.id),c:s.cards.map(c=>c.id)}; });
    await pg.click(`[data-as="${ids.it[0]}"][data-c="${ids.c[0]}"]`); await pg.click(`[data-as="${ids.it[1]}"][data-c="${ids.c[1]}"]`); await pg.click(`[data-as="${ids.it[2]}"][data-c="*"]`); await pg.waitForTimeout(150);
    const t3=await pg.evaluate(()=>{ const s=spCurrent(), T=spTotals(s), R=spItems(s,T), sum=R.rows.reduce((a,r)=>a+Math.round(r.v*100),0)+Math.round(R.rest.v*100);
      return {sum,tot:Math.round(T.total*100),items:R.rows.map(r=>r.items).join(),un:R.nUn,unv:R.rest.v,res:$('#spRes').innerText,shared:s.items[2].to.length}; });
    ok(t3.sum===t3.tot&&t3.items==='26.5,22'&&t3.un===1&&t3.unv>6.5&&t3.shared===2&&/Sin asignar/.test(t3.res)&&/Cada tarjeta paga/.test(t3.res),'por consumo: cada tarjeta paga lo suyo más su parte de impuestos y propina; lo compartido a medias; avisa de lo que falta '+JSON.stringify(t3));
    await pg.click(`[data-spu="${ids.it[2]}"]`); await pg.waitForTimeout(150);
    ok(await pg.evaluate(()=>{ const s=spCurrent(), c=s.items.filter(i=>i.name==='Cerveza Prueba'); return s.items.length===5&&c.length===2&&c.every(i=>i.qty===1&&i.price===8&&i.to.length===2); }),'una línea con 2 unidades se separa en dos productos');
    await pg.click('#spShare'); await pg.waitForTimeout(150);
    ok(await pg.evaluate(()=>{ const t=$('#spTxt').innerText; return /sin cifrar/.test($('#modal').innerText)&&/Tarjeta 1: \$/.test(t)&&/Hamburguesa Prueba/.test(t)&&/Total: \$71\.09/.test(t); }),'compartir el reparto avisa de que el texto sale sin cifrar'); await pg.click('#mc');
    if(process.env.SHOTS){ for(const [lg,w,n] of [['es',412,'dividir-movil'],['en',412,'en-dividir-movil'],['es',1200,'dividir-escritorio']]){ await pg.setViewportSize({width:w,height:900}); await pg.evaluate(l=>setLang(l),lg); await pg.waitForTimeout(250); await pg.screenshot({path:process.env.SHOTS+'/'+n+'.png',fullPage:true}); }
      await pg.evaluate(()=>{ spCurrent().mode='even'; route(); }); await pg.waitForTimeout(200); await pg.screenshot({path:process.env.SHOTS+'/dividir-iguales-escritorio.png',fullPage:true}); await pg.evaluate(()=>{ spCurrent().mode='items'; }); await pg.setViewportSize({width:412,height:900}); await pg.evaluate(()=>setLang('es')); }
    await pg.evaluate(()=>setLang('en')); await pg.waitForTimeout(200);
    const en=await pg.evaluate(()=>{ const t=$('#app').innerText; return {m:(t.match(/\b(Añadir|Guardar|Cancelar|Borrar|Tarjeta|Productos|Propina|Impuestos|personas|Compartir|Sin asignar)\b/)||[])[0]||null,ok:/Who ordered what\?/.test(t)&&/Each card pays/.test(t)&&/Card 1/.test(t)&&$('#pageTitle').innerText==='Split the bill'}; });
    ok(!en.m&&en.ok,'Dividir la cuenta en inglés '+JSON.stringify(en)); await pg.evaluate(()=>setLang('es')); await pg.waitForTimeout(200);
    await pg.waitForTimeout(400);
    ok(!/Hamburguesa Prueba|Bistró/.test(await pg.evaluate(()=>IDB.get('vault').then(v=>JSON.stringify(v))))&&await pg.evaluate(()=>S.splits.length===1),'el ticket se guarda cifrado');
    const san=await pg.evaluate(()=>{ const r=sanitizeSplits([{id:'s"><b>',cards:[{id:'a',n:'x'},{id:'b',n:500}],items:[{name:'<b>x',price:'5',to:['a','zz','a']},{price:'nope'}],cur:'<b>',mode:'raro',tipPct:500,people:-3},'x',null])[0], s2=sanitizeState({splits:[{cards:[]}],settings:{split:{tip:'<b>',ask:false}}});
      return r.id==='sb'&&r.cards[0].n===1&&r.cards[1].n===99&&r.items[0].to.join()==='a'&&r.items[0].price===5&&r.items[1].price===0&&r.cur==='USD'&&r.mode==='even'&&r.tipPct===null&&r.people===1&&s2.splits.length===1&&s2.splits[0].cards.length===1&&s2.settings.split.tip===null&&s2.settings.split.ask===false; });
    ok(san,'los tickets se validan al desbloquear y al restaurar');
    ok(await pg.evaluate(()=>{ const n=SPLIT.img.length; splitOnLock(); return n===1&&!SPLIT.img.length&&!SPLIT.cur; }),'la foto solo vive en memoria y se descarta al bloquear');
    await pg.goto(U+'#resumen'); await pg.waitForTimeout(100); await pg.goto(U+'#dividir'); await pg.waitForTimeout(250);
    ok(await pg.evaluate(()=>!!document.querySelector('#spRecent [data-spo]')&&!$('#spTicket')),'los tickets anteriores se pueden volver a abrir');
    await pg.click('#spManual'); await pg.waitForTimeout(150); await pg.fill('#spFsub','100'); await pg.waitForTimeout(150);
    ok(await pg.evaluate(()=>{ const s=spCurrent(); return s.src==='manual'&&!s.items.length&&$('#spTotV').innerText==='$120.00'&&[...document.querySelectorAll('[data-amt]')].map(e=>e.innerText).join()==='$60.00,$60.00'; }),'a mano: subtotal, propina recordada y dos tarjetas a partes iguales');
    await pg.evaluate(()=>{ S.splits=[]; SPLIT.cur=null; save(); }); }
  // Seguridad: CSP sin scripts incrustados, respuesta de Claude manipulada, copia manipulada, datos de noticias, utilidades
  ok(await pg.evaluate(()=>{ const c=document.querySelector('meta[http-equiv="Content-Security-Policy"]').content; return /script-src 'self';/.test(c)&&!/unsafe-inline[^;]*;\s*style/.test(c.split('script-src')[1].split(';')[0]+';style')&&![...document.scripts].some(x=>!x.src); }),'CSP sin scripts incrustados');
  await pg.goto(U+'#importar'); await pg.waitForTimeout(200); await pg.setInputFiles('#fPDF',path.join(FX,'bank.pdf')); await pg.waitForTimeout(1500); await pg.click('#gAI'); await pg.waitForTimeout(200); await pg.click('#cY'); await pg.waitForTimeout(800);
  const xs=await pg.evaluate(()=>({pwn:window.__pwn,img:document.querySelectorAll('#impOut img').length,gV:document.querySelector('#gV').value,rows:document.querySelectorAll('#impOut tbody tr').length,txt:document.querySelector('#impOut').innerText.includes('<img')}));
  ok(xs.pwn===undefined&&xs.img===0&&xs.gV==='12000'&&xs.rows===1&&xs.txt,'respuesta de Claude manipulada no inyecta nada ('+JSON.stringify(xs)+')'); await pg.click('#gCancel');
  await pg.evaluate(()=>{ window.__keep={S,dk:VAULT.dk}; VAULT.dk=null; S=sanitizeState({accounts:[{id:'a"><img src=x onerror="window.__pwn=6">',kind:'<b>',name:'<img src=x onerror="window.__pwn=7">',rate:'1"><img src=x>'}],
    tx:[{id:'t1',date:'2026-01-01',desc:'<img src=x onerror="window.__pwn=8">',amount:'-5',acc:'a"><img src=x onerror="window.__pwn=6">'},{date:'mal',amount:1},{date:'2026-01-02',amount:'abc'}],snapshots:[{acc:'x',date:'2026-01-01',value:'NaN'}],
    rules:[{pattern:'(',cat:'x'},{pattern:'ok',cat:'Compras'}],tax:{2026:{docs:[{type:'<img src=x onerror="window.__pwn=9">',fields:{wages:'abc',x:5}}],profile:{children:[{by:'<img>'}]}},'<b>':{}},settings:{lockMin:'<img>',userCats:[{name:'<img src=x>',type:'raro'}]}}); });
  const bad2=[]; for(const v of ['cuentas','flujo','impuestos','inversiones','hipotecas','resumen']){ await pg.goto(U+'#'+v); await pg.waitForTimeout(200); const r=await pg.evaluate(()=>({img:document.querySelectorAll('#app img').length,pwn:window.__pwn})); if(r.img||r.pwn) bad2.push(v); }
  const st=await pg.evaluate(()=>({id:S.accounts[0].id,kind:S.accounts[0].kind,rate:S.accounts[0].rate,tx:S.tx.length,acc:S.tx[0].acc===S.accounts[0].id,snaps:S.snapshots.length,rules:S.rules.length,type:S.tax[2026].docs[0].type,years:Object.keys(S.tax),lock:S.settings.lockMin,uc:S.settings.userCats[0].type}));
  await pg.evaluate(()=>{ S=window.__keep.S; VAULT.dk=window.__keep.dk; REC=null; delete window.__keep; route(); });
  ok(!bad2.length&&/^[\w-]+$/.test(st.id)&&st.kind==='other'&&st.rate===null&&st.tx===1&&st.acc&&st.snaps===0&&st.rules===1&&st.type==='OTHER'&&st.years.join()==='2026'&&st.lock===5&&st.uc==='expense','copia manipulada: datos validados y nada inyectado ('+bad2.join(',')+' '+JSON.stringify(st)+')');
  const u=await pg.evaluate(()=>({d:[parseDate('13/02/2026'),parseDate('02/30/2026'),parseDate('Oct 6, 2026'),parseDate('2026-10-06'),parseDate('10/1/26')],
    c:parseCSV('\uFEFFFecha;Concepto;Importe\n01/10/2026;"Compra, tienda";-12,50\n'),n:sanitizeNews({items:[{t:'Titular bueno de prueba',u:'https://a.com/x',p:'2026-10-01T00:00:00Z'},{t:'Malo',u:'javascript:alert(1)',p:'2026-10-01T00:00:00Z'},{t:'Sin fecha',u:'https://a.com',p:'x'}],regions:[{id:'"><img>',name:'x'},{id:'us',name:'EE. UU.'}]}),
    rec:Array.from({length:50},()=>makeRecovery()).every(r=>/^[A-Z0-9]{4}(-[A-Z0-9]{4}){5}$/.test(r)), f:[fmt(NaN),fmtK(Infinity),dLabel(undefined)]}));
  ok(u.d.join()==='2026-02-13,,2026-10-06,2026-10-06,2026-10-01'&&u.c.length===2&&u.c[0][0]==='Fecha'&&u.c[1][1]==='Compra, tienda'&&u.c[1][2]==='-12,50'&&u.n.items.length===1&&u.n.regions.length===1&&u.rec&&u.f.join()==='—,—,—','fechas, CSV con punto y coma, noticias validadas y formatos ('+JSON.stringify(u.d)+')');
  await pg.goto(U+'#ajustes'); await pg.waitForTimeout(300);
  await pg.fill('#bP','corta'); await pg.click('#bExp'); await pg.waitForTimeout(200); ok(await pg.evaluate(()=>!S.settings.lastBackup),'copia rechaza contraseñas cortas'); await pg.fill('#bP','copia segura 123'); const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#bExp')]); const bk=fs.readFileSync(await dl.path(),'utf8');
  ok(!/sk-ant/.test(bk)&&!/CuentaSecretaXYZ/.test(bk),'copia cifrada sin clave de API');
  const bkc=await pg.evaluate(async(bk)=>{ const o=JSON.parse(bk); const r={v:o.v,it:o.it}; try{ r.ok=(await decryptBackup(bk,'copia segura 123')).accounts.length>0; }catch(e){ r.ok=false; }
    try{ await decryptBackup(JSON.stringify(Object.assign({},o,{it:300000})),'copia segura 123'); r.tamper=false; }catch(e){ r.tamper=true; }
    try{ await decryptBackup(bk,'otra contraseña'); r.wrong=false; }catch(e){ r.wrong=true; }
    const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12)); const k=await deriveKey('vieja123',salt); const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify({accounts:[1],tx:[]})));
    r.v1=(await decryptBackup(JSON.stringify({app:'misfinanzas',v:1,salt:b64(salt),iv:b64(iv),data:b64(ct)}),'vieja123')).accounts.length===1; return r; },bk);
  ok(bkc.v===2&&bkc.it===600000&&bkc.ok&&bkc.tamper&&bkc.wrong&&bkc.v1,'copia v2: 600.000 iteraciones, cabecera autenticada y compatible con v1 ('+JSON.stringify(bkc)+')');
  await pg.evaluate(()=>{ S.accounts[0].name='FlushTest'; save(); }); await pg.click('#lockBtn'); await pg.waitForTimeout(500); ok(await pg.evaluate(()=>S===null),'bloqueo');
  await pg.click('.langsw [data-lang=en]'); await pg.waitForTimeout(200); ok(await pg.$eval('#gate h2',e=>e.innerText)==='Unlock','pantalla de desbloqueo en inglés');
  if(process.env.SHOTS) await pg.screenshot({path:process.env.SHOTS+'/en-gate-movil.png'});
  await pg.click('.langsw [data-lang=es]'); await pg.waitForTimeout(200);
  await pg.fill('#gP','incorrecta'); await pg.click('#gGo'); await pg.waitForTimeout(2500); ok(await pg.evaluate(()=>S===null),'contraseña incorrecta rechazada');
  await pg.fill('#gP',PASS); await pg.click('#gGo'); await pg.waitForTimeout(2500); ok(await pg.evaluate(()=>!!S&&S.accounts.length>=2),'desbloqueo con contraseña'); ok(await pg.evaluate(()=>S.accounts.some(a=>a.name==='FlushTest')),'bloquear guarda los últimos cambios pendientes');
  await pg.click('#lockBtn'); await pg.waitForTimeout(400); await pg.click('#gPk'); await pg.waitForTimeout(1500); ok(await pg.evaluate(()=>!!S),'desbloqueo con passkey');
  await pg.click('#lockBtn'); await pg.waitForTimeout(400); await pg.click('#gRec'); await pg.fill('#gR',rec.toLowerCase()); await pg.fill('#g1','otra frase segura 22'); await pg.fill('#g2','otra frase segura 22'); await pg.click('#gGo');
  await pg.waitForSelector('.reccode',{timeout:20000}); ok(true,'recuperación con clave'); await pg.check('#gOk'); await pg.click('#gNext'); await pg.waitForTimeout(300); if(await pg.$('#gSkip')) await pg.click('#gSkip');
  ok(await pg.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())),'service worker registrado');
  // Compartir desde otra app (Android): el service worker guarda los archivos en memoria y la app los importa al desbloquear
  await pg.evaluate(()=>navigator.serviceWorker.ready); if(!(await pg.evaluate(()=>!!navigator.serviceWorker.controller))){ await pg.reload(); await pg.waitForTimeout(800); }
  const shareUrl=await pg.evaluate(async()=>{ const fd=new FormData(); fd.append('files',new File(['Date,Description,Amount\n11/20/2026,COMPARTIDO DESDE EL BANCO,-9\n'],'compartido.csv',{type:'text/csv'})); const r=await fetch('./share-target',{method:'POST',body:fd}); return r.url; });
  ok(/\?share=[0-9a-f-]{36}$/.test(shareUrl),'el service worker recibe lo compartido y redirige a la app');
  await pg.goto(shareUrl.replace(/\?share=/,'?share=')+'#importar'); await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>!/share=/.test(location.href)&&/Desbloquea la app para importar el archivo/.test(document.querySelector('#toast').textContent)),'con la app bloqueada, avisa de que hay que desbloquear (y limpia la dirección)');
  ok(await pg.evaluate(async()=>{ for(const k of await caches.keys()){ const c=await caches.open(k); if((await c.keys()).some(q=>/share/.test(q.url))) return false; } return true; }),'lo compartido no se guarda en la caché');
  if(await pg.evaluate(()=>S===null)){ await pg.fill('#gP','otra frase segura 22'); await pg.click('#gGo'); } await pg.waitForFunction(()=>S&&BATCH&&!BATCH.running&&BATCH.res.length&&BATCH.res[0].name==='compartido.csv',null,{timeout:15000});
  ok(await pg.evaluate(()=>location.hash==='#importar'&&SHARED_FILES===null),'al desbloquear, importa lo compartido');
  await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(800); ok(await pg.evaluate(()=>document.title==='MyFinZen'),'carga sin conexión'); await ctx.setOffline(false);
  // ---------- Sincronización entre dispositivos (Dropbox simulado) ----------
  { const DBX={file:null,rev:0,codes:0,log:[]}, H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'Dropbox-API-Result'};
    const P2='frase sincronizada larga 9';
    const dev=async(name)=>{ const c=await b.newContext({viewport:{width:412,height:900},locale:'es-ES',serviceWorkers:'block'}); const p=await c.newPage(); const e=[]; p.on('pageerror',x=>e.push(name+': '+x.message)); p.on('dialog',d=>d.dismiss());
      await c.route('**/sync.js',async r=>{ const res=await r.fetch(); const body=(await res.text()).replace(/const CLOUD=\{dropbox:\{key:'[^']*'\}\};/,"const CLOUD={dropbox:{key:'clave-de-prueba'}};"); r.fulfill({response:res,body}); });
      await c.route('https://www.dropbox.com/oauth2/authorize**',r=>{ const u=new URL(r.request().url()); DBX.log.push('auth:'+u.searchParams.get('code_challenge_method')+':'+u.searchParams.get('token_access_type')); r.fulfill({status:302,headers:{location:u.searchParams.get('redirect_uri')+'?code=C'+(++DBX.codes)+'&state='+u.searchParams.get('state')}}); });
      await c.route('https://api.dropboxapi.com/oauth2/token',r=>{ if(r.request().method()==='OPTIONS') return r.fulfill({status:204,headers:H}); const q=new URLSearchParams(r.request().postData()); DBX.log.push('token:'+q.get('grant_type')+':'+(q.get('code_verifier')?'pkce':'')); r.fulfill({status:200,headers:H,contentType:'application/json',body:JSON.stringify({access_token:'AT-'+Math.random(),expires_in:14400,refresh_token:'RT-prueba-123456',token_type:'bearer'})}); });
      await c.route('https://content.dropboxapi.com/2/files/download',r=>{ if(r.request().method()==='OPTIONS') return r.fulfill({status:204,headers:H}); if(!DBX.file) return r.fulfill({status:409,headers:H,contentType:'application/json',body:'{"error_summary":"path/not_found/"}'}); r.fulfill({status:200,headers:Object.assign({'Dropbox-API-Result':JSON.stringify({rev:'r'+DBX.rev})},H),body:DBX.file}); });
      await c.route('https://content.dropboxapi.com/2/files/upload',r=>{ if(r.request().method()==='OPTIONS') return r.fulfill({status:204,headers:H}); const arg=JSON.parse(r.request().headers()['dropbox-api-arg']); const m=arg.mode['.tag'];
        if((m==='update'&&arg.mode.update!=='r'+DBX.rev)||(m==='add'&&DBX.file)) return r.fulfill({status:409,headers:H,contentType:'application/json',body:'{"error_summary":"path/conflict/file/"}'});
        DBX.file=r.request().postData(); DBX.rev++; r.fulfill({status:200,headers:H,contentType:'application/json',body:JSON.stringify({rev:'r'+DBX.rev})}); });
      await p.goto(U); await p.waitForTimeout(500); return {c,p,e}; };
    const unlock=async(p,pass)=>{ await p.waitForSelector('#gP'); await p.fill('#gP',pass); await p.click('#gGo'); await p.waitForFunction(()=>!!S,null,{timeout:15000}); await p.waitForTimeout(300); if(await p.$('#modalBg.show')) await p.evaluate(()=>closeModal()); };
    const settle=p=>p.waitForFunction(()=>!SYNC.busy,null,{timeout:15000});
    // Dispositivo A: crea su bóveda y conecta Dropbox
    const A=await dev('A'); await A.p.fill('#g1',P2); await A.p.fill('#g2',P2); await A.p.click('#gGo'); await A.p.waitForSelector('.reccode',{timeout:20000}); await A.p.check('#gOk'); await A.p.click('#gNext'); await A.p.waitForTimeout(300); if(await A.p.$('#gSkip')) await A.p.click('#gSkip'); await A.p.waitForTimeout(300); if(await A.p.$('#mc')) await A.p.click('#mc');
    await A.p.evaluate(()=>{ S.accounts.push({id:'syA',kind:'cash',name:'Cuenta Sincronizada Prueba'}); S.tx.push({id:'syT1',acc:'syA',date:today(),desc:'COMPRA DISPOSITIVO A',amount:-11,cat:'Compras'}); S.secret.apiKey='sk-ant-prueba-no-se-sincroniza'; save(); location.hash='#ajustes'; });
    await A.p.waitForSelector('#syDbx'); await A.p.click('#syDbx'); await unlock(A.p,P2); await settle(A.p);
    const fa=await A.p.evaluate(()=>({conf:!!(S.secret.sync&&S.secret.sync.p==='dropbox'&&S.secret.sync.rt),url:location.href}));
    ok(fa.conf&&DBX.file&&DBX.log.includes('auth:S256:offline')&&DBX.log.includes('token:authorization_code:pkce')&&!/code=/.test(fa.url),'conectar Dropbox: PKCE, token guardado en la bóveda, dirección limpia y primera subida');
    ok(!/Cuenta Sincronizada|COMPRA DISPOSITIVO|sk-ant|RT-prueba/.test(DBX.file)&&/"app":"myfinzen-sync"/.test(DBX.file),'la nube solo recibe datos cifrados (sin la clave de API ni el token)');
    ok(await A.p.evaluate(async t=>{ const rf=parseSyncFile(t); const st=JSON.parse(TD.decode(await unseal(VAULT.dk,rf.meta.data))); return !st.secret&&st.accounts.some(a=>a.id==='syA'); },DBX.file),'dentro del archivo: los datos, sin S.secret');
    // Dispositivo B: «Ya uso MyFinZen en otro dispositivo» → Dropbox → contraseña
    const B=await dev('B'); await B.p.click('#gJoin'); await B.p.waitForSelector('#jDbx'); await B.p.click('#jDbx'); await B.p.waitForSelector('#gP');
    const jn=await B.p.evaluate(()=>/Datos traídos de tu nube/.test(document.querySelector('#gate').textContent)); await unlock(B.p,P2); await settle(B.p);
    ok(jn&&await B.p.evaluate(()=>S.accounts.some(a=>a.id==='syA')&&S.tx.some(t=>t.id==='syT1')&&!S.secret.apiKey&&S.secret.sync.p==='dropbox'),'dispositivo nuevo: trae los datos de Dropbox y se desbloquea con la contraseña de siempre');
    // Cambios en los dos a la vez y un borrado
    await B.p.evaluate(()=>{ S.tx.push({id:'syT2',acc:'syA',date:today(),desc:'COMPRA DISPOSITIVO B',amount:-22,cat:'Compras'}); S.accounts.find(a=>a.id==='syA').name='Cuenta Renombrada en B'; });
    await A.p.evaluate(()=>{ S.tx.push({id:'syT3',acc:'syA',date:today(),desc:'COMPRA A SIN SINCRONIZAR',amount:-33,cat:'Compras'}); S.tx=S.tx.filter(t=>t.id!=='syT1'); });
    await B.p.evaluate(()=>syncNow()); await A.p.evaluate(()=>syncNow()); await B.p.evaluate(()=>syncNow());
    const ma=await A.p.evaluate(()=>({ids:S.tx.filter(t=>t.acc==='syA').map(t=>t.id).sort().join(),name:S.accounts.find(a=>a.id==='syA').name,rev:S.sv.rev,key:S.secret.apiKey}));
    const mb=await B.p.evaluate(()=>({ids:S.tx.filter(t=>t.acc==='syA').map(t=>t.id).sort().join(),name:S.accounts.find(a=>a.id==='syA').name,rev:S.sv.rev}));
    ok(ma.ids==='syT2,syT3'&&mb.ids==='syT2,syT3'&&ma.name==='Cuenta Renombrada en B'&&mb.name===ma.name&&ma.rev===mb.rev&&ma.key==='sk-ant-prueba-no-se-sincroniza','cambios a la vez en dos dispositivos: se juntan registro a registro, el borrado se propaga y la clave de API se queda en su dispositivo ('+JSON.stringify([ma,mb])+')');
    // Una versión vieja en la nube no deshace nada
    const old=DBX.file; await A.p.evaluate(()=>{ S.tx.push({id:'syT4',acc:'syA',date:today(),desc:'DESPUES',amount:-4,cat:'Compras'}); return syncNow(); }); await B.p.evaluate(()=>syncNow());
    DBX.file=old; DBX.rev++; await B.p.evaluate(()=>syncNow());
    ok(await B.p.evaluate(()=>S.tx.some(t=>t.id==='syT4')&&S.tx.some(t=>t.id==='syT2'))&&/"app"/.test(DBX.file)&&DBX.file!==old,'una versión antigua en la nube no deshace cambios: se vuelve a subir la buena');
    // A mano: el archivo exportado en A se suma en B
    await A.p.evaluate(()=>{ S.tx.push({id:'syT5',acc:'syA',date:today(),desc:'A MANO',amount:-5,cat:'Compras'}); });
    const man=await A.p.evaluate(async()=>buildSyncFile(bumpSv(syncState(S))));
    await B.p.evaluate(t=>manualImport(new File([t],'MyFinZen-sync.txt',{type:'text/plain'})),man); await B.p.waitForTimeout(200);
    ok(await B.p.evaluate(()=>S.tx.some(t=>t.id==='syT5')),'a mano: abrir el archivo de otro dispositivo suma sus cambios');
    // Cambiar la contraseña en un dispositivo llega a los demás
    await A.p.evaluate(async()=>{ await setPassword('contrasena nueva sincronizada'); await syncNow(); }); await B.p.evaluate(()=>syncNow());
    ok(await A.p.evaluate(()=>VAULT.meta.pw.salt)===await B.p.evaluate(()=>VAULT.meta.pw.salt),'cambiar la contraseña maestra en un dispositivo llega a los demás');
    // Dispositivo nuevo sin Dropbox: abrir el archivo de sincronización
    const D=await dev('D'); await D.p.click('#gJoin'); await D.p.waitForSelector('#jIn'); await D.p.setInputFiles('#jIn',{name:'MyFinZen-sync.txt',mimeType:'text/plain',buffer:Buffer.from(DBX.file)});
    await unlock(D.p,'contrasena nueva sincronizada');
    ok(await D.p.evaluate(()=>S.tx.some(t=>t.id==='syT4')&&S.secret.sync&&S.secret.sync.p==='manual'&&!!document.querySelector('#syncBtn:not([hidden])')),'dispositivo nuevo a mano: abre el archivo, desbloquea y queda en modo manual con la nube arriba'); await D.c.close();
    // Clave secreta de la bóveda
    const NP='contrasena nueva sincronizada';
    const skA=await A.p.evaluate(async p=>{ const sk=await enableSK(p); await syncNow(); return sk; },NP);
    const dk=await A.p.evaluate(async()=>{ const d=await IDB.get('devkey'); return {ext:d.key.extractable,alg:d.key.algorithm.name}; });
    ok(/^[0-9A-Z]{26}$/.test(skA)&&dk.ext===false&&dk.alg==='HKDF'&&/"sk":1/.test(DBX.file)&&!DBX.file.includes(skA),'clave secreta: 128 bits, guardada como clave no exportable y nunca en la nube');
    ok(await A.p.evaluate(async([t,p])=>{ const rf=parseSyncFile(t); try{ await unseal(await kdfPass(p,unb64(rf.meta.pw.salt),rf.meta.pw.it),rf.meta.pw.wrap); return false; }catch(e){ return true; } },[DBX.file,NP]),'con el archivo de la nube y la contraseña, pero sin la clave secreta, no se abre');
    await B.p.evaluate(()=>syncNow()); await B.p.evaluate(()=>lockNow()); await B.p.waitForSelector('#gP');
    await B.p.fill('#gP',NP); await B.p.click('#gGo'); await B.p.waitForFunction(()=>!document.querySelector('#gSKw').hidden&&/clave secreta/.test(document.querySelector('#gMsg').textContent),null,{timeout:15000});
    await B.p.fill('#gSK','ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZZ'); await B.p.click('#gGo'); await B.p.waitForFunction(()=>/no es la de esta bóveda/.test(document.querySelector('#gMsg').textContent),null,{timeout:15000});
    await B.p.fill('#gSK',skA.toLowerCase()); await B.p.click('#gGo'); await B.p.waitForFunction(()=>!!S,null,{timeout:15000}); await B.p.waitForTimeout(200);
    ok(await B.p.evaluate(async()=>{ const d=await IDB.get('devkey'); return !!d&&d.id===VAULT.meta.skid&&/^[0-9A-Z]{26}$/.test(S.secret.sk||''); }),'otro dispositivo: la contraseña sola no basta; con la clave secreta entra y la guarda para la próxima vez');
    await B.p.evaluate(()=>lockNow()); await unlock(B.p,NP); ok(await B.p.evaluate(()=>!!S),'después ya entra solo con la contraseña');
    const rot=await B.p.evaluate(async()=>{ const old=VAULT.meta.skid; DEVKEY=null; await IDB.del('devkey'); const fresh=await setPassword('contrasena nueva sincronizada'); return {fresh,changed:VAULT.meta.skid!==old}; });
    ok(/^[0-9A-Z]{26}$/.test(rot.fresh||'')&&rot.changed,'recuperar en un dispositivo sin la clave secreta crea una nueva');
    // Otra bóveda en la misma nube: no se mezcla, pregunta
    const C=await dev('C'); await C.p.fill('#g1','otra boveda distinta 7'); await C.p.fill('#g2','otra boveda distinta 7'); await C.p.click('#gGo'); await C.p.waitForSelector('.reccode',{timeout:20000}); await C.p.check('#gOk'); await C.p.click('#gNext'); await C.p.waitForTimeout(300); if(await C.p.$('#gSkip')) await C.p.click('#gSkip'); await C.p.waitForTimeout(300); if(await C.p.$('#mc')) await C.p.click('#mc');
    await C.p.evaluate(()=>{ location.hash='#ajustes'; }); await C.p.waitForSelector('#syDbx'); const before=DBX.file; await C.p.click('#syDbx'); await unlock(C.p,'otra boveda distinta 7'); await settle(C.p); await C.p.waitForTimeout(300);
    ok(await C.p.evaluate(()=>!!document.querySelector('#ovCloud')&&!S.accounts.some(a=>a.id==='syA'))&&DBX.file===before,'otra bóveda en la nube: no se mezcla ni se sobrescribe; pregunta qué hacer');
    // Cifrado: lo que hay en IndexedDB de B sigue cifrado y la base de la fusión no se sube
    ok(await B.p.evaluate(async()=>{ const v=await IDB.get('vault'); const t=JSON.stringify(v); return !!v.sync&&!!v.sync.base&&!/COMPRA DISPOSITIVO/.test(t); })&&!/"sync"/.test(DBX.file),'IndexedDB sigue cifrado y la base de la fusión no sale del dispositivo');
    const se=[].concat(A.e,B.e,C.e); ok(se.length===0,'sincronización sin errores en consola'+(se.length?': '+se.join(' | '):''));
    await A.c.close(); await B.c.close(); await C.c.close(); }
  // Calendario: notificación del sistema. Hace falta Chromium completo (headless nuevo): el headless clásico no concede el permiso de notificaciones.
  { let nb=null; try{ nb=await chromium.launch({channel:'chromium'}); }catch(e){ ok(false,'Chromium completo para probar las notificaciones (npx playwright install chromium): '+String(e.message).split('\n')[0]); }
    if(nb){ const c=await nb.newContext({viewport:{width:412,height:900},locale:'es-ES'}); const p=await c.newPage(); const ne=[]; p.on('pageerror',x=>ne.push(x.message)); p.on('console',m=>{ if(m.type()==='error') ne.push(m.text()); });
      await c.grantPermissions(['notifications']);
      await p.goto(U); await p.waitForTimeout(600); await p.fill('#g1',PASS); await p.fill('#g2',PASS); await p.click('#gGo'); await p.waitForSelector('.reccode',{timeout:20000}); await p.check('#gOk'); await p.click('#gNext'); await p.waitForTimeout(300); if(await p.$('#gSkip')) await p.click('#gSkip'); await p.waitForTimeout(300); if(await p.$('#mc')) await p.click('#mc');
      const tdy=await p.evaluate(()=>{ S.accounts.push({id:'ntA',kind:'cash',name:'Banco Aviso Prueba'}); S.recurring=[{id:'ntR',name:'PAGO SECRETO PRUEBA',amount:913.77,freq:'m',next:addDays(today(),1)}]; save(); location.hash='#calendario'; return today(); });
      await p.waitForSelector('#calSys'); await p.waitForTimeout(300); const pre=await p.evaluate(async()=>(await IDB.get('calsched'))===undefined);
      await p.check('#calSys'); await p.waitForFunction(()=>S.settings.cal.sys===true,null,{timeout:10000}); await p.waitForTimeout(700);
      const n1=await p.evaluate(async()=>{ await calSysCheck(); const r=await navigator.serviceWorker.ready, ns=await r.getNotifications(), sc=await IDB.get('calsched'), txt=JSON.stringify(sc)+ns.map(n=>n.title+n.body).join();
        return {one:ns.length===1&&/^mfz-pay-\d{4}-\d\d-\d\d$/.test(ns[0].tag)&&/1 pago importante/.test(ns[0].body),days:!!sc&&sc.days.length>0&&sc.days.every(x=>Object.keys(x).sort().join()==='d,n,u'),clean:!/SECRETO|913|Banco/.test(txt),shown:!!sc&&sc.shown.length===1,st:/Activado/.test($('#calSysSt').textContent)}; });
      ok(pre&&allTrue(n1),'notificación del sistema con la app abierta: una sola vez, sin nombres ni importes; fuera de la bóveda solo fechas y número de pagos ('+JSON.stringify(n1)+')');
      // Con la app cerrada y bloqueada lo hace el service worker al despertarlo el navegador (sincronización periódica simulada)
      const cdp2=await c.newCDPSession(p); const regs=[]; cdp2.on('ServiceWorker.workerRegistrationUpdated',e=>regs.push(...e.registrations)); await cdp2.send('ServiceWorker.enable'); await p.waitForTimeout(300);
      await p.evaluate(async()=>{ lockNow(); const r=await navigator.serviceWorker.ready; (await r.getNotifications()).forEach(n=>n.close()); const t=today(); await IDB.set('calsched',{v:1,lang:'en',days:[{d:t,u:addDays(t,3),n:2},{d:addDays(t,-20),u:addDays(t,-10),n:5},{d:addDays(t,9),u:addDays(t,12),n:1},{d:'<x>',u:t,n:1}],shown:[]}); });
      const fire=async()=>{ await cdp2.send('ServiceWorker.dispatchPeriodicSyncEvent',{origin:new URL(U).origin,registrationId:regs[regs.length-1].registrationId,tag:'mfz-cal'}); await p.waitForTimeout(700); };
      await fire(); await fire();
      const n2=await p.evaluate(async()=>{ const r=await navigator.serviceWorker.ready, ns=await r.getNotifications(), sc=await IDB.get('calsched'); return {n:ns.map(x=>x.tag+'|'+x.body),shown:sc.shown.join(),locked:!S}; });
      ok(regs.length>0&&n2.locked&&n2.n.length===1&&n2.n[0].startsWith('mfz-pay-'+tdy+'|')&&/2 significant payments/.test(n2.n[0])&&n2.shown===tdy,'con la app bloqueada, el service worker avisa solo de lo de hoy (ni lo caducado ni lo futuro) y no lo repite ('+JSON.stringify(n2)+')');
      ok(await p.evaluate(async()=>{ history.replaceState(null,'','#resumen'); navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'goto',hash:'#calendario'}})); return location.hash==='#calendario'; }),'tocar la notificación abre el Calendario');
      await p.fill('#gP',PASS); await p.click('#gGo'); await p.waitForFunction(()=>!!S,null,{timeout:15000}); await p.waitForSelector('#calSys'); await p.uncheck('#calSys'); await p.waitForFunction(()=>S.settings.cal.sys===false,null,{timeout:10000}); await p.waitForTimeout(500);
      ok(await p.evaluate(async()=>(await IDB.get('calsched'))===undefined),'al desactivar la notificación se borra el registro de avisos');
      ok(ne.length===0,'notificaciones sin errores en consola'+(ne.length?': '+ne.join(' | '):'')); await nb.close(); } }
  ok(errs.length===0,'sin errores en consola'+(errs.length?': '+errs.join(' | '):''));
  await b.close(); srv.close(); console.log(failed?`\n${failed} prueba(s) fallida(s)`:'\nTodo OK'); process.exit(failed?1:0);
})().catch(e=>{ console.error(e); srv.close(); process.exit(1); });
