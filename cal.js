// MyFinZen — Calendario: cuándo salen los extractos y la actividad de cada cuenta, pagos recurrentes
// (suscripciones, seguros, impuestos de propiedad, HOA, hipotecas…) y aviso de los pagos importantes
// el día en que cobras la nómina anterior. Se carga después de app.js (usa sus utilidades y S).
"use strict";
/* ============================================================
   Datos
   S.recurring = [{id, key?, name?, amount?, freq?, next?, cat?, notify?, off?}]
     · sin key  → pago que has añadido tú (nombre, importe, frecuencia y próximo vencimiento obligatorios)
     · con key  → cambio sobre un pago que la app detecta o deduce (solo guarda lo que cambiaste; off = ocultarlo)
   S.settings.cal = {min, sys, payDays[], noSug[]}
     · min     importe en USD desde el que un pago recurrente es "importante"
     · sys     notificación del sistema además del aviso dentro de la app
     · payDays días del mes en que cobras, si la app no lo detecta sola
   accounts[].stmtDay = día del mes en que suele estar disponible el extracto (opcional)
   ============================================================ */
const CAL_FREQ={w:{d:7,pm:52/12},b:{d:14,pm:26/12},m:{m:1,pm:1},q:{m:3,pm:1/3},s:{m:6,pm:1/6},y:{m:12,pm:1/12}};
const freqL=f=>({w:L('Semanal','Weekly'),b:L('Cada 2 semanas','Every 2 weeks'),m:L('Mensual','Monthly'),q:L('Trimestral','Quarterly'),s:L('Semestral','Every 6 months'),y:L('Anual','Yearly')}[f]||'');
const CAL_MIN_DEF=500, CAL_LEAD=7, ACT_LAG=2, CAL_SCHED='calsched', CAL_TAG='mfz-cal';
// Días que tarda el banco en publicar el extracto después del cierre (menos que STMT_GRACE, que es cuando la rutina dice "Falta")
const STMT_LAG={cash:3,credit:3,brokerage:5,kids:5,retirement:5,mortgage:2};
// Categorías que suelen ser facturas: aquí un importe variable (luz, agua) o solo dos cargos (seguro semestral) bastan
// Compras habituales: ir al súper o echar gasolina cada mes no es un pago recurrente, salvo que el importe sea idéntico
const SHOP_CATS=new Set(['Supermercado','Restaurantes','Gasolina','Compras','Viajes']);
const BILL_CATS=new Set(['Suministros','Seguros','Suscripciones','Impuestos propiedad','HOA alquiler','Gastos alquiler','Educación','Niños','Impuestos']);
const REC_STOP=new Set('POS DEBIT CREDIT CARD PURCHASE CHECKCARD RECURRING PAYMENT PAYMENTS PMT PYMT ONLINE WEB ACH BILL BILLPAY AUTOPAY AUTO PAY DES ID INDN CO PPD CCD TEL SQ TST PAYPAL PP WWW COM INC LLC CORP USA THE WITHDRAWAL ELECTRONIC EFT DBT CRD VISA DDA'.split(' '));
// [frecuencia, días, tolerancia, cargos mínimos]
const REC_CAD=[['w',7,1,4],['b',14,2,4],['m',30.4,5,3],['q',91.3,10,3],['s',182.6,14,2],['y',365.25,20,2]];
const calMedian=a=>{ const s=[...a].sort((x,y)=>x-y); return s.length?s[Math.floor(s.length/2)]:0; };
const amt2=n=>fmt(n,Math.abs(n%1)>0.004?2:0);
function calCfg(){ const s=S.settings; if(!s.cal||typeof s.cal!=='object') s.cal={min:CAL_MIN_DEF,sys:false,payDays:[],noSug:[]}; const c=s.cal;
  if(!Array.isArray(c.payDays)) c.payDays=[]; if(!Array.isArray(c.noSug)) c.noSug=[]; if(!(c.min>=0)) c.min=CAL_MIN_DEF; return c; }
let CALC=null;
function calDirty(){ CALC=null; }

/* ---------- Pagos recurrentes: detectados en los movimientos ---------- */
function recKey(desc){ return normDesc(desc).replace(/[^A-Z&]+/g,' ').trim().split(' ').filter(w=>w.length>1&&!REC_STOP.has(w)).slice(0,3).join(' '); }
function recName(k,desc){ let w=k.split(' '); if(w.length>1&&w[w.length-1].length<=2) w=w.slice(0,-1); const lead=(normDesc(desc||'').trim().match(/^(\d{1,3}) [A-Z]/)||[])[1];
  return (lead?lead+' ':'')+w.map(x=>x.charAt(0)+x.slice(1).toLowerCase()).join(' '); }
function recItem(k,list,fixed,covOf){ const ds=[...new Set(list.map(t=>t.date))].sort(); if(ds.length<2) return null;
  const gaps=ds.slice(1).map((d,i)=>daysBetween(ds[i],d)), med=calMedian(gaps);
  const c=REC_CAD.find(x=>Math.abs(med-x[1])<=x[2]); if(!c||ds.length<c[3]) return null;
  // casi todos los cargos llegan a su ritmo (o al doble: un mes que falta)
  if(gaps.filter(g=>Math.abs(g-c[1])<=c[2]||Math.abs(g-2*c[1])<=c[2]*1.5).length<Math.ceil(gaps.length*0.8)) return null;
  const last=list[list.length-1], amts=list.map(t=>-t.amount), m=calMedian(amts), bill=BILL_CATS.has(last.cat);
  if(!fixed&&!bill&&(SHOP_CATS.has(last.cat)||amts.some(a=>Math.abs(a-m)>m*0.25))) return null;   // compras sueltas en la misma tienda
  if(ds.length<3&&!bill) return null;
  if(daysBetween(last.date,covOf(last.acc))>c[1]*1.5+7) return null;      // ya no se cobra
  const steady=!amts.some(a=>Math.abs(a-m)>m*0.1);
  return {auto:true,name:recName(k,last.desc),amount:r2(fixed||steady?-last.amount:calMedian(amts.slice(-3))),freq:c[0],next:last.date,from:addDays(last.date,1),cat:last.cat,n:ds.length,
    hist:list.slice(-12).map(t=>({d:t.date,a:-t.amount}))}; }
