// Dividir la cuenta — app independiente (https://…/MyFinZen/dividir/). Reparte el ticket de un restaurante entre tarjetas.
// Usa el mismo código que «Dividir la cuenta» de MyFinZen (../split.js y el lector local ../ticket.js) y añade usuarios
// locales: cada usuario tiene sus tickets y sus preferencias cifrados en este dispositivo (AES-GCM 256 con una clave aleatoria
// envuelta por su contraseña —PBKDF2-SHA256, 600.000 iteraciones—, su clave de recuperación y sus passkeys con PRF).
// Sin servidor: nada sale del dispositivo. Este archivo se carga antes de ticket.js y split.js (les da las utilidades).
"use strict";
if(window.top!==window.self){ try{ window.top.location.replace(window.self.location.href); }catch(e){} document.documentElement.innerHTML=''; throw new Error('No se puede abrir dentro de un marco'); }
/* ---------- Idioma (la misma preferencia que MyFinZen: mismo origen, mfz-lang) ---------- */
let LANG='es';
try{ const s=localStorage.getItem('mfz-lang'); LANG=(s==='es'||s==='en')?s:(/^es\b/i.test(navigator.language||'')?'es':'en'); }catch(e){}
const L=(es,en)=>LANG==='en'?en:es;
function setLang(l){ LANG=l==='en'?'en':'es'; try{ localStorage.setItem('mfz-lang',LANG); }catch(e){} applyStatic(); if(S) route(); else showGate(GATE.mode,GATE.arg); }
/* ---------- Utilidades (las mismas que MyFinZen) ---------- */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number.isFinite(n)?(n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
function num(v){ if(v==null)return NaN; let s=String(v).trim(); if(!s)return NaN; let neg=/^\(.*\)$/.test(s)||/^-/.test(s)||/-$/.test(s); s=s.replace(/[^0-9.,]/g,''); if(/,\d{2}$/.test(s)&&!/\.\d{2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); const n=parseFloat(s); return isNaN(n)?NaN:(neg?-n:n); }
const numStrict=v=>{ if(typeof v==='number') return Number.isFinite(v)?v:null; if(typeof v!=='string'||!/^\s*\(?-?\$?\s*-?\d[\d,]*(\.\d+)?\)?\s*$/.test(v)) return null; const n=num(v); return Number.isFinite(n)?n:null; };
const r2=x=>Math.round(x*100)/100;
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const isoDate=v=>{ if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; const [y,m,d]=v.split('-').map(Number); return m>=1&&m<=12&&d>=1&&d<=31&&y>1900&&y<2200?v:null; };
const str=(v,max=300)=>v==null?'':String(v).slice(0,max);
const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const cleanId=v=>String(v??'').replace(/[^\w-]/g,'').slice(0,40);
const MES_={es:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
const mesAbbr=i=>MES_[LANG][i];
const dLabel=d=>{ if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(d)) return '—'; const [y,m,dd]=d.split('-');return LANG==='en'?`${mesAbbr(+m-1)} ${+dd}, ${y}`:+dd+' '+mesAbbr(+m-1)+' '+y};
const ICONS={camera:'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 10a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z',
  upload:'M12 15V4M7 9l5-5 5 5M5 20h14', edit:'M4 20h4L19 9l-4-4L4 16z', receipt:'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  trash:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', plus:'M12 5v14M5 12h14', close:'M6 6l12 12M18 6L6 18', check:'M5 12l5 5 9-10',
  card:'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h4', star:'M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z',
  right:'M9 6l6 6-6 6', lock:'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3', left:'M15 6l-6 6 6 6',
  user:'M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5', shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  key:'M14 4a6 6 0 1 1-4.8 9.6L3 20v-3h3v-3h3l1.2-1.2A6 6 0 0 1 14 4zM16 8h.01', split:'M12 21v-8M12 13L6 7M12 13l6-6M6 7v4M6 7h4M18 7v4M18 7h-4'};
const ic=(n,cls)=>`<svg class="ico${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]||''}"/></svg>`;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);}
function openModal(html){ $('#modal').innerHTML=html; $('#modalBg').classList.add('show'); setTimeout(()=>{const f=$('#modal').querySelector('input:not([type=checkbox]):not([type=radio])'); if(f&&window.innerWidth>700) f.focus();},50); }
function closeModal(){ $('#modalBg').classList.remove('show'); }
$('#modalBg').addEventListener('click',e=>{ if(e.target.id==='modalBg') closeModal(); });
function confirmModal(title,body){ return new Promise(res=>{ openModal(`<h2>${title}</h2>${body}<div class="row" style="margin-top:12px"><button id="cN">${L('Cancelar','Cancel')}</button><button class="pri" id="cY">${L('Continuar','Continue')}</button></div>`); $('#cN').onclick=()=>{closeModal();res(false)}; $('#cY').onclick=()=>{closeModal();res(true)}; }); }
/* ---------- Ayuda: icono (i) en cada tarjeta; textos en ../help.js ---------- */
function helpBtn(key){ return `<button class="ib" data-help="${key}" aria-label="${L('Qué es esto','What is this')}" title="${L('Qué es esto','What is this')}">i</button>`; }
function showHelp(key){ const h0=(window.HELP||{})[key], h=h0&&(h0[LANG]||h0.es); if(!h) return;
  openModal(`<div class="help"><h2>${h.t}</h2>${h.d.map(p=>`<p>${p}</p>`).join('')}${h.steps&&h.steps.length?`<p><b>${L('Cómo usarlo','How to use it')}</b></p><ol>${h.steps.map(x=>`<li>${x}</li>`).join('')}</ol>`:''}</div><div class="row" style="margin-top:12px"><button class="pri" id="mc">${L('Entendido','Got it')}</button></div>`);
  $('#mc').onclick=closeModal; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-help]'); if(b){ e.preventDefault(); e.stopPropagation(); showHelp(b.dataset.help); } },true);
