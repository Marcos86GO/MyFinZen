// WhoseBill? — Lector local de tickets de restaurante: todo ocurre en el dispositivo, sin enviar la foto a ningún sitio.
//   1. ticketPrep: busca el papel en la foto, lo recorta, lo escala y lo pasa a blanco y negro con un umbral
//      adaptativo (las sombras del móvil sobre el ticket no tapan el texto).
//   2. ocrText: reconocimiento de texto con Tesseract (whosebill/vendor/ocr, Apache 2.0) en un worker. Se descarga la primera
//      vez (~7 MB) y el service worker lo guarda en su propia caché, que no se borra al actualizar la app.
//   3. parseReceipt: entiende el texto (productos, subtotal, descuento, impuestos, servicio, propina y total).
// Se carga antes de split.js. parseReceipt no usa el DOM (se prueba aparte con textos inventados).
"use strict";
const OCR={w:null,p:null,log:null,idle:null};
const OCR_BASE=(()=>{ try{ return new URL('../vendor/ocr/',document.currentScript.src).href; }catch(e){ return 'whosebill/vendor/ocr/'; } })();   // whosebill/vendor/ocr, se cargue desde donde se cargue
// ¿Admite el navegador WebAssembly SIMD? (el motor que se incluye lo necesita: Chrome 91+, Safari 16.4+, Firefox 89+)
function ocrSimd(){ try{ return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }catch(e){ return false; } }
function ocrLib(){ if(window.Tesseract) return Promise.resolve();
  return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=OCR_BASE+'tesseract.min.js'; s.onload=()=>res(); s.onerror=()=>rej(new Error(L('No se ha podido cargar el lector de tickets','The receipt reader could not be loaded'))); document.head.appendChild(s); }); }
async function ocrWorker(){ if(OCR.w) return OCR.w;
  if(!OCR.p) OCR.p=(async()=>{
    if(typeof WebAssembly!=='object'||!ocrSimd()) throw new Error(L('Este navegador es demasiado antiguo para leer tickets. Actualízalo o escribe los importes a mano.','This browser is too old to read receipts. Update it or type the amounts by hand.'));
    await ocrLib(); const base=new URL(OCR_BASE,location.href).href;
    // Sin "blob:" (el worker es un archivo propio) y sin caché en IndexedDB (cacheMethod none: ahí solo está la bóveda)
    const w=await Tesseract.createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base+'tesseract-core-simd-lstm.wasm.js',langPath:base.replace(/\/$/,''),gzip:true,cacheMethod:'none',workerBlobURL:false,
      logger:m=>{ if(OCR.log) try{ OCR.log(m); }catch(e){} }});
    await w.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'300'});
    OCR.w=w; return w; })();
  try{ return await OCR.p; }catch(e){ OCR.p=null; throw e; } }
// El motor ocupa memoria: se cierra al bloquear o tras 3 minutos sin usarlo
function ocrStop(){ clearTimeout(OCR.idle); const w=OCR.w; OCR.w=null; OCR.p=null; OCR.log=null; if(w) try{ w.terminate(); }catch(e){} }

/* ---------- 1. Preparar la foto ---------- */
// Caja del papel: píxeles claros y poco saturados (el ticket, también a la sombra) frente a una mesa, un mantel de color…
function paperBox(d,w,h){ const m=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){ const r=d[i*4],g=d[i*4+1],b=d[i*4+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b); m[i]=mx>=70&&(mx-mn)<=mx*0.2?1:0; }
  // cierre: rellena las letras (oscuras) dentro del papel
  const grow=(src,v)=>{ const o=new Uint8Array(w*h); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let hit=!v; for(let dy=-2;dy<=2&&hit!==v;dy++) for(let dx=-2;dx<=2;dx++){ const xx=x+dx, yy=y+dy; if(xx<0||yy<0||xx>=w||yy>=h) continue; if(src[yy*w+xx]===(v?1:0)){ hit=v; break; } } o[y*w+x]=hit?1:0; } return o; };
  const c=grow(grow(m,true),false);
  // la mancha más grande
  const seen=new Uint8Array(w*h); let best=null;
  for(let s=0;s<w*h;s++){ if(!c[s]||seen[s]) continue; const st=[s]; seen[s]=1; let n=0,x0=w,x1=0,y0=h,y1=0;
    while(st.length){ const p=st.pop(), x=p%w, y=(p-x)/w; n++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
      for(const q of [p-1,p+1,p-w,p+w]){ if(q<0||q>=w*h||seen[q]||!c[q]) continue; if((q===p-1&&x===0)||(q===p+1&&x===w-1)) continue; seen[q]=1; st.push(q); } }
    if(!best||n>best.n) best={n,x0,x1,y0,y1}; }
  if(!best) return null; const bw=best.x1-best.x0+1, bh=best.y1-best.y0+1, a=bw*bh;
  if(best.n<w*h*0.08||a>w*h*0.96) return null;   // no se distingue el papel (o lo llena todo): se usa la foto entera
  return {x:best.x0/w,y:best.y0/h,w:bw/w,h:bh/h}; }