function detectRecurring(){ const now=today(), lim=isoAddMonths(now,-26), fm=new Set(fixedMortgages().map(f=>f.cat)), cov={};
  const covOf=id=>{ if(!id) return now; if(!(id in cov)){ const a=acc(id); cov[id]=(a&&covEnd(a))||now; } return cov[id]; };
  const G={};
  for(const t of S.tx){ if(!(t.amount<0)||t.date<lim||t.date>now||t.rec||txType(t)!=='expense'||fm.has(t.cat)) continue; const k=recKey(t.desc); if(!k) continue; (G[k]=G[k]||[]).push(t); }
  const out=[];
  for(const [k,all] of Object.entries(G)){ if(all.length<2) continue; all.sort((a,b)=>a.date.localeCompare(b.date)); const found=[], used=new Set(), byAmt={};
    all.forEach(t=>{ const c=Math.round(-t.amount*100); (byAmt[c]=byAmt[c]||[]).push(t); });
    for(const sub of Object.values(byAmt)){ const it=recItem(k,sub,true,covOf); if(it){ found.push(it); sub.forEach(t=>used.add(t)); } }   // importe fijo (suscripciones)
    const rest=all.filter(t=>!used.has(t)), it=rest.length>=2?recItem(k,rest,false,covOf):null; if(it) found.push(it);                    // importe variable (facturas)
    found.forEach(f=>{ f.key='auto:'+hashKey(k)+(found.length>1?':'+Math.round(f.amount*100):''); f.mk=k; out.push(f); }); }
  return out; }
/* ---------- Pagos recurrentes: los que se deducen de tus cuentas (hipotecas, HOA, impuesto de propiedad) ---------- */
function derivedRecurring(det){ const out=[], ms=S.accounts.filter(a=>a.kind==='mortgage'), first=ym(today())+'-01', y=+today().slice(0,4)-1;
  ms.filter(m=>mortMonthly(m)>0).forEach(m=>out.push({key:'mort:'+m.id,auto:true,der:true,name:m.name,amount:mortMonthly(m),freq:'m',next:isoDate(m.nextDue)||first,cat:mortCat(m)}));
  S.accounts.filter(p=>p.kind==='property').forEach(p=>{ const mort=ms.find(m=>m.propertyId===p.id), escrow=!!(mort&&mort.escrow>0);
    if(p.rental&&p.mortgagePay>0&&!mort) out.push({key:'mort:'+p.id,auto:true,der:true,name:L('Hipoteca · ','Mortgage · ')+p.name,amount:p.mortgagePay,freq:'m',next:first,cat:'Hipoteca alquiler'});
    if(p.hoa>0&&!det.some(d=>d.cat==='HOA alquiler')) out.push({key:'hoa:'+p.id,auto:true,der:true,name:'HOA · '+p.name,amount:p.hoa,freq:'m',next:first,cat:p.rental?'HOA alquiler':'Otros gastos'});
    // California: dos plazos iguales; vencen el 1 nov y el 1 feb y llevan recargo después del 10 dic y del 10 abr (se usa el último día sin recargo)
    if(p.taxYear>0&&!escrow) [['ptax1',y+'-12-10',L('1.er plazo','1st installment')],['ptax2',y+'-04-10',L('2.º plazo','2nd installment')]].forEach(([k,d,lbl])=>
      out.push({key:k+':'+p.id,auto:true,der:true,ptax:true,name:`${L('Impuesto de propiedad','Property tax')} · ${p.name} (${lbl})`,amount:r2(p.taxYear/2),freq:'y',next:d,cat:'Impuestos propiedad'})); });
  return out; }
/* Lista completa: lo deducido y lo detectado, con tus cambios encima, más lo que has añadido tú. */
function recurringAll(){ const sig=[S.tx.length,(S.recurring||[]).length,S.accounts.length,today(),LANG].join('|');
  if(CALC&&CALC.S===S&&CALC.sig===sig) return CALC.list;
  let det=detectRecurring(); const der=derivedRecurring(det); if(der.some(d=>d.ptax)) det=det.filter(d=>d.cat!=='Impuestos propiedad');
  const ov=S.recurring||[], byKey=new Map(ov.filter(o=>o.key).map(o=>[o.key,o])), seen=new Set(), list=[];
  for(const a of [...der,...det]){ const o=byKey.get(a.key), r=Object.assign({},a); seen.add(a.key); r.base={name:a.name,amount:a.amount,freq:a.freq,cat:a.cat};
    if(o){ r.id=o.id; r.ov=o; ['name','amount','freq','cat','notify','off'].forEach(k=>{ if(o[k]!=null) r[k]=o[k]; }); if(o.next){ r.next=o.next; r.from=o.next; } }
    list.push(r); }
  for(const o of ov){ if(o.key&&seen.has(o.key)) continue; if(o.name&&o.amount>0&&CAL_FREQ[o.freq]&&isoDate(o.next)) list.push(Object.assign({manual:true,from:o.next},o)); }
  CALC={S,sig,list}; return list; }
const recId=r=>r.key||r.id;
const isSig=r=>r.notify===true||(r.notify!==false&&r.amount>=calCfg().min);
// Vencimientos de un pago entre dos fechas (incluidas). Los meses se cuentan desde la fecha base para que un día 31 no se desplace.
function recurOcc(r,from,to){ const out=[], f=CAL_FREQ[r.freq]; if(!f||!isoDate(r.next)||from>to) return out;
  if(f.d){ let d=addDays(r.next,Math.floor(daysBetween(r.next,from)/f.d)*f.d); while(d<from) d=addDays(d,f.d); for(;d<=to&&out.length<500;d=addDays(d,f.d)) out.push(d); }
  else for(let i=Math.floor(monthsApart(r.next,from)/f.m)-1;out.length<500;i++){ const d=isoAddMonths(r.next,i*f.m); if(d>to) break; if(d>=from) out.push(d); }
  return out; }
function recurNext(r){ const now=today(); return recurOcc(r,r.from&&r.from>now?r.from:now,addDays(now,400))[0]||null; }
const recMonthly=r=>r.amount*(CAL_FREQ[r.freq]||CAL_FREQ.m).pm;
/* Sugerencias: pagos que la app no puede fechar sola (el seguro de una casa) o que solo ha visto una vez (algo anual). */
function recurSuggest(){ const c=calCfg(), no=new Set(c.noSug), have=new Set((S.recurring||[]).map(o=>o.key).filter(Boolean)), all=recurringAll(), out=[], now=today();
  const ms=S.accounts.filter(a=>a.kind==='mortgage');
  S.accounts.filter(p=>p.kind==='property'&&p.insYear>0).forEach(p=>{ const mort=ms.find(m=>m.propertyId===p.id), k='ins:'+p.id; if(mort&&mort.escrow>0) return; if(no.has(k)||have.has(k)) return;
    out.push({key:k,name:L('Seguro · ','Insurance · ')+p.name,amount:p.insYear,freq:'y',cat:'Seguros',why:L('Lo tienes anotado en el inmueble; falta la fecha en que lo pagas.','It is noted on the property; the date you pay it is missing.')}); });
  const known=new Set(all.map(r=>r.mk).filter(Boolean)), lim=isoAddMonths(now,-13), one={};
  for(const t of S.tx){ if(!(t.amount<=-100)||t.date<lim||t.date>now||t.rec||!['Seguros','Suscripciones','Educación'].includes(t.cat)) continue; const k=recKey(t.desc); if(!k||known.has(k)) continue; (one[k]=one[k]||[]).push(t); }
  Object.entries(one).filter(([,l])=>l.length===1).map(([k,l])=>({k,t:l[0]})).sort((a,b)=>a.t.amount-b.t.amount).slice(0,4).forEach(({k,t})=>{ const key='sug:'+hashKey(k); if(no.has(key)||have.has(key)) return;
    out.push({key,name:recName(k,t.desc),amount:-t.amount,freq:'y',next:isoAddMonths(t.date,12),cat:t.cat,why:L(`Un cargo de ${amt2(-t.amount)} el ${dLabel(t.date)}. ¿Se repite cada año?`,`One charge of ${amt2(-t.amount)} on ${dLabel(t.date)}. Does it repeat every year?`)}); });
  return out; }

