/* MyFinZen — sincronización entre tus dispositivos.
   El archivo de sincronización es la misma bóveda cifrada que vive en IndexedDB (clave DK envuelta por la contraseña,
   la clave de recuperación y las passkeys + los datos cifrados con DK). La nube solo ve datos cifrados.
   - S.secret (clave de API y tokens de la nube) nunca se sincroniza: es de cada dispositivo.
   - Fusión a tres bandas por registro (merge3) con la última versión sincronizada (VAULT.meta.sync.base, cifrada con
     DK y guardada dentro de la bóveda local; no se sube).
   - S.sv = {rev, dev, at}: contador de versiones dentro de los datos cifrados; un archivo más antiguo que lo ya
     sincronizado no deshace cambios (protege de copias viejas o de una vuelta atrás en la nube).
   Formas de sincronizar: Dropbox (OAuth PKCE en el navegador, token de refresco en S.secret.sync), un archivo en una
   carpeta sincronizada (File System Access en el ordenador: OneDrive, Google Drive, iCloud Drive, Dropbox…) o a mano
   (compartir el archivo a la nube y abrirlo desde ella en el móvil). */
'use strict';
// App key pública de la app de Dropbox del autor (no es un secreto: con PKCE no hay client secret). Vacía = sin Dropbox.
const CLOUD={dropbox:{key:'t2bzyd4rocxeybb'}};
const SYNC_FILE='MyFinZen.mfz', SYNC_SHARE='MyFinZen-sync.txt', DBX_PATH='/MyFinZen/'+SYNC_FILE, SYNC_MAX=60e6;
const SYNC={busy:false,last:null,err:null,timer:null,iv:null,at:null,fh:null,pending:null,joinNote:false,needPerm:false};
const hasFSA=()=>typeof window.showSaveFilePicker==='function'&&typeof window.showOpenFilePicker==='function';

/* ---------- Fusión a tres bandas ---------- */
function stable(v){ return JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,kk)=>(o[kk]=x[kk],o),{}):x); }
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function arrKey(list){ if(!list.length) return null;
  if(list.every(x=>isObj(x)&&typeof x.id==='string')) return x=>'i:'+x.id;
  if(list.every(x=>isObj(x)&&!('id' in x)&&typeof x.acc==='string'&&typeof x.date==='string')) return x=>'a:'+x.acc+'|'+x.date;  // holdingsHist
  if(list.every(x=>isObj(x)&&typeof x.pattern==='string')) return x=>'p:'+x.pattern+'→'+x.cat;                              // reglas
  if(list.every(x=>isObj(x)&&typeof x.name==='string'&&typeof x.type==='string')) return x=>'c:'+x.name;                    // categorías propias
  if(list.every(x=>!isObj(x)&&!Array.isArray(x))) return x=>typeof x+':'+String(x);                                           // listas simples
  return null; }
// b = última versión común, l = este dispositivo, r = la nube. pref decide los conflictos ('l' o 'r').
// Un registro borrado en un lado y cambiado en el otro se conserva (mejor que perder un cambio).
function merge3(b,l,r,pref){
  const sl=stable(l), sr=stable(r); if(sl===sr) return l; const sb=stable(b);
  if(sl===sb) return r; if(sr===sb) return l;
  if(l===undefined) return r; if(r===undefined) return l;
  if(isObj(l)&&isObj(r)){ const bo=isObj(b)?b:{}, out={}; for(const k of new Set([...Object.keys(l),...Object.keys(r)])){ const v=merge3(bo[k],l[k],r[k],pref); if(v!==undefined) out[k]=v; } return out; }
  if(Array.isArray(l)&&Array.isArray(r)){ const ba=Array.isArray(b)?b:[]; const kf=arrKey(l.concat(r,ba));
    if(kf){ const B=new Map(ba.map(x=>[kf(x),x])), Lm=new Map(l.map(x=>[kf(x),x])), Rm=new Map(r.map(x=>[kf(x),x])), out=[];
      for(const k of [...Lm.keys(),...[...Rm.keys()].filter(k=>!Lm.has(k))]){ const v=merge3(B.get(k),Lm.get(k),Rm.get(k),pref); if(v!==undefined) out.push(v); }
      return out; } }
  return pref==='r'?r:l; }

/* ---------- Archivo de sincronización ---------- */
const syncState=st=>{ const c=Object.assign({},st); delete c.secret; return c; };
const noSv=st=>{ const c=Object.assign({},st); delete c.sv; delete c.secret; return c; };
const devId=()=>{ const s=S&&S.secret; if(s&&s.sync&&s.sync.dev) return s.sync.dev; return SYNC.dev||(SYNC.dev=b64u(rnd(9))); };
async function buildSyncFile(state){ const m=VAULT.meta;
  return JSON.stringify({app:'myfinzen-sync',v:1,updated:new Date().toISOString(),meta:{v:m.v,created:m.created,kt:m.kt||null,skid:m.skid||null,pw:m.pw,rec:m.rec,pk:m.pk||[],pkDel:m.pkDel||[],data:await seal(VAULT.dk,TE.encode(JSON.stringify(state)))}}); }
