// MyFinZen — Dividir la cuenta: lee la foto del ticket de un restaurante en el dispositivo (ticket.js) y reparte el total entre
// varias tarjetas de crédito, a partes iguales (según cuántas personas cubre cada tarjeta) o por persona (lo que pidió cada una).
// Todo es local: la foto no sale del dispositivo y todo lo leído se puede corregir a mano.
// Lo comparten MyFinZen (se carga después de app.js y ticket.js) y la app independiente dividir/ (después de dividir/app.js).
// La app anfitriona da: S, save, VIEWS, L, LANG, fmt, esc, num, numStrict, r2, uid, today, isoDate, dLabel, str, arr, obj, cleanId,
// ic, helpBtn, openModal, closeModal, confirmModal, toast y $; si define spHostActive(), dice cuándo se ve esta pantalla.
"use strict";
/* ============================================================
   Datos (dentro de la bóveda; se validan con sanitizeSplits en sanitizeState)
   S.splits = [{id, created, date, place, cur, src, items:[{id,name,qty,price,to:[idPersona]}], persons:[{id,name}],
                sub, disc, tax, svc, tot, tip, tipPct, mode:'even'|'items', people, cards:[{id,name,n,who:[idPersona]}]}]
     · mode 'items' = «Por persona»: personas con nombre → tarjetas con las personas que paga cada una (who; una persona va en
       una sola tarjeta) → a qué persona o personas corresponde cada producto (to)
     · sub / tot  subtotal y total impresos en el ticket: solo sirven para comprobar la lectura
     · tipPct     propina en % sobre el subtotal menos el descuento; si es null, tip es el importe
     · cards[].n  personas que paga esa tarjeta en el reparto a partes iguales (people = personas en total)
   Historial: todos los tickets con importe (hasta SPLIT_MAX), con lo que pagó cada tarjeta; los vacíos se descartan (spPrune).
   S.settings.split = {tip, tipLast, mode, people, cards:[{name,n}]}: preferencias para los tickets nuevos (propina, si se recuerda
     la última elegida, modo de reparto, personas si el ticket no lo dice y tarjetas habituales con cuántas personas paga cada una).
   La foto se lee en el dispositivo con ticket.js (no hay lectura en la nube).
   Las fotos NO se guardan: viven en memoria (SPLIT.img) hasta abrir otro ticket o bloquear la app.
   ============================================================ */
const SPLIT={cur:null,img:[],busy:false,err:null,prog:null,tab:'new',hf:null,hn:40};
const SPLIT_MAX=1000;   // historial: como mucho los 1.000 tickets más recientes
const SPLIT_PX=1568, SPLIT_TIPS=[0,15,18,20,22], SPLIT_CURS=['USD','EUR','MXN','GBP','CAD','JPY'];
function spCfg(){ const s=S.settings; s.split=sanitizeSplitPrefs(s.split); return s.split; }
const spHere=()=>typeof spHostActive==='function'?spHostActive():location.hash==='#dividir';
/* ---------- Validación (al desbloquear y al restaurar; la usan sanitizeState de MyFinZen y la app independiente) ---------- */
const spInt=(x,lo,hi,d)=>Math.max(lo,Math.min(hi,Math.round(numStrict(x)||d)));
function sanitizeSplitPrefs(c){ c=obj(c); const t=numStrict(c.tip);
  return {tip:t!=null&&t>=0&&t<=100?t:null,tipLast:c.tipLast!==false,mode:c.mode==='items'?'items':'even',people:spInt(c.people,1,99,2),
    cards:arr(c.cards).map(x=>({name:str(obj(x).name,60).trim(),n:spInt(obj(x).n,1,99,1)})).filter(x=>x.name).slice(0,10)}; }
// Tickets de restaurante repartidos entre tarjetas: S.splits, como mucho los SPLIT_MAX más recientes
function sanitizeSplits(v){ const n=(x,lo,hi)=>{ const y=numStrict(x); return y!=null&&y>=lo&&y<=hi?Math.round(y*100)/100:null; };
  return arr(v).map(s0=>{ const s=obj(s0), raw=arr(s.cards).slice(0,20), cards=raw.map(c=>{ c=obj(c); return {id:cleanId(c.id)||uid(),name:str(c.name,60),n:spInt(c.n,1,99,1),who:[]}; });
    if(!cards.length) cards.push({id:uid(),name:'',n:1,who:[]});
    let persons=null;
    if(Array.isArray(s.persons)){ const seenP=new Set(); persons=s.persons.map(p=>{ p=obj(p); return {id:cleanId(p.id)||uid(),name:str(p.name,40)}; }).filter(p=>!seenP.has(p.id)&&seenP.add(p.id)).slice(0,30);
      const pid=new Set(persons.map(p=>p.id)), used=new Set();   // cada persona, en una sola tarjeta
      cards.forEach((c,i)=>{ c.who=[...new Set(arr(obj(raw[i]).who).map(cleanId))].filter(x=>pid.has(x)&&!used.has(x)); c.who.forEach(x=>used.add(x)); }); }
    else { // tickets de antes de «Por persona»: tantas personas como pagaba cada tarjeta; la primera lleva el id de la tarjeta y así
      persons=[];  // lo que ya estaba asignado a la tarjeta pasa a esa persona
      cards.forEach(c=>{ for(let j=0;j<c.n&&persons.length<30;j++){ const id=j?uid():c.id; persons.push({id,name:''}); c.who.push(id); } }); }
    if(!persons.length){ persons.push({id:uid(),name:''}); cards[0].who.push(persons[0].id); }
    const ids=new Set(persons.map(p=>p.id));
    const items=arr(s.items).map(i=>{ i=obj(i); const p=n(i.price,-1e5,1e5); return {id:cleanId(i.id)||uid(),name:str(i.name,80),qty:spInt(i.qty,1,999,1),price:p==null?0:p,to:[...new Set(arr(i.to).map(cleanId))].filter(x=>ids.has(x))}; }).slice(0,300);
    const cur=typeof s.cur==='string'&&/^[A-Z]{3}$/.test(s.cur)?s.cur:'USD';
    return {id:cleanId(s.id)||uid(),created:typeof s.created==='string'&&!isNaN(Date.parse(s.created))?s.created.slice(0,30):new Date().toISOString(),date:isoDate(s.date)||today(),place:str(s.place,80),cur,src:s.src==='photo'?'photo':'manual',items,
      sub:n(s.sub,0,1e6),disc:n(s.disc,0,1e6)||0,tax:n(s.tax,0,1e6)||0,svc:n(s.svc,0,1e6)||0,tot:n(s.tot,0,1e6),tip:n(s.tip,0,1e6)||0,tipPct:n(s.tipPct,0,100),mode:s.mode==='items'?'items':'even',people:spInt(s.people,1,99,2),cards,persons}; }).slice(-SPLIT_MAX); }