/* ---------- Nóminas: días en que cobras ---------- */
function payPlan(){ const c=calCfg(), now=today(), lim=isoAddMonths(now,-6), byDay={};
  S.tx.forEach(t=>{ if(isPay(t)&&t.date>=lim&&t.date<=now) byDay[t.date]=(byDay[t.date]||0)+t.amount; });
  let days=Object.keys(byDay).sort(); const med=calMedian(days.map(d=>byDay[d])); days=days.filter(d=>byDay[d]>=med*0.5);   // sin pagas pequeñas (dietas, atrasos)
  const amt=days.length?calMedian(days.slice(-3).map(d=>byDay[d])):null, actual=days.map(d=>({d,amt:byDay[d]}));
  if(c.payDays.length) return {mode:'manual',kind:'dom',days:[...c.payDays].sort((a,b)=>a-b),amt,actual};
  if(days.length<2) return null;
  const g=calMedian(days.slice(1).map((d,i)=>daysBetween(days[i],d)));
  if(days.length>=3&&Math.abs(g-7)<=1) return {mode:'auto',kind:'every',every:7,last:days[days.length-1],amt,actual};
  if(days.length>=3&&Math.abs(g-14)<=1) return {mode:'auto',kind:'every',every:14,last:days[days.length-1],amt,actual};
  const slots=[]; days.forEach(d=>{ const n=+d.slice(8,10); let s=slots.find(z=>Math.abs(z.day-n)<=4); if(!s){ s={day:n,items:[]}; slots.push(s); } s.items.push(d); });
  const dom=slots.filter(s=>new Set(s.items.map(ym)).size>=2).map(s=>calMedian(s.items.map(d=>+d.slice(8,10)))).sort((a,b)=>a-b);
  return dom.length?{mode:'auto',kind:'dom',days:dom,amt,actual}:null; }
// Días de cobro entre dos fechas: las nóminas reales y, donde aún no hay ninguna, las esperadas (si caen en fin de semana, el viernes anterior)
function payDays(from,to){ const p=payPlan(); if(!p) return []; const out=p.actual.filter(x=>x.d>=from&&x.d<=to).map(x=>({d:x.d,amt:x.amt})), exp=[];
  if(p.kind==='every'){ for(let d=addDays(p.last,p.every);d<=to&&exp.length<400;d=addDays(d,p.every)) if(d>=from) exp.push(d); }
  else for(let m=ym(isoAddMonths(from,-1));m<=ym(to);m=ymNext(m)) for(const day of p.days){ let d=`${m}-${String(Math.min(day,+monthEnd(m).slice(8))).padStart(2,'0')}`; const wd=new Date(d+'T12:00:00').getDay(); if(wd===6) d=addDays(d,-1); else if(wd===0) d=addDays(d,-2); if(d>=from&&d<=to) exp.push(d); }
  exp.forEach(d=>{ if(!p.actual.some(x=>Math.abs(daysBetween(x.d,d))<=5)) out.push({d,amt:p.amt,est:true}); });
  return out.sort((a,b)=>a.d.localeCompare(b.d)); }
function payPlanText(p){ if(!p) return L('No he encontrado nóminas en tus movimientos. Mientras tanto te aviso 7 días antes de cada pago; o escribe arriba los días del mes en que cobras.','I found no paychecks in your transactions. Meanwhile I will alert you 7 days before each payment; or type above the days of the month you get paid.');
  const src=p.mode==='auto'?L(' (detectado en tus movimientos)',' (detected from your transactions)'):L(' (lo has indicado tú)',' (set by you)');
  if(p.kind==='every') return L(`Cobras cada ${p.every===7?'semana':'2 semanas'}`,`You get paid every ${p.every===7?'week':'2 weeks'}`)+src+'.';
  return L(`Cobras hacia el día ${p.days.join(' y el ')} de cada mes`,`You get paid around day ${p.days.join(' and ')} of each month`)+src+'.'; }

/* ---------- Extractos y actividad: cuándo están disponibles ---------- */
function stmtLagOf(a,close){ const d=a.stmtDay|0; if(!(d>=1&&d<=31)) return STMT_LAG[a.kind]||3;
  const at=m=>`${m}-${String(Math.min(d,+monthEnd(m).slice(8))).padStart(2,'0')}`; let c=at(ym(close)); if(c<close) c=at(ymNext(ym(close))); return daysBetween(close,c); }
function stmtClosings(x,from,to){ const a=x.a, now=today();
  const pd=(S.imports||[]).filter(e=>e.acc===a.id&&e.kind!=='tax'&&e.kind!=='csv'&&isoDate(e.date)&&e.date<=now).map(e=>e.date).sort(), base=pd.length?pd[pd.length-1]:x.last; if(!base) return [];
  const eom=base===monthEnd(ym(base)), out=[];
  for(let i=1;i<=60;i++){ let c=isoAddMonths(base,i*x.step); if(eom) c=monthEnd(ym(c)); if(c<=x.last) continue; const d=addDays(c,stmtLagOf(a,c)); if(d>to) break; if(d>=from) out.push({d,close:c,pend:d<=now}); }
  return out; }
const actAccounts=()=>{ const off=new Set(S.settings.stmtOff||[]); return S.accounts.filter(a=>(a.kind==='cash'||a.kind==='credit')&&!off.has(a.id)); };

/* ---------- Eventos del calendario ---------- */
function calEvents(from,to){ const ev=[], now=today();
  for(const r of recurringAll()){ if(r.off) continue; const paid=new Set();
    (r.hist||[]).forEach(h=>{ if(h.d>=from&&h.d<=to){ paid.add(h.d); ev.push({d:h.d,type:'pay',r,amt:h.a,paid:true,sig:isSig(r)}); } });
    recurOcc(r,r.from&&r.from>from?r.from:from,to).forEach(d=>{ if(!paid.has(d)) ev.push({d,type:'pay',r,amt:r.amount,sig:isSig(r)}); }); }
  for(const x of stmtList()){ if(x.state!=='ok'&&x.state!=='due') continue; stmtClosings(x,from,to).forEach(c=>ev.push({d:c.d,type:'stmt',a:x.a,close:c.close,pend:c.pend})); }
  const aa=actAccounts(); if(aa.length) for(let m=ym(from);m<=ym(to);m=ymNext(m)){ const d=`${m}-${String(1+ACT_LAG).padStart(2,'0')}`; if(d<from||d>to) continue; const pm=ym(isoAddMonths(m+'-01',-1));
    if(pm<ym(isoAddMonths(now,-3))||!aa.some(a=>covEnd(a))) continue;
    const full=d<=now&&monthCov(pm).complete; ev.push({d,type:'act',m:pm,n:aa.length,pend:d<=now&&!full,done:full}); }
  payDays(from,to).forEach(p=>ev.push({d:p.d,type:'salary',amt:p.amt,est:!!p.est}));
  const ord={salary:0,pay:1,stmt:2,act:3};
  return ev.sort((a,b)=>a.d.localeCompare(b.d)||ord[a.type]-ord[b.type]||(b.amt||0)-(a.amt||0)); }