const B64=/^[A-Za-z0-9+/=]+$/, B64U=/^[A-Za-z0-9_-]+$/;
function syncErr(code,msg){ return Object.assign(new Error(msg||code),{code}); }
// Todo lo que llega de la nube se valida antes de usarlo
function parseSyncFile(text){
  if(typeof text!=='string'||text.length>SYNC_MAX) throw syncErr('badfile',L('El archivo no es de MyFinZen','The file is not from MyFinZen'));
  let j; try{ j=JSON.parse(text); }catch(e){ throw syncErr('badfile',L('El archivo no es de MyFinZen','The file is not from MyFinZen')); }
  const bad=()=>syncErr('badfile',L('El archivo de sincronización está dañado o no es de MyFinZen','The sync file is damaged or not from MyFinZen'));
  if(!isObj(j)||j.app!=='myfinzen-sync'||j.v!==1||!isObj(j.meta)) throw bad();
  const sealed=o=>isObj(o)&&typeof o.iv==='string'&&B64.test(o.iv)&&o.iv.length<=32&&typeof o.ct==='string'&&B64.test(o.ct)?{iv:o.iv,ct:o.ct}:null;
  const kw=o=>{ if(!isObj(o)) return null; const it=Number(o.it), w=sealed(o.wrap); return typeof o.salt==='string'&&B64.test(o.salt)&&o.salt.length<=64&&Number.isInteger(it)&&it>=100000&&it<=5000000&&w?Object.assign({salt:o.salt,it,wrap:w},o.sk===1?{sk:1}:{}):null; };
  const m=j.meta, pw=kw(m.pw), rec=kw(m.rec), data=sealed(m.data); if(!pw||!rec||!data) throw bad();
  const pk=(Array.isArray(m.pk)?m.pk:[]).map(p=>isObj(p)&&typeof p.id==='string'&&B64U.test(p.id)&&p.id.length<=400&&typeof p.prfSalt==='string'&&B64.test(p.prfSalt)&&sealed(p.wrap)?{id:p.id,prfSalt:p.prfSalt,wrap:sealed(p.wrap),created:isoDate(p.created)||today(),name:String(p.name||'').slice(0,60)}:null).filter(Boolean).slice(0,20);
  const pkDel=(Array.isArray(m.pkDel)?m.pkDel:[]).filter(x=>typeof x==='string'&&B64U.test(x)&&x.length<=400).slice(-50);
  const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(s)?s:null;
  return {updated:iso(j.updated),meta:{v:1,created:typeof m.created==='string'?m.created.slice(0,40):new Date().toISOString(),kt:iso(m.kt),skid:typeof m.skid==='string'&&B64U.test(m.skid)&&m.skid.length<=24?m.skid:null,pw,rec,pk:pk.filter(p=>!pkDel.includes(p.id)),pkDel,data}}; }
async function openSyncState(rf){ let raw; try{ raw=await unseal(VAULT.dk,rf.meta.data); }catch(e){ throw syncErr('othervault',L('Los datos de la nube son de otra bóveda (otra contraseña)','The cloud data belongs to another vault (another password)')); }
  const st=sanitizeState(JSON.parse(TD.decode(raw))); raw.fill(0); delete st.secret; return st; }
// Passkeys: se suman las de todos los dispositivos; contraseña y clave de recuperación: las más recientes (meta.kt)
// (las quitadas en cualquier dispositivo quedan en pkDel y no vuelven)
function metaNeedsUp(rf){ const m=VAULT.meta, ids=new Set(rf.meta.pk.map(p=>p.id)), del=new Set(rf.meta.pkDel);
  return (m.pk||[]).some(p=>!ids.has(p.id))||(m.pkDel||[]).some(x=>!del.has(x))||(m.kt||'')>(rf.meta.kt||''); }
function mergeMeta(rf){ const m=VAULT.meta; m.pkDel=[...new Set([...(m.pkDel||[]),...rf.meta.pkDel])].slice(-50); const del=new Set(m.pkDel);
  const ids=new Set((m.pk||[]).map(p=>p.id)); m.pk=(m.pk||[]).concat(rf.meta.pk.filter(p=>!ids.has(p.id))).filter(p=>!del.has(p.id));
  if((rf.meta.kt||'')>(m.kt||'')){ m.pw=rf.meta.pw; m.rec=rf.meta.rec; m.kt=rf.meta.kt; if(rf.meta.skid) m.skid=rf.meta.skid; else delete m.skid; skMissing().then(x=>{ SK_MISS=x; }); } }