function spList(){ if(!Array.isArray(S.splits)) S.splits=[]; return S.splits; }
function spCurrent(){ return SPLIT.cur?spList().find(s=>s.id===SPLIT.cur)||null:null; }
function spDropImgs(){ SPLIT.img.forEach(i=>{ try{ URL.revokeObjectURL(i.url); }catch(e){} }); SPLIT.img=[]; }
function splitOnLock(){ spDropImgs(); SPLIT.cur=null; SPLIT.busy=false; SPLIT.err=null; SPLIT.prog=null; SPLIT.tab='new'; SPLIT.hf=null; SPLIT.hn=40; if(typeof ocrStop==='function') ocrStop(); }
const spCardName=(c,i)=>c.name||L('Tarjeta','Card')+' '+(i+1);
const spPName=(p,i)=>p.name||L('Persona','Person')+' '+(i+1);
const spPIdx=(s,id)=>s.persons.findIndex(p=>p.id===id);
const spPNameId=(s,id)=>{ const i=spPIdx(s,id); return i<0?'':spPName(s.persons[i],i); };
const spInit=n=>String(n||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
const spHue=t=>{ let h=0; for(const ch of String(t)) h=(h*31+ch.charCodeAt(0))%360; return h; };
// Personas de un ticket: tantas como people; la tarjeta i se queda con las n siguientes
function spMakePersons(people,cards){ const persons=[]; for(let i=0;i<people&&i<30;i++) persons.push({id:uid(),name:''});
  let k=0; cards.forEach(c=>{ c.who=persons.slice(k,k+c.n).map(p=>p.id); k+=c.n; }); return persons; }
// Al pasar a «Por persona» sin haber nombrado ni asignado a nadie, las personas salen de lo que había a partes iguales
function spToPerson(s){ const fresh=s.persons.every(p=>!p.name.trim())&&!s.items.some(i=>i.to.length), want=Math.max(s.people,s.cards.reduce((a,c)=>a+c.n,0));
  if(fresh&&(s.persons.length!==want||s.cards.some(c=>c.who.length!==c.n))) s.persons=spMakePersons(want,s.cards); }
// Y al volver a partes iguales, las personas y las de cada tarjeta salen de las del reparto por persona
function spToEven(s){ if(s.persons.length) s.people=s.persons.length; s.cards.forEach(c=>{ if(c.who.length) c.n=c.who.length; }); }
function spFmt(n,cur){ if(!cur||cur==='USD') return fmt(n,2);
  try{ return new Intl.NumberFormat(LANG==='en'?'en-US':'es-ES',{style:'currency',currency:cur}).format(n); }catch(e){ return n.toFixed(2)+' '+cur; } }
const spNum=v=>{ const n=num(v); return Number.isFinite(n)?r2(n):0; };
const spIn=n=>n?r2(n).toFixed(2):'';

/* ---------- Cálculo (en céntimos, para que la suma de lo que paga cada tarjeta sea exactamente el total) ---------- */
// Reparte c céntimos según los pesos w por el método del resto mayor
function spAlloc(c,w){ const W=w.reduce((s,x)=>s+x,0); if(!(W>0)) return w.map(()=>0);
  const raw=w.map(x=>c*x/W), out=raw.map(Math.floor); let r=c-out.reduce((s,x)=>s+x,0);
  raw.map((x,i)=>[x-out[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([,i])=>{ if(r>0){ out[i]++; r--; } });
  return out; }
const spC=x=>Math.round((x||0)*100);
function spTotals(s){ const items=r2(s.items.reduce((a,i)=>a+(i.price||0),0)), base=s.items.length?items:r2(s.sub||0), net=r2(Math.max(0,base-(s.disc||0)));
  const tip=s.tipPct!=null?r2(net*s.tipPct/100):r2(s.tip||0), printed=r2(net+(s.tax||0)+(s.svc||0));
  return {items,base,net,tip,printed,total:r2(printed+tip)}; }
// A partes iguales: cada persona paga lo mismo y cada tarjeta, lo de las personas que cubre
function spEven(s,T){ const nC=s.cards.reduce((a,c)=>a+c.n,0), N=Math.max(s.people,nC,1), per=spAlloc(spC(T.total),Array(N).fill(1)); let k=0;
  const rows=s.cards.map(c=>{ let v=0; for(let j=0;j<c.n;j++) v+=per[k++]; return {id:c.id,n:c.n,v:v/100}; });
  let rest=0; for(;k<N;k++) rest+=per[k];
  return {rows,rest:rest/100,restN:N-nC,N,over:nC>s.people,per:T.total/N}; }
// Por persona: cada producto se reparte entre las personas marcadas; descuento, impuestos, servicio y propina, en proporción a lo
// que consumió cada una. Cada tarjeta paga lo de sus personas. Lo que no es de nadie queda «Sin asignar»; quien no va en ninguna
// tarjeta, «Sin tarjeta». Todo en céntimos: tarjetas + sin tarjeta + sin asignar = total.
function spPeople(s,T){ const ids=s.persons.map(p=>p.id), U='__u', w={}, mine={}; [...ids,U].forEach(k=>{ w[k]=0; mine[k]=[]; });
  s.items.forEach(it=>{ const to=it.to.filter(x=>ids.includes(x)), c=spC(it.price);
    if(!to.length){ w[U]+=c; mine[U].push(it.name); return; }
    spAlloc(c,to.map(()=>1)).forEach((v,i)=>{ w[to[i]]+=v; mine[to[i]].push(it.name+(to.length>1?` (1/${to.length})`:'')); }); });
  const keys=[...ids,U], wv=keys.map(k=>w[k]), extra=spC(T.total)-wv.reduce((a,x)=>a+x,0), ex=spAlloc(extra,wv.map(x=>Math.max(0,x)));
  ex[ex.length-1]+=extra-ex.reduce((a,x)=>a+x,0);   // sin consumo asignado, lo que sobra queda sin asignar
  const per={}; keys.forEach((k,i)=>{ per[k]={items:wv[i],extra:ex[i],v:wv[i]+ex[i],names:mine[k]}; });
  const owner={}; s.cards.forEach(c=>c.who.forEach(p=>{ if(ids.includes(p)&&!owner[p]) owner[p]=c.id; }));
  const free=ids.filter(p=>!owner[p]);
  return {persons:s.persons.map(p=>({id:p.id,card:owner[p.id]||null,items:per[p.id].items/100,extra:per[p.id].extra/100,v:per[p.id].v/100,names:per[p.id].names})),
    cards:s.cards.map(c=>{ const who=c.who.filter(p=>owner[p]===c.id); return {id:c.id,who,v:who.reduce((a,p)=>a+per[p].v,0)/100}; }),
    free:{ids:free,v:free.reduce((a,p)=>a+per[p].v,0)/100},un:{v:per[U].v/100,n:mine[U].length,names:mine[U]}}; }

/* ---------- Leer la foto (en el dispositivo) ---------- */
// Vista previa de la foto (solo en memoria): reducida a ~1.568 px y en JPEG
async function spShrink(file){ const bmp=await createImageBitmap(file), k=Math.min(1,SPLIT_PX/Math.max(bmp.width,bmp.height)), w=Math.max(1,Math.round(bmp.width*k)), h=Math.max(1,Math.round(bmp.height*k));
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,w,h); cx.drawImage(bmp,0,0,w,h); if(bmp.close) bmp.close();
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.85)); if(!blob) throw new Error('img');
  return {url:URL.createObjectURL(blob)}; }
// Lo leído en la foto se valida como cualquier dato externo (el texto del ticket podría ser cualquier cosa)
function sanitizeTicket(res){ res=obj(res); const n=(x,lo,hi)=>{ const y=numStrict(x); return y!=null&&y>=lo&&y<=hi?r2(y):null; };
  const cur=typeof res.currency==='string'?res.currency.trim().toUpperCase():'', g=numStrict(res.guests);
  return {place:str(res.place,80).trim(),date:isoDate(res.date),cur:/^[A-Z]{3}$/.test(cur)?cur:'USD',guests:g>=1&&g<=99?Math.round(g):null,
    items:arr(res.items).map(i=>{ i=obj(i); return {name:str(i.name,80).trim(),qty:Math.max(1,Math.min(999,Math.round(numStrict(i.qty)||1))),price:n(i.price,-1e5,1e5)}; }).filter(i=>i.name&&i.price!=null).slice(0,300),
    sub:n(res.subtotal,0,1e6),disc:Math.abs(n(res.discount,-1e6,1e6)||0),tax:n(res.tax,0,1e6)||0,svc:n(res.service,0,1e6)||0,tip:n(res.tip,0,1e6),tot:n(res.total,0,1e6)}; }