/* ---------- Aviso: pagos importantes antes de la siguiente nómina ----------
   Cada pago importante se avisa el día de la nómina anterior a su vencimiento (o 7 días antes si no se conoce la nómina). */
function calNotices(){ const now=today(), to=addDays(now,150), pays=payDays(addDays(now,-62),addDays(to,62)).map(p=>p.d), G=new Map();
  for(const e of calEvents(now,to)){ if(e.type!=='pay'||!e.sig||e.paid) continue;
    let P=null; for(const p of pays){ if(p<e.d) P=p; else break; } const noPay=!P; if(noPay) P=addDays(e.d,-CAL_LEAD);
    let g=G.get(P); if(!g){ g={pay:P,noPay,items:[],total:0,next:pays.find(p=>p>P)||null}; G.set(P,g); } g.items.push(e); g.total=r2(g.total+e.amt); }
  return [...G.values()].sort((a,b)=>a.pay.localeCompare(b.pay)).map(g=>Object.assign(g,{until:g.items[g.items.length-1].d,active:g.pay<=now})); }
const noticeItems=g=>g.items.map(e=>`${esc(e.r.name)} ${amt2(e.amt)} (${esc(dShort(e.d))})`).join(', ');
function noticeText(gs){ const items=gs.flatMap(g=>g.items), total=r2(items.reduce((s,e)=>s+e.amt,0)), nx=gs[gs.length-1].next, n=items.length;
  const head=nx?L(`${n===1?'1 pago importante':n+' pagos importantes'} antes de tu próxima nómina (${dShort(nx)}):`,`${n===1?'1 significant payment':n+' significant payments'} before your next paycheck (${dShort(nx)}):`)
    :L(`${n===1?'1 pago importante próximo':n+' pagos importantes próximos'}:`,`${n===1?'1 significant payment coming up':n+' significant payments coming up'}:`);
  return `<b>${head}</b> ${gs.map(noticeItems).join(', ')}.${n>1?` ${L('Total','Total')} ${amt2(total)}.`:''}`; }
// Aviso en el Resumen (y en el Calendario)
function calAlerts(A){ if(!S||!S.accounts.length) return; let act; try{ act=calNotices().filter(g=>g.active); }catch(e){ console.warn('calendario',e); return; } if(!act.length) return;
  A.push({lvl:'warn',key:'pay:'+act[act.length-1].pay+':'+hashKey(act.flatMap(g=>g.items).map(e=>recId(e.r)+e.d+e.amt).join()),go:{h:'calendario'},t:noticeText(act)}); }

/* ---------- Notificación del sistema ----------
   Con la app abierta la muestra la página. Con la app cerrada solo puede hacerlo el service worker, que no tiene la clave
   de la bóveda: por eso, y solo si activas las notificaciones, se guarda fuera de la bóveda un registro mínimo ('calsched')
   con las FECHAS de los próximos avisos y CUÁNTOS pagos son. Nunca nombres ni importes; la notificación tampoco los enseña. */
const notifState=()=>!('Notification' in window)||!('serviceWorker' in navigator)?'none':Notification.permission;
const notifText=n=>({title:L('MyFinZen · Pagos importantes','MyFinZen · Significant payments'),body:L(`Tienes ${n===1?'1 pago importante':n+' pagos importantes'} antes de tu próxima nómina. Toca para verlos.`,`You have ${n===1?'1 significant payment':n+' significant payments'} before your next paycheck. Tap to see them.`)});
const swReady=()=>'serviceWorker' in navigator?Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),4000))]):Promise.resolve(null);
let calSysQ=Promise.resolve(), calSysT=null, calBgDone=false;
function calSysSoon(){ clearTimeout(calSysT); calSysT=setTimeout(()=>{ calSysT=null; calSysCheck(); },2500); }
function calSysCheck(){ calSysQ=calSysQ.then(calSysRun).catch(e=>console.warn('aviso',e)); return calSysQ; }
async function calSysRun(){ if(!S) return; const c=calCfg(), now=today();
  if(!c.sys||notifState()!=='granted'){ if(await IDB.get(CAL_SCHED)) await IDB.del(CAL_SCHED); return; }
  const N=calNotices(), cur=obj(await IDB.get(CAL_SCHED)), shown=arr(cur.shown).filter(d=>isoDate(d)&&d>=addDays(now,-120));
  const due=N.filter(g=>g.active&&!shown.includes(g.pay));
  if(!calBgDone){ calBgDone=true; calBg(true); }   // por si el navegador perdió el registro de la sincronización periódica
  if(due.length){ try{ const reg=await swReady(); if(reg) for(const g of due){ const t=notifText(g.items.length);
      await reg.showNotification(t.title,{body:t.body,tag:'mfz-pay-'+g.pay,icon:'icons/icon-192.png',badge:'icons/icon-192.png',data:{hash:'#calendario'}}); shown.push(g.pay); } }catch(e){ console.warn('aviso',e); } }
  if(!S) return;
  const rec={v:1,lang:LANG,days:N.slice(0,24).map(g=>({d:g.pay,u:g.until,n:g.items.length})),shown:shown.slice(-60)};
  if(JSON.stringify(rec)!==JSON.stringify(cur)) await IDB.set(CAL_SCHED,rec); }
// Con la app cerrada: Android/Chrome despiertan al service worker de vez en cuando (sincronización periódica en segundo plano; solo con la app instalada)
async function calBg(on){ try{ const reg=await swReady(); if(!reg||!('periodicSync' in reg)) return 'none';
    if(!on){ await reg.periodicSync.unregister(CAL_TAG); return 'off'; }
    const st=await navigator.permissions.query({name:'periodic-background-sync'}); if(st.state!=='granted') return 'denied';
    await reg.periodicSync.register(CAL_TAG,{minInterval:12*3600*1000}); return 'on'; }catch(e){ return 'none'; } }
async function calSysToggle(on){ const c=calCfg();
  if(on){ if(notifState()==='none'){ toast(L('Este navegador no permite notificaciones','This browser does not support notifications')); return false; }
    let p=Notification.permission; if(p==='default'){ try{ p=await Notification.requestPermission(); }catch(e){ p='denied'; } }
    if(p!=='granted'){ toast(L('Las notificaciones están bloqueadas para MyFinZen en este dispositivo','Notifications are blocked for MyFinZen on this device')); return false; } }
  c.sys=!!on; save(); await calBg(c.sys); await calSysCheck(); return c.sys; }