const VIEWS={};
let S=null;

/* ============================================================
   Usuarios (perfiles) en IndexedDB 'mfz-dividir' → 'profiles' = [{id, name, created, updated, pw, rec, pk[], data}]
   · name: lo único en claro (para elegir quién eres al entrar)
   · pw / rec: la clave de los datos (DK) envuelta por la contraseña / la clave de recuperación (PBKDF2 + AES-GCM)
   · pk: passkeys con PRF (HKDF → clave de envoltura); data: {splits, settings} cifrado con la DK
   Nada más se guarda fuera: ni tickets, ni importes, ni fotos.
   ============================================================ */
const IDB={db:null,
  open(){ return new Promise(res=>{ try{ const r=indexedDB.open('mfz-dividir',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>{ IDB.db=r.result; res(true); }; r.onerror=()=>res(false); }catch(e){ res(false); } }); },
  tx(mode,fn){ return new Promise((res,rej)=>{ const t=IDB.db.transaction('kv',mode), q=fn(t.objectStore('kv')); t.oncomplete=()=>res(q&&q.result); t.onerror=t.onabort=()=>rej(t.error); }); },
  get(k){ return IDB.tx('readonly',s=>s.get(k)).catch(()=>null); }, set(k,v){ return IDB.tx('readwrite',s=>s.put(v,k)).then(()=>true).catch(()=>false); }};
const TE=new TextEncoder(), TD=new TextDecoder();
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const b64=u=>{let s='';u=new Uint8Array(u);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64u=buf=>b64(buf).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromU=s=>unb64(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4));
const PW_ITER=600000, REC_ITER=200000, PW_MIN=10;
async function kdfPass(pass,salt,it){ const k=await crypto.subtle.importKey('raw',TE.encode(pass),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
async function kdfPrf(out){ const base=await crypto.subtle.importKey('raw',out,'HKDF',false,['deriveKey']); return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:TE.encode('mfz-dividir-prf-v1'),info:TE.encode('profile-kek')},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
async function seal(key,bytes){ const iv=rnd(12); const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes); return {iv:b64(iv),ct:b64(ct)}; }
async function unseal(key,o){ return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},key,unb64(o.ct))); }
async function wrapPw(pass,raw,it){ const salt=rnd(16); return {salt:b64(salt),it,wrap:await seal(await kdfPass(pass,salt,it),raw)}; }
// Clave de recuperación: 24 símbolos de un alfabeto de 31 (≈119 bits), con muestreo por rechazo
function makeRecovery(){ const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const lim=256-256%A.length; let s='', n=0; while(n<24){ for(const b of rnd(32)){ if(b>=lim||n>=24) continue; s+=A[b%A.length]; n++; if(n%4===0&&n<24) s+='-'; } } return s; }
const normRec=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
// Todo lo que se lee de IndexedDB se valida antes de usarlo
function sanitizeProfiles(v){ const B=/^[A-Za-z0-9+/=]+$/, sealed=o=>{ o=obj(o); return typeof o.iv==='string'&&B.test(o.iv)&&o.iv.length<=32&&typeof o.ct==='string'&&B.test(o.ct)?{iv:o.iv,ct:o.ct}:null; };
  const kw=o=>{ o=obj(o); const it=Number(o.it), w=sealed(o.wrap); return typeof o.salt==='string'&&B.test(o.salt)&&o.salt.length<=64&&Number.isInteger(it)&&it>=100000&&it<=5000000&&w?{salt:o.salt,it,wrap:w}:null; };
  return arr(v).map(p=>{ p=obj(p); const pw=kw(p.pw), rec=kw(p.rec), data=sealed(p.data), id=cleanId(p.id); if(!id||!pw||!rec||!data) return null;
    const pk=arr(p.pk).map(k=>{ k=obj(k); return typeof k.id==='string'&&/^[A-Za-z0-9_-]{1,400}$/.test(k.id)&&typeof k.prfSalt==='string'&&B.test(k.prfSalt)&&sealed(k.wrap)?{id:k.id,prfSalt:k.prfSalt,wrap:sealed(k.wrap),created:isoDate(k.created)||today(),name:str(k.name,40)}:null; }).filter(Boolean).slice(0,10);
    return {id,name:str(p.name,40).trim()||'—',created:str(p.created,30),updated:str(p.updated,30),pw,rec,pk,data}; }).filter(Boolean).slice(0,20); }