async function getBase(){ const b=VAULT.meta.sync&&VAULT.meta.sync.base; if(!b) return undefined; try{ const raw=await unseal(VAULT.dk,b); const s=JSON.parse(TD.decode(raw)); raw.fill(0); return s; }catch(e){ return undefined; } }
async function setBase(st){ VAULT.meta.sync=Object.assign({},VAULT.meta.sync,{base:await seal(VAULT.dk,TE.encode(JSON.stringify(syncState(st)))),at:new Date().toISOString()}); }
// Fusiona lo que hay en la nube con este dispositivo. Devuelve el estado resultante y si la nube necesita la versión nueva.
async function mergeRemote(rf){
  const rs=await openSyncState(rf); const metaUp=metaNeedsUp(rf); mergeMeta(rf);
  const local=syncState(S), base=await getBase(), rr=(rs.sv&&rs.sv.rev)||0, br=(base&&base.sv&&base.sv.rev)||0;
  let next=local, stale=false;
  if(rr<br) stale=true;   // la nube tiene una versión más vieja que la ya sincronizada: no deshace nada
  else if(!base||stable(rs.sv||null)!==stable(base.sv||null)) next=merge3(base,local,rs,(rf.updated||'')>(VAULT.meta.updated||'')?'r':'l'); // otra versión (aunque tenga el mismo número, de otro dispositivo)
  return {next,rs,stale,needUp:stable(noSv(next))!==stable(noSv(rs))||stale||metaUp,changedHere:stable(noSv(next))!==stable(noSv(local))}; }
function applyState(next){ const keep=S.secret; S=sanitizeState(Object.assign({},next,{secret:keep})); migrateCats(); migrateUncat(); REC=null; }
function bumpSv(next,rs){ const sv={rev:Math.max((S.sv&&S.sv.rev)||0,(next&&next.sv&&next.sv.rev)||0,(rs&&rs.sv&&rs.sv.rev)||0)+1,dev:devId(),at:new Date().toISOString()}; next.sv=sv; S.sv=sv; return next; }

/* ---------- Proveedores ---------- */
// Detalle del error que devuelve Dropbox (JSON con error_description/error_summary o texto), sin datos personales
async function dbxDetail(r){ let t=''; try{ t=await r.text(); }catch(e){} let d=t; try{ const j=JSON.parse(t); d=j.error_description||j.error_summary||(typeof j.error==='string'?j.error:j.error&&j.error['.tag'])||t; }catch(e){}
  return 'Dropbox HTTP '+r.status+(d?': '+String(d).replace(/\s+/g,' ').slice(0,160):''); }
const redirectURI=()=>location.origin+location.pathname.replace(/index\.html$/,'');
async function dbxToken(force){ const sec=(S&&S.secret&&S.secret.sync)||SYNC.pending||{}; if(!sec.rt) throw syncErr('noauth',L('Vuelve a conectar Dropbox','Reconnect Dropbox'));
  if(!force&&SYNC.at&&SYNC.at.exp>Date.now()+60000) return SYNC.at.tok;
  const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:sec.rt,client_id:CLOUD.dropbox.key})});
  if(!r.ok) throw syncErr(r.status===400||r.status===401?'noauth':'net',L('Dropbox no ha aceptado la conexión: vuelve a conectarlo','Dropbox didn\'t accept the connection: reconnect it')+' ('+await dbxDetail(r)+')');
  const j=await r.json(); if(typeof j.access_token!=='string') throw syncErr('net','Dropbox'); SYNC.at={tok:j.access_token,exp:Date.now()+Math.max(60,Number(j.expires_in)||3600)*1000}; return j.access_token; }
async function dbxFetch(url,opt){ for(let i=0;i<2;i++){ const tok=await dbxToken(i>0); let r;
    try{ r=await fetch(url,Object.assign({method:'POST'},opt,{headers:Object.assign({Authorization:'Bearer '+tok},opt.headers)})); }catch(e){ throw syncErr('net',L('Sin conexión con Dropbox','No connection to Dropbox')); }
    if(r.status!==401) return r; SYNC.at=null; }
  throw syncErr('noauth',L('Vuelve a conectar Dropbox','Reconnect Dropbox')); }
const PROVIDERS={
  dropbox:{ name:'Dropbox', auto:true,
    async read(){ const r=await dbxFetch('https://content.dropboxapi.com/2/files/download',{headers:{'Dropbox-API-Arg':JSON.stringify({path:DBX_PATH})}});
      if(r.status===409){ const t=await r.text(); if(/not_found/.test(t)) return null; throw syncErr('net','Dropbox: '+t.slice(0,160)); }
      if(!r.ok) throw syncErr('net',await dbxDetail(r));
      let rev=null; try{ rev=JSON.parse(r.headers.get('Dropbox-API-Result')||'{}').rev||null; }catch(e){}
      const text=await r.text(); return {text,rev}; },
    async write(text,rev,force){ const arg={path:DBX_PATH,mode:force?{'.tag':'overwrite'}:rev?{'.tag':'update',update:rev}:{'.tag':'add'},autorename:false,mute:true,strict_conflict:true};
      const r=await dbxFetch('https://content.dropboxapi.com/2/files/upload',{headers:{'Dropbox-API-Arg':JSON.stringify(arg),'Content-Type':'application/octet-stream'},body:text});
      if(r.status===409) throw syncErr('conflict','conflict'); if(!r.ok) throw syncErr('net',await dbxDetail(r)); return (await r.json()).rev; } },
  file:{ get name(){ return L('Archivo en tu nube','File in your cloud'); }, auto:true,
    async handle(){ if(!SYNC.fh) SYNC.fh=await IDB.get('syncHandle'); if(!SYNC.fh) throw syncErr('noauth',L('Vuelve a elegir el archivo','Choose the file again')); return SYNC.fh; },
    async perm(ask){ const h=await this.handle(); let s=await h.queryPermission({mode:'readwrite'}); if(s!=='granted'&&ask){ try{ s=await h.requestPermission({mode:'readwrite'}); }catch(e){} }
      SYNC.needPerm=s!=='granted'; if(SYNC.needPerm) throw syncErr('perm',L('Toca la nube de arriba para permitir el acceso al archivo','Tap the cloud at the top to allow access to the file')); return h; },
    async read(){ const h=await this.perm(false); const f=await h.getFile(); if(!f.size) return null; return {text:await f.text(),rev:f.lastModified+':'+f.size}; },
    async write(text,rev,force){ const h=await this.perm(false); const f=await h.getFile(); if(!force&&rev&&f.size&&(f.lastModified+':'+f.size)!==rev) throw syncErr('conflict','conflict');
      const w=await h.createWritable(); await w.write(text); await w.close(); return null; } },
  manual:{ get name(){ return L('A mano','By hand'); }, auto:false }
};
const syncConf=()=>S&&S.secret&&S.secret.sync;
const syncProv=()=>{ const c=syncConf(); return c&&PROVIDERS[c.p]; };