const spBack=()=>{ if(S&&spHere()) VIEWS.dividir($('#app')); };
// Lee las fotos EN EL DISPOSITIVO (ticket.js: preparar la imagen, Tesseract y parseReceipt). Nada sale del dispositivo.
async function spRead(files){ files=[...(files||[])].filter(f=>f&&f.size>0&&(/^image\//.test(f.type||'')||/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name||''))).slice(0,3); if(!files.length) return;
  const imgs=[]; try{ for(const f of files) imgs.push(await spShrink(f)); }catch(e){ imgs.forEach(i=>URL.revokeObjectURL(i.url)); toast(L('No he podido abrir la foto. Prueba con otra en JPEG o PNG.','I couldn\'t open the photo. Try another one in JPEG or PNG.')); return; }
  if(!S){ imgs.forEach(i=>URL.revokeObjectURL(i.url)); return; }
  spDropImgs(); SPLIT.img=imgs; SPLIT.err=null; SPLIT.busy=true; SPLIT.prog=null; SPLIT.cur=null; spBack();
  try{ const text=await ocrText(files,(st,pr,pass)=>{ SPLIT.prog={st,pr,pass}; spProg(); }); if(!S) return;
    const r=parseReceipt(text), t=sanitizeTicket({place:r.place,date:r.date,currency:r.cur,guests:r.guests,items:r.items,subtotal:r.sub,discount:r.disc,tax:r.tax,service:r.svc,tip:r.tip,total:r.tot});
    spNew(t,'photo');
    if(!t.items.length&&t.tot==null&&t.sub==null) SPLIT.err=L('No he encontrado importes en la foto. Prueba con otra más cerca, recta y con buena luz, o cópialos mirando la foto.','I couldn\'t find any amounts in the photo. Try another one closer, straight and well lit, or copy them from the photo.'); }
  catch(e){ if(!S) return; console.warn('ticket',e); spNew({},'photo'); SPLIT.err=L('No he podido leer el ticket: ','I couldn\'t read the receipt: ')+(e&&e.message||e)+' '+L('Copia los importes mirando la foto.','Copy the amounts from the photo.'); }
  finally{ SPLIT.busy=false; SPLIT.prog=null; spBack(); } }
function spProgText(){ const p=SPLIT.prog; if(!p||!p.st) return L('Preparando la foto…','Preparing the photo…');
  if(p.st==='recognizing text') return (p.pass?L(`No cuadra: lectura ${p.pass+1} de 3… `,`It doesn't add up: reading ${p.pass+1} of 3… `):L('Leyendo el ticket… ','Reading the receipt… '))+Math.round(p.pr*100)+' %';
  return L('Preparando el lector de tickets (la primera vez se descargan unos 7 MB)…','Getting the receipt reader ready (about 7 MB are downloaded the first time)…'); }
function spProg(){ const e=$('#spProg'), b=$('#spBar'); if(e) e.textContent=spProgText(); if(b) b.style.width=Math.round(((SPLIT.prog&&SPLIT.prog.pr)||0)*100)+'%'; }
function spDefTip(cur,svc){ if(svc>0) return 0; const t=spCfg().tip; return t!=null?t:cur==='USD'?18:0; }
// Tarjetas y personas de un ticket nuevo según las preferencias: las tarjetas habituales con sus personas; si el ticket dice
// cuántos comensales sois y no coincide, se reparten entre esas tarjetas a partes iguales
function spStartCards(guests){ const P=spCfg();
  if(P.cards.length){ const cards=P.cards.map(c=>({id:uid(),name:c.name,n:c.n}));
    if(guests&&guests>=cards.length&&guests!==cards.reduce((a,c)=>a+c.n,0)){ const b=Math.floor(guests/cards.length), r=guests%cards.length; cards.forEach((c,i)=>{ c.n=b+(i<r?1:0); }); }
    return {cards,people:Math.max(guests||P.people,cards.reduce((a,c)=>a+c.n,0))}; }
  const g=guests||P.people, c1=Math.ceil(g/2), cards=[{id:uid(),name:'',n:c1}]; if(g-c1>0) cards.push({id:uid(),name:'',n:g-c1});
  return {cards,people:g}; }
function spNew(t,src){ const cur=t.cur||'USD', st=spStartCards(t.guests||null);
  const s={id:uid(),created:new Date().toISOString(),date:t.date||today(),place:t.place||'',cur,src:src==='photo'?'photo':'manual',
    items:(t.items||[]).map(i=>({id:uid(),name:i.name,qty:i.qty||1,price:i.price,to:[]})),sub:t.sub!=null?t.sub:null,disc:t.disc||0,tax:t.tax||0,svc:t.svc||0,tot:t.tot!=null?t.tot:null,
    tip:t.tip>0?t.tip:0,tipPct:t.tip>0?null:spDefTip(cur,t.svc||0),mode:spCfg().mode,people:st.people,cards:st.cards,persons:spMakePersons(st.people,st.cards)};
  spPrune(); S.splits=spList().concat(s).slice(-SPLIT_MAX); SPLIT.cur=s.id; save(); return s; }

/* ---------- Pantalla ---------- */
function spTabsHTML(){ const n=spHist().length;
  return `<div class="ntabs sp-tabs" role="tablist"><button role="tab" data-sptab="new" class="${SPLIT.tab!=='hist'?'on':''}" aria-selected="${SPLIT.tab!=='hist'}">${L('Nuevo ticket','New receipt')}</button><button role="tab" data-sptab="hist" class="${SPLIT.tab==='hist'?'on':''}" aria-selected="${SPLIT.tab==='hist'}">${L('Historial','History')}${n?` <i>${n}</i>`:''}</button></div>`; }
const spStep=(k,v,lbl)=>`<span class="sp-step" role="group" aria-label="${esc(lbl)}"><button class="sm" data-st="${k}" data-d="-1" aria-label="${L('Menos','Fewer')}">−</button><b>${v}</b><button class="sm" data-st="${k}" data-d="1" aria-label="${L('Más','More')}">+</button></span>`;
function spStartHTML(){
  return `<div class="card" id="spStart">${helpBtn('split')}<h2>${L('Dividir la cuenta','Split the bill')}</h2>
    <p class="sub">${L('Haz una foto del ticket del restaurante y reparte el total entre las tarjetas: a partes iguales o por persona, según lo que pidió cada una.','Take a photo of the restaurant receipt and split the total between the cards: evenly or by person, according to what each one ordered.')}</p>
    <div class="choice">
      <label class="btn chl"><span class="av" style="--h:215">${ic('camera')}</span><span><b>${L('Hacer una foto del ticket','Take a photo of the receipt')}</b><span class="muted">${L('La app lee los productos, los impuestos y el total en tu dispositivo','The app reads the items, tax and total on your device')}</span></span><input type="file" id="spCam" accept="image/*" capture="environment"></label>
      <label class="btn chl"><span class="av" style="--h:262">${ic('upload')}</span><span><b>${L('Elegir fotos','Choose photos')}</b><span class="muted">${L('Del carrete o de tus archivos; hasta 3 si el ticket es largo','From your gallery or files; up to 3 if the receipt is long')}</span></span><input type="file" id="spPick" accept="image/*" multiple></label>
      <button id="spManual"><span class="av" style="--h:152">${ic('edit')}</span><span><b>${L('Escribirlo a mano','Type it by hand')}</b><span class="muted">${L('Sin foto: el total o los productos','No photo: the total or the items')}</span></span></button></div>
    <p class="muted" style="margin:12px 2px 0">${L('La foto se lee en este dispositivo y no sale de él. La primera vez se descarga el lector de tickets (unos 7 MB); después funciona también sin conexión.','The photo is read on this device and never leaves it. The first time, the receipt reader is downloaded (about 7 MB); after that it also works offline.')}</p>
    ${typeof spHostActive==='function'?'':`<p class="muted" style="margin:8px 2px 0">${L('También existe como app independiente, con sus propios usuarios, para quien no use MyFinZen:','It also exists as a standalone app, with its own users, for people who don\'t use MyFinZen:')} <a href="dividir/" id="spStandalone" target="_blank" rel="noopener">${L('abrir Dividir la cuenta','open Split the bill')}</a>.</p>`}
</div>`; }
// Preferencias del reparto (para los tickets nuevos)
const spModeL=m=>m==='items'?L('por persona','by person'):L('a partes iguales','evenly');
function spPrefsSummary(P){ return [spModeL(P.mode),P.tip==null?L('propina 18 %','18 % tip'):P.tip?L(`propina ${P.tip} %`,`${P.tip} % tip`):L('sin propina','no tip'),
  P.cards.length?P.cards.map(c=>c.name).join(', '):L('sin tarjetas habituales','no usual cards')].join(' · '); }
function spPrefsHTML(){ const P=spCfg(), tip=P.tip==null?18:P.tip;
  return `<details class="card" id="spPrefs" ${SPLIT.prefsOpen?'open':''}><summary><b>${L('Tus preferencias de reparto','Your split preferences')}</b><span class="muted sp-psum">${esc(spPrefsSummary(P))}</span></summary>
    <div class="sp-pbody">${helpBtn('split_prefs')}
    <h3 class="sec">${L('Cómo repartir por defecto','Default split')}</h3>
    <div class="ntabs" role="tablist"><button role="tab" data-pmode="even" class="${P.mode==='even'?'on':''}" aria-selected="${P.mode==='even'}">${L('A partes iguales','Evenly')}</button><button role="tab" data-pmode="items" class="${P.mode==='items'?'on':''}" aria-selected="${P.mode==='items'}">${L('Por persona','By person')}</button></div>
    <h3 class="sec">${L('Propina por defecto','Default tip')}</h3>
    <div class="nchips">${SPLIT_TIPS.map(p=>`<button data-ptip="${p}" class="${tip===p?'on':''}" aria-pressed="${tip===p}">${p?p+' %':L('Sin propina','No tip')}</button>`).join('')}</div>
    <label class="f" style="display:flex;gap:8px;align-items:center;margin:8px 2px 0"><input type="checkbox" id="spTipLast" style="width:auto" ${P.tipLast?'checked':''}> ${L('Recordar la última propina que elija en un ticket','Remember the last tip I choose on a receipt')}</label>
    <div class="sp-line"><span>${L('Personas, si el ticket no lo dice','People, if the receipt doesn\'t say')}</span>${spStep('pp',P.people,L('Personas por defecto','Default people'))}</div>
    <h3 class="sec">${L('Tarjetas habituales','Usual cards')}</h3>
    ${spCardList()}
    ${P.cards.length?`<div class="clist">${P.cards.map((c,i)=>`<div class="srow sp-card"><span class="av" style="--h:${(i*67+215)%360}">${ic('card')}</span>
      <span class="lm"><input data-pcn="${i}" list="spCardList" maxlength="60" value="${esc(c.name)}" aria-label="${L('Nombre de la tarjeta','Card name')}"><span class="sp-pp">${spStep('pc:'+i,c.n,L('Personas que paga','People it pays for'))} ${c.n===1?L('persona','person'):L('personas','people')}</span></span>
      <button class="sm ghost" data-pcx="${i}" aria-label="${L('Quitar tarjeta','Remove card')}">${ic('close')}</button></div>`).join('')}</div>`
      :`<p class="muted" style="margin:0 2px 6px">${L('Sin tarjetas habituales, cada ticket empieza con «Tarjeta 1» y «Tarjeta 2».','Without usual cards, each receipt starts with "Card 1" and "Card 2".')}</p>`}
    <button class="sm" id="spPAdd" style="margin-top:8px">${ic('plus')}${L('Añadir tarjeta','Add card')}</button>
    <p class="muted" style="margin:10px 2px 0">${L('Se aplican a los tickets nuevos. Si el ticket dice cuántos comensales sois, se reparten entre tus tarjetas habituales. En cada ticket puedes cambiarlo todo.','They apply to new receipts. If the receipt says how many guests you are, they are shared among your usual cards. On each receipt you can change everything.')}</p></div></details>`; }
// Sugerencias para el nombre de una tarjeta: las tarjetas de crédito de MyFinZen (si las hay) y las habituales
function spCardList(){ const names=[...(Array.isArray(S.accounts)?S.accounts.filter(a=>a.kind==='credit').map(a=>a.name+(a.last4?' ••'+a.last4:'')):[]),...spCfg().cards.map(c=>c.name)];
  return `<datalist id="spCardList">${[...new Set(names)].map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>`; }
/* ---------- Historial de tickets repartidos ---------- */
// Un ticket empezado y abandonado (sin importe, sin productos con nombre y sin restaurante) no va al historial
const spEmpty=s=>!(spTotals(s).total>0)&&!s.items.some(i=>i.name.trim())&&!s.place.trim();
function spPrune(){ const n=spList().length; S.splits=spList().filter(s=>!spEmpty(s)); return S.splits.length!==n; }
// Lo que pagó cada tarjeta en un ticket (y lo que quedó sin tarjeta)
function spPaid(s){ const T=spTotals(s);
  if(s.mode==='items'){ const R=spPeople(s,T); return {T,rows:s.cards.map((c,i)=>({name:spCardName(c,i),v:R.cards[i].v})),rest:r2(R.free.v+R.un.v),R}; }
  const E=spEven(s,T); return {T,rows:s.cards.map((c,i)=>({name:spCardName(c,i),v:E.rows[i].v})),rest:E.rest}; }
const spHist=()=>spList().filter(s=>spTotals(s).total>0).slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.created).localeCompare(String(a.created)));
const spNorm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
const spMonth=m=>{ try{ const t=new Intl.DateTimeFormat(LANG==='en'?'en-US':'es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T00:00:00Z')); return t.charAt(0).toUpperCase()+t.slice(1); }catch(e){ return m; } };
// Suma por moneda: "$120.00 · 35,00 €"
const spSum=list=>{ const m={}; list.forEach(([c,v])=>{ m[c]=(m[c]||0)+v; }); const e=Object.entries(m); return e.length?e.map(([c,v])=>spFmt(r2(v),c)).join(' · '):spFmt(0,'USD'); };
const spHF=()=>SPLIT.hf||(SPLIT.hf={y:'all',q:''});
function spHistRows(){ const F=spHF(), q=spNorm(F.q);
  return spHist().map(s=>Object.assign({s},spPaid(s))).filter(x=>(F.y==='all'||x.s.date.startsWith(F.y))
    &&(!q||spNorm([x.s.place,...x.s.items.map(i=>i.name),...x.rows.map(r=>r.name),...x.s.persons.map(p=>p.name)].join(' ')).includes(q))); }