// Umbral adaptativo (Bradley): cada píxel se compara con la media de su entorno, así una sombra no lo vuelve negro
function binarize(g,w,h){ const I=new Float64Array((w+1)*(h+1)), s=Math.max(15,Math.round(w/14)), r=s>>1, out=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++){ let row=0; for(let x=0;x<w;x++){ row+=g[y*w+x]; I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+row; } }
  for(let y=0;y<h;y++){ const y0=Math.max(0,y-r), y1=Math.min(h-1,y+r);
    for(let x=0;x<w;x++){ const x0=Math.max(0,x-r), x1=Math.min(w-1,x+r), n=(x1-x0+1)*(y1-y0+1);
      const sum=I[(y1+1)*(w+1)+x1+1]-I[y0*(w+1)+x1+1]-I[(y1+1)*(w+1)+x0]+I[y0*(w+1)+x0];
      const v=g[y*w+x]*n<=sum*0.82?0:255, k=(y*w+x)*4; out[k]=out[k+1]=out[k+2]=v; out[k+3]=255; } }
  return out; }
// Inclinación del texto: el ángulo con el que las filas de tinta quedan más marcadas (perfil de proyección)
function skewAngle(bin,W,H){ const f=4, w=Math.floor(W/f), h=Math.floor(H/f), xs=[], ys=[];
  for(let y=0;y<h;y++) for(let x=Math.floor(w*0.06);x<w*0.94;x++){ const k=((y*f)*W+x*f)*4; if(bin[k]===0){ xs.push(x); ys.push(y); } }
  if(xs.length<200) return 0;
  const score=a=>{ const s=Math.sin(a*Math.PI/180), c=Math.cos(a*Math.PI/180), off=w, hist=new Float64Array(h+2*w+2);
    for(let i=0;i<xs.length;i++){ const yy=Math.round(-xs[i]*s+ys[i]*c)+off; hist[yy]++; } let v=0; for(let i=1;i<hist.length;i++){ const d=hist[i]-hist[i-1]; v+=d*d; } return v; };
  let best=0, bs=score(0); for(let a=-12;a<=12;a+=0.5){ const v=score(a); if(v>bs){ bs=v; best=a; } }
  for(let a=best-0.4;a<=best+0.41;a+=0.1){ const v=score(a); if(v>bs){ bs=v; best=a; } }
  return Math.round(best*10)/10; }