/* ---------- Sincronizar ---------- */
async function syncNow(opt={}){ const p=syncProv(); if(!S||!p||!p.auto||SYNC.busy) return false;
  SYNC.busy=true; SYNC.err=null; syncUI();
  try{ if(p===PROVIDERS.file) await p.perm(!!opt.ask);
    for(let i=0;i<4;i++){ const before=stable(S), remote=await p.read(); let next=syncState(S), rs=null, need=true;
      if(remote){ const rf=parseSyncFile(remote.text); const m=await mergeRemote(rf); next=m.next; rs=m.rs; need=m.needUp; }
      if(stable(S)!==before) continue;            // has cambiado algo mientras tanto: otra vuelta
      if(!need){ if(stable(noSv(next))!==stable(noSv(syncState(S)))) applyState(next); await setBase(next); break; }
      bumpSv(next,rs); applyState(next);
      try{ await p.write(await buildSyncFile(syncState(S)),remote&&remote.rev); }catch(e){ if(e.code==='conflict') continue; throw e; }
      await setBase(S); break; }
    S.secret.sync.last=new Date().toISOString(); SYNC.last=Date.now(); await persist(); if(!opt.quiet) syncRefreshView(); return true;
  }catch(e){ SYNC.err=e; if(e.code==='othervault') otherVaultModal(); else if(opt.ask&&e.code!=='perm') toast(e.message); return false; }
  finally{ SYNC.busy=false; syncUI(); } }