async function calSysStatus(){ const c=calCfg(), st=notifState();
  if(st==='none') return L('Este navegador no permite notificaciones: verás el aviso al abrir la app.','This browser does not support notifications: you will see the alert when you open the app.');
  if(!c.sys) return L('Ahora solo ves el aviso dentro de la app (en el Resumen y aquí).','Right now you only see the alert inside the app (on the Overview and here).');
  if(st!=='granted') return L('Activado en otro dispositivo. En este falta el permiso: desmarca y vuelve a marcar la casilla.','Turned on from another device. Permission is missing on this one: untick and tick the box again.');
  const bg=await calBg(true);
  return bg==='on'?L('Activado. Con la app cerrada, Android la despierta más o menos una vez al día: el aviso llega ese día, no a una hora exacta.','On. With the app closed, Android wakes it up about once a day: the alert arrives that day, not at an exact time.')
    :L('Activado, pero este dispositivo solo puede avisar con la app abierta. Para recibirlo con la app cerrada, instala MyFinZen desde Chrome en Android.','On, but this device can only notify while the app is open. To get it with the app closed, install MyFinZen from Chrome on Android.'); }
try{ if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',e=>{ if(e.data&&e.data.type==='goto'&&e.data.hash==='#calendario') location.hash='#calendario'; }); }catch(e){} // en un marco aislado, leer navigator.serviceWorker lanza un error
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&S) calSysSoon(); });

/* ============================================================
   Pantalla
   ============================================================ */
const CAL={m:null,sel:null,ev:[],t:null};
const CAL_COL={stmt:'var(--s1)',act:'var(--s7)',pay:'var(--s4)',sig:'var(--s8)',salary:'var(--s3)'};
const evKind=e=>e.type==='pay'&&e.sig?'sig':e.type;
const iconAv=(i,h)=>`<span class="av" style="--h:${h}">${ic(i)}</span>`;
function calDayLabel(d){ const now=today(); if(d===now) return L('Hoy','Today'); if(d===addDays(now,1)) return L('Mañana','Tomorrow');
  const s=new Date(d+'T12:00:00').toLocaleDateString(LANG==='en'?'en-US':'es-ES',{weekday:'long',day:'numeric',month:'long',...(d.slice(0,4)!==now.slice(0,4)?{year:'numeric'}:{})}); return s.charAt(0).toUpperCase()+s.slice(1); }
function evTitle(e){ return e.type==='pay'?e.r.name:e.type==='stmt'?L('Extracto · ','Statement · ')+e.a.name:e.type==='act'?L(`Actividad de ${mesLong(+e.m.slice(5)-1)} completa`,`${mesLong(+e.m.slice(5)-1)} activity complete`):e.est?L('Nómina esperada','Expected paycheck'):L('Nómina','Paycheck'); }
function evRow(e,withDate){ const i=CAL.ev.push(e)-1, dt=withDate?esc(dLabel(e.d))+' · ':''; let av, sub, right='';
  if(e.type==='pay'){ av=catAv(e.r.cat); sub=dt+esc(freqL(e.r.freq))+' · '+esc(catL(e.r.cat||UNCAT))+(e.paid?' · '+L('ya cargado','already charged'):'');
    right=`<span class="lr"><b>${amt2(e.amt)}</b>${e.sig?`<span class="neg">${L('Importante','Significant')}</span>`:''}</span>`; }
  else if(e.type==='stmt'){ av=accAv(e.a); sub=dt+(e.pend?`<span class="cpend">${L('Ya disponible · sin traer a la app','Available now · not in the app yet')}</span>`:L(`Cierra el ${dShort(e.close)} · disponible aprox.`,`Closes ${dShort(e.close)} · available approx.`)); right=ic('right','chev'); }
  else if(e.type==='act'){ av=iconAv('flow',262); sub=dt+(e.done?L('Ya la tienes completa','You already have all of it'):e.pend?`<span class="cpend">${L('Ya disponible · faltan cuentas','Available now · some accounts missing')}</span>`:L(`${e.n} ${e.n===1?'cuenta':'cuentas'} de banco y tarjeta`,`${e.n} bank and card account${e.n===1?'':'s'}`)); right=ic('right','chev'); }
  else { av=iconAv('coin',152); sub=dt+(e.est?L('Según tus últimas nóminas','Based on your latest paychecks'):L('Cobrada','Received')); right=e.amt?`<span class="lr"><b class="pos">+${amt2(e.amt)}</b>${e.est?`<span>${L('aprox.','approx.')}</span>`:''}</span>`:''; }
  return `<button class="lrow cev" data-ev="${i}">${av}<span class="lm"><b>${esc(evTitle(e))}</b><span>${sub}</span></span>${right}</button>`; }
function calGrid(m,evs){ const [y,mo]=m.split('-').map(Number), n=new Date(y,mo,0).getDate(), now=today(), mon=LANG!=='en', lead=(new Date(y,mo-1,1).getDay()+(mon?6:0))%7;
  const wd=Array.from({length:7},(_,i)=>new Date(2024,0,(mon?1:7)+i).toLocaleDateString(LANG==='en'?'en-US':'es-ES',{weekday:'short'}).replace('.','')), by={};
  evs.forEach(e=>(by[e.d]=by[e.d]||[]).push(e));
  let h=wd.map(w=>`<div class="wd">${esc(w)}</div>`).join('')+'<div class="cd out"></div>'.repeat(lead);
  for(let d=1;d<=n;d++){ const iso=`${m}-${String(d).padStart(2,'0')}`, L_=by[iso]||[], kinds=[...new Set(L_.map(evKind))];
    h+=`<button class="cd${iso===now?' today':''}${iso===CAL.sel?' sel':''}${iso<now?' past':''}" data-day="${iso}" aria-label="${esc(calDayLabel(iso))}${L_.length?', '+L_.length:''}"><span class="n">${d}</span>
      <span class="dots">${kinds.map(k=>`<i class="cdot" style="background:${CAL_COL[k]}"></i>`).join('')}</span>
      <span class="lbls">${L_.slice(0,3).map(e=>`<span class="clb" style="--c:${CAL_COL[evKind(e)]}">${esc(evTitle(e))}</span>`).join('')}${L_.length>3?`<span class="clb more">+${L_.length-3}</span>`:''}</span></button>`; }
  return `<div class="calg">${h}</div>`; }
function recRow(r){ const nx=recurNext(r), sig=isSig(r), src=r.manual?L('Añadido por ti','Added by you'):r.der?L('De tus cuentas','From your accounts'):L('Detectado','Detected');
  return `<button class="lrow" data-rec="${esc(recId(r))}">${catAv(r.cat)}<span class="lm"><b>${esc(r.name)}</b><span>${esc(freqL(r.freq))}${nx?' · '+L('próximo','next')+' '+esc(dShort(nx)):''} · ${src}</span></span><span class="lr"><b>${amt2(r.amount)}</b>${sig?`<span class="neg">${L('Importante','Significant')}</span>`:''}</span></button>`; }