function grayOf(d,n){ const g=new Float32Array(n); for(let i=0;i<n;i++) g[i]=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2]; return g; }
// Devuelve dos versiones listas para el OCR: bin (blanco y negro adaptativo) y gray (grises con el contraste estirado)
async function ticketPrep(file){ const bmp=await createImageBitmap(file);
  const k0=Math.min(1,360/Math.max(bmp.width,bmp.height)), sw=Math.max(1,Math.round(bmp.width*k0)), sh=Math.max(1,Math.round(bmp.height*k0));
  const sc=document.createElement('canvas'); sc.width=sw; sc.height=sh; const sx=sc.getContext('2d',{willReadFrequently:true}); sx.drawImage(bmp,0,0,sw,sh);
  const box=paperBox(sx.getImageData(0,0,sw,sh).data,sw,sh)||{x:0,y:0,w:1,h:1};
  const pad=0.01, bx=Math.max(0,box.x-pad), by=Math.max(0,box.y-pad), bw=Math.min(1-bx,box.w+2*pad), bh=Math.min(1-by,box.h+2*pad);
  const cx=bx*bmp.width, cy=by*bmp.height, cw=bw*bmp.width, ch=bh*bmp.height;
  // ~1.400 px de ancho de papel: unas 30-40 px por carácter en un ticket de 40 columnas
  const k=Math.max(0.4,Math.min(4,1400/cw)), W=Math.round(cw*k), H=Math.min(12000,Math.round(ch*k));
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const x=cv.getContext('2d',{willReadFrequently:true});
  x.imageSmoothingQuality='high'; x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.drawImage(bmp,cx,cy,cw,ch,0,0,W,H);
  let id=x.getImageData(0,0,W,H), bin=binarize(grayOf(id.data,W*H),W,H);
  const ang=skewAngle(bin,W,H);
  if(Math.abs(ang)>=0.3){ x.save(); x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.translate(W/2,H/2); x.rotate(-ang*Math.PI/180); x.drawImage(bmp,cx,cy,cw,ch,-W/2,-H/2,W,H); x.restore();
    id=x.getImageData(0,0,W,H); bin=binarize(grayOf(id.data,W*H),W,H); }
  if(bmp.close) bmp.close();
  const g=grayOf(id.data,W*H), gv=document.createElement('canvas'); gv.width=W; gv.height=H; const gx=gv.getContext('2d'), gd=gx.createImageData(W,H);
  const srt=Array.from(g.filter((v,i)=>i%7===0)).sort((a,b)=>a-b), lo=srt[Math.floor(srt.length*0.02)]||0, hi=srt[Math.floor(srt.length*0.9)]||255, sp=Math.max(1,hi-lo);
  for(let i=0;i<W*H;i++){ const v=Math.max(0,Math.min(255,(g[i]-lo)/sp*255)); gd.data[i*4]=gd.data[i*4+1]=gd.data[i*4+2]=v; gd.data[i*4+3]=255; } gx.putImageData(gd,0,0);
  id.data.set(bin); x.putImageData(id,0,0); return {bin:cv,gray:gv,angle:ang}; }

/* ---------- 2. Reconocer el texto ---------- */
// ¿Cuadra lo leído? Los productos suman el subtotal impreso y el subtotal con impuestos y cargos da el total
function rcScore(R){ const sum=R.items.reduce((a,x)=>a+x.price,0), okSub=R.sub!=null&&R.items.length>0&&Math.abs(sum-R.sub)<0.011;
  const base=R.sub!=null?R.sub:sum, okTot=R.tot!=null&&(Math.abs(base-R.disc+R.tax+R.svc-R.tot)<0.011||Math.abs(base-R.disc+R.tax+R.svc+(R.tip||0)-R.tot)<0.011);
  return {ok:okSub&&okTot,s:(okSub?400:0)+(okTot?300:0)+R.items.length*5+(R.sub!=null?20:0)+(R.tot!=null?20:0)+(R.tax?10:0)}; }
// Primero en blanco y negro (modo "bloque de texto"); si no cuadra, en grises y luego por columnas, y se queda la mejor lectura
const OCR_PASSES=[['bin','6'],['gray','6'],['bin','4']];
async function ocrText(files,onProg){ const preps=[]; for(const f of files) preps.push(await ticketPrep(f));
  const w=await ocrWorker(); let best=null;
  for(let p=0;p<OCR_PASSES.length;p++){ const [v,psm]=OCR_PASSES[p]; await w.setParameters({tessedit_pageseg_mode:psm}); let text='';
    for(let i=0;i<preps.length;i++){ OCR.log=m=>{ if(onProg&&m&&m.status) onProg(m.status,m.status==='recognizing text'?(i+m.progress)/preps.length:0,p); };
      const r=await w.recognize(preps[i][v]); text+=(text?'\n':'')+String(r&&r.data&&r.data.text||''); }
    const sc=rcScore(parseReceipt(text)); if(!best||sc.s>best.sc.s) best={text,sc}; if(best.sc.ok) break; }
  OCR.log=null; clearTimeout(OCR.idle); OCR.idle=setTimeout(ocrStop,180000); return best?best.text:''; }