function spHistHTML(){ const all=spHist(), F=spHF();
  if(!all.length) return `<div class="card" id="spHist">${helpBtn('split_hist')}<h2>${L('Historial de tickets','Receipt history')}</h2><p class="muted" style="margin:0">${L('Aquí quedará cada ticket que repartas: la fecha, el restaurante, el total y lo que pagó cada tarjeta.','Every receipt you split will be kept here: the date, the restaurant, the total and what each card paid.')}</p></div>`;
  const years=[...new Set(all.map(s=>s.date.slice(0,4)))];
  if(F.y!=='all'&&!years.includes(F.y)) F.y='all';
  return `<div class="card" id="spHist">${helpBtn('split_hist')}<h2>${L('Historial de tickets','Receipt history')}</h2>
    <div class="row sp-hf"><label class="f" style="flex:0 1 140px">${L('Año','Year')}<select id="spHy"><option value="all">${L('Todos','All')}</option>${years.map(y=>`<option ${F.y===y?'selected':''}>${esc(y)}</option>`).join('')}</select></label>
      <label class="f">${L('Buscar','Search')}<input id="spHq" type="search" value="${esc(F.q)}" placeholder="${L('Restaurante, producto, tarjeta o persona','Restaurant, item, card or person')}"></label></div>
    <div id="spHistBody">${spHistBody()}</div>
    <div class="row" style="margin-top:12px"><button id="spCSV">${ic('upload')}${L('Exportar (CSV)','Export (CSV)')}</button></div></div>`; }
function spHistBody(){ const list=spHistRows();
  if(!list.length) return `<p class="muted">${L('Ningún ticket coincide con el filtro.','No receipt matches the filter.')}</p>`;
  const months=new Map(); list.slice(0,SPLIT.hn).forEach(x=>{ const m=x.s.date.slice(0,7); if(!months.has(m)) months.set(m,[]); months.get(m).push(x); });
  const mTot=new Map(); list.forEach(x=>{ const m=x.s.date.slice(0,7); if(!mTot.has(m)) mTot.set(m,[]); mTot.get(m).push([x.s.cur,x.T.total]); });
  return `<div class="sp-hsum"><div><span>${L('Tickets','Receipts')}</span><b>${list.length}</b></div><div><span>${L('Total','Total')}</span><b>${esc(spSum(list.map(x=>[x.s.cur,x.T.total])))}</b></div></div>
    ${[...months].map(([m,xs])=>`<h3 class="sec">${esc(spMonth(m))} <span class="tot">${esc(spSum(mTot.get(m)))}</span></h3><div class="clist">${xs.map(x=>`<div class="srow sp-hrow">
      <span class="av" style="--h:24">${ic('receipt')}</span><span class="lm"><b>${esc(x.s.place||L('Ticket','Receipt'))}</b><span>${esc(dLabel(x.s.date))} · ${spModeL(x.s.mode)}</span>
      <span class="sp-hcards">${x.rows.map(r=>`${esc(r.name)} ${esc(spFmt(r.v,x.s.cur))}`).join(' · ')}${x.rest>0?` · ${L('sin tarjeta','no card')} ${esc(spFmt(x.rest,x.s.cur))}`:''}</span></span>
      <b>${esc(spFmt(x.T.total,x.s.cur))}</b><button class="sm" data-spo="${esc(x.s.id)}">${L('Abrir','Open')}</button><button class="sm ghost" data-spx="${esc(x.s.id)}" aria-label="${L('Borrar','Delete')}">${ic('trash')}</button></div>`).join('')}</div>`).join('')}
    ${list.length>SPLIT.hn?`<div class="row" style="margin-top:10px"><button id="spHMore">${L(`Ver más (${list.length-SPLIT.hn})`,`Show more (${list.length-SPLIT.hn})`)}</button></div>`:''}`; }