// Datos de un usuario: sus tickets y sus preferencias (validados con las funciones de split.js)
function blankData(){ return {v:1,created:new Date().toISOString(),splits:[],settings:{split:sanitizeSplitPrefs({}),lockMin:5}}; }
function sanitizeData(st){ const o=obj(st), s=obj(o.settings);
  return {v:1,created:typeof o.created==='string'?o.created.slice(0,30):new Date().toISOString(),splits:sanitizeSplits(o.splits),settings:{split:sanitizeSplitPrefs(s.split),lockMin:[1,2,5,10,15,30].includes(+s.lockMin)?+s.lockMin:5}}; }
let PROFILES=[]; const SES={p:null,dk:null,dkRaw:null};
async function setDK(raw){ SES.dkRaw=raw; SES.dk=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']); }
async function loadData(p){ const raw=await unseal(SES.dk,p.data); S=sanitizeData(JSON.parse(TD.decode(raw))); raw.fill(0); SES.p=p; }
// Escrituras en cola: nunca se guarda una versión vieja encima de una nueva
let persistQ=Promise.resolve(), saveTimer=null;
function persist(){ if(!SES.dk||!S||!SES.p) return persistQ; const dk=SES.dk, p=SES.p, bytes=TE.encode(JSON.stringify(S));
  persistQ=persistQ.then(async()=>{ p.data=await seal(dk,bytes); p.updated=new Date().toISOString(); if(!await IDB.set('profiles',PROFILES)) toast(L('No se pudo guardar en este dispositivo (¿sin espacio?)','Could not save on this device (out of space?)')); }).catch(e=>console.warn('persist',e));
  return persistQ; }
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ saveTimer=null; persist(); },200); }
function flushSave(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; persist(); } }
const saveProfiles=()=>persistQ=persistQ.then(()=>IDB.set('profiles',PROFILES));
async function createProfile(name,pass){ const raw=rnd(32); await setDK(raw); const rec=makeRecovery();
  const p={id:uid(),name:name.slice(0,40),created:new Date().toISOString(),updated:'',pw:await wrapPw(pass,raw,PW_ITER),rec:await wrapPw(normRec(rec),raw,REC_ITER),pk:[],data:null};
  S=blankData(); p.data=await seal(SES.dk,TE.encode(JSON.stringify(S))); PROFILES.push(p); SES.p=p; await saveProfiles(); return rec; }
async function unlockPassword(p,pass){ const raw=await unseal(await kdfPass(pass,unb64(p.pw.salt),p.pw.it),p.pw.wrap); await setDK(raw); await loadData(p); }
async function unlockRecovery(p,rec,newPass){ const raw=await unseal(await kdfPass(normRec(rec),unb64(p.rec.salt),p.rec.it),p.rec.wrap); await setDK(raw); await loadData(p);
  p.pw=await wrapPw(newPass,raw,PW_ITER); const nr=makeRecovery(); p.rec=await wrapPw(normRec(nr),raw,REC_ITER); await persist(); return nr; }
const passkeysOK=()=>!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext);
const noPrf=()=>Object.assign(new Error(L('Este dispositivo o navegador no admite passkeys con cifrado (PRF). Usa la contraseña.','This device or browser doesn\'t support passkeys with encryption (PRF). Use the password.')),{code:'noprf'});
function deviceName(){ const u=navigator.userAgent; if(/Android/.test(u)) return 'Android'; if(/iPhone|iPad/.test(u)) return 'iPhone/iPad'; if(/Mac/.test(u)) return 'Mac'; if(/Windows/.test(u)) return 'Windows'; return L('Dispositivo','Device'); }
async function addPasskey(){ const p=SES.p, prfSalt=rnd(32);
  const cred=await navigator.credentials.create({publicKey:{rp:{name:'Dividir la cuenta',id:location.hostname},user:{id:rnd(16),name:'Dividir · '+p.name,displayName:p.name},challenge:rnd(32),
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'preferred',userVerification:'required'},timeout:120000,extensions:{prf:{eval:{first:prfSalt}}}}});
  const ext=cred.getClientExtensionResults()||{}; if(!ext.prf||ext.prf.enabled===false) throw noPrf();
  let out=ext.prf.results&&ext.prf.results.first;
  if(!out){ const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,allowCredentials:[{type:'public-key',id:cred.rawId}],userVerification:'required',timeout:120000,extensions:{prf:{eval:{first:prfSalt}}}}});
    const e2=a.getClientExtensionResults()||{}; out=e2.prf&&e2.prf.results&&e2.prf.results.first; }
  if(!out) throw noPrf();
  p.pk.push({id:b64u(cred.rawId),prfSalt:b64(prfSalt),wrap:await seal(await kdfPrf(out),SES.dkRaw),created:today(),name:deviceName()}); await persist(); }