/* ---------- 3. Entender el ticket ---------- */
const RC_KEY={
  sub:/\b(sub\s*-?\s*[tT\[|lI1]ota[l1I]|subtota[l1I]|base\s+imponible|importe\s+neto|food\s*(?:&|and)\s*bev(?:erage)?s?\s+total)\b/i,
  tax:/(?:^|\s|\b)((?:sales|state|city|local|county)\s+tax|[tT\[|lI1]ax(?:es)?|iva|i\.v\.a|vat|igic|hst|gst|pst|impuestos?)\b/i,
  svc:/\b(service\s*(?:charge|fee)?|serv\.?\s*(?:chg|charge|fee)|gratuity|auto\s*grat|surcharge|kitchen\s*(?:fee|appreciation|charge)|living\s*wage|health(?:care)?\s*(?:fee|surcharge|mandate)|sf\s*mandate|wellness|cargo\s+(?:de|por)\s+servicio|servicio)\b/i,
  disc:/\b(discount|disc\.?|descuento|dto\.?|coupon|cup[oó]n|promo(?:tion)?|comp(?:ed)?|happy\s*hour\s*disc|loyalty|reward)\b/i,
  tip:/\b(tip|propina|add\s*tip)\b/i,
  tot:/(?:^|\s|\b)([tT\[|lI1]ota[l1I]|amount\s+due|balance\s+due|total\s+due|grand\s+total|a\s+pagar|importe\s+total|to\s+pay)\b/i,
  pay:/\b(visa|master\s*card|mastercard|amex|american\s+express|discover|debit|credit|cash|change|cambio|tender(?:ed)?|efectivo|tarjeta|auth(?:orization)?|approval|approved|entry\s+method|chip|contactless|card\s*(?:#|no|type)|acct|account|ref(?:erence)?\s*#?|trans(?:action)?|terminal|merchant|signature|aid\b)/i,
  sugg:/\b(suggested|sugerid[ao]|tip\s+guide|gratuity\s+guide|for\s+your\s+convenience|tip\s+percentages?)\b/i,
  head:/\b(server|cashier|camarer[oa]|mesa|table|tbl|check\s*#?|chk|order\s*#?|ordered|guests?|covers?|pax|comensales|station|terminal|tel|phone|www\.|https?|\.com\b|thank\s+you|gracias)\b/i};
// Corrige lo que el OCR suele confundir dentro de un importe (O→0, l→1, S→$…) y devuelve el número
function rcAmt(tok){ let t=String(tok).trim().replace(/^[S§]\s*(?=\d)/,'$').replace(/[Oo](?=[\d.,]|$)/g,'0').replace(/(?<=\d)[Oo]/g,'0').replace(/[lI|](?=\d)/g,'1').replace(/(?<=\d)[lI|]/g,'1');
  const neg=/^-|^\(|-$|\)$/.test(t)||/^\$\s*-/.test(t); t=t.replace(/[^\d.,]/g,''); if(!t) return null;
  let v;
  if(/[.,]\d{2}$/.test(t)) v=parseFloat(t.slice(0,-3).replace(/[.,]/g,'')+'.'+t.slice(-2));
  else if(/^\d{3,6}$/.test(t)) v=parseInt(t,10)/100;   // se perdió el punto: los tickets siempre llevan céntimos
  else return null;
  return Number.isFinite(v)?(neg?-v:v):null; }
// Último importe de una línea: "2 HH Calamari Rings $15.90", "Tax 10.45", "Burger 12.50 T" (letra de impuesto), "-$3.00"
const RC_PRICE=/(-?\s*\(?\s*[$S§€£]?\s*-?\s*[\dOolI|]{1,6}(?:[.,]\s?[\dOo]{2})?\)?-?)\s*(?:[A-Z]{1,2}|\*|€|EUR|USD)?\s*$/;
const RC_PRICE_ALL=/[$S§€£]?\s*-?\d{1,6}[.,]\d{2}\b/g;
// loose: también "1590" sin punto (el OCR a veces lo pierde); solo una vez empezados los productos, nunca en la cabecera (código postal, teléfono)
function rcSplit(line,loose){ const m=line.match(RC_PRICE); if(!m) return null; const raw=m[1].trim();
  const cents=/[.,]\s?[\dOo]{2}\)?-?$/.test(raw);
  if(!cents&&!(loose&&/^\D*\d{3,5}\D*$/.test(raw))) return null;
  if(!cents&&/\b(?:#|no\.?|n[ºo°])\s*$/i.test(line.slice(0,m.index))) return null;
  const v=rcAmt(raw.replace(/\s+/g,'')); if(v==null) return null;
  return {v,label:line.slice(0,m.index).replace(/[\s.:·_=*-]+$/,'').trim()}; }
function rcDate(text){ let m=text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/); if(m) return isoOr(m[1],m[2],m[3]);
  m=text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/);
  if(m){ let a=+m[1], b=+m[2], y=+m[3]; if(y<100) y+=2000; return a>12?isoOr(y,b,a):isoOr(y,a,b); }
  const MON='jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|abr|ago|dic'; m=text.match(new RegExp(`\\b(${MON})[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`,'i'));
  if(m){ const i=MON.split('|').indexOf(m[1].toLowerCase().slice(0,3)); return isoOr(m[3],[1,2,3,4,5,6,7,8,9,10,11,12,1,4,8,12][i],m[2]); }
  return null; }
function isoOr(y,m,d){ const s=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; return typeof isoDate==='function'?isoDate(s):(/^\d{4}-\d{2}-\d{2}$/.test(s)?s:null); }
// Quita el ruido de los bordes del papel que el OCR pega a una línea: "§ 2 HH Mug", "3     2 HH Salad", "$15.90     3"
function rcClean(l){ l=String(l).replace(/[“”«»]/g,'"').replace(/[‘’`´]/g,"'").replace(/[—–]/g,'-');
  l=l.replace(/^\s*[^\sA-Za-z0-9$(\-]{1,2}\s+/,'').replace(/^\s*(?!\d{1,2}\s{1,2}\S)\S{1,2}\s{3,}(?=\S)/,'').replace(/^\s*\d\s{3,}(?=\d)/,'');
  l=l.replace(/(\d[.,]\d{2}\)?)\s{2,}\S{1,3}\s*$/,'$1').replace(/([$S]\d{3,6})\s{3,}\S{1,2}\s*$/,'$1').replace(/\s{3,}[^\s$\d]{1,2}\s*$/,'');
  return l.replace(/\s+/g,' ').trim(); }
const rcLetters=s=>(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
const rcTitle=s=>s===s.toUpperCase()?s.toLowerCase().replace(/(^|[\s&'-])([a-zà-ÿ])/g,(a,p,c)=>p+c.toUpperCase()):s;
function parseReceipt(text){
  const lines=String(text||'').split(/\r?\n/).map(rcClean).filter(l=>l.length>1);
  const R={place:'',date:rcDate(lines.join('\n')),cur:/€|\bEUR\b/.test(text)?'EUR':/£|\bGBP\b/.test(text)?'GBP':'USD',guests:null,items:[],sub:null,disc:0,tax:0,svc:0,tip:null,tot:null};
  const g=String(text).match(/\b(?:guests?|covers?|pax|comensales|personas)\s*[:#]?\s*(\d{1,2})\b/i); if(g&&+g[1]>=1) R.guests=+g[1];
  let phase='head', pending=null;
  for(const l of lines){
    if(RC_KEY.sugg.test(l)){ if(phase==='head') continue; break; }               // tabla de propina sugerida: lo que importa ya ha salido
    if(/\d{1,2}\s*%.*\btip\b|\btip\b.*\d{1,2}\s*%/i.test(l)&&(l.match(RC_PRICE_ALL)||[]).length>1) continue;   // "18%: (Tip $26.24 Total $171.99)"
    if(phase==='pay') continue;
    const lp=l.replace(/\d{1,2}(?:[.,]\d{1,3})?\s*%/g,'%'), p=rcSplit(lp,phase!=='head'), many=(lp.match(RC_PRICE_ALL)||[]).length>1&&!/@/.test(l);   // "Tax 7.75% 5.15": el % no es un importe
    const inclTax=/\b(incl\.?|inc\.|included|incluid[oa]s?)\b/i.test(l);
    const isSub=RC_KEY.sub.test(l), isTaxW=RC_KEY.tax.test(l)&&!inclTax&&!/\btax\s*(?:id|#|no)\b/i.test(l);
    const isTot=!isSub&&!isTaxW&&RC_KEY.tot.test(l), isSvc=!isSub&&!isTot&&RC_KEY.svc.test(l), isTip=!isTot&&!isSvc&&RC_KEY.tip.test(l), isDisc=!isTot&&!isSub&&RC_KEY.disc.test(l);
    if(!p){
      if(phase==='head'){ const n=rcLetters(l);
        const cl=l.split(' ').map(w=>w.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&.']+$/gu,'')).filter(w=>rcLetters(w)>=2).join(' ');
        if(!R.place&&rcLetters(cl)>=4&&rcLetters(cl)>=cl.replace(/\s/g,'').length*0.8&&!RC_KEY.head.test(l)&&!/\d{3,}/.test(l)&&/\p{L}{4,}/u.test(cl)&&!/\b(st|street|ave|avenue|rd|road|blvd|dr|drive|suite|ste|calle|avda?|plaza|c\/)\b\.?|\bc\//i.test(l))
          R.place=rcTitle(cl).slice(0,60); }
      else if(phase==='items'&&rcLetters(l)>=3&&!RC_KEY.head.test(l)) pending=l;  // nombre partido en dos líneas o un modificador sin precio
      continue; }
    if(isSub){ R.sub=Math.abs(p.v); phase='sum'; continue; }
    if(isTot){ R.tot=Math.abs(p.v); phase=R.tip!=null?'pay':'tot'; continue; }
    if(phase==='tot'&&RC_KEY.pay.test(l)){ phase='pay'; continue; }
    if(isTip&&!many){ R.tip=Math.abs(p.v); phase='tip'; continue; }
    if(phase==='tot'||phase==='tip') continue;
    if(many) continue;
    if(isTaxW){ R.tax=r2c(R.tax+Math.abs(p.v)); phase='sum'; continue; }
    if(isSvc){ R.svc=r2c(R.svc+Math.abs(p.v)); continue; }
    if(isDisc){ R.disc=r2c(R.disc+Math.abs(p.v)); continue; }
    if(phase==='sum'||RC_KEY.pay.test(l)) continue;
    // producto
    let label=p.label; if(rcLetters(label)<2&&pending) label=pending; pending=null;
    if(rcLetters(label)<2) continue;
    if(phase==='head'&&RC_KEY.head.test(label)&&!/^\d{1,2}\s/.test(label)) continue;
    { const dd=label.match(/^\d\s+(\d{1,2}\s+(?!(?:oz|pcs?|lbs?|ml|cl|kg|g|in|pc)\b)[A-Za-zÀ-ÿ]{3,})/i); if(dd) label=dd[1]; }   // "8 1 Churros": una mancha leída como cifra
    let qty=1; const q=label.match(/^(\d{1,2})\s*(?:[xX]\s*|@\s*)?(?=[A-Za-zÀ-ÿ]|\d[A-Za-z])/);
    if(q&&+q[1]>=1&&+q[1]<=50){ qty=+q[1]; label=label.slice(q[0].length); }
    const at=label.match(/\s+(\d{1,2})\s*@\s*[$S]?\s*\d+[.,]\d{2}$/); if(at){ qty=+at[1]; label=label.slice(0,at.index); }
    label=label.replace(/\s*@\s*[$S]?\s*\d+[.,]\d{2}\s*$/,'').replace(/^[^A-Za-zÀ-ÿ0-9+]+/,'').replace(/\s+[.·_]{2,}.*$/,'').trim();
    phase='items'; R.items.push({name:label.slice(0,80),qty,price:r2c(p.v)}); }
  const sum=()=>r2c(R.items.reduce((a,x)=>a+x.price,0));
  if(R.sub!=null&&R.items.length){
    // Subtotal impreso después del descuento: el subtotal de la app es el de antes (el descuento va aparte)
    if(R.disc&&Math.abs(sum()-R.disc-R.sub)<=0.011) R.sub=sum();
    // Precios con el IVA incluido (tickets europeos: "Base imponible" + "IVA"): los productos ya suman el total
    if(Math.abs(sum()-R.sub)>0.02&&Math.abs(sum()-(R.sub+R.tax))<=0.02){ R.sub=sum(); R.tax=0; }
    // Un importe con la coma mal leída se arregla con el subtotal impreso (x10, x100…)
    else if(Math.abs(sum()-R.sub)>0.005){ const s0=sum(); outer: for(const it of R.items) for(const f of [10,100,0.1,0.01]){ const nv=r2c(it.price*f); if(Math.abs(r2c(s0-it.price+nv)-R.sub)<0.005){ it.price=nv; break outer; } } } }
  else if(R.sub==null&&R.tot!=null&&R.items.length&&Math.abs(sum()-R.tot)<=0.02&&R.tax){ R.tax=0; }  // total = productos: el impuesto ya iba incluido
  return R; }
const r2c=x=>Math.round(x*100)/100;