// CSV del historial: una fila por ticket, con lo que pagó cada tarjeta y (por persona) lo de cada persona en dos columnas de texto.
// Sale de la app sin cifrar: se avisa antes de descargarlo
function spHistCSV(list){ const cell=v=>{ v=String(v??''); if(/^[=+\-@\t\r]/.test(v)&&!/^-?\d+(\.\d+)?$/.test(v)) v="'"+v; return /[",;\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const out=[['date','restaurant','currency','subtotal','discount','tax','service','tip','total','mode','cards','people']];
  list.forEach(x=>{ const s=x.s, T=x.T, cards=x.rows.map(r=>`${r.name} ${r.v.toFixed(2)}`).concat(x.rest>0?[`${L('Sin tarjeta','No card')} ${x.rest.toFixed(2)}`]:[]).join(' | ');
    const ppl=s.mode==='items'&&x.R?x.R.persons.map((p,i)=>`${spPName(s.persons[i],i)} ${p.v.toFixed(2)}`).join(' | '):(()=>{ const E=spEven(s,T); return `${E.N} x ${r2(E.per).toFixed(2)}`; })();
    out.push([s.date,s.place,s.cur,T.base.toFixed(2),(s.disc||0).toFixed(2),(s.tax||0).toFixed(2),(s.svc||0).toFixed(2),T.tip.toFixed(2),T.total.toFixed(2),s.mode==='items'?'by person':'even',cards,ppl]); });
  return out.map(r=>r.map(cell).join(',')).join('\r\n'); }
function spDownload(name,text){ try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+text],{type:'text/csv'})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); return true; }catch(e){ return false; } }
function spWireHist(root,redraw){ const body=()=>{ const b=$('#spHistBody'); if(b) b.innerHTML=spHistBody(); };
  const hy=$('#spHy'), hq=$('#spHq');
  if(hy) hy.onchange=()=>{ spHF().y=hy.value; SPLIT.hn=40; body(); };
  if(hq) hq.addEventListener('input',()=>{ spHF().q=hq.value.slice(0,80); SPLIT.hn=40; body(); });
  root.addEventListener('click',async e=>{ const b=e.target.closest('button'); if(!b||!root.contains(b)) return; const d=b.dataset;
    if(b.id==='spHMore'){ SPLIT.hn+=40; body(); }
    else if(d.spo){ spDropImgs(); SPLIT.err=null; SPLIT.cur=d.spo; redraw(); window.scrollTo(0,0); }
    else if(d.spx){ if(!await confirmModal(L('Borrar este ticket','Delete this receipt'),`<p>${L('Se borra del historial el ticket y su reparto. No se puede deshacer.','The receipt and its split are deleted from the history. It cannot be undone.')}</p>`)) return;
      S.splits=spList().filter(x=>x.id!==d.spx); save(); redraw(); }
    else if(b.id==='spCSV'){ const list=spHistRows(); if(!list.length) return;
      if(!await confirmModal(L('Exportar el historial','Export the history'),`<p>${L(`Se descargará un archivo CSV con ${list.length} ${list.length===1?'ticket':'tickets'} (los del filtro), uno por fila: fechas, restaurantes, importes y nombres de tarjetas y personas. <b>El archivo no va cifrado</b>: guárdalo en un sitio seguro.`,`A CSV file with ${list.length} receipt${list.length===1?'':'s'} (those in the filter), one per row, will be downloaded: dates, restaurants, amounts and card and person names. <b>The file is not encrypted</b>: keep it somewhere safe.`)}</p>`)) return;
      if(spDownload(`${L('tickets','receipts')}-${today()}.csv`,spHistCSV(list))) toast(L('Historial exportado','History exported')); } }); }
function spCheckHTML(s,T){ const F=n=>esc(spFmt(n,s.cur)), out=[];
  if(s.items.length&&s.sub!=null) out.push(Math.abs(T.items-s.sub)<0.015?`<span class="pos">✓ ${L('Los productos suman el subtotal del ticket.','The items add up to the receipt subtotal.')}</span>`
    :`<span class="neg">⚠ ${L(`Los productos suman ${F(T.items)} y el ticket dice ${F(s.sub)}: revisa los precios.`,`The items add up to ${F(T.items)} and the receipt says ${F(s.sub)}: check the prices.`)}</span>`);
  if(s.tot!=null) out.push(Math.abs(T.printed-s.tot)<0.015||Math.abs(T.total-s.tot)<0.015?`<span class="pos">✓ ${L(`Cuadra con el total del ticket (${F(s.tot)}).`,`It matches the receipt total (${F(s.tot)}).`)}</span>`
    :`<span class="neg">⚠ ${L(`El ticket dice ${F(s.tot)} de total y la suma da ${F(T.printed)}: revisa los impuestos, los cargos y el descuento.`,`The receipt says ${F(s.tot)} in total and the sum is ${F(T.printed)}: check the tax, charges and discount.`)}</span>`);
  return out.join('<br>'); }
// Lo que no cuadra o no se ha reconocido: se avisa arriba del ticket y todo se puede corregir (se recalcula al momento)
function spIssues(s,T){ const F=n=>spFmt(n,s.cur), out=[], photo=s.src==='photo';
  if(s.items.length&&s.sub!=null&&Math.abs(T.items-s.sub)>=0.015) out.push(L(`Los productos suman ${F(T.items)} y el subtotal del ticket es ${F(s.sub)}: falta algún producto o hay un importe mal leído.`,`The items add up to ${F(T.items)} and the receipt subtotal is ${F(s.sub)}: an item is missing or an amount was misread.`));
  if(s.tot!=null&&Math.abs(T.printed-s.tot)>=0.015&&Math.abs(T.total-s.tot)>=0.015) out.push(L(`El total del ticket es ${F(s.tot)} y la suma da ${F(T.printed)}: revisa los impuestos, el cargo de servicio y el descuento.`,`The receipt total is ${F(s.tot)} and the sum is ${F(T.printed)}: check the tax, service charge and discount.`));
  if(photo&&s.items.length&&s.sub==null) out.push(L('No he reconocido el subtotal del ticket: escríbelo en «Subtotal del ticket» para comprobar los productos.','I couldn\'t recognize the receipt subtotal: type it in "Receipt subtotal" to check the items.'));
  if(photo&&s.tot==null&&(s.items.length||s.sub!=null)) out.push(L('No he reconocido el total del ticket: escríbelo en «Total del ticket» para comprobar la suma.','I couldn\'t recognize the receipt total: type it in "Receipt total" to check the sum.'));
  if(photo&&!s.items.length&&s.sub==null&&s.tot==null) out.push(L('No he reconocido ningún importe: añade los productos o escribe el subtotal.','I couldn\'t recognize any amount: add the items or type the subtotal.'));
  const bad=s.items.filter(i=>!i.name.trim()||!i.price).length; if(bad) out.push(L(`${bad} ${bad===1?'producto no tiene':'productos no tienen'} nombre o importe.`,`${bad} item${bad===1?' has':'s have'} no name or amount.`));
  return out; }
function spWarnHTML(s,T){ const I=spIssues(s,T); if(!I.length) return '';
  return `<div class="alert warn"><span class="ic">!</span><div><b>${L('Revisa el ticket: la lectura no cuadra','Check the receipt: the reading doesn\'t add up')}</b><ul class="sp-iss">${I.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><span class="muted">${L('Toca cualquier dato para corregirlo; las cifras se recalculan al momento. Compara con la foto.','Tap any figure to fix it; the amounts update instantly. Compare with the photo.')}</span></div></div>`; }