VIEWS.calendario=(el)=>{ const now=today(), c=calCfg(); if(!CAL.m){ CAL.m=ym(now); CAL.sel=now; } CAL.ev=[];
  const m=CAL.m, mEv=calEvents(m+'-01',monthEnd(m)), all=recurringAll(), on=all.filter(r=>!r.off).sort((a,b)=>(recurNext(a)||'9').localeCompare(recurNext(b)||'9')), off=all.filter(r=>r.off);
  const N=calNotices(), act=N.filter(g=>g.active), fut=N.filter(g=>!g.active), plan=payPlan(), sug=recurSuggest();
  const dayEv=CAL.sel&&ym(CAL.sel)===m?mEv.filter(e=>e.d===CAL.sel):null;
  const pend=calEvents(addDays(now,-92),addDays(now,-1)).filter(e=>e.pend), next=calEvents(now,addDays(now,45)).filter(e=>!(e.type==='pay'&&e.paid));
  const byDay={}; next.forEach(e=>(byDay[e.d]=byDay[e.d]||[]).push(e));
  const monthly=on.reduce((s,r)=>s+recMonthly(r),0), [yy,mm]=m.split('-').map(Number);
  el.innerHTML=`<div class="stack">
  ${act.length?`<div class="alert warn" id="calNow"><span class="ic">!</span><div style="flex:1">${noticeText(act)}</div></div>`:''}
  <div class="card" id="calCard">${helpBtn('cal')}
    <div class="calh"><button class="sm" id="calPrev" aria-label="${L('Mes anterior','Previous month')}">${ic('left')}</button><h2>${esc(mesLong(mm-1))} ${yy}</h2><button class="sm" id="calToday">${L('Hoy','Today')}</button><button class="sm" id="calNextM" aria-label="${L('Mes siguiente','Next month')}">${ic('right')}</button></div>
    ${calGrid(m,mEv)}
    ${legend([{c:CAL_COL.salary,n:L('Nómina','Paycheck')},{c:CAL_COL.sig,n:L('Pago importante','Significant payment')},{c:CAL_COL.pay,n:L('Pago recurrente','Recurring payment')},{c:CAL_COL.stmt,n:L('Extracto disponible','Statement available')},{c:CAL_COL.act,n:L('Actividad del mes','Month activity')}])}
    <div id="calDay">${dayEv?`<h3 class="sec">${esc(calDayLabel(CAL.sel))}</h3>${dayEv.length?`<div class="clist">${dayEv.map(e=>evRow(e)).join('')}</div>`:`<p class="muted" style="margin:0 4px">${L('Nada previsto este día.','Nothing expected this day.')}</p>`}`:`<p class="muted" style="margin:10px 4px 0">${L('Toca un día para ver qué hay.','Tap a day to see what is on it.')}</p>`}</div></div>
  <div class="grid g2">
  <div class="card" id="calNext">${helpBtn('cal_next')}<h2>${L('Próximos 45 días','Next 45 days')}</h2><p class="sub">${L('Lo que ya puedes traer a la app y lo que viene.','What you can already bring into the app and what is coming.')}</p>
    ${pend.length?`<h3 class="sec">${L('Ya disponible','Available now')}</h3><div class="clist">${pend.slice(-8).reverse().map(e=>evRow(e,true)).join('')}</div>`:''}
    ${Object.keys(byDay).length?Object.keys(byDay).sort().map(d=>`<h3 class="sec">${esc(calDayLabel(d))}</h3><div class="clist">${byDay[d].map(e=>evRow(e)).join('')}</div>`).join(''):pend.length?'':`<p class="muted">${L('Nada todavía: aparecerá cuando tengas extractos, movimientos o pagos recurrentes.','Nothing yet: it will appear once you have statements, transactions or recurring payments.')}</p>`}</div>
  <div class="card" id="calRec">${helpBtn('cal_rec')}<div class="row" style="padding-right:30px"><div><h2 style="margin:0">${L('Pagos recurrentes','Recurring payments')}</h2><p class="muted" style="margin:2px 0 0">${on.length?L(`${on.length} ${on.length===1?'pago':'pagos'} · unos ${fmt(monthly)} al mes`,`${on.length} payment${on.length===1?'':'s'} · about ${fmt(monthly)} a month`):L('Suscripciones, seguros, impuestos, HOA…','Subscriptions, insurance, taxes, HOA…')}</p></div><button class="pri" id="recAdd">${ic('plus')}${L('Nuevo pago','New payment')}</button></div>
    ${on.length?`<div class="clist" style="margin-top:10px">${on.map(recRow).join('')}</div>`:`<p class="muted" style="margin-top:10px">${L('La app los detecta sola en tus movimientos cuando un cargo se repite (al menos 3 meses seguidos). Los que no detecte, añádelos tú.','The app detects them in your transactions when a charge repeats (at least 3 months in a row). Add yourself the ones it misses.')}</p>`}
    ${sug.length?`<h3 class="sec">${L('¿También son recurrentes?','Are these recurring too?')}</h3>${sug.map((s,i)=>`<div class="srow csug">${catAv(s.cat)}<span class="lm"><b>${esc(s.name)} · ${amt2(s.amount)}</b><span>${esc(s.why)}</span></span><button class="sm" data-sug="${i}">${L('Sí, anotar','Yes, add it')}</button><button class="sm ghost" data-nosug="${i}" aria-label="${L('No es recurrente','Not recurring')}">${ic('close')}</button></div>`).join('')}`:''}
    ${off.length?`<details class="coff"><summary>${L(`${off.length} ${off.length===1?'oculto':'ocultos'}`,`${off.length} hidden`)}</summary>${off.map(r=>`<div class="srow"><span class="lm"><b>${esc(r.name)}</b><span>${amt2(r.amount)} · ${esc(freqL(r.freq))}</span></span><button class="sm" data-unoff="${esc(r.key)}">${L('Volver a mostrar','Show again')}</button></div>`).join('')}</details>`:''}</div>
  </div>
  <div class="card" id="calNotify">${helpBtn('cal_notify')}<h2>${L('Aviso de pagos importantes','Significant payment alerts')}</h2>
    <p class="sub">${L('Te aviso el día en que cobras la nómina anterior a cada pago importante, para que reserves ese dinero.','I alert you on the day you receive the paycheck before each significant payment, so you can set that money aside.')}</p>
    <div class="row"><label class="f">${L('Un pago es importante desde (USD)','A payment is significant from (USD)')}<input id="calMin" inputmode="decimal" value="${esc(c.min)}"></label>
      <label class="f">${L('Días del mes en que cobras (opcional)','Days of the month you get paid (optional)')}<input id="calPay" inputmode="numeric" placeholder="${L('p. ej. 15, 30','e.g. 15, 30')}" value="${esc(c.payDays.join(', '))}"></label></div>
    <p class="muted" id="calPlan">${esc(payPlanText(plan))}</p>
    ${fut.length?`<h3 class="sec">${L('Próximos avisos','Upcoming alerts')}</h3>${fut.slice(0,3).map(g=>`<p class="cnx"><b>${esc(dLabel(g.pay))}</b>${g.noPay?'':' · '+L('día de cobro','payday')} — ${noticeItems(g)}${g.items.length>1?` · ${L('total','total')} ${amt2(g.total)}`:''}</p>`).join('')}`
      :act.length?'':`<p class="muted">${L(`Ahora no hay ningún pago recurrente de ${fmt(c.min)} o más en los próximos meses.`,`Right now there is no recurring payment of ${fmt(c.min)} or more in the coming months.`)}</p>`}
    <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="calSys" ${c.sys&&notifState()==='granted'?'checked':''}> ${L('Enviarme también una notificación al móvil o al ordenador','Also send me a notification on my phone or computer')}</label>
    <p class="muted" id="calSysSt"></p>
    <p class="muted">${L('La notificación no muestra nombres ni importes. Para poder avisar con la app cerrada se guardan fuera de la bóveda cifrada solo las fechas de los avisos y cuántos pagos son.','The notification shows no names or amounts. To be able to alert you with the app closed, only the alert dates and the number of payments are stored outside the encrypted vault.')}</p></div>
  </div>`;
  const redraw=()=>{ clearTimeout(CAL.t); CAL.t=setTimeout(()=>{ if(S&&location.hash==='#calendario') VIEWS.calendario($('#app')); },0); };
  const go=mo=>{ CAL.m=mo; CAL.sel=mo===ym(today())?today():null; VIEWS.calendario(el); };
  $('#calPrev').onclick=()=>go(ym(isoAddMonths(m+'-01',-1))); $('#calNextM').onclick=()=>go(ymNext(m)); $('#calToday').onclick=()=>go(ym(today()));
  el.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{ CAL.sel=b.dataset.day; const y0=window.scrollY; VIEWS.calendario(el); window.scrollTo(0,y0); });
  el.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{ const e=CAL.ev[+b.dataset.ev]; if(!e) return; if(e.type==='pay') recurModal(e.r); else if(e.type==='stmt') stmtSheet(e); else if(e.type==='act') actSheet(e); else $('#calNotify').scrollIntoView({behavior:'smooth'}); });
  el.querySelectorAll('[data-rec]').forEach(b=>b.onclick=()=>{ const r=recurringAll().find(x=>recId(x)===b.dataset.rec); if(r) recurModal(r); });
  el.querySelectorAll('[data-sug]').forEach(b=>b.onclick=()=>recurModal(null,sug[+b.dataset.sug]));
  el.querySelectorAll('[data-nosug]').forEach(b=>b.onclick=()=>{ c.noSug=c.noSug.filter(k=>k!==sug[+b.dataset.nosug].key).concat(sug[+b.dataset.nosug].key).slice(-200); save(); VIEWS.calendario(el); });
  el.querySelectorAll('[data-unoff]').forEach(b=>b.onclick=()=>{ const o=(S.recurring||[]).find(x=>x.key===b.dataset.unoff); if(o){ delete o.off; if(Object.keys(o).every(k=>k==='id'||k==='key')) S.recurring=S.recurring.filter(x=>x!==o); } save(); VIEWS.calendario(el); });
  $('#recAdd').onclick=()=>recurModal(null);
  $('#calMin').onchange=e=>{ const v=num(e.target.value); if(!(v>=0)||v>1e7){ toast(L('Escribe un importe en dólares','Enter an amount in dollars')); e.target.value=c.min; return; } c.min=Math.round(v); save(); calSysSoon(); redraw(); };
  $('#calPay').onchange=e=>{ const d=[...new Set((e.target.value.match(/\d+/g)||[]).map(Number))].filter(x=>x>=1&&x<=31).slice(0,4); c.payDays=d; save(); calSysSoon(); redraw(); };
  $('#calSys').onchange=async e=>{ const okk=await calSysToggle(e.target.checked); if(!S) return; e.target.checked=okk; const s=$('#calSysSt'); if(s) s.textContent=await calSysStatus(); };
  calSysStatus().then(t=>{ const s=$('#calSysSt'); if(s) s.textContent=t; });
};