async function unlockPasskey(p){ if(!p.pk.length) throw new Error(L('Este usuario no tiene passkeys','This user has no passkeys'));
  const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,allowCredentials:p.pk.map(k=>({type:'public-key',id:fromU(k.id)})),userVerification:'required',timeout:120000,
    extensions:{prf:{evalByCredential:Object.fromEntries(p.pk.map(k=>[k.id,{first:unb64(k.prfSalt)}]))}}}});
  const k=p.pk.find(x=>x.id===b64u(a.rawId)), e=a.getClientExtensionResults()||{}, out=e.prf&&e.prf.results&&e.prf.results.first;
  if(!k||!out) throw new Error(L('La passkey no devolvió la clave. Usa la contraseña.','The passkey didn\'t return the key. Use the password.'));
  await setDK(await unseal(await kdfPrf(out),k.wrap)); await loadData(p); }
async function checkPassword(pass){ const p=SES.p; try{ await unseal(await kdfPass(pass,unb64(p.pw.salt),p.pw.it),p.pw.wrap); return true; }catch(e){ return false; } }

/* ---------- Bloqueo ---------- */
let lockTimer=null, hiddenAt=0;
function lockNow(to){ flushSave(); clearTimeout(lockTimer); if(typeof splitOnLock==='function') splitOnLock(); const p=SES.p;
  if(SES.dkRaw) SES.dkRaw.fill(0); SES.dk=null; SES.dkRaw=null; SES.p=null; S=null; closeModal(); $('#app').innerHTML=''; document.body.classList.add('locked');
  showGate(to||(p&&PROFILES.includes(p)?'unlock':'pick'),p); }
function bumpLock(){ clearTimeout(lockTimer); if(!S) return; lockTimer=setTimeout(()=>{ if(S) lockNow(); },(S.settings.lockMin||5)*60000); }
['pointerdown','keydown','scroll','touchstart'].forEach(ev=>window.addEventListener(ev,()=>{ if(S) bumpLock(); },{passive:true}));
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ hiddenAt=Date.now(); if(S) flushSave(); } else if(S&&hiddenAt&&Date.now()-hiddenAt>(S.settings.lockMin||5)*60000) lockNow(); });
window.addEventListener('pagehide',()=>{ if(S) flushSave(); });