const spIaHTML=it=>`${it.qty>1?`<button class="sm ghost" data-spu="${esc(it.id)}" title="${L('Separar en unidades','Split into units')}" aria-label="${L('Separar en unidades','Split into units')}">÷</button>`:''}<button class="sm ghost" data-spd="${esc(it.id)}" aria-label="${L('Quitar','Remove')}">${ic('close')}</button>`;
function spTicketHTML(s){ const T=spTotals(s), F=n=>esc(spFmt(n,s.cur)), curs=SPLIT_CURS.includes(s.cur)?SPLIT_CURS:[...SPLIT_CURS,s.cur];
  const line=(lbl,id,v)=>`<label class="sp-line"><span>${lbl}</span><input id="spF${id}" data-f="${id}" inputmode="decimal" value="${esc(spIn(v))}" placeholder="0.00"></label>`;
  return `<div class="card" id="spTicket">${helpBtn('split_ticket')}
    <div class="row" style="padding-right:30px;margin-bottom:6px"><h2 style="margin:0">${L('Ticket','Receipt')}</h2><button class="sm ghost" id="spHistB">${L('Historial','History')}</button><button class="sm" id="spNewB">${ic('plus')}${L('Otro ticket','Another receipt')}</button></div>
    ${SPLIT.err?`<div class="alert warn"><span class="ic">!</span><div>${esc(SPLIT.err)}</div></div>`:''}
    <div id="spWarn">${spWarnHTML(s,T)}</div>
    ${SPLIT.img.length?`<details class="sp-photo" ${s.items.length?'':'open'}><summary>${L('Ver la foto','See the photo')}</summary><div class="sp-thumbs">${SPLIT.img.map(i=>`<img src="${esc(i.url)}" alt="${L('Foto del ticket','Receipt photo')}">`).join('')}</div></details>`:''}
    <div class="row"><label class="f">${L('Restaurante','Restaurant')}<input id="spPlace" data-f="place" maxlength="80" value="${esc(s.place)}" placeholder="${L('Nombre (opcional)','Name (optional)')}"></label>
      <label class="f" style="flex:0 1 150px;min-width:130px">${L('Fecha','Date')}<input type="date" id="spDate" data-f="date" value="${esc(s.date)}"></label>
      <label class="f" style="flex:0 1 96px;min-width:86px">${L('Moneda','Currency')}<select id="spCur">${curs.map(c=>`<option ${c===s.cur?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div>
    <h3 class="sec">${L('Productos','Items')} <span class="tot">${s.items.length||''}</span></h3>
    ${s.items.length?`<div class="sp-items"><div class="sp-it sp-ith"><span>${L('Producto','Item')}</span><span>${L('Uds.','Qty')}</span><span>${L('Importe','Amount')}</span><span></span></div>${s.items.map(it=>`<div class="sp-it">
      <input data-it="${esc(it.id)}" data-k="name" maxlength="80" value="${esc(it.name)}" aria-label="${L('Producto','Item')}" placeholder="${L('Producto','Item')}">
      <input data-it="${esc(it.id)}" data-k="qty" inputmode="numeric" value="${it.qty}" aria-label="${L('Unidades','Quantity')}">
      <input data-it="${esc(it.id)}" data-k="price" inputmode="decimal" value="${esc(spIn(it.price))}" aria-label="${L('Importe','Amount')}" placeholder="0.00">
      <span class="sp-ia">${spIaHTML(it)}</span></div>`).join('')}</div>`
      :`<p class="muted" style="margin:0 2px 8px">${L('Para repartir a partes iguales basta con el subtotal. Para repartir por persona, añade los productos.','To split evenly the subtotal is enough. To split by person, add the items.')}</p>`}
    <button class="sm" id="spAddIt">${ic('plus')}${L('Añadir producto','Add item')}</button>
    <div class="sp-sum">
      ${s.items.length?`<div class="sp-line"><span>${L('Subtotal','Subtotal')}</span><b id="spSubV">${F(T.base)}</b></div>`:line(L('Subtotal (o el total, si no lo separas)','Subtotal (or the total, if not itemized)'),'sub',s.sub)}
      ${line(L('Descuento','Discount'),'disc',s.disc)}${line(L('Impuestos','Tax'),'tax',s.tax)}${line(L('Cargo de servicio','Service charge'),'svc',s.svc)}
      <div class="sp-line sp-tipl"><span>${L('Propina','Tip')} <span class="muted">${L('sobre el subtotal, sin impuestos','on the pre-tax subtotal')}</span></span><b id="spTipV">${F(T.tip)}</b></div>
      <div class="nchips" id="spTips">${SPLIT_TIPS.map(p=>`<button data-tip="${p}" class="${s.tipPct===p?'on':''}" aria-pressed="${s.tipPct===p}">${p?p+' %':L('Sin propina','No tip')}</button>`).join('')}
        <input id="spTipAmt" data-f="tipAmt" inputmode="decimal" class="sp-tipin ${s.tipPct==null?'on':''}" value="${s.tipPct==null?esc(spIn(s.tip)):''}" placeholder="${L('Otra cantidad','Other amount')}" aria-label="${L('Propina en importe','Tip amount')}"></div>
      <div class="sp-line sp-total"><span>${L('Total a pagar','Total to pay')}</span><b id="spTotV">${F(T.total)}</b></div>
      <div id="spChk" class="sp-chk">${spCheckHTML(s,T)}</div>
      <div class="sp-print"><span class="muted">${L('Como dice el ticket (para comprobar la lectura)','As printed on the receipt (to check the reading)')}</span>
        ${s.items.length?line(L('Subtotal del ticket','Receipt subtotal'),'psub',s.sub):''}${line(L('Total del ticket','Receipt total'),'ptot',s.tot)}</div></div></div>`; }
function spEvenRes(s,E){ const F=n=>esc(spFmt(n,s.cur));
  return `${E.over?`<div class="alert warn"><span class="ic">!</span><div>${L(`Las tarjetas cubren ${E.N} personas y sois ${s.people}: reparto entre ${E.N}.`,`The cards cover ${E.N} people and you are ${s.people}: splitting among ${E.N}.`)}</div></div>`:''}
    ${E.restN>0?`<div class="srow sp-rest"><span class="av round" style="background:var(--warn);color:#1a1a19">?</span><span class="lm"><b>${L('Sin tarjeta','No card')}</b><span>${E.restN} ${E.restN===1?L('persona: efectivo u otro pago','person: cash or another payment'):L('personas: efectivo u otro pago','people: cash or another payment')}</span></span><b>${F(E.rest)}</b></div>`:''}
    <p class="muted" style="margin:8px 2px 0">${L(`Cada persona: ${F(E.per)}`,`Each person: ${F(E.per)}`)}</p>`; }
function spCardsHTML(s,E){
  return `${spCardList()}
    <div class="clist">${s.cards.map((c,i)=>`<div class="srow sp-card"><span class="av" style="--h:${(i*67+215)%360}">${ic('card')}</span>
      <span class="lm"><input data-cn="${esc(c.id)}" list="spCardList" maxlength="60" value="${esc(c.name)}" placeholder="${esc(spCardName({},i))}" aria-label="${L('Nombre de la tarjeta','Card name')}">
      ${s.mode==='even'?`<span class="sp-pp">${spStep('c:'+c.id,c.n,L('Personas que paga','People it pays for'))} ${c.n===1?L('persona','person'):L('personas','people')}</span>`
        :`<span class="sp-whol">${L('Paga a:','Pays for:')}</span><div class="nchips sp-who" data-cwho="${esc(c.id)}">${spWhoChips(s,c)}</div>`}</span>
      ${s.mode==='even'?`<b data-amt="${esc(c.id)}">${esc(spFmt(E.rows[i].v,s.cur))}</b>`:''}
      ${s.cards.length>1?`<button class="sm ghost" data-spcx="${esc(c.id)}" aria-label="${L('Quitar tarjeta','Remove card')}">${ic('close')}</button>`:''}</div>`).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="sm" id="spAddC">${ic('plus')}${L('Añadir tarjeta','Add card')}</button><button class="sm ghost" id="spSaveCards">${ic('star')}${L('Guardar como habituales','Save as usual cards')}</button></div>`; }
// Personas que paga una tarjeta (cada persona va en una sola: tocar una que está en otra la cambia a esta)
function spWhoChips(s,c){ const other={}; s.cards.forEach(x=>{ if(x.id!==c.id) x.who.forEach(p=>{ other[p]=1; }); });
  return s.persons.map((p,i)=>{ const on=c.who.includes(p.id); return `<button data-cw="${esc(c.id)}" data-p="${esc(p.id)}" class="${on?'on':''}${!on&&other[p.id]?' sp-oth':''}" aria-pressed="${on}">${esc(spPName(p,i))}</button>`; }).join(''); }
// 1. Personas, con su nombre
function spPersonsHTML(s){
  return `<div class="clist">${s.persons.map((p,i)=>`<div class="srow sp-person"><span class="av round" style="--h:${spHue(p.id)}">${esc(spInit(spPName(p,i)))}</span>
      <span class="lm"><input data-pn="${esc(p.id)}" maxlength="40" value="${esc(p.name)}" placeholder="${esc(spPName({},i))}" aria-label="${L('Nombre de la persona','Person name')}"></span>
      ${s.persons.length>1?`<button class="sm ghost" data-ppx="${esc(p.id)}" aria-label="${L('Quitar persona','Remove person')}">${ic('close')}</button>`:''}</div>`).join('')}</div>
    <button class="sm" id="spAddP" style="margin-top:8px">${ic('plus')}${L('Añadir persona','Add person')}</button>`; }
function spAssignHTML(s){ if(!s.items.length) return `<p class="muted">${L('Añade los productos del ticket para repartirlos.','Add the receipt items to split them.')}</p>`;
  const all=s.persons.map(p=>p.id);
  return `<div class="clist">${s.items.map(it=>{ const on=it.to.filter(x=>all.includes(x)), every=on.length===all.length&&all.length>1;
    return `<div class="sp-as ${on.length?'':'un'}"><div class="sp-asn"><b>${esc(it.name||L('Producto','Item'))}${it.qty>1?` ×${it.qty}`:''}</b><span>${esc(spFmt(it.price||0,s.cur))}</span></div>
      <div class="nchips">${s.persons.map((p,i)=>`<button data-as="${esc(it.id)}" data-c="${esc(p.id)}" class="${on.includes(p.id)?'on':''}" aria-pressed="${on.includes(p.id)}">${esc(spPName(p,i))}</button>`).join('')}${all.length>1?`<button data-as="${esc(it.id)}" data-c="*" class="${every?'on':''}" aria-pressed="${every}">${L('Entre todos','Shared by all')}</button>`:''}</div></div>`; }).join('')}</div>`; }
// 4. Resultado: primero lo que paga cada tarjeta y después el total de cada persona
function spPeopleRes(s,R){ const F=n=>esc(spFmt(n,s.cur)); if(!s.items.length) return '';
  const names=ids=>ids.map(id=>spPNameId(s,id)).join(', ');
  return `<h3 class="sec">${L('Cada tarjeta paga','Each card pays')}</h3><div class="clist">${s.cards.map((c,i)=>{ const r=R.cards[i];
    return `<div class="srow"><span class="av" style="--h:${(i*67+215)%360}">${ic('card')}</span><span class="lm"><b>${esc(spCardName(c,i))}</b><span>${r.who.length?esc(names(r.who)):L('Nadie: elige a quién paga','Nobody: choose who it pays for')}</span></span><b>${F(r.v)}</b></div>`; }).join('')}
    ${R.free.ids.length?`<div class="srow sp-rest"><span class="av round" style="background:var(--warn);color:#1a1a19">?</span><span class="lm"><b>${L('Sin tarjeta','No card')}</b><span>${esc(names(R.free.ids))}</span></span><b>${F(R.free.v)}</b></div>`:''}
    ${R.un.n?`<div class="srow sp-rest"><span class="av round" style="background:var(--warn);color:#1a1a19">?</span><span class="lm"><b>${L('Sin asignar','Unassigned')}</b><span>${R.un.n} ${R.un.n===1?L('producto sin persona','item without a person'):L('productos sin persona','items without a person')}</span></span><b>${F(R.un.v)}</b></div>`:''}</div>
    <h3 class="sec">${L('Cada persona','Each person')}</h3><div class="clist">${R.persons.map((r,i)=>{ const p=s.persons[i], ci=s.cards.findIndex(c=>c.id===r.card);
    return `<div class="srow sp-pres"><span class="av round" style="--h:${spHue(p.id)}">${esc(spInit(spPName(p,i)))}</span><span class="lm"><b>${esc(spPName(p,i))}</b>
      <span>${ci>=0?esc(spCardName(s.cards[ci],ci)):L('Sin tarjeta','No card')} · ${L(`consumo ${F(r.items)} + impuestos, servicio y propina ${F(r.extra)}`,`items ${F(r.items)} + tax, service and tip ${F(r.extra)}`)}</span>
      ${r.names.length?`<span class="sp-pitems">${esc(r.names.join(', '))}</span>`:''}</span><b>${F(r.v)}</b></div>`; }).join('')}</div>`; }
function spSplitHTML(s){ const T=spTotals(s), E=spEven(s,T);
  return `<div class="card" id="spSplit">${helpBtn('split_how')}<h2>${L('Cómo pagáis','How you pay')}</h2>
    <div class="ntabs" role="tablist"><button role="tab" data-mode="even" class="${s.mode==='even'?'on':''}" aria-selected="${s.mode==='even'}">${L('A partes iguales','Evenly')}</button><button role="tab" data-mode="items" class="${s.mode==='items'?'on':''}" aria-selected="${s.mode==='items'}">${L('Por persona','By person')}</button></div>
    ${s.mode==='even'?`<div class="sp-line sp-people"><span>${L('Personas en total','People in total')}</span>${spStep('people',s.people,L('Personas en total','People in total'))}</div>
    <h3 class="sec">${L('Tarjetas','Cards')}</h3><div id="spCards">${spCardsHTML(s,E)}</div>
    <div id="spRes">${spEvenRes(s,E)}</div>`
    :`<h3 class="sec sp-step-h">1. ${L('Personas','People')}</h3><div id="spPersons">${spPersonsHTML(s)}</div>
    <h3 class="sec sp-step-h">2. ${L('Tarjetas y a quién paga cada una','Cards and who each one pays for')}</h3><div id="spCards">${spCardsHTML(s,E)}</div>
    <h3 class="sec sp-step-h">3. ${L('¿Qué pidió cada persona?','What did each person order?')}</h3><div id="spAssign">${spAssignHTML(s)}</div>
    <div id="spRes">${spPeopleRes(s,spPeople(s,T))}</div>`}
    <div class="row" style="margin-top:14px"><button class="pri" id="spShare">${L('Compartir el reparto','Share the split')}</button></div></div>`; }
function spPaint(s){ const T=spTotals(s), F=n=>esc(spFmt(n,s.cur)), set=(id,h)=>{ const e=document.getElementById(id); if(e) e.innerHTML=h; };
  set('spSubV',F(T.base)); set('spTipV',F(T.tip)); set('spTotV',F(T.total)); set('spChk',spCheckHTML(s,T)); set('spWarn',spWarnHTML(s,T));
  if(s.mode==='even'){ const E=spEven(s,T); E.rows.forEach(r=>{ const e=document.querySelector(`[data-amt="${CSS.escape(r.id)}"]`); if(e) e.textContent=spFmt(r.v,s.cur); }); set('spRes',spEvenRes(s,E)); }
  else { set('spAssign',spAssignHTML(s)); set('spRes',spPeopleRes(s,spPeople(s,T))); s.cards.forEach(c=>{ const e=document.querySelector(`[data-cwho="${CSS.escape(c.id)}"]`); if(e) e.innerHTML=spWhoChips(s,c); }); } }
// Texto para mandar a quien paga: sale de la app sin cifrar, así que se enseña antes
function spShareText(s){ const T=spTotals(s), F=n=>spFmt(n,s.cur), out=[[s.place||L('Ticket','Receipt'),dLabel(s.date)].join(' · ')];
  out.push(L('Total','Total')+': '+F(T.total)+(T.tip?` (${L('propina','tip')}${s.tipPct!=null?' '+s.tipPct+' %':''}: ${F(T.tip)})`:''));
  if(s.mode==='even'){ const E=spEven(s,T); s.cards.forEach((c,i)=>out.push(`${spCardName(c,i)} (${c.n} ${c.n===1?L('persona','person'):L('personas','people')}): ${F(E.rows[i].v)}`));
    if(E.restN>0) out.push(`${L('Sin tarjeta','No card')} (${E.restN}): ${F(E.rest)}`); out.push(L('Cada persona','Each person')+': '+F(E.per)); }
  else { const R=spPeople(s,T), nm=ids=>ids.map(id=>spPNameId(s,id)).join(', ');
    out.push('',L('Cada tarjeta paga','Each card pays')+':');
    s.cards.forEach((c,i)=>out.push(`${spCardName(c,i)}${R.cards[i].who.length?` (${nm(R.cards[i].who)})`:''}: ${F(R.cards[i].v)}`));
    if(R.free.ids.length) out.push(`${L('Sin tarjeta','No card')} (${nm(R.free.ids)}): ${F(R.free.v)}`);
    if(R.un.n) out.push(`${L('Sin asignar','Unassigned')}: ${F(R.un.v)} — ${R.un.names.join(', ')}`);
    out.push('',L('Cada persona','Each person')+':');
    R.persons.forEach((r,i)=>out.push(`${spPName(s.persons[i],i)}: ${F(r.v)}${r.names.length?' — '+r.names.join(', '):''}`)); }
  return out.join('\n'); }
function spShare(s){ const txt=spShareText(s), can=typeof navigator.share==='function';
  openModal(`<h2>${L('Compartir el reparto','Share the split')}</h2>${spIssues(s,spTotals(s)).length?`<div class="alert warn"><span class="ic">!</span><div>${L('El ticket todavía no cuadra: revisa los importes antes de compartir el reparto.','The receipt still doesn\'t add up: check the amounts before sharing the split.')}</div></div>`:''}<p class="muted">${L('Este texto sale de la app sin cifrar. Compártelo solo con quien vaya a pagar.','This text leaves the app unencrypted. Share it only with whoever is paying.')}</p><pre id="spTxt">${esc(txt)}</pre>
    <div class="row" style="margin-top:12px"><button id="mc">${L('Cerrar','Close')}</button><button id="spCopy">${L('Copiar','Copy')}</button>${can?`<button class="pri" id="spSh">${L('Compartir','Share')}</button>`:''}</div>`);
  $('#mc').onclick=closeModal;
  $('#spCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(txt); toast(L('Copiado','Copied')); }catch(e){ toast(L('No se ha podido copiar','Couldn\'t copy')); } };
  if(can) $('#spSh').onclick=async()=>{ try{ await navigator.share({text:txt}); closeModal(); }catch(e){} }; }

VIEWS.dividir=(el)=>{ const s=spCurrent(); if(!s&&!SPLIT.busy&&SPLIT.img.length) spDropImgs();
  el.innerHTML=`<div class="stack">${SPLIT.busy?`<div class="card" id="spBusy"><h2>${L('Leyendo el ticket…','Reading the receipt…')}</h2><p class="muted" id="spProg" style="margin:0">${esc(spProgText())}</p><div class="prog"><span id="spBar" style="width:0"></span></div>${SPLIT.img.length?`<div class="sp-thumbs">${SPLIT.img.map(i=>`<img src="${esc(i.url)}" alt="">`).join('')}</div>`:''}</div>`
    :s?spTicketHTML(s)+spSplitHTML(s):spTabsHTML()+(SPLIT.tab==='hist'?spHistHTML():spStartHTML()+spPrefsHTML())}</div>`;
  const redraw=()=>{ if(S&&spHere()) VIEWS.dividir($('#app')); };
  const files=e=>{ const fs=[...e.target.files]; e.target.value=''; spRead(fs); };
  if($('#spCam')) $('#spCam').onchange=files; if($('#spPick')) $('#spPick').onchange=files;
  if($('#spManual')) $('#spManual').onclick=()=>{ spDropImgs(); SPLIT.err=null; spNew({},'manual'); redraw(); };
  el.querySelectorAll('[data-sptab]').forEach(b=>b.onclick=()=>{ SPLIT.tab=b.dataset.sptab==='hist'?'hist':'new'; redraw(); });
  const root=el.firstElementChild; // se sustituye en cada repintado: sus escuchadores no se acumulan ni pasan a otras pantallas
  if(!s&&!SPLIT.busy){ if(SPLIT.tab==='hist') spWireHist(root,redraw); else spWirePrefs(root,redraw); return; }
  if(!s||SPLIT.busy) return;
  const leave=tab=>{ spDropImgs(); SPLIT.err=null; SPLIT.cur=null; SPLIT.tab=tab; if(spPrune()) save(); redraw(); window.scrollTo(0,0); };
  $('#spNewB').onclick=()=>leave('new'); $('#spHistB').onclick=()=>leave('hist');
  $('#spCur').onchange=e=>{ s.cur=e.target.value; save(); redraw(); };
  // Lo que se escribe actualiza las cifras sin repintar los campos (no se pierde el foco ni el teclado)
  root.addEventListener('input',e=>{ const t=e.target, f=t.dataset.f;
    if(f==='place') s.place=t.value.slice(0,80); else if(f==='date'){ if(isoDate(t.value)) s.date=t.value; }
    else if(f==='tipAmt'){ s.tipPct=null; s.tip=Math.max(0,spNum(t.value)); root.querySelectorAll('#spTips [data-tip]').forEach(b=>{ b.classList.remove('on'); b.setAttribute('aria-pressed','false'); }); t.classList.add('on'); }
    else if(f==='psub'||f==='ptot'){ const v=t.value.trim(); s[f==='psub'?'sub':'tot']=v?Math.max(0,spNum(v)):null; }
    else if(['sub','disc','tax','svc'].includes(f)) s[f]=f==='sub'?(t.value.trim()?Math.max(0,spNum(t.value)):null):Math.max(0,spNum(t.value));
    else if(t.dataset.it){ const it=s.items.find(x=>x.id===t.dataset.it); if(!it) return; const k=t.dataset.k;
      if(k==='name') it.name=t.value.slice(0,80); else if(k==='price') it.price=spNum(t.value);
      else if(k==='qty'){ it.qty=Math.max(1,Math.min(999,parseInt(t.value)||1)); const ia=t.closest('.sp-it')&&t.closest('.sp-it').querySelector('.sp-ia'); if(ia) ia.innerHTML=spIaHTML(it); } }
    else if(t.dataset.cn){ const c=s.cards.find(x=>x.id===t.dataset.cn); if(!c) return; c.name=t.value.slice(0,60); }
    else if(t.dataset.pn){ const p=s.persons.find(x=>x.id===t.dataset.pn); if(!p) return; p.name=t.value.slice(0,40);
      const av=t.closest('.sp-person')&&t.closest('.sp-person').querySelector('.av'); if(av) av.textContent=spInit(spPName(p,spPIdx(s,p.id))); }
    else return;
    save(); spPaint(s); });
  root.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!root.contains(b)) return; const d=b.dataset;
    if(d.tip!=null){ s.tipPct=+d.tip; s.tip=0; const P=spCfg(); if(P.tipLast){ P.tip=+d.tip; S.settings.split=P; } }
    else if(d.mode){ const m=d.mode==='items'?'items':'even'; if(m!==s.mode){ if(m==='items') spToPerson(s); else spToEven(s); } s.mode=m; }
    else if(d.st){ const v=+d.d; if(d.st==='people') s.people=Math.max(1,Math.min(99,s.people+v));
      else { const c=s.cards.find(x=>'c:'+x.id===d.st); if(!c) return; c.n=Math.max(1,Math.min(99,c.n+v)); const nC=s.cards.reduce((a,x)=>a+x.n,0); if(v>0&&nC>s.people) s.people=nC; } }
    else if(d.as){ const it=s.items.find(x=>x.id===d.as); if(!it) return; const all=s.persons.map(p=>p.id);
      if(d.c==='*') it.to=it.to.filter(x=>all.includes(x)).length===all.length?[]:all.slice();
      else it.to=it.to.includes(d.c)?it.to.filter(x=>x!==d.c):it.to.concat(d.c); }
    else if(d.spd){ s.items=s.items.filter(x=>x.id!==d.spd); }
    else if(d.spu){ const i=s.items.findIndex(x=>x.id===d.spu), it=s.items[i]; if(!it||it.qty<2) return;
      const parts=spAlloc(spC(it.price),Array(it.qty).fill(1)).map(c=>({id:uid(),name:it.name,qty:1,price:c/100,to:it.to.slice()})); s.items.splice(i,1,...parts); }
    else if(d.spcx){ if(s.cards.length<2) return; s.cards=s.cards.filter(c=>c.id!==d.spcx); }   // sus personas quedan «Sin tarjeta»
    else if(d.cw){ const c=s.cards.find(x=>x.id===d.cw); if(!c||!d.p) return;
      if(c.who.includes(d.p)) c.who=c.who.filter(x=>x!==d.p); else { s.cards.forEach(x=>{ x.who=x.who.filter(y=>y!==d.p); }); c.who.push(d.p); } }
    else if(d.ppx){ if(s.persons.length<2) return; s.persons=s.persons.filter(p=>p.id!==d.ppx); s.cards.forEach(c=>{ c.who=c.who.filter(x=>x!==d.ppx); }); s.items.forEach(it=>{ it.to=it.to.filter(x=>x!==d.ppx); }); }
    else if(b.id==='spAddP'){ if(s.persons.length>=30) return; const p={id:uid(),name:''}; s.persons.push(p); if(s.cards.length===1) s.cards[0].who.push(p.id);
      save(); redraw(); const n=document.querySelector(`[data-pn="${CSS.escape(p.id)}"]`); if(n) n.focus(); return; }
    else if(b.id==='spAddIt'){ const it={id:uid(),name:'',qty:1,price:0,to:[]}; s.items.push(it); save(); redraw(); const n=document.querySelector(`[data-it="${CSS.escape(it.id)}"][data-k="name"]`); if(n) n.focus(); return; }
    else if(b.id==='spAddC'){ if(s.cards.length>=20) return; s.cards.push({id:uid(),name:'',n:1,who:[]}); const nC=s.cards.reduce((a,x)=>a+x.n,0); if(s.mode==='even'&&nC>s.people) s.people=nC; }
    else if(b.id==='spShare'){ spShare(s); return; }
    else if(b.id==='spSaveCards'){ const P=spCfg(); P.cards=s.cards.map((c,i)=>({name:(c.name||spCardName(c,i)).slice(0,60),n:(s.mode==='items'?c.who.length:c.n)||1})).slice(0,10); S.settings.split=P; save(); toast(L('Guardadas como tarjetas habituales','Saved as usual cards')); return; }
    else return;
    save(); redraw(); }); };
// Preferencias: se guardan al momento; lo que se escribe no repinta (no se pierde el foco)
function spWirePrefs(root,redraw){ const P=()=>spCfg(), keep=P=>{ S.settings.split=sanitizeSplitPrefs(P); save(); }, pr=$('#spPrefs');
  if(pr) pr.addEventListener('toggle',()=>{ SPLIT.prefsOpen=pr.open; });
  const tl=$('#spTipLast'); if(tl) tl.onchange=()=>{ const p=P(); p.tipLast=tl.checked; keep(p); };
  root.addEventListener('input',e=>{ const t=e.target; if(t.dataset.pcn==null) return; const p=P(), c=p.cards[+t.dataset.pcn]; if(!c) return; c.name=t.value.slice(0,60);
    if(!c.name.trim()) return; keep(p); const sm=$('#spPrefs .sp-psum'); if(sm) sm.textContent=spPrefsSummary(spCfg()); });   // vacío: al salir del campo vuelve el nombre anterior
  // al salir de un nombre vacío vuelve el anterior, sin repintar (si no, se perdería el campo al que pasas)
  root.addEventListener('change',e=>{ const t=e.target; if(t.dataset.pcn==null||t.value.trim()) return; const c=spCfg().cards[+t.dataset.pcn]; if(c) t.value=c.name; });
  root.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!b.closest('#spPrefs')) return; const d=b.dataset, p=P();
    if(d.pmode) p.mode=d.pmode==='items'?'items':'even';
    else if(d.ptip!=null) p.tip=+d.ptip;
    else if(d.st==='pp') p.people=Math.max(1,Math.min(99,p.people+(+d.d)));
    else if(d.st&&d.st.startsWith('pc:')){ const c=p.cards[+d.st.slice(3)]; if(!c) return; c.n=Math.max(1,Math.min(99,c.n+(+d.d))); }
    else if(d.pcx!=null) p.cards.splice(+d.pcx,1);
    else if(b.id==='spPAdd'){ if(p.cards.length>=10) return; p.cards.push({name:spCardName({},p.cards.length),n:1}); }
    else return;
    SPLIT.prefsOpen=true; keep(p); redraw(); }); }