/* ---------- Ventanas ---------- */
// Añadir o cambiar un pago recurrente. r = pago existente (tuyo, detectado o deducido); pre = sugerencia
function recurModal(r,pre){ const isAuto=!!(r&&r.auto), src=r||pre||{}, nx=r?recurNext(r)||r.next:(pre&&pre.next)||'';
  const nt=src.notify===true?'y':src.notify===false?'n':'a';
  openModal(`${helpBtn('cal_rec')}<h2>${r?L('Pago recurrente','Recurring payment'):L('Nuevo pago recurrente','New recurring payment')}</h2>
    ${isAuto?`<p class="sub">${r.der?L('La app lo deduce de tus cuentas. Puedes ajustarlo aquí.','The app derives it from your accounts. You can adjust it here.'):L(`Detectado en tus movimientos (${r.n} cargos). Puedes ajustarlo aquí.`,`Detected in your transactions (${r.n} charges). You can adjust it here.`)}</p>`:pre?`<p class="sub">${esc(pre.why||'')}</p>`:''}
    <label class="f">${L('Nombre','Name')}<input id="rcN" maxlength="80" value="${esc(src.name||'')}"></label>
    <div class="row"><label class="f">${L('Importe (USD)','Amount (USD)')}<input id="rcA" inputmode="decimal" value="${src.amount?esc(src.amount):''}"></label><label class="f">${L('Se repite','Repeats')}<select id="rcF">${Object.keys(CAL_FREQ).map(f=>`<option value="${f}" ${(src.freq||'m')===f?'selected':''}>${freqL(f)}</option>`).join('')}</select></label></div>
    <div class="row"><label class="f">${L('Próximo vencimiento','Next due date')}<input type="date" id="rcD" value="${esc(nx||'')}"></label><label class="f">${L('Categoría','Category')}<select id="rcC">${catsOf('expense').map(k=>`<option value="${esc(k)}" ${k===(src.cat||'Otros gastos')?'selected':''}>${esc(catL(k))}</option>`).join('')}</select></label></div>
    <label class="f">${L('Aviso antes de pagarlo','Alert before paying it')}<select id="rcNt"><option value="a" ${nt==='a'?'selected':''}>${L(`Solo si es de ${fmt(calCfg().min)} o más`,`Only if it is ${fmt(calCfg().min)} or more`)}</option><option value="y" ${nt==='y'?'selected':''}>${L('Siempre','Always')}</option><option value="n" ${nt==='n'?'selected':''}>${L('Nunca','Never')}</option></select></label>
    <div class="row" style="margin-top:6px"><button id="mc">${L('Cancelar','Cancel')}</button>${r?(isAuto?`<button id="rcOff">${L('No es recurrente','Not recurring')}</button>${r.ov?`<button id="rcRst">${L('Deshacer mis cambios','Undo my changes')}</button>`:''}`:`<button id="rcDel">${ic('trash')}${L('Quitar','Remove')}</button>`):''}<span></span><button class="pri" id="rcOk">${L('Aceptar','Save')}</button></div>`);
  const done=()=>{ const y=window.scrollY; save(); closeModal(); calSysSoon(); route(); window.scrollTo(0,y); }, list=()=>S.recurring||(S.recurring=[]);
  $('#mc').onclick=closeModal;
  if($('#rcDel')) $('#rcDel').onclick=()=>{ S.recurring=list().filter(x=>x.id!==r.id); done(); };
  if($('#rcRst')) $('#rcRst').onclick=()=>{ S.recurring=list().filter(x=>x.key!==r.key); done(); };
  if($('#rcOff')) $('#rcOff').onclick=()=>{ S.recurring=list().filter(x=>x.key!==r.key).concat(Object.assign({id:uid(),key:r.key},r.ov,{off:true})); done(); toast(L('Oculto. Lo tienes en "ocultos" por si vuelve.','Hidden. It is under "hidden" in case it comes back.')); };
  $('#rcOk').onclick=()=>{ const name=$('#rcN').value.trim().slice(0,80), amount=r2(num($('#rcA').value)), freq=$('#rcF').value, next=isoDate($('#rcD').value), cat=$('#rcC').value, n=$('#rcNt').value, notify=n==='y'?true:n==='n'?false:undefined;
    if(!name) return toast(L('Ponle un nombre','Give it a name')); if(!(amount>0)||amount>=1e8) return toast(L('Escribe el importe en dólares','Enter the amount in dollars')); if(!CAL_FREQ[freq]) return; if(!next) return toast(L('Elige la fecha del próximo vencimiento','Choose the next due date'));
    if(isAuto){ const o={id:(r.ov&&r.ov.id)||uid(),key:r.key}, b=r.base;   // solo se guarda lo que has cambiado: el resto sigue lo que la app detecta
      if(name!==b.name) o.name=name; if(amount!==b.amount) o.amount=amount; if(freq!==b.freq) o.freq=freq; if(cat!==b.cat) o.cat=cat; if(next!==nx||(r.ov&&r.ov.next)) o.next=next; if(notify!==undefined) o.notify=notify;
      S.recurring=list().filter(x=>x.key!==r.key); if(Object.keys(o).length>2) S.recurring.push(o); }
    else { const o={id:(r&&r.id)||uid(),name,amount,freq,next,cat}; if(notify!==undefined) o.notify=notify; if(pre&&pre.key) o.key=pre.key; else if(r&&r.key) o.key=r.key;
      S.recurring=list().filter(x=>x.id!==o.id); S.recurring.push(o); }
    done(); }; }