/* ---------- Entrada: elegir usuario, crear, desbloquear, recuperar ---------- */
const GATE={mode:'pick',arg:null};
const avInit=n=>esc(String(n||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?');
const avHue=n=>{ let h=0; for(const c of String(n)) h=(h*31+c.charCodeAt(0))%360; return h; };
function langSwitch(){ return `<div class="langsw"><button class="sm ${LANG==='es'?'on':''}" data-lang="es">Español</button><button class="sm ${LANG==='en'?'on':''}" data-lang="en">English</button></div>`; }
function showGate(mode,arg){ const g=$('#gate'); if(mode==='pick'&&!PROFILES.length) mode='new'; if(mode==='unlock'&&!PROFILES.includes(arg)) mode='pick'; GATE.mode=mode; GATE.arg=arg;
  g.style.display='flex'; document.body.classList.add('locked');
  const box=html=>{ g.innerHTML=`<div class="gate-card"><div class="gate-logo"><img src="icons/icon-192.png" alt=""><div><b>${L('Dividir la cuenta','Split the bill')}</b><div class="muted">${L('Tickets repartidos entre tarjetas, cifrados en tu dispositivo','Receipts split between cards, encrypted on your device')}</div></div></div>${html}${langSwitch()}</div>`;
    g.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLang(b.dataset.lang)); };
  const msg=t=>{ const m=$('#gMsg'); if(m) m.textContent=t; };
  if(mode==='pick'){
    box(`<h2>${L('¿Quién eres?','Who are you?')}</h2><div class="clist gate-users">${PROFILES.map(p=>`<button class="lrow" data-pid="${esc(p.id)}"><span class="av round" style="--h:${avHue(p.name)}">${avInit(p.name)}</span><span class="lm"><b>${esc(p.name)}</b><span>${p.pk.length?L('Contraseña o passkey','Password or passkey'):L('Contraseña','Password')}</span></span>${ic('right','chev')}</button>`).join('')}</div>
      <button id="gNew" style="width:100%;margin-top:10px">${ic('plus')}${L('Nuevo usuario','New user')}</button>
      <p class="muted" style="margin:12px 2px 0">${L('Cada usuario tiene sus tickets y sus preferencias cifrados en este dispositivo. Solo los nombres se ven sin entrar.','Each user has their own receipts and preferences encrypted on this device. Only the names are visible before signing in.')}</p>`);
    g.querySelectorAll('[data-pid]').forEach(b=>b.onclick=()=>showGate('unlock',PROFILES.find(p=>p.id===b.dataset.pid)));
    $('#gNew').onclick=()=>showGate('new'); return; }
  if(mode==='new'){
    box(`<h2>${PROFILES.length?L('Nuevo usuario','New user'):L('Crea tu usuario','Create your user')}</h2>
      <p class="muted" style="margin-top:0">${L('Tus tickets y tus preferencias se guardan cifrados con tu contraseña. Nadie puede recuperarla por ti: te daré una clave de recuperación.','Your receipts and preferences are stored encrypted with your password. Nobody can recover it for you: I\'ll give you a recovery key.')}</p>
      <label class="f">${L('Tu nombre','Your name')}<input id="gName" maxlength="40" autocomplete="nickname"></label>
      <label class="f">${L(`Contraseña (mínimo ${PW_MIN} caracteres)`,`Password (at least ${PW_MIN} characters)`)}<input id="g1" type="password" autocomplete="new-password"></label>
      <label class="f">${L('Repítela','Repeat it')}<input id="g2" type="password" autocomplete="new-password"></label>
      <button class="pri" id="gGo" style="width:100%">${L('Crear usuario','Create user')}</button><div id="gMsg" class="neg" style="margin-top:8px"></div>
      ${PROFILES.length?`<p><a href="#" id="gBack">${L('Volver','Back')}</a></p>`:''}`);
    if($('#gBack')) $('#gBack').onclick=e=>{ e.preventDefault(); showGate('pick'); };
    $('#gGo').onclick=async()=>{ const n=$('#gName').value.trim(), a=$('#g1').value;
      if(!n) return msg(L('Escribe tu nombre','Type your name')); if(PROFILES.some(p=>p.name.toLowerCase()===n.toLowerCase())) return msg(L('Ya hay un usuario con ese nombre en este dispositivo','There is already a user with that name on this device'));
      if(a.length<PW_MIN) return msg(L(`La contraseña necesita al menos ${PW_MIN} caracteres`,`The password needs at least ${PW_MIN} characters`)); if(a!==$('#g2').value) return msg(L('Las contraseñas no coinciden','The passwords don\'t match'));
      $('#gGo').disabled=true; msg(L('Creando…','Creating…')); try{ showGate('rec',{rec:await createProfile(n,a),first:true}); }catch(e){ $('#gGo').disabled=false; msg(String(e.message||e)); } };
    return; }
  if(mode==='rec'){
    box(`<h2>${L('Tu clave de recuperación','Your recovery key')}</h2><p>${L('Si olvidas la contraseña, es la única forma de entrar. Apúntala en papel o guárdala en tu gestor de contraseñas. No se volverá a mostrar.','If you forget the password, it is the only way in. Write it on paper or keep it in your password manager. It won\'t be shown again.')}</p>
      <div class="reccode" id="gRec">${esc(arg.rec)}</div>
      <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="gOk" style="width:auto"> ${L('La he guardado','I have saved it')}</label>
      <button class="pri" id="gNext" style="width:100%" disabled>${L('Continuar','Continue')}</button>`);
    $('#gOk').onchange=e=>{ $('#gNext').disabled=!e.target.checked; }; $('#gNext').onclick=()=>enterApp(arg.first); return; }
  if(mode==='unlock'){ const p=arg;
    box(`<h2>${L(`Hola, ${esc(p.name)}`,`Hi, ${esc(p.name)}`)}</h2>
      ${p.pk.length&&passkeysOK()?`<button class="pri" id="gPk" style="width:100%">${ic('key')}${L('Entrar con passkey','Sign in with a passkey')}</button><p class="muted" style="text-align:center;margin:10px 0">${L('o con tu contraseña','or with your password')}</p>`:''}
      <label class="f">${L('Contraseña','Password')}<input id="gP" type="password" autocomplete="current-password"></label>
      <button class="${p.pk.length?'':'pri'}" id="gGo" style="width:100%">${L('Entrar','Sign in')}</button><div id="gMsg" class="neg" style="margin-top:8px"></div>
      <p style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><a href="#" id="gForgot">${L('¿Has olvidado la contraseña?','Forgot your password?')}</a><a href="#" id="gSwitch">${L('Otro usuario','Another user')}</a></p>`);
    const go=async()=>{ $('#gGo').disabled=true; msg(L('Abriendo…','Opening…')); try{ await unlockPassword(p,$('#gP').value); enterApp(); }catch(e){ $('#gGo').disabled=false; msg(L('Contraseña incorrecta','Wrong password')); } };
    $('#gGo').onclick=go; $('#gP').onkeydown=e=>{ if(e.key==='Enter') go(); };
    if($('#gPk')) $('#gPk').onclick=async()=>{ try{ await unlockPasskey(p); enterApp(); }catch(e){ msg(String(e&&e.message||e)); } };
    $('#gForgot').onclick=e=>{ e.preventDefault(); showGate('recover',p); }; $('#gSwitch').onclick=e=>{ e.preventDefault(); showGate('pick'); }; return; }
  if(mode==='recover'){ const p=arg;
    box(`<h2>${L('Recuperar el acceso','Recover access')}</h2><p class="muted" style="margin-top:0">${esc(p.name)}</p>
      <label class="f">${L('Clave de recuperación','Recovery key')}<input id="gR" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
      <label class="f">${L(`Contraseña nueva (mínimo ${PW_MIN} caracteres)`,`New password (at least ${PW_MIN} characters)`)}<input id="g1" type="password" autocomplete="new-password"></label>
      <label class="f">${L('Repítela','Repeat it')}<input id="g2" type="password" autocomplete="new-password"></label>
      <button class="pri" id="gGo" style="width:100%">${L('Recuperar','Recover')}</button><div id="gMsg" class="neg" style="margin-top:8px"></div><p><a href="#" id="gBack">${L('Volver','Back')}</a></p>`);
    $('#gBack').onclick=e=>{ e.preventDefault(); showGate('unlock',p); };
    $('#gGo').onclick=async()=>{ const a=$('#g1').value; if(a.length<PW_MIN) return msg(L(`La contraseña necesita al menos ${PW_MIN} caracteres`,`The password needs at least ${PW_MIN} characters`)); if(a!==$('#g2').value) return msg(L('Las contraseñas no coinciden','The passwords don\'t match'));
      $('#gGo').disabled=true; try{ showGate('rec',{rec:await unlockRecovery(p,$('#gR').value,a)}); }catch(e){ $('#gGo').disabled=false; msg(L('Clave de recuperación incorrecta','Wrong recovery key')); } }; }
}
function enterApp(first){ const g=$('#gate'); g.style.display='none'; g.innerHTML=''; document.body.classList.remove('locked'); bumpLock(); applyStatic(); route();
  if(first&&passkeysOK()) setTimeout(()=>{ openModal(`<h2>${L('¿Entrar con huella o cara?','Sign in with fingerprint or face?')}</h2><p>${L('Crea una passkey para entrar sin escribir la contraseña en este dispositivo. La contraseña sigue sirviendo.','Create a passkey to sign in without typing the password on this device. The password still works.')}</p>
    <div class="row" style="margin-top:12px"><button id="mc">${L('Ahora no','Not now')}</button><button class="pri" id="pkGo">${L('Crear passkey','Create passkey')}</button></div>`);
    $('#mc').onclick=closeModal; $('#pkGo').onclick=async()=>{ try{ await addPasskey(); closeModal(); toast(L('Passkey creada','Passkey created')); }catch(e){ toast(String(e&&e.message||e)); } }; },150); }

/* ---------- Pantallas ---------- */
const spHostActive=()=>!!S&&location.hash!=='#perfil';   // split.js: cuándo se ve su pantalla
function applyStatic(){ document.documentElement.lang=LANG; document.title=L('Dividir la cuenta','Split the bill');
  const t=$('#pageTitle'); if(t) t.textContent=location.hash==='#perfil'?L('Perfil y seguridad','Profile & security'):L('Dividir la cuenta','Split the bill');
  const u=$('#uBtn'); if(u){ u.innerHTML=S&&SES.p?`<span class="av round sm" style="--h:${avHue(SES.p.name)}">${avInit(SES.p.name)}</span><span class="hide-sm">${esc(SES.p.name)}</span>`:''; u.setAttribute('aria-label',L('Perfil y seguridad','Profile & security')); u.title=L('Perfil y seguridad','Profile & security'); }
  const lb=$('#lockBtn'); if(lb){ lb.innerHTML=ic('lock')+`<span class="hide-sm">${L('Salir','Sign out')}</span>`; lb.title=L('Salir (bloquear)','Sign out (lock)'); lb.setAttribute('aria-label',L('Salir (bloquear)','Sign out (lock)')); }
  const bk=$('#backBtn'); if(bk){ bk.innerHTML=ic('left'); bk.style.display=location.hash==='#perfil'?'':'none'; bk.setAttribute('aria-label',L('Volver','Back')); }
  $('#updTxt').textContent=L('Hay una versión nueva.','A new version is available.'); $('#updGo').textContent=L('Actualizar','Update'); }
function route(){ if(!S) return; applyStatic(); const v=location.hash==='#perfil'?'perfil':'dividir';
  try{ VIEWS[v]($('#app')); }catch(e){ console.warn('vista',v,e); $('#app').innerHTML=`<div class="alert crit"><span class="ic">!</span><div><b>${L('Algo ha fallado al mostrar esta pantalla.','Something went wrong showing this screen.')}</b> ${L('Tus datos no se han tocado. Recarga la app.','Your data hasn\'t been touched. Reload the app.')}<div class="muted">${esc(String(e&&e.message||e))}</div></div></div>`; }
  window.scrollTo(0,0); }
window.addEventListener('hashchange',route);
VIEWS.perfil=(el)=>{ const p=SES.p;
  el.innerHTML=`<div class="stack">
    <div class="card" id="pfUser">${helpBtn('div_user')}<h2>${L('Tu usuario','Your user')}</h2>
      <div class="row" style="align-items:flex-end"><label class="f">${L('Nombre','Name')}<input id="pfName" maxlength="40" value="${esc(p.name)}"></label><button id="pfNameGo" style="margin-bottom:10px">${L('Guardar','Save')}</button></div>
      <label class="f">${L('Idioma','Language')}<select id="pfLang"><option value="es" ${LANG==='es'?'selected':''}>Español</option><option value="en" ${LANG==='en'?'selected':''}>English</option></select></label>
      <label class="f">${L('Salir automáticamente tras (minutos sin usarla)','Sign out automatically after (idle minutes)')}<select id="pfLock">${[1,2,5,10,15,30].map(m=>`<option ${m===S.settings.lockMin?'selected':''}>${m}</option>`).join('')}</select></label></div>
    <div class="card" id="pfSec">${helpBtn('div_security')}<h2>${L('Seguridad','Security')}</h2>
      <h3 class="sec">${L('Passkeys (huella, cara o PIN)','Passkeys (fingerprint, face or PIN)')}</h3>
      ${p.pk.length?`<div class="clist">${p.pk.map((k,i)=>`<div class="srow"><span class="av" style="--h:152">${ic('key')}</span><span class="lm"><b>${esc(k.name||'Passkey')}</b><span>${L('Creada el','Created on')} ${esc(dLabel(k.created))}</span></span><button class="sm ghost" data-pkx="${i}" aria-label="${L('Quitar passkey','Remove passkey')}">${ic('trash')}</button></div>`).join('')}</div>`:`<p class="muted" style="margin:0 2px 8px">${L('Ninguna todavía.','None yet.')}</p>`}
      ${passkeysOK()?`<button id="pfPk" style="margin-top:8px">${ic('plus')}${L('Añadir passkey en este dispositivo','Add a passkey on this device')}</button>`:''}
      <h3 class="sec">${L('Contraseña y recuperación','Password and recovery')}</h3>
      <div class="row"><button id="pfPw">${L('Cambiar la contraseña','Change the password')}</button><button id="pfRec">${L('Nueva clave de recuperación','New recovery key')}</button></div></div>
    <div class="card" id="pfDel">${helpBtn('div_delete')}<h2>${L('Borrar este usuario','Delete this user')}</h2>
      <p class="muted">${L('Borra de este dispositivo el usuario, sus tickets, sus preferencias y sus passkeys. No se puede deshacer.','Deletes the user, their receipts, preferences and passkeys from this device. It cannot be undone.')}</p>
      <button class="dan" id="pfDelGo">${ic('trash')}${L('Borrar usuario','Delete user')}</button></div>
    <p class="muted" style="text-align:center">${L('Dividir la cuenta forma parte de','Split the bill is part of')} <a href="../" target="_blank" rel="noopener">MyFinZen</a>. ${L('Sin servidor: tus datos no salen de este dispositivo.','No server: your data never leaves this device.')}</p></div>`;
  $('#pfNameGo').onclick=async()=>{ const n=$('#pfName').value.trim().slice(0,40); if(!n) return; if(PROFILES.some(x=>x!==p&&x.name.toLowerCase()===n.toLowerCase())) return toast(L('Ya hay un usuario con ese nombre','There is already a user with that name')); p.name=n; await persist(); applyStatic(); toast(L('Guardado','Saved')); };
  $('#pfLang').onchange=e=>setLang(e.target.value);
  $('#pfLock').onchange=e=>{ S.settings.lockMin=+e.target.value; save(); bumpLock(); toast(L('Guardado','Saved')); };
  el.querySelectorAll('[data-pkx]').forEach(b=>b.onclick=async()=>{ if(!await confirmModal(L('Quitar passkey','Remove passkey'),`<p>${L('Ya no podrás entrar con ella. La contraseña sigue sirviendo.','You won\'t be able to sign in with it. The password still works.')}</p>`)) return; p.pk.splice(+b.dataset.pkx,1); await persist(); route(); });
  if($('#pfPk')) $('#pfPk').onclick=async()=>{ try{ await addPasskey(); toast(L('Passkey creada','Passkey created')); route(); }catch(e){ toast(String(e&&e.message||e)); } };
  $('#pfPw').onclick=()=>{ openModal(`<h2>${L('Cambiar la contraseña','Change the password')}</h2>
      <label class="f">${L('Contraseña actual','Current password')}<input id="cp0" type="password" autocomplete="current-password"></label>
      <label class="f">${L(`Nueva (mínimo ${PW_MIN} caracteres)`,`New (at least ${PW_MIN} characters)`)}<input id="cp1" type="password" autocomplete="new-password"></label>
      <label class="f">${L('Repítela','Repeat it')}<input id="cp2" type="password" autocomplete="new-password"></label><div id="cpMsg" class="neg"></div>
      <div class="row" style="margin-top:12px"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="cpGo">${L('Cambiar','Change')}</button></div>`);
    $('#mc').onclick=closeModal;
    $('#cpGo').onclick=async()=>{ const m=t=>{ $('#cpMsg').textContent=t; }, a=$('#cp1').value;
      if(a.length<PW_MIN) return m(L(`Necesita al menos ${PW_MIN} caracteres`,`It needs at least ${PW_MIN} characters`)); if(a!==$('#cp2').value) return m(L('Las contraseñas no coinciden','The passwords don\'t match'));
      if(!await checkPassword($('#cp0').value)) return m(L('La contraseña actual no es correcta','The current password is wrong'));
      p.pw=await wrapPw(a,SES.dkRaw,PW_ITER); await persist(); closeModal(); toast(L('Contraseña cambiada','Password changed')); }; };
  $('#pfRec').onclick=()=>{ openModal(`<h2>${L('Nueva clave de recuperación','New recovery key')}</h2><p>${L('La clave anterior dejará de servir.','The previous key will stop working.')}</p>
      <label class="f">${L('Contraseña','Password')}<input id="rk0" type="password" autocomplete="current-password"></label><div id="rkMsg" class="neg"></div>
      <div class="row" style="margin-top:12px"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="rkGo">${L('Crear','Create')}</button></div>`);
    $('#mc').onclick=closeModal;
    $('#rkGo').onclick=async()=>{ if(!await checkPassword($('#rk0').value)) return $('#rkMsg').textContent=L('Contraseña incorrecta','Wrong password');
      const nr=makeRecovery(); p.rec=await wrapPw(normRec(nr),SES.dkRaw,REC_ITER); await persist();
      openModal(`<h2>${L('Tu nueva clave de recuperación','Your new recovery key')}</h2><p>${L('Apúntala: no se volverá a mostrar.','Write it down: it won\'t be shown again.')}</p><div class="reccode" id="rkCode">${esc(nr)}</div><div class="row" style="margin-top:12px"><button class="pri" id="mc">${L('La he guardado','I have saved it')}</button></div>`); $('#mc').onclick=closeModal; }; };
  $('#pfDelGo').onclick=()=>{ openModal(`<h2>${L('Borrar este usuario','Delete this user')}</h2><p>${L(`Se borran <b>${esc(p.name)}</b>, sus ${S.splits.length} tickets y sus preferencias de este dispositivo. No se puede deshacer.`,`<b>${esc(p.name)}</b>, their ${S.splits.length} receipts and preferences are deleted from this device. It cannot be undone.`)}</p>
      <label class="f">${L('Escribe tu contraseña para confirmar','Type your password to confirm')}<input id="dl0" type="password" autocomplete="current-password"></label><div id="dlMsg" class="neg"></div>
      <div class="row" style="margin-top:12px"><button id="mc">${L('Cancelar','Cancel')}</button><button class="dan" id="dlGo">${L('Borrar','Delete')}</button></div>`);
    $('#mc').onclick=closeModal;
    $('#dlGo').onclick=async()=>{ if(!await checkPassword($('#dl0').value)) return $('#dlMsg').textContent=L('Contraseña incorrecta','Wrong password');
      clearTimeout(saveTimer); saveTimer=null; PROFILES=PROFILES.filter(x=>x!==p); await saveProfiles(); location.hash=''; lockNow('pick'); toast(L('Usuario borrado','User deleted')); }; };
};

/* ---------- Arranque ---------- */
(async function(){
  if(!await IDB.open()){ document.body.innerHTML=`<div style="padding:24px;font-family:sans-serif"><h2>${L('Este navegador no permite guardar datos','This browser doesn\'t allow saving data')}</h2><p>${L('Ábrelo en Chrome, Safari, Edge o Firefox sin modo incógnito.','Open it in Chrome, Safari, Edge or Firefox outside private mode.')}</p></div>`; return; }
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  PROFILES=sanitizeProfiles(await IDB.get('profiles'));
  if(document.readyState==='loading') await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));   // split.js y ticket.js ya cargados
  $('#lockBtn').onclick=()=>{ if(S) lockNow('pick'); };
  $('#uBtn').onclick=()=>{ if(S) location.hash='#perfil'; };
  $('#backBtn').onclick=()=>{ location.hash=''; };
  applyStatic(); showGate(PROFILES.length===1?'unlock':'pick',PROFILES[0]);
  // El aviso de versión nueva solo tiene sentido si esta página ya la sirve el service worker de esta app (no el de MyFinZen)
  const own=w=>!!w&&/\/dividir\/sw\.js$/.test(w.scriptURL);
  if('serviceWorker' in navigator){ try{ const hadOwn=own(navigator.serviceWorker.controller); const reg=await navigator.serviceWorker.register('sw.js');
    const ready=w=>{ $('#updBar').style.display='flex'; $('#updGo').onclick=()=>{ persist().finally(()=>w.postMessage('skipWaiting')); }; };
    if(reg.waiting&&hadOwn) ready(reg.waiting);
    reg.addEventListener('updatefound',()=>{ const w=reg.installing; w&&w.addEventListener('statechange',()=>{ if(w.state==='installed'&&own(navigator.serviceWorker.controller)) ready(w); }); });
    // Solo se recarga al pasar de una versión de esta app a otra (no la primera vez, mientras escribes tu usuario)
    let reloaded=false; navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(reloaded||!hadOwn) return; reloaded=true; if(S) flushSave(); location.reload(); });
    setInterval(()=>reg.update().catch(()=>{}),60*60*1000); }catch(e){} }
})();