// Tras guardar: sincroniza a los pocos segundos (sin bloquear lo que estés haciendo)
function syncSoon(){ const p=syncProv(); if(!p||!p.auto) return; clearTimeout(SYNC.timer); SYNC.timer=setTimeout(()=>syncNow({quiet:true}),8000); }
function syncRefreshView(){ const h=location.hash.slice(1); if(['resumen','flujo','cuentas','ajustes'].includes(h)&&!document.querySelector('#modalBg.show')&&!(document.activeElement&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) route(); }
function otherVaultModal(){ const p=syncProv(); openModal(`<h2>${L('En tu nube hay otros datos','Your cloud has other data')}</h2><p>${L(`El archivo de ${esc(p.name)} es de otra bóveda de MyFinZen (creada con otra contraseña). No se mezclan.`,`The ${esc(p.name)} file belongs to another MyFinZen vault (created with another password). They aren't mixed.`)}</p>
   <div class="choice"><button class="btn chl" id="ovCloud">${chIcon('down')}<span><b>${L('Usar los datos de la nube en este dispositivo','Use the cloud data on this device')}</b><span class="muted">${L('Se sustituyen los de este dispositivo. Desbloquearás con la contraseña de la otra bóveda.','This device\'s data is replaced. You\'ll unlock with the other vault\'s password.')}</span></span></button>
   <button class="btn chl" id="ovHere">${chIcon('upload',30)}<span><b>${L('Sustituir la nube por este dispositivo','Replace the cloud with this device')}</b><span class="muted">${L('El archivo de la nube se sobrescribe con tus datos de aquí.','The cloud file is overwritten with your data from here.')}</span></span></button></div>
   <div class="row" style="margin-top:12px"><button id="mc">${L('Cancelar y desconectar','Cancel and disconnect')}</button></div>`);
  $('#mc').onclick=()=>{ syncDisconnect(); closeModal(); route(); };
  $('#ovHere').onclick=async()=>{ if(!await confirmModal(L('¿Sobrescribir la nube?','Overwrite the cloud?'),`<p>${L('Los datos que había en la nube se perderán salvo que tengas una copia.','The data in the cloud will be lost unless you have a backup.')}</p>`)) return;
    try{ await p.write(await buildSyncFile(bumpSv(syncState(S))),null,true); await setBase(S); await persist(); closeModal(); toast(L('Nube actualizada con este dispositivo','Cloud updated with this device')); syncUI(); }catch(e){ toast(e.message); } };
  $('#ovCloud').onclick=async()=>{ if(!await confirmModal(L('¿Sustituir este dispositivo?','Replace this device?'),`<p>${L('Los datos de este dispositivo se borrarán y se usarán los de la nube. Haz antes una copia cifrada si quieres conservarlos.','This device\'s data will be deleted and the cloud data will be used. Make an encrypted backup first if you want to keep it.')}</p>`)) return;
    try{ const rem=await p.read(); const rf=parseSyncFile(rem.text); const conf=Object.assign({},S.secret.sync); SYNC.pending=conf; flushSave(); await persistQ;
      VAULT.meta=Object.assign({},rf.meta,{updated:rf.updated||new Date().toISOString()}); await IDB.set('vault',VAULT.meta); SYNC.joinNote=true; lockNow(); }catch(e){ toast(e.message); } }; }

/* ---------- Conectar y desconectar ---------- */
async function dbxConnect(mode){ if(!CLOUD.dropbox.key) return toast(L('Dropbox aún no está configurado en esta app','Dropbox isn\'t set up in this app yet'));
  const ver=b64u(rnd(32)), st=b64u(rnd(16)), ch=b64u(new Uint8Array(await crypto.subtle.digest('SHA-256',TE.encode(ver))));
  // Solo durante la ida y vuelta a Dropbox (minutos) y sin datos personales: el verificador PKCE y el estado anti-CSRF
  try{ sessionStorage.setItem('mfz-oauth',JSON.stringify({p:'dropbox',ver,st,mode,t:Date.now()})); }catch(e){ return toast(L('Este navegador no permite conectar Dropbox','This browser can\'t connect Dropbox')); }
  if(S) await flushSave();
  location.href='https://www.dropbox.com/oauth2/authorize?'+new URLSearchParams({client_id:CLOUD.dropbox.key,response_type:'code',code_challenge:ch,code_challenge_method:'S256',redirect_uri:redirectURI(),token_access_type:'offline',state:st}); }
// Al volver de Dropbox: valida el estado, canjea el código y deja el token solo en memoria hasta desbloquear
async function syncBoot(){ const q=new URLSearchParams(location.search); if(!q.has('code')&&!q.has('error')) return;
  let o=null; try{ o=JSON.parse(sessionStorage.getItem('mfz-oauth')||'null'); sessionStorage.removeItem('mfz-oauth'); }catch(e){}
  const code=q.get('code'), st=q.get('state'); history.replaceState(null,'',location.pathname+(o&&o.mode==='link'?'#ajustes':''));
  if(!o||!code||st!==o.st||Date.now()-o.t>20*60000){ if(o) setTimeout(()=>toast(L('No se pudo conectar Dropbox. Prueba otra vez.','Couldn\'t connect Dropbox. Try again.')),600); return; }
  try{ const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:CLOUD.dropbox.key,code_verifier:o.ver,redirect_uri:redirectURI()})});
    if(!r.ok) throw new Error(await dbxDetail(r)); const j=await r.json(); if(typeof j.refresh_token!=='string') throw new Error(L('Dropbox no ha dado acceso permanente','Dropbox didn\'t grant offline access'));
    SYNC.pending={p:'dropbox',rt:j.refresh_token.slice(0,400),dev:devId()}; SYNC.at=typeof j.access_token==='string'?{tok:j.access_token,exp:Date.now()+(Number(j.expires_in)||3600)*1000}:null;
    if(o.mode==='join'&&!VAULT.meta){ const rem=await PROVIDERS.dropbox.read(); if(!rem){ SYNC.pending=null; setTimeout(()=>toast(L('No hay datos de MyFinZen en tu Dropbox. Crea tu contraseña aquí o súbelos desde tu otro dispositivo.','There is no MyFinZen data in your Dropbox. Create your password here or upload it from your other device.')),600); return; }
      await joinWith(rem.text); }
  }catch(e){ SYNC.pending=null; setTimeout(()=>toast(L('No se pudo conectar Dropbox: ','Couldn\'t connect Dropbox: ')+(e.message||e)),600); } }
// Dispositivo nuevo: guarda la bóveda que viene de la nube y pide la contraseña de siempre
async function joinWith(text){ const rf=parseSyncFile(text); VAULT.meta=Object.assign({},rf.meta,{updated:rf.updated||new Date().toISOString()}); await IDB.set('vault',VAULT.meta); SYNC.joinNote=true; }
// Al desbloquear: termina una conexión pendiente y sincroniza
async function syncAfterUnlock(){ if(!S) return; const pend=SYNC.pending; SYNC.pending=null;
  if(pend){ S.secret.sync={p:pend.p,dev:pend.dev||devId()}; if(pend.rt) S.secret.sync.rt=pend.rt; if(SYNC.joinNote&&!VAULT.meta.sync) await setBase(S); save(); }
  const joined=SYNC.joinNote; SYNC.joinNote=false;
  syncUI(); clearInterval(SYNC.iv); SYNC.iv=setInterval(()=>{ if(S&&!document.hidden) syncNow({quiet:true}); },5*60000);
  if(syncProv()&&syncProv().auto) await syncNow({ask:true,quiet:!pend});
  if(joined&&typeof passkeyCapable==='function'&&passkeyCapable()&&!((VAULT.meta.pk||[]).some(p=>p.name===deviceName()))) setTimeout(()=>{ if(!S) return;
    openModal(`<h2>${L('Listo: tus datos ya están aquí','Done: your data is here')}</h2><p>${L('¿Quieres abrir MyFinZen en este dispositivo con la huella, la cara o el PIN?','Do you want to open MyFinZen on this device with your fingerprint, face or PIN?')}</p><div class="row"><button id="mc">${L('Ahora no','Not now')}</button><button class="pri" id="jPk">${L('Crear passkey','Create passkey')}</button></div>`);
    $('#mc').onclick=closeModal; $('#jPk').onclick=async()=>{ try{ await addPasskey(); closeModal(); toast(L('Passkey creada','Passkey created')); syncSoon(); }catch(e){ toast(e.name==='NotAllowedError'?L('Cancelado.','Cancelled.'):e.message); } }; },400); }
function syncOnLock(){ clearTimeout(SYNC.timer); clearInterval(SYNC.iv); SYNC.at=null; SYNC.err=null; syncUI(); }
async function syncDisconnect(){ if(S&&S.secret) delete S.secret.sync; SYNC.at=null; SYNC.fh=null; SYNC.err=null; SYNC.needPerm=false; if(VAULT.meta) delete VAULT.meta.sync; await IDB.del('syncHandle'); save(); syncUI(); }
async function fileConnect(){ let h; try{ h=await window.showSaveFilePicker({suggestedName:SYNC_FILE,types:[{description:'MyFinZen',accept:{'application/octet-stream':['.mfz']}}]}); }catch(e){ return; }
  await IDB.set('syncHandle',h); SYNC.fh=h; S.secret.sync={p:'file',dev:devId()}; if(VAULT.meta) delete VAULT.meta.sync; save(); await syncNow({ask:true}); route(); }
async function fileJoin(){ let h; try{ [h]=await window.showOpenFilePicker({types:[{description:'MyFinZen',accept:{'application/octet-stream':['.mfz','.txt','.json']}}]}); }catch(e){ return false; }
  const f=await h.getFile(); await joinWith(await f.text()); await IDB.set('syncHandle',h); SYNC.fh=h; SYNC.pending={p:'file',dev:devId()}; return true; }

/* ---------- A mano (móvil): subir y traer el archivo ---------- */
async function manualUpload(){ if(!S) return; const txt=await buildSyncFile(bumpSv(syncState(S))); await setBase(S); if(S.secret.sync) S.secret.sync.last=new Date().toISOString(); await persist();
  const file=new File([txt],SYNC_SHARE,{type:'text/plain'});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:'MyFinZen'}); toast(L('Guárdalo en tu nube (Drive, OneDrive, Dropbox, iCloud…) sustituyendo el anterior','Save it to your cloud (Drive, OneDrive, Dropbox, iCloud…) replacing the previous one')); return; } }catch(e){ if(e.name==='AbortError') return; }
  downloadFile(SYNC_SHARE,txt,'text/plain'); toast(L('Descargado: súbelo a tu nube sustituyendo el anterior','Downloaded: upload it to your cloud replacing the previous one')); }
async function manualImport(file){ if(!S||!file) return; try{ const rf=parseSyncFile(await file.text()); const m=await mergeRemote(rf);
    if(m.stale) return toast(L('Ese archivo es más antiguo que lo que ya tienes: no hay nada nuevo','That file is older than what you already have: nothing new'));
    if(m.changedHere){ bumpSv(m.next,m.rs); applyState(m.next); } await setBase(m.next); await persist(); route();
    toast(m.changedHere?L('Datos del otro dispositivo añadidos.','Data from the other device added.')+(m.needUp?L(' Súbelo de nuevo para que lo tengan los demás.',' Upload it again so the others get it.'):''):L('Ya estaba todo al día','Everything was already up to date'));
  }catch(e){ if(e.code==='othervault') toast(L('Ese archivo es de otra bóveda de MyFinZen (otra contraseña)','That file is from another MyFinZen vault (another password)')); else toast(e.message); } }

/* ---------- Interfaz ---------- */
const chIcon=(icon,h)=>`<span class="av" style="--h:${h||215}">${ic(icon)}</span>`;
const chText=(t,d)=>`<span><b>${t}</b><span class="muted">${d}</span></span>`;
function syncAgo(iso){ if(!iso) return L('nunca','never'); const m=Math.round((Date.now()-Date.parse(iso))/60000); return m<1?L('ahora mismo','just now'):m<60?L(`hace ${m} min`,`${m} min ago`):m<1440?L(`hace ${Math.round(m/60)} h`,`${Math.round(m/60)} h ago`):dLabel(iso.slice(0,10)); }
function syncUI(){ const b=document.getElementById('syncBtn'); if(!b) return; const c=syncConf(); b.hidden=!S||!c; if(b.hidden) return;
  const st=SYNC.busy?'busy':SYNC.needPerm?'perm':SYNC.err?'err':'ok'; b.className='iconbtn sync '+st; b.innerHTML=ic('cloud')+(st==='err'||st==='perm'?'<i></i>':'');
  const p=syncProv(); const t=st==='busy'?L('Sincronizando…','Syncing…'):st==='perm'?L('Toca para sincronizar','Tap to sync'):st==='err'?L('No se pudo sincronizar: ','Couldn\'t sync: ')+SYNC.err.message:(p?p.name+' · '+L('sincronizado ','synced ')+syncAgo(c.last):'');
  b.title=t; b.setAttribute('aria-label',t); }
function syncBtnClick(){ const p=syncProv(); if(!p) return; if(!p.auto) return manualSheet(); syncNow({ask:true}).then(ok=>{ if(ok) toast(L('Sincronizado','Synced')); }); }
function manualSheet(){ openModal(`<h2>${L('Sincronizar a mano','Sync by hand')}</h2><p class="muted">${L('Último envío','Last upload')}: ${esc(syncAgo(syncConf().last))}</p>
  <div class="choice"><button class="btn chl" id="mUp">${chIcon('upload')}${chText(L('Subir a mi nube','Upload to my cloud'),L('Guarda el archivo cifrado en Drive, OneDrive, Dropbox o iCloud, sustituyendo el anterior.','Save the encrypted file to Drive, OneDrive, Dropbox or iCloud, replacing the previous one.'))}</button>
  <label class="btn chl">${chIcon('down')}${chText(L('Traer de mi nube','Get from my cloud'),L('Abre el archivo que subiste desde otro dispositivo: se suman sus cambios.','Open the file you uploaded from another device: its changes are added.'))}<input type="file" id="mIn" accept=".txt,.mfz,.json,text/plain"></label></div>
  <div class="row" style="margin-top:12px"><button id="mc">${L('Cerrar','Close')}</button></div>`);
  $('#mc').onclick=closeModal; $('#mUp').onclick=()=>{ closeModal(); manualUpload(); }; $('#mIn').onchange=e=>{ const f=e.target.files[0]; closeModal(); manualImport(f); }; }
function syncCardHTML(){ const c=syncConf(), p=syncProv();
  const opt=(id,icon,t,d,dis,h)=>`<button class="btn chl" id="${id}" ${dis?'disabled':''}>${chIcon(icon,h)}<span><b>${t}</b><span class="muted">${d}</span></span></button>`;
  if(!c) return `<div class="card" style="margin-bottom:12px" id="syncCard">${helpBtn('sync')}<h2>${L('Tus dispositivos','Your devices')}</h2><p class="sub">${L('Usa MyFinZen en el móvil, la tableta y el ordenador con los mismos datos. Se guarda en tu nube un archivo cifrado con tu contraseña maestra: la nube no puede leerlo.','Use MyFinZen on your phone, tablet and computer with the same data. An encrypted file is saved in your cloud with your master password: the cloud can\'t read it.')}</p>
    <div class="choice">${opt('syDbx','cloud','Dropbox',CLOUD.dropbox.key?L('Automático en todos tus dispositivos.','Automatic on all your devices.'):L('Pendiente de activar en esta app.','Not enabled in this app yet.'),!CLOUD.dropbox.key)}
    ${hasFSA()?opt('syFile','layers',L('Un archivo en tu nube','A file in your cloud'),L('Elige dónde guardarlo dentro de tu carpeta de OneDrive, Google Drive, iCloud Drive o Dropbox. Automático en este ordenador.','Choose where to save it inside your OneDrive, Google Drive, iCloud Drive or Dropbox folder. Automatic on this computer.')):''}
    ${opt('syMan','upload',L('A mano','By hand'),L('Subes el archivo a tu nube (Drive, OneDrive, iCloud…) y lo abres desde el otro dispositivo. Para móviles sin conexión automática.','You upload the file to your cloud (Drive, OneDrive, iCloud…) and open it from the other device. For phones without an automatic connection.'))}</div>
    <p class="muted" style="margin-top:8px">${L('En el otro dispositivo, abre MyFinZen y elige «Ya uso MyFinZen en otro dispositivo». Usarás la misma contraseña maestra.','On the other device, open MyFinZen and choose "I already use MyFinZen on another device". You\'ll use the same master password.')}</p></div>`;
  const st=SYNC.busy?L('Sincronizando…','Syncing…'):SYNC.needPerm?L('Falta permiso para el archivo: toca «Sincronizar ahora».','File permission needed: tap "Sync now".'):SYNC.err?`<span class="neg">${esc(SYNC.err.message)}</span>`:(p.auto?L('Sincronizado ','Synced ')+esc(syncAgo(c.last)):L('Último envío: ','Last upload: ')+esc(syncAgo(c.last)));
  return `<div class="card" style="margin-bottom:12px" id="syncCard">${helpBtn('sync')}<h2>${L('Tus dispositivos','Your devices')}</h2><p class="sub">${ic('cloud')} <b>${esc(p.name)}</b> · ${st}</p>
    ${!VAULT.meta.skid?`<div class="alert warn"><span class="ic">!</span><div style="flex:1">${L('<b>Recomendado:</b> activa la clave secreta. Así el archivo de tu nube necesita tu contraseña y una clave que solo está en tus dispositivos.','<b>Recommended:</b> turn on the secret key. Then your cloud file needs your password and a key that is only on your devices.')} <button class="sm" data-skon>${L('Activar','Turn on')}</button></div></div>`:''}
    <div class="row" style="justify-content:flex-start">${p.auto?`<button class="pri" id="syNow">${L('Sincronizar ahora','Sync now')}</button>`:`<button class="pri" id="syUp">${L('Subir a mi nube','Upload to my cloud')}</button><label class="btn">${L('Traer de mi nube','Get from my cloud')}<input type="file" id="syIn" accept=".txt,.mfz,.json,text/plain" hidden></label>`}<button id="syOff">${L('Desconectar','Disconnect')}</button></div>
    <p class="muted" style="margin-top:8px">${p.auto?L('Se sincroniza al abrir la app, a los pocos segundos de cada cambio y cada 5 minutos.','It syncs when you open the app, a few seconds after each change and every 5 minutes.'):L('Súbelo después de cambios importantes y ábrelo desde tu otro dispositivo; se suman los cambios de los dos.','Upload it after important changes and open it from your other device; the changes from both are combined.')} ${L('La clave de API de Claude no se sincroniza.','The Claude API key isn\'t synced.')}</p></div>`; }
function wireSyncCard(el){ const on=(id,f)=>{ const b=el.querySelector('#'+id); if(b) b.onclick=f; };
  on('syDbx',()=>dbxConnect('link')); on('syFile',()=>fileConnect());
  on('syMan',()=>{ S.secret.sync={p:'manual',dev:devId()}; save(); syncUI(); route(); manualUpload(); });
  on('syNow',()=>syncNow({ask:true}).then(ok=>{ if(ok) toast(L('Sincronizado','Synced')); route(); }));
  on('syUp',()=>manualUpload().then(()=>route()));
  const inp=el.querySelector('#syIn'); if(inp) inp.onchange=e=>manualImport(e.target.files[0]);
  on('syOff',async()=>{ if(await confirmModal(L('¿Desconectar este dispositivo?','Disconnect this device?'),`<p>${L('Tus datos se quedan aquí y en la nube; solo deja de sincronizarse este dispositivo.','Your data stays here and in the cloud; only this device stops syncing.')}</p>`)){ await syncDisconnect(); route(); } }); }
// Pantalla «Ya uso MyFinZen en otro dispositivo» (antes de tener bóveda)
function joinGateHTML(){ return `<h2>${L('Trae tus datos','Bring your data')}</h2><p class="muted">${L('Elige dónde los sincroniza tu otro dispositivo. Después te pedirá la contraseña maestra de siempre.','Choose where your other device syncs them. Then it will ask for your usual master password.')}</p>
  <div class="choice">${CLOUD.dropbox.key?`<button class="btn chl" id="jDbx">${chIcon('cloud')}${chText('Dropbox',L('Inicia sesión en Dropbox.','Sign in to Dropbox.'))}</button>`:''}
  ${hasFSA()?`<button class="btn chl" id="jFile">${chIcon('layers')}${chText(L('Archivo en tu nube','File in your cloud'),L('Abre MyFinZen.mfz desde tu carpeta de OneDrive, Google Drive, iCloud Drive o Dropbox. Se sincronizará solo.','Open MyFinZen.mfz from your OneDrive, Google Drive, iCloud Drive or Dropbox folder. It will sync by itself.'))}</button>`:''}
  <label class="btn chl">${chIcon('down')}${chText(L('Abrir el archivo','Open the file'),L('El archivo que subiste a tu nube desde el otro dispositivo (MyFinZen-sync.txt o MyFinZen.mfz).','The file you uploaded to your cloud from the other device (MyFinZen-sync.txt or MyFinZen.mfz).'))}<input type="file" id="jIn" accept=".txt,.mfz,.json,text/plain"></label></div>
  <div id="gMsg" class="neg" style="margin-top:8px"></div><p><a href="#" id="gBack">${L('Volver','Back')}</a></p>`; }
function wireJoinGate(){ const fail=m=>{ $('#gMsg').textContent=m; };
  const b=$('#jDbx'); if(b) b.onclick=()=>dbxConnect('join');
  const f=$('#jFile'); if(f) f.onclick=async()=>{ try{ if(await fileJoin()) showGate('unlock',true); }catch(e){ fail(e.message); } };
  $('#jIn').onchange=async e=>{ const file=e.target.files[0]; if(!file) return; try{ await joinWith(await file.text()); SYNC.pending={p:'manual',dev:devId()}; showGate('unlock',true); }catch(er){ fail(er.message); } };
  $('#gBack').onclick=e=>{ e.preventDefault(); showGate('setup'); }; }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&S&&syncProv()&&syncProv().auto&&(!SYNC.last||Date.now()-SYNC.last>60000)) syncNow({quiet:true}); });