// Extracto: cuándo cierra, cuándo sale y cómo traerlo
function stmtSheet(e){ const a=e.a;
  openModal(`${helpBtn('cal')}<h2>${L('Extracto · ','Statement · ')}${esc(a.name)}</h2>
    <p class="sub">${e.pend?L(`El extracto que cerró hacia el ${dLabel(e.close)} ya debería estar en la web o la app de ${esc(a.institution||a.name)}.`,`The statement that closed around ${dLabel(e.close)} should already be on the ${esc(a.institution||a.name)} website or app.`)
      :L(`Cierra hacia el ${dLabel(e.close)} y suele estar disponible el ${dLabel(e.d)}.`,`It closes around ${dLabel(e.close)} and is usually available on ${dLabel(e.d)}.`)}</p>
    <label class="f">${L('Día del mes en que suele estar disponible (opcional)','Day of the month it is usually available (optional)')}<input id="stD" inputmode="numeric" placeholder="${L('automático','automatic')}" value="${a.stmtDay?esc(a.stmtDay):''}"></label>
    <p class="muted">${L('Si lo dejas vacío, la app calcula unos días después del cierre de tu último extracto.','If you leave it empty, the app assumes a few days after your latest statement closed.')}</p>
    <div class="row" style="margin-top:6px"><button id="mc">${L('Cerrar','Close')}</button><span></span><button id="stImp">${ic('upload')}${L('Elegir el extracto','Choose the statement')}</button><button class="pri" id="stOk">${L('Aceptar','Save')}</button></div>
    <input type="file" id="stF" accept="${PICK_ACCEPT}" multiple hidden>`);
  $('#mc').onclick=closeModal;
  $('#stImp').onclick=()=>$('#stF').click();
  $('#stF').onchange=ev=>{ const fs=[...ev.target.files]; ev.target.value=''; if(!fs.length) return; closeModal(); importFiles(fs,{forId:a.id}); };
  $('#stOk').onclick=()=>{ const v=$('#stD').value.trim(), d=Math.round(num(v)); if(v&&!(d>=1&&d<=31)) return toast(L('Escribe un día del 1 al 31','Enter a day from 1 to 31')); if(v) a.stmtDay=d; else delete a.stmtDay; const y=window.scrollY; save(); closeModal(); route(); window.scrollTo(0,y); }; }
// Actividad del mes: qué cuentas la tienen ya completa
function actSheet(e){ const me=monthEnd(e.m), mn=mesLong(+e.m.slice(5)-1), rows=actAccounts().map(a=>{ const end=covEnd(a), okk=!!end&&end>=me;
    return `<div class="srow">${accAv(a)}<span class="lm"><b>${esc(a.name)}</b><span>${end?L(`Datos hasta el ${dLabel(end)}`,`Data through ${dLabel(end)}`):L('Sin datos todavía','No data yet')}</span></span>${okk?`<span class="sst ok">${ic('check')}${L('Completa','Complete')}</span>`:`<span class="sst due">${L('Falta','Missing')}</span>`}</div>`; }).join('');
  openModal(`${helpBtn('cal')}<h2>${L(`Actividad de ${mn}`,`${mn} activity`)}</h2>
    <p class="sub">${L(`Desde el ${dLabel(e.d)} todos los cargos de ${mn} ya están anotados en tus bancos y tarjetas (los pendientes tardan un par de días). Si una cuenta aún no tiene extracto, descarga su actividad reciente en CSV: cuando llegue el extracto la sustituye sin duplicar.`,`From ${dLabel(e.d)} every ${mn} charge is already posted at your banks and cards (pending ones take a couple of days). If an account has no statement yet, download its recent activity as CSV: when the statement arrives it replaces it without duplicates.`)}</p>
    <div class="clist">${rows}</div>
    <div class="row" style="margin-top:12px"><button id="mc">${L('Cerrar','Close')}</button><span></span><button class="pri" id="acImp">${ic('upload')}${L('Ir a Extractos','Go to Statements')}</button></div>`);
  $('#mc').onclick=closeModal; $('#acImp').onclick=()=>{ closeModal(); location.hash='#importar'; }; }
