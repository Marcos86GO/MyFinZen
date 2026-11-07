// MyFinZen — código de la app (la interfaz y los estilos están en index.html; los textos de ayuda, en help.js).
// Va en un archivo aparte para que la CSP prohíba los scripts incrustados ('unsafe-inline').
"use strict";
// La app nunca debe ejecutarse dentro de un marco de otra web (evita el "clickjacking"; GitHub Pages no permite enviar frame-ancestors)
if(window.top!==window.self){ try{ window.top.location.replace(window.self.location.href); }catch(e){} document.documentElement.innerHTML=''; throw new Error('MyFinZen no se puede abrir dentro de un marco'); }
/* ============================================================
   Idioma: todo texto visible pasa por L('español','English').
   La preferencia se guarda en localStorage (no es un dato personal).
   ============================================================ */
let LANG='es';
try{ const s=localStorage.getItem('mfz-lang'); LANG=(s==='es'||s==='en')?s:(/^es\b/i.test(navigator.language||'')?'es':'en'); }catch(e){}
const L=(es,en)=>LANG==='en'?en:es;
function setLang(l,keep){ LANG=l==='en'?'en':'es'; if(!keep) try{ localStorage.setItem('mfz-lang',LANG); }catch(e){} applyStatic(); if(S) route(); }
function bil(o){ const r={}; for(const k of Object.keys(o)) Object.defineProperty(r,k,{enumerable:true,get(){ const v=o[k]; return Array.isArray(v)?L(v[0],v[1]):v; }}); return r; }
/* ---------- Iconos SVG propios (sin dependencias externas) ---------- */
const ICONS={
  menu:'M4 6h16M4 12h16M4 18h16', home:'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  flow:'M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3',
  wallet:'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M16 15h2',
  trend:'M3 17l6-6 4 4 8-8M15 7h6v6', house:'M4 10l8-6 8 6M6 9v11h12V9M10 20v-5h4v5',
  receipt:'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3', more:'M5 12h.01M12 12h.01M19 12h.01',
  building:'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3',
  spark:'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  book:'M5 4h13v15H6.5A1.5 1.5 0 0 0 5 20.5zM5 20.5V4M18 19v2H6.5',
  sliders:'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  lock:'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3',
  plus:'M12 5v14M5 12h14', upload:'M12 15V4M7 9l5-5 5 5M5 20h14', edit:'M4 20h4L19 9l-4-4L4 16z',
  right:'M9 6l6 6-6 6', down:'M6 9l6 6 6-6', close:'M6 6l12 12M18 6L6 18', check:'M5 12l5 5 9-10',
  trash:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', clock:'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7v5l3 2',
  refresh:'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5', shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  alert:'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 8v5M12 16h.01', search:'M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM20 20l-4-4',
  card:'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h4',
  bank:'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  landmark:'M3 9l9-5 9 5M4 9h16M6 9v9M10 9v9M14 9v9M18 9v9M3 20h18', briefcase:'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V5h6v3M3 13h18',
  bars:'M4 20V12M10 20V6M16 20v-9M22 20H2', cpu:'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  bolt:'M13 3L5 14h6l-1 7 8-11h-6z', coin:'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  globe:'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  news:'M5 5h12v14H6a1 1 0 0 1-1-1zM17 9h2a1 1 0 0 1 1 1v8a1 1 0 0 1-2 0M8 9h6M8 13h6M8 16h4', pin:'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4z', piggy:'M5 11a7 6 0 0 1 13-2h2v4l-2 1v3h-3v-2H9v2H6v-3a6 6 0 0 1-1-3zM15 10h.01'
};
const ic=(n,cls)=>`<svg class="ico${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]||''}"/></svg>`;
// Menú: orden pedido por el usuario. Lo que no cabe va en "Más".
const NAV=[['resumen','Resumen','Overview','home'],['flujo','Movimientos','Transactions','flow'],['cuentas','Cuentas','Accounts','wallet'],['inversiones','Inversiones','Investments','trend'],['hipotecas','Hipotecas','Mortgages','house'],['impuestos','Impuestos','Taxes','receipt']];
const NAV_MORE=[['alquiler','Casa en alquiler','Rental','building'],['claude','Claude','Claude','spark'],['ayuda','Manual','Manual','book'],['ajustes','Copia y ajustes','Backup & settings','sliders']];
const NAV_PARENT={noticias:'inversiones',importar:'cuentas'};
function navLabel(v){ const n=[...NAV,...NAV_MORE].find(x=>x[0]===(NAV_PARENT[v]||v)); return n?L(n[1],n[2]):'MyFinZen'; }
function applyStatic(){
  document.documentElement.lang=LANG;
  const cur=(location.hash||'#resumen').slice(1), on=NAV_PARENT[cur]||cur; const a=([h,es,en,i])=>`<a href="#${h}" class="${h===on?'on':''}">${ic(i)}<span>${L(es,en)}</span></a>`;
  document.getElementById('nav').innerHTML=NAV.map(a).join('')+`<details id="navMore" ${NAV_MORE.some(x=>x[0]===on)?'open':''}><summary>${ic('more')}<span>${L('Más','More')}</span>${ic('down','chev')}</summary>${NAV_MORE.map(a).join('')}</details>`;
  document.getElementById('nav').setAttribute('aria-label',L('Secciones','Sections')); document.getElementById('drawer').setAttribute('aria-label',L('Menú','Menu'));
  document.getElementById('encTxt').innerHTML=ic('shield')+'<span>'+L('Cifrado en este dispositivo','Encrypted on this device')+'</span>';
  const mb=document.getElementById('menuBtn'); mb.innerHTML=ic('menu'); mb.setAttribute('aria-label',L('Abrir el menú','Open the menu'));
  const lb=document.getElementById('lockBtn'); lb.innerHTML=ic('lock')+`<span class="hide-sm">${L('Bloquear','Lock')}</span>`; lb.title=L('Bloquear','Lock'); lb.setAttribute('aria-label',L('Bloquear','Lock'));
  const fb=document.getElementById('fab'); fb.innerHTML=ic('plus'); fb.setAttribute('aria-label',L('Importar o añadir','Import or add')); fb.title=L('Importar o añadir','Import or add');
  document.getElementById('pageTitle').textContent=S?navLabel(cur):'MyFinZen';
  document.getElementById('updTxt').textContent=L('Hay una versión nueva de MyFinZen.','A new version of MyFinZen is available.');
  document.getElementById('updGo').textContent=L('Actualizar','Update');
}
// Menú lateral: se abre con ☰ en el móvil; en escritorio está siempre visible
function menuOpen(open){ document.body.classList.toggle('menu-open',open); const b=document.getElementById('menuBtn'); if(b) b.setAttribute('aria-expanded',open?'true':'false');
  if(open){ const a=document.querySelector('#nav a.on')||document.querySelector('#nav a'); if(a) setTimeout(()=>a.focus(),60); } }
document.getElementById('menuBtn').addEventListener('click',()=>menuOpen(!document.body.classList.contains('menu-open')));
document.getElementById('scrim').addEventListener('click',()=>menuOpen(false));
document.getElementById('nav').addEventListener('click',e=>{ if(e.target.closest('a')) menuOpen(false); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.body.classList.contains('menu-open')) menuOpen(false); });
window.addEventListener('scroll',()=>{ const t=document.getElementById('topbar'); if(t) t.classList.toggle('scrolled',window.scrollY>4); },{passive:true});
// Botón "+": importar extractos o añadir un movimiento
const FAB_VIEWS=['resumen','flujo','cuentas','inversiones','hipotecas'];
document.getElementById('fab').addEventListener('click',()=>{
  openModal(`<h2>${L('¿Qué quieres hacer?','What do you want to do?')}</h2><div class="choice">
    <button id="fabImp"><span class="av" style="--h:215">${ic('upload')}</span><span><b>${L('Importar extractos','Import statements')}</b><span class="muted">${L('PDF o CSV de tus bancos, tarjetas, inversiones o hipotecas','PDF or CSV from your banks, cards, investments or mortgages')}</span></span></button>
    <button id="fabTx"><span class="av" style="--h:152">${ic('plus')}</span><span><b>${L('Añadir movimiento','Add a transaction')}</b><span class="muted">${L('Un gasto en efectivo o algo que no esté en tus extractos','A cash expense or something not in your statements')}</span></span></button></div>
    <div class="row" style="margin-top:12px"><button id="mc">${L('Cancelar','Cancel')}</button></div>`);
  $('#mc').onclick=closeModal; $('#fabImp').onclick=()=>{ closeModal(); location.hash='#importar'; }; $('#fabTx').onclick=()=>{ closeModal(); addTxModal(); }; });
function langSwitch(){ return `<div class="langsw"><button class="sm ${LANG==='es'?'on':''}" data-lang="es">Español</button><button class="sm ${LANG==='en'?'on':''}" data-lang="en">English</button></div>`; }
function wireLang(root,after){ root.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{ setLang(b.dataset.lang); if(after) after(); }); }
/* ---------- Ayuda: icono (i) en cada caja; textos en help.js ---------- */
function helpBtn(key,inline){ return `<button class="ib${inline?' inl':''}" data-help="${key}" aria-label="${L('Qué es esto','What is this')}" title="${L('Qué es esto','What is this')}">i</button>`; }
function helpEntry(key){ const h=(window.HELP||{})[key]; return h?(h[LANG]||h.es):null; }
function helpBody(h){ return `${h.d.map(p=>`<p>${p}</p>`).join('')}${h.steps&&h.steps.length?`<p><b>${L('Cómo usarlo','How to use it')}</b></p><ol>${h.steps.map(x=>`<li>${x}</li>`).join('')}</ol>`:''}`; }
function showHelp(key){ const h=helpEntry(key); if(!h) return;
  openModal(`<div class="help"><h2>${h.t}</h2>${helpBody(h)}</div><div class="row" style="margin-top:12px"><button id="hMan">${L('Ver el manual','Open the manual')}</button><button class="pri" id="mc">${L('Entendido','Got it')}</button></div>`);
  $('#mc').onclick=closeModal; $('#hMan').onclick=()=>{ closeModal(); location.hash='#ayuda'; setTimeout(()=>{ const e=document.getElementById('man-'+key); if(e) e.scrollIntoView(); },120); }; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-help]'); if(b){ e.preventDefault(); e.stopPropagation(); showHelp(b.dataset.help); } },true);

/* ============================================================
   Storage — everything lives in IndexedDB on this device
   ============================================================ */
const KINDS = {
  cash:{get label(){return L('Banco / ahorro','Bank / savings')}, asset:true},
  credit:{get label(){return L('Tarjeta de crédito','Credit card')}, asset:false},
  brokerage:{get label(){return L('Inversión','Brokerage')}, asset:true},
  retirement:{get label(){return L('Jubilación','Retirement')}, asset:true},
  kids:{get label(){return L('Ahorro hijos','Kids savings')}, asset:true},
  property:{get label(){return L('Inmueble','Property')}, asset:true},
  mortgage:{get label(){return L('Hipoteca','Mortgage')}, asset:false},
  other:{get label(){return L('Otro activo','Other asset')}, asset:true},
};
const CATS = {
  income:['Nómina','Renta alquiler','Intereses/dividendos','Otros ingresos'],
  expense:['Hipoteca casa','Hipoteca alquiler','HOA alquiler','Gastos alquiler','Impuestos propiedad','Supermercado','Restaurantes','Gasolina','Coche','Seguros','Suministros','Niños','Salud','Compras','Ocio','Viajes','Suscripciones','Educación','Impuestos','Otros gastos'],
  neutral:['Transferencia','Pago tarjeta','Aportación inversión']
};
// Reglas de la versión anterior: se guardaban en S.rules y se quitan al migrar (ver migrateCats)
const OLD_DEFAULT_PATTERNS=['PAYROLL|DIRECT DEP|DIR DEP|SALARY|NOMINA','PENNYMAC','HOA|HOMEOWNERS ASSOC|ASSOCIATION|COMMUNITY MGMT|FIRSTSERVICE|PROPERTY MGMT','RENT FROM|RENTAL INCOME|TENANT','PAYMENT THANK|AUTOPAY PAYMENT|AUTOMATIC PAYMENT|CARD PAYMENT|ONLINE PAYMENT|EPAY|PAYMENT - THANK|CRCARDPMT|PMT TO CREDIT','M1 FINANCE|M1 FIN|VANGUARD|FIDELITY|SCHWAB|ROBINHOOD','ZELLE|VENMO|TRANSFER|XFER|WIRE','COSTCO|TRADER JOE|VONS|RALPHS|ALBERTSONS|WHOLE FOODS|SPROUTS|ALDI|STATER|SMART & FINAL|H MART|99 RANCH|NORTHGATE|GROCERY|SAFEWAY|WINCO|FOOD 4 LESS','SHELL|CHEVRON|ARCO|MOBIL|EXXON|76 |CIRCLE K|VALERO|COSTCO GAS|FUEL|EV CHARG|TESLA SUPERCH|ELECTRIFY','RESTAUR|CAFE|COFFEE|STARBUCKS|MCDONALD|CHIPOTLE|IN-N-OUT|DOORDASH|UBER EATS|GRUBHUB|PIZZA|TACO|SUSHI|GRILL|BAKERY|BAR ','NETFLIX|SPOTIFY|HULU|DISNEY|YOUTUBE|APPLE.COM|ICLOUD|GOOGLE \\*|AMAZON PRIME|PRIME VIDEO|HBO|MAX.COM|OPENAI|ANTHROPIC|CLAUDE','EDISON|SCE |SOCALGAS|SO CAL GAS|SOCAL GAS|WATER|SPECTRUM|AT&T|VERIZON|T-MOBILE|TMOBILE|COX |FRONTIER|UTILIT','GEICO|STATE FARM|ALLSTATE|PROGRESSIVE|FARMERS|MERCURY INS|INSURANCE|LIBERTY MUT','DMV|AUTO REPAIR|JIFFY|CAR WASH|TOYOTA|HONDA|INFINITI|NISSAN|TESLA|PARKING|TOLL|FASTRAK','CVS|WALGREENS|PHARM|MEDICAL|DENTAL|CLINIC|HOSPITAL|KAISER|HEALTH','AMAZON|AMZN|TARGET|WALMART|HOME DEPOT|LOWE|IKEA|BEST BUY|MARSHALLS|TJ MAXX|ROSS ','DAYCARE|PRESCHOOL|KIDS|TOYS|CHILDREN|GYMBOREE|BABY','AIRLINE|DELTA|UNITED|AMERICAN AIR|SOUTHWEST|IBERIA|HOTEL|AIRBNB|EXPEDIA|MARRIOTT|HILTON','TAX COLLECTOR|TREASURER|FRANCHISE TAX|IRS','INTEREST PAID|INTEREST EARNED|DIVIDEND'];
/* Categorías automáticas: palabras completas (nunca trozos: "ARCO" no casa con "MARCOS"), sobre la
   descripción limpia (sin el nombre del titular, ids ni números). Si casan varias, gana la palabra más
   larga (+ bonus); las de ingreso solo valen para importes positivos. Si no casa nada: "Otros" y aviso. */
const CAT_WORDS=[
  ['Pago tarjeta',6,'PAYMENT THANK YOU|PAYMENT - THANK|THANK YOU PAYMENT|AUTOPAY|AUTO PAY PAYMENT|AUTOMATIC PAYMENT|CARD PAYMENT|CREDIT CARD BILL PAYMENT|CREDIT CARD PAYMENT|CRCARDPMT|EPAYMENT|EPAY|PMT TO CREDIT|PAYMENT FROM CHK|PAYMENT FROM CHECKING|CARDMEMBER SERV|CARDMEMBER SVC|CARDMEMBER SERVICES|CREDIT CRD|AMEX EPAYMENT|APPLECARD GSBANK|ONLINE PAYMENT'],
  ['Nómina',8,'PAYROLL|DIRECT DEP|DIRECT DEPOSIT|DIR DEP|SALARY|NOMINA|PAYCHECK|ADP PAYROLL|GUSTO'],
  ['Renta alquiler',12,'RENT|RENTAL INCOME|TENANT|LEASE PAYMENT'],
  ['Intereses/dividendos',4,'INTEREST EARNED|INTEREST PAID|INTEREST APPLICATION|INTEREST PAYMENT|INTEREST|DIVIDEND|DIVIDENDS|DIV REINVEST'],
  ['Hipoteca casa',4,'PENNYMAC|MORTGAGE|MTG|HOME MTG|HOME MORTGAGE|ROCKET MORTGAGE|MR COOPER|MRCOOPER|LOANCARE|NEWREZ|SHELLPOINT|LOAN SERVICING'],
  ['HOA alquiler',2,'HOA|HOMEOWNERS ASSOC|HOMEOWNERS ASSN|HOMEOWNERS ASSOCIATION|COMMUNITY ASSOCIATION|COMMUNITY MGMT|FIRSTSERVICE|PROPERTY MGMT|ASSOCIATION DUES'],
  ['Aportación inversión',3,'M1|M1 FINANCE|M1 FIN|M1 INVEST|VANGUARD|FIDELITY|SCHWAB|ROBINHOOD|BETTERMENT|WEALTHFRONT|ETRADE|E TRADE|SCHOLARSHARE|MY529|529 PLAN'],
  ['Transferencia',0,'ZELLE|VENMO|TRANSFER|ONLINE BANKING TRANSFER|XFER|WIRE|WIRE TRANSFER|CASH APP|INTERNAL TRANSFER'],
  ['Impuestos propiedad',4,'TAX COLLECTOR|TREASURER TAX|TREASURER-TAX|COUNTY TREASURER|PROPERTY TAX'],
  ['Impuestos',4,'IRS|US TREASURY|IRS USATAXPYMT|USATAXPYMT|FRANCHISE TAX|FRANCHISE TAX BD|FTB|CA FTB|TAX PYMT|TAX PAYMENT'],
  ['Gasolina',0,'SHELL|SHELL OIL|CHEVRON|ARCO|AMPM|MOBIL|EXXON|EXXONMOBIL|VALERO|CIRCLE K|UNION 76|76 FUEL|SPEEDWAY|SINCLAIR|CITGO|SUNOCO|COSTCO GAS|SAMS CLUB FUEL|FUEL|GASOLINE|GAS STATION|CHARGEPOINT|ELECTRIFY AMERICA|EVGO|TESLA SUPERCHARGER|SUPERCHARGER|EV CHARGING'],
  ['Supermercado',0,'COSTCO|COSTCO WHSE|TRADER JOE|TRADER JOES|VONS|RALPHS|ALBERTSONS|WHOLE FOODS|WHOLEFDS|SPROUTS|ALDI|STATER BROS|SMART FINAL|SMART AND FINAL|H MART|99 RANCH|NORTHGATE|NORTHGATE MARKET|GROCERY|GROCERIES|SAFEWAY|WINCO|FOOD 4 LESS|FOOD4LESS|PAVILIONS|GELSONS|MOTHERS MARKET|CARDENAS|VALLARTA|SEAFOOD CITY|INSTACART|AMAZON FRESH|SAMS CLUB|SUPERMARKET|MARKET PLACE'],
  ['Restaurantes',0,'RESTAURANT|RESTAURANTE|CAFE|COFFEE|STARBUCKS|PEETS|DUNKIN|MCDONALD|MCDONALDS|CHIPOTLE|IN N OUT|IN-N-OUT|CHICK FIL A|CHICK-FIL-A|TACO BELL|DEL TACO|SUBWAY|PANERA|PANDA EXPRESS|WENDYS|BURGER KING|JACK IN THE BOX|DOMINOS|PIZZA|PIZZERIA|SUSHI|RAMEN|PHO|GRILL|BAKERY|DOORDASH|UBER EATS|UBEREATS|GRUBHUB|POSTMATES|CAVA|SWEETGREEN|RAISING CANES|THE HABIT|WINGSTOP|KFC|POPEYES|IHOP|DENNYS|CHEESECAKE FACTORY|OLIVE GARDEN|TST|BOBA|TEA HOUSE|DONUT|DONUTS|BAGEL|DINER|BISTRO|TAQUERIA|BBQ|BRASSERIE|CANTINA|KITCHEN'],
  ['Suscripciones',0,'NETFLIX|SPOTIFY|HULU|DISNEY PLUS|DISNEYPLUS|YOUTUBE PREMIUM|YOUTUBEPREMIUM|YOUTUBE TV|APPLE COM BILL|APPLE.COM/BILL|ICLOUD|GOOGLE STORAGE|GOOGLE ONE|AMAZON PRIME|PRIME VIDEO|HBO|MAX.COM|HBO MAX|PARAMOUNT|PEACOCK|AUDIBLE|KINDLE UNLTD|OPENAI|CHATGPT|ANTHROPIC|CLAUDE.AI|MICROSOFT 365|MSFT 365|ADOBE|DROPBOX|PATREON|SIRIUSXM|NYTIMES|WSJ'],
  ['Suministros',0,'EDISON|SO CAL EDISON|SOUTHERN CALIFORNIA EDISON|SCE|SOCALGAS|SO CAL GAS|SOCAL GAS|SOUTHERN CALIFORNIA GAS|GAS CO|WATER|WATER DIST|WATER DISTRICT|SPECTRUM|AT&T|ATT|VERIZON|VERIZON WIRELESS|T-MOBILE|TMOBILE|COX COMM|COX COMMUNICATIONS|FRONTIER|XFINITY|COMCAST|UTILITY|UTILITIES|WASTE MANAGEMENT|REPUBLIC SERVICES|STARLINK|GOOGLE FIBER|MINT MOBILE|VISIBLE'],
  ['Seguros',0,'GEICO|STATE FARM|ALLSTATE|PROGRESSIVE|FARMERS INS|FARMERS INSURANCE|MERCURY INS|MERCURY INSURANCE|INSURANCE|INS PREM|LIBERTY MUTUAL|LEMONADE|HIPPO INS|NATIONWIDE|TRAVELERS|USAA INS|WAWANESA'],
  ['Coche',0,'DMV|AUTO REPAIR|AUTOZONE|OREILLY|O REILLY|PEP BOYS|JIFFY LUBE|CAR WASH|TOYOTA|HONDA|INFINITI|NISSAN|TESLA|TESLA MOTORS|PARKING|TOLL|TOLL ROADS|THE TOLL ROADS|FASTRAK|UBER|UBER TRIP|LYFT|SMOG|TIRE|TIRES|DISCOUNT TIRE|AUTO PARTS'],
  ['Salud',0,'CVS|CVS PHARMACY|WALGREENS|RITE AID|PHARMACY|MEDICAL|DENTAL|DENTIST|ORTHODONT|CLINIC|HOSPITAL|KAISER|HEALTH|URGENT CARE|LABCORP|QUEST DIAG|PEDIATRIC|PEDIATRICS|OPTOMETRY|VISION CENTER|PHYSICIAN|HEALTHCARE'],
  ['Compras',0,'AMAZON|AMZN|AMZN MKTP|AMAZON MKTPL|AMAZON MKTPLACE|TARGET|WALMART|WAL-MART|HOME DEPOT|THE HOME DEPOT|LOWES|IKEA|BEST BUY|MARSHALLS|TJ MAXX|TJMAXX|ROSS STORES|NORDSTROM|MACYS|KOHLS|OLD NAVY|GAP|ZARA|H&M|UNIQLO|APPLE STORE|EBAY|ETSY|SHEIN|TEMU|WAYFAIR|MICHAELS|HOBBY LOBBY|DOLLAR TREE|COSTCO.COM|PAYPAL|SQ|FURNITURE|CRATE BARREL|POTTERY BARN|BATH BODY'],
  ['Niños',0,'DAYCARE|PRESCHOOL|CHILDCARE|CHILD CARE|KIDS|TOYS|TOYS R US|BUY BUY BABY|CARTERS|CHILDREN|GYMBOREE|BABY|KUMON|MONTESSORI|KINDERCARE|BRIGHT HORIZONS'],
  ['Viajes',0,'AIRLINES|AIRLINE|DELTA AIR|DELTA AIRLINES|UNITED AIRLINES|UNITED AIR|AMERICAN AIRLINES|AMERICAN AIR|SOUTHWEST AIR|SOUTHWEST AIRLINES|SOUTHWES|ALASKA AIR|JETBLUE|SPIRIT AIRL|IBERIA|AIR FRANCE|LUFTHANSA|HOTEL|HOTELS|AIRBNB|VRBO|EXPEDIA|BOOKING.COM|MARRIOTT|HILTON|HYATT|HERTZ|ENTERPRISE RENT|AVIS|BUDGET RENT|TRAVEL'],
  ['Ocio',0,'CINEMA|AMC|AMC THEATRES|REGAL|CINEMARK|DISNEYLAND|DISNEY RESORT|KNOTTS|SIX FLAGS|TICKETMASTER|STUBHUB|GYM|FITNESS|24 HOUR FITNESS|LA FITNESS|PLANET FITNESS|GOLF|BOWLING|STEAM GAMES|PLAYSTATION|XBOX|NINTENDO|MUSEUM|ZOO|AQUARIUM|CONCERT'],
  ['Educación',0,'SCHOOL|UNIVERSITY|COLLEGE|TUITION|COURSERA|UDEMY|BOOKSTORE|ACADEMY']
];
const INCOME_ONLY=new Set(['Nómina','Renta alquiler','Intereses/dividendos']);
let CAT_RE=null;
function catRegexes(){ if(CAT_RE) return CAT_RE; const e=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  CAT_RE=CAT_WORDS.map(([cat,bonus,w])=>({cat,bonus,re:new RegExp('(?:^|[^A-Z0-9&])('+w.split('|').sort((a,b)=>b.length-a.length).map(e).join('|')+')(?=$|[^A-Z0-9&])','g')})); return CAT_RE; }
// Descripción limpia: sin el nombre del titular (INDN:), ids, confirmaciones, fechas ni números largos
function normDesc(desc){ let s=' '+String(desc||'').toUpperCase().replace(/[’']/g,'')+' ';
  s=s.replace(/\bINDN:.*?(?=\bCO ID:|$)/g,' ').replace(/\b(?:CO ID|ID|CONF|CONFIRMATION|REF|TRACE|TRN|ACCT)\s*[:#]\s*\S+/g,' ').replace(/\bDES:/g,' ')
     .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,' ').replace(/[#*]?\d{5,}/g,' ').replace(/\bX{3,}\d*/g,' ');
  const hide=String((S&&S.settings&&S.settings.hideNames)||'').toUpperCase().split(/[,;\n]/).map(x=>x.trim()).filter(x=>x.length>=3);
  hide.forEach(n=>{ s=s.split(n).join(' '); });
  return s.replace(/\s+/g,' '); }
function categorize(desc,amount){
  const D=' '+String(desc||'').toUpperCase()+' ';
  for(const {r,re} of compiledRules()) if(re.test(D)) return r.cat;  // reglas del usuario primero
  const N=normDesc(desc); let best=null;
  for(const {cat,bonus,re} of catRegexes()){ if(INCOME_ONLY.has(cat)&&!(amount>0)) continue; re.lastIndex=0; let m;
    while((m=re.exec(N))){ const sc=m[1].length+bonus; if(!best||sc>best.sc) best={cat,sc}; } }
  return best?best.cat:null; }
// "Sin categoría": lo que la app no supo clasificar y el usuario aún no ha revisado
const isUncat=t=>!t.manual&&!t.rec&&(!t.cat||t.cat==='Otros gastos'||t.cat==='Otros ingresos');
const otherCat=amount=>amount>0?'Otros ingresos':'Otros gastos';
// Migración: las reglas de la versión anterior pasan a estar en el código; se recategoriza lo automático
function migrateCats(){ if((S.settings.catVer||0)>=2) return; const old=new Set(OLD_DEFAULT_PATTERNS);
  S.rules=S.rules.filter(r=>!old.has(r.pattern));
  S.tx.forEach(t=>{ if(t.manual||t.rec) return; t.cat=categorize(t.desc,t.amount)||otherCat(t.amount); });
  S.settings.catVer=2; save(); }
// Los nombres internos de las categorías de sistema están en español (son los que se guardan); catL() los muestra traducidos.
const CAT_EN={'Nómina':'Salary','Renta alquiler':'Rental income','Intereses/dividendos':'Interest/dividends','Otros ingresos':'Other income','Hipoteca casa':'Home mortgage','Hipoteca alquiler':'Rental mortgage','HOA alquiler':'Rental HOA','Gastos alquiler':'Rental expenses','Impuestos propiedad':'Property taxes','Supermercado':'Groceries','Restaurantes':'Restaurants','Gasolina':'Fuel & charging','Coche':'Car','Seguros':'Insurance','Suministros':'Utilities','Niños':'Kids','Salud':'Health','Compras':'Shopping','Ocio':'Leisure','Viajes':'Travel','Suscripciones':'Subscriptions','Educación':'Education','Impuestos':'Taxes','Otros gastos':'Other expenses','Transferencia':'Transfer','Pago tarjeta':'Card payment','Aportación inversión':'Investment contribution'};
const catL=c=>LANG==='en'&&CAT_EN[c]?CAT_EN[c]:c;
const CAT_TYPES=['expense','income','neutral'];
const typeL=t=>({expense:L('Gasto','Expense'),income:L('Ingreso','Income'),neutral:L('Neutro (no cuenta)','Neutral (not counted)')}[t]);
// Categorías propias del usuario: S.settings.userCats=[{name,type}]
function userCats(){ return (S&&S.settings&&S.settings.userCats)||[]; }
function catsOf(type){ return [...CATS[type],...userCats().filter(c=>c.type===type).map(c=>c.name)]; }
function allCats(){ return [...catsOf('income'),...catsOf('expense'),...catsOf('neutral')]; }
function catType(c){ if(CATS.income.includes(c))return 'income'; if(CATS.neutral.includes(c))return 'neutral'; if(CATS.expense.includes(c)) return 'expense'; const u=userCats().find(x=>x.name===c); return u?u.type:'expense'; }
function catOptions(sel){ return CAT_TYPES.map(ty=>`<optgroup label="${typeL(ty)}">${catsOf(ty).map(c=>`<option value="${esc(c)}" ${c===sel?'selected':''}>${esc(catL(c))}</option>`).join('')}</optgroup>`).join('')+`<option value="__newcat">${L('+ Nueva categoría…','+ New category…')}</option>`; }

/* ============================================================
   Validación del estado. Se aplica al desbloquear y al restaurar una copia:
   garantiza la forma de los datos (listas, números, fechas, identificadores)
   para que una copia dañada o manipulada no rompa la app ni inyecte HTML.
   ============================================================ */
const cleanId=v=>String(v??'').replace(/[^\w-]/g,'').slice(0,40);
const finOrNull=v=>{ if(v==null||v==='') return null; const n=typeof v==='number'?v:num(v); return Number.isFinite(n)?n:null; };
// Para datos no fiables (copias, respuestas de Claude): solo números o textos que sean claramente un importe
const numStrict=v=>{ if(typeof v==='number') return Number.isFinite(v)?v:null; if(typeof v!=='string'||!/^\s*\(?-?\$?\s*-?\d[\d,]*(\.\d+)?\)?\s*$/.test(v)) return null; const n=num(v); return Number.isFinite(n)?n:null; };
const isoDate=v=>{ if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; const [y,m,d]=v.split('-').map(Number); return m>=1&&m<=12&&d>=1&&d<=31&&y>1900&&y<2200?v:null; };
const str=(v,max=300)=>v==null?'':String(v).slice(0,max);
const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const ACC_NUM=['rate','payment','extra','escrow','rent','hoa','taxYear','insYear','maint','otherMonthly','mortgagePay','buildingBasis','inService','apr','contributed'];
function sanitizeHoldingRow(x){ x=obj(x); const n=k=>numStrict(x[k]); const r={sym:str(x.sym,40).trim(),name:str(x.name,120),qty:n('qty')??NaN,avg:n('avg')??NaN,cost:n('cost'),value:n('value')||0,gain:n('gain')}; if(x.fund) r.fund=true; if(x.cls) r.cls=str(x.cls,40); return r; }
function sanitizeState(st){
  if(!st||typeof st!=='object'||Array.isArray(st)) throw Object.assign(new Error(L('Datos no válidos','Invalid data')),{code:'notbackup'});
  const o=Object.assign(blankState(),st);
  o.accounts=arr(o.accounts).filter(a=>a&&typeof a==='object').map(a=>{ const x=Object.assign({},a);
    x.id=cleanId(a.id)||uid(); x.kind=Object.prototype.hasOwnProperty.call(KINDS,a.kind)?a.kind:'other'; x.name=str(a.name,120)||KINDS[x.kind].label; x.institution=str(a.institution,120); x.last4=String(a.last4??'').replace(/\D/g,'').slice(-4);
    ACC_NUM.forEach(k=>{ if(k in x) x[k]=numStrict(x[k]); });
    if('propertyId' in x) x.propertyId=x.propertyId?cleanId(x.propertyId):null; if('nextDue' in x) x.nextDue=isoDate(x.nextDue);
    ['rental','pre2017'].forEach(k=>{ if(k in x) x[k]=!!x[k]; });
    if('keys' in x) x.keys=arr(x.keys).filter(k=>typeof k==='string').map(k=>k.slice(0,80)).slice(0,20);
    if(x.holdings){ const h=obj(x.holdings); x.holdings=isoDate(h.date)?{date:h.date,rows:arr(h.rows).map(sanitizeHoldingRow).filter(r=>r.sym)}:undefined; if(!x.holdings) delete x.holdings; }
    return x; });
  o.snapshots=arr(o.snapshots).map(s=>{ s=obj(s); const x={id:cleanId(s.id)||uid(),acc:cleanId(s.acc),date:isoDate(s.date),value:numStrict(s.value)}; ['rate','pi','extra','escrow'].forEach(k=>{ if(s[k]!=null) x[k]=numStrict(s[k]); }); return x; }).filter(s=>s.acc&&s.date&&s.value!=null);
  o.tx=arr(o.tx).map(t=>{ t=obj(t); const x={id:cleanId(t.id)||uid(),date:isoDate(t.date),desc:str(t.desc,300),amount:numStrict(t.amount),cat:str(t.cat,60)||'Otros gastos',acc:t.acc?cleanId(t.acc):null,src:['csv','pdf','manual'].includes(t.src)?t.src:''};
    if(t.manual) x.manual=true; if(t.st){ const st=cleanId(t.st); if(st) x.st=st; }
    if(t.rec&&typeof t.rec==='object'&&['card','xfer','mortgage'].includes(t.rec.type)){ const r={type:t.rec.type,acc:cleanId(t.rec.acc)}; if(t.rec.with) r.with=cleanId(t.rec.with); if(t.rec.prev) r.prev=str(t.rec.prev,60); if(t.rec.cat) r.cat=str(t.rec.cat,60); x.rec=r; }
    return x; }).filter(t=>t.date&&t.amount!=null);
  o.rules=arr(o.rules).map(r=>({pattern:str(obj(r).pattern,200),cat:str(obj(r).cat,60)})).filter(r=>{ if(!r.pattern||!r.cat) return false; try{ new RegExp(r.pattern,'i'); return true; }catch(e){ return false; } });
  const s=obj(o.settings), S2={emergencyMonths:Math.min(36,Math.max(1,Math.round(numStrict(s.emergencyMonths)||6))),lockMin:[1,2,5,10,15,30].includes(+s.lockMin)?+s.lockMin:5};
  S2.lastBackup=typeof s.lastBackup==='string'&&!isNaN(Date.parse(s.lastBackup))?s.lastBackup:null;
  S2.context=str(s.context,2000); S2.hideNames=str(s.hideNames,500); S2.autoClaude=!!s.autoClaude;
  S2.userCats=arr(s.userCats).map(c=>({name:str(obj(c).name,40).trim(),type:CAT_TYPES.includes(obj(c).type)?c.type:'expense'})).filter(c=>c.name);
  S2.onboardDone=!!s.onboardDone; S2.catVer=Math.max(0,Math.min(99,Math.round(numStrict(s.catVer)||0)));
  S2.alertIgnore=arr(s.alertIgnore).filter(x=>typeof x==='string').map(x=>x.slice(0,120)).slice(-300);
  S2.recIgnore=arr(s.recIgnore).filter(x=>typeof x==='string').slice(-300);
  if(s.lastAI&&typeof s.lastAI==='object') S2.lastAI={date:isoDate(s.lastAI.date)||today(),q:str(s.lastAI.q,500),text:str(s.lastAI.text,60000)};
  if(s.newsTab) S2.newsTab=str(s.newsTab,20); if(s.newsCountries) S2.newsCountries=arr(s.newsCountries).filter(x=>typeof x==='string'&&/^[a-z]{2,10}$/.test(x)); if(s.newsHide) S2.newsHide=arr(s.newsHide).filter(x=>typeof x==='string').map(x=>x.slice(0,100));
  o.settings=S2;
  const tax={}; for(const [y,t0] of Object.entries(obj(o.tax))){ if(!/^\d{4}$/.test(y)) continue; const t=obj(t0); const nn=k=>numStrict(t[k])||0;
    const docs=arr(t.docs).map(d=>{ d=obj(d); const f={}; for(const [k,v] of Object.entries(obj(d.fields))){ const n=numStrict(v); if(/^\w{1,30}$/.test(k)&&n!=null) f[k]=n; }
      return {id:cleanId(d.id)||uid(),type:Object.prototype.hasOwnProperty.call(FORM_FIELDS_,d.type)?d.type:'OTHER',payer:str(d.payer,120),acc:d.acc?cleanId(d.acc):null,fields:f,src:str(d.src,200),added:isoDate(d.added)||today()}; });
    const P=obj(t.profile), prof={}; for(const [k,v] of Object.entries(P)){ if(k==='children') continue; if(typeof v==='boolean') prof[k]=v; else { const n=numStrict(v); if(n!=null) prof[k]=n; } }
    prof.children=arr(P.children).map(c=>{ c=obj(c); const by=parseInt(c.by); return {by:by>1900&&by<2200?by:null,ssn:c.ssn!==false,home:c.home!==false}; });
    const rental={}; for(const [pid,ov] of Object.entries(obj(t.rental))){ const r={}; for(const [k,v] of Object.entries(obj(ov))){ const n=numStrict(v); if(/^\w{1,20}$/.test(k)&&n!=null) r[k]=n; } rental[cleanId(pid)]=r; }
    const tt={}; for(const [k,v] of Object.entries(obj(t.ttDone))) if(/^\d{1,3}$/.test(k)) tt[k]=!!v;
    tax[y]={filing:t.filing==='S'?'S':'MFJ',kids:Math.max(0,Math.round(nn('kids'))),docs,profile:prof,rental,ttDone:tt,charity:nn('charity'),estFed:nn('estFed'),estCA:nn('estCA'),otherIncome:nn('otherIncome'),childcareNoted:!!t.childcareNoted}; }
  o.tax=tax;
  o.holdingsHist=arr(o.holdingsHist).map(h=>{ h=obj(h); return {acc:cleanId(h.acc),date:isoDate(h.date),rows:arr(h.rows).map(r=>({sym:str(obj(r).sym,40),value:numStrict(obj(r).value)||0,cost:numStrict(obj(r).cost)}))}; }).filter(h=>h.acc&&h.date);
  o.secret=o.secret&&typeof o.secret.apiKey==='string'&&/^sk-ant-[\w-]+$/.test(o.secret.apiKey)?{apiKey:o.secret.apiKey}:{};
  o.v=1; o.created=typeof o.created==='string'?o.created:new Date().toISOString();
  return o;
}

let S = null; // state
function blankState(){
  return {v:1, accounts:[], snapshots:[], tx:[], rules:[],
          settings:{emergencyMonths:6, lastBackup:null, lastAI:null}, created:new Date().toISOString()};
}
const IDB = {
  db:null, mem:null,
  open(){ return new Promise((res)=>{ try{ const r=indexedDB.open('misfinanzas',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>{this.db=r.result;res(true)}; r.onerror=()=>res(false);}catch(e){res(false)} }); },
  get(k){ if(!this.db) return Promise.resolve(this.mem&&this.mem[k]); return new Promise(res=>{ try{const t=this.db.transaction('kv').objectStore('kv').get(k); t.onsuccess=()=>res(t.result); t.onerror=()=>res(null);}catch(e){res(null)} }); },
  set(k,v){ if(!this.db){ this.mem=this.mem||{}; this.mem[k]=v; return Promise.resolve(true); } return new Promise(res=>{ try{const tx=this.db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); tx.oncomplete=()=>res(true); tx.onerror=tx.onabort=()=>res(false);}catch(e){res(false)} }); }
};
let saveTimer=null;
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ saveTimer=null; persist(); },200); }
function flushSave(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; } return persist(); }

/* ============================================================
   Utilities
   ============================================================ */
const $=(s,r=document)=>r.querySelector(s);
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const fmt=(n,d=0)=>Number.isFinite(n)?(n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const fmtK=n=>{ if(!Number.isFinite(n)) return '—'; const a=Math.abs(n); const s=n<0?'-':''; if(a>=1e6)return s+'$'+(a/1e6).toFixed(a>=1e7?1:2)+'M'; if(a>=1e3)return s+'$'+(a/1e3).toFixed(a>=1e5?0:1)+'k'; return s+'$'+a.toFixed(0);};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MES_={es:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
const MESL_={es:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const mesAbbr=i=>MES_[LANG][i], mesLong=i=>MESL_[LANG][i];
const ym=d=>d.slice(0,7);
const ymLabel=k=>{const [y,m]=k.split('-');return LANG==='en'?mesAbbr(+m-1)+" '"+y.slice(2):mesAbbr(+m-1)+' '+y.slice(2)};
// Fecha corta para tablas: 06/10 (año en curso) o 06/10/25; en inglés, mes/día
const dShort=d=>{ if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(d)) return '—'; const [y,m,dd]=d.slice(0,10).split('-'); const yy=y===today().slice(0,4)?'':'/'+y.slice(2); return (LANG==='en'?`${m}/${dd}`:`${dd}/${m}`)+yy; };
const dLabel=d=>{ if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(d)) return '—'; const [y,m,dd]=d.split('-');return LANG==='en'?`${mesAbbr(+m-1)} ${+dd}, ${y}`:+dd+' '+mesAbbr(+m-1)+' '+y};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const daysBetween=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);}
function num(v){ if(v==null)return NaN; let s=String(v).trim(); if(!s)return NaN; let neg=/^\(.*\)$/.test(s)||/^-/.test(s)||/-$/.test(s); s=s.replace(/[^0-9.,]/g,''); if(/,\d{2}$/.test(s)&&!/\.\d{2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); const n=parseFloat(s); return isNaN(n)?NaN:(neg?-n:n); }
// Devuelve YYYY-MM-DD o null. Formato de EE. UU. (mes/día/año) salvo que el primer número no pueda ser un mes.
function parseDate(s){
  s=String(s||'').trim(); let m; const p2=n=>String(n).padStart(2,'0');
  const ok=(y,mo,d)=>{ y=+y; mo=+mo; d=+d; if(!(mo>=1&&mo<=12&&d>=1&&d<=31&&y>1900&&y<2200)) return null; const dt=new Date(y,mo-1,d); return dt.getMonth()===mo-1?`${y}-${p2(mo)}-${p2(d)}`:null; };
  if(m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)) return ok(m[1],m[2],m[3]);
  if(m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/)){ const y=m[3].length===2?'20'+m[3]:m[3]; let a=+m[1], b=+m[2]; if(a>12&&b<=12) [a,b]=[b,a]; return ok(y,a,b); }
  const d=new Date(s); if(!isNaN(d)&&/[a-z]/i.test(s)) return ok(d.getFullYear(),d.getMonth()+1,d.getDate()); // "Oct 6, 2026": fecha local, sin pasar por UTC
  return null;
}
const acc=id=>S.accounts.find(a=>a.id===id);
function accName(id){const a=acc(id);return a?a.name:'—';}

/* ============================================================
   Domain calculations
   ============================================================ */
function lastSnap(accId, upTo){
  let best=null; for(const s of S.snapshots){ if(s.acc!==accId) continue; if(upTo && s.date>upTo) continue; if(!best||s.date>best.date) best=s; } return best;
}
function balanceOf(a, upTo){ const s=lastSnap(a.id, upTo); return s?s.value:null; }
function netWorthAt(upTo){
  let assets=0, liab=0, any=false;
  for(const a of S.accounts){ const b=balanceOf(a,upTo); if(b==null) continue; any=true; if(KINDS[a.kind].asset) assets+=b; else liab+=b; }
  return any?{assets,liab,net:assets-liab}:null;
}
function monthsRange(n){ const out=[]; const d=new Date(); d.setDate(1); for(let i=n-1;i>=0;i--){ const x=new Date(d.getFullYear(), d.getMonth()-i, 1); out.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')); } return out; }
function monthEnd(k){ const [y,m]=k.split('-').map(Number); const d=new Date(y,m,0); return `${y}-${String(m).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// Hipotecas como coste fijo mensual: cuota + escrow + extra del extracto, cada mes con datos,
// aunque el cargo caiga en otro mes (pago adelantado) o no esté importado.
function fixedMortgages(){
  const out=S.accounts.filter(a=>a.kind==='mortgage'&&mortMonthly(a)>0).map(m=>({id:m.id,cat:mortCat(m),monthly:mortMonthly(m),name:m.name}));
  S.accounts.filter(p=>p.kind==='property'&&p.rental&&p.mortgagePay>0&&!S.accounts.some(m=>m.kind==='mortgage'&&m.propertyId===p.id)).forEach(p=>out.push({id:p.id,cat:'Hipoteca alquiler',monthly:p.mortgagePay,name:p.name}));
  return out;
}
function cashflowByMonth(){
  const fixed=fixedMortgages(); const fixedCats=new Set(fixed.map(f=>f.cat));
  const map={};
  for(const t of S.tx){ const k=ym(t.date); const ty=catType(t.cat); if(ty==='neutral') continue; map[k]=map[k]||{income:0,expense:0,cats:{}};
    if(ty==='income'){ map[k].income+=t.amount; continue; }
    if(fixedCats.has(t.cat)) continue; // se cuenta abajo como cuota fija
    map[k].expense+=-t.amount; map[k].cats[t.cat]=(map[k].cats[t.cat]||0)+(-t.amount); }
  for(const k of Object.keys(map)) for(const f of fixed){ map[k].expense+=f.monthly; map[k].cats[f.cat]=(map[k].cats[f.cat]||0)+f.monthly; }
  return map;
}
function txMonths(){ return [...new Set(S.tx.map(t=>ym(t.date)))].sort(); }
function amortize(balance, ratePct, payment, extra, maxN=600){
  const r=ratePct/100/12; let b=balance, n=0, interest=0; const pts=[{n:0,b}];
  if(payment<=b*r) return {n:Infinity, interest:Infinity, pts};
  while(b>0.005 && n<maxN){ const i=Math.round(b*r*100)/100; let p=payment+extra-i; if(p>b)p=b; b-=p; interest+=i; n++; pts.push({n,b}); }
  return {n, interest, pts};
}
function addMonths(dateStr, n){ const d=new Date(dateStr+'T12:00:00'); d.setDate(1); d.setMonth(d.getMonth()+n); return mesLong(d.getMonth())+' '+d.getFullYear(); }
function nextPaymentDate(m){ return m.nextDue || today(); }
// Las reglas se compilan una vez y se recompilan si cambia la lista (r.cat se lee en vivo, por si se renombra una categoría)
let RULES_C={arr:null,len:-1,list:[]};
function compiledRules(){ if(RULES_C.arr!==S.rules||RULES_C.len!==S.rules.length){ RULES_C={arr:S.rules,len:S.rules.length,list:S.rules.map(r=>{ try{ return {r,re:new RegExp(r.pattern,'i')}; }catch(e){ return null; } }).filter(Boolean)}; } return RULES_C.list; }

/* ============================================================
   Conciliación entre cuentas
   Empareja los movimientos que son la misma operación vista desde dos cuentas
   (pago de tarjeta, transferencia propia, cuota de hipoteca), corrige su categoría
   para no contar dos veces el gasto y comprueba que saldos y movimientos cuadren.
   Cada movimiento emparejado lleva t.rec={type:'card'|'xfer'|'mortgage', acc, with?, prev?, cat?}.
   Si el usuario cambió la categoría a mano (t.manual), no se toca.
   ============================================================ */
const MORT_CATS=['Hipoteca casa','Hipoteca alquiler'];
const CARD_PAY_RE=/PAYMENT|PYMT|PMT|AUTOPAY|AUTO PAY|THANK YOU|EPAY|CRCARDPMT|PAGO/i;
const CARD_HINT_RE=/CARD|CRD|AMEX|AMERICAN EXPRESS|DISCOVER|CAPITAL ONE|CITI|VISA|MASTERCARD|EPAY|AUTOPAY|CRCARDPMT/i;
const XFER_RE=/TRANSFER|XFER|TRANSF|ONLINE|FROM |TO |SAVINGS|CHECKING|ZELLE|INTERNAL|MOBILE/i;
const MORT_RE=/MORTGAGE|MTG|MTGE|HOME LOAN|LOAN PMT|LOAN PAYMENT|HIPOTECA/i;
const r2=x=>Math.round(x*100)/100;
function mortCat(m){ return isRentalMortgage(m)?'Hipoteca alquiler':'Hipoteca casa'; }
function mortMonthly(m){ return r2((m.payment||0)+(m.escrow||0)+(m.extra||0)); }
function instWord(a){ const w=String(a&&a.institution||'').toUpperCase().match(/[A-Z0-9]{3,}/); return w?w[0]:null; }
function mentions(t,a){ if(!a) return false; const D=' '+String(t.desc||'').toUpperCase()+' '; const w=instWord(a); if(w&&D.includes(w)) return true; return !!(a.last4&&a.last4.length===4&&new RegExp('\\D'+a.last4+'\\D').test(D)); }
function hashKey(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
let REC=null;
function lastRec(){ return REC||reconcile(); }
function reconcile(){
  if(!S) return null;
  const sig=()=>S.tx.map(t=>t.cat+(t.rec?'|'+t.rec.type+t.rec.acc+(t.rec.with||''):'')).join(',');
  const before=sig();
  const cashIds=new Set(S.accounts.filter(a=>a.kind==='cash').map(a=>a.id));
  const cardIds=new Set(S.accounts.filter(a=>a.kind==='credit').map(a=>a.id));
  const byId={}; S.tx.forEach(t=>byId[t.id]=t);
  // 1) Deshacer los emparejamientos anteriores (devolviendo la categoría que tenían)
  for(const t of S.tx){ if(!t.rec) continue; if(!t.manual&&t.rec.cat&&t.cat===t.rec.cat&&t.rec.prev) t.cat=t.rec.prev; delete t.rec; }
  const link=(t,rec,cat)=>{ t.rec=rec; if(cat&&!t.manual&&t.cat!==cat){ rec.prev=t.cat; rec.cat=cat; t.cat=cat; } };
  const used=new Set(); const stats={card:0,xfer:0,mort:0};
  // 2) Pagos de tarjeta y transferencias: salida en una cuenta = entrada en otra, mismo importe, ±días
  const inAcc=t=>t.acc&&(cashIds.has(t.acc)||cardIds.has(t.acc));
  const byAmt={}; S.tx.forEach(t=>{ if(t.amount>0&&inAcc(t)){ const k=Math.round(t.amount*100); (byAmt[k]=byAmt[k]||[]).push(t); } });
  const cand=[];
  for(const o of S.tx){ if(!(o.amount<0&&inAcc(o))) continue; const list=byAmt[Math.round(-o.amount*100)]; if(!list) continue;
    for(const i of list){ if(i.acc===o.acc) continue; const dd=daysBetween(o.date,i.date); if(dd<-3||dd>7) continue;
      if(catType(i.cat)==='income'&&i.cat!=='Otros ingresos') continue; // nómina, renta… no son transferencias
      let score=10-Math.abs(dd); const toCard=cardIds.has(i.acc);
      if(toCard){ const card=acc(i.acc); if(!(CARD_PAY_RE.test(i.desc)||mentions(o,card)||CARD_HINT_RE.test(o.desc)||o.cat==='Pago tarjeta')) continue; if(mentions(o,card)) score+=5; if(CARD_PAY_RE.test(i.desc)) score+=2; }
      else { if(!(XFER_RE.test(o.desc)||XFER_RE.test(i.desc)||o.cat==='Transferencia'||i.cat==='Transferencia')) continue; if(mentions(o,acc(i.acc))||mentions(i,acc(o.acc))) score+=5; }
      cand.push({o,i,score,type:toCard?'card':'xfer'}); } }
  cand.sort((a,b)=>b.score-a.score);
  for(const c of cand){ if(used.has(c.o.id)||used.has(c.i.id)) continue; used.add(c.o.id); used.add(c.i.id);
    const cat=c.type==='card'?'Pago tarjeta':'Transferencia';
    link(c.o,{type:c.type,acc:c.i.acc,with:c.i.id},cat); link(c.i,{type:c.type,acc:c.o.acc,with:c.o.id},cat); stats[c.type]++; }
  // 3) Cuotas de hipoteca pagadas desde las cuentas de banco: por importe exacto y/o nombre de la entidad
  const morts=S.accounts.filter(a=>a.kind==='mortgage'&&mortMonthly(a)>0);
  const mres={}; morts.forEach(m=>mres[m.id]={pays:[],accs:new Set()});
  if(morts.length) for(const t of S.tx){ if(!(t.amount<0&&t.acc&&cashIds.has(t.acc)&&!used.has(t.id))) continue; const a=-t.amount; let best=null;
    for(const m of morts){ const exp=mortMonthly(m); const exact=[exp,r2((m.payment||0)+(m.escrow||0))].some(v=>Math.abs(a-v)<0.015);
      const named=mentions(t,m)||MORT_RE.test(t.desc)||MORT_CATS.includes(t.cat); const near=Math.abs(a-exp)/exp;
      let sc=0; if(exact&&named) sc=100; else if(exact&&a>=300) sc=60; else if(named&&near<=0.25) sc=40-near*100;
      if(sc>0&&(!best||sc>best.sc)) best={m,sc}; }
    if(best){ used.add(t.id); link(t,{type:'mortgage',acc:best.m.id},mortCat(best.m)); mres[best.m.id].pays.push(t); mres[best.m.id].accs.add(t.acc); stats.mort++; } }
  // 4) Comprobaciones
  const issues=[]; const ign=new Set(S.settings.recIgnore||[]);
  const add=(key,lvl,t,det,acts)=>{ if(!ign.has(key)) issues.push({key,lvl,t,det,acts}); };
  const line=t=>`${dLabel(t.date)} · ${esc(t.desc)} · ${fmt(t.amount,2)} · ${esc(accName(t.acc))}`;
  const cutoff=new Date(Date.now()-365*864e5).toISOString().slice(0,10);
  const span=ids=>{ const ds=S.tx.filter(t=>ids.has(t.acc)).map(t=>t.date).sort(); return ds.length?[ds[0],ds[ds.length-1]]:null; };
  // 4a) Pagos de tarjeta desde el banco sin la tarjeta correspondiente
  const lone=S.tx.filter(t=>t.acc&&cashIds.has(t.acc)&&t.cat==='Pago tarjeta'&&!t.rec&&t.date>=cutoff).sort((a,b)=>b.date.localeCompare(a.date));
  if(lone.length){ const tot=lone.reduce((s,t)=>s-t.amount,0);
    add('cardpay:'+hashKey(lone.map(t=>t.id).join()),'warn',L(`<b>${lone.length} pago${lone.length>1?'s':''} de tarjeta (${fmt(tot)}) sin sus movimientos.</b> Los pagos a la tarjeta no cuentan como gasto, así que si no importas los movimientos de esa tarjeta, sus compras no aparecen en tus gastos. Importa su CSV o PDF del mismo periodo.`,`<b>${lone.length} card payment${lone.length>1?'s':''} (${fmt(tot)}) without the card's transactions.</b> Card payments don't count as spending, so if you don't import that card's transactions, its purchases won't show up in your expenses. Import its CSV or PDF for the same period.`),lone.slice(0,20).map(line)); }
  // 4b) Pagos recibidos en la tarjeta sin el cargo en el banco (cuando el banco sí cubre esas fechas)
  const cs=span(cashIds);
  if(cs){ const orph=S.tx.filter(t=>t.acc&&cardIds.has(t.acc)&&t.amount>0&&!t.rec&&(t.cat==='Pago tarjeta'||CARD_PAY_RE.test(t.desc))&&t.date>=cs[0]&&t.date<=cs[1]);
    if(orph.length) add('cardorph:'+hashKey(orph.map(t=>t.id).join()),'info',L(`<b>${orph.length} pago${orph.length>1?'s':''} a tus tarjetas sin el cargo en el banco.</b> Probablemente se pagaron desde una cuenta que no has importado, o el importe no coincide.`,`<b>${orph.length} payment${orph.length>1?'s':''} to your cards without the matching bank debit.</b> They were probably paid from an account you haven't imported, or the amount doesn't match.`),orph.slice(0,20).map(line)); }
  // 4c) Hipotecas: cuotas que faltan y cuota distinta de la del extracto
  for(const m of morts){ const r=mres[m.id]; const exp=mortMonthly(m); r.exp=exp;
    const ps=r.pays.slice().sort((a,b)=>a.date.localeCompare(b.date)); r.last=ps[ps.length-1]||null;
    if(!ps.length) continue; const sp=span(r.accs); const gaps=[];
    const pts=[sp[0],...ps.map(t=>t.date),sp[1]];
    for(let i=1;i<pts.length;i++){ const d=daysBetween(pts[i-1],pts[i]); const lim=(i===1||i===pts.length-1)?40:45; if(d>lim){ const n=Math.round(d/30.4); gaps.push({a:pts[i-1],b:pts[i],t:L(`Entre el ${dLabel(pts[i-1])} y el ${dLabel(pts[i])} (${n} mes${n>1?'es':''})`,`Between ${dLabel(pts[i-1])} and ${dLabel(pts[i])} (${n} month${n>1?'s':''})`)}); } }
    if(gaps.length) add('mgap:'+m.id+':'+hashKey(gaps.map(g=>g.a+g.b).join()),'warn',L(`<b>${esc(m.name)}: no encuentro ${gaps.length>1?'algunas cuotas':'una cuota'} en tus cuentas.</b> Puede que esos meses se pagara desde otra cuenta o que falte importar movimientos. Para el gasto mensual se cuenta igualmente la cuota fija de ${fmt(exp,2)}.`,`<b>${esc(m.name)}: I can't find ${gaps.length>1?'some payments':'a payment'} in your accounts.</b> Those months may have been paid from another account, or some transactions haven't been imported. Monthly spending still counts the fixed payment of ${fmt(exp,2)}.`),gaps.map(g=>g.t));
    const LP=r.last; const paid=-LP.amount;
    if(Math.abs(paid-exp)>1&&Math.abs(paid-r2((m.payment||0)+(m.escrow||0)))>1) add('mamt:'+m.id+':'+LP.id,'warn',L(`<b>${esc(m.name)}: la última cuota pagada (${fmt(paid,2)} el ${dLabel(LP.date)}) no coincide con la del extracto (${fmt(exp,2)} = cuota ${fmt(m.payment||0,2)}${m.escrow?' + escrow '+fmt(m.escrow,2):''}${m.extra?' + extra '+fmt(m.extra,2):''}).</b> Si cambió el escrow o el pago extra, importa el último extracto o edita la hipoteca.`,`<b>${esc(m.name)}: the last payment (${fmt(paid,2)} on ${dLabel(LP.date)}) doesn't match the statement (${fmt(exp,2)} = payment ${fmt(m.payment||0,2)}${m.escrow?' + escrow '+fmt(m.escrow,2):''}${m.extra?' + extra '+fmt(m.extra,2):''}).</b> If the escrow or the extra payment changed, import the latest statement or edit the mortgage.`)); }
  // 4d) Saldo de la hipoteca entre dos extractos frente a lo que debería haber bajado
  for(const m of S.accounts.filter(a=>a.kind==='mortgage')){ const sn=S.snapshots.filter(s=>s.acc===m.id).sort((a,b)=>a.date.localeCompare(b.date));
    for(let i=1;i<sn.length;i++){ const s1=sn[i-1], s2=sn[i]; const k=Math.round(daysBetween(s1.date,s2.date)/30.44); if(k<1||k>3) continue;
      const rate=s1.rate??m.rate, pi=s1.pi??m.payment, ex=s1.extra??m.extra??0; if(!rate||!pi) continue;
      let b=s1.value; for(let j=0;j<k&&b>0;j++){ const int=r2(b*rate/1200); b=Math.max(0,r2(b-(pi+ex-int))); }
      const diff=r2(s2.value-b); if(Math.abs(diff)<=5) continue;
      add('mbal:'+s2.id+':'+s2.value,s2.value>s1.value?'crit':'warn',L(`<b>${esc(m.name)}: el saldo no cuadra entre extractos.</b> Del ${dLabel(s1.date)} (${fmt(s1.value,2)}) al ${dLabel(s2.date)} (${fmt(s2.value,2)}) debería haber bajado a unos ${fmt(b,2)} con ${k} cuota${k>1?'s':''} de ${fmt(pi,2)} + ${fmt(ex,2)} extra. Diferencia: ${fmt(Math.abs(diff),2)} ${diff>0?'más de lo esperado (¿cuota no aplicada, extra menor o algún cargo?)':'menos de lo esperado (¿pago extra mayor?)'}.`,`<b>${esc(m.name)}: the balance doesn't add up between statements.</b> From ${dLabel(s1.date)} (${fmt(s1.value,2)}) to ${dLabel(s2.date)} (${fmt(s2.value,2)}) it should have dropped to about ${fmt(b,2)} with ${k} payment${k>1?'s':''} of ${fmt(pi,2)} + ${fmt(ex,2)} extra. Difference: ${fmt(Math.abs(diff),2)} ${diff>0?'more than expected (payment not applied, smaller extra or a fee?)':'less than expected (larger extra payment?)'}.`)); } }
  // 4e) Bancos y tarjetas: el cambio de saldo entre dos extractos debe ser la suma de los movimientos
  for(const a of S.accounts.filter(x=>x.kind==='cash'||x.kind==='credit')){ const txs=S.tx.filter(t=>t.acc===a.id); if(!txs.length) continue;
    const ds=txs.map(t=>t.date).sort(); const sn=S.snapshots.filter(s=>s.acc===a.id).sort((x,y)=>x.date.localeCompare(y.date));
    for(let i=1;i<sn.length;i++){ const s1=sn[i-1], s2=sn[i]; if(daysBetween(s1.date,ds[0])>7||daysBetween(ds[ds.length-1],s2.date)>7) continue; // los movimientos deben cubrir el periodo
      const inR=txs.filter(t=>t.date>s1.date&&t.date<=s2.date); if(!inR.length) continue;
      const sum=r2(inR.reduce((s,t)=>s+t.amount,0)); const delta=r2((s2.value-s1.value)*(a.kind==='credit'?-1:1)); const diff=r2(delta-sum); if(Math.abs(diff)<=1) continue;
      add('bal:'+s2.id+':'+hashKey(String(s1.value)+s2.value+sum),'warn',L(`<b>${esc(a.name)}: saldo y movimientos no cuadran.</b> Del ${dLabel(s1.date)} al ${dLabel(s2.date)} el saldo ${a.kind==='credit'?'pendiente ':''}pasó de ${fmt(s1.value,2)} a ${fmt(s2.value,2)}, pero los ${inR.length} movimientos suman ${fmt(sum*(a.kind==='credit'?-1:1),2)}. Diferencia: ${fmt(Math.abs(diff),2)}. ${diff<0?'Puede que algún movimiento esté duplicado':'Puede que falte algún movimiento'}, o que uno cerca de la fecha de cierre esté en otro periodo.`,`<b>${esc(a.name)}: balance and transactions don't match.</b> From ${dLabel(s1.date)} to ${dLabel(s2.date)} the ${a.kind==='credit'?'amount owed':'balance'} went from ${fmt(s1.value,2)} to ${fmt(s2.value,2)}, but the ${inR.length} transactions add up to ${fmt(sum*(a.kind==='credit'?-1:1),2)}. Difference: ${fmt(Math.abs(diff),2)}. ${diff<0?'A transaction may be duplicated':'A transaction may be missing'}, or one near the closing date may be in another period.`)); } }
  // 4f) Posibles duplicados: misma cuenta e importe, ±3 días, importados de fuentes distintas (CSV y PDF)
  const groups={}; S.tx.forEach(t=>{ if(!t.acc) return; const k=t.acc+'|'+Math.round(t.amount*100); (groups[k]=groups[k]||[]).push(t); });
  const norm=s=>String(s||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,12);
  for(const g of Object.values(groups)){ if(g.length<2) continue; g.sort((a,b)=>a.date.localeCompare(b.date));
    for(let i=0;i<g.length;i++) for(let j=i+1;j<g.length;j++){ const x=g[i], y=g[j]; if(daysBetween(x.date,y.date)>3) break; if(x.st&&x.st===y.st) continue;
      if(!((x.src&&y.src&&x.src!==y.src&&x.src!=='manual'&&y.src!=='manual')||(x.date===y.date&&norm(x.desc)===norm(y.desc)))) continue;
      const dupe=(y.src==='pdf'||x.src!=='pdf')?y:x;
      add('dup:'+[x.id,y.id].sort().join(':'),'warn',L(`<b>Posible movimiento duplicado</b> en ${esc(accName(x.acc))}: ${fmt(x.amount,2)} el ${dLabel(x.date)}${x.date!==y.date?' y el '+dLabel(y.date):''} (${esc(x.desc)} / ${esc(y.desc)}).`,`<b>Possible duplicate transaction</b> in ${esc(accName(x.acc))}: ${fmt(x.amount,2)} on ${dLabel(x.date)}${x.date!==y.date?' and '+dLabel(y.date):''} (${esc(x.desc)} / ${esc(y.desc)}).`),null,[{id:'del:'+dupe.id,l:L('Borrar el duplicado','Delete the duplicate'),cls:'dan'}]); } }
  const order={crit:0,warn:1,info:2}; issues.sort((a,b)=>order[a.lvl]-order[b.lvl]);
  REC={stats,issues,mort:mres,changed:sig()!==before};
  return REC;
}
function recLabel(t){ if(!t.rec) return ''; const o=accName(t.rec.acc); return t.rec.type==='mortgage'?L(`↔ cuota de ${o}`,`↔ payment of ${o}`):t.rec.type==='card'?(t.amount<0?L(`↔ pago a ${o}`,`↔ payment to ${o}`):L(`↔ pagado desde ${o}`,`↔ paid from ${o}`)):(t.amount<0?L(`↔ a ${o}`,`↔ to ${o}`):L(`↔ desde ${o}`,`↔ from ${o}`)); }
function recHTML(R){
  const s=R.stats; const pl=(n,a,b)=>n+' '+(n===1?a:b);
  const ic={good:'✓',warn:'!',crit:'!',info:'i'};
  return L(`<p class="sub">Emparejados entre cuentas: ${pl(s.card,'pago de tarjeta','pagos de tarjeta')}, ${pl(s.xfer,'transferencia','transferencias')} y ${pl(s.mort,'cuota','cuotas')} de hipoteca.</p>`,`<p class="sub">Matched across accounts: ${pl(s.card,'card payment','card payments')}, ${pl(s.xfer,'transfer','transfers')} and ${pl(s.mort,'mortgage payment','mortgage payments')}.</p>`)+
   (R.issues.length?R.issues.map(i=>`<div class="alert ${i.lvl}"><span class="ic">${ic[i.lvl]}</span><div style="flex:1">${i.t}${i.det&&i.det.length?`<details style="margin-top:4px"><summary>${L('Ver detalle','Details')} (${i.det.length})</summary>${i.det.map(d=>`<div class="muted">${d}</div>`).join('')}</details>`:''}<div class="row" style="margin-top:6px;justify-content:flex-start">${(i.acts||[]).map(a=>`<button class="sm ${a.cls||''}" data-ract="${esc(a.id)}">${a.l}</button>`).join('')}<button class="sm" data-rign="${esc(i.key)}">${i.key.startsWith('dup:')?L('No es duplicado','Not a duplicate'):L('Ignorar','Ignore')}</button></div></div></div>`).join('')
   :L('<div class="alert good"><span class="ic">✓</span><div><b>Todo cuadra.</b> No hay diferencias entre tus cuentas.</div></div>','<div class="alert good"><span class="ic">✓</span><div><b>Everything adds up.</b> No differences between your accounts.</div></div>'));
}
function wireRec(el){
  el.querySelectorAll('[data-rign]').forEach(b=>b.onclick=()=>{ S.settings.recIgnore=(S.settings.recIgnore||[]).concat(b.dataset.rign).slice(-300); save(); route(); });
  el.querySelectorAll('[data-ract]').forEach(b=>b.onclick=()=>{ const [k,id]=b.dataset.ract.split(':'); if(k==='del'){ S.tx=S.tx.filter(x=>x.id!==id); save(); toast(L('Duplicado borrado','Duplicate deleted')); route(); } });
}

/* ============================================================
   Charts — hand-built SVG with hover tooltips
   ============================================================ */
const tip=$('#tip');
function showTip(html, x, y){ tip.innerHTML=html; tip.style.opacity=1; const w=tip.offsetWidth, h=tip.offsetHeight; let L=x+14, T=y-h-10; if(L+w>window.innerWidth-8) L=x-w-14; if(T<8) T=y+14; tip.style.left=L+window.scrollX+'px'; tip.style.top=T+window.scrollY+'px'; tip.style.position='absolute'; }
function hideTip(){ tip.style.opacity=0; }
function niceTicks(min,max,count=4){ if(min===max){max=min+1;} const span=max-min; const step0=span/count; const mag=Math.pow(10,Math.floor(Math.log10(step0))); const f=step0/mag; const step=(f<1.5?1:f<3?2:f<7?5:10)*mag; const lo=Math.floor(min/step)*step, hi=Math.ceil(max/step)*step; const t=[]; for(let v=lo; v<=hi+step/2; v+=step) t.push(+v.toFixed(10)); return t; }

function lineChart(el, {labels, series, height=220, yFmt=fmtK, tipLabel=l=>l, zero=false}){
  el.classList.add('chart');
  const W=Math.max(el.clientWidth||600, 280), H=height, P={l:52,r:14,t:10,b:24};
  const vals=series.flatMap(s=>s.values.filter(v=>v!=null));
  if(!vals.length){ el.innerHTML=`<div class="empty">${L('Sin datos todavía','No data yet')}</div>`; return; }
  let mn=Math.min(...vals), mx=Math.max(...vals); if(zero) mn=Math.min(0,mn); const pad=(mx-mn)*0.08||Math.abs(mx)*0.1||1; if(!zero) mn-=pad; mx+=pad;
  const ticks=niceTicks(mn,mx); mn=ticks[0]; mx=ticks[ticks.length-1];
  const X=i=>P.l+(labels.length===1?(W-P.l-P.r)/2:i*(W-P.l-P.r)/(labels.length-1)); const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  let s=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img"><g class="grid">`;
  ticks.forEach(t=>{ s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${P.l-8}" y="${Y(t)+4}" text-anchor="end">${yFmt(t)}</text>`; });
  s+='</g>';
  const every=Math.ceil(labels.length/Math.max(2,Math.floor((W-P.l)/70)));
  labels.forEach((l,i)=>{ if(i%every===0||i===labels.length-1) s+=`<text x="${X(i)}" y="${H-6}" text-anchor="middle">${esc(l)}</text>`; });
  series.forEach(se=>{ let d='',pen=false; se.values.forEach((v,i)=>{ if(v==null){pen=false;return;} d+=(pen?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1); pen=true; });
    if(se.area){ const idx=se.values.map((v,i)=>v==null?-1:i).filter(i=>i>=0); if(idx.length>1&&idx[idx.length-1]-idx[0]===idx.length-1) s+=`<path d="${d}L${X(idx[idx.length-1]).toFixed(1)} ${Y(mn).toFixed(1)}L${X(idx[0]).toFixed(1)} ${Y(mn).toFixed(1)}Z" fill="${se.color}" opacity=".10"/>`; } s+=`<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${se.dash?'stroke-dasharray="5 4"':''}/>`;
    se.values.forEach((v,i)=>{ if(v!=null&&se.values[i-1]==null&&se.values[i+1]==null) s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${se.color}"/>`; }); });
  s+=`<line class="xh" x1="0" x2="0" y1="${P.t}" y2="${H-P.b}" stroke="var(--muted)" stroke-width="1" opacity="0"/>`;
  series.forEach((se,k)=>{ s+=`<circle class="dot${k}" r="4.5" fill="${se.color}" stroke="var(--surface)" stroke-width="2" opacity="0"/>`; });
  s+=`<rect x="${P.l}" y="0" width="${W-P.l-P.r}" height="${H}" fill="transparent" class="hit"/></svg>`;
  el.innerHTML=s;
  const svg=el.querySelector('svg'), xh=svg.querySelector('.xh');
  const move=e=>{ const r=svg.getBoundingClientRect(); const px=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const sx=px*W/r.width; let i=Math.round((sx-P.l)/((W-P.l-P.r)/Math.max(1,labels.length-1))); i=Math.max(0,Math.min(labels.length-1,i));
    xh.setAttribute('x1',X(i)); xh.setAttribute('x2',X(i)); xh.setAttribute('opacity',1);
    let h=`<b>${esc(tipLabel(labels[i]))}</b>`; series.forEach((se,k)=>{ const c=svg.querySelector('.dot'+k); const v=se.values[i]; if(v==null){c.setAttribute('opacity',0);return;} c.setAttribute('cx',X(i)); c.setAttribute('cy',Y(v)); c.setAttribute('opacity',1); h+=`<br><span class="k" style="background:${se.color}"></span>${esc(se.name)}: ${fmt(v)}`; });
    showTip(h,(e.touches?e.touches[0].clientX:e.clientX),(e.touches?e.touches[0].clientY:e.clientY)); };
  const out=()=>{ xh.setAttribute('opacity',0); series.forEach((se,k)=>svg.querySelector('.dot'+k).setAttribute('opacity',0)); hideTip(); };
  const hit=svg.querySelector('.hit'); hit.addEventListener('mousemove',move); hit.addEventListener('touchstart',move,{passive:true}); hit.addEventListener('touchmove',move,{passive:true}); hit.addEventListener('mouseleave',out); hit.addEventListener('touchend',()=>setTimeout(out,1500));
}

function barChart(el,{labels, series, height=220, yFmt=fmtK, tipLabel=l=>l}){
  el.classList.add('chart');
  const W=Math.max(el.clientWidth||600,280), H=height, P={l:52,r:8,t:10,b:24};
  const vals=series.flatMap(s=>s.values); if(!vals.length||vals.every(v=>!v)){ el.innerHTML=`<div class="empty">${L('Sin movimientos todavía','No transactions yet')}</div>`; return; }
  const ticks=niceTicks(Math.min(0,...vals),Math.max(0,...vals)); const mn=ticks[0], mx=ticks[ticks.length-1];
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  const gw=(W-P.l-P.r)/labels.length; const n=series.length; const bw=Math.max(4,Math.min(26,(gw*0.72-(n-1)*2)/n));
  let s=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img"><g class="grid">`;
  ticks.forEach(t=>{ s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${P.l-8}" y="${Y(t)+4}" text-anchor="end">${yFmt(t)}</text>`; }); s+='</g>';
  const every=Math.ceil(labels.length/Math.max(2,Math.floor((W-P.l)/52)));
  labels.forEach((l,i)=>{ const cx=P.l+gw*i+gw/2; const x0=cx-(n*bw+(n-1)*2)/2;
    series.forEach((se,k)=>{ const v=se.values[i]||0; if(!v) return; const x=x0+k*(bw+2); const y1=Y(Math.max(v,0)), y2=Y(Math.min(v,0)); const h=Math.max(1,y2-y1); const r=Math.min(4,bw/2,h);
      const path = v>=0 ? `M${x} ${y2}V${y1+r}Q${x} ${y1} ${x+r} ${y1}H${x+bw-r}Q${x+bw} ${y1} ${x+bw} ${y1+r}V${y2}Z` : `M${x} ${y1}V${y2-r}Q${x} ${y2} ${x+r} ${y2}H${x+bw-r}Q${x+bw} ${y2} ${x+bw} ${y2-r}V${y1}Z`;
      s+=`<path d="${path}" fill="${se.color}"/>`; });
    s+=`<rect x="${P.l+gw*i}" y="0" width="${gw}" height="${H-P.b}" fill="transparent" data-i="${i}" class="hit"/>`;
    if(i%every===0) s+=`<text x="${cx}" y="${H-6}" text-anchor="middle">${esc(l)}</text>`; });
  s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--muted)" stroke-width="1"/></svg>`;
  el.innerHTML=s;
  el.querySelectorAll('.hit').forEach(r=>{ const f=e=>{ const i=+r.dataset.i; let h=`<b>${esc(tipLabel(labels[i]))}</b>`; series.forEach(se=>h+=`<br><span class="k" style="background:${se.color}"></span>${esc(se.name)}: ${fmt(se.values[i]||0)}`); showTip(h,(e.touches?e.touches[0].clientX:e.clientX),(e.touches?e.touches[0].clientY:e.clientY)); r.setAttribute('fill','rgba(128,128,128,.08)'); };
    r.addEventListener('mousemove',f); r.addEventListener('touchstart',f,{passive:true}); r.addEventListener('mouseleave',()=>{hideTip();r.setAttribute('fill','transparent')}); r.addEventListener('touchend',()=>setTimeout(()=>{hideTip();r.setAttribute('fill','transparent')},1500)); });
}
function hbars(items, color='var(--s1)'){
  if(!items.length) return `<div class="empty">${L('Sin datos','No data')}</div>`;
  const mx=Math.max(...items.map(i=>i.v));
  return '<div class="hb">'+items.map(i=>`<div>${esc(i.k)}</div><div class="bar"><span style="width:${(i.v/mx*100).toFixed(1)}%;background:${i.c||color}"></span></div><div class="v">${fmt(i.v)}${i.note?` <span class="muted">${i.note}</span>`:''}</div>`).join('')+'</div>';
}
function legend(items){ return '<div class="legend">'+items.map(i=>`<span><i style="background:${i.c}${i.dash?';height:2px;border-radius:0;vertical-align:3px':''}"></i>${esc(i.n)}</span>`).join('')+'</div>'; }

/* ============================================================
   Alerts — computed locally
   ============================================================ */
function computeAlerts(){
  const A=[];
  if(!S.accounts.length){ A.push({lvl:'info',key:'start',go:{h:'cuentas'},t:L('<b>Empieza importando un extracto</b> de cada cuenta en <a href="#cuentas">Cuentas</a>: la app crea la cuenta a partir del documento.','<b>Start by importing a statement</b> of each account in <a href="#cuentas">Accounts</a>: the app creates the account from the document.')}); return A; }
  const lb=S.settings.lastBackup;
  if(!lb && (S.tx.length||S.snapshots.length) ) A.push({lvl:'crit',key:'nobk',go:{h:'ajustes'},t:L('<b>No tienes copia de seguridad.</b> Los datos solo viven en este navegador: si se borra, se pierden. Haz una en "Copia y ajustes".','<b>You have no backup.</b> Your data only lives in this browser: if it is cleared, it is lost. Make one in "Backup & settings".')});
  else if(lb && daysBetween(lb,new Date().toISOString())>30){ const d=daysBetween(lb,new Date().toISOString()); A.push({lvl:'warn',key:'oldbk:'+lb,go:{h:'ajustes'},t:L(`<b>Tu última copia tiene ${d} días.</b> Haz una nueva en "Copia y ajustes".`,`<b>Your last backup is ${d} days old.</b> Make a new one in "Backup & settings".`)}); }
  // stale balances
  const stale=S.accounts.filter(a=>{const s=lastSnap(a.id); return !s || daysBetween(s.date,today())>40;});
  if(stale.length) A.push({lvl:'warn',key:'stale:'+hashKey(stale.map(a=>a.id).join()),go:stale.length===1?{h:'cuentas',acc:stale[0].id}:{h:'cuentas'},t:`<b>${L('Saldos por actualizar:','Balances to update:')}</b> ${stale.slice(0,4).map(a=>esc(a.name)).join(', ')}${stale.length>4?L(` y ${stale.length-4} más`,` and ${stale.length-4} more`):''}.`});
  // conciliación entre cuentas
  const RC=lastRec(); const rn=RC?RC.issues.filter(i=>i.lvl!=='info'):[];
  if(rn.length) A.push({lvl:rn.some(i=>i.lvl==='crit')?'crit':'warn',key:'rec:'+hashKey(rn.map(i=>i.key).join()),go:{h:'flujo',el:'recBox'},t:L(`<b>Conciliación: ${rn.length} diferencia${rn.length>1?'s':''} entre tus cuentas.</b> Revísala${rn.length>1?'s':''} en <a href="#flujo">Movimientos</a>.`,`<b>Reconciliation: ${rn.length} difference${rn.length>1?'s':''} between your accounts.</b> Review ${rn.length>1?'them':'it'} in <a href="#flujo">Transactions</a>.`)});
  // cashflow
  const cf=cashflowByMonth(); const ms=Object.keys(cf).sort();
  const cur=ym(today()); const complete=ms.filter(m=>m<cur);
  if(complete.length){ const last=complete[complete.length-1]; const c=cf[last]; const net=c.income-c.expense;
    if(net<0) A.push({lvl:'crit',key:'neg:'+last,go:{h:'flujo',month:last},t:L(`<b>En ${ymLabel(last)} gastaste más de lo que ingresaste</b> (${fmt(net)}).`,`<b>In ${ymLabel(last)} you spent more than you earned</b> (${fmt(net)}).`)});
    else A.push({lvl:'good',key:'save:'+last,go:{h:'flujo',month:last},t:L(`<b>${ymLabel(last)}: ahorraste ${fmt(net)}</b> (${c.income>0?Math.round(net/c.income*100):0}% de tus ingresos).`,`<b>${ymLabel(last)}: you saved ${fmt(net)}</b> (${c.income>0?Math.round(net/c.income*100):0}% of your income).`)});
    const prev=complete.slice(-4,-1);
    if(prev.length>=2){ const cats=Object.keys(c.cats); cats.forEach(k=>{ const avg=prev.reduce((s,m)=>s+(cf[m].cats[k]||0),0)/prev.length; if(avg>150 && c.cats[k]>avg*1.35 && c.cats[k]-avg>150) A.push({lvl:'warn',key:'spike:'+last+':'+k,go:{h:'flujo',month:last,cat:k},t:L(`<b>${esc(catL(k))} subió</b> a ${fmt(c.cats[k])} en ${ymLabel(last)}, frente a una media de ${fmt(avg)}.`,`<b>${esc(catL(k))} went up</b> to ${fmt(c.cats[k])} in ${ymLabel(last)}, against an average of ${fmt(avg)}.`)}); }); }
  }
  // movimientos que la app no supo clasificar
  const unc=S.tx.filter(isUncat); if(unc.length) A.push({lvl:'warn',key:'uncat:'+unc.length,go:{h:'flujo',cat:'__none',el:'txHead'},t:L(`<b>${unc.length} ${unc.length>1?'movimientos':'movimiento'} sin categoría.</b> Toca para revisarlos y asignarles una.`,`<b>${unc.length} uncategorized transaction${unc.length>1?'s':''}.</b> Tap to review them and assign one.`)});
  // emergency fund
  const cash=S.accounts.filter(a=>a.kind==='cash').reduce((s,a)=>s+(balanceOf(a)||0),0);
  const lastN=complete.slice(-3); const avgExp=lastN.length?lastN.reduce((s,m)=>s+cf[m].expense,0)/lastN.length:0;
  if(avgExp>0){ const months=cash/avgExp; const tgt=S.settings.emergencyMonths; if(months<tgt) A.push({lvl:months<3?'crit':'warn',key:'ef:'+ym(today()),go:{h:'cuentas'},t:L(`<b>Fondo de emergencia: ${months.toFixed(1)} meses</b> de gastos en liquidez (objetivo ${tgt}). Te faltan unos ${fmt(tgt*avgExp-cash)}.`,`<b>Emergency fund: ${months.toFixed(1)} months</b> of expenses in cash (target ${tgt}). You're about ${fmt(tgt*avgExp-cash)} short.`)}); else A.push({lvl:'good',key:'efok:'+ym(today()),go:{h:'cuentas'},t:L(`<b>Fondo de emergencia cubierto:</b> ${months.toFixed(1)} meses de gastos en liquidez.`,`<b>Emergency fund covered:</b> ${months.toFixed(1)} months of expenses in cash.`)}); }
  // credit cards
  const cc=S.accounts.filter(a=>a.kind==='credit'&&(balanceOf(a)||0)>0);
  cc.forEach(a=>{ if(a.apr && a.apr>0) A.push({lvl:'warn',key:'apr:'+a.id+':'+ym(today()),go:{h:'cuentas',acc:a.id},t:L(`<b>${esc(a.name)}</b> tiene ${fmt(balanceOf(a))} pendientes al ${a.apr}% APR. Pagarla entera cada mes evita intereses.`,`<b>${esc(a.name)}</b> has ${fmt(balanceOf(a))} outstanding at ${a.apr}% APR. Paying it in full every month avoids interest.`)}); });
  // rental
  S.accounts.filter(a=>a.kind==='property'&&a.rental).forEach(p=>{ const r=rentalPL(p); if(r.net<0) A.push({lvl:'warn',key:'rent:'+p.id+':'+Math.round(r.net),go:{h:'alquiler'},t:L(`<b>${esc(p.name)}</b> pierde unos ${fmt(-r.net)} al mes con las cifras configuradas.`,`<b>${esc(p.name)}</b> loses about ${fmt(-r.net)} a month with the configured figures.`)}); });
  const ign=new Set(S.settings.alertIgnore||[]); A.forEach(a=>{ a.ignored=!!(a.key&&ign.has(a.key)); });
  return A;
}
// Avisos: tocar uno lleva a donde hay que decidir; la × lo ignora (vuelve si la situación cambia)
function alertsHTML(A){ const IC={good:'✓',warn:'!',crit:'!',info:'i'}; return A.map((a,i)=>`<div class="alert ${a.lvl}${a.go?' act':''}"><span class="ic">${IC[a.lvl]}</span>${a.go?`<button class="ab" data-ago="${i}"><span>${a.t.replace(/<\/?a\b[^>]*>/g,'')}</span>${ic('right','chev')}</button>`:`<div style="flex:1">${a.t}</div>`}${a.key?`<button class="ax" data-aign="${esc(a.key)}" title="${L('Ignorar','Ignore')}" aria-label="${L('Ignorar este aviso','Ignore this alert')}">${ic('close')}</button>`:''}</div>`).join(''); }
function goAlert(go){ if(!go) return;
  if(go.h==='flujo'){ flujoFilter.month=go.month||'all'; flujoFilter.cat=go.cat||'all'; flujoFilter.q=''; flujoFilter.limit=200; }
  const after=()=>{ if(go.acc&&acc(go.acc)) accountSheet(go.acc); if(go.el){ const e=document.getElementById(go.el); if(e) window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-70); } };
  if(location.hash==='#'+go.h) route(); else { location.hash='#'+go.h; } setTimeout(after,60); }
function wireAlerts(root,A,refresh){
  root.querySelectorAll('[data-ago]').forEach(b=>b.onclick=()=>goAlert(A[+b.dataset.ago].go));
  root.querySelectorAll('[data-aign]').forEach(b=>b.onclick=()=>{ const k=b.dataset.aign; S.settings.alertIgnore=(S.settings.alertIgnore||[]).filter(x=>x!==k).concat(k).slice(-300); save(); toast(L('Aviso ignorado','Alert ignored')); refresh(); });
  const r=root.querySelector('#aRestore'); if(r) r.onclick=()=>{ const ks=new Set(A.filter(a=>a.ignored).map(a=>a.key)); S.settings.alertIgnore=(S.settings.alertIgnore||[]).filter(x=>!ks.has(x)); save(); refresh(); }; }

/* ============================================================
   Views
   ============================================================ */
const VIEWS={};
function route(){ if(!S) return; const h=(location.hash||'#resumen').slice(1); const v=Object.prototype.hasOwnProperty.call(VIEWS,h)?h:'resumen';
  const on=NAV_PARENT[v]||v; document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+on)); hideTip(); menuOpen(false);
  if(NAV_MORE.some(x=>x[0]===on)&&$('#navMore')) $('#navMore').open=true;
  $('#pageTitle').textContent=navLabel(v); $('#fab').style.display=FAB_VIEWS.includes(v)?'':'none';
  const app=$('#app'); app.classList.remove('vin'); void app.offsetWidth; app.classList.add('vin');
  if(v!=='importar'){ IMPORT_FOR=null; IMPORT_NEW=false; }
  try{ const R=reconcile(); if(R&&R.changed) save(); VIEWS[v]($('#app')); }
  catch(e){ console.warn('vista',v,e); $('#app').innerHTML=`<div class="alert crit"><span class="ic">!</span><div><b>${L('Algo ha fallado al mostrar esta pantalla.','Something went wrong showing this screen.')}</b> ${L('Tus datos no se han tocado. Prueba otra pestaña o recarga la app; si se repite, haz una copia cifrada y avísame.','Your data hasn\'t been touched. Try another tab or reload the app; if it keeps happening, make an encrypted backup and report it.')}<div class="muted" style="margin-top:4px">${esc(String(e&&e.message||e))}</div></div></div>`; }
  window.scrollTo(0,0); }
window.addEventListener('hashchange',route);
let resizeT; window.addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{if(!S)return;const h=(location.hash||'#resumen').slice(1); if(!['importar','ajustes','claude','noticias'].includes(h)) VIEWS[VIEWS[h]?h:'resumen']($('#app'));},250)});

/* ---------- Resumen ---------- */
// Avisos plegados en una línea: "N cosas por revisar" o "Todo en orden"
function alertsBox(A0,open){ const A=A0.filter(a=>!a.ignored), nIgn=A0.length-A.length; const bad=A.filter(a=>a.lvl==='crit'||a.lvl==='warn'); const lvl=A.some(a=>a.lvl==='crit')?'crit':bad.length?'warn':'good';
  const title=bad.length?L(`${bad.length} ${bad.length>1?'cosas':'cosa'} por revisar`,`${bad.length} thing${bad.length>1?'s':''} to review`):L('Todo en orden','All good');
  return `<details class="card abox ${lvl}" id="alertBox" ${open?'open':''}><summary><span class="dot">${ic(bad.length?'alert':'check')}</span><span>${title}${helpBtn('alerts',true)}</span>${ic('down','chev')}</summary><div class="abody">${alertsHTML(A)||`<p class="muted">${L('Nada que revisar.','Nothing to review.')}</p>`}${nIgn?`<p class="muted" style="margin:6px 4px 8px">${L(`${nIgn} ${nIgn>1?'avisos ignorados':'aviso ignorado'}.`,`${nIgn} ignored alert${nIgn>1?'s':''}.`)} <button class="sm" id="aRestore">${L('Volver a mostrar','Show again')}</button></p>`:''}</div></details>`; }
// Primer uso guiado: contraseña, primer extracto y primera copia
function onboardHTML(){ if(S.settings.onboardDone) return '';
  const st=[[true,L('Crea tu contraseña y tu clave de recuperación','Create your password and recovery key'),''],
    [S.accounts.length>0,L('Importa tu primer extracto','Import your first statement'),`<a class="btn sm pri" href="#cuentas">${L('Importar','Import')}</a>`],
    [!!S.settings.lastBackup,L('Haz tu primera copia cifrada','Make your first encrypted backup'),`<a class="btn sm" href="#ajustes">${L('Hacer copia','Back up')}</a>`]];
  const done=st.filter(x=>x[0]).length; if(done===3) return '';
  return `<div class="card" id="onboard">${helpBtn('onboard')}<h2>${L('Primeros pasos','Getting started')}</h2><p class="sub" style="margin:0">${L(`${done} de 3 hechos`,`${done} of 3 done`)}</p><div class="prog"><span style="width:${done/3*100}%"></span></div>
    <ol class="steps">${st.map(([ok,t,btn],i)=>`<li class="${ok?'done':''}"><span class="n">${ok?ic('check'):i+1}</span><span class="st">${t}</span>${ok?'':btn}</li>`).join('')}</ol>
    <div class="row" style="justify-content:flex-end;margin-top:4px"><button class="sm" id="obHide">${L('Ocultar','Hide')}</button></div></div>`; }
VIEWS.resumen=(el)=>{
  const nw=netWorthAt();
  const by={}; S.accounts.forEach(a=>{ const b=balanceOf(a); if(b==null)return; by[a.kind]=(by[a.kind]||0)+b; });
  const cf=cashflowByMonth(); const cur=ym(today()); const complete=Object.keys(cf).filter(m=>m<cur).sort(); const last=complete[complete.length-1];
  const months=monthsRange(13);
  const nwSeries=months.map(m=>{const r=netWorthAt(monthEnd(m)); return r?r.net:null;});
  const lastCF=last?cf[last]:null; const nNW=L('Patrimonio neto','Net worth');
  // Cambio frente al primer mes con datos del último año
  const firstV=nwSeries.find(v=>v!=null), ch=nw&&firstV!=null&&nwSeries.filter(v=>v!=null).length>1?nw.net-firstV:null;
  const ms=S.accounts.filter(a=>a.kind==='mortgage'), mPay=ms.reduce((t,m)=>t+mortMonthly(m),0);
  const inv=(by.brokerage||0)+(by.retirement||0)+(by.kids||0);
  const tile=(help,lbl,val,note,cls='')=>`<div class="card stat">${helpBtn(help)}<div class="lbl">${lbl}</div><div class="val ${cls}">${val}</div><div class="note">${note}</div></div>`;
  el.innerHTML=`<div class="stack">
  ${onboardHTML()}
  <div class="card hero">${helpBtn('stat_nw')}<div class="lbl">${nNW}</div><div class="big">${nw?fmt(nw.net):'—'}</div>
    <div class="meta">${ch!=null?`<span class="delta ${ch>=0?'up':'down'}">${ch>=0?'▲':'▼'} ${fmtK(Math.abs(ch))}</span><span>${L('en 12 meses','in 12 months')}</span>`:''}${nw?`<span>${L('Activos','Assets')} ${fmtK(nw.assets)} · ${L('Deudas','Debts')} ${fmtK(nw.liab)}</span>`:`<span>${L('Importa tus extractos para calcularlo','Import your statements to calculate it')}</span>`}</div>
    <div id="cNW" style="margin-top:8px"></div></div>
  <div class="tiles">
    ${tile('stat_cash',L('Efectivo','Cash'),by.cash!=null?fmt(by.cash):'—',by.credit?L(`Tarjetas: ${fmt(by.credit)}`,`Cards: ${fmt(by.credit)}`):L('Bancos y ahorro','Banks and savings'))}
    ${tile('stat_save',last?L('Ahorro de ','Saved in ')+ymLabel(last):L('Ahorro del mes','Monthly savings'),lastCF?fmt(lastCF.income-lastCF.expense):'—',lastCF?`${L('Entra','In')} ${fmtK(lastCF.income)} · ${L('Sale','Out')} ${fmtK(lastCF.expense)}`:L('Sin movimientos','No transactions'),lastCF?(lastCF.income-lastCF.expense>=0?'pos':'neg'):'')}
    ${tile('stat_inv',L('Inversiones','Investments'),inv?fmt(inv):'—',by.retirement?L(`Jubilación ${fmtK(by.retirement)}`,`Retirement ${fmtK(by.retirement)}`):L('Bróker y jubilación','Brokerage and retirement'))}
    ${tile('stat_mort',L('Hipotecas','Mortgages'),by.mortgage?fmt(by.mortgage):'—',mPay?L(`Cuota ${fmt(mPay)}/mes`,`Payment ${fmt(mPay)}/mo`):L('Lo que debes','What you owe'))}
  </div>
  <div id="alertWrap"></div>
  <div class="card">${helpBtn('mix')}<h2>${L('Dónde está tu dinero','Where your money is')}</h2><p class="sub">${L('Saldo actual por tipo de cuenta','Current balance by account type')}</p><div id="cMix"></div></div>
  </div>`;
  lineChart($('#cNW'),{labels:months.map(ymLabel),series:[{name:nNW,color:'var(--accent)',values:nwSeries,area:true}],height:150});
  const order=['cash','brokerage','retirement','kids','property','other','credit','mortgage'];
  const colors={cash:'var(--s1)',brokerage:'var(--s3)',retirement:'var(--s7)',kids:'var(--s5)',property:'var(--s4)',other:'var(--s6)',credit:'var(--s8)',mortgage:'var(--s2)'};
  $('#cMix').innerHTML=order.some(k=>by[k])?hbars(order.filter(k=>by[k]).map(k=>({k:KINDS[k].label+(KINDS[k].asset?'':L(' (deuda)',' (debt)')),v:by[k],c:colors[k]}))):`<p class="muted">${L('Aún no hay saldos.','No balances yet.')}</p>`;
  if($('#obHide')) $('#obHide').onclick=()=>{ S.settings.onboardDone=true; save(); route(); };
  const paint=open=>{ const A0=computeAlerts(); $('#alertWrap').innerHTML=alertsBox(A0,open); wireAlerts($('#alertWrap'),A0.filter(a=>!a.ignored).concat(A0.filter(a=>a.ignored)),()=>paint(true)); };
  paint(false);
};

/* ---------- Movimientos ---------- */
// sort: date_desc | date_asc | amt_desc | amt_asc (por importe absoluto: lo más grande primero)
let flujoFilter={month:'all', cat:'all', q:'', limit:200, sort:'date_desc'};
const TX_SORTS={date_desc:(a,b)=>b.date.localeCompare(a.date),date_asc:(a,b)=>a.date.localeCompare(b.date),amt_desc:(a,b)=>Math.abs(b.amount)-Math.abs(a.amount)||b.date.localeCompare(a.date),amt_asc:(a,b)=>Math.abs(a.amount)-Math.abs(b.amount)||b.date.localeCompare(a.date)};
// Avatar de categoría: inicial y color estable por categoría (las neutras, en gris)
const CAT_HUES=[215,262,190,36,320,18,240,170,280,200];
function catAv(c){ const n=catL(c||''); let h=0; for(const ch of String(c)) h=(h*31+ch.charCodeAt(0))%9973; const ty=catType(c);
  return `<span class="av round" style="${ty==='neutral'?'background:var(--muted)':`--h:${ty==='income'?145:CAT_HUES[h%CAT_HUES.length]}`}">${esc((n.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/)||['·'])[0].toUpperCase())}</span>`; }
function dayLabel(d){ const t=today(); if(d===t) return L('Hoy','Today'); const y=new Date(); y.setDate(y.getDate()-1); if(d===isoDate(y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate())) return L('Ayer','Yesterday');
  const x=new Date(d+'T12:00:00'); const s=x.toLocaleDateString(LANG==='en'?'en-US':'es-ES',{weekday:'long',day:'numeric',month:'long',...(d.slice(0,4)!==t.slice(0,4)?{year:'numeric'}:{})}); return s.charAt(0).toUpperCase()+s.slice(1); }
function txRow(t,withDate){ const u=isUncat(t); return `<button class="lrow txr${u?' unc':''}" data-tx="${esc(t.id)}">${u?`<span class="av round" style="background:var(--warn);color:#1a1a19">?</span>`:catAv(t.cat)}<span class="lm"><b>${esc(t.desc)}</b><span>${withDate?esc(dLabel(t.date))+' · ':''}${u?`<span class="uncl">${L('Sin categoría · toca para elegir','Uncategorized · tap to choose')}</span>`:esc(catL(t.cat))}${t.acc?' · '+esc(accName(t.acc)):''}${t.rec?` · <span class="rec">${esc(recLabel(t))}</span>`:''}</span></span><span class="lr"><b class="${t.amount>0?'pos':''}">${t.amount>0?'+':''}${fmt(t.amount,2)}</b></span></button>`; }
VIEWS.flujo=(el)=>{
  const cf=cashflowByMonth(); const months=monthsRange(12);
  const inc=months.map(m=>cf[m]?cf[m].income:0), exp=months.map(m=>cf[m]?cf[m].expense:0), net=months.map((m,i)=>inc[i]-exp[i]);
  const ms=txMonths();
  const sel=flujoFilter.month==='all'?null:flujoFilter.month;
  const scope=sel?[sel]:months.filter(m=>cf[m]);
  const catTot={}; scope.forEach(m=>{ if(!cf[m])return; for(const[k,v] of Object.entries(cf[m].cats)) catTot[k]=(catTot[k]||0)+v; });
  const div=sel?1:Math.max(1,scope.length);
  const catItems=Object.entries(catTot).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({k:catL(k),v:v/div}));
  if(!TX_SORTS[flujoFilter.sort]) flujoFilter.sort='date_desc'; const byDate=flujoFilter.sort.startsWith('date');
  let list=S.tx.slice().sort(TX_SORTS[flujoFilter.sort]);
  if(sel) list=list.filter(t=>ym(t.date)===sel);
  if(flujoFilter.cat!=='all') list=list.filter(t=>flujoFilter.cat==='__none'?isUncat(t):t.cat===flujoFilter.cat);
  if(flujoFilter.q) { const q=flujoFilter.q.toLowerCase(); list=list.filter(t=>t.desc.toLowerCase().includes(q)); }
  const shown=list.slice(0,flujoFilter.limit);
  // Mes del resumen: el elegido o el último con datos
  const sm=sel||Object.keys(cf).sort().pop(); const c=sm&&cf[sm];
  const days=[]; shown.forEach(t=>{ const d=days[days.length-1]; if(d&&d.date===t.date) d.tx.push(t); else days.push({date:t.date,tx:[t]}); });
  const nI=L('Ingresos','Income'), nG=L('Gastos','Expenses'), nN=L('Ahorro neto','Net savings');
  const R=lastRec(); const nUnc=S.tx.filter(isUncat).length;
  el.innerHTML=`
  <div class="toolbar">
    <div class="search">${ic('search')}<input id="fQ" type="search" placeholder="${L('Buscar movimientos','Search transactions')}" value="${esc(flujoFilter.q)}" aria-label="${L('Buscar','Search')}"></div>
    <select id="fMonth" aria-label="${L('Mes','Month')}"><option value="all">${L('Todos los meses','All months')}</option>${ms.slice().reverse().map(m=>`<option value="${m}" ${m===flujoFilter.month?'selected':''}>${ymLabel(m)}</option>`).join('')}</select>
    <select id="fCat" aria-label="${L('Categoría','Category')}"><option value="all">${L('Todas las categorías','All categories')}</option><option value="__none" ${flujoFilter.cat==='__none'?'selected':''}>${L('Sin categoría (por revisar)','Uncategorized (to review)')}</option>${allCats().map(c=>`<option value="${esc(c)}" ${c===flujoFilter.cat?'selected':''}>${esc(catL(c))}</option>`).join('')}</select>
    <button class="sm" id="catMgr">${L('Categorías','Categories')}</button>
  </div>
  <div class="stack">
    <div class="card">${helpBtn('cat_chart')}<h2>${L('Gasto por categoría','Spending by category')}</h2><p class="sub">${sel?ymLabel(sel):L('Media mensual de los últimos 12 meses','Monthly average over the last 12 months')}</p>
      ${c?`<div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 14px"><div class="stat"><div class="note">${nI}${sel?'':' · '+ymLabel(sm)}</div><div class="val pos" style="font-size:18px">${fmt(c.income)}</div></div><div class="stat"><div class="note">${nG}</div><div class="val" style="font-size:18px">${fmt(c.expense)}</div></div><div class="stat"><div class="note">${L('Ahorro','Saved')}</div><div class="val ${c.income-c.expense>=0?'pos':'neg'}" style="font-size:18px">${fmt(c.income-c.expense)}</div></div></div>`:''}
      ${catItems.length?hbars(catItems,'var(--s2)'):`<p class="muted">${L('Sin gastos todavía.','No spending yet.')}</p>`}</div>
    <div class="card">${helpBtn('cf_chart')}<h2>${L('Ingresos, gastos y ahorro','Income, expenses and savings')}</h2><p class="sub">${L('Últimos 12 meses','Last 12 months')}</p>${legend([{n:nI,c:'var(--s3)'},{n:nG,c:'var(--s2)'},{n:nN,c:'var(--s1)'}])}<div id="cCF"></div></div>
    ${S.tx.length?`<div class="card" id="recBox">${helpBtn('rec')}<h2>${L('Conciliación entre cuentas','Reconciliation between accounts')}</h2>${recHTML(R)}</div>`:''}
  </div>
  <h3 class="sec" id="txHead">${L('Movimientos','Transactions')}${helpBtn('tx_list',true)}<span class="tot">${list.length}</span></h3>
  ${nUnc&&flujoFilter.cat!=='__none'?`<div class="alert warn act" style="margin-bottom:4px"><span class="ic">!</span><button class="ab" id="uncGo"><span>${L(`<b>${nUnc} ${nUnc>1?'movimientos':'movimiento'} sin categoría.</b> Revísalos y elige una.`,`<b>${nUnc} uncategorized transaction${nUnc>1?'s':''}.</b> Review them and choose one.`)}</span>${ic('right','chev')}</button></div>`:''}
  ${flujoFilter.cat==='__none'?`<div class="alert info" style="margin-bottom:4px"><span class="ic">i</span><div style="flex:1">${(()=>{ const out=r2(-list.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0)), inn=r2(list.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0)); const tot=[out?L('gastos ','expenses ')+fmt(out,2):'',inn?L('ingresos ','income ')+fmt(inn,2):''].filter(Boolean).join(' · ');
      return L(`Mostrando solo los movimientos sin categoría (${list.length}${tot?': '+tot:''}). Toca uno para elegirla; la app te ofrece aplicarla a los parecidos.`,`Showing only uncategorized transactions (${list.length}${tot?': '+tot:''}). Tap one to choose it; the app offers to apply it to similar ones.`); })()} <button class="sm" id="uncAll">${L('Ver todos','Show all')}</button></div></div>`:''}
  ${list.length>1?`<div class="listbar"><label for="fSort" class="muted">${L('Ordenar por','Sort by')}</label><select id="fSort">${[['date_desc',L('Fecha: más reciente primero','Date: newest first')],['date_asc',L('Fecha: más antigua primero','Date: oldest first')],['amt_desc',L('Importe: de mayor a menor','Amount: largest first')],['amt_asc',L('Importe: de menor a mayor','Amount: smallest first')]].map(([v,t])=>`<option value="${v}" ${v===flujoFilter.sort?'selected':''}>${t}</option>`).join('')}</select></div>`:''}
  <div id="txList">${shown.length?(byDate?days.map(d=>`<div class="txday"><div class="txday-h"><span>${esc(dayLabel(d.date))}</span><span>${fmt(r2(d.tx.reduce((s,t)=>s+t.amount,0)),2)}</span></div><div class="card list">${d.tx.map(t=>txRow(t)).join('')}</div></div>`).join(''):`<div class="card list" style="margin-top:8px">${shown.map(t=>txRow(t,true)).join('')}</div>`)
    +(list.length>shown.length?`<div class="row" style="justify-content:center;margin-top:12px"><button id="txMore">${L(`Ver más (${list.length-shown.length})`,`Show more (${list.length-shown.length})`)}</button></div>`:'')
    :`<div class="card empty"><div class="ei">${ic('flow')}</div><p>${S.tx.length?L('Ningún movimiento coincide con el filtro.','No transaction matches the filter.'):L('Aún no hay movimientos. Importa los extractos de tus bancos y tarjetas.','No transactions yet. Import your bank and card statements.')}</p>${S.tx.length?'':`<a class="btn pri" href="#importar">${ic('upload')}${L('Importar extractos','Import statements')}</a>`}</div>`}</div>
  </div>`;
  if($('#recBox')) wireRec($('#recBox'));
  barChart($('#cCF'),{labels:months.map(ymLabel),series:[{name:nI,color:'var(--s3)',values:inc},{name:nG,color:'var(--s2)',values:exp},{name:nN,color:'var(--s1)',values:net}]});
  $('#fMonth').onchange=e=>{flujoFilter.month=e.target.value;flujoFilter.limit=200;route();};
  $('#fCat').onchange=e=>{flujoFilter.cat=e.target.value;flujoFilter.limit=200;route();};
  $('#fQ').onchange=e=>{flujoFilter.q=e.target.value;flujoFilter.limit=200;route();};
  $('#catMgr').onclick=()=>manageCats();
  if($('#uncGo')) $('#uncGo').onclick=()=>{ flujoFilter.cat='__none'; flujoFilter.month='all'; flujoFilter.limit=200; route(); setTimeout(()=>{ const e=$('#txHead'); if(e) window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-70); },30); };
  if($('#fSort')) $('#fSort').onchange=e=>{ flujoFilter.sort=e.target.value; flujoFilter.limit=200; route(); setTimeout(()=>{ const x=$('#fSort'); if(x) x.scrollIntoView({block:'center'}); },30); };
  if($('#uncAll')) $('#uncAll').onclick=()=>{ flujoFilter.cat='all'; route(); };
  if($('#txMore')) $('#txMore').onclick=()=>{ const y=window.scrollY; flujoFilter.limit+=300; route(); window.scrollTo(0,y); };
  $('#txList').addEventListener('click',e=>{ const b=e.target.closest('[data-tx]'); if(b) txSheet(b.dataset.tx); });
};
// Ficha de un movimiento: cambiar la categoría o borrarlo
function txSheet(id){ const t=S.tx.find(x=>x.id===id); if(!t) return;
  let opts=catOptions(t.cat); if(!allCats().includes(t.cat)) opts=`<option value="${esc(t.cat)}" selected>${esc(catL(t.cat))}</option>`+opts;
  openModal(`<div class="sheet-head">${catAv(t.cat)}<div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(t.desc)}</h2><div class="muted">${dLabel(t.date)}${t.acc?' · '+esc(accName(t.acc)):''}</div></div></div>
    <div class="sheet-big ${t.amount>0?'pos':''}">${t.amount>0?'+':''}${fmt(t.amount,2)}</div>
    ${t.rec?`<p class="muted" style="color:var(--accent)">${esc(recLabel(t))}</p>`:''}
    <label class="f" style="margin-top:14px">${L('Categoría','Category')}<select id="tsCat">${opts}</select></label>
    <div class="row" style="margin-top:14px"><button class="dan" id="tsDel">${ic('trash')}${L('Borrar','Delete')}</button><span></span><button class="pri" id="mc">${L('Hecho','Done')}</button></div>`);
  $('#mc').onclick=()=>{ closeModal(); route(); };
  $('#tsDel').onclick=()=>{ S.tx=S.tx.filter(x=>x.id!==id); save(); closeModal(); toast(L('Movimiento borrado','Transaction deleted')); route(); };
  $('#tsCat').onchange=e=>{ const old=t.cat; const apply=c=>{ t.cat=c; t.manual=true; save(); closeModal(); offerRule(t,old); };
    if(e.target.value==='__newcat') newCatModal(apply,()=>txSheet(id)); else apply(e.target.value); };
}
// Añadir un movimiento a mano (botón "+")
function addTxModal(){
  openModal(`${helpBtn('add_tx')}<h2>${L('Añadir movimiento','Add a transaction')}</h2>
    <div class="row"><label class="f">${L('Importe','Amount')}<input id="nAmt" inputmode="decimal" placeholder="${L('-45.20 gasto / 1200 ingreso','-45.20 expense / 1200 income')}"></label><label class="f">${L('Fecha','Date')}<input type="date" id="nDate" value="${today()}"></label></div>
    <label class="f">${L('Descripción','Description')}<input id="nDesc"></label>
    <div class="row"><label class="f">${L('Categoría','Category')}<select id="nCat">${catOptions('Otros gastos')}</select></label><label class="f">${L('Cuenta','Account')}<select id="nAcc"><option value="">—</option>${S.accounts.filter(a=>['cash','credit'].includes(a.kind)).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></label></div>
    <div class="row" style="margin-top:6px"><button id="mc">${L('Cancelar','Cancel')}</button><span></span><button class="pri" id="nAdd">${L('Añadir','Add')}</button></div>`);
  $('#mc').onclick=closeModal;
  $('#nCat').onchange=e=>{ if(e.target.value==='__newcat'){ const keep={a:$('#nAmt').value,d:$('#nDate').value,s:$('#nDesc').value}; newCatModal(c=>{ addTxModal(); $('#nAmt').value=keep.a; $('#nDate').value=keep.d; $('#nDesc').value=keep.s; $('#nCat').innerHTML=catOptions(c); },()=>addTxModal()); } };
  $('#nAdd').onclick=()=>{ const a=num($('#nAmt').value); if(isNaN(a)){toast(L('Pon un importe','Enter an amount'));return;} let amt=a; const c=$('#nCat').value; if(c==='__newcat') return; if(catType(c)==='expense'&&amt>0) amt=-amt;
    S.tx.push({id:uid(),date:isoDate($('#nDate').value)||today(),desc:$('#nDesc').value.trim().slice(0,300)||catL(c),amount:amt,cat:c,acc:$('#nAcc').value||null,src:'manual'}); save(); closeModal(); toast(L('Movimiento añadido','Transaction added')); route(); };
}
function offerRule(t,old){
  const word=(t.desc.toUpperCase().match(/[A-Z][A-Z&'.]{2,}(?: [A-Z&'.]{2,})?/)||[''])[0].trim();
  if(!word){ route(); return; }
  openModal(`<h2>${L('¿Aplicar siempre?','Always apply?')}</h2><p>${L(`Categorizar como <b>${esc(catL(t.cat))}</b> todos los movimientos que contengan:`,`Categorize as <b>${esc(catL(t.cat))}</b> every transaction containing:`)}</p><input id="rPat" value="${esc(word)}"><p class="muted">${L('Se aplicará a los que ya tienes y a los que importes.','It applies to the ones you have and to future imports.')}</p><div class="row" style="margin-top:12px"><button id="rNo">${L('Solo este','Just this one')}</button><button class="pri" id="rYes">${L('Aplicar a todos','Apply to all')}</button></div>`);
  $('#rNo').onclick=()=>{closeModal();route();};
  $('#rYes').onclick=()=>{ const p=$('#rPat').value.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); if(p){ S.rules.unshift({pattern:p,cat:t.cat}); let n=0; const re=new RegExp(p,'i'); S.tx.forEach(x=>{ if(re.test(x.desc)&&x.cat!==t.cat&&!x.manual){x.cat=t.cat;n++;} }); save(); toast(L(`Regla creada · ${n} movimientos actualizados`,`Rule created · ${n} transactions updated`));} closeModal(); route(); };
}
/* ---------- Categorías propias ---------- */
function catNameTaken(n){ const k=n.trim().toLowerCase(); return allCats().some(c=>c.toLowerCase()===k||catL(c).toLowerCase()===k)||Object.values(CAT_EN).some(c=>c.toLowerCase()===k); }
function newCatModal(onDone,onCancel,preset){
  openModal(`<h2>${L('Nueva categoría','New category')}</h2>
   <label class="f">${L('Nombre','Name')}<input id="ncN" value="${esc(preset||'')}" placeholder="${L('Mascotas, Gimnasio, Regalos…','Pets, Gym, Gifts…')}"></label>
   <label class="f">${L('Tipo','Type')}<select id="ncT">${CAT_TYPES.map(t=>`<option value="${t}">${typeL(t)}</option>`).join('')}</select></label>
   <p class="muted">${L('Los gastos e ingresos cuentan en tu ahorro mensual. Las neutras (por ejemplo, movimientos entre tus cuentas) no cuentan.','Expenses and income count toward your monthly savings. Neutral ones (for example, moves between your own accounts) do not.')}</p>
   <div class="row" style="margin-top:12px"><button id="ncX">${L('Cancelar','Cancel')}</button><button class="pri" id="ncOk">${L('Crear','Create')}</button></div>`);
  $('#ncX').onclick=()=>{ closeModal(); if(onCancel) onCancel(); };
  $('#ncOk').onclick=()=>{ const n=$('#ncN').value.trim().replace(/\s+/g,' ').slice(0,40); if(!n) return toast(L('Pon un nombre','Enter a name')); if(catNameTaken(n)) return toast(L('Ya existe una categoría con ese nombre','A category with that name already exists'));
    S.settings.userCats=userCats().concat({name:n,type:$('#ncT').value}); save(); closeModal(); toast(L('Categoría creada','Category created')); if(onDone) onDone(n); };
}
function manageCats(){
  const uc=userCats(); const count=c=>S.tx.filter(t=>t.cat===c).length;
  openModal(`<h2>${L('Categorías','Categories')}</h2>
   <p class="muted">${L('Crea tus propias categorías de ingreso, gasto o neutras. Las de sistema no se pueden borrar porque la app las usa (hipoteca, alquiler, impuestos…).','Create your own income, expense or neutral categories. System categories can\'t be deleted because the app relies on them (mortgage, rental, taxes…).')}</p>
   <h3 class="sec" style="margin-top:10px">${L('Tus categorías','Your categories')}</h3>
   ${uc.length?`<table><tbody>${uc.map((c,i)=>`<tr><td><input class="ucN" data-i="${i}" value="${esc(c.name)}"></td><td><select class="ucT" data-i="${i}">${CAT_TYPES.map(t=>`<option value="${t}" ${t===c.type?'selected':''}>${typeL(t)}</option>`).join('')}</select></td><td class="n muted">${count(c.name)}</td><td class="n"><button class="sm dan" data-ucdel="${i}">✕</button></td></tr>`).join('')}</tbody></table>`:`<p class="muted">${L('Aún no has creado ninguna.','You haven\'t created any yet.')}</p>`}
   <div class="row" style="margin-top:10px"><button class="pri" id="ucAdd">${L('+ Nueva categoría','+ New category')}</button></div>
   <details style="margin-top:12px"><summary>${L('Categorías de sistema','System categories')}</summary>${CAT_TYPES.map(t=>`<p><b>${typeL(t)}:</b> ${CATS[t].map(c=>esc(catL(c))).join(', ')}</p>`).join('')}</details>
   <div class="row" style="margin-top:12px"><button id="ucClose">${L('Cerrar','Close')}</button></div>`);
  $('#ucClose').onclick=()=>{ closeModal(); route(); };
  $('#ucAdd').onclick=()=>newCatModal(()=>manageCats(),()=>manageCats());
  document.querySelectorAll('.ucN').forEach(inp=>inp.onchange=()=>{ const c=uc[+inp.dataset.i]; const n=inp.value.trim().replace(/\s+/g,' ').slice(0,40);
    if(!n||n===c.name){ inp.value=c.name; return; } if(catNameTaken(n)){ toast(L('Ya existe una categoría con ese nombre','A category with that name already exists')); inp.value=c.name; return; }
    const old=c.name; S.tx.forEach(t=>{ if(t.cat===old) t.cat=n; if(t.rec&&t.rec.prev===old) t.rec.prev=n; if(t.rec&&t.rec.cat===old) t.rec.cat=n; }); S.rules.forEach(r=>{ if(r.cat===old) r.cat=n; }); c.name=n; save(); toast(L('Categoría renombrada','Category renamed')); });
  document.querySelectorAll('.ucT').forEach(sel=>sel.onchange=()=>{ uc[+sel.dataset.i].type=sel.value; save(); });
  document.querySelectorAll('[data-ucdel]').forEach(b=>b.onclick=()=>{ const c=uc[+b.dataset.ucdel]; const n=count(c.name); const fb=c.type==='income'?'Otros ingresos':c.type==='neutral'?'Transferencia':'Otros gastos';
    openModal(`<h2>${L(`¿Borrar «${esc(c.name)}»?`,`Delete "${esc(c.name)}"?`)}</h2><p>${n?L(`Sus ${n} movimientos pasarán a <b>${esc(catL(fb))}</b> y se borrarán sus reglas.`,`Its ${n} transactions will move to <b>${esc(catL(fb))}</b> and its rules will be deleted.`):L('No tiene movimientos.','It has no transactions.')}</p><div class="row"><button id="mc">${L('Cancelar','Cancel')}</button><button class="dan" id="dOk">${L('Borrar','Delete')}</button></div>`);
    $('#mc').onclick=()=>manageCats();
    $('#dOk').onclick=()=>{ S.tx.forEach(t=>{ if(t.cat===c.name) t.cat=fb; }); S.rules=S.rules.filter(r=>r.cat!==c.name); S.settings.userCats=userCats().filter(x=>x!==c); save(); manageCats(); }; });
}

/* ---------- Hipotecas ---------- */
const extraSim={};
VIEWS.hipotecas=(el)=>{
  const ms=S.accounts.filter(a=>a.kind==='mortgage');
  if(!ms.length){ el.innerHTML=`<div class="card empty">${helpBtn('mortgage')}<div class="ei">${ic('house')}</div><p>${L('Aún no hay hipotecas. Importa el último extracto de tu hipoteca y la app la crea con su cuota y su saldo.','No mortgages yet. Import your latest mortgage statement and the app creates it with its payment and balance.')}</p><label class="pick">${ic('upload')}${L('Importar extracto','Import statement')}<input type="file" accept="application/pdf,.pdf" class="mPick"></label> <button id="addM">${L('Añadir a mano','Add by hand')}</button></div>`; $('#addM').onclick=()=>editAccount(null,'mortgage'); wireMortPick(el); return; }
  el.innerHTML=ms.map(m=>`<div class="card" style="margin-bottom:12px" id="m_${m.id}"></div>`).join('')+`<div class="row"><label class="pick" style="flex:none">${L('Actualizar con el statement (PDF)','Update with the statement (PDF)')}<input type="file" accept="application/pdf,.pdf" class="mPick"></label><button id="addM">${L('+ Añadir hipoteca a mano','+ Add a mortgage by hand')}</button></div>`; wireMortPick(el);
  $('#addM').onclick=()=>editAccount(null,'mortgage');
  ms.forEach(m=>renderMortgage(m));
};
function renderMortgage(m){
  const box=$('#m_'+m.id); const bal=balanceOf(m)||0; const snap=lastSnap(m.id);
  const pay=m.payment||0, rate=m.rate||0, extra=m.extra||0;
  if(extraSim[m.id]==null) extraSim[m.id]=extra;
  const sim=extraSim[m.id];
  const base=amortize(bal,rate,pay,0), curr=amortize(bal,rate,pay,extra), alt=amortize(bal,rate,pay,sim);
  const start=snap?snap.date:today();
  const prop=m.propertyId?acc(m.propertyId):null;
  const yrs=n=>isFinite(n)?L(`${Math.floor(n/12)} a ${n%12} m`,`${Math.floor(n/12)} yr ${n%12} mo`):'—';
  const dn=base.n-curr.n;
  const nSin=L('Sin extra','No extra'), nAct=L('Extra actual','Current extra'), nSim=L('Simulado','Simulated');
  box.innerHTML=`${helpBtn('mortgage')}
   <div class="row" style="align-items:flex-start"><div><h2>${esc(m.name)}</h2><p class="sub">${esc(m.institution||'')}${prop?' · '+esc(prop.name):''} · ${L('saldo a','balance as of')} ${snap?dLabel(snap.date):'—'}</p></div><button class="sm" data-edit="${m.id}">${L('Editar','Edit')}</button></div>
   <div class="grid g4">
     <div class="stat"><div class="lbl">${L('Saldo pendiente','Outstanding balance')}</div><div class="val">${fmt(bal)}</div><div class="note">${rate}% ${L('fijo','fixed')}</div></div>
     <div class="stat"><div class="lbl">${L('Cuota (capital + intereses)','Payment (principal + interest)')}</div><div class="val">${fmt(pay,2)}</div><div class="note">+ ${fmt(extra,2)} ${L('extra al mes','extra per month')}</div></div>
     <div class="stat"><div class="lbl">${L('Terminas con tu extra actual','Payoff with your current extra')}</div><div class="val" style="font-size:22px">${isFinite(curr.n)?addMonths(start,curr.n):'—'}</div><div class="note">${yrs(curr.n)} · ${L('intereses restantes','remaining interest')} ${isFinite(curr.interest)?fmtK(curr.interest):'—'}</div></div>
     <div class="stat"><div class="lbl">${L('Ahorro frente a no pagar extra','Savings vs. no extra')}</div><div class="val pos" style="font-size:22px">${isFinite(base.interest)&&isFinite(curr.interest)?fmtK(base.interest-curr.interest):'—'}</div><div class="note">${isFinite(base.n)?L(`${Math.floor(dn/12)} a ${dn%12} m antes`,`${Math.floor(dn/12)} yr ${dn%12} mo sooner`):''}</div></div>
   </div>
   ${mortPaidHTML(m)}
   <h3 class="sec">${L('Simulador de pago extra','Extra payment simulator')}${helpBtn('mort_sim',true)}</h3>
   <div class="range"><span class="muted">$0</span><input type="range" min="0" max="3000" step="25" value="${sim}" data-sim="${m.id}"><span class="muted">$3,000</span></div>
   <p style="margin:6px 0 10px">${L(`Con <b>${fmt(sim)}</b> extra al mes terminarías en <b>${isFinite(alt.n)?addMonths(start,alt.n):'—'}</b> (${yrs(alt.n)}), con unos intereses restantes de <b>${isFinite(alt.interest)?fmt(alt.interest):'—'}</b>.`,`With <b>${fmt(sim)}</b> extra per month you would finish in <b>${isFinite(alt.n)?addMonths(start,alt.n):'—'}</b> (${yrs(alt.n)}), with about <b>${isFinite(alt.interest)?fmt(alt.interest):'—'}</b> of remaining interest.`)}
   ${sim!==extra&&isFinite(alt.interest)?L(` Frente a tu extra actual: <span class="${alt.interest<curr.interest?'pos':'neg'}">${alt.interest<curr.interest?'ahorras':'pagas'} ${fmt(Math.abs(curr.interest-alt.interest))}</span> en intereses y ${alt.n<=curr.n?'terminas':'tardas'} ${Math.abs(curr.n-alt.n)} meses ${alt.n<=curr.n?'antes':'más'}.`,` Compared with your current extra: you <span class="${alt.interest<curr.interest?'pos':'neg'}">${alt.interest<curr.interest?'save':'pay'} ${fmt(Math.abs(curr.interest-alt.interest))}</span> in interest and finish ${Math.abs(curr.n-alt.n)} months ${alt.n<=curr.n?'sooner':'later'}.`):''}</p>
   ${legend([{n:nSin,c:'var(--muted)'},{n:nAct+' ('+fmt(extra)+')',c:'var(--s1)'},{n:nSim+' ('+fmt(sim)+')',c:'var(--s2)'}])}
   <div class="mchart"></div>`;
  const N=Math.min(600,Math.max(base.n,1)); const step=12; const idx=[]; for(let i=0;i<=N;i+=step) idx.push(i); if(idx[idx.length-1]!==N) idx.push(N);
  const sd=new Date(start+'T12:00:00'); const lab=idx.map(i=>String(sd.getFullYear()+Math.floor((sd.getMonth()+i)/12)));
  const pick=(r)=>idx.map(i=>i<r.pts.length?r.pts[i].b:0);
  lineChart(box.querySelector('.mchart'),{labels:lab,zero:true,series:[{name:nSin,color:'var(--muted)',values:pick(base),dash:true},{name:nAct,color:'var(--s1)',values:pick(curr)},{name:nSim,color:'var(--s2)',values:pick(alt)}]});
  box.querySelector('[data-edit]').onclick=()=>editAccount(m.id);
  const r=box.querySelector('[data-sim]'); r.oninput=()=>{ extraSim[m.id]=+r.value; renderMortgage(m); const nr=$('#m_'+m.id).querySelector('[data-sim]'); nr.focus(); };
}

function mortPaidHTML(m){ const mm=mortMonthly(m); if(!mm) return ''; const R=lastRec(); const r=R&&R.mort[m.id]; const LP=r&&r.last; const paid=LP?-LP.amount:0; const ok=Math.abs(paid-mm)<=1;
  return `<p class="muted" style="margin:10px 0 0">${L(`En tus gastos cuenta como <b>${fmt(mm,2)} al mes</b> (cuota${m.escrow?' + escrow':''}${m.extra?' + extra':''}), cada mes, aunque el cargo caiga en otro mes.`,`In your expenses it counts as <b>${fmt(mm,2)} per month</b> (payment${m.escrow?' + escrow':''}${m.extra?' + extra':''}), every month, even if the debit falls in another month.`)} ${LP?L(`Último pago encontrado en tus cuentas: ${fmt(paid,2)} el ${dLabel(LP.date)}${ok?' ✓':' (no coincide con el extracto)'}.`,`Last payment found in your accounts: ${fmt(paid,2)} on ${dLabel(LP.date)}${ok?' ✓':' (doesn\'t match the statement)'}.`):L('Todavía no encuentro sus pagos en tus cuentas de banco.','I can\'t find its payments in your bank accounts yet.')}</p>`; }
function wireMortPick(el){ el.querySelectorAll('.mPick').forEach(i=>i.onchange=e=>{ const f=e.target.files[0]; if(!f) return; openImport(()=>queuePDF(f)); }); }
/* ---------- Inversiones ---------- */
VIEWS.inversiones=(el)=>{
  const inv=S.accounts.filter(a=>['brokerage','retirement','kids'].includes(a.kind));
  if(!inv.length){ el.innerHTML=invTabs('cartera')+`<div class="card empty">${helpBtn('inv_chart')}<div class="ei">${ic('trend')}</div><p>${L('Aún no hay cuentas de inversión. Importa un extracto de tu bróker o de tu 401(k).','No investment accounts yet. Import a statement from your broker or your 401(k).')}</p><div class="row" style="justify-content:center"><a class="btn pri" href="#importar">${ic('upload')}${L('Importar extracto','Import statement')}</a><button id="addI">${L('Añadir a mano','Add by hand')}</button></div></div>`; $('#addI').onclick=()=>editAccount(null,'brokerage'); return; }
  const months=monthsRange(13); const pal=['var(--s1)','var(--s3)','var(--s7)','var(--s5)','var(--s4)','var(--s6)','var(--s2)','var(--s8)'];
  const total=inv.reduce((s,a)=>s+(balanceOf(a)||0),0);
  const contrib=inv.reduce((s,a)=>s+(a.contributed||0),0);
  const tot12=months.map(m=>{let any=false,s=0; inv.forEach(a=>{const b=balanceOf(a,monthEnd(m)); if(b!=null){any=true;s+=b;}}); return any?s:null;});
  const first=tot12.find(v=>v!=null);
  el.innerHTML=invTabs('cartera')+`
   <div class="grid g4">
     <div class="card stat">${helpBtn('inv_total')}<div class="lbl">${L('Total invertido','Total invested')}</div><div class="val">${fmt(total)}</div><div class="note">${inv.length} ${L('cuentas','accounts')}</div></div>
     ${['brokerage','retirement','kids'].map(k=>{const v=inv.filter(a=>a.kind===k).reduce((s,a)=>s+(balanceOf(a)||0),0); return v?`<div class="card stat"><div class="lbl">${KINDS[k].label}</div><div class="val">${fmt(v)}</div><div class="note">${total?Math.round(v/total*100):0}% ${L('del total','of total')}</div></div>`:'';}).join('')}
     ${contrib?`<div class="card stat"><div class="lbl">${L('Ganancia sobre lo aportado','Gain over contributions')}</div><div class="val ${total-contrib>=0?'pos':'neg'}">${fmt(total-contrib)}</div><div class="note">${L('Aportado','Contributed')} ${fmtK(contrib)}</div></div>`:''}
   </div>
   <div class="spacer"></div>
   <div class="card">${helpBtn('inv_chart')}<h2>${L('Evolución de tus inversiones','How your investments evolve')}</h2><p class="sub">${L('Saldo a fin de cada mes','Balance at the end of each month')}${first!=null&&tot12[12]!=null?` · ${tot12[12]-first>=0?'+':''}${fmt(tot12[12]-first)} ${L('en el periodo (incluye aportaciones)','in the period (includes contributions)')}`:''}</p>${legend(inv.map((a,i)=>({n:a.name,c:pal[i%8]})))}<div id="cInv"></div></div>
   <h3 class="sec">${L('Cuentas','Accounts')}</h3>
   <div class="card list">${inv.map(a=>{const s=lastSnap(a.id);return `<button class="lrow" data-acc="${esc(a.id)}">${accAv(a)}<span class="lm"><b>${esc(a.last4?a.name.replace(/\s*···\d{4}$/,''):a.name)}</b><span>${KINDS[a.kind].label}${a.institution?' · '+esc(a.institution):''}</span></span><span class="lr"><b>${s?fmt(s.value):'—'}</b><span>${s?dLabel(s.date):L('sin saldo','no balance')}</span></span>${ic('right','chev')}</button>`}).join('')}</div>`;
  el.insertAdjacentHTML('beforeend',inv.map(holdingsHTML).join('')+`<p class="muted" style="margin-top:10px">${L('Para ver las posiciones, sube en <a href="#importar">Cuentas → Importar</a> el CSV de Holdings de M1 o el extracto trimestral de tu 401(k).','To see your positions, upload the M1 Holdings CSV or your 401(k) quarterly statement in <a href="#importar">Accounts → Import</a>.')}</p>`);
  lineChart($('#cInv'),{labels:months.map(ymLabel),series:inv.map((a,i)=>({name:a.name,color:pal[i%8],values:months.map(m=>balanceOf(a,monthEnd(m)))}))});
  el.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>accountSheet(b.dataset.acc));
};

/* ---------- Noticias (terminal) ----------
   Titulares públicos que recoge cada hora .github/workflows/noticias.yml (rama `news`).
   La descarga es la misma para todo el mundo: tus posiciones nunca salen del dispositivo;
   el filtro "Mi cartera" se hace aquí, en el navegador. */
function newsURL(){ const h=location.hostname; let owner='Marcos86GO', repo='MyFinZen';
  if(/\.github\.io$/i.test(h)){ owner=h.split('.')[0]; const seg=location.pathname.split('/').filter(Boolean)[0]; repo=seg&&!/\.html$/.test(seg)?seg:owner+'.github.io'; }
  return `https://raw.githubusercontent.com/${owner}/${repo}/news/news.json`; }
const NEWS={data:null,at:0,err:'',loading:null,q:'',tk:'all',topic:'all',limit:120};
const NEWS_TABS_=[['cartera','Mi cartera','My portfolio'],['global','Global','Global'],['us','EE. UU.','US'],['eu','Europa','Europe'],['es','España','Spain'],['paises','Países','Countries']];
const NEWS_TABS={ some:f=>NEWS_TABS_.some(t=>f([t[0],L(t[1],t[2])])), map:f=>NEWS_TABS_.map((t,i)=>f([t[0],L(t[1],t[2])],i)) };
// Nombres de región en inglés (el servidor los publica en español)
const REGION_EN={global:'Global',us:'US',eu:'Europe',es:'Spain',gb:'United Kingdom',de:'Germany',fr:'France',it:'Italy',pt:'Portugal',ca:'Canada',mx:'Mexico',br:'Brazil',ar:'Argentina',co:'Colombia',cl:'Chile',jp:'Japan',cn:'China & Hong Kong',in:'India',kr:'South Korea',au:'Australia'};
const regionL=r=>LANG==='en'&&REGION_EN[r.id]?REGION_EN[r.id]:r.name;
const NEWS_LOC=()=>LANG==='en'?'en-US':'es-ES';
const NEWS_AMBIG=new Set(['Target','Block','Strategy','Square','Booking','Arm','Shell','Visa','Southern Company','Meta']);
const NEWS_WORDS=new Set(['NOW','MAIN','NET','LOW','COST','ARM','CAT','ALL','ARE','FOR','BIG','CAN','HAS','KEY','PLAY','HOOD','TAN','DIA','ONE','NEW','BIL','FAST','LIFE','REAL','SAFE','SEE','WELL','TEAM','TRUE','CASH','GOOD','BEST','OPEN','EAT','FUN','GO']);
// Tema de cada noticia: por su titular (español e inglés). Las que nombran tus posiciones son "Empresas".
const NEWS_TOPICS=[
  ['impuestos','Impuestos','Taxes','receipt',28,/\b(tax|taxes|IRS|tax cuts?|impuestos?|hacienda|fiscal|IRPF|IVA)\b/i],
  ['cripto','Cripto','Crypto','coin',45,/\b(bitcoin|crypto\w*|cripto\w*|ether(eum)?|stablecoins?|blockchain|BTC|Coinbase|Binance)\b/i],
  ['energia','Energía','Energy','bolt',38,/\b(oil|crude|brent|WTI|OPEC\+?|natural gas|petr[oó]leo|crudo|OPEP|energ[ií]a|energy|gasolina|electricity|electricidad)\b/i],
  ['vivienda','Vivienda','Housing','house',20,/\b(housing|home prices?|home sales|mortgage rates?|real estate|homebuilders?|vivienda|inmobiliari\w*|hipotecas?|alquiler(es)?|rent prices)\b/i],
  ['politica','Política','Politics','landmark',350,/\b(election|elections|congress|senate|white house|trump|biden|harris|president|presidente|government|gobierno|shutdown|tariffs?|aranceles?|sanctions?|sanciones|parliament|parlamento|elecciones|ministro|minister|ley|law|bill|regulation|regulaci[oó]n|newsom|legislat\w*|geopol\w*|war|guerra)\b/i],
  ['economia','Economía','Economy','globe',200,/\b(fed|federal reserve|powell|ECB|BCE|lagarde|inflation|inflaci[oó]n|CPI|IPC|PCE|jobs report|payrolls?|unemployment|paro|empleo|GDP|PIB|recession|recesi[oó]n|interest rates?|tipos de inter[eé]s|rate (cut|hike)s?|bajada de tipos|subida de tipos|econom(y|ía)|bank of england|BoJ|consumer (spending|confidence)|retail sales)\b/i],
  ['empresas','Empresas','Companies','briefcase',262,/\b(earnings|results|resultados|beneficios?|revenue|ingresos|profit|CEO|CFO|layoffs?|despidos|merger|fusi[oó]n|acquisition|acquire[sd]?|adquiere|adquisici[oó]n|takeover|OPA|IPO|salida a bolsa|guidance|quarter(ly)?|trimestre|dividend|dividendo|buyback|shares? (jump|fall|soar|plunge|rise|drop)\w*|stock (jumps?|falls?|soars?|plunges?)|acciones de)\b/i],
  ['tecnologia','Tecnología','Tech','cpu',190,/\b(AI|IA|artificial intelligence|inteligencia artificial|chips?|semiconductor\w*|nvidia|openai|software|cloud|tech|tecnol[oó]g\w*|smartphone|data cent(er|re)s?)\b/i],
  ['mercados','Mercados','Markets','bars',152,/\b(stocks?|wall street|S&P|S&P 500|dow|nasdaq|ibex|ftse|dax|cac|nikkei|bolsas?|markets?|mercados?|bonds?|bonos|treasur(y|ies)|yields?|rentabilidad|futures|futuros|rally|sell-?off|index|[ií]ndice|ETFs?|prima de riesgo|divisas?|dollar|d[oó]lar|euro|peso|yen)\b/i]];
const NEWS_GENERAL=['general','Finanzas','Finance','news',215];
function newsTopic(it){ if(it.mine&&it.mine.length) return NEWS_TOPICS.find(t=>t[0]==='empresas');
  const t=it.t; return NEWS_TOPICS.find(x=>x[5].test(t))||((it.k||[]).length?NEWS_TOPICS.find(t=>t[0]==='empresas'):NEWS_GENERAL); }
// Origen: California si el titular lo menciona; si no, la región más concreta del servidor o el dominio del medio
const NEWS_FLAG={global:'🌍',us:'🇺🇸',eu:'🇪🇺',es:'🇪🇸',gb:'🇬🇧',de:'🇩🇪',fr:'🇫🇷',it:'🇮🇹',pt:'🇵🇹',ca:'🇨🇦',mx:'🇲🇽',br:'🇧🇷',ar:'🇦🇷',co:'🇨🇴',cl:'🇨🇱',jp:'🇯🇵',cn:'🇨🇳',in:'🇮🇳',kr:'🇰🇷',au:'🇦🇺'};
const NEWS_CAL=/\b(California|Californian|Los Angeles|San Francisco|Silicon Valley|Bay Area|San Diego|San Jose|Sacramento|Orange County|Newsom|CalPERS|CalSTRS|Golden State|Irvine|Oakland|Long Beach|Pasadena|Hollywood)\b/i;
const NEWS_TLD={'.es':'es','.mx':'mx','.com.mx':'mx','.co.uk':'gb','.uk':'gb','.de':'de','.fr':'fr','.it':'it','.pt':'pt','.ca':'ca','.com.br':'br','.br':'br','.com.ar':'ar','.ar':'ar','.com.co':'co','.cl':'cl','.jp':'jp','.cn':'cn','.hk':'cn','.in':'in','.kr':'kr','.com.au':'au','.au':'au','.eu':'eu'};
function newsOrigin(it,R){ if(NEWS_CAL.test(it.t)) return {cal:true,label:'California'};
  const pri=r=>r==='global'?0:r==='us'?1:r==='eu'?2:3; let r=(it.rg&&it.rg[0])||(it.r||[]).slice().sort((a,b)=>pri(b)-pri(a))[0];
  if(!r){ const d=String(it.d||''); const k=Object.keys(NEWS_TLD).sort((a,b)=>b.length-a.length).find(x=>d.endsWith(x)); r=k?NEWS_TLD[k]:''; }
  if(!r) return null; const reg=R.get(r)||{id:r,name:r.toUpperCase()}; return {flag:NEWS_FLAG[r]||'',label:regionL(reg)}; }
// Logo del medio: iniciales y un color estable por dominio (no se descargan logotipos: ni CDNs ni rastreo)
function newsLogo(it){ const n=String(it.s||it.d||'?').replace(/^(the|el|la|los|las)\s+/i,'').replace(/\.(com|es|org|net|co\.uk|mx)$/i,''); const w=n.split(/[\s.\-]+/).filter(Boolean);
  const ini=(w.length>1?w[0][0]+w[1][0]:n.slice(0,2)).toUpperCase(); let h=0; for(const c of String(it.d||it.s)) h=(h*31+c.charCodeAt(0))%9973; h=[215,262,190,350,152,18,240,320,200,280,170,0][h%12];
  return `<span class="nlogo" style="--h:${h}" aria-hidden="true">${esc(ini)}</span>`; }
async function loadNews(force){
  if(NEWS.loading) return NEWS.loading;
  if(!force&&NEWS.data&&Date.now()-NEWS.at<10*60000) return NEWS.data;
  NEWS.loading=(async()=>{ try{ const r=await fetch(newsURL()+(force?'?t='+Date.now():''),{cache:force?'reload':'default',credentials:'omit',referrerPolicy:'no-referrer'});
      if(!r.ok) throw Object.assign(new Error(r.status===404?L('todavía no hay noticias publicadas','no news published yet'):'HTTP '+r.status),{code:r.status===404?'none':''});
      const d=await r.json(); if(!d||!Array.isArray(d.items)) throw new Error(L('formato desconocido','unknown format'));
      NEWS.data=sanitizeNews(d); NEWS.at=Date.now(); NEWS.err=''; }
    catch(e){ NEWS.err=navigator.onLine===false?L('sin conexión','offline'):String(e.message||e); NEWS.errCode=e.code||''; }
    finally{ NEWS.loading=null; } return NEWS.data; })();
  return NEWS.loading;
}
// news.json viene de internet: se valida la forma de todo antes de usarlo
function sanitizeNews(d){ const S_=(v,n)=>typeof v==='string'?v.slice(0,n):''; const ids=v=>arr(v).filter(x=>typeof x==='string'&&/^[\w.-]{1,16}$/.test(x));
  return {v:d.v,updated:typeof d.updated==='string'&&!isNaN(Date.parse(d.updated))?d.updated:new Date(0).toISOString(),
    regions:arr(d.regions).filter(r=>r&&typeof r.id==='string'&&/^[a-z]{2,10}$/.test(r.id)).map(r=>({id:r.id,name:S_(r.name,40)||r.id,country:!!r.country})),
    universe:arr(d.universe).filter(u=>u&&typeof u.s==='string').map(u=>({s:u.s.slice(0,16),n:S_(u.n,120),...(Array.isArray(u.a)?{a:u.a.filter(x=>typeof x==='string').map(x=>x.slice(0,80))}:{})})),
    feeds:arr(d.feeds).filter(f=>f&&typeof f==='object').map(f=>({id:S_(f.id,40),region:S_(f.region,10),ok:!!f.ok,n:Math.max(0,parseInt(f.n)||0),err:S_(f.err,120)})),
    tickers:d.tickers&&typeof d.tickers==='object'?{queried:parseInt(d.tickers.queried)||0,ok:parseInt(d.tickers.ok)||0,stopped:S_(d.tickers.stopped,120)}:null,
    items:arr(d.items).filter(x=>x&&typeof x.t==='string'&&typeof x.u==='string'&&/^https?:\/\//i.test(x.u)&&typeof x.p==='string'&&!isNaN(Date.parse(x.p)))
      .map(x=>({t:x.t.slice(0,400),u:x.u.slice(0,2000),s:S_(x.s,80),d:S_(x.d,100),p:new Date(Date.parse(x.p)).toISOString(),r:ids(x.r),k:ids(x.k)}))}; }
function newsSettings(){ const st=S.settings; st.newsTab=st.newsTab||'cartera'; st.newsCountries=Array.isArray(st.newsCountries)?st.newsCountries:['gb','de','mx','jp']; st.newsHide=Array.isArray(st.newsHide)?st.newsHide:[]; return st; }
function myPositions(){ const m=new Map();
  S.accounts.filter(a=>a.holdings&&a.holdings.rows).forEach(a=>a.holdings.rows.forEach(x=>{ if(x.fund) return; const s=String(x.sym||'').toUpperCase().trim(); if(!s) return; const o=m.get(s)||{s,name:x.name||'',value:0}; o.value+=x.value||0; if(!o.name&&x.name) o.name=x.name; m.set(s,o); }));
  return [...m.values()].sort((a,b)=>b.value-a.value); }
function newsMatcher(pos,uni){ const U=new Map((uni||[]).map(u=>[u.s,u]));
  return pos.map(p=>{ const u=U.get(p.s)||U.get(p.s.replace('-','.')); const rx=[]; const escR=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(p.s.length>=3&&!NEWS_WORDS.has(p.s)) rx.push(new RegExp('(^|[^A-Za-z0-9$])\\$?'+escR(p.s)+'(?![A-Za-z0-9])'));
    else if(p.s.length>=1) rx.push(new RegExp('\\$'+escR(p.s)+'(?![A-Za-z0-9])|\\('+escR(p.s)+'\\)'));
    const fundy=n=>/\b(ETF|Fund|Trust|Shares|SPDR|iShares|Vanguard|Invesco|Schwab|Index|Portfolio)\b/i.test(n);
    const base=n=>String(n||'').replace(/,?\s+(Inc|Incorporated|Corp|Corporation|Co|Company|Ltd|Limited|plc|PLC|SA|S\.A\.|AG|NV|N\.V\.|Holdings?|Group|Class [A-C]|Cl [A-C]|ADR|Common Stock|Ordinary Shares)\.?\b.*$/,'').trim();
    const names=u&&u.a?u.a:u?(fundy(u.n)?[]:[u.n]):(p.name&&!fundy(p.name)?[base(p.name)]:[]);
    names.filter(n=>(n.length>=4||/^[A-Z&]{2,}$/.test(n))&&!NEWS_AMBIG.has(n)).forEach(n=>rx.push(new RegExp('(^|[^\\p{L}])'+escR(n)+'(?![\\p{L}])','u')));
    return {s:p.s,covered:!!u,rx}; }); }
function newsAgo(iso){ const m=Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000)); if(m<1) return L('ahora','now'); if(m<60) return L('hace '+m+' min',m+' min ago'); const h=Math.round(m/60); if(h<48) return L('hace '+h+' h',h+' h ago'); const dd=Math.round(h/24); return L('hace '+dd+' días',dd+' days ago'); }
function newsTime(iso){ const d=new Date(iso), n=new Date(); const same=d.toDateString()===n.toDateString();
  return same?d.toLocaleTimeString(NEWS_LOC(),{hour:'2-digit',minute:'2-digit'}):LANG==='en'?String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0'):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }
function newsRows(st){ const D=NEWS.data; if(!D) return {rows:[],extra:''};
  const hide=new Set(st.newsHide), q=NEWS.q.trim().toLowerCase(); const tab=st.newsTab; const R=new Map((D.regions||[]).map(r=>[r.id,r]));
  let rows=[], extra='';
  if(tab==='cartera'){
    const pos=myPositions(); if(!pos.length) return {rows:[],extra:'',empty:L('Sube el CSV de Holdings de M1 en <a href="#importar">Cuentas → Importar</a> y aquí verás las noticias de cada una de tus posiciones.','Upload the M1 Holdings CSV in <a href="#importar">Accounts → Import</a> and you\'ll see news for each of your positions here.')};
    const M=newsMatcher(pos,D.universe); const cnt={};
    D.items.forEach(it=>{ const hits=M.filter(m=>(it.k||[]).includes(m.s)||m.rx.some(r=>r.test(it.t))).map(m=>m.s); if(hits.length){ hits.forEach(h=>cnt[h]=(cnt[h]||0)+1); rows.push(Object.assign({},it,{mine:hits})); } });
    if(NEWS.tk!=='all'&&!pos.some(p=>p.s===NEWS.tk)) NEWS.tk='all';
    if(NEWS.tk!=='all') rows=rows.filter(it=>it.mine.includes(NEWS.tk));
    const unc=M.filter(m=>!m.covered).map(m=>m.s);
    extra=`<div class="nchips">${ic('briefcase')}<button class="${NEWS.tk==='all'?'on':''}" data-tk="all">${L('Todas','All')}<i>${pos.length}</i></button>${pos.map(p=>`<button class="${NEWS.tk===p.s?'on':''}" data-tk="${esc(p.s)}" title="${esc(p.name)}">${esc(p.s)}<i>${cnt[p.s]||0}</i></button>`).join('')}</div>`
      +(unc.length?`<div class="nnote">${L(`Sin búsqueda propia: ${unc.map(esc).join(', ')}. Solo aparecen si salen en los titulares generales. Para cubrirlos, añádelos a <code>news/universe.json</code> en GitHub (es un archivo público: no incluyas nada que no quieras que se vea).`,`No dedicated search: ${unc.map(esc).join(', ')}. They only appear if they show up in the general headlines. To cover them, add them to <code>news/universe.json</code> on GitHub (it is a public file: don't include anything you don't want seen).`)}</div>`:'');
  } else if(tab==='paises'){
    const C=(D.regions||[]).filter(r=>r.country); const sel=new Set(st.newsCountries.filter(c=>R.has(c)));
    extra=`<div class="nchips">${C.map(c=>`<button class="${sel.has(c.id)?'on':''}" data-cty="${esc(c.id)}">${NEWS_FLAG[c.id]||''} ${esc(regionL(c))}</button>`).join('')}</div>`;
    rows=D.items.filter(it=>(it.r||[]).some(r=>sel.has(r))).map(it=>Object.assign({},it,{rg:(it.r||[]).filter(r=>sel.has(r))}));
    if(!sel.size) return {rows:[],extra,empty:L('Elige uno o varios países.','Choose one or more countries.')};
  } else rows=D.items.filter(it=>(it.r||[]).includes(tab));
  rows=rows.filter(it=>!hide.has(it.d)&&(!q||(it.t+' '+it.s+' '+(it.mine||[]).join(' ')).toLowerCase().includes(q)));
  rows.forEach(it=>{ it.tp=newsTopic(it); }); const tcount={}; rows.forEach(it=>{ tcount[it.tp[0]]=(tcount[it.tp[0]]||0)+1; });
  if(NEWS.topic!=='all'&&!tcount[NEWS.topic]) NEWS.topic='all';
  if(NEWS.topic!=='all') rows=rows.filter(it=>it.tp[0]===NEWS.topic);
  rows.sort((a,b)=>b.p.localeCompare(a.p)); return {rows,extra,tcount};
}
function newsRowHTML(it,R){ const src=esc(it.s||it.d), tp=it.tp||newsTopic(it), o=newsOrigin(it,R);
  return `<article class="nw">${newsLogo(it)}<div class="nw-b"><div class="nw-m"><b>${src}</b><span title="${esc(new Date(it.p).toLocaleString(NEWS_LOC()))}">· ${newsAgo(it.p)}</span></div>
    <a class="nw-t" href="${esc(it.u)}" target="_blank" rel="noopener noreferrer">${esc(it.t)}</a>
    <div class="nw-tags"><span class="ntp" style="--h:${tp[4]}">${ic(tp[3])}${L(tp[1],tp[2])}</span>${o?`<span class="nrg">${o.cal?ic('pin'):`<span class="fl">${o.flag}</span>`}${esc(o.label)}</span>`:''}${(it.mine||[]).map(s=>`<span class="tk">${esc(s)}</span>`).join('')}</div></div>
    <button class="x" data-hide="${esc(it.d)}" title="${L('Ocultar','Hide')} ${src}" aria-label="${L('Ocultar las noticias de','Hide news from')} ${src}">${ic('close')}</button></article>`; }
function newsDay(iso){ const d=new Date(iso), n=new Date(); const y=new Date(); y.setDate(n.getDate()-1);
  if(d.toDateString()===n.toDateString()) return L('Hoy','Today'); if(d.toDateString()===y.toDateString()) return L('Ayer','Yesterday');
  const s=d.toLocaleDateString(NEWS_LOC(),{weekday:'long',day:'numeric',month:'long'}); return s.charAt(0).toUpperCase()+s.slice(1); }
function invTabs(cur){ return `<div class="tabs-inline" style="margin-bottom:12px"><a class="btn ${cur==='cartera'?'pri':''}" href="#inversiones">${L('Cartera','Portfolio')}</a><a class="btn ${cur==='noticias'?'pri':''}" href="#noticias">${L('Noticias','News')}</a>${cur==='noticias'?helpBtn('news',true):''}</div>`; }
VIEWS.noticias=(el)=>{
  const st=newsSettings(); if(!NEWS_TABS.some(t=>t[0]===st.newsTab)) st.newsTab='cartera';
  el.innerHTML=invTabs('noticias')+`<div class="card" id="newsTop">
      <div class="nhead"><h2>${L('Noticias de inversión','Investment news')}</h2><span class="nlive" id="tState"></span><button class="sm sp" id="tRef" title="${L('Actualizar (R)','Refresh (R)')}">${ic('refresh')}${L('Actualizar','Refresh')}</button></div>
      <div class="ntabs" role="tablist">${NEWS_TABS.map(([k,l],i)=>`<button role="tab" data-ntab="${k}" class="${st.newsTab===k?'on':''}" aria-selected="${st.newsTab===k}"><span class="fk">${i+1}</span>${l}</button>`).join('')}</div>
      <div class="nsearch">${ic('search')}<input id="tQ" type="search" placeholder="${L('Buscar en los titulares o por símbolo','Search headlines or symbols')}" value="${esc(NEWS.q)}" autocomplete="off" spellcheck="false" aria-label="${L('Buscar','Search')}"></div>
      <div id="tTopics"></div><div id="tExtra"></div></div>
    <div id="tBody"></div><div class="nfoot" id="tFoot"></div>
    <p class="muted" style="margin:12px 4px 0">${L('Titulares de medios de acceso libre, actualizados cada hora; los enlaces llevan a la web que publica cada noticia. El tema y el origen los deduce la app del titular. Para ver tus posiciones, la app descarga la misma lista que cualquiera y la filtra en este dispositivo: nadie sabe qué tienes.','Headlines from free-access outlets, refreshed every hour; the links go to the website that publishes each story. The app works out the topic and origin from the headline. To show your positions, the app downloads the same list as everyone else and filters it on this device: nobody knows what you hold.')}</p>`;
  const body=$('#tBody'), foot=$('#tFoot');
  const draw=()=>{ const D=NEWS.data; const stt=$('#tState');
    if(!D){ stt.innerHTML=`<i class="${NEWS.loading?'old':'off'}"></i>${NEWS.loading?L('Cargando…','Loading…'):L('Sin datos','No data')}`; $('#tTopics').innerHTML=''; $('#tExtra').innerHTML='';
      body.innerHTML=`<div class="card nempty"><div class="empty"><div class="ei">${ic('news')}</div><p>${NEWS.loading?L('Cargando titulares…','Loading headlines…'):L('No se pudieron cargar las noticias (','Could not load the news (')+esc(NEWS.err)+').'+(NEWS.errCode==='none'?L('<br>La tarea de GitHub "Noticias" aún no se ha ejecutado.','<br>The GitHub "Noticias" workflow hasn\'t run yet.'):'')}</p></div></div>`; foot.innerHTML=''; return; }
    const age=Date.now()-Date.parse(D.updated); const stale=age>6*3600e3; const R=new Map((D.regions||[]).map(r=>[r.id,r]));
    stt.innerHTML=`<i class="${NEWS.err?'off':stale?'old':''}"></i>${NEWS.err?L('Sin conexión · ','Offline · '):''}${L('Actualizado ','Updated ')}${newsAgo(D.updated)}`;
    const {rows,extra,empty,tcount}=newsRows(st);
    const tops=[['all',L('Todas','All'),'news',(rows&&!empty)?Object.values(tcount||{}).reduce((a,b)=>a+b,0):0]].concat([...NEWS_TOPICS,NEWS_GENERAL].filter(t=>tcount&&tcount[t[0]]).map(t=>[t[0],L(t[1],t[2]),t[3],tcount[t[0]]]).sort((a,b)=>b[3]-a[3]));
    $('#tTopics').innerHTML=empty||tops.length<3?'':`<div class="nchips scroll" role="group" aria-label="${L('Temas','Topics')}">${tops.map(([k,l,i,n])=>`<button class="${NEWS.topic===k?'on':''}" data-topic="${k}">${ic(i)}${esc(l)}<i>${n}</i></button>`).join('')}</div>`;
    $('#tExtra').innerHTML=(stale?`<div class="nnote warn">${L(`Las noticias son de ${newsAgo(D.updated)}. Puede que GitHub haya pausado la tarea: en el repositorio, Actions → Noticias → Enable workflow / Run workflow.`,`The news is from ${newsAgo(D.updated)}. GitHub may have paused the workflow: in the repository, Actions → Noticias → Enable workflow / Run workflow.`)}</div>`:'')+extra;
    if(empty) body.innerHTML=`<div class="card nempty">${empty}</div>`;
    else if(!rows.length) body.innerHTML=`<div class="card nempty">${NEWS.q?L('Ningún titular coincide con la búsqueda.','No headline matches the search.'):st.newsTab==='cartera'&&NEWS.tk!=='all'?L('Sin noticias recientes de ','No recent news for ')+esc(NEWS.tk)+'.':L('Sin titulares en esta pestaña.','No headlines in this tab.')}</div>`;
    else { const shown=rows.slice(0,NEWS.limit); const g=[]; shown.forEach(it=>{ const k=newsDay(it.p); const l=g[g.length-1]; if(l&&l.k===k) l.items.push(it); else g.push({k,items:[it]}); });
      body.innerHTML=g.map(x=>`<div class="nday">${esc(x.k)}</div><div class="card list">${x.items.map(it=>newsRowHTML(it,R)).join('')}</div>`).join('')
        +(rows.length>NEWS.limit?`<div class="row" style="justify-content:center;margin-top:12px"><button id="tMore">${L(`Ver ${Math.min(120,rows.length-NEWS.limit)} más (${rows.length-NEWS.limit} restantes)`,`Show ${Math.min(120,rows.length-NEWS.limit)} more (${rows.length-NEWS.limit} left)`)}</button></div>`:''); }
    const F=D.feeds||[]; const okN=F.filter(f=>f.ok).length;
    foot.innerHTML=`<span>${rows.length} ${L('titulares','headlines')}</span><span>${okN}/${F.length} ${L('fuentes activas','active sources')}</span><span class="hide-sm">${L('Atajos: 1–6 pestañas · / buscar · R actualizar','Shortcuts: 1–6 tabs · / search · R refresh')}</span>
      <details><summary>${L('Estado de las fuentes','Source status')}${st.newsHide.length?` · ${st.newsHide.length} ${L('ocultas','hidden')}`:''}</summary>
      ${st.newsHide.length?`<p style="margin:6px 0">${L('Ocultas','Hidden')}: ${st.newsHide.map(d=>`<button class="sm" data-unhide="${esc(d)}">${esc(d)} ✕</button>`).join(' ')}</p>`:''}
      <div class="tbl"><table><tbody>${F.map(f=>`<tr><td class="${f.ok?'ok':'ko'}">${f.ok?'●':'○'}</td><td>${esc(f.id)}</td><td>${esc(regionL(D.regions.find(r=>r.id===f.region)||{id:f.region,name:f.region}))}</td><td class="n">${f.n}</td><td>${esc(f.err||'')}</td></tr>`).join('')}</tbody></table></div>
      ${D.tickers?`<p style="margin:6px 0 0">${L('Búsquedas por símbolo en la última hora','Symbol searches in the last hour')}: ${D.tickers.ok}/${D.tickers.queried}${D.tickers.stopped?' · '+esc(D.tickers.stopped):''}. ${L('Cada símbolo se renueva cada ~4 horas.','Each symbol is refreshed every ~4 hours.')}</p>`:''}</details>`;
    el.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>{ NEWS.tk=b.dataset.tk; NEWS.limit=120; draw(); });
    el.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{ NEWS.topic=b.dataset.topic; NEWS.limit=120; draw(); });
    el.querySelectorAll('[data-cty]').forEach(b=>b.onclick=()=>{ const c=b.dataset.cty; st.newsCountries=st.newsCountries.includes(c)?st.newsCountries.filter(x=>x!==c):st.newsCountries.concat(c); save(); draw(); });
    body.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>{ const d=b.dataset.hide; if(!d) return; if(!st.newsHide.includes(d)) st.newsHide.push(d); save(); draw(); toast(L('Ocultado '+d+'. Lo recuperas en "Estado de las fuentes".','Hidden '+d+'. You can bring it back in "Source status".')); });
    foot.querySelectorAll('[data-unhide]').forEach(b=>b.onclick=()=>{ st.newsHide=st.newsHide.filter(x=>x!==b.dataset.unhide); save(); draw(); });
    const more=$('#tMore'); if(more) more.onclick=()=>{ NEWS.limit+=120; draw(); };
  };
  el.querySelectorAll('[data-ntab]').forEach(b=>b.onclick=()=>{ st.newsTab=b.dataset.ntab; NEWS.limit=120; NEWS.topic='all'; save(); el.querySelectorAll('[data-ntab]').forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-selected',x===b); }); draw(); });
  const qi=$('#tQ'); let qt; qi.oninput=()=>{ clearTimeout(qt); qt=setTimeout(()=>{ NEWS.q=qi.value; NEWS.limit=120; draw(); },120); };
  const refresh=async(force)=>{ const b=$('#tRef'); if(b) b.disabled=true; const pr=loadNews(force); draw(); await pr; if($('#tBody')===body){ draw(); if(b) b.disabled=false; } };
  $('#tRef').onclick=()=>refresh(true);
  refresh(false);
};
document.addEventListener('keydown',e=>{ if(!S||location.hash!=='#noticias'||e.metaKey||e.ctrlKey||e.altKey) return; const t=e.target; const typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);
  if(e.key==='Escape'&&t&&t.id==='tQ'){ t.blur(); return; } if(typing) return;
  if(/^[1-6]$/.test(e.key)){ const b=document.querySelectorAll('[data-ntab]')[+e.key-1]; if(b){ b.click(); e.preventDefault(); } }
  else if(e.key==='/'){ const q=$('#tQ'); if(q){ q.focus(); e.preventDefault(); } }
  else if(e.key==='r'||e.key==='R'){ const b=$('#tRef'); if(b&&!b.disabled){ b.click(); e.preventDefault(); } } });

/* ---------- Alquiler ---------- */
function rentalPL(p){
  const mort=S.accounts.find(a=>a.kind==='mortgage'&&a.propertyId===p.id);
  const mPay=mort?(mort.payment||0)+(mort.escrow||0):(p.mortgagePay||0);
  const rent=p.rent||0, hoa=p.hoa||0, tax=(p.taxYear||0)/12, ins=(p.insYear||0)/12, maint=p.maint||0, other=p.otherMonthly||0;
  const costs=mPay+hoa+tax+ins+maint+other;
  return {rent,mPay,hoa,tax,ins,maint,other,costs,net:rent-costs,mort};
}
VIEWS.alquiler=(el)=>{
  const props=S.accounts.filter(a=>a.kind==='property'&&a.rental);
  if(!props.length){ el.innerHTML=`<div class="card empty">${helpBtn('rental')}<div class="ei">${ic('building')}</div><p>${L('Añade la casa que tienes alquilada con su renta, HOA y gastos fijos.','Add the house you rent out with its rent, HOA and fixed costs.')}</p><button class="pri" id="addP">${L('Añadir casa en alquiler','Add a rental property')}</button></div>`; $('#addP').onclick=()=>editAccount(null,'property',{rental:true}); return; }
  el.innerHTML=props.map(p=>`<div id="p_${p.id}" style="margin-bottom:14px"></div>`).join('')+`<button id="addP">${L('+ Añadir otra propiedad','+ Add another property')}</button>`;
  $('#addP').onclick=()=>editAccount(null,'property',{rental:true});
  const nR=L('Renta cobrada','Rent collected'), nP=L('Gastos pagados','Expenses paid');
  props.forEach(p=>{
    const r=rentalPL(p); const box=$('#p_'+p.id); const val=balanceOf(p); const mb=r.mort?balanceOf(r.mort):null;
    const months=monthsRange(12);
    const rx=S.tx.filter(t=>['Renta alquiler','Hipoteca alquiler','HOA alquiler','Gastos alquiler'].includes(t.cat));
    const inc=months.map(m=>rx.filter(t=>ym(t.date)===m&&t.cat==='Renta alquiler').reduce((s,t)=>s+t.amount,0));
    const exp=months.map(m=>rx.filter(t=>ym(t.date)===m&&t.cat!=='Renta alquiler').reduce((s,t)=>s-t.amount,0));
    const yearExtras=S.tx.filter(t=>t.cat==='Gastos alquiler'&&daysBetween(t.date,today())<=365).reduce((s,t)=>s-t.amount,0);
    box.innerHTML=`<div class="card">${helpBtn('rental')}
      <div class="row" style="align-items:flex-start"><div><h2>${esc(p.name)}</h2><p class="sub">${L('Rentabilidad mensual con las cifras configuradas','Monthly return with the configured figures')}</p></div><button class="sm" data-edit="${p.id}">${L('Editar','Edit')}</button></div>
      <div class="grid g4">
        <div class="stat"><div class="lbl">${L('Renta mensual','Monthly rent')}</div><div class="val">${fmt(r.rent)}</div></div>
        <div class="stat"><div class="lbl">${L('Gastos mensuales','Monthly costs')}</div><div class="val">${fmt(r.costs)}</div><div class="note">${L('Hipoteca, HOA, impuestos, seguro…','Mortgage, HOA, taxes, insurance…')}</div></div>
        <div class="stat"><div class="lbl">${L('Flujo de caja','Cash flow')}</div><div class="val ${r.net>=0?'pos':'neg'}">${fmt(r.net)}</div><div class="note">${fmt(r.net*12)} ${L('al año','per year')}</div></div>
        <div class="stat"><div class="lbl">${L('Valor neto en la casa','Equity in the house')}</div><div class="val">${val!=null?fmt(val-(mb||0)):'—'}</div><div class="note">${val!=null?`${L('Valor','Value')} ${fmtK(val)}${mb!=null?L(' − hipoteca ',' − mortgage ')+fmtK(mb):''}`:L('Añade el valor estimado','Add the estimated value')}</div></div>
      </div>
      <h3 class="sec">${L('Desglose mensual','Monthly breakdown')}</h3>
      ${hbars([{k:L('Renta','Rent'),v:r.rent,c:'var(--s3)'},{k:L('Hipoteca','Mortgage')+(r.mort?'':' (manual)'),v:r.mPay,c:'var(--s2)'},{k:'HOA',v:r.hoa,c:'var(--s2)'},{k:L('Impuestos','Taxes'),v:r.tax,c:'var(--s2)'},{k:L('Seguro','Insurance'),v:r.ins,c:'var(--s2)'},{k:L('Mantenimiento','Maintenance'),v:r.maint,c:'var(--s2)'},{k:L('Otros','Other'),v:r.other,c:'var(--s2)'}].filter(i=>i.v>0))}
      ${yearExtras?`<p class="muted" style="margin-top:10px">${L(`Gastos extra registrados en los últimos 12 meses (reparaciones, etc.): <b>${fmt(yearExtras)}</b>, unos ${fmt(yearExtras/12)} al mes.`,`Extra costs recorded in the last 12 months (repairs, etc.): <b>${fmt(yearExtras)}</b>, about ${fmt(yearExtras/12)} a month.`)}</p>`:''}
      ${rx.length?`<h3 class="sec">${L('Movimientos reales de la casa','Actual transactions for the house')}</h3>${legend([{n:nR,c:'var(--s3)'},{n:nP,c:'var(--s2)'}])}<div class="rchart"></div>`:`<p class="muted" style="margin-top:10px">${L('Cuando importes movimientos con las categorías "Renta alquiler", "HOA alquiler" o "Gastos alquiler", verás aquí lo cobrado y pagado de verdad cada mes.','When you import transactions with the categories "Rental income", "Rental HOA" or "Rental expenses", you\'ll see here what was actually collected and paid each month.')}</p>`}
      <div class="row" style="margin-top:12px"><button class="sm" data-extra="${p.id}">${L('+ Registrar gasto extra (reparación, etc.)','+ Record an extra cost (repair, etc.)')}</button><button class="sm" data-val="${p.id}">${L('Actualizar valor de la casa','Update the house value')}</button></div>
    </div>`;
    if(rx.length) barChart(box.querySelector('.rchart'),{labels:months.map(ymLabel),series:[{name:nR,color:'var(--s3)',values:inc},{name:nP,color:'var(--s2)',values:exp}],height:180});
    box.querySelector('[data-edit]').onclick=()=>editAccount(p.id);
    box.querySelector('[data-val]').onclick=()=>addSnapshot(p.id);
    box.querySelector('[data-extra]').onclick=()=>{ openModal(`<h2>${L('Gasto extra','Extra cost')} · ${esc(p.name)}</h2><div class="row"><label class="f">${L('Fecha','Date')}<input type="date" id="xD" value="${today()}"></label><label class="f">${L('Importe','Amount')}<input id="xA" inputmode="decimal" placeholder="350"></label></div><label class="f">${L('Concepto','Description')}<input id="xC" placeholder="${L('Fontanero, pintura…','Plumber, paint…')}"></label><div class="row"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="xOk">${L('Guardar','Save')}</button></div>`); $('#mc').onclick=closeModal; $('#xOk').onclick=()=>{const a=num($('#xA').value); if(isNaN(a))return toast(L('Pon un importe','Enter an amount')); S.tx.push({id:uid(),date:isoDate($('#xD').value)||today(),desc:($('#xC').value||L('Gasto','Expense'))+' · '+p.name,amount:-Math.abs(a),cat:'Gastos alquiler',acc:null,src:'manual'}); save(); closeModal(); route();}; };
  });
};

/* ---------- Cuentas ---------- */
/* Cuentas → Importar: importar es una acción de Cuentas, no una sección aparte.
   IMPORT_FOR: cuenta elegida con su botón "Importar" (los archivos van a ella salvo que sus
   últimos 4 dígitos sean de otra). IMPORT_NEW: se viene de "Añadir cuenta" (en la revisión,
   "cuenta nueva" queda preseleccionada si el archivo no es de ninguna cuenta conocida). */
let IMPORT_FOR=null, IMPORT_NEW=false;
function forAcc(filter){ const a=IMPORT_FOR&&acc(IMPORT_FOR); return a&&filter(a)?a:null; }
function acctTabs(cur){ return `<div class="tabs-inline" style="margin-bottom:12px"><a class="btn ${cur==='cuentas'?'pri':''}" href="#cuentas">${L('Mis cuentas','My accounts')}</a><a class="btn ${cur==='importar'?'pri':''}" href="#importar">${L('Importar','Import')}</a></div>`; }
// Abre Cuentas → Importar y, ya pintada la pantalla, ejecuta fn.
function openImport(fn){ if(location.hash==='#importar'){ fn(); return; } const h=()=>{ window.removeEventListener('hashchange',h); setTimeout(fn,0); }; window.addEventListener('hashchange',h); location.hash='#importar'; }
// Un archivo: revisión paso a paso (permite crear la cuenta). Varios: por lotes.
function importFiles(fs,{forId=null,isNew=false}={}){ fs=[...fs]; if(!fs.length) return;
  openImport(()=>{ IMPORT_FOR=forId; IMPORT_NEW=isNew; importBanner(); if(fs.length===1&&!forId){ isPdfFile(fs[0])?queuePDF(fs[0]):handleCSV(fs[0]); } else importBatch(fs); }); }
const PICK_ACCEPT='.pdf,.csv,application/pdf,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain';
// Avatar de cuenta: iniciales de la entidad (o del nombre) con el color de su tipo
const KIND_HUE={cash:215,credit:350,brokerage:152,retirement:262,kids:320,property:36,mortgage:18,other:190};
function accAv(a){ const src=(a.institution||a.name||'?').replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ ]/g,' ').trim(); const w=src.split(/\s+/).filter(x=>x&&!/^(of|de|del|the|la|el|and|y)$/i.test(x));
  const ini=(w.length>1?w[0][0]+w[1][0]:src.slice(0,2)).toUpperCase(); return `<span class="av" style="--h:${KIND_HUE[a.kind]||215}">${esc(ini)}</span>`; }
VIEWS.cuentas=(el)=>{
  const groups=Object.keys(KINDS);
  const row=a=>{ const s=lastSnap(a.id); return `<button class="lrow" data-acc="${esc(a.id)}">${accAv(a)}<span class="lm"><b>${esc(a.last4?a.name.replace(/\s*···\d{4}$/,''):a.name)}</b><span>${esc(a.institution||KINDS[a.kind].label)}${a.last4?' · ···'+esc(a.last4):''}</span></span><span class="lr"><b>${s?fmt(s.value,2):'—'}</b><span>${s?dLabel(s.date):L('sin saldo','no balance')}</span></span>${ic('right','chev')}</button>`; };
  el.innerHTML=acctTabs('cuentas')+`
  <input type="file" id="fAcc" accept="${PICK_ACCEPT}" multiple hidden>
  ${S.accounts.length?`<div class="card" style="margin-bottom:4px">${helpBtn('accounts')}<div class="row"><div><h2 style="margin:0">${L('Tus cuentas','Your accounts')}</h2><p class="muted" style="margin:2px 0 0">${L(`${S.accounts.length} cuentas`,`${S.accounts.length} accounts`)}</p></div><button class="pri" id="addA">${ic('plus')}${L('Añadir cuenta','Add account')}</button></div></div>`
  +groups.filter(k=>S.accounts.some(a=>a.kind===k)).map(k=>{ const accs=S.accounts.filter(a=>a.kind===k); const tot=accs.reduce((t,a)=>t+(balanceOf(a)||0),0);
    return `<h3 class="sec">${KINDS[k].label}<span class="tot">${fmt(tot)}</span></h3><div class="card list">${accs.map(row).join('')}</div>`; }).join('')
  :`<div class="card">${helpBtn('acc_first')}<h2>${L('Crea tu primera cuenta desde un extracto','Create your first account from a statement')}</h2><p class="sub">${L('Elige uno o varios extractos (PDF o CSV). La app crea la cuenta por ti y tú solo lo revisas.','Choose one or more statements (PDF or CSV). The app creates the account for you and you just review it.')}</p>
    <div class="drop" id="dropFirst"><label class="pick">${ic('upload')}${L('Elegir extractos (PDF o CSV)','Choose statements (PDF or CSV)')}<input type="file" accept="${PICK_ACCEPT}" id="fFirst" multiple></label><div class="muted" style="margin-top:8px">${L('o arrástralos aquí desde el ordenador','or drag them here from your computer')}</div></div>
    <p class="muted" style="margin:12px 0 0">${L('¿Una casa, efectivo o una cuenta sin extractos?','A house, cash or an account without statements?')} <button class="sm" id="addNoDoc">${L('Crear sin documento','Create without a document')}</button></p></div>`}`;
  if($('#addA')) $('#addA').onclick=addAccountModal;
  if($('#addNoDoc')) $('#addNoDoc').onclick=()=>editAccount(null,'cash');
  if($('#dropFirst')){ const d=$('#dropFirst'); d.ondragover=e=>{e.preventDefault();d.classList.add('over')}; d.ondragleave=()=>d.classList.remove('over'); d.ondrop=e=>{e.preventDefault();d.classList.remove('over'); importFiles(e.dataTransfer.files,{isNew:true});}; $('#fFirst').onchange=e=>{ const fs=[...e.target.files]; e.target.value=''; importFiles(fs,{isNew:true}); }; }
  $('#fAcc').onchange=e=>{ const fs=[...e.target.files]; e.target.value=''; const t=$('#fAcc').dataset.target; if(t&&acc(t)) importFiles(fs,{forId:t}); };
  el.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>accountSheet(b.dataset.acc));
};
// Ficha de una cuenta: saldo, últimos movimientos y acciones
function accountSheet(id){ const a=acc(id); if(!a) return; const s=lastSnap(a.id);
  const recent=S.tx.filter(t=>t.acc===id).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,5);
  openModal(`<div class="sheet-head">${accAv(a)}<div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(a.name)}</h2><div class="muted">${KINDS[a.kind].label}${a.institution?' · '+esc(a.institution):''}${a.last4?' · ···'+esc(a.last4):''}</div></div></div>
    <div class="sheet-big">${s?fmt(s.value,2):'—'}</div><div class="muted">${s?L('Saldo del ','Balance on ')+dLabel(s.date):L('Sin saldo todavía','No balance yet')}</div>
    <div class="actgrid">${a.kind==='property'?'':`<button data-imp="${esc(a.id)}">${ic('upload')}${L('Importar','Import')}</button>`}<button data-snap="${esc(a.id)}">${ic('refresh')}${L('Actualizar saldo','Update balance')}</button><button data-edit="${esc(a.id)}">${ic('edit')}${L('Editar','Edit')}</button><button data-hist="${esc(a.id)}">${ic('clock')}${L('Historial','History')}</button></div>
    ${recent.length?`<h3 class="sec" style="margin-top:4px">${L('Últimos movimientos','Latest transactions')}</h3><div class="list" style="margin:0 -20px">${recent.map(t=>txRow(t,true)).join('')}</div>`:''}
    <div class="row" style="margin-top:12px"><button id="mc">${L('Cerrar','Close')}</button></div>`);
  $('#mc').onclick=closeModal;
  const m=$('#modal');
  const imp=m.querySelector('[data-imp]'); if(imp) imp.onclick=()=>{ closeModal(); const f=$('#fAcc'); if(f){ f.dataset.target=id; f.click(); } };
  m.querySelector('[data-snap]').onclick=()=>addSnapshot(id); m.querySelector('[data-edit]').onclick=()=>editAccount(id); m.querySelector('[data-hist]').onclick=()=>showHistory(id);
  m.querySelectorAll('[data-tx]').forEach(b=>b.onclick=()=>txSheet(b.dataset.tx));
}
// Alta de cuenta: primero desde un extracto; a mano solo si no hay documento.
function addAccountModal(){
  openModal(`<h2>${L('Nueva cuenta','New account')}</h2>
   <p class="sub">${L('Lo más rápido y fiable es importar un extracto de la cuenta: la app lee la entidad, el tipo, los últimos 4 dígitos, el saldo y los movimientos, y crea la cuenta con todo. Después solo revisas.','The fastest and most reliable way is to import a statement of the account: the app reads the institution, the type, the last 4 digits, the balance and the transactions, and creates the account with everything. Then you just review.')}</p>
   <label class="pick" style="display:block;text-align:center">${L('Elegir extracto (PDF o CSV)','Choose statement (PDF or CSV)')}<input type="file" id="fNew" accept="${PICK_ACCEPT}" multiple></label>
   <p class="muted" style="margin:14px 0 6px">${L('¿No tienes extractos? Por ejemplo, una casa, efectivo o un préstamo sin documentos.','No statements? For example, a house, cash or a loan without documents.')}</p>
   <div class="row"><button id="nNoDoc">${L('Crear sin documento','Create without a document')}</button><button id="nCancel">${L('Cancelar','Cancel')}</button></div>`);
  $('#nCancel').onclick=closeModal; $('#nNoDoc').onclick=()=>{ closeModal(); editAccount(null,'cash'); };
  $('#fNew').onchange=e=>{ const fs=[...e.target.files]; e.target.value=''; if(!fs.length) return; closeModal(); importFiles(fs,{isNew:true}); };
}
function editAccount(id, kind='cash', preset={}){
  const a=id?acc(id):Object.assign({id:null,kind,name:'',institution:''},preset);
  const k=a.kind;
  const props=S.accounts.filter(x=>x.kind==='property');
  const ck=(i,on,txt)=>`<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="${i}" style="width:auto" ${on?'checked':''}> ${txt}</label>`;
  openModal(`<h2>${id?L('Editar cuenta','Edit account'):L('Nueva cuenta','New account')}</h2>
   <label class="f">${L('Tipo','Type')}<select id="eK">${Object.entries(KINDS).map(([kk,v])=>`<option value="${kk}" ${kk===k?'selected':''}>${v.label}</option>`).join('')}</select></label>
   <div class="row"><label class="f">${L('Nombre','Name')}<input id="eN" value="${esc(a.name)}" placeholder="${k==='mortgage'?L('Hipoteca casa','Home mortgage'):k==='property'?L('Casa en alquiler','Rental house'):L('Cuenta corriente Chase','Chase checking')}"></label><label class="f">${L('Entidad','Institution')}<input id="eI" value="${esc(a.institution||'')}"></label></div>
   <label class="f">${L('Últimos 4 dígitos (opcional, solo para identificarla)','Last 4 digits (optional, just to identify it)')}<input id="eL" maxlength="4" inputmode="numeric" value="${esc(a.last4||'')}"></label>
   ${!id?`<div class="row"><label class="f">${L('Saldo actual','Current balance')}${KINDS[k].asset?'':L(' (lo que debes)',' (what you owe)')}<input id="eB" inputmode="decimal"></label><label class="f">${L('Fecha del saldo','Balance date')}<input type="date" id="eBD" value="${today()}"></label></div>`:''}
   <div id="eExtra"></div>
   <div class="row" style="margin-top:12px">${id?`<button class="dan" id="eDel">${L('Borrar','Delete')}</button>`:''}<button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="eOk">${L('Guardar','Save')}</button></div>`);
  const extra=()=>{ const kk=$('#eK').value; let h='';
    if(kk==='mortgage') h=`<div class="row"><label class="f">${L('Tipo de interés %','Interest rate %')}<input id="xR" inputmode="decimal" value="${a.rate??''}"></label><label class="f">${L('Cuota capital+intereses','Principal + interest payment')}<input id="xP" inputmode="decimal" value="${a.payment??''}"></label></div><div class="row"><label class="f">${L('Principal extra mensual','Monthly extra principal')}<input id="xE" inputmode="decimal" value="${a.extra??0}"></label><label class="f">${L('Escrow mensual (si lo hay)','Monthly escrow (if any)')}<input id="xS" inputmode="decimal" value="${a.escrow??0}"></label></div><label class="f">${L('Inmueble asociado','Linked property')}<select id="xPr"><option value="">—</option>${props.map(p=>`<option value="${p.id}" ${a.propertyId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>${ck('xPre',a.pre2017,L('Préstamo firmado antes del 16/12/2017 (límite de deducción $1M)','Loan taken out before 12/16/2017 ($1M deduction limit)'))}`;
    if(kk==='property') h=`${ck('xRent',a.rental,L('La tengo alquilada','I rent it out'))}<div class="row"><label class="f">${L('Renta mensual','Monthly rent')}<input id="xRn" inputmode="decimal" value="${a.rent??''}"></label><label class="f">${L('HOA mensual','Monthly HOA')}<input id="xH" inputmode="decimal" value="${a.hoa??''}"></label></div><div class="row"><label class="f">${L('Impuestos propiedad / año','Property tax / year')}<input id="xT" inputmode="decimal" value="${a.taxYear??''}"></label><label class="f">${L('Seguro / año','Insurance / year')}<input id="xIn" inputmode="decimal" value="${a.insYear??''}"></label></div><div class="row"><label class="f">${L('Mantenimiento / mes (reserva)','Maintenance / month (reserve)')}<input id="xM" inputmode="decimal" value="${a.maint??''}"></label><label class="f">${L('Otros gastos / mes','Other costs / month')}<input id="xO" inputmode="decimal" value="${a.otherMonthly??''}"></label></div><div class="row"><label class="f">${L('Valor de la construcción, sin terreno (para impuestos)','Building value, without land (for taxes)')}<input id="xBB" inputmode="decimal" value="${a.buildingBasis??''}"></label><label class="f">${L('Año en que empezaste a alquilarla','Year you started renting it out')}<input id="xIS" inputmode="numeric" value="${a.inService??''}"></label></div><label class="f">${L('Cuota hipoteca (solo si no la añades como hipoteca)','Mortgage payment (only if you don\'t add it as a mortgage)')}<input id="xMP" inputmode="decimal" value="${a.mortgagePay??''}"></label><p class="muted">${L('El saldo de un inmueble es su valor de mercado estimado.','A property\'s balance is its estimated market value.')}</p>`;
    if(kk==='credit') h=`<label class="f">${L('APR % (opcional)','APR % (optional)')}<input id="xA" inputmode="decimal" value="${a.apr??''}"></label>`;
    if(['brokerage','retirement','kids'].includes(kk)) h=`<label class="f">${L('Total aportado de tu bolsillo (opcional, para ver la ganancia)','Total contributed out of pocket (optional, to see your gain)')}<input id="xC" inputmode="decimal" value="${a.contributed??''}"></label>`;
    $('#eExtra').innerHTML=h; };
  extra(); $('#eK').onchange=extra; $('#mc').onclick=closeModal;
  if(id) $('#eDel').onclick=()=>{ openModal(`<h2>${L('¿Borrar','Delete')} ${esc(a.name)}?</h2><p>${L('Se borrarán también su historial de saldos. Los movimientos se quedan, sin cuenta asignada.','Its balance history will be deleted too. Transactions stay, with no account assigned.')}</p><div class="row"><button id="mc">${L('Cancelar','Cancel')}</button><button class="dan" id="dOk">${L('Borrar','Delete')}</button></div>`); $('#mc').onclick=closeModal; $('#dOk').onclick=()=>{ S.accounts=S.accounts.filter(x=>x.id!==id); S.snapshots=S.snapshots.filter(s=>s.acc!==id); S.tx.forEach(t=>{if(t.acc===id)t.acc=null}); save(); closeModal(); route(); }; };
  $('#eOk').onclick=()=>{
    const v=x=>{const e=$(x); if(!e)return undefined; const n=num(e.value); return isNaN(n)?null:n;};
    const o=id?a:{id:uid()}; o.kind=$('#eK').value; o.name=$('#eN').value.trim()||KINDS[o.kind].label; o.institution=$('#eI').value.trim(); o.last4=$('#eL').value.replace(/\D/g,'').slice(-4);
    if(o.kind==='mortgage'){ o.rate=v('#xR'); o.payment=v('#xP'); o.extra=v('#xE')||0; o.escrow=v('#xS')||0; o.propertyId=$('#xPr').value||null; o.pre2017=$('#xPre').checked; }
    if(o.kind==='property'){ o.rental=$('#xRent').checked; o.rent=v('#xRn'); o.hoa=v('#xH'); o.taxYear=v('#xT'); o.insYear=v('#xIn'); o.maint=v('#xM'); o.otherMonthly=v('#xO'); o.mortgagePay=v('#xMP'); o.buildingBasis=v('#xBB'); o.inService=v('#xIS'); }
    if(o.kind==='credit') o.apr=v('#xA');
    if(['brokerage','retirement','kids'].includes(o.kind)) o.contributed=v('#xC');
    if(!id){ S.accounts.push(o); const b=num($('#eB').value); if(!isNaN(b)) S.snapshots.push({id:uid(),acc:o.id,date:$('#eBD').value||today(),value:b}); }
    if(o.kind==='mortgage') delete extraSim[o.id];
    save(); closeModal(); route(); toast(L('Guardado','Saved'));
  };
}
function addSnapshot(accId){
  const a=acc(accId); const s=lastSnap(accId);
  openModal(`<h2>${L('Saldo de','Balance of')} ${esc(a.name)}</h2><p class="muted">${a.kind==='property'?L('Valor de mercado estimado','Estimated market value'):KINDS[a.kind].asset?L('Saldo de la cuenta','Account balance'):L('Lo que debes','What you owe')}${s?L(` · último: ${fmt(s.value,2)} el ${dLabel(s.date)}`,` · last: ${fmt(s.value,2)} on ${dLabel(s.date)}`):''}</p><div class="row"><label class="f">${L('Saldo','Balance')}<input id="sV" inputmode="decimal" autofocus></label><label class="f">${L('Fecha','Date')}<input type="date" id="sD" value="${today()}"></label></div>${['brokerage','retirement','kids'].includes(a.kind)?`<label class="f">${L('Aportado este periodo (opcional)','Contributed this period (optional)')}<input id="sC" inputmode="decimal" placeholder="${L('Se suma al total aportado','Added to the total contributed')}"></label>`:''}<div class="row"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="sOk">${L('Guardar','Save')}</button></div>`);
  $('#mc').onclick=closeModal;
  $('#sOk').onclick=()=>{ const v=num($('#sV').value); if(isNaN(v)) return toast(L('Pon un saldo','Enter a balance')); upsertSnap(accId,isoDate($('#sD').value)||today(),v); const c=$('#sC')&&num($('#sC').value); if(c&&!isNaN(c)) a.contributed=(a.contributed||0)+c; save(); closeModal(); route(); toast(L('Saldo guardado','Balance saved')); };
}
function upsertSnap(accId,date,value){ let ex=S.snapshots.find(s=>s.acc===accId&&s.date===date); if(ex) ex.value=value; else S.snapshots.push(ex={id:uid(),acc:accId,date,value}); return ex; }
function showHistory(accId){
  const a=acc(accId); const list=S.snapshots.filter(s=>s.acc===accId).sort((x,y)=>y.date.localeCompare(x.date));
  openModal(`<h2>${L('Historial','History')} · ${esc(a.name)}</h2>${list.length?`<table><tbody>${list.map(s=>`<tr><td>${dLabel(s.date)}</td><td class="n">${fmt(s.value,2)}</td><td class="n"><button class="sm dan" data-del="${s.id}">✕</button></td></tr>`).join('')}</tbody></table>`:`<p class="muted">${L('Sin saldos','No balances')}</p>`}<div class="row" style="margin-top:12px"><button id="mc">${L('Cerrar','Close')}</button></div>`);
  $('#mc').onclick=()=>{closeModal();route();};
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ S.snapshots=S.snapshots.filter(s=>s.id!==b.dataset.del); save(); showHistory(accId); });
}

/* ---------- Importar ---------- */
let pendingCSV=null;
VIEWS.importar=(el)=>{
  pdfBusy=false; pdfQueue.length=0;
  const drag=L('o arrástralo aquí desde el ordenador','or drag it here from your computer');
  el.innerHTML=acctTabs('importar')+`<div id="impFor"></div>
  <div class="alert info"><span class="ic">i</span><div>${L('<b>Los archivos no salen de este dispositivo.</b> Se leen dentro del navegador y solo se guardan las cifras y los movimientos.','<b>Files never leave this device.</b> They are read inside the browser and only the figures and transactions are saved.')}</div></div>
  <div class="card" style="margin-bottom:12px">${helpBtn('imp_batch')}<h2>${L('Importar varios archivos a la vez','Import several files at once')}</h2><p class="sub">${L('Elige todos tus extractos a la vez, PDF y CSV mezclados.','Choose all your statements at once, PDFs and CSVs mixed.')}</p>
    <div class="drop" id="dropAll"><label class="pick">${ic('upload')}${L('Elegir archivos (PDF y CSV)','Choose files (PDF and CSV)')}<input type="file" accept=".pdf,.csv,application/pdf,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain" id="fAll" multiple></label><div class="muted" style="margin-top:8px">${drag}</div></div>
    <div id="batchOut"></div></div>
  <div class="grid g2">
    <div class="card">${helpBtn('imp_csv')}<h2>${L('Movimientos del banco o tarjeta (CSV)','Bank or card transactions (CSV)')}</h2><p class="sub">${L('Movimientos descargados de tu banco o tarjeta, o las posiciones de M1.','Transactions downloaded from your bank or card, or your M1 positions.')}</p>
      <div class="drop" id="dropCSV"><label class="pick">${L('Elegir archivo CSV','Choose CSV file')}<input type="file" accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain" id="fCSV" multiple></label><div class="muted" style="margin-top:8px">${drag}</div></div></div>
    <div class="card">${helpBtn('imp_pdf')}<h2>${L('PDF de cualquier cuenta o documento fiscal','PDF of any account or tax document')}</h2><p class="sub">${L('Extractos de cualquier cuenta y formularios fiscales (W-2, 1098, 1099).','Statements from any account and tax forms (W-2, 1098, 1099).')}</p>
      <div class="drop" id="dropPDF"><label class="pick">${L('Elegir archivo PDF','Choose PDF file')}<input type="file" accept="application/pdf,.pdf" id="fPDF" multiple></label><div class="muted" style="margin-top:8px">${drag}</div></div></div>
  </div>
  <div id="impOut" style="margin-top:12px"></div>`;
  const wv=/; wv\)|Version\/[\d.]+ Chrome\/[\d.]+ Mobile/.test(navigator.userAgent)&&/Android/.test(navigator.userAgent);
  el.querySelector('.tabs-inline').insertAdjacentHTML('afterend',`<div class="alert ${wv?'warn':'info'}" id="wvNote" style="${wv?'':'display:none'}"><span class="ic">!</span><div>${L('<b>¿El botón de elegir archivo no hace nada?</b> Estás abriendo MyFinZen dentro de otra app que no deja elegir archivos. Ábrela en Chrome o instálala desde Chrome. Para un CSV, también puedes pegar su contenido abajo.','<b>Does the choose-file button do nothing?</b> You are opening MyFinZen inside another app that doesn\'t allow picking files. Open it in Chrome or install it from Chrome. For a CSV, you can also paste its content below.')}</div></div>`);
  el.insertAdjacentHTML('beforeend',`<div class="card" style="margin-top:12px">${helpBtn('imp_paste')}<h2>${L('Pegar CSV como texto','Paste CSV as text')}</h2><p class="sub">${L('Si no puedes elegir el archivo, copia su contenido y pégalo aquí.','If you can\'t choose the file, copy its content and paste it here.')}</p><textarea id="pasteCSV" placeholder="Symbol,Name,Quantity,..."></textarea><div class="row" style="margin-top:8px"><input id="pasteName" placeholder="${L('Nombre (opcional), p. ej. Holdings-Oct-30-2026','Name (optional), e.g. Holdings-Oct-30-2026')}"><button class="pri" id="pasteGo">${L('Importar texto','Import text')}</button></div></div>`);
  $('#pasteGo').onclick=()=>{ const t=$('#pasteCSV').value.trim(); if(!t) return toast(L('Pega el contenido del CSV','Paste the CSV content')); const n=($('#pasteName').value.trim()||(L('pegado-','pasted-')+today()))+'.csv'; handleCSV({name:n,text:async()=>t}); window.scrollTo(0,document.body.scrollHeight); };
  ['#fCSV','#fPDF','#fAll'].forEach(id=>{ const i=$(id); let opened=false; i.addEventListener('click',()=>{ opened=false; setTimeout(()=>{ if(!opened&&document.hasFocus()) $('#wvNote').style.display=''; },2500); }); window.addEventListener('blur',()=>{opened=true;},{once:false}); i.addEventListener('change',()=>{opened=true;}); });
  // Un archivo: revisión paso a paso. Varios: importación por lotes.
  const run=(fs,one)=>{ if(!fs.length) return; if(fs.length>1||!one) importBatch(fs); else one(fs[0]); };
  const wire=(drop,input,one)=>{ const d=$(drop); d.ondragover=e=>{e.preventDefault();d.classList.add('over')}; d.ondragleave=()=>d.classList.remove('over'); d.ondrop=e=>{e.preventDefault();d.classList.remove('over'); run([...e.dataTransfer.files],one);}; $(input).onchange=e=>{ const fs=[...e.target.files]; e.target.value=''; run(fs,one); }; };
  wire('#dropCSV','#fCSV',handleCSV); wire('#dropPDF','#fPDF',queuePDF); wire('#dropAll','#fAll',null);
  importBanner(); if(BATCH&&!BATCH.running) renderBatch();
};
function importBanner(){ const b=$('#impFor'); if(!b) return; const a=IMPORT_FOR&&acc(IMPORT_FOR);
  b.innerHTML=a?`<div class="alert good"><span class="ic">→</span><div style="flex:1">${L(`Importando en <b>${esc(a.name)}</b>. Los archivos se guardan en esta cuenta salvo que sus últimos 4 dígitos sean de otra.`,`Importing into <b>${esc(a.name)}</b>. Files are saved to this account unless their last 4 digits belong to another one.`)} <button class="sm" id="impAny">${L('Cualquier cuenta','Any account')}</button></div></div>`:'';
  if(a) $('#impAny').onclick=()=>{ IMPORT_FOR=null; importBanner(); }; }
function csvDelimiter(text){ const line=(text.split(/\r?\n/).find(l=>l.trim())||'').replace(/"[^"]*"/g,''); const n=ch=>line.split(ch).length-1; const c=[[',',n(',')],[';',n(';')],['\t',n('\t')]].sort((a,b)=>b[1]-a[1]); return c[0][1]>0?c[0][0]:','; }
function parseCSV(text){
  text=String(text).replace(/^\uFEFF/,''); const dl=csvDelimiter(text);
  const rows=[]; let row=[], f='', q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true; else if(c===dl){ row.push(f); f=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; } else f+=c; }
  if(f||row.length){ row.push(f); rows.push(row); }
  return rows.filter(r=>r.some(x=>x.trim()));
}
async function handleCSV(file){
  let text; try{ text=await file.text(); }catch(e){ toast(L('No pude leer el archivo','I couldn\'t read the file')); return; }
  const rows=parseCSV(text); if(!rows.length){ toast(L('El archivo está vacío','The file is empty')); return; }
  if(isHoldingsCSV(rows)){ renderHoldingsPreview(file.name,rows); return; }
  pendingCSV=csvPrepare(file.name,rows);
  // signo: si casi todo es positivo y parece una tarjeta (por el nombre o por la cuenta que le toca) → invertir
  const mm=matchCSV(file.name); pendingCSV.guess=mm?mm.acc.id:null; const isCard=/card|credit|amex|visa|discover|citi/i.test(file.name)||(mm&&mm.acc.kind==='credit'); const p=pendingCSV;
  if(p.cAmt>=0){ const vals=p.data.map(r=>num(r[p.cAmt])).filter(v=>!isNaN(v)); const pos=vals.filter(v=>v>0).length; if(isCard && pos>vals.length*0.7) p.flip=true; }
  renderCSVPreview();
}
function csvPrepare(name,rows){
  // fila de cabecera: la primera que tenga una columna de fecha
  let hi=rows.findIndex(r=>r.some(c=>/date|fecha|posted/i.test(c))); if(hi<0) hi=0;
  const head=rows[hi].map(h=>h.trim()); const data=rows.slice(hi+1).filter(r=>r.length>=2);
  const find=re=>head.findIndex(h=>re.test(h));
  let cDate=find(/^(transaction |trans\.? |posting |post(ed)? )?date|fecha/i); if(cDate<0) cDate=find(/date/i);
  let cDesc=-1; for(const re of [/^description$/i,/description|descrip|concepto/i,/payee|merchant|^name$/i,/memo|details/i]){ cDesc=find(re); if(cDesc>=0) break; }
  let cAmt=find(/^amount|importe|^monto/i); let cDeb=find(/debit|withdraw|cargo/i), cCred=find(/credit|deposit|abono/i);
  if(cAmt>=0){cDeb=-1;cCred=-1;}
  return {file:name,head,data,cDate,cDesc,cAmt,cDeb,cCred,flip:false};
}
function csvRowsToTx(p){
  const out=[];
  for(const r of p.data){ const d=parseDate(r[p.cDate]); if(!d) continue; let amt;
    if(p.cAmt>=0) amt=num(r[p.cAmt]); else { const de=num(r[p.cDeb]), cr=num(r[p.cCred]); amt=(isNaN(cr)?0:Math.abs(cr))-(isNaN(de)?0:Math.abs(de)); }
    if(isNaN(amt)) continue; if(p.flip) amt=-amt;
    const desc=(r[p.cDesc]||'').trim().replace(/\s+/g,' ');
    out.push({date:d,desc,amount:Math.round(amt*100)/100}); }
  return out;
}
function renderCSVPreview(){
  const p=pendingCSV; const out=$('#impOut'); const tx=csvRowsToTx(p);
  const opts=(sel)=>p.head.map((h,i)=>`<option value="${i}" ${i===sel?'selected':''}>${esc(h||'col '+(i+1))}</option>`).join('');
  const accs=S.accounts.filter(a=>['cash','credit'].includes(a.kind));
  out.innerHTML=`<div class="card"><h2>${esc(p.file)}</h2><p class="sub">${L(`${tx.length} movimientos detectados. Revisa las columnas y el signo: los gastos deben salir en negativo.`,`${tx.length} transactions detected. Check the columns and the sign: expenses must be negative.`)}</p>
   <div class="row"><label class="f">${L('Fecha','Date')}<select id="mD">${opts(p.cDate)}</select></label><label class="f">${L('Descripción','Description')}<select id="mS">${opts(p.cDesc)}</select></label>
   ${p.cAmt>=0?`<label class="f">${L('Importe','Amount')}<select id="mA">${opts(p.cAmt)}</select></label>`:`<label class="f">${L('Cargo','Debit')}<select id="mDe">${opts(p.cDeb)}</select></label><label class="f">${L('Abono','Credit')}<select id="mCr">${opts(p.cCred)}</select></label>`}</div>
   <div class="row"><label class="f">${L('Cuenta','Account')}<select id="mAcc">${accs.map(a=>`<option value="${a.id}" ${p.guess===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="__new" ${!p.guess&&(IMPORT_NEW||!accs.length)?'selected':''}>${L('+ Crear cuenta nueva…','+ Create a new account…')}</option></select></label>
   <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:18px"><input type="checkbox" id="mFlip" style="width:auto" ${p.flip?'checked':''}> ${L('Invertir signo (típico en tarjetas)','Flip sign (common for cards)')}</label></div>
   <div class="tbl"><table><thead><tr><th>${L('Fecha','Date')}</th><th>${L('Descripción','Description')}</th><th>${L('Categoría','Category')}</th><th class="n">${L('Importe','Amount')}</th></tr></thead><tbody>${tx.slice(0,8).map(t=>`<tr><td>${t.date}</td><td>${esc(t.desc)}</td><td>${esc(catL(categorize(t.desc,t.amount)||otherCat(t.amount)))}</td><td class="n ${t.amount>=0?'pos':''}">${fmt(t.amount,2)}</td></tr>`).join('')}</tbody></table></div>
   <div class="row" style="margin-top:12px"><button id="mCancel">${L('Cancelar','Cancel')}</button><button class="pri" id="mGo">${L(`Importar ${tx.length} movimientos`,`Import ${tx.length} transactions`)}</button></div></div>`;
  const re=()=>{ p.cDate=+$('#mD').value; p.cDesc=+$('#mS').value; if($('#mA')) p.cAmt=+$('#mA').value; if($('#mDe')){p.cDeb=+$('#mDe').value;p.cCred=+$('#mCr').value;} p.flip=$('#mFlip').checked; renderCSVPreview(); };
  ['#mD','#mS','#mA','#mDe','#mCr','#mFlip'].forEach(s=>{const e=$(s); if(e) e.onchange=re;});
  $('#mCancel').onclick=()=>{pendingCSV=null;out.innerHTML='';};
  $('#mGo').onclick=()=>{
    let accId=$('#mAcc').value;
    if(accId==='__new'){ const n={id:uid(),kind:/card|credit|amex|visa/i.test(p.file)?'credit':'cash',name:p.file.replace(/\.csv$/i,''),institution:''}; S.accounts.push(n); accId=n.id; }
    const {added,dup}=importTxInto(accId,tx,'csv'); learnKey(acc(accId),fileKey(p.file));
    save(); pendingCSV=null; toast(L(`${added} importados${dup?` · ${dup} duplicados ignorados`:''}`,`${added} imported${dup?` · ${dup} duplicates skipped`:''}`)); const R=reconcile(); if(R.changed) save(); const nIss=R.issues.filter(i=>i.lvl!=='info').length;
    out.innerHTML=`<div class="alert good"><span class="ic">✓</span><div>${L(`<b>${added} movimientos importados</b>${dup?` (${dup} ya estaban)`:''}. Revisa las categorías en <a href="#flujo">Movimientos</a>: si cambias una, puedo aplicarla a todos los parecidos. Actualiza también el saldo de la cuenta en <a href="#cuentas">Cuentas</a>.<br>Conciliación: ${R.stats.card+R.stats.xfer} pagos y transferencias emparejados entre cuentas, ${R.stats.mort} cuotas de hipoteca${nIss?`, <b>${nIss} diferencia${nIss>1?'s':''} para revisar</b>`:''}.`,`<b>${added} transactions imported</b>${dup?` (${dup} were already there)`:''}. Review the categories in <a href="#flujo">Transactions</a>: if you change one, I can apply it to all similar ones. Also update the account balance in <a href="#cuentas">Accounts</a>.<br>Reconciliation: ${R.stats.card+R.stats.xfer} payments and transfers matched between accounts, ${R.stats.mort} mortgage payments${nIss?`, <b>${nIss} difference${nIss>1?'s':''} to review</b>`:''}.`)}</div></div>`;
  };
}
// Texto de un PDF por líneas. Agrupa por altura con una tolerancia proporcional al tamaño de letra (no por tramos
// fijos, que partían líneas cuyo texto cae justo en el borde de un tramo) y lee las páginas de 4 en 4 en paralelo.
async function pdfText(file){
  if(!window.pdfjsLib) throw new Error(L('No se pudo cargar el lector de PDF','The PDF reader could not be loaded'));
  const buf=await file.arrayBuffer(); const doc=await pdfjsLib.getDocument({data:buf, isEvalSupported:false}).promise;
  const N=Math.min(doc.numPages,60), pages=new Array(N);
  const one=async p=>{ const page=await doc.getPage(p); const tc=await page.getTextContent(); page.cleanup();
    const it=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],h:Math.abs(i.transform[3])||i.height||8,s:i.str}));
    it.sort((a,b)=>b.y-a.y||a.x-b.x); const rows=[];
    for(const i of it){ const r=rows[rows.length-1]; if(r&&Math.abs(r.y-i.y)<=Math.max(1,Math.min(3,0.45*Math.min(r.h,i.h)))) r.items.push(i); else rows.push({y:i.y,h:i.h,items:[i]}); }
    return rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim()); };
  for(let p=1;p<=N;p+=4){ const q=[]; for(let k=p;k<Math.min(p+4,N+1);k++) q.push(one(k).then(l=>{ pages[k-1]=l; })); await Promise.all(q); }
  try{ await doc.destroy(); }catch(e){}
  return pages.flat().join('\n');
}
const money=s=>{ const m=String(s).match(/-?\$?\s?\(?[\d,]+\.\d{2}\)?/); return m?num(m[0]):NaN; };
function grab(text, re){ const m=text.match(re); return m?m[1]:null; }
/* ---- Lectores por entidad: saben dónde está cada dato en los extractos de cada banco.
   Devuelven {type:'generic', known:true, institution, product, kind, last4, date, dateFound, balance, cands, tx}.
   Si el formato no encaja, devuelven null y se usa el lector genérico. ---- */
const MON_RE='(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}';
function l4of(s){ const d=String(s||'').replace(/\D/g,''); return d.length>=4?d.slice(-4):''; }
// Comprobación de exactitud: la suma de los movimientos leídos debe ser igual a lo que dice el propio extracto
function txCheck(tx,expected){ if(expected==null||isNaN(expected)||!tx||!tx.length) return null; const sum=r2(tx.reduce((s,t)=>s+t.amount,0)); return {ok:Math.abs(sum-expected)<0.015,diff:r2(sum-expected)}; }
function stmtCheck(r,T){ if(r.check!==undefined||r.type!=='generic') return r.check;
  const b=num(grab(T,/(?:beginning|previous|opening|starting|prior)\s+(?:statement\s+)?balance[^\n$\d-]*\$?\s*(-?[\d,]+\.\d{2})/i)), e=r.cands&&r.cands.length?r.cands[0].v:NaN;
  r.check=isNaN(b)||isNaN(e)?null:txCheck(r.tx,r.kind==='credit'?b-e:e-b); return r.check; }
function knownStmt(o){ o.type='generic'; o.known=true; o.balance=finOrNull(o.balance); o.cands=o.balance==null?[]:[{v:o.balance,line:o.balLabel||''}]; o.dateFound=!!o.date; o.date=o.date||today(); o.tx=o.tx||[]; if(o.check===undefined) o.check=null; return o; }
function readBofA(T){
  if(!/bankofamerica\.com/i.test(T)) return null; const H=T.slice(0,2500);
  if(/New Balance Total/i.test(H)&&/Statement Closing Date/i.test(T)){ // tarjeta de crédito
    const cd=grab(T,/Statement Closing Date\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i), date=cd&&parseDate(cd);
    const tx=parseTxLines(T,date,true).map(t=>Object.assign(t,{desc:t.desc.replace(/(\s+\d{4}){2}$/,'').trim()}));
    return knownStmt({institution:'Bank of America',kind:'credit',product:((H.match(/^\s*((?:Visa|Mastercard|World Mastercard|BankAmericard|Customized Cash|Unlimited Cash|Travel Rewards|Premium Rewards|Alaska|Free Spirit)[^\n]{0,30})$/im)||[])[1]||'').replace(/[®™]/g,'').trim()||L('Tarjeta','Card'),
      last4:l4of(grab(H,/Account\s*(?:#|Number:?)\s*([\d ]{8,24}\d)/i)),date,balance:num(grab(H,/New Balance Total\s*\$?\s*([\d,]+\.\d{2})/i)),balLabel:'New Balance Total',tx,
      check:txCheck(tx,r2(num(grab(H,/Previous Balance\s*\$?\s*(-?[\d,]+\.\d{2})/i))-num(grab(H,/New Balance Total\s*\$?\s*([\d,]+\.\d{2})/i))))}); }
  const an=grab(H,/Account number:\s*([\d ]{8,24}\d)/i), eb=T.match(new RegExp('Ending balance on\\s+('+MON_RE+')\\s*\\$?\\s*(-?[\\d,]+\\.\\d{2})','i'));
  if(!an||!eb) return null; const date=parseDate(eb[1].replace('.',''));
  const btx=parseTxLines(T,date), beg=num(grab(T,new RegExp('Beginning balance on\\s+'+MON_RE+'\\s*\\$?\\s*(-?[\\d,]+\\.\\d{2})','i')));
  return knownStmt({institution:'Bank of America',kind:'cash',product:((H.match(/^\s*Your\s+(?:Bank of America\s+)?([A-Za-z][^\n]{2,45})$/m)||[])[1]||'').replace(/[®™]/g,'').trim(),
    last4:l4of(an),date,balance:num(eb[2]),balLabel:'Ending balance',tx:btx,check:txCheck(btx,r2(num(eb[2])-beg))}); }
function readM1(T){
  if(!/M1 Finance|M1: The Finance Super App|M1 Cash Account|M1 Invest/i.test(T)) return null;
  const sp=T.match(/Statement period:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i), an=grab(T,/Account number:\s*[X*•x]*\s*(\d{4,})/i);
  const bal=num(grab(T,/Closing balance\s*\$?\s*([\d,]+\.\d{2})/i)); if(!sp||!an||isNaN(bal)) return null;
  const prod=(grab(T,/Account:\s*(M1 [^\n]{2,40})/i)||'').trim(); const date=parseDate(sp[2]); const tx=[];
  for(const line of T.split('\n')) for(const m of line.matchAll(/(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(\$?\(\$?[\d,]+\.\d{2}\)|\$?-?[\d,]+\.\d{2})(?=\s+\d{4}-\d{2}-\d{2}|\s*$)/g)){
    const v=num(m[3].replace(/\$/g,'')); if(isNaN(v)||!v) continue; tx.push({date:m[1],desc:m[2].trim(),amount:/\(/.test(m[3])?-Math.abs(v):v}); }
  return knownStmt({institution:'M1 Finance',kind:/cash/i.test(prod)?'cash':'brokerage',product:prod.replace(/^M1\s*/,'')||'',last4:l4of(an),date,balance:bal,balLabel:'Closing balance',tx,
    check:txCheck(tx,r2(bal-num(grab(T,/Opening balance\s*\$?\s*([\d,]+\.\d{2})/i))))}); }
/* Fondos de un plan de jubilación (Empower, "How is my account invested?"): categoría (Large Cap Funds…), nombre del
   fondo (puede seguir en la línea siguiente), saldo final y participaciones (3-4 decimales). Las columnas vacías no
   salen en el texto, así que se usan las dos últimas cifras. Comprueba que la suma coincide con "Totals". */
function readFundTable(T){
  const lines=T.split('\n'); const i0=lines.findIndex(l=>/^\s*How is my account invested\?\s*$/i.test(l)); if(i0<0) return null;
  const pct=l=>(l.match(/^\s*\d{1,3}(?:\.\d+)?%\s+(.+?)\s*$/)||[])[1];
  const cats=new Set(); for(let i=i0+1;i<lines.length;i++){ const c=pct(lines[i]); if(c) cats.add(c); else if(cats.size) break; }
  const j0=lines.findIndex(l=>/How will my future contributions be invested/i.test(l)); const full=[];
  if(j0>=0) for(let i=j0+1;i<i0;i++){ const c=pct(lines[i]); if(c&&!cats.has(c)) full.push(c); }
  const rows=[]; let cls='', cur=null, pause=false, total=null;
  for(let i=i0+1;i<lines.length;i++){ const l=lines[i].trim(); if(!l) continue;
    if(/^How is my account (being funded|invested\?\s*\(continued\))/i.test(l)){ if(/funded/i.test(l)) break; pause=false; cur=null; continue; }
    if(/\bPage \d+ of \d+/i.test(l)){ pause=true; cur=null; continue; } if(pause) continue;
    if(/^Totals?\b/i.test(l)){ const n=l.match(/-?[\d,]+\.\d{2}(?!\d)/g); if(n) total=num(n[n.length-1]); break; }
    if(cats.has(l)){ cls=l; cur=null; continue; }
    if(pct(l)||/^(Ending|Beginning\b|Balance\b)/i.test(l)) continue;
    const m=l.match(/^(.*?[A-Za-z].*?)\s+((?:-?\$?[\d,]+\.\d{2,4}\s*){2,})$/);
    if(m){ const t=m[2].trim().split(/\s+/).map(x=>x.replace('$','')); const units=/\.\d{3,4}$/.test(t[t.length-1])?num(t.pop()):NaN; if(!t.length){ cur=null; continue; }
      cur={name:m[1].trim(),value:num(t[t.length-1]),qty:units,cls,lines:1}; rows.push(cur); continue; }
    if(cur&&cur.lines<3&&/^[A-Za-z][\w&().,'\/+ -]*$/.test(l)&&!/\d{3,}/.test(l)){ cur.name+=' '+l; cur.lines++; continue; }
    cur=null; }
  if(!rows.length) return null;
  const out=rows.filter(r=>!isNaN(r.value)).map(r=>{ const f=full.find(x=>x===r.name)||full.find(x=>x.startsWith(r.name))||r.name;
    const short=f.replace(/\s+(Admiral|Adm|Institutional|Instl|Inst|Investor|Inv|Class [A-Z0-9]+|R\d|[A-Z]|CIT|Trust)$/,'').trim();
    return {sym:short.slice(0,40),name:f.slice(0,120),qty:r.qty,avg:NaN,cost:null,value:r2(r.value),gain:null,fund:true,cls:r.cls}; });
  const sum=r2(out.reduce((s,x)=>s+x.value,0));
  return {rows:out,total,ok:total!=null&&Math.abs(sum-total)<0.02,sum}; }
function readEmpower(T){ const o=readEmpower0(T); if(o&&o.funds){ const bal=o.balance; o.check={ok:o.funds.ok&&Math.abs(o.funds.sum-bal)<0.02,diff:r2(o.funds.sum-bal),what:'funds'}; } return o; }
function readEmpower0(T){
  if(!/Empower/i.test(T.slice(0,600))||!/Balance as of/i.test(T)) return null;
  const all=[...T.matchAll(new RegExp('Balance as of\\s+('+MON_RE+')((?:\\s+\\$?[\\d,]+\\.\\d{2})+)','gi'))]; if(!all.length) return null;
  const last=all[all.length-1], v=last[2].match(/[\d,]+\.\d{2}/g);
  return knownStmt({institution:'Empower',kind:'retirement',product:/403\(?b/i.test(T.slice(0,800))?'403(b)':/457/.test(T.slice(0,800))?'457':'401(k)',
    last4:l4of(grab(T,/Plan:\s*([\d-]{4,})/i)),date:parseDate(last[1].replace('.','')),balance:num(v[v.length-1]),balLabel:'Balance as of',funds:readFundTable(T)}); }
// (la comprobación de Empower va en readEmpower: la suma de los fondos debe dar el total y el saldo)
function parseStatement(text){
  const T=text;
  // Pennymac / generic mortgage
  if(/Unpaid Principal Balance|Outstanding Principal Balance|Principal Balance:/i.test(T) || (/(pennymac|mortgage)/i.test(T) && /Loan Number/i.test(T) && /Payment Due Date/i.test(T))){
    const r={type:'mortgage', institution:/pennymac/i.test(T)?'Pennymac':/wellsfargo\.com|Wells Fargo/i.test(T)?'Wells Fargo':(INST_RE.exec(T)||[])[1]||(grab(T,/^([^\n]{0,40}(?:Mortgage|Loan Servic)[^\n]{0,25})$/im)||'').trim()};
    const EX=T.slice(Math.max(0,T.search(/Explanation of amount due/i)));
    r.balance=num(grab(T,/Unpaid Principal Balance:?\s*\$?([\d,]+\.\d{2})/i));
    r.rate=num(grab(T,/Interest Rate:?\s*([\d.]+)\s*%/i));
    const exp=/Explanation of amount due/i.test(T);
    r.principal=num(grab(T,/Contractual Amount Due[\s\S]{0,80}?Principal:?\s*\$?([\d,]+\.\d{2})/i) || grab(T,/\bPrincipal:\s*\$?([\d,]+\.\d{2})/i) || (exp&&grab(EX,/^[\s\S]{0,140}?\bPrincipal\s*\$?([\d,]+\.\d{2})/i)));
    r.interest=num(grab(T,/Contractual Amount Due[\s\S]{0,140}?Interest:?\s*\$?([\d,]+\.\d{2})/i) || grab(T,/\bInterest:\s*\$?([\d,]+\.\d{2})/i) || (exp&&grab(EX,/^[\s\S]{0,220}?\bInterest\s*\$?([\d,]+\.\d{2})/i)));
    r.escrow=num(grab(T,/Escrow \(Taxes and Insurance\):?\s*\$?([\d,]+\.\d{2})/i) || (exp&&grab(EX,/^[\s\S]{0,300}?\bEscrow\s*\$?([\d,]+\.\d{2})/i)))||0;
    r.payment=num(grab(T,/Regular Monthly Payment:?\s*\$?([\d,]+\.\d{2})/i) || grab(T,/Current payment\s*\$?([\d,]+\.\d{2})/i));
    r.extra=num(grab(T,/Principal Reduction\s*\$?([\d,]+\.\d{2})/i))||0;
    const sd=grab(T,/Statement Date:?\s*([A-Za-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i); r.date=(sd&&parseDate(sd))||today(); r.dateFound=!!(sd&&parseDate(sd));
    const nd=grab(T,/Payment Due Date:?\s*([A-Za-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i); r.nextDue=nd?parseDate(nd):null;
    const ln=grab(T,/Loan Number:?\s*(\d{4,})/i); r.last4=ln?ln.slice(-4):'';
    const pa=grab(T,/Property Address:?\s*([^\n]+?)(?:\s{2,}|Credits|$)/im); r.property=pa?pa.trim():'';
    const pi=(r.principal||0)+(r.interest||0); r.pi=pi>0?Math.round(pi*100)/100:(r.payment||0)-(r.escrow||0);
    return r;
  }
  const known=readBofA(T)||readM1(T)||readEmpower(T); if(known) return known;
  // Generic: look for balances
  const r={type:'generic'};
  const cands=[];
  const labels=[/(?:ending|closing|new|current|total)\s+(?:account\s+)?(?:balance|value)[^\n$]*?\$?\s?([\d,]+\.\d{2})/ig,/(?:portfolio|account|total)\s+value[^\n$]*?\$?\s?([\d,]+\.\d{2})/ig,/(?:vested balance|total balance)[^\n$]*?\$?\s?([\d,]+\.\d{2})/ig,/new balance[^\n$]*?\$?\s?([\d,]+\.\d{2})/ig];
  labels.forEach(re=>{ let m; while((m=re.exec(T))&&cands.length<12){ const line=T.slice(Math.max(0,T.lastIndexOf('\n',m.index)+1), T.indexOf('\n',m.index+1)>0?T.indexOf('\n',m.index+1):undefined); cands.push({v:num(m[1]),line:line.trim().slice(0,120)}); } });
  r.cands=cands.filter((c,i,a)=>a.findIndex(x=>x.v===c.v)===i);
  const D='([A-Za-z]+\\.? \\d{1,2},? \\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})'; const dm=T.match(new RegExp('(?:through|thru|to|ending|closing date|period ending|as of)[:\\s]+'+D,'i'))||T.match(new RegExp('(?:statement (?:period|date))[^\\n]*?'+D,'i')); r.date=(dm&&parseDate(dm[1].replace('.','')))||today(); r.dateFound=!!(dm&&parseDate(dm[1].replace('.','')));
  r.institution=(T.match(/\b(M1 Finance|M1|Fidelity|Vanguard|Charles Schwab|Schwab|Empower|Principal|Chase|Bank of America|Wells Fargo|Citi|American Express|Capital One|Discover|Ally|Marcus|SoFi|Guideline|Betterment|Wealthfront|Robinhood|E\*TRADE|Merrill)\b/i)||[])[1]||'';
  const H=T.slice(0,2500);
  r.kind=/credit card|minimum payment due|new balance total|credit line/i.test(H)?'credit':/401\(?k\)?|403\(?b\)?|\bIRA\b|retirement|Roth/i.test(H)?'retirement':/brokerage|portfolio|invest/i.test(H)?'brokerage':'cash';
  r.last4=(pdfLast4s(H)[0])||'';
  return r;
}
let lastPDF=null; const pdfQueue=[]; let pdfBusy=false;
function queuePDF(f){ pdfQueue.push(f); if(!pdfBusy) nextPDF(); }
function nextPDF(){ const f=pdfQueue.shift(); if(!f){pdfBusy=false;return;} pdfBusy=true; handlePDF(f); }
function pdfDone(html){ const out=$('#impOut'); out.innerHTML=html+(pdfQueue.length?`<div class="row" style="margin-top:8px"><button class="pri" id="nextPdf">${L(`Siguiente PDF (${pdfQueue.length} pendiente${pdfQueue.length>1?'s':''})`,`Next PDF (${pdfQueue.length} pending)`)}</button></div>`:''); pdfBusy=false; if(pdfQueue.length){ pdfBusy=true; $('#nextPdf').onclick=()=>{ pdfBusy=false; nextPDF(); }; } }
/* ---- Detection ---- */
function detectTaxForm(T){
  if(/Wage and Tax Statement|Form\s*W-2\b/i.test(T)) return 'W2';
  if(/Consolidated\s+(Form\s*)?1099|Tax Information Statement|Composite (Form )?1099/i.test(T)) return 'C1099';
  if(/Form\s*1098\b|Mortgage Interest Statement/i.test(T)) return '1098';
  if(/1099-DIV|Dividends and Distributions/i.test(T)) return '1099DIV';
  if(/1099-INT|Interest Income\b.*Form/i.test(T)) return '1099INT';
  if(/1099-B\b|Proceeds From Broker/i.test(T)) return '1099B';
  if(/1099-R\b|Distributions From Pensions/i.test(T)) return '1099R';
  if(/Form\s*5498|IRA Contribution Information/i.test(T)) return '5498';
  if(/1099-(MISC|NEC)\b/i.test(T)) return '1099MISC';
  if(/secured property tax|treasurer[- ]tax collector|annual (secured )?tax bill|assessor'?s parcel/i.test(T) && !/Mortgage Activity Statement|Loan Number/i.test(T)) return 'PROPTAX';
  return null;
}
function after(T, labelRe, span=220){
  const m=T.match(labelRe); if(!m) return NaN;
  const rest=T.slice(m.index+m[0].length, m.index+m[0].length+span);
  const mm=rest.match(/-?\$?\s?\(?[\d,]*\d\.\d{2}\)?/); return mm?num(mm[0]):NaN;
}
function localTaxFields(type,T){
  const f={};
  const set=(k,re,span)=>{ const v=after(T,re,span); if(!isNaN(v)) f[k]=v; };
  if(type==='W2'){ set('wages',/Wages,? tips,? other comp\w*\.?/i); set('fedWH',/Federal income tax withheld/i); set('stateWages',/State wages,? tips,? etc\.?/i); set('stateWH',/State income tax/i); set('sdi',/\b(CA\s*)?SDI\b/i,60); const k=T.match(/\b12[a-d]?\b[^\n]{0,40}?\bD\b\s*\$?([\d,]+\.\d{2})/); if(k) f.k401=num(k[1]); }
  if(type==='1098'){ set('interest',/Mortgage interest received from payer\(?s\)?\/?borrower\(?s\)?/i); set('principalStart',/Outstanding mortgage principal/i); set('points',/Points paid on purchase/i); set('propertyTax',/(Property taxes|Real estate taxes)/i,120); }
  if(type==='1099INT'||type==='C1099'){ set('interest',/Interest income/i); }
  if(type==='1099DIV'||type==='C1099'){ set('ordinaryDiv',/Total ordinary dividends/i); set('qualifiedDiv',/Qualified dividends/i); set('capGainDist',/Total capital gain distr\w*/i); set('foreignTax',/Foreign tax paid/i); }
  if(type==='1099B'||type==='C1099'){ set('proceeds',/Total proceeds|Gross proceeds/i,300); set('stGain',/Short[- ]term[^\n]{0,60}?(gain|loss)/i,300); set('ltGain',/Long[- ]term[^\n]{0,60}?(gain|loss)/i,300); }
  if(type==='1099R'){ set('gross',/Gross distribution/i); set('taxable',/Taxable amount/i); set('fedWH',/Federal income tax withheld/i); }
  if(type==='5498'){ set('iraContrib',/IRA contributions/i); set('rothContrib',/Roth IRA contributions/i); set('fmv',/Fair market value of account/i); }
  if(type==='1099MISC'){ set('amount',/(Nonemployee compensation|Rents|Other income)/i); }
  if(type==='PROPTAX'){ set('amount',/(Total (tax|amount) (due|paid)|Total taxes|Amount due)/i,160); }
  return f;
}
const FORM_LABEL=bil({W2:['W-2 (salario)','W-2 (wages)'],C1099:['1099 consolidado (broker)','Consolidated 1099 (broker)'],'1098':['1098 (intereses hipoteca)','1098 (mortgage interest)'],'1099INT':['1099-INT (intereses)','1099-INT (interest)'],'1099DIV':['1099-DIV (dividendos)','1099-DIV (dividends)'],'1099B':['1099-B (ventas)','1099-B (sales)'],'1099R':['1099-R (retiradas jubilación)','1099-R (retirement distributions)'],'5498':['5498 (aportaciones IRA)','5498 (IRA contributions)'],'1099MISC':'1099-MISC/NEC',PROPTAX:['Impuesto de propiedad','Property tax'],CHARITY:['Donativo','Donation'],OTHER:['Otro','Other']});
// Campos de cada formulario: [clave, etiqueta en español, etiqueta en inglés]
const FORM_FIELDS_={
  W2:[['wages','Casilla 1: salarios','Box 1: wages'],['fedWH','Casilla 2: retención federal','Box 2: federal withholding'],['stateWages','Casilla 16: salario estatal','Box 16: state wages'],['stateWH','Casilla 17: retención California','Box 17: California withholding'],['sdi','Casilla 14: CA SDI','Box 14: CA SDI'],['k401','Casilla 12 D: 401(k) pre-tax','Box 12 D: pre-tax 401(k)']],
  C1099:[['interest','INT 1: intereses','INT 1: interest'],['ordinaryDiv','DIV 1a: dividendos totales','DIV 1a: total ordinary dividends'],['qualifiedDiv','DIV 1b: dividendos cualificados','DIV 1b: qualified dividends'],['capGainDist','DIV 2a: distrib. ganancias','DIV 2a: capital gain distributions'],['foreignTax','DIV 7: impuesto extranjero','DIV 7: foreign tax paid'],['proceeds','B: ventas totales','B: total proceeds'],['stGain','B: ganancia/pérdida corto plazo','B: short-term gain/loss'],['ltGain','B: ganancia/pérdida largo plazo','B: long-term gain/loss']],
  '1098':[['interest','Casilla 1: intereses pagados','Box 1: mortgage interest'],['principalStart','Casilla 2: principal a 1 de enero','Box 2: outstanding principal'],['points','Casilla 6: puntos','Box 6: points'],['propertyTax','Casilla 10: impuesto propiedad (si aparece)','Box 10: property tax (if shown)']],
  '1099INT':[['interest','Casilla 1: intereses','Box 1: interest']],
  '1099DIV':[['ordinaryDiv','1a: dividendos totales','1a: total ordinary dividends'],['qualifiedDiv','1b: cualificados','1b: qualified'],['capGainDist','2a: distrib. ganancias','2a: capital gain distributions'],['foreignTax','7: impuesto extranjero','7: foreign tax paid']],
  '1099B':[['proceeds','Ventas totales','Total proceeds'],['stGain','Ganancia/pérdida corto plazo','Short-term gain/loss'],['ltGain','Ganancia/pérdida largo plazo','Long-term gain/loss']],
  '1099R':[['gross','Casilla 1: distribución bruta','Box 1: gross distribution'],['taxable','Casilla 2a: importe tributable','Box 2a: taxable amount'],['fedWH','Casilla 4: retención federal','Box 4: federal withholding']],
  '5498':[['iraContrib','IRA tradicional aportado','Traditional IRA contributions'],['rothContrib','Roth IRA aportado','Roth IRA contributions'],['fmv','Valor de la cuenta','Account value']],
  '1099MISC':[['amount','Importe','Amount']],
  PROPTAX:[['amount','Importe pagado en el año','Amount paid in the year']],
  CHARITY:[['amount','Importe donado','Amount donated']],
  OTHER:[['amount','Importe (ingreso +, gasto deducible −)','Amount (income +, deductible expense −)']]
};
const FORM_FIELDS={}; for(const k of Object.keys(FORM_FIELDS_)) Object.defineProperty(FORM_FIELDS,k,{enumerable:true,get(){ return FORM_FIELDS_[k].map(([key,es,en])=>[key,L(es,en)]); }});
/* ---- Transactions from bank / card PDFs (local) ---- */
// post: usar la fecha de anotación (2.ª columna) en vez de la de la operación; así cada movimiento cae en el ciclo de su extracto.
function parseTxLines(T, periodEnd, post=false){
  const pe=periodEnd?new Date(periodEnd+'T12:00:00'):new Date(); const out=[]; let sign=-1;
  const lines=[]; for(const l of T.split('\n')){ const t=l.trim(); if(/^-?\s?\$?\s?[\d,]*\d\.\d{2}$/.test(t)&&lines.length&&/^\d{1,2}\/\d{1,2}/.test(lines[lines.length-1])&&!/\d\.\d{2}\s*$/.test(lines[lines.length-1])) lines[lines.length-1]+=' '+t; else lines.push(t); }
  for(const raw of lines){ const L=raw.trim();
    if(!/\d\.\d{2}/.test(L) || L.length<60 && /^(deposits|credits|payments|additions|other credits)/i.test(L)){
      if(/(deposits|additions|credits|payments and (other )?credits|refunds)/i.test(L) && !/\d{1,3}(,\d{3})*\.\d{2}.*\d\.\d{2}/.test(L)) sign=1;
      if(/(withdrawals|subtractions|debits|purchases|fees charged|checks paid|electronic (payments|withdrawals)|card (transactions|purchases)|atm)/i.test(L)) sign=-1;
      if(!/\d\.\d{2}/.test(L)) continue; }
    const m0=L.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(?:(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s+)?(.+?)\s+(-?\(?\$?-?[\d,]*\d\.\d{2}\)?)(?:\s+-?\$?[\d,]*\d\.\d{2})?$/);
    if(!m0) continue; const m=[m0[0],post&&m0[4]?m0[4]:m0[1],post&&m0[5]?m0[5]:m0[2],m0[3],m0[6],m0[7]];
    const mo=+m[1], dd=+m[2]; if(mo<1||mo>12||dd<1||dd>31) continue;
    let y=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):(mo>pe.getMonth()+1?pe.getFullYear()-1:pe.getFullYear());
    const desc=m[4].replace(/\s+/g,' ').replace(/\s+-\s*\$?$/,'').trim(); if(/^(total|balance|beginning|ending|previous|new balance|minimum)/i.test(desc)) continue;
    let a=num(m[5]); if(isNaN(a)||a===0) continue; const explicit=/^-|\(|-$/.test(m[5].trim());
    let amt=explicit?a:Math.abs(a)*sign;
    out.push({date:`${y}-${String(mo).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,desc,amount:Math.round(amt*100)/100});
  }
  return out;
}
/* ---- Redaction before anything goes to Claude ---- */
function redact(t){
  let s=t.replace(/\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{1,4}\b/g,'•••• •••• •••• ••••').replace(/\b\d[\d-]{5,}\d\b(?![.,]\d)/g,m=>(m.replace(/\D/g,'').length>=7?m.replace(/\d/g,'•'):m))
   .replace(/\b(?:XXX|xxx|\*{3})[- ]?(?:XX|xx|\*{2})[- ]?\d{4}\b/g,'•••-••-••••')
   .replace(/\b\d{3}-\d{2}-\d{4}\b/g,'•••-••-••••').replace(/\b\d{2}-\d{7}\b/g,'••-•••••••')
   .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'[email]').replace(/\(?\b\d{3}\)?[.\- ]\d{3}[.\- ]\d{4}\b/g,'[tel]')
   .replace(/^.*\b\d{2,6}\s+[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+(WAY|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|LN|LANE|CT|COURT|PL|PLACE|CIR|CIRCLE|TER|PKWY)\b.*$/gim,'[dirección]')
   .replace(/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g,'[CP]');
  (S.settings.hideNames||'').split(',').map(x=>x.trim()).filter(x=>x.length>2).forEach(n=>{ s=s.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'[nombre]'); });
  return s;
}
/* ---- Claude extraction (opt-in, redacted text only) ---- */
async function claudeExtract(text){
  const red=redact(text).slice(0,45000);
  if(!S.settings.autoClaude){
    const ok=await confirmModal(L('Leer con Claude','Read with Claude'),L(`<p>Se enviará a Claude <b>solo el texto</b> del documento, con números de cuenta, SSN, teléfonos, emails, direcciones${S.settings.hideNames?' y los nombres que indicaste':''} ocultos. No se envía el PDF y Claude no lo guarda.</p>`,`<p>Only the document's <b>text</b> will be sent to Claude, with account numbers, SSN, phone numbers, emails, addresses${S.settings.hideNames?' and the names you listed':''} hidden. The PDF is not sent and Claude doesn't keep it.</p>`)+`<details><summary>${L('Ver exactamente lo que se envía','See exactly what is sent')}</summary><pre>${esc(red.slice(0,4000))}${red.length>4000?'\n…':''}</pre></details><p class="muted">${L('Puedes ocultar también tu nombre en "Copia y ajustes".','You can also hide your name in "Backup & settings".')}</p>`);
    if(!ok) return null; }
  const sample=await getSample(); if(!sample) throw new Error(L('Para usar Claude, añade tu clave de API en Copia y ajustes','To use Claude, add your API key in Backup & settings'));
  const prompt=`You extract data from a US financial document (text below, some parts masked with •). Reply ONLY with JSON, no prose:
{"doc_type":"bank_statement"|"credit_card_statement"|"brokerage_statement"|"retirement_statement"|"mortgage_statement"|"tax_form"|"other",
 "institution":string, "account_kind":"cash"|"credit"|"brokerage"|"retirement"|"kids"|"mortgage"|"other",
 "period_end":"YYYY-MM-DD"|null, "ending_balance":number|null,
 "mortgage":{"rate":number,"principal_and_interest":number,"escrow":number,"extra_principal":number}|null,
 "contributions_this_period":number|null, "dividends_this_period":number|null,
 "transactions":[{"date":"YYYY-MM-DD","description":string,"amount":number}],
 "tax_forms":[{"form":"W2"|"1098"|"1099INT"|"1099DIV"|"1099B"|"1099R"|"5498"|"1099MISC"|"PROPTAX","tax_year":number,"payer":string,
   "fields":{"wages":n,"fedWH":n,"stateWages":n,"stateWH":n,"sdi":n,"k401":n,"interest":n,"principalStart":n,"points":n,"propertyTax":n,"ordinaryDiv":n,"qualifiedDiv":n,"capGainDist":n,"foreignTax":n,"proceeds":n,"stGain":n,"ltGain":n,"gross":n,"taxable":n,"iraContrib":n,"rothContrib":n,"fmv":n,"amount":n}}]}
Rules: amounts negative for money leaving the account (purchases, withdrawals, fees) and positive for deposits/credits/payments received. For credit cards ending_balance is the amount owed (positive). Include ALL transactions listed. In fields include only keys present in the document. A consolidated 1099 yields one entry per form section (1099INT, 1099DIV, 1099B). Use null when unknown.

DOCUMENT:
${red}`;
  return sanitizeExtract(await sample.json(prompt,{modelTier:'default'}));
}
// La respuesta de Claude se trata como datos no fiables: el texto del PDF podría intentar manipularla.
function sanitizeExtract(res){ res=obj(res); const kinds=['cash','credit','brokerage','retirement','kids','mortgage','other'];
  const m=res.mortgage&&typeof res.mortgage==='object'?{rate:numStrict(res.mortgage.rate),principal_and_interest:numStrict(res.mortgage.principal_and_interest),escrow:numStrict(res.mortgage.escrow)||0,extra_principal:numStrict(res.mortgage.extra_principal)||0}:null;
  return {institution:str(res.institution,80),account_kind:kinds.includes(res.account_kind)?res.account_kind:null,period_end:isoDate(res.period_end),ending_balance:numStrict(res.ending_balance),mortgage:m,
    contributions_this_period:numStrict(res.contributions_this_period),
    transactions:arr(res.transactions).map(t=>({date:isoDate(obj(t).date),description:str(obj(t).description,200),amount:numStrict(obj(t).amount)})).filter(t=>t.date&&t.amount!=null).slice(0,2000),
    tax_forms:arr(res.tax_forms).map(f=>{ f=obj(f); const fields={}; for(const [k,v] of Object.entries(obj(f.fields))){ const n=numStrict(v); if(/^\w{1,30}$/.test(k)&&n!=null) fields[k]=n; } const y=parseInt(f.tax_year); return {form:Object.prototype.hasOwnProperty.call(FORM_FIELDS_,f.form)?f.form:'OTHER',tax_year:y>2000&&y<2100?y:null,payer:str(f.payer,120),fields}; }).slice(0,20)}; }
/* ---- Main PDF handler ---- */
async function handlePDF(file){
  const out=$('#impOut'); out.innerHTML=`<div class="card">${L('Leyendo el PDF en tu dispositivo…','Reading the PDF on your device…')}</div>`;
  let text; try{ text=await pdfText(file); }catch(e){ pdfDone(`<div class="alert crit"><span class="ic">!</span><div>${L('No pude leer','I couldn\'t read')} ${esc(file.name)}: ${esc(e.message)}</div></div>`); return; }
  if(text.replace(/\s/g,'').length<40){ pdfDone('<div class="alert warn"><span class="ic">!</span><div>'+esc(file.name)+L(' parece una imagen escaneada y no tiene texto. Añade los datos a mano.',' looks like a scanned image and has no text. Add the data by hand.')+'</div></div>'); return; }
  const r=parseStatement(text); lastPDF={file:file.name,text,r};
  if(r.type==='mortgage'&&!/Form\s*1098\b|Mortgage Interest Statement/i.test(text)){ renderMortgagePDF(r,file.name,text); return; }
  const tf=detectTaxForm(text);
  if(tf){ renderTaxImport(file.name,text,tf); return; }
  if(!r.known) r.tx=parseTxLines(text,r.date); stmtCheck(r,text);
  renderGenericPDF(r,file.name,text);
  if(S.settings.autoClaude && (!r.cands.length || !r.tx.length)) $('#gAI')&&$('#gAI').click();
}
function renderMortgagePDF(r,name,text){
  const out=$('#impOut'); const ms=S.accounts.filter(a=>a.kind==='mortgage'); const match=ms.find(a=>r.last4&&a.last4===r.last4)||forAcc(a=>a.kind==='mortgage')||null;
  const props=S.accounts.filter(a=>a.kind==='property');
  out.innerHTML=`<div class="card"><h2>${L('Hipoteca detectada','Mortgage detected')} · ${esc(r.institution)}</h2><p class="sub">${esc(name)} · ${L('extracto del','statement of')} ${r.date?dLabel(r.date):'—'}. ${L('Revisa los datos antes de guardar.','Check the data before saving.')}</p>
   <div class="row"><label class="f">${L('Saldo pendiente','Outstanding balance')}<input id="pB" value="${isNaN(r.balance)?'':r.balance}"></label><label class="f">${L('Tipo %','Rate %')}<input id="pR" value="${isNaN(r.rate)?'':r.rate}"></label></div>
   <div class="row"><label class="f">${L('Cuota capital+intereses','Principal + interest payment')}<input id="pP" value="${r.pi||''}"></label><label class="f">${L('Principal extra mensual','Monthly extra principal')}<input id="pE" value="${r.extra||0}"></label></div>
   <div class="row"><label class="f">${L('Escrow mensual','Monthly escrow')}<input id="pS" value="${r.escrow||0}"></label><label class="f">${L('Fecha del saldo','Balance date')}<input type="date" id="pD" value="${r.date||today()}"></label></div>
   <div class="row"><label class="f">${L('Guardar en','Save to')}<select id="pAcc">${ms.map(a=>`<option value="${a.id}" ${match&&match.id===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="__new" ${match?'':'selected'}>${L('+ Hipoteca nueva','+ New mortgage')}</option></select></label><label class="f">${L('Nombre (si es nueva)','Name (if new)')}<input id="pN" value="${esc(stmtAccName({institution:r.institution,product:L('Hipoteca','Mortgage'),last4:r.last4}))}"></label></div>
   <label class="f">${L('Inmueble asociado','Linked property')}<select id="pPr"><option value="">${L('— (casa familiar)','— (family home)')}</option>${props.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
   <div class="row" style="margin-top:6px"><button id="pCancel">${L('Cancelar','Cancel')}</button><button class="pri" id="pOk">${L('Guardar','Save')}</button></div>
   <details style="margin-top:10px"><summary>${L('Ver el texto leído del PDF','See the text read from the PDF')}</summary><pre>${esc(text.slice(0,4000))}</pre></details></div>`;
  $('#pCancel').onclick=()=>pdfDone('');
  $('#pOk').onclick=()=>{ const bal=num($('#pB').value); if(isNaN(bal)) return toast(L('Pon el saldo pendiente','Enter the outstanding balance')); let id=$('#pAcc').value; let m;
    if(id==='__new'){ m={id:uid(),kind:'mortgage',name:$('#pN').value.trim()||L('Hipoteca','Mortgage'),institution:r.institution,last4:r.last4}; S.accounts.push(m); } else m=acc(id);
    if($('#pPr').value) m.propertyId=$('#pPr').value;
    saveMortgageStatement(m,Object.assign({},r,{rate:finOrNull($('#pR').value),pi:finOrNull($('#pP').value),extra:finOrNull($('#pE').value)||0,escrow:finOrNull($('#pS').value)||0}),bal,isoDate($('#pD').value)||today()); save();
    const R=reconcile(); const mr=R.mort[m.id]; const LP=mr&&mr.last;
    pdfDone(`<div class="alert good"><span class="ic">✓</span><div>${L(`<b>Hipoteca guardada.</b> Cuota mensual total ${fmt(mortMonthly(m),2)}${LP?`; último pago encontrado en tus cuentas: ${fmt(-LP.amount,2)} el ${dLabel(LP.date)}`:''}. Mírala en <a href="#hipotecas">Hipotecas</a>.`,`<b>Mortgage saved.</b> Total monthly payment ${fmt(mortMonthly(m),2)}${LP?`; last payment found in your accounts: ${fmt(-LP.amount,2)} on ${dLabel(LP.date)}`:''}. See it in <a href="#hipotecas">Mortgages</a>.`)}</div></div>`); };
}
function renderGenericPDF(r,name,text){
  const out=$('#impOut'); const accs=S.accounts.filter(a=>a.kind!=='mortgage'); const {m:gm,key:gkey}=matchPDF(r,text); const gid=gm?gm.acc.id:null;
  const tx=r.tx||[];
  out.innerHTML=`<div class="card"><h2>${esc(r.institution||'Statement')}</h2><p class="sub">${esc(name)} · ${KINDS[r.kind]?KINDS[r.kind].label:''}. ${L('Revisa antes de guardar.','Check before saving.')}</p>
   <div class="row"><label class="f">${L('Cuenta','Account')}<select id="gAcc">${accs.map(a=>`<option value="${a.id}" ${gid===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="__new" ${!gid&&(IMPORT_NEW||!accs.length)?'selected':''}>${L('+ Cuenta nueva','+ New account')}</option></select></label><label class="f">${L('Tipo (si es nueva)','Type (if new)')}<select id="gK">${Object.entries(KINDS).filter(([k])=>k!=='mortgage').map(([k,v])=>`<option value="${k}" ${k===r.kind?'selected':''}>${v.label}</option>`).join('')}</select></label><label class="f">${L('Nombre (si es nueva)','Name (if new)')}<input id="gN" value="${esc(stmtAccName(r))}"></label></div>
   <h3 class="sec" style="margin-top:8px">${L('Saldo','Balance')}</h3>
   ${r.cands.length?`<div style="margin-bottom:6px">${r.cands.slice(0,5).map((c,i)=>`<label style="display:flex;gap:8px;align-items:flex-start;margin:5px 0"><input type="radio" name="cand" value="${c.v}" style="width:auto;margin-top:3px" ${i===0?'checked':''}><span><b>${fmt(c.v,2)}</b> <span class="muted">${esc(c.line)}</span></span></label>`).join('')}</div>`:`<p class="muted">${L('No encontré el saldo automáticamente.','I couldn\'t find the balance automatically.')}</p>`}
   <div class="row"><label class="f">${L('Saldo','Balance')}${r.kind==='credit'?L(' (lo que debes)',' (what you owe)'):''}<input id="gV" value="${r.cands[0]?r.cands[0].v:''}"></label><label class="f">${L('Fecha','Date')}<input type="date" id="gD" value="${r.date||today()}"></label><label class="f">${L('Aportado este periodo (inversión)','Contributed this period (investments)')}<input id="gC" inputmode="decimal" value="${r.contrib??''}"></label></div>
   ${r.check?(r.check.ok?`<div class="alert good"><span class="ic">✓</span><div>${L('Lo leído cuadra con el propio extracto (saldos y movimientos).','What was read matches the statement itself (balances and transactions).')}</div></div>`:`<div class="alert warn"><span class="ic">!</span><div>${L(`<b>No cuadra:</b> los movimientos leídos difieren en ${fmt(r.check.diff,2)} de lo que dice el extracto. Revísalos o prueba "Leer con Claude".`,`<b>Doesn't match:</b> the transactions read differ by ${fmt(r.check.diff,2)} from what the statement says. Review them or try "Read with Claude".`)}</div></div>`):''}
   ${r.funds&&r.funds.rows.length?`<h3 class="sec" style="margin-top:8px">${L('Fondos','Funds')} (${r.funds.rows.length})</h3><div class="tbl"><table><tbody>${r.funds.rows.map(f=>`<tr><td>${esc(f.name)}<div class="muted">${esc(f.cls||'')}</div></td><td class="n">${fmt(f.value,2)}</td></tr>`).join('')}</tbody></table></div>${r.funds.ok?`<p class="muted pos">✓ ${L('La suma de los fondos coincide con el total del extracto.','The funds add up to the statement total.')}</p>`:''}`:''}
   <h3 class="sec" style="margin-top:8px">${L('Movimientos','Transactions')} (${tx.length})</h3>
   ${tx.length?`<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="gTx" checked style="width:auto"> ${L('Importar estos movimientos a "Movimientos"','Import these transactions into "Transactions"')}</label><div class="tbl" style="max-height:260px;overflow:auto"><table><tbody>${tx.slice(0,200).map(t=>`<tr><td style="white-space:nowrap">${t.date}</td><td>${esc(t.desc)}</td><td>${esc(catL(categorize(t.desc,t.amount)||otherCat(t.amount)))}</td><td class="n ${t.amount>=0?'pos':''}">${fmt(t.amount,2)}</td></tr>`).join('')}</tbody></table></div><label class="f" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="gFlip" style="width:auto"> ${L('Invertir signo de todos','Flip the sign of all')}</label>`:`<p class="muted">${L('No encontré movimientos con formato reconocible. Prueba "Leer con Claude" o importa el CSV del banco.','I found no transactions in a recognizable format. Try "Read with Claude" or import the bank CSV.')}</p>`}
   <div class="row" style="margin-top:10px"><button id="gCancel">${L('Cancelar','Cancel')}</button><button id="gAI">${L('Leer con Claude','Read with Claude')}</button><button class="pri" id="gOk">${L('Guardar','Save')}</button></div>
   <div id="gAIout"></div>
   <details style="margin-top:10px"><summary>${L('Ver el texto leído del PDF','See the text read from the PDF')}</summary><pre>${esc(text.slice(0,5000))}</pre></details></div>`;
  out.querySelectorAll('input[name=cand]').forEach(i=>i.onchange=()=>$('#gV').value=i.value);
  $('#gCancel').onclick=()=>pdfDone('');
  $('#gOk').onclick=()=>{
    let id=$('#gAcc').value; if(id==='__new'){ const a={id:uid(),kind:$('#gK').value,name:$('#gN').value.trim()||L('Cuenta','Account'),institution:r.institution,last4:r.last4||''}; S.accounts.push(a); id=a.id; }
    const v=num($('#gV').value); if(!isNaN(v)) upsertSnap(id,isoDate($('#gD').value)||today(),v);
    const c=num($('#gC').value); if(!isNaN(c)&&c) { const a=acc(id); a.contributed=(a.contributed||0)+c; }
    const nf=saveFunds(acc(id),Object.assign({},r,{date:isoDate($('#gD').value)||r.date,dateFound:true}));
    let added=0,dup=0; if(tx.length && $('#gTx') && $('#gTx').checked){ const flip=$('#gFlip').checked; ({added,dup}=importTxInto(id,tx.map(t=>flip?Object.assign({},t,{amount:-t.amount}):t),'pdf')); }
    learnKey(acc(id),gkey); save(); const RR=reconcile(); if(RR.changed) save(); pdfDone(`<div class="alert good"><span class="ic">✓</span><div>${L(`<b>Guardado.</b> ${!isNaN(v)?`Saldo ${fmt(v,2)}. `:''}${added?`${added} movimientos importados${dup?` (${dup} ya estaban)`:''}. `:''}Revisa en <a href="#cuentas">Cuentas</a>${added?' e <a href="#flujo">Movimientos</a>':''}.`,`<b>Saved.</b> ${!isNaN(v)?`Balance ${fmt(v,2)}. `:''}${added?`${added} transactions imported${dup?` (${dup} were already there)`:''}. `:''}Check in <a href="#cuentas">Accounts</a>${added?' and <a href="#flujo">Transactions</a>':''}.`)}</div></div>`); };
  $('#gAI').onclick=async()=>{ const box=$('#gAIout'); box.innerHTML=`<p class="muted">${L('Pidiendo a Claude…','Asking Claude…')}</p>`;
    try{ const res=await claudeExtract(text); if(!res){box.innerHTML='';return;}
      if(res.tax_forms.length&&!res.transactions.length&&res.ending_balance==null){ renderTaxImport(name,text,res.tax_forms[0].form,res.tax_forms); return; }
      const nr=Object.assign({},r,{institution:res.institution||r.institution,kind:KINDS[res.account_kind]?res.account_kind:r.kind,date:res.period_end||r.date,
        cands:res.ending_balance!=null?[{v:res.ending_balance,line:L('Leído por Claude','Read by Claude')}]:r.cands, contrib:res.contributions_this_period, check:null,
        tx:res.transactions.map(t=>({date:t.date,desc:t.description.trim(),amount:Math.round(t.amount*100)/100}))});
      if(res.account_kind==='mortgage'&&res.mortgage){ renderMortgagePDF({institution:nr.institution,balance:res.ending_balance??NaN,rate:res.mortgage.rate??NaN,pi:res.mortgage.principal_and_interest||'',extra:res.mortgage.extra_principal,escrow:res.mortgage.escrow,date:nr.date,last4:''},name,text); return; }
      renderGenericPDF(nr,name,text); $('#gAIout').innerHTML=`<p class="pos">${L(`Leído por Claude: ${nr.cands[0]?'saldo '+fmt(nr.cands[0].v,2)+', ':''}${nr.tx.length} movimientos. Revisa y guarda.`,`Read by Claude: ${nr.cands[0]?'balance '+fmt(nr.cands[0].v,2)+', ':''}${nr.tx.length} transactions. Check and save.`)}</p>`;
    }catch(e){ box.innerHTML=`<p class="muted">${esc(e.code==='not_granted'?L('No diste permiso para usar Claude.','You didn\'t allow using Claude.'):e.message||'Error')}</p>`; } };
}
/* ---- Tax document import ---- */
function renderTaxImport(name,text,type,claudeForms){
  const out=$('#impOut');
  const yr=taxYearOf(text);
  const forms=claudeForms|| (type==='C1099'?[{form:'C1099',tax_year:yr,payer:'',fields:localTaxFields('C1099',text)}]:[{form:type,tax_year:yr,payer:'',fields:localTaxFields(type,text)}]);
  const payerGuess=payerOf(text);
  const accOpts=S.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  out.innerHTML=`<div class="card"><h2>${L('Documento fiscal detectado','Tax document detected')}</h2><p class="sub">${esc(name)}. ${L('Se guarda en <a href="#impuestos">Impuestos</a>. Revisa las cifras: los formularios fiscales tienen formatos muy distintos.','It is saved in <a href="#impuestos">Taxes</a>. Check the figures: tax forms come in very different layouts.')}</p>
   ${forms.map((f,i)=>{ const t=FORM_FIELDS[f.form]?f.form:'OTHER'; return `<div class="card" style="background:var(--surface-2);margin-bottom:10px" data-form="${i}">
     <div class="row"><label class="f">${L('Tipo','Type')}<select class="tType">${Object.entries(FORM_LABEL).map(([k,v])=>`<option value="${k}" ${k===t?'selected':''}>${v}</option>`).join('')}</select></label><label class="f">${L('Año fiscal','Tax year')}<input class="tYear" inputmode="numeric" value="${f.tax_year||yr}"></label><label class="f">${L('Emisor','Payer')}<input class="tPayer" value="${esc(f.payer||payerGuess)}"></label></div>
     <label class="f">${L('Cuenta relacionada','Related account')}<select class="tAcc"><option value="">—</option>${accOpts}</select></label>
     <div class="tFields">${taxFieldInputs(t,f.fields||{})}</div></div>`; }).join('')}
   <div class="row"><button id="tCancel">${L('Cancelar','Cancel')}</button>${claudeForms?'':`<button id="tAI">${L('Leer con Claude','Read with Claude')}</button>`}<button class="pri" id="tOk">${L('Guardar en impuestos','Save to taxes')}</button></div>
   <div id="tAIout"></div>
   <details style="margin-top:10px"><summary>${L('Ver el texto leído del PDF','See the text read from the PDF')}</summary><pre>${esc(text.slice(0,5000))}</pre></details></div>`;
  out.querySelectorAll('[data-form]').forEach(b=>{ b.querySelector('.tType').onchange=e=>{ b.querySelector('.tFields').innerHTML=taxFieldInputs(e.target.value,{}); };
    const pay=b.querySelector('.tPayer').value.toLowerCase(); const sel=b.querySelector('.tAcc'); const m=S.accounts.find(a=>pay&&((a.institution||'').toLowerCase().includes(pay)||pay.includes((a.institution||'~').toLowerCase()))); if(m) sel.value=m.id; });
  $('#tCancel').onclick=()=>pdfDone('');
  if($('#tAI')) $('#tAI').onclick=async()=>{ const box=$('#tAIout'); box.innerHTML=`<p class="muted">${L('Pidiendo a Claude…','Asking Claude…')}</p>`; try{ const res=await claudeExtract(text); if(!res){box.innerHTML='';return;} if(res.tax_forms&&res.tax_forms.length) renderTaxImport(name,text,res.tax_forms[0].form,res.tax_forms); else box.innerHTML=`<p class="muted">${L('Claude no encontró formularios fiscales.','Claude found no tax forms.')}</p>`; }catch(e){ box.innerHTML=`<p class="muted">${esc(e.message||'Error')}</p>`; } };
  $('#tOk').onclick=()=>{ let n=0; out.querySelectorAll('[data-form]').forEach(b=>{ const type=b.querySelector('.tType').value; const year=+b.querySelector('.tYear').value||yr; const fields={}; b.querySelectorAll('[data-k]').forEach(i=>{ const v=num(i.value); if(!isNaN(v)) fields[i.dataset.k]=v; });
      taxYear(year).docs.push({id:uid(),type,payer:b.querySelector('.tPayer').value.trim(),acc:b.querySelector('.tAcc').value||null,fields,src:name,added:today()}); n++; taxSel.year=year; });
    save(); pdfDone(`<div class="alert good"><span class="ic">✓</span><div>${L(`<b>${n} documento${n>1?'s':''} guardado${n>1?'s':''}.</b> Míralo en <a href="#impuestos">Impuestos</a>.`,`<b>${n} document${n>1?'s':''} saved.</b> See it in <a href="#impuestos">Taxes</a>.`)}</div></div>`); };
}
/* ============================================================
   Importación por lotes: varios PDF y CSV a la vez.
   Cada archivo se reconoce y se guarda en su cuenta (últimos 4 dígitos, firma
   aprendida o entidad). Lo que no se puede asignar con seguridad queda para revisar.
   ============================================================ */
const isPdfFile=f=>/\.pdf$/i.test(f.name)||f.type==='application/pdf';
// Guardado común (importación individual y por lotes)
// st: identifica el extracto; dos movimientos iguales del mismo extracto no se marcan como duplicados.
function importTxInto(accId,tx,src){ const keys=new Set(S.tx.map(t=>t.acc+'|'+t.date+'|'+t.amount+'|'+t.desc)); let added=0,dup=0; const st=uid();
  // Solo cuenta como repetido lo que ya estaba guardado: dos cargos iguales el mismo día en un extracto son dos cargos.
  for(const t of tx){ const k=accId+'|'+t.date+'|'+t.amount+'|'+t.desc; if(keys.has(k)){dup++;continue;}
    S.tx.push({id:uid(),date:t.date,desc:t.desc,amount:t.amount,cat:categorize(t.desc,t.amount)||otherCat(t.amount),acc:accId,src,st}); added++; }
  return {added,dup}; }
function saveMortgageStatement(m,r,bal,date){ m.rate=r.rate; m.payment=r.pi; m.extra=r.extra||0; m.escrow=r.escrow||0; if(r.nextDue) m.nextDue=r.nextDue; if(r.last4) m.last4=r.last4; if(!m.institution) m.institution=r.institution;
  const sn=upsertSnap(m.id,date,bal); Object.assign(sn,{rate:m.rate,pi:m.payment,extra:m.extra,escrow:m.escrow}); delete extraSim[m.id]; }
function saveHoldings(id,H,d,setBal,setCost){ const a=acc(id); const total=H.reduce((s,x)=>s+x.value,0), cost=H.reduce((s,x)=>s+(x.cost||0),0);
  a.holdings={date:d,rows:H}; S.holdingsHist=(S.holdingsHist||[]).filter(x=>!(x.acc===id&&x.date===d)); S.holdingsHist.push({acc:id,date:d,rows:H.map(x=>({sym:x.sym,value:x.value,cost:x.cost}))});
  if(setBal) upsertSnap(id,d,Math.round(total*100)/100); if(setCost) a.contributed=Math.round(cost*100)/100; return a; }
// Firmas aprendidas: al guardar un archivo en una cuenta se recuerda su firma (nombre de archivo sin fechas, o entidad + últimos 4 dígitos)
const GENERIC_FILE=/^(statement|statements|activity|transactions?|export|download|history|estado|extracto|movimientos|account|cuenta|csv|pdf)+$/;
function fileKey(name){ let s=String(name||'').toLowerCase().replace(/\.[a-z0-9]{2,4}$/,'');
  s=s.replace(/(19|20)\d{2}[-_. ]?\d{2}[-_. ]?\d{2}/g,' ').replace(/\b(19|20)\d{2}\b/g,' ').replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|abr|ago|dic)[a-z]*/g,' ').replace(/(^|\D)\d{1,3}(?=\D|$)/g,'$1 ').replace(/[^a-z0-9]+/g,'');
  return s.length>=4&&/[a-z]/.test(s)&&!GENERIC_FILE.test(s)?'f:'+s.slice(0,60):null; }
function pdfLast4s(text){ const out=new Set(); const T=String(text);
  for(const m of T.matchAll(/(?:account|acct|card|loan)\b[^\n]{0,40}?(?:number|no\.?|#|ending(?: in)?)[^\n\d]{0,15}([\dXx*•.\- ]{4,30}\d)/gi)){ const d=m[1].replace(/\D/g,''); if(d.length>=4) out.add(d.slice(-4)); }
  for(const m of T.matchAll(/ending in[^\d\n]{0,5}(\d{4})\b/gi)) out.add(m[1]);
  return [...out]; }
function pdfKey(r,last4s){ const i=String(r.institution||'').toLowerCase().replace(/[^a-z0-9]/g,''); return i||last4s[0]?`p:${i}|${last4s[0]||''}`:null; }
function learnKey(a,k){ if(!a||!k) return; S.accounts.forEach(x=>{ if(x!==a&&x.keys) x.keys=x.keys.filter(y=>y!==k); }); a.keys=[k,...(a.keys||[]).filter(y=>y!==k)].slice(0,20); }
const INST_RE=/\b(chase|amex|american express|bank of america|bofa|wells fargo|wellsfargo|citi|capital one|capitalone|discover|ally|marcus|sofi|schwab|fidelity|vanguard|m1|usaa|us bank|pnc|navy federal|apple card)\b/i;
// Busca la cuenta: 1) últimos 4 dígitos, 2) firma aprendida, 3) entidad (si solo hay una cuenta que encaje)
function matchAccount(filter,{last4s=[],keys=[],institution='',kind=null}){
  // Una cuenta con otros últimos 4 dígitos nunca es candidata (dos cuentas del mismo banco no se mezclan)
  const pool=S.accounts.filter(x=>filter(x)&&!(last4s.length&&x.last4&&!last4s.includes(x.last4))); const one=l=>l.length===1?l[0]:null;
  let a=one(pool.filter(x=>x.last4&&last4s.includes(x.last4))); if(a) return {acc:a,how:'last4'};
  const fa=forAcc(filter); if(fa) return {acc:fa,how:'forced'};
  const ks=keys.filter(Boolean); a=one(pool.filter(x=>(x.keys||[]).some(k=>ks.includes(k)))); if(a) return {acc:a,how:'key'};
  // Por entidad (nombre completo o abreviatura, p. ej. "Bank of America" o "BofA"), nunca solo "bank"
  const nm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,''); const ali=[nm(institution),nm(INST_SHORT[institution])].filter(x=>x.length>=2);
  if(ali.length){ const byInst=pool.filter(x=>ali.some(k=>nm((x.institution||'')+' '+x.name).includes(k))); a=one(kind?byInst.filter(x=>x.kind===kind):byInst)||(last4s.length?null:one(byInst)); if(a) return {acc:a,how:'inst'}; }
  return null; }
function matchCSV(name){ const last4s=(String(name).match(/\d{4}/g)||[]).filter(x=>!/^(19|20)\d\d$/.test(x)); const inst=(String(name).match(INST_RE)||[])[1]||'';
  return matchAccount(a=>a.kind==='cash'||a.kind==='credit',{last4s,keys:[fileKey(name)],institution:inst,kind:/card|credit|amex|visa|discover/i.test(name)?'credit':null}); }
function matchPDF(r,text){ const last4s=r.last4?[r.last4]:pdfLast4s(text); return {m:matchAccount(a=>a.kind!=='mortgage'&&a.kind!=='property',{last4s,keys:[pdfKey(r,last4s)],institution:r.institution,kind:r.kind}),key:pdfKey(r,last4s)}; }
function taxYearOf(text){ return +(text.match(/\b(20[2-3]\d)\b(?=[^\n]{0,30}(Form|W-2|1098|1099|Tax Year))/i)||text.match(/Tax Year\s*(20\d\d)/i)||[0,new Date().getFullYear()-(new Date().getMonth()<6?1:0)])[1]; }
function payerOf(text){ return (text.match(/\b(M1 Finance|M1|Fidelity|Vanguard|Charles Schwab|Schwab|Empower|Chase|Bank of America|Wells Fargo|Citi|American Express|Capital One|Discover|Ally|Marcus|SoFi|Pennymac|Robinhood|Betterment|Wealthfront|Apex Clearing|Orange County|Los Angeles County)\b/i)||[])[1]||''; }
function payerAccount(pay){ pay=String(pay||'').toLowerCase(); return pay?S.accounts.find(a=>(a.institution||'').toLowerCase().includes(pay)||pay.includes((a.institution||'~').toLowerCase()))||null:null; }

async function autoCSV(file){
  const text=await file.text(); const rows=parseCSV(text); if(!rows.length) return {status:'error',msg:L('El archivo está vacío','The file is empty')};
  if(isHoldingsCSV(rows)){ const H=parseHoldings(rows); const pool=S.accounts.filter(a=>['brokerage','kids','retirement'].includes(a.kind)); const fk=fileKey(file.name);
    const a=forAcc(x=>pool.includes(x))||(pool.find(x=>fk&&(x.keys||[]).includes(fk)))||(pool.filter(x=>/m1/i.test(x.name+' '+(x.institution||''))).length===1?pool.find(x=>/m1/i.test(x.name+' '+(x.institution||''))):null);
    if(!a) return {status:'review',kind:'holdings',msg:pool.length?L('El CSV de posiciones no dice de qué cuenta es. Usa el botón "Importar" de esa cuenta en Mis cuentas y la próxima vez irá solo.','The positions CSV doesn\'t say which account it is from. Use that account\'s "Import" button in My accounts and next time it will go there on its own.'):L('Aún no tienes la cuenta de inversión: pulsa "Revisar" para crearla con estas posiciones.','You don\'t have the investment account yet: tap "Review" to create it with these positions.')};
    saveHoldings(a.id,H,dateFromFilename(file.name),true,true); learnKey(a,fk); return {status:'ok',kind:'holdings',acc:a.id,msg:L(`${H.length} posiciones`,`${H.length} positions`)}; }
  const p=csvPrepare(file.name,rows);
  if(p.cDate<0||(p.cAmt<0&&p.cDeb<0&&p.cCred<0)) return {status:'review',kind:'csv',msg:L('No reconozco las columnas de fecha e importe','I can\'t recognize the date and amount columns')};
  const mm=matchCSV(file.name); if(!mm) return {status:'review',kind:'csv',msg:L('No sé a qué cuenta pertenece','I don\'t know which account it belongs to')};
  const a=mm.acc; p.flip=false;
  if(p.cAmt>=0){ const vals=p.data.map(r=>num(r[p.cAmt])).filter(v=>!isNaN(v)); const pos=vals.filter(v=>v>0).length; p.flip=a.kind==='credit'&&pos>vals.length*0.7; }
  const tx=csvRowsToTx(p); if(!tx.length) return {status:'review',kind:'csv',msg:L('No encontré movimientos','I found no transactions')};
  const r=importTxInto(a.id,tx,'csv'); learnKey(a,fileKey(file.name));
  return {status:r.added?'ok':'skip',kind:'csv',acc:a.id,added:r.added,dup:r.dup,flip:p.flip}; }

async function autoPDF(file){
  const text=await pdfText(file); if(text.replace(/\s/g,'').length<40) return {status:'review',kind:'pdf',msg:L('Parece una imagen escaneada, sin texto','It looks like a scanned image, with no text')};
  const r=parseStatement(text); const is1098=/Form\s*1098\b|Mortgage Interest Statement/i.test(text);
  if(r.type==='mortgage'&&!is1098){ let m=S.accounts.find(a=>a.kind==='mortgage'&&r.last4&&a.last4===r.last4)||forAcc(a=>a.kind==='mortgage'&&!(r.last4&&a.last4&&a.last4!==r.last4));
    let created=false;
    if(!m&&r.last4&&!isNaN(r.balance)&&r.pi>0){ m=newAccFrom({institution:r.institution,last4:r.last4,product:L('Hipoteca','Mortgage')},'mortgage'); created=true; }
    if(!m) return {status:'review',kind:'mortgage',msg:L('Hipoteca sin número de préstamo: revísala y elige la cuenta','A mortgage without a loan number: review it and choose the account')+' ('+esc(r.institution||'?')+')'};
    if(isNaN(r.balance)||!r.pi) return {status:'review',kind:'mortgage',msg:L('No encontré el saldo o la cuota','I couldn\'t find the balance or the payment')};
    saveMortgageStatement(m,Object.assign({},r,{rate:finOrNull(r.rate)}),r.balance,r.date||today());
    return {status:'ok',kind:'mortgage',acc:m.id,bal:r.balance,date:r.date,created}; }
  const tf=detectTaxForm(text);
  if(tf){ const yr=taxYearOf(text), ty=taxYear(yr); if(ty.docs.some(d=>d.src===file.name&&d.type===tf)) return {status:'skip',kind:'tax',msg:L('Ya estaba guardado','Already saved')};
    const fields=localTaxFields(tf,text); if(!Object.keys(fields).length) return {status:'review',kind:'tax',msg:L('No encontré las cifras del formulario','I couldn\'t find the form\'s figures')};
    const payer=payerOf(text), pa=payerAccount(payer); ty.docs.push({id:uid(),type:tf,payer,acc:pa?pa.id:null,fields,src:file.name,added:today()});
    return {status:'ok',kind:'tax',msg:`${FORM_LABEL[tf]} · ${yr} · ${L('revisa las cifras en Impuestos','check the figures in Taxes')}`}; }
  if(!r.known) r.tx=parseTxLines(text,r.date); stmtCheck(r,text); const {m:mm,key}=matchPDF(r,text);
  let a=mm&&mm.acc, created=false;
  if(!a){ const enough=(r.known||(r.institution&&r.last4))&&((r.dateFound&&r.cands.length)||r.tx.length);
    if(!enough) return {status:'review',kind:'pdf',msg:L('No sé a qué cuenta pertenece','I don\'t know which account it belongs to')+' — '+L('detectado','detected')+': '+esc(seenAs(r))};
    // Varias cuentas de la entidad y sin dígitos para distinguirlas: mejor preguntar
    if(!r.last4&&S.accounts.some(x=>x.kind===r.kind&&(x.institution||'').toLowerCase()===String(r.institution).toLowerCase())) return {status:'review',kind:'pdf',msg:L('Tienes varias cuentas así y el extracto no trae número de cuenta','You have several such accounts and the statement has no account number')+' — '+esc(seenAs(r))};
    a=newAccFrom(r,r.kind); created=true; } const bal=r.cands.length?r.cands[0].v:NaN; const useBal=!isNaN(bal)&&r.dateFound; const txOk=r.tx.length&&['cash','credit'].includes(a.kind);
  if(!useBal&&!txOk) return {status:'review',kind:'pdf',acc:a.id,msg:L('No encontré el saldo con su fecha ni movimientos','I couldn\'t find a dated balance or transactions')};
  if(r.last4&&!a.last4) a.last4=r.last4;
  if(useBal) upsertSnap(a.id,r.date,bal); const res=txOk?importTxInto(a.id,r.tx,'pdf'):{added:0,dup:0}; learnKey(a,key);
  const nf=saveFunds(a,r);
  return {status:'ok',kind:'pdf',acc:a.id,bal:useBal?bal:null,date:useBal?r.date:null,added:res.added,dup:res.dup,created,funds:nf,check:r.check}; }
// Fondos del plan (401(k), IRA…): se guardan como posiciones de la cuenta para ver su distribución
function saveFunds(a,r){ const F=r.funds; if(!F||!F.rows.length||!['retirement','brokerage','kids'].includes(a.kind)||!r.dateFound) return 0;
  const cur=a.holdings&&a.holdings.date; if(cur&&cur>r.date) return 0; saveHoldings(a.id,F.rows,r.date,false,false); return F.rows.length; }

// Cuenta nueva a partir de un extracto reconocido (lote). El nombre lleva entidad, producto y últimos 4 dígitos.
const INST_SHORT={'Bank of America':'BofA','M1 Finance':'M1','American Express':'Amex'};
function stmtAccName(r){ return ([INST_SHORT[r.institution]||r.institution,r.product].filter(Boolean).join(' ')+(r.last4?' ···'+r.last4:'')).trim().slice(0,60); }
function newAccFrom(r,kind){
  const a={id:uid(),kind,name:stmtAccName(r)||L('Cuenta','Account'),institution:r.institution||'',last4:r.last4||''}; S.accounts.push(a); return a; }
function seenAs(r){ return [r.institution||L('entidad desconocida','unknown institution'),KINDS[r.kind]?KINDS[r.kind].label:'',r.last4?'···'+r.last4:L('sin número de cuenta','no account number')].filter(Boolean).join(' · '); }
let BATCH=null;
async function importBatch(files){
  const list=[...files].filter(f=>isPdfFile(f)||/\.(csv|txt)$/i.test(f.name)||/csv|text\/plain|vnd\.ms-excel/.test(f.type));
  const box=$('#batchOut'); if(!box) return; if(!list.length){ toast(L('Elige archivos PDF o CSV','Choose PDF or CSV files')); return; }
  BATCH={running:true,res:[]}; box.innerHTML=`<div class="alert info" style="margin-top:10px"><span class="ic">i</span><div class="bprog"></div></div>`;
  const seen=new Set();
  for(let i=0;i<list.length;i++){ const f=list[i]; const pr=box.querySelector('.bprog'); if(pr) pr.textContent=L(`Procesando ${i+1} de ${list.length}: ${f.name}`,`Processing ${i+1} of ${list.length}: ${f.name}`);
    let r; try{ const h=b64(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()));
      if(seen.has(h)) r={status:'skip',msg:L('Es el mismo archivo que otro de este lote','It is the same file as another one in this batch')};
      else { seen.add(h); r=isPdfFile(f)?await autoPDF(f):await autoCSV(f); } }catch(e){ r={status:'error',msg:String(e&&e.message||e)}; }
    r.file=f; r.name=f.name; BATCH.res.push(r); }
  BATCH.running=false; save(); const R=reconcile(); if(R.changed) save(); BATCH.rec=R; renderBatch();
}
function renderBatch(){
  const box=$('#batchOut'); if(!box||!BATCH) return; const res=BATCH.res; const n=s=>res.filter(r=>r.status===s).length;
  const KL={csv:'CSV',pdf:L('Extracto','Statement'),mortgage:L('Hipoteca','Mortgage'),tax:L('Fiscal','Tax form'),holdings:L('Posiciones','Positions')};
  const ic={ok:['good','✓'],skip:['info','i'],review:['warn','!'],error:['crit','✗']};
  const detail=r=>{ const parts=[]; if(r.created) parts.push(`<b>${L('cuenta nueva','new account')}</b>`); if(r.kind) parts.push(KL[r.kind]||r.kind); if(r.acc&&acc(r.acc)) parts.push(esc(acc(r.acc).name));
    if(r.added!=null) parts.push(L(`${r.added} movimientos nuevos${r.dup?` (${r.dup} ya estaban)`:''}`,`${r.added} new transactions${r.dup?` (${r.dup} already there)`:''}`));
    if(r.bal!=null) parts.push(`${L('saldo','balance')} ${fmt(r.bal,2)}${r.date?' · '+dLabel(r.date):''}`); if(r.flip) parts.push(L('signo invertido (tarjeta)','sign flipped (card)'));
    if(r.funds) parts.push(L(`${r.funds} fondos`,`${r.funds} funds`));
    if(r.check) parts.push(r.check.ok?`<span class="pos">✓ ${L('cuadra con el extracto','matches the statement')}</span>`:`<b class="neg">⚠ ${L('no cuadra con el extracto','doesn\'t match the statement')} (${L('diferencia','difference')} ${fmt(r.check.diff,2)})</b>`);
    if(r.msg) parts.push(esc(r.msg)); return parts.join(' · '); };
  const R=BATCH.rec; const nIss=R?R.issues.filter(i=>i.lvl!=='info').length:0;
  box.innerHTML=`<div style="margin-top:12px"><p><b>${L(`${res.length} archivos`,`${res.length} files`)}:</b> ${n('ok')} ${L('guardados','saved')} · ${n('review')} ${L('para revisar','to review')} · ${n('skip')} ${L('sin cambios','unchanged')}${n('error')?` · ${n('error')} ${L('con error','with errors')}`:''}</p>
    ${res.map((r,i)=>{ const [c,s]=ic[r.status]||ic.error; return `<div class="alert ${c}" style="margin-bottom:6px"><span class="ic">${s}</span><div style="flex:1;min-width:0"><div style="overflow-wrap:anywhere"><b>${esc(r.name)}</b></div><div class="muted">${detail(r)}</div>${r.status==='review'?`<button class="sm" style="margin-top:6px" data-brev="${i}">${r.opened?L('Abierto abajo ↓','Opened below ↓'):L('Revisar','Review')}</button>`:''}</div></div>`; }).join('')}
    ${R?`<p class="muted">${L(`Conciliación: ${R.stats.card+R.stats.xfer} pagos y transferencias emparejados, ${R.stats.mort} cuotas de hipoteca${nIss?`, <b>${nIss} diferencia${nIss>1?'s':''} para revisar</b> en <a href="#flujo">Movimientos</a>`:''}.`,`Reconciliation: ${R.stats.card+R.stats.xfer} payments and transfers matched, ${R.stats.mort} mortgage payments${nIss?`, <b>${nIss} difference${nIss>1?'s':''} to review</b> in <a href="#flujo">Transactions</a>`:''}.`)}</p>`:''}</div>`;
  box.querySelectorAll('[data-brev]').forEach(b=>b.onclick=()=>{ const r=res[+b.dataset.brev]; r.opened=true; renderBatch(); if(isPdfFile(r.file)){ pdfBusy=false; pdfQueue.length=0; queuePDF(r.file); } else handleCSV(r.file); setTimeout(()=>{ const o=$('#impOut'); if(o) o.scrollIntoView({behavior:'smooth'}); },300); });
}

function taxFieldInputs(type,vals){ return '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0 10px">'+(FORM_FIELDS[type]||FORM_FIELDS.OTHER).map(([k,l])=>`<label class="f">${l}<input data-k="${k}" inputmode="decimal" value="${vals[k]!=null&&!isNaN(vals[k])?vals[k]:''}"></label>`).join('')+'</div>'; }


/* ---------- Holdings (posiciones) CSV — M1 Finance y similares ---------- */
function isHoldingsCSV(rows){ const h=(rows[0]||[]).map(x=>x.trim().toLowerCase()); return h.includes('symbol')&&h.some(x=>/^(value|market value|current value)$/.test(x))&&h.some(x=>/quantity|shares/.test(x)); }
function parseHoldings(rows){
  const h=rows[0].map(x=>x.trim().toLowerCase()); const ix=re=>h.findIndex(x=>re.test(x));
  const c={sym:ix(/^symbol$/),name:ix(/^name$|description/),qty:ix(/quantity|shares/),avg:ix(/avg/),cost:ix(/cost basis/),gain:ix(/unrealized gain \(\$\)|gain\/loss \(\$\)|unrealized gain$/),val:ix(/^(value|market value|current value)$/)};
  return rows.slice(1).filter(r=>r[c.sym]&&r[c.sym].trim()).map(r=>{ const value=num(r[c.val]), cost=c.cost>=0?num(r[c.cost]):NaN; const gain=c.gain>=0?num(r[c.gain]):(isNaN(cost)?NaN:value-cost);
    return {sym:r[c.sym].trim(),name:c.name>=0?r[c.name].trim():'',qty:num(r[c.qty]),avg:c.avg>=0?num(r[c.avg]):NaN,cost:isNaN(cost)?null:cost,value:isNaN(value)?0:value,gain:isNaN(gain)?null:gain}; }).filter(x=>x.value||x.qty);
}
function dateFromFilename(n){ const m=n.match(/([A-Za-z]{3})[-_ ](\d{1,2})[-_ ](\d{4})/); if(m){ const i=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].toLowerCase()); if(i>=0) return `${m[3]}-${String(i+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`; } const d=n.match(/(\d{4})-(\d{2})-(\d{2})/); return d?d[0]:today(); }
function renderHoldingsPreview(fileName,rows){
  const H=parseHoldings(rows); const out=$('#impOut'); const date=dateFromFilename(fileName);
  const total=H.reduce((s,x)=>s+x.value,0), cost=H.reduce((s,x)=>s+(x.cost||0),0);
  const accs=S.accounts.filter(a=>['brokerage','kids','retirement'].includes(a.kind));
  const guess=forAcc(a=>accs.includes(a))||accs.find(a=>/m1/i.test(a.name+' '+(a.institution||'')))||(IMPORT_NEW?null:accs[0]);
  out.innerHTML=`<div class="card"><h2>${L('Posiciones','Positions')} · ${esc(fileName)}</h2><p class="sub">${L(`${H.length} posiciones · valor ${fmt(total,2)} · coste ${fmt(cost,2)} · ganancia no realizada`,`${H.length} positions · value ${fmt(total,2)} · cost ${fmt(cost,2)} · unrealized gain`)} <span class="${total-cost>=0?'pos':'neg'}">${fmt(total-cost,2)}</span></p>
   <div class="row"><label class="f">${L('Cuenta','Account')}<select id="hAcc">${accs.map(a=>`<option value="${a.id}" ${guess&&guess.id===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="__new" ${guess?'':'selected'}>${L('+ Cuenta nueva','+ New account')}</option></select></label><label class="f">${L('Fecha','Date')}<input type="date" id="hD" value="${date}"></label><label class="f">${L('Tipo (si es nueva)','Type (if new)')}<select id="hK"><option value="brokerage">${KINDS.brokerage.label}</option><option value="kids">${KINDS.kids.label}</option><option value="retirement">${KINDS.retirement.label}</option></select></label></div>
   <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="hBal" checked style="width:auto"> ${L('Actualizar el saldo de la cuenta a','Update the account balance to')} ${fmt(total,2)}</label>
   <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="hCost" checked style="width:auto"> ${L(`Usar el coste (${fmt(cost)}) como "total aportado" para calcular la ganancia`,`Use the cost (${fmt(cost)}) as "total contributed" to compute the gain`)}</label>
   <div class="tbl" style="max-height:280px;overflow:auto"><table><thead><tr><th>${L('Símbolo','Symbol')}</th><th class="n">${L('Valor','Value')}</th><th class="n">${L('Ganancia','Gain')}</th></tr></thead><tbody>${H.map(x=>`<tr><td><b>${esc(x.sym)}</b> <span class="muted">${esc(x.name)}</span></td><td class="n">${fmt(x.value,2)}</td><td class="n ${x.gain>=0?'pos':'neg'}">${x.gain!=null?fmt(x.gain,2):'—'}</td></tr>`).join('')}</tbody></table></div>
   <div class="row" style="margin-top:10px"><button id="hCancel">${L('Cancelar','Cancel')}</button><button class="pri" id="hOk">${L('Guardar posiciones','Save positions')}</button></div></div>`;
  $('#hCancel').onclick=()=>out.innerHTML='';
  $('#hOk').onclick=()=>{ let id=$('#hAcc').value; if(id==='__new'){ const a={id:uid(),kind:$('#hK').value,name:/m1/i.test(fileName)?'M1':L('Cuenta de inversión','Investment account'),institution:'M1 Finance'}; S.accounts.push(a); id=a.id; }
    const d=isoDate($('#hD').value)||today(); const a=saveHoldings(id,H,d,$('#hBal').checked,$('#hCost').checked); learnKey(a,fileKey(fileName));
    save(); out.innerHTML=`<div class="alert good"><span class="ic">✓</span><div>${L(`<b>${H.length} posiciones guardadas en ${esc(a.name)}.</b> Míralas en <a href="#inversiones">Inversiones</a>.`,`<b>${H.length} positions saved in ${esc(a.name)}.</b> See them in <a href="#inversiones">Investments</a>.`)}</div></div>`; };
}
const ASSET_CLASS={VOO:'EE. UU. grandes',IVV:'EE. UU. grandes',SPY:'EE. UU. grandes',VTI:'EE. UU. total',ITOT:'EE. UU. total',QQQ:'EE. UU. tecnología',QQQM:'EE. UU. tecnología',VOOG:'EE. UU. crecimiento',VUG:'EE. UU. crecimiento',SCHD:'EE. UU. dividendos',VYM:'EE. UU. dividendos',VXUS:'Internacional',VEA:'Internacional',VWO:'Emergentes',IXUS:'Internacional',AVUV:'EE. UU. pequeñas',VB:'EE. UU. pequeñas',IJR:'EE. UU. pequeñas',SMH:'EE. UU. tecnología',SOXX:'EE. UU. tecnología',ARKK:'EE. UU. tecnología',PDBC:'Materias primas',COMT:'Materias primas',DBC:'Materias primas',GLD:'Oro',IAU:'Oro',BND:'Bonos',AGG:'Bonos',BNDX:'Bonos',VGIT:'Bonos',SGOV:'Liquidez',BIL:'Liquidez',ESGV:'EE. UU. ESG',ESGU:'EE. UU. ESG',VSGX:'Internacional ESG',ESGD:'Internacional ESG'};
const AC_EN={'EE. UU. grandes':'US large cap','EE. UU. total':'US total market','EE. UU. tecnología':'US technology','EE. UU. crecimiento':'US growth','EE. UU. dividendos':'US dividends','Internacional':'International','Emergentes':'Emerging markets','EE. UU. pequeñas':'US small cap','Materias primas':'Commodities','Oro':'Gold','Bonos':'Bonds','Liquidez':'Cash','EE. UU. ESG':'US ESG','Internacional ESG':'International ESG','Otros fondos':'Other funds','EE. UU. medianas':'US mid cap','Fecha objetivo':'Target date','Inmobiliario':'Real estate','Acciones individuales':'Individual stocks'};
const acL=k=>LANG==='en'&&AC_EN[k]?AC_EN[k]:k;
function fundClass(s){ s=String(s||'');
  if(/target|retirement 20\d\d|lifecycle|freedom 20\d\d|lifepath/i.test(s)) return 'Fecha objetivo';
  if(/stable value|money market|cash|treasury money|government money/i.test(s)) return 'Liquidez';
  if(/bond|fixed income|income fund|aggregate|treasur|TIPS|total return/i.test(s)) return 'Bonos';
  if(/emerging/i.test(s)) return 'Emergentes';
  if(/international|intl|developed|global|world|foreign|ex[- ]u\.?s|europe|pacific/i.test(s)) return 'Internacional';
  if(/small/i.test(s)) return 'EE. UU. pequeñas';
  if(/\bmid\b|mid-?cap/i.test(s)) return 'EE. UU. medianas';
  if(/real estate|REIT/i.test(s)) return 'Inmobiliario';
  if(/large|500|S&P|total stock|total market|equity|growth|value|blue chip|index/i.test(s)) return 'EE. UU. grandes';
  return null; }
function assetClass(x){ if(ASSET_CLASS[x.sym]) return ASSET_CLASS[x.sym]; if(x.fund) return fundClass(x.cls)||fundClass(x.name)||'Otros fondos';
  if(/\b(ETF|Fund|Trust)\b/i.test(x.name)) return fundClass(x.name)||'Otros fondos'; return 'Acciones individuales'; }
function holdingsHTML(a){
  const H=(a.holdings&&a.holdings.rows)||[]; if(!H.length) return '';
  const total=H.reduce((s,x)=>s+x.value,0), cost=H.reduce((s,x)=>s+(x.cost||0),0);
  const byClass={}; H.forEach(x=>{const k=assetClass(x); byClass[k]=(byClass[k]||0)+x.value;});
  const pal=['var(--s1)','var(--s3)','var(--s7)','var(--s5)','var(--s4)','var(--s6)','var(--s2)','var(--s8)'];
  const classes=Object.entries(byClass).sort((p,q)=>q[1]-p[1]);
  const top=H.slice().sort((p,q)=>q.value-p.value);
  const losers=H.filter(x=>x.gain!=null&&x.gain<0);
  const single=H.filter(x=>assetClass(x)==='Acciones individuales').reduce((s,x)=>s+x.value,0);
  const ret=a.kind==='retirement'||a.kind==='kids', noCost=!cost; const nm=x=>x.fund?x.name:x.sym;
  const bonds=(byClass['Bonos']||0)+(byClass['Liquidez']||0);
  return `<div class="card" style="margin-top:12px">${helpBtn('holdings')}<h2>${L(ret?'Fondos':'Posiciones',ret?'Funds':'Positions')} · ${esc(a.name)}</h2><p class="sub">${L(`A ${dLabel(a.holdings.date)} · ${H.length} ${ret?'fondos':'posiciones'} · ${fmt(total)}`,`As of ${dLabel(a.holdings.date)} · ${H.length} ${ret?'funds':'positions'} · ${fmt(total)}`)}${noCost?'':` · ${L('ganancia no realizada','unrealized gain')} <span class="${total-cost>=0?'pos':'neg'}">${fmt(total-cost)}</span> (${Math.round((total-cost)/cost*100)}%)`}</p>
   <div class="grid g2"><div><h3 class="sec" style="margin-top:4px">${L('Por tipo de activo','By asset class')}</h3>${hbars(classes.map(([k,v],i)=>({k:acL(k),v,c:pal[i%8],note:Math.round(v/total*100)+'%'})))}</div>
   <div><h3 class="sec" style="margin-top:4px">${L('Lo que conviene saber','Worth knowing')}</h3>
     ${top[0]&&top[0].value/total>0.2?`<div class="alert info"><span class="ic">i</span><div>${L(`<b>${esc(nm(top[0]))}</b> pesa el ${Math.round(top[0].value/total*100)}% de la cuenta.`,`<b>${esc(nm(top[0]))}</b> is ${Math.round(top[0].value/total*100)}% of the account.`)}</div></div>`:''}
     ${ret?`<div class="alert info"><span class="ic">i</span><div>${L(`Bonos y liquidez: <b>${Math.round(bonds/total*100)}%</b>; acciones y fondos de acciones: <b>${100-Math.round(bonds/total*100)}%</b>.`,`Bonds and cash: <b>${Math.round(bonds/total*100)}%</b>; stocks and stock funds: <b>${100-Math.round(bonds/total*100)}%</b>.`)}</div></div>`:''}
     ${single/total>0.15?`<div class="alert info"><span class="ic">i</span><div>${L(`Las acciones individuales suman el ${Math.round(single/total*100)}% (${fmt(single)}).`,`Individual stocks add up to ${Math.round(single/total*100)}% (${fmt(single)}).`)}</div></div>`:''}
     ${ret?`<div class="alert info"><span class="ic">i</span><div>${L('En una cuenta de jubilación, cambiar de fondo no paga impuestos: puedes reequilibrar moviendo saldo entre fondos o cambiando el reparto de las aportaciones futuras en la web del plan.','In a retirement account, switching funds doesn\'t trigger taxes: you can rebalance by moving balance between funds or changing how future contributions are split on the plan\'s website.')}</div></div>`:`${losers.length?`<div class="alert warn"><span class="ic">!</span><div><b>${L('Candidatas a vender con pérdida (tax-loss harvesting):','Tax-loss harvesting candidates:')}</b> ${losers.map(x=>`${esc(x.sym)} ${fmt(x.gain)}`).join(', ')}. Total ${fmt(losers.reduce((s,x)=>s+x.gain,0))}.</div></div>`:`<div class="alert good"><span class="ic">✓</span><div>${L('Ninguna posición en pérdidas: no hay pérdidas que vender para compensar impuestos.','No positions at a loss: there are no losses to harvest to offset taxes.')}</div></div>`}
     <div class="alert info"><span class="ic">i</span><div>${L('Al ser una cuenta normal, vender cualquier posición con ganancia paga impuestos. Para reequilibrar, dirige las aportaciones nuevas hacia lo que quieras aumentar.','Since this is a taxable account, selling any position at a gain triggers taxes. To rebalance, direct new contributions toward what you want to grow.')}</div></div>`}
   </div></div>
   <details style="margin-top:8px"><summary>${L(`Ver ${ret?'los':'las'} ${H.length} ${ret?'fondos':'posiciones'}`,`See the ${H.length} ${ret?'funds':'positions'}`)}</summary><div class="tbl"><table><thead><tr><th>${ret?L('Fondo','Fund'):L('Símbolo','Symbol')}</th><th class="n">${L('Cantidad','Quantity')}</th><th class="n">${L('Coste','Cost')}</th><th class="n">${L('Valor','Value')}</th><th class="n">${L('Ganancia','Gain')}</th><th class="n">${L('% cuenta','% of account')}</th></tr></thead><tbody>${top.map(x=>`<tr><td><b>${esc(x.fund?x.name:x.sym)}</b><div class="muted">${esc(x.fund?acL(assetClass(x)):x.name)}</div></td><td class="n">${isNaN(x.qty)?'—':x.qty.toLocaleString('en-US',{maximumFractionDigits:4})}</td><td class="n">${x.cost!=null?fmt(x.cost):'—'}</td><td class="n">${fmt(x.value)}</td><td class="n ${x.gain>=0?'pos':'neg'}">${x.gain!=null?fmt(x.gain)+(x.cost?` <span class="muted">${Math.round(x.gain/x.cost*100)}%</span>`:''):'—'}</td><td class="n">${(x.value/total*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div></details></div>`;
}

/* ---------- Claude ---------- */
function buildSummary(){
  const cf=cashflowByMonth(); const cur=ym(today()); const months=Object.keys(cf).filter(m=>m<cur).sort().slice(-6);
  const by={}; S.accounts.forEach(a=>{const b=balanceOf(a); if(b!=null) by[a.kind]=(by[a.kind]||0)+Math.round(b);});
  const nw=netWorthAt();
  return {
    fecha:today(),
    patrimonio_neto: nw?Math.round(nw.net):null,
    saldos_por_tipo: Object.fromEntries(Object.entries(by).map(([k,v])=>[KINDS[k].label,v])),
    cuentas: S.accounts.map(a=>{const s=lastSnap(a.id); const o={nombre:a.name,tipo:KINDS[a.kind].label,saldo:s?Math.round(s.value):null,saldo_a:s?s.date:null};
      if(a.kind==='mortgage') Object.assign(o,{tipo_interes:a.rate,cuota_capital_intereses:a.payment,principal_extra_mensual:a.extra,escrow:a.escrow});
      if(a.kind==='property') Object.assign(o,{alquilada:!!a.rental,renta:a.rent,hoa:a.hoa,impuestos_anuales:a.taxYear,seguro_anual:a.insYear,mantenimiento_mensual:a.maint,otros_mensual:a.otherMonthly});
      if(a.kind==='credit'&&a.apr) o.apr=a.apr; if(a.contributed) o.aportado=a.contributed; return o;}),
    flujo_mensual: months.map(m=>({mes:m,ingresos:Math.round(cf[m].income),gastos:Math.round(cf[m].expense),por_categoria:Object.fromEntries(Object.entries(cf[m].cats).map(([k,v])=>[k,Math.round(v)]))})),
    alquiler: S.accounts.filter(a=>a.kind==='property'&&a.rental).map(p=>{const r=rentalPL(p); return {nombre:p.name,renta:r.rent,gastos_mensuales:Math.round(r.costs),flujo_caja:Math.round(r.net)};}),
    objetivo_fondo_emergencia_meses:S.settings.emergencyMonths,
    posiciones:S.accounts.filter(a=>a.holdings).map(a=>({cuenta:a.name,fecha:a.holdings.date,posiciones:a.holdings.rows.slice().sort((p,q)=>q.value-p.value).slice(0,30).map(x=>({s:x.sym,valor:Math.round(x.value),ganancia:x.gain!=null?Math.round(x.gain):null}))})),
    contexto_usuario:S.settings.context||''
  };
}
const PROMPTS=bil({
  general:['Haz una revisión de mi situación financiera: qué va bien, qué riesgos ves y las 3-5 acciones más importantes para los próximos meses, ordenadas por impacto.','Review my financial situation: what is going well, what risks you see and the 3-5 most important actions for the coming months, ordered by impact.'],
  hipoteca:['¿Me conviene más pagar principal extra en mis hipotecas o invertir ese dinero? Usa mis tipos de interés, mi liquidez y mi flujo de caja. Da números concretos.','Is it better for me to pay extra principal on my mortgages or invest that money? Use my interest rates, my cash and my cash flow. Give concrete numbers.'],
  gastos:['Analiza mis gastos de los últimos meses: dónde se va el dinero, qué categorías han subido y dónde podría recortar sin afectar mucho a mi familia. Da cantidades.','Analyze my spending over the last months: where the money goes, which categories went up and where I could cut without affecting my family much. Give amounts.'],
  alquiler:['Analiza la rentabilidad de mi casa en alquiler (flujo de caja, rentabilidad sobre el valor neto) y qué podría mejorar.','Analyze the return on my rental house (cash flow, return on equity) and what I could improve.']
});
VIEWS.claude=(el)=>{
  el.innerHTML=`
  <div class="card">${helpBtn('claude')}<h2>${L('Pregunta a Claude','Ask Claude')}</h2><p class="sub">${L('Claude recibe solo un <b>resumen de cifras</b>: saldos, totales por categoría y datos de hipotecas. Nunca tus statements, movimientos individuales ni números de cuenta.','Claude only receives a <b>summary of figures</b>: balances, totals by category and mortgage data. Never your statements, individual transactions or account numbers.')}</p>
   <div class="tabs-inline">
     <button data-p="general">${L('Revisión general','General review')}</button><button data-p="hipoteca">${L('¿Pago extra o invierto?','Extra payment or invest?')}</button><button data-p="gastos">${L('Analiza mis gastos','Analyze my spending')}</button><button data-p="alquiler">${L('Casa en alquiler','Rental house')}</button>
   </div>
   <div class="row"><input id="aiQ" placeholder="${L('O escribe tu pregunta…','Or type your question…')}"><button class="pri" id="aiGo">${L('Preguntar','Ask')}</button></div>
   <details style="margin-top:10px"><summary>${L('Ver exactamente lo que se envía','See exactly what is sent')}</summary><pre id="aiSum"></pre></details>
   <div id="aiOut" class="ai-out" style="margin-top:12px">${S.settings.lastAI?`<p class="muted">${L('Última respuesta','Last answer')} (${dLabel(S.settings.lastAI.date)}): ${esc(S.settings.lastAI.q)}</p>${md(S.settings.lastAI.text)}`:''}</div>
   <p class="muted" style="margin-top:14px">${L('Claude da información, no asesoramiento financiero profesional.','Claude provides information, not professional financial advice.')}</p></div>`;
  $('#aiSum').textContent=JSON.stringify(buildSummary(),null,2);
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>askClaude(PROMPTS[b.dataset.p],b.textContent));
  $('#aiGo').onclick=()=>{const q=$('#aiQ').value.trim(); if(q) askClaude(q,q);};
  $('#aiQ').onkeydown=e=>{if(e.key==='Enter')$('#aiGo').click();};
};
let aiCtl=null;
async function askClaude(q,label){
  const out=$('#aiOut'); const sample=await getSample();
  if(!sample){ out.innerHTML=`<div class="alert warn"><span class="ic">!</span><div>${L('Para usar Claude, pega tu clave de API de Anthropic en <a href="#ajustes">Copia y ajustes</a>.','To use Claude, paste your Anthropic API key in <a href="#ajustes">Backup & settings</a>.')}</div></div>`; return; }
  if(aiCtl) aiCtl.abort(); aiCtl=new AbortController();
  const sum=buildSummary();
  const prompt=L(`Eres un analista financiero personal. Respondes en español, claro y directo, con cifras concretas, en formato markdown breve (encabezados ####, viñetas). El usuario vive en California, EE. UU. Aclara al final en una línea que no eres asesor financiero. Si faltan datos para responder bien, dilo y di cuáles.\n\nDATOS (resumen agregado, en USD):\n${JSON.stringify(sum)}\n\nPREGUNTA: ${q}`,`You are a personal financial analyst. Answer in English, clearly and directly, with concrete figures, in short markdown (#### headings, bullets). The user lives in California, USA. The data keys are in Spanish. End with one line clarifying you are not a financial advisor. If data is missing to answer well, say so and say which.\n\nDATA (aggregated summary, in USD):\n${JSON.stringify(sum)}\n\nQUESTION: ${q}`);
  out.innerHTML=`<p class="muted">${L('Pensando…','Thinking…')}</p>`;
  try{
    const r=await sample(prompt,{signal:aiCtl.signal,modelTier:'complex',onText:({text})=>{ out.innerHTML=md(text); }});
    out.innerHTML=md(r.text); S.settings.lastAI={date:today(),q:label,text:r.text}; save();
  }catch(e){ if(e.name==='AbortError')return; out.innerHTML=`<div class="alert warn"><span class="ic">!</span><div>${e.code==='not_granted'?L('No diste permiso para usar Claude.','You didn\'t allow using Claude.'):e.code==='rate_limited'?L('Demasiadas peticiones; prueba en un rato.','Too many requests; try again in a while.'):esc(e.message||'Error')}</div></div>`; }
}
function md(t){
  const lines=esc(t||'').split('\n'); let h='', inList=false;
  const inl=s=>s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/`(.+?)`/g,'<code>$1</code>');
  for(let l of lines){ if(/^\s*[-*•]\s+/.test(l)){ if(!inList){h+='<ul>';inList=true;} h+='<li>'+inl(l.replace(/^\s*[-*•]\s+/,''))+'</li>'; continue; } if(/^\s*\d+[.)]\s+/.test(l)){ if(!inList){h+='<ul>';inList=true;} h+='<li>'+inl(l.replace(/^\s*/,''))+'</li>'; continue; } if(inList){h+='</ul>';inList=false;}
    if(/^#{1,6}\s/.test(l)) h+='<h4>'+inl(l.replace(/^#+\s*/,''))+'</h4>'; else if(l.trim()) h+='<p>'+inl(l)+'</p>'; }
  if(inList) h+='</ul>'; return h;
}

/* ============================================================
   Impuestos (federal + California) — estimación, no asesoría
   ============================================================ */
const TAXC={
  2025:{MFJ:{std:31500,br:[[23850,.10],[96950,.12],[206700,.22],[394600,.24],[501050,.32],[751600,.35],[Infinity,.37]],ltcg:[96700,600050],saltCap:40000,saltPhase:500000,ctcPhase:400000,niit:250000,charityNI:0},
         S:{std:15750,br:[[11925,.10],[48475,.12],[103350,.22],[197300,.24],[250525,.32],[626350,.35],[Infinity,.37]],ltcg:[48350,533400],saltCap:40000,saltPhase:500000,ctcPhase:200000,niit:200000,charityNI:0},ctc:2200},
  2026:{MFJ:{std:32200,br:[[24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]],ltcg:[98900,613700],saltCap:40400,saltPhase:505000,ctcPhase:400000,niit:250000,charityNI:2000},
         S:{std:16100,br:[[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]],ltcg:[49450,545500],saltCap:40400,saltPhase:505000,ctcPhase:200000,niit:200000,charityNI:1000},ctc:2200},
};
const CA_STD={2025:{MFJ:11080,S:5540},2026:{MFJ:11080,S:5540}};
let taxSel={year:null};
function taxYear(y){ S.tax=S.tax||{}; if(!S.tax[y]) S.tax[y]={filing:'MFJ',kids:0,docs:[],charity:0,estFed:0,estCA:0,otherIncome:0,rental:{}}; return S.tax[y]; }
function defaultTaxYear(){ const d=new Date(); return d.getMonth()<4?d.getFullYear()-1:d.getFullYear(); }
function bracketTax(income,br){ let t=0,prev=0; for(const [top,r] of br){ if(income<=prev) break; t+=(Math.min(income,top)-prev)*r; prev=top; } return t; }
function sumDocs(ty,type,field,filter){ return ty.docs.filter(d=>(Array.isArray(type)?type.includes(d.type):d.type===type)&&(!filter||filter(d))).reduce((s,d)=>s+(d.fields[field]||0),0); }
function mortgageFor(doc){ return doc.acc?acc(doc.acc):null; }
function isRentalMortgage(m){ return m&&m.propertyId&&acc(m.propertyId)&&acc(m.propertyId).rental; }
function rentalSchedule(p,year,ty){
  const inYear=t=>t.date.startsWith(String(year));
  const rentTx=S.tx.filter(t=>inYear(t)&&t.cat==='Renta alquiler').reduce((s,t)=>s+t.amount,0);
  const hoaTx=S.tx.filter(t=>inYear(t)&&t.cat==='HOA alquiler').reduce((s,t)=>s-t.amount,0);
  const repTx=S.tx.filter(t=>inYear(t)&&t.cat==='Gastos alquiler').reduce((s,t)=>s-t.amount,0);
  const mort=S.accounts.find(a=>a.kind==='mortgage'&&a.propertyId===p.id);
  const d1098=ty.docs.filter(d=>d.type==='1098'&&mort&&d.acc===mort.id);
  let mInt=d1098.reduce((s,d)=>s+(d.fields.interest||0),0), mIntEst=false;
  if(!d1098.length&&mort){ const b=balanceOf(mort)||0; mInt=b*(mort.rate||0)/100; mIntEst=true; }
  const ptDocs=ty.docs.filter(d=>d.type==='PROPTAX'&&d.acc===p.id); let ptax=ptDocs.reduce((s,d)=>s+(d.fields.amount||0),0), ptEst=false; if(!ptDocs.length){ ptax=p.taxYear||0; ptEst=true; }
  const ov=(ty.rental&&ty.rental[p.id])||{};
  const mCount=new Set(S.tx.filter(t=>inYear(t)&&t.cat==='Renta alquiler').map(t=>ym(t.date))).size; const full=mCount>=11;
  const rent=ov.rent!=null?ov.rent:(full?rentTx:((p.rent||0)*12||rentTx)); const rentEst=ov.rent==null&&!full;
  const hoaM=new Set(S.tx.filter(t=>inYear(t)&&t.cat==='HOA alquiler').map(t=>ym(t.date))).size;
  const hoa=ov.hoa!=null?ov.hoa:(hoaM>=11?hoaTx:((p.hoa||0)*12||hoaTx));
  const ins=ov.ins!=null?ov.ins:(p.insYear||0);
  const repairs=ov.repairs!=null?ov.repairs:repTx;
  const other=ov.other||0;
  const dep=(p.buildingBasis&&p.inService&&+p.inService<=year)?p.buildingBasis/27.5:0;
  const exp={mortgageInterest:mInt,propertyTax:ptax,insurance:ins,hoa,repairs,other,depreciation:dep};
  const totalExp=Object.values(exp).reduce((a,b)=>a+b,0);
  return {p,rent,rentEst,mCount,hasMort:!!mort,exp,totalExp,net:rent-totalExp,mIntEst,ptEst,depMissing:!dep};
}
function computeTaxes(year,adj={}){
  const ty=taxYear(year); const P=(ty.profile||{}); const hasW2=ty.docs.some(d=>d.type==='W2'); const Lm=(typeof LIM!=='undefined'&&(LIM[year]||LIM[2026]))||null; const fs=ty.filing==='S'?'S':'MFJ'; const C=(TAXC[year]||TAXC[2026])[fs]; const ctcAmt=(TAXC[year]||TAXC[2026]).ctc;
  const wages=(hasW2?sumDocs(ty,'W2','wages'):(P.estWages||0))-(adj.k401||0), fedWH=(hasW2?sumDocs(ty,['W2','1099R'],'fedWH'):(P.estFedWH||0)+sumDocs(ty,'1099R','fedWH')), stateWH=hasW2?sumDocs(ty,'W2','stateWH'):(P.estStateWH||0), sdi=hasW2?sumDocs(ty,'W2','sdi'):(P.estSDI||0), k401=(hasW2?sumDocs(ty,'W2','k401'):(P.k401||0))+(adj.k401||0);
  const interest=sumDocs(ty,['1099INT','C1099'],'interest');
  const ordDiv=sumDocs(ty,['1099DIV','C1099'],'ordinaryDiv'), qualDiv=sumDocs(ty,['1099DIV','C1099'],'qualifiedDiv'), cgd=sumDocs(ty,['1099DIV','C1099'],'capGainDist'), foreignTax=sumDocs(ty,['1099DIV','C1099'],'foreignTax');
  const st=sumDocs(ty,['1099B','C1099'],'stGain'), lt=sumDocs(ty,['1099B','C1099'],'ltGain');
  const retTaxable=sumDocs(ty,'1099R','taxable'), misc=sumDocs(ty,'1099MISC','amount')+(ty.otherIncome||0);
  let capNet=st+lt+cgd; const capDeduct=Math.max(capNet,fs==='S'?-3000:-3000);
  const rentals=S.accounts.filter(a=>a.kind==='property'&&a.rental).map(p=>rentalSchedule(p,year,ty));
  const rentalNetRaw=rentals.reduce((s,r)=>s+r.net,0);
  const preAGI=wages+interest+ordDiv+capDeduct+retTaxable+misc;
  // passive loss allowance (active participation): $25k, phased out 100k–150k MAGI
  let rentalAllowed=rentalNetRaw;
  if(rentalNetRaw<0){ const magi=preAGI; const allow=Math.max(0,25000-Math.max(0,magi-100000)*0.5); rentalAllowed=-Math.min(-rentalNetRaw,allow); }
  let iraDed=0; if(Lm){ const spouseNoPlan=P.spouseCovered===false||P.spouseWorks===false; const fy=P.covered===false&&spouseNoPlan?1:phaseFrac(preAGI,Lm.iraCov); const fs2=P.covered===false&&spouseNoPlan?1:phaseFrac(preAGI,spouseNoPlan?Lm.iraSpouse:Lm.iraCov); iraDed=(P.iraYou||0)*fy+(P.iraSpouse||0)*fs2; }
  iraDed+=(adj.ira||0); const hsaDed=(P.hdhp?(P.hsa||0):0)+(adj.hsa||0);
  const agi=preAGI+rentalAllowed-iraDed-hsaDed;
  // itemized — home mortgage
  const homeDocs=ty.docs.filter(d=>d.type==='1098'&&!isRentalMortgage(mortgageFor(d)));
  let homeInt=0, homeIntFed=0, homeIntCA=0; const mortRows=[];
  homeDocs.forEach(d=>{ const m=mortgageFor(d); const start=d.fields.principalStart||0; const endSnap=m?(lastSnap(m.id,`${year}-12-31`)||{}).value:null; const end=endSnap!=null?endSnap:start; const avg=start&&end?(start+end)/2:(start||end||0);
    const fedLim=(m&&m.pre2017)?1000000:750000; const fF=avg>fedLim?fedLim/avg:1, fC=avg>1000000?1000000/avg:1; const i=d.fields.interest||0;
    homeInt+=i; homeIntFed+=i*fF; homeIntCA+=i*fC; mortRows.push({payer:d.payer,i,avg,fF,fC}); });
  let homePT=ty.docs.filter(d=>d.type==='PROPTAX'&&!(d.acc&&acc(d.acc)&&acc(d.acc).rental)).reduce((s,d)=>s+(d.fields.amount||0),0)+ty.docs.filter(d=>d.type==='1098'&&!isRentalMortgage(mortgageFor(d))&&!ty.docs.some(x=>x.type==='PROPTAX')).reduce((s,d)=>s+(d.fields.propertyTax||0),0); if(!homePT&&P.homePropTax) homePT=P.homePropTax; homePT+=(adj.propTax||0);
  const saltCap=Math.max(10000, C.saltCap-Math.max(0,agi-C.saltPhase)*0.3);
  const saltRaw=stateWH+sdi+homePT+(ty.estCA||0); const salt=Math.min(saltRaw,saltCap);
  const charity=(ty.charity||0)+sumDocs(ty,'CHARITY','amount')+(adj.charity||0);
  const charityItem=Math.max(0,charity-(year>=2026?agi*0.005:0));
  const itemized=homeIntFed+salt+charityItem;
  const useItem=itemized>C.std;
  const deduction=useItem?itemized:C.std+Math.min(charity,C.charityNI);
  const taxable=Math.max(0,agi-deduction);
  const pref=Math.max(0,Math.min(qualDiv+Math.max(0,Math.min(lt+cgd,capNet)),taxable));
  const ordinary=taxable-pref;
  let tax=bracketTax(ordinary,C.br);
  // preferential stacking
  const [z,f]=C.ltcg; let rem=pref, base=ordinary; const at0=Math.max(0,Math.min(rem,z-base)); rem-=at0; base+=at0; const at15=Math.max(0,Math.min(rem,f-base)); rem-=at15; tax+=at15*0.15+rem*0.20;
  const nii=Math.max(0,interest+ordDiv+Math.max(0,capNet)+Math.max(0,rentalAllowed));
  const niit=Math.max(0,Math.min(nii,agi-C.niit))*0.038;
  const KS=(P.children&&P.children.length&&typeof kidsSplit==='function')?kidsSplit(year):{u17:ty.kids||0,o17:0,u13:0};
  const ctcFull=KS.u17*ctcAmt+KS.o17*500; const ctc=Math.max(0,ctcFull-Math.ceil(Math.max(0,agi-C.ctcPhase)/1000)*50);
  const cdcc=(P.spouseWorks===true&&KS.u13>0&&P.childcare>0)?Math.min(P.childcare,KS.u13>=2?6000:3000)*0.2:0;
  const ftc=Math.min(foreignTax,600);
  const totalTax=Math.max(0,tax-ctc-ftc-cdcc)+niit;
  const paid=fedWH+(ty.estFed||0);
  // California itemized vs standard (deduction comparison only)
  const caStd=(CA_STD[year]||CA_STD[2026])[fs];
  const caItem=homeIntCA+homePT+charity; // CA doesn't allow state income tax; SALT cap n/a
  const marginal=(C.br.find(([top])=>ordinary<=top)||[0,.37])[1];
  return {year,fs,C,iraDed,hsaDed,cdcc,hasW2,KS,wages,fedWH,stateWH,sdi,k401,interest,ordDiv,qualDiv,cgd,st,lt,capNet,capDeduct,retTaxable,misc,rentals,rentalNetRaw,rentalAllowed,agi,homeInt,homeIntFed,homeIntCA,mortRows,homePT,saltRaw,salt,saltCap,charity,itemized,useItem,deduction,taxable,pref,ordinary,tax,niit,ctc,ftc,totalTax,paid,balance:paid-totalTax,caStd,caItem,marginal};
}
function expectedDocs(year){
  const ty=taxYear(year); const has=(types,accId)=>ty.docs.some(d=>types.includes(d.type)&&(!accId||d.acc===accId));
  const LS=[];
  LS.push({k:L('W-2 de tu empleador (y de tu cónyuge si trabajó)','W-2 from your employer (and your spouse\'s if they worked)'),ok:has(['W2']),hint:L('Llega a finales de enero','Arrives by the end of January')});
  S.accounts.forEach(a=>{
    if(a.kind==='mortgage') LS.push({k:`1098 · ${a.name}`,ok:has(['1098'],a.id),hint:L('Intereses de hipoteca, llega en enero','Mortgage interest, arrives in January')});
    if(a.kind==='cash') LS.push({k:`1099-INT · ${a.name}`,ok:has(['1099INT','C1099'],a.id),hint:L('Solo si ganó más de $10 de intereses','Only if it earned more than $10 in interest'),opt:true});
    if(a.kind==='brokerage') LS.push({k:`${L('1099 consolidado','Consolidated 1099')} · ${a.name}`,ok:has(['C1099','1099DIV','1099B','1099INT'],a.id),hint:L('Dividendos y ventas; suele llegar a mediados de febrero','Dividends and sales; usually arrives mid-February')});
    if(a.kind==='kids') LS.push({k:`1099 · ${a.name}`,ok:has(['C1099','1099DIV','1099B'],a.id),hint:L('Si es una cuenta a nombre de los niños (UTMA/UGMA), va en su declaración, no en la tuya','If it is an account in the kids\' name (UTMA/UGMA), it goes on their return, not yours'),opt:true});
    if(a.kind==='retirement') LS.push({k:`5498 / 1099-R · ${a.name}`,ok:has(['5498','1099R'],a.id),hint:L('Solo si aportaste a una IRA o retiraste dinero','Only if you contributed to an IRA or withdrew money'),opt:true});
    if(a.kind==='property') LS.push({k:`${L('Impuesto de propiedad','Property tax')} · ${a.name}`,ok:has(['PROPTAX'],a.id),hint:L('Recibos del condado (pagos de diciembre y abril)','County bills (December and April installments)')});
  });
  if(!S.accounts.some(a=>a.kind==='property'&&!a.rental)) LS.push({k:L('Impuesto de propiedad · casa familiar','Property tax · family home'),ok:ty.docs.some(d=>d.type==='PROPTAX'&&!d.acc),hint:L('Añade la casa familiar como inmueble en Cuentas, o guarda el recibo sin cuenta','Add the family home as a property in Accounts, or save the bill without an account'),opt:false});
  LS.push({k:L('Recibos de donativos','Donation receipts'),ok:has(['CHARITY'])||ty.charity>0,hint:L('Iglesia, ONG, colegio…','Church, nonprofit, school…'),opt:true});
  LS.push({k:L('Gastos de guardería o preescolar (Dependent Care FSA / crédito)','Daycare or preschool costs (Dependent Care FSA / credit)'),ok:!!ty.childcareNoted,hint:L('Pide al centro su EIN y el total pagado','Ask the provider for its EIN and the total paid'),opt:true,key:'childcareNoted'});
  return LS;
}
function taxResumen(el){
  const year=taxSel.year; const ty=taxYear(year); const R=computeTaxes(year);
  const exp=expectedDocs(year); const done=exp.filter(e=>e.ok).length;
  const fl=(type,k)=>((FORM_FIELDS[type]||FORM_FIELDS.OTHER).find(x=>x[0]===k)||[k,k])[1];
  const docsHTML=ty.docs.length?`<div class="tbl"><table><thead><tr><th>${L('Documento','Document')}</th><th>${L('Emisor','Payer')}</th><th>${L('Cifras','Figures')}</th><th></th></tr></thead><tbody>${ty.docs.map(d=>`<tr><td>${esc(FORM_LABEL[d.type]||d.type)}<div class="muted">${esc(d.acc?accName(d.acc):'')}</div></td><td>${esc(d.payer||'')}</td><td class="muted">${Object.entries(d.fields).map(([k,v])=>`${esc(fl(d.type,k).split(':').pop().trim())}: ${fmt(v)}`).join(' · ')}</td><td class="n" style="white-space:nowrap"><button class="sm" data-ed="${d.id}">${L('Editar','Edit')}</button> <button class="sm dan" data-dd="${d.id}">✕</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${L('Aún no hay documentos. Importa los PDFs (W-2, 1098, 1099…) en "Importar" o añádelos a mano.','No documents yet. Import the PDFs (W-2, 1098, 1099…) in "Import" or add them by hand.')}</div>`;
  const line=(k,v,cls='',note='')=>`<tr><td>${k}${note?`<div class="muted">${note}</div>`:''}</td><td class="n ${cls}">${v}</td></tr>`;
  const hasKids=ty.profile&&ty.profile.children&&ty.profile.children.length;
  el.innerHTML=`
  <div class="grid g4">
    <div class="card stat">${helpBtn('tax_agi')}<div class="lbl">${L('Ingreso bruto ajustado (AGI)','Adjusted gross income (AGI)')}</div><div class="val">${fmt(R.agi)}</div><div class="note">${L('Con los documentos registrados','With the documents recorded')}</div></div>
    <div class="card stat"><div class="lbl">${L('Deducción federal','Federal deduction')}</div><div class="val">${fmt(R.deduction)}</div><div class="note">${R.useItem?L('Detallada (itemized)','Itemized'):L('Estándar','Standard')} · ${L('la otra opción','the other option')}: ${fmt(R.useItem?R.C.std:R.itemized)}</div></div>
    <div class="card stat"><div class="lbl">${L('Impuesto federal estimado','Estimated federal tax')}</div><div class="val">${fmt(R.totalTax)}</div><div class="note">${L('Tramo marginal','Marginal bracket')} ${Math.round(R.marginal*100)}%</div></div>
    <div class="card stat"><div class="lbl">${R.balance>=0?L('Devolución estimada','Estimated refund'):L('A pagar estimado','Estimated amount due')}</div><div class="val ${R.balance>=0?'pos':'neg'}">${fmt(Math.abs(R.balance))}</div><div class="note">${L('Retenido','Withheld')} ${fmtK(R.paid)}</div></div>
  </div>
  <div class="grid g2" style="margin-top:12px">
   <div class="card">${helpBtn('tax_docs')}<h2>${L('Documentos que necesitas','Documents you need')}</h2><p class="sub">${L(`${done} de ${exp.length} · se marcan solos al importarlos`,`${done} of ${exp.length} · they tick themselves off when imported`)}</p>
     ${exp.map((e,i)=>`<div class="alert ${e.ok?'good':e.opt?'info':'warn'}" style="margin-bottom:6px"><span class="ic">${e.ok?'✓':e.opt?'i':'!'}</span><div><b>${esc(e.k)}</b><div class="muted">${esc(e.hint)}</div>${e.key?`<label style="font-size:13px;display:flex;gap:6px;align-items:center;margin-top:4px"><input type="checkbox" style="width:auto" data-flag="${e.key}" ${ty[e.key]?'checked':''}> ${L('Ya lo tengo','I have it')}</label>`:''}</div></div>`).join('')}
   </div>
   <div class="card">${helpBtn('tax_year')}<h2>${L('Tus datos del año','Your data for the year')}</h2>
     <div class="row"><label class="f">${L('Forma de declarar','Filing status')}<select id="tyF"><option value="MFJ" ${ty.filing!=='S'?'selected':''}>${L('Casados, conjunta (MFJ)','Married filing jointly (MFJ)')}</option><option value="S" ${ty.filing==='S'?'selected':''}>${L('Individual','Single')}</option></select></label><label class="f">${L('Hijos menores de 17 a 31/12','Children under 17 on 12/31')}<input id="tyK" inputmode="numeric" value="${hasKids?kidsSplit(year).u17:(ty.kids||0)}" ${hasKids?`disabled title="${L('Se calcula con los hijos de Familia y situación','Calculated from the children in Family & situation')}"`:''}></label></div>
     <div class="row"><label class="f">${L('Donativos (si no los subes como documento)','Donations (if you don\'t upload them as a document)')}<input id="tyC" inputmode="decimal" value="${ty.charity||''}"></label><label class="f">${L('Otros ingresos','Other income')}<input id="tyO" inputmode="decimal" value="${ty.otherIncome||''}"></label></div>
     <div class="row"><label class="f">${L('Pagos estimados federales','Federal estimated payments')}<input id="tyEF" inputmode="decimal" value="${ty.estFed||''}"></label><label class="f">${L('Pagos estimados California','California estimated payments')}<input id="tyEC" inputmode="decimal" value="${ty.estCA||''}"></label></div>
     <div class="row"><button id="tySave">${L('Guardar','Save')}</button><button id="tyAdd">${L('+ Documento a mano','+ Document by hand')}</button></div></div>
  </div>
  <h3 class="sec">${L('Documentos registrados','Recorded documents')}</h3><div class="card">${docsHTML}</div>
  <div class="grid g2" style="margin-top:12px">
   <div class="card">${helpBtn('tax_fed')}<h2>${L('Cálculo federal','Federal calculation')}</h2><div class="tbl"><table><tbody>
     ${line(R.hasW2?L('Salarios (W-2 casilla 1)','Wages (W-2 box 1)'):L('Salario estimado (sin W-2 aún)','Estimated wages (no W-2 yet)'),fmt(R.wages),'',R.k401?L(`Ya descontados ${fmt(R.k401)} de 401(k) pre-tax`,`${fmt(R.k401)} of pre-tax 401(k) already excluded`):'')}
     ${line(L('Intereses','Interest'),fmt(R.interest))}${line(L('Dividendos','Dividends'),fmt(R.ordDiv),'',R.qualDiv?L(`${fmt(R.qualDiv)} cualificados (tributan al 0/15/20%)`,`${fmt(R.qualDiv)} qualified (taxed at 0/15/20%)`):'')}
     ${R.capNet||R.st||R.lt?line(L('Ganancias/pérdidas de capital','Capital gains/losses'),fmt(R.capDeduct),'',R.capNet<-3000?L(`Pérdida total ${fmt(R.capNet)}: deduces $3,000 y el resto pasa al año siguiente`,`Total loss ${fmt(R.capNet)}: you deduct $3,000 and the rest carries over to next year`):''):''}
     ${R.retTaxable?line(L('Jubilación tributable (1099-R)','Taxable retirement (1099-R)'),fmt(R.retTaxable)):''}${R.misc?line(L('Otros ingresos','Other income'),fmt(R.misc)):''}
     ${R.rentals.length?line(L('Casa en alquiler (Schedule E)','Rental property (Schedule E)'),fmt(R.rentalAllowed),'',R.rentalNetRaw<0&&R.rentalAllowed>R.rentalNetRaw?L(`Pérdida de ${fmt(R.rentalNetRaw)}; con tus ingresos solo deduces ${fmt(R.rentalAllowed)}. El resto queda en suspenso para años futuros o la venta`,`Loss of ${fmt(R.rentalNetRaw)}; with your income you can only deduct ${fmt(R.rentalAllowed)}. The rest is suspended for future years or the sale`):''):''}
     ${R.iraDed?line(L('Aportaciones a IRA deducibles','Deductible IRA contributions'),'-'+fmt(R.iraDed)):''}${R.hsaDed?line(L('Aportaciones a HSA','HSA contributions'),'-'+fmt(R.hsaDed)):''}${line('<b>AGI</b>',`<b>${fmt(R.agi)}</b>`)}
     ${line(R.useItem?L('Deducción detallada','Itemized deduction'):L('Deducción estándar','Standard deduction'),'-'+fmt(R.deduction))}
     ${line(`<b>${L('Base imponible','Taxable income')}</b>`,`<b>${fmt(R.taxable)}</b>`)}
     ${line(L('Impuesto','Tax'),fmt(R.tax))}${R.niit?line(L('Impuesto sobre rentas de inversión (NIIT 3.8%)','Net investment income tax (NIIT 3.8%)'),fmt(R.niit)):''}
     ${R.ctc?line(`${L('Crédito por hijos','Child tax credit')} (${R.KS.u17} × $2,200${R.KS.o17?` + ${R.KS.o17} × $500`:''})`,'-'+fmt(R.ctc)):''}${R.cdcc?line(L('Crédito por guardería (aprox.)','Child care credit (approx.)'),'-'+fmt(R.cdcc)):''}${R.ftc?line(L('Crédito por impuesto extranjero','Foreign tax credit'),'-'+fmt(R.ftc)):''}
     ${line(`<b>${L('Impuesto total','Total tax')}</b>`,`<b>${fmt(R.totalTax)}</b>`)}${line(L('Ya pagado (retenciones + estimados)','Already paid (withholding + estimates)'),fmt(R.paid))}
     ${line(`<b>${R.balance>=0?L('Devolución','Refund'):L('A pagar','Amount due')}</b>`,`<b>${fmt(Math.abs(R.balance))}</b>`,R.balance>=0?'pos':'neg')}
   </tbody></table></div></div>
   <div class="card">${helpBtn('tax_item')}<h2>${L('¿Estándar o detallada?','Standard or itemized?')}</h2><p class="sub">${L('Federal: la estándar es','Federal: the standard deduction is')} ${fmt(R.C.std)}</p><div class="tbl"><table><tbody>
     ${line(L('Intereses hipoteca casa','Home mortgage interest'),fmt(R.homeIntFed),'',R.mortRows.filter(m=>m.fF<1).map(m=>L(`Préstamo medio ${fmtK(m.avg)} > límite $750k: deduces el ${Math.round(m.fF*100)}% de ${fmt(m.i)}`,`Average loan ${fmtK(m.avg)} > $750k limit: you deduct ${Math.round(m.fF*100)}% of ${fmt(m.i)}`)).join('<br>'))}
     ${line(L('Impuestos estatales y locales (SALT)','State and local taxes (SALT)'),fmt(R.salt),'',`${L('Retención CA','CA withholding')} ${fmtK(R.stateWH)} + SDI ${fmtK(R.sdi)} + ${L('propiedad','property')} ${fmtK(R.homePT)}${R.saltRaw>R.salt?` · ${L('limitado a','capped at')} ${fmt(R.saltCap)}`:''}`)}
     ${line(L('Donativos','Donations'),fmt(Math.max(0,R.charity-(year>=2026?R.agi*0.005:0))),'',R.charity&&year>=2026?L('Desde 2026 solo cuenta lo que supera el 0.5% del AGI','From 2026 only the amount above 0.5% of AGI counts'):'')}
     ${line(`<b>${L('Total detallada','Total itemized')}</b>`,`<b>${fmt(R.itemized)}</b>`,R.useItem?'pos':'')}
   </tbody></table></div>
   <h3 class="sec">California</h3><div class="tbl"><table><tbody>
     ${line(L('Intereses hipoteca (límite $1M en CA)','Mortgage interest ($1M limit in CA)'),fmt(R.homeIntCA))}${line(L('Impuesto de propiedad','Property tax'),fmt(R.homePT))}${line(L('Donativos','Donations'),fmt(R.charity))}
     ${line(`<b>${L('Detallada CA','CA itemized')}</b>`,`<b>${fmt(R.caItem)}</b>`,'',`${L('Estándar CA aprox.','CA standard approx.')} ${fmt(R.caStd)}: ${R.caItem>R.caStd?L('te conviene detallar','itemizing is better for you'):L('te conviene la estándar','the standard deduction is better for you')}`)}
   </tbody></table></div><p class="muted">${L('En California puedes detallar aunque en la federal tomes la estándar.','In California you can itemize even if you take the standard deduction on your federal return.')}</p></div>
  </div>
  ${R.rentals.map(r=>`<div class="card" style="margin-top:12px">${helpBtn('tax_sche')}<div class="row" style="align-items:flex-start"><div><h2>Schedule E · ${esc(r.p.name)}</h2><p class="sub">${L(`Ingresos y gastos de la casa alquilada en ${year}`,`Income and expenses of the rental in ${year}`)}</p></div><button class="sm" data-rov="${r.p.id}">${L('Ajustar cifras','Adjust figures')}</button></div><div class="tbl"><table><tbody>
    ${line(L('Rentas cobradas','Rents received'),fmt(r.rent),'',r.rentEst?(r.mCount?L(`Estimado con la renta configurada × 12 (solo hay ${r.mCount} meses de movimientos)`,`Estimated as configured rent × 12 (only ${r.mCount} months of transactions)`):L('Estimado con la renta configurada × 12; importa los movimientos para el dato real','Estimated as configured rent × 12; import transactions for the actual figure')):'')}
    ${line(L('Intereses hipoteca','Mortgage interest'),`-${fmt(r.exp.mortgageInterest)}`,'',r.mIntEst?L('Estimado: sube el 1098 de esta hipoteca','Estimated: upload the 1098 for this mortgage'):(!r.hasMort?L('Si tiene hipoteca, añádela en Cuentas y vincúlala a esta casa','If it has a mortgage, add it in Accounts and link it to this house'):''))}
    ${line(L('Impuesto de propiedad','Property tax'),`-${fmt(r.exp.propertyTax)}`,'',r.ptEst?L('Estimado con la cifra anual configurada','Estimated from the configured annual figure'):'')}
    ${line(L('Seguro','Insurance'),`-${fmt(r.exp.insurance)}`)}${line('HOA',`-${fmt(r.exp.hoa)}`)}${line(L('Reparaciones y mantenimiento','Repairs and maintenance'),`-${fmt(r.exp.repairs)}`)}${r.exp.other?line(L('Otros','Other'),`-${fmt(r.exp.other)}`):''}
    ${line(L('Amortización (depreciation)','Depreciation'),`-${fmt(r.exp.depreciation)}`,'',r.depMissing?`<span class="neg">${L('Falta: añade el valor de la construcción (sin terreno) y el año en que empezaste a alquilar, en Cuentas → Editar la casa','Missing: add the building value (without land) and the year you started renting, in Accounts → Edit the house')}</span>`:L('Valor de la construcción ÷ 27.5 años','Building value ÷ 27.5 years'))}
    ${line(`<b>${L('Resultado neto','Net result')}</b>`,`<b>${fmt(r.net)}</b>`,r.net>=0?'':'neg')}
  </tbody></table></div></div>`).join('')}
  <div class="card" style="margin-top:12px">${helpBtn('tax_prep')}<h2>${L('Preparar la declaración','Prepare the return')}</h2><p class="sub">${L('Pide a Claude una revisión o copia el resumen para tu preparador o para TurboTax.','Ask Claude for a review or copy the summary for your preparer or for TurboTax.')}</p>
    <div class="row"><button id="tyAI" class="pri">${L('Revisar mis impuestos con Claude','Review my taxes with Claude')}</button><button id="tyExp">${L('Resumen para el preparador','Summary for the preparer')}</button></div>
    <div id="tyOut" class="ai-out" style="margin-top:12px"></div></div>`;
  $('#tySave').onclick=()=>{ ty.filing=$('#tyF').value; ty.kids=parseInt($('#tyK').value)||0; ty.charity=num($('#tyC').value)||0; ty.otherIncome=num($('#tyO').value)||0; ty.estFed=num($('#tyEF').value)||0; ty.estCA=num($('#tyEC').value)||0; save(); toast(L('Guardado','Saved')); route(); };
  el.querySelectorAll('[data-flag]').forEach(c=>c.onchange=()=>{ ty[c.dataset.flag]=c.checked; save(); route(); });
  el.querySelectorAll('[data-dd]').forEach(b=>b.onclick=()=>{ ty.docs=ty.docs.filter(d=>d.id!==b.dataset.dd); save(); route(); });
  el.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>editTaxDoc(year,b.dataset.ed));
  $('#tyAdd').onclick=()=>editTaxDoc(year,null);
  el.querySelectorAll('[data-rov]').forEach(b=>b.onclick=()=>editRentalOverride(year,b.dataset.rov));
  $('#tyExp').onclick=()=>{ const txt=taxSummaryText(year,R); openModal(`<h2>${L('Resumen','Summary')} ${year}</h2><textarea readonly style="min-height:320px;font-size:12px;font-family:monospace">${esc(txt)}</textarea><div class="row" style="margin-top:10px"><button id="mc">${L('Cerrar','Close')}</button><button id="txDl">${L('Descargar','Download')}</button><button class="pri" id="txCp">${L('Copiar','Copy')}</button></div>`); $('#mc').onclick=closeModal; $('#txCp').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast(L('Copiado','Copied'))}catch(e){toast(L('Selecciona el texto y cópialo','Select the text and copy it'))}}; $('#txDl').onclick=async()=>{ if(!await confirmModal(L('Archivo sin cifrar','Unencrypted file'),`<p>${L('Este resumen se descargará como texto normal, <b>sin cifrar</b>: cualquiera con acceso a tu carpeta de descargas podrá leerlo. Bórralo cuando ya no lo necesites.','This summary will be downloaded as plain text, <b>not encrypted</b>: anyone with access to your downloads folder can read it. Delete it when you no longer need it.')}</p>`)) return; if(!downloadFile(`${L('impuestos','taxes')}-${year}.txt`,txt,'text/plain')) toast(L('Usa Copiar','Use Copy')); }; };
  $('#tyAI').onclick=()=>askClaudeTax(year,R);
}
function editTaxDoc(year,id){
  const ty=taxYear(year); const d=id?ty.docs.find(x=>x.id===id):{type:'W2',payer:'',acc:null,fields:{}};
  openModal(`<h2>${id?L('Editar documento','Edit document'):L('Nuevo documento','New document')} · ${year}</h2><div class="row"><label class="f">${L('Tipo','Type')}<select id="dT">${Object.entries(FORM_LABEL).map(([k,v])=>`<option value="${k}" ${k===d.type?'selected':''}>${v}</option>`).join('')}</select></label><label class="f">${L('Emisor','Payer')}<input id="dP" value="${esc(d.payer||'')}"></label></div>
   <label class="f">${L('Cuenta o inmueble relacionado','Related account or property')}<select id="dA"><option value="">—</option>${S.accounts.map(a=>`<option value="${a.id}" ${a.id===d.acc?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
   <div id="dF">${taxFieldInputs(d.type,d.fields)}</div><div class="row" style="margin-top:10px"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="dOk">${L('Guardar','Save')}</button></div>`);
  $('#dT').onchange=e=>$('#dF').innerHTML=taxFieldInputs(e.target.value,{});
  $('#mc').onclick=closeModal;
  $('#dOk').onclick=()=>{ const f={}; $('#dF').querySelectorAll('[data-k]').forEach(i=>{const v=num(i.value); if(!isNaN(v)) f[i.dataset.k]=v;}); const o=id?d:{id:uid(),added:today(),src:'manual'}; o.type=$('#dT').value; o.payer=$('#dP').value.trim(); o.acc=$('#dA').value||null; o.fields=f; if(!id) ty.docs.push(o); save(); closeModal(); route(); };
}
function editRentalOverride(year,pid){
  const ty=taxYear(year); ty.rental=ty.rental||{}; const o=ty.rental[pid]||{}; const p=acc(pid); const r=rentalSchedule(p,year,ty);
  const f=(k,l,v)=>`<label class="f">${l}<input data-k="${k}" inputmode="decimal" placeholder="${Math.round(v)}" value="${o[k]!=null?o[k]:''}"></label>`;
  openModal(`<h2>${L('Ajustar','Adjust')} ${esc(p.name)} · ${year}</h2><p class="muted">${L('Deja en blanco para usar el valor calculado (entre paréntesis gris).','Leave blank to use the calculated value (shown in grey).')}</p><div class="row">${f('rent',L('Rentas cobradas','Rents received'),r.rent)}${f('hoa','HOA',r.exp.hoa)}</div><div class="row">${f('ins',L('Seguro','Insurance'),r.exp.insurance)}${f('repairs',L('Reparaciones','Repairs'),r.exp.repairs)}</div><div class="row">${f('other',L('Otros gastos (gestión, viajes, publicidad…)','Other expenses (management, travel, advertising…)'),r.exp.other)}</div><div class="row"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="rOk">${L('Guardar','Save')}</button></div>`);
  $('#mc').onclick=closeModal; $('#rOk').onclick=()=>{ const n={}; $('#modal').querySelectorAll('[data-k]').forEach(i=>{const v=num(i.value); if(!isNaN(v)) n[i.dataset.k]=v;}); ty.rental[pid]=n; save(); closeModal(); route(); };
}
function taxSummaryText(year,R){
  const ty=taxYear(year); const LS=[]; const m=v=>fmt(v,2);
  const fl=(type,k)=>((FORM_FIELDS[type]||FORM_FIELDS.OTHER).find(x=>x[0]===k)||[k,k])[1];
  LS.push(L(`RESUMEN FISCAL ${year} (estimación, revisar con preparador)`,`TAX SUMMARY ${year} (estimate, review with a preparer)`),`${L('Forma de declarar','Filing status')}: ${ty.filing==='S'?L('Individual','Single'):'Married Filing Jointly'} · ${L('Hijos <17','Children <17')}: ${ty.kids||0}`,'');
  LS.push(L('DOCUMENTOS:','DOCUMENTS:')); ty.docs.forEach(d=>LS.push(`- ${FORM_LABEL[d.type]||d.type} · ${d.payer||''}${d.acc?' ('+accName(d.acc)+')':''}: `+Object.entries(d.fields).map(([k,v])=>`${fl(d.type,k)} ${m(v)}`).join('; ')));
  LS.push('',L('INGRESOS:','INCOME:'),L(`Salarios ${m(R.wages)} · Intereses ${m(R.interest)} · Dividendos ${m(R.ordDiv)} (cualificados ${m(R.qualDiv)}) · Ganancias capital ${m(R.capNet)}`,`Wages ${m(R.wages)} · Interest ${m(R.interest)} · Dividends ${m(R.ordDiv)} (qualified ${m(R.qualDiv)}) · Capital gains ${m(R.capNet)}`));
  R.rentals.forEach(r=>{ LS.push('',`SCHEDULE E · ${r.p.name}:`,`${L('Rentas','Rents')} ${m(r.rent)}${r.rentEst?L(' (estimado)',' (estimated)'):''}`,...[[L('Intereses hipoteca','Mortgage interest'),r.exp.mortgageInterest],[L('Impuesto propiedad','Property tax'),r.exp.propertyTax],[L('Seguro','Insurance'),r.exp.insurance],['HOA',r.exp.hoa],[L('Reparaciones','Repairs'),r.exp.repairs],[L('Otros','Other'),r.exp.other],[L('Amortización','Depreciation'),r.exp.depreciation]].map(([k,v])=>`  ${k}: ${m(v)}`),`${L('Neto','Net')}: ${m(r.net)}`); });
  LS.push('',L('DEDUCCIONES (federal):','DEDUCTIONS (federal):'),L(`Intereses hipoteca casa: ${m(R.homeInt)} pagados, ${m(R.homeIntFed)} deducibles (límite $750k)`,`Home mortgage interest: ${m(R.homeInt)} paid, ${m(R.homeIntFed)} deductible ($750k limit)`),`SALT: ${m(R.saltRaw)} → ${m(R.salt)} (${L('tope','cap')} ${m(R.saltCap)})`,`${L('Donativos','Donations')}: ${m(R.charity)}`,L(`Detallada ${m(R.itemized)} vs estándar ${m(R.C.std)} → ${R.useItem?'DETALLADA':'ESTÁNDAR'}`,`Itemized ${m(R.itemized)} vs standard ${m(R.C.std)} → ${R.useItem?'ITEMIZED':'STANDARD'}`));
  LS.push('',L(`California: hipoteca deducible ${m(R.homeIntCA)} (límite $1M) · detallada CA ${m(R.caItem)} vs estándar aprox. ${m(R.caStd)}`,`California: deductible mortgage interest ${m(R.homeIntCA)} ($1M limit) · CA itemized ${m(R.caItem)} vs standard approx. ${m(R.caStd)}`));
  LS.push('',L('ESTIMACIÓN FEDERAL:','FEDERAL ESTIMATE:'),L(`AGI ${m(R.agi)} · Base imponible ${m(R.taxable)} · Impuesto ${m(R.totalTax)} · Retenido ${m(R.paid)} · ${R.balance>=0?'Devolución':'A pagar'} ${m(Math.abs(R.balance))}`,`AGI ${m(R.agi)} · Taxable income ${m(R.taxable)} · Tax ${m(R.totalTax)} · Withheld ${m(R.paid)} · ${R.balance>=0?'Refund':'Amount due'} ${m(Math.abs(R.balance))}`));
  return LS.join('\n');
}
async function askClaudeTax(year,R,mode='review',outSel='#tyOut'){
  const out=$(mode==='plan'?'#optOut':outSel); const sample=await getSample(); if(!sample){ out.innerHTML=`<p class="muted">${L('Para usar Claude, añade tu clave de API en Copia y ajustes.','To use Claude, add your API key in Backup & settings.')}</p>`; return; }
  const ty=taxYear(year);
  const data={año:year,forma:ty.filing,hijos_menores_17:ty.kids,estado:'California',ingresos:{salarios:R.wages,k401_pretax:R.k401,intereses:R.interest,dividendos:R.ordDiv,cualificados:R.qualDiv,ganancias_capital:R.capNet,jubilacion:R.retTaxable,otros:R.misc},
    alquiler:R.rentals.map(r=>({rentas:Math.round(r.rent),gastos:Object.fromEntries(Object.entries(r.exp).map(([k,v])=>[k,Math.round(v)])),neto:Math.round(r.net),falta_amortizacion:r.depMissing})),
    deducciones:{intereses_hipoteca_pagados:Math.round(R.homeInt),deducibles_fed:Math.round(R.homeIntFed),salt:Math.round(R.saltRaw),salt_permitido:Math.round(R.salt),donativos:R.charity,detallada:Math.round(R.itemized),estandar:R.C.std},
    estimacion:{agi:Math.round(R.agi),base:Math.round(R.taxable),impuesto:Math.round(R.totalTax),pagado:Math.round(R.paid),saldo:Math.round(R.balance)},
    documentos:ty.docs.map(d=>d.type), perfil_familiar:(()=>{const P=prof(year);return {edad_contribuyente:P.age,conyuge_trabaja:P.spouseWorks,ingresos_conyuge:P.spouseIncome,contribuyente_con_401k:P.covered,conyuge_con_plan:P.spouseCovered,hijos_edades_31dic:(P.children||[]).map(c=>c.by?year-c.by:null),hijos_con_ssn:(P.children||[]).map(c=>c.ssn!==false),form4547_presentado:!!P.f4547,seguro_hdhp:P.hdhp,hsa:P.hsa,ofrece_dcfsa:P.dcfsaOffered,gastos_guarderia:P.childcare,ira_tradicional_tu:P.iraYou,ira_tradicional_conyuge:P.iraSpouse,roth:P.roth,aport_529:P.c529,k401:R.k401};})(), cuentas:S.accounts.map(a=>({tipo:KINDS[a.kind].label,saldo:Math.round(balanceOf(a)||0),...(a.kind==='mortgage'?{tipo_interes:a.rate,anterior_dic2017:!!a.pre2017,de_alquiler:isRentalMortgage(a)}:{})})), recomendaciones_ya_calculadas:recommendations(year).map(r=>r.t+(r.save?` (≈$${Math.round(r.save)})`:'')), fecha_hoy:today(), faltan:expectedDocs(year).filter(e=>!e.ok&&!e.opt).map(e=>e.k), contexto:S.settings.context||''};
  const base=`Eres un asistente fiscal experto para un contribuyente de California (EE. UU.). ${L('Responde en español','IMPORTANT: answer in English (the instructions and data keys are in Spanish)')}, en markdown (#### y viñetas), con cifras concretas basadas en los datos. Año fiscal ${year}. Aplica las reglas federales vigentes tras la ley OBBBA y las de California (incluida su no conformidad: límite de $1M en intereses hipotecarios, HSA tributa en CA). Todo lo que recomiendes debe ser legal; no sugieras nada agresivo ni dudoso. Ten en cuenta la fecha de hoy para distinguir lo que aún se puede hacer este año de lo que ya solo afecta a la declaración.`;
  const tasks={review:'Revisa los datos y dime: 1) qué documentos o datos faltan, 2) errores o incoherencias probables, 3) oportunidades que se están dejando pasar, 4) pasos para preparar la declaración.',
    plan:'Diseña el PLAN ÓPTIMO para pagar legalmente lo mínimo: #### Acciones con fecha límite (ordenadas por ahorro estimado en $, federal + CA), #### Decisiones de la declaración (forma de declarar, estándar vs detallada, cómo tratar el alquiler, créditos por hijos, Trump Account), #### Para el año que viene (beneficios del empleador, W-4, estructura de ahorro de los hijos), #### Riesgos o cosas a confirmar con un profesional. Valida o corrige las recomendaciones ya calculadas y añade las que falten.',
    turbotax:'Escribe una GUÍA PASO A PASO para presentar esta declaración en TurboTax Online Premium (federal + California), con las rutas de menú (en inglés, como aparecen en TurboTax) y QUÉ VALOR introducir en cada pantalla según los datos. Incluye las preguntas difíciles que hará TurboTax (alquiler: participación activa, amortización, pérdidas pasivas; hipoteca por encima de $750k; CA SDI; Form 4547) y cómo responderlas. Termina con una checklist de revisión antes de enviar.'};
  const prompt=`${base}\n\nTAREA: ${tasks[mode]||tasks.review}\n\nAl final, una línea indicando que no eres asesor fiscal y que lo revise un profesional.\n\nDATOS (agregados, sin nombres ni números de cuenta):\n${JSON.stringify(data)}`;
  out.innerHTML=`<p class="muted">${L('Pensando…','Thinking…')}</p>`;
  try{ const r=await sample(prompt,{modelTier:'complex',onText:({text})=>{out.innerHTML=md(text);}}); out.innerHTML=md(r.text); }catch(e){ out.innerHTML=`<p class="muted">${esc(e.code==='not_granted'?L('No diste permiso para usar Claude.','You didn\'t allow using Claude.'):e.message||'Error')}</p>`; }
}

/* ============================================================
   Perfil familiar, optimizador y guía TurboTax
   ============================================================ */
const LIM={2025:{k401:23500,ira:7000,hsaFam:8550,hsaSelf:4300,dcfsa:5000,iraCov:[126000,146000],iraSpouse:[236000,246000],roth:[236000,246000]},
           2026:{k401:24500,ira:7500,hsaFam:8750,hsaSelf:4400,dcfsa:7500,iraCov:[129000,149000],iraSpouse:[242000,252000],roth:[242000,252000]}};
const CA_BR={MFJ:[[22158,.01],[52528,.02],[82904,.04],[115084,.06],[145448,.08],[742958,.093],[891542,.103],[1485906,.113],[Infinity,.123]],
             S:[[11079,.01],[26264,.02],[41452,.04],[57542,.06],[72724,.08],[371479,.093],[445771,.103],[742953,.113],[Infinity,.123]]};
function prof(year){ const ty=taxYear(year); ty.profile=ty.profile||{children:[]}; return ty.profile; }
function kidsSplit(year){ const P=prof(year); const ch=(P.children||[]).filter(c=>c.by); return {u17:ch.filter(c=>year-c.by<17&&c.ssn!==false).length, o17:ch.filter(c=>year-c.by>=17).length, u13:ch.filter(c=>year-c.by<13).length, trump:ch.filter(c=>c.by>=2025&&c.by<=2028)}; }
function phaseFrac(magi,[lo,hi]){ return magi<=lo?1:magi>=hi?0:(hi-magi)/(hi-lo); }
function caMarginal(year,fs,taxable){ return (CA_BR[fs]||CA_BR.MFJ).find(([top])=>taxable<=top)[1]; }
const fmtD=(v)=>v>=1?fmt(v):'—';

/* ---------- Perfil ---------- */
function taxPerfil(el){
  const year=taxSel.year; const ty=taxYear(year); const P=prof(year); const LM=LIM[year]||LIM[2026];
  const yn=(id,v,lab)=>`<label class="f">${lab}<select id="${id}"><option value="">${L('No sé','Don\'t know')}</option><option value="1" ${v===true?'selected':''}>${L('Sí','Yes')}</option><option value="0" ${v===false?'selected':''}>No</option></select></label>`;
  const inp=(id,v,lab,ph='')=>`<label class="f">${lab}<input id="${id}" inputmode="decimal" value="${v??''}" placeholder="${ph}"></label>`;
  const hasW2=ty.docs.some(d=>d.type==='W2');
  el.innerHTML=`
  <p class="muted" style="margin-top:0">${L('Todo esto se queda en tu dispositivo. Se usa para calcular créditos, límites y recomendaciones. A Claude solo le llegan edades y cifras, nunca nombres.','All of this stays on your device. It is used to calculate credits, limits and recommendations. Claude only receives ages and figures, never names.')}</p>
  <div class="grid g2">
   <div class="card">${helpBtn('prof_home')}<h2>${L('Hogar','Household')}</h2>
     <div class="row"><label class="f">${L('Forma de declarar','Filing status')}<select id="pF"><option value="MFJ" ${ty.filing!=='S'?'selected':''}>${L('Casados, conjunta (MFJ)','Married filing jointly (MFJ)')}</option><option value="S" ${ty.filing==='S'?'selected':''}>${L('Individual','Single')}</option></select></label>${inp('pAge',P.age,L('Tu edad','Your age'))}</div>
     <div class="row">${yn('pSW',P.spouseWorks,L('¿Tu cónyuge trabajó con sueldo este año?','Did your spouse work for pay this year?'))}${inp('pSI',P.spouseIncome,L('Ingresos del cónyuge','Spouse income'),'0')}</div>
     <div class="row">${yn('pCov',P.covered!==undefined?P.covered:true,L('¿Tienes 401(k) u otro plan en tu trabajo?','Do you have a 401(k) or other plan at work?'))}${yn('pSCov',P.spouseCovered!==undefined?P.spouseCovered:false,L('¿Tu cónyuge tiene plan de jubilación en su trabajo?','Does your spouse have a retirement plan at work?'))}</div>
   </div>
   <div class="card">${helpBtn('prof_kids')}<h2>${L('Hijos','Children')}</h2><p class="sub">${L('Año de nacimiento de cada uno. Determina el crédito por hijos, la guardería y la Trump Account.','Birth year of each child. It determines the child tax credit, child care and the Trump Account.')}</p>
     <div id="kidRows">${(P.children||[]).map((c,i)=>kidRow(c,i)).join('')}</div>
     <button class="sm" id="addKid">${L('+ Añadir hijo','+ Add child')}</button>
     <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="p4547" style="width:auto" ${P.f4547?'checked':''}> ${L('Ya presenté el Form 4547 (Trump Account) para los hijos nacidos en 2025–2028','I already filed Form 4547 (Trump Account) for children born in 2025–2028')}</label>
   </div>
  </div>
  <div class="grid g2" style="margin-top:12px">
   <div class="card">${helpBtn('prof_pay')}<h2>${L('Sueldo de','Pay for')} ${year}</h2><p class="sub">${hasW2?L('Ya tienes el W-2 registrado; estos campos solo se usan si no lo hay.','You already have the W-2 recorded; these fields are only used without one.'):L('Hasta que llegue el W-2, usa tus nóminas para estimar el año completo.','Until the W-2 arrives, use your pay stubs to estimate the full year.')}</p>
     <div class="row">${inp('pW',P.estWages,L('Salario bruto anual (ya sin 401(k) pre-tax)','Annual gross wages (after pre-tax 401(k))'))}${inp('pK',P.k401,L(`401(k) pre-tax del año (máx. ${fmt(LM.k401)})`,`Pre-tax 401(k) for the year (max ${fmt(LM.k401)})`))}</div>
     <div class="row">${inp('pFW',P.estFedWH,L('Retención federal del año','Federal withholding for the year'))}${inp('pSW2',P.estStateWH,L('Retención California del año','California withholding for the year'))}</div>
     ${inp('pSDI',P.estSDI,L('CA SDI del año (≈1.3% del salario)','CA SDI for the year (≈1.3% of wages)'))}
   </div>
   <div class="card">${helpBtn('prof_save')}<h2>${L('Salud, guardería y ahorro','Health, child care and savings')}</h2>
     <div class="row">${yn('pHD',P.hdhp,L('¿Vuestro seguro médico es HDHP (compatible con HSA)?','Is your health plan an HDHP (HSA-eligible)?'))}${inp('pHSA',P.hsa,L('Aportado a HSA este año','HSA contributions this year'))}</div>
     <div class="row">${yn('pDC',P.dcfsaOffered,L('¿Tu empresa ofrece Dependent Care FSA?','Does your employer offer a Dependent Care FSA?'))}${inp('pCC',P.childcare,L('Gastos de guardería/preescolar del año','Daycare/preschool costs for the year'))}</div>
     <div class="row">${inp('pIRA',P.iraYou,L('Aportado a IRA tradicional (tú)','Traditional IRA contributions (you)'))}${inp('pIRAs',P.iraSpouse,L('Aportado a IRA tradicional (cónyuge)','Traditional IRA contributions (spouse)'))}</div>
     <div class="row">${inp('pRoth',P.roth,L('Aportado a Roth IRA (ambos)','Roth IRA contributions (both)'))}${inp('p529',P.c529,L('Aportado a 529 (ahorro universidad)','529 contributions (college savings)'))}</div>
     ${inp('pHPT',P.homePropTax,L('Impuesto de propiedad anual de tu casa (si no subes el recibo)','Annual property tax on your home (if you don\'t upload the bill)'))}
   </div>
  </div>
  <div class="row" style="margin-top:12px"><button class="pri" id="pSave">${L('Guardar perfil','Save profile')}</button>${S.tax&&S.tax[year-1]&&S.tax[year-1].profile?`<button id="pCopy">${L('Copiar del','Copy from')} ${year-1}</button>`:''}</div>`;
  const rebindKids=()=>{ $('#kidRows').querySelectorAll('[data-delkid]').forEach(b=>b.onclick=()=>{ readKids(); P.children.splice(+b.dataset.delkid,1); $('#kidRows').innerHTML=P.children.map((c,i)=>kidRow(c,i)).join(''); rebindKids(); }); };
  const readKids=()=>{ P.children=[...$('#kidRows').querySelectorAll('.kid')].map(r=>({by:parseInt(r.querySelector('.kBY').value)||null, ssn:r.querySelector('.kSSN').checked, home:r.querySelector('.kHome').checked})); };
  rebindKids();
  $('#addKid').onclick=()=>{ readKids(); P.children.push({by:null,ssn:true,home:true}); $('#kidRows').innerHTML=P.children.map((c,i)=>kidRow(c,i)).join(''); rebindKids(); };
  const yv=id=>{const v=$(id).value; return v===''?undefined:v==='1';}; const nv=id=>{const v=num($(id).value); return isNaN(v)?undefined:v;};
  $('#pSave').onclick=()=>{ readKids(); ty.filing=$('#pF').value; Object.assign(P,{age:nv('#pAge'),spouseWorks:yv('#pSW'),spouseIncome:nv('#pSI'),covered:yv('#pCov'),spouseCovered:yv('#pSCov'),f4547:$('#p4547').checked,estWages:nv('#pW'),k401:nv('#pK'),estFedWH:nv('#pFW'),estStateWH:nv('#pSW2'),estSDI:nv('#pSDI'),hdhp:yv('#pHD'),hsa:nv('#pHSA'),dcfsaOffered:yv('#pDC'),childcare:nv('#pCC'),iraYou:nv('#pIRA'),iraSpouse:nv('#pIRAs'),roth:nv('#pRoth'),c529:nv('#p529'),homePropTax:nv('#pHPT')});
    ty.kids=kidsSplit(year).u17; save(); toast(L('Perfil guardado','Profile saved')); taxSel.tab='optimizar'; route(); };
  if($('#pCopy')) $('#pCopy').onclick=()=>{ const prev=JSON.parse(JSON.stringify(S.tax[year-1].profile)); ['estWages','k401','estFedWH','estStateWH','estSDI','hsa','childcare','iraYou','iraSpouse','roth','c529','f4547'].forEach(k=>delete prev[k]); if(prev.age) prev.age+=1; ty.profile=prev; save(); route(); };
}
function kidRow(c,i){ return `<div class="row kid" style="align-items:flex-end;margin-bottom:6px"><label class="f">${L('Año de nacimiento','Birth year')}<input class="kBY" inputmode="numeric" value="${c.by||''}" placeholder="2021"></label><label class="f" style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="kSSN" style="width:auto" ${c.ssn!==false?'checked':''}> ${L('Tiene SSN','Has an SSN')}</label><label class="f" style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="kHome" style="width:auto" ${c.home!==false?'checked':''}> ${L('Vive con vosotros','Lives with you')}</label><button class="sm dan" data-delkid="${i}" style="margin-bottom:8px">✕</button></div>`; }

/* ---------- Optimizador ---------- */
function savingsOf(year,adj){ const a=computeTaxes(year), b=computeTaxes(year,adj); const fed=a.totalTax-b.totalTax; const ca=(adj.caDelta||0)*caMarginal(year,a.fs,Math.max(0,a.agi-Math.max(a.caStd,a.caItem))); return {fed,ca,total:fed+ca}; }
function recommendations(year){
  const ty=taxYear(year); const P=prof(year); const LM=LIM[year]||LIM[2026]; const R=computeTaxes(year); const K=kidsSplit(year); const out=[];
  const now=new Date(); const yearOpen=now.getFullYear()<=year; const nextApr=L(`15 de abril de ${year+1}`,`April 15, ${year+1}`);
  const until=L(`Hasta el ${nextApr}`,`By ${nextApr}`), dec31=L(`Antes del 31 de diciembre de ${year}`,`Before December 31, ${year}`);
  const add=(o)=>out.push(Object.assign({save:0,kind:'ahorro'},o));
  // 1. 401(k)
  const k401=R.k401||0;
  if(k401<LM.k401){ const gap=LM.k401-k401; const s=savingsOf(year,{k401:gap,caDelta:gap});
    add({t:L(`Aporta ${fmt(gap)} más al 401(k)`,`Put ${fmt(gap)} more into your 401(k)`),save:s.total,when:yearOpen?L(`Antes del último pago de nómina de ${year}`,`Before the last paycheck of ${year}`):L(`Ya no se puede para ${year}; hazlo en ${year+1}`,`Too late for ${year}; do it in ${year+1}`),
      d:L(`Llevas ${fmt(k401)} de un máximo de ${fmt(LM.k401)}. Cada dólar pre-tax baja tu impuesto federal (${Math.round(R.marginal*100)}%) y el de California.${yearOpen?' Sube el % de aportación en el portal de nóminas para lo que queda de año.':''}`,`You've put in ${fmt(k401)} of a ${fmt(LM.k401)} maximum. Every pre-tax dollar lowers your federal (${Math.round(R.marginal*100)}%) and California tax.${yearOpen?' Raise your contribution % in the payroll portal for the rest of the year.':''}`),
      tt:L('Sale automáticamente del W-2 (casilla 12, código D). No tienes que hacer nada en TurboTax.','It comes automatically from the W-2 (box 12, code D). Nothing to do in TurboTax.'),act:yearOpen}); }
  // 2. Spousal IRA
  const magi=R.agi; const spouseNoPlan=P.spouseCovered===false||P.spouseWorks===false;
  if(ty.filing!=='S'){
    const frac=P.covered===false&&spouseNoPlan?1:phaseFrac(magi,spouseNoPlan?LM.iraSpouse:LM.iraCov);
    const already=P.iraSpouse||0;
    if(frac>0&&already<LM.ira){ const amt=Math.round((LM.ira-already)*frac/10)*10; const s=savingsOf(year,{ira:amt,caDelta:amt});
      add({t:L(`IRA tradicional a nombre de tu cónyuge: ${fmt(amt)} deducibles`,`Traditional IRA in your spouse's name: ${fmt(amt)} deductible`),save:s.total,when:until,
        d:L(`Aunque ${P.spouseWorks===false?'no trabaje':'no tenga plan en el trabajo'}, como declaráis juntos puede aportar con tu sueldo (spousal IRA). Con un ingreso de ${fmtK(magi)} ${frac<1?`es deducible en parte (${Math.round(frac*100)}%)`:'es totalmente deducible'}; el límite de ingresos es ${fmtK(LM.iraSpouse[0])}–${fmtK(LM.iraSpouse[1])}. Ábrela en M1 u otro bróker y marca el año ${year} al aportar.`,`Even though your spouse ${P.spouseWorks===false?'doesn\'t work':'has no plan at work'}, filing jointly lets them contribute from your pay (spousal IRA). With income of ${fmtK(magi)} it is ${frac<1?`partly deductible (${Math.round(frac*100)}%)`:'fully deductible'}; the income range is ${fmtK(LM.iraSpouse[0])}–${fmtK(LM.iraSpouse[1])}. Open it at M1 or another broker and mark the year ${year} when contributing.`),
        tt:L('Deductions & Credits → Retirement and Investments → Traditional and Roth IRA Contributions → indica que la IRA es de tu cónyuge y la cantidad.','Deductions & Credits → Retirement and Investments → Traditional and Roth IRA Contributions → say the IRA belongs to your spouse and enter the amount.'),act:true}); }
    else if(frac===0&&magi<LM.roth[1]) add({t:L('Roth IRA para los dos','Roth IRA for both of you'),save:0,kind:'futuro',when:until,d:L(`Con tu nivel de ingresos la IRA tradicional ya no se deduce, pero podéis aportar hasta ${fmt(LM.ira)} cada uno a una Roth IRA. No ahorra impuestos hoy, pero todo lo que crezca saldrá libre de impuestos en la jubilación.`,`At your income level the traditional IRA is no longer deductible, but you can each put up to ${fmt(LM.ira)} into a Roth IRA. It saves no tax today, but all the growth comes out tax-free in retirement.`),tt:L('Deductions & Credits → Traditional and Roth IRA Contributions → elige Roth.','Deductions & Credits → Traditional and Roth IRA Contributions → choose Roth.')});
    else if(magi>=LM.roth[1]) add({t:L('"Backdoor" Roth IRA','"Backdoor" Roth IRA'),save:0,kind:'futuro',when:until,d:L('Por ingresos no podéis aportar directamente a una Roth. Se puede aportar a una IRA tradicional no deducible y convertirla a Roth (Form 8606). Conviene hacerlo con un profesional si ya tenéis dinero en IRAs tradicionales.','Your income is too high to contribute directly to a Roth. You can contribute to a non-deductible traditional IRA and convert it to Roth (Form 8606). Do it with a professional if you already have money in traditional IRAs.'),tt:L('Retirement and Investments → IRA contributions (no deducible) y luego Retirement Plans and Social Security → 1099-R de la conversión.','Retirement and Investments → IRA contributions (non-deductible), then Retirement Plans and Social Security → the conversion 1099-R.')});
    // own IRA
    if(P.covered!==false){ const f2=phaseFrac(magi,LM.iraCov); if(f2>0&&(P.iraYou||0)<LM.ira){ const amt=Math.round((LM.ira-(P.iraYou||0))*f2/10)*10; const s=savingsOf(year,{ira:amt,caDelta:amt}); add({t:L(`IRA tradicional a tu nombre: ${fmt(amt)} deducibles`,`Traditional IRA in your name: ${fmt(amt)} deductible`),save:s.total,when:until,d:L(`Con ingresos por debajo de ${fmtK(LM.iraCov[1])} todavía puedes deducir tu propia IRA aunque tengas 401(k).`,`With income below ${fmtK(LM.iraCov[1])} you can still deduct your own IRA even with a 401(k).`),tt:'Deductions & Credits → Traditional and Roth IRA Contributions.',act:true}); } }
  }
  // 3. HSA
  if(P.hdhp===true){ const gap=LM.hsaFam-(P.hsa||0); if(gap>0){ const s=savingsOf(year,{hsa:gap,caDelta:0}); add({t:L(`Aporta ${fmt(gap)} más a la HSA`,`Put ${fmt(gap)} more into your HSA`),save:s.total,when:L(`Hasta el ${nextApr} (mejor por nómina: también ahorras FICA)`,`By ${nextApr} (better through payroll: you also save FICA)`),d:L(`Con un seguro HDHP familiar podéis aportar ${fmt(LM.hsaFam)} al año. Desgrava en la federal (California no la reconoce) y el dinero se usa libre de impuestos en gastos médicos, o se invierte para el futuro.`,`With a family HDHP you can contribute ${fmt(LM.hsaFam)} a year. It is deductible federally (California doesn't recognize it) and the money is spent tax-free on medical costs, or invested for the future.`),tt:L('Deductions & Credits → Medical → HSA, MSA Contributions (Form 8889). Las aportaciones por nómina salen en el W-2 casilla 12 código W.','Deductions & Credits → Medical → HSA, MSA Contributions (Form 8889). Payroll contributions show on the W-2 box 12 code W.'),act:true}); } }
  else if(P.hdhp===undefined) add({t:L('Comprueba si tu seguro es HDHP','Check whether your health plan is an HDHP'),save:0,kind:'revisar',when:L('En la inscripción de beneficios (open enrollment)','At open enrollment'),d:L(`Si lo es, podéis meter hasta ${fmt(LM.hsaFam)} al año en una HSA, el ahorro con más ventajas fiscales que existe. Si no lo es, en la inscripción de beneficios puedes comparar si te compensa cambiar.`,`If it is, you can put up to ${fmt(LM.hsaFam)} a year into an HSA, the most tax-advantaged savings there is. If not, at open enrollment you can compare whether switching pays off.`),tt:''});
  // 4. Dependent care
  if(K.u13>0){
    if(P.spouseWorks===false) add({t:L('Guardería: FSA y crédito no aplican este año','Child care: FSA and credit don\'t apply this year'),save:0,kind:'info',when:'',d:L(`Tanto la Dependent Care FSA (hasta ${fmt(LM.dcfsa)}) como el crédito por cuidado de hijos exigen que trabajen los dos cónyuges, o que uno sea estudiante a tiempo completo. Si tu cónyuge vuelve a trabajar o a estudiar, merece mucho la pena activarlo.`,`Both the Dependent Care FSA (up to ${fmt(LM.dcfsa)}) and the child care credit require both spouses to work, or one to be a full-time student. If your spouse goes back to work or school, it is well worth turning on.`),tt:''});
    else if(P.spouseWorks===true&&(P.childcare||0)>0){ const amt=Math.min(LM.dcfsa,P.childcare); const s=savingsOf(year,{k401:amt,caDelta:amt}); add({t:`Dependent Care FSA: ${fmt(amt)}`,save:s.total+amt*0.0765,when:L('Elígelo en la inscripción de beneficios para el año siguiente','Choose it at open enrollment for next year'),d:L('Pagas la guardería con dinero sin impuestos (federal, California y FICA). Lo que no cubra la FSA puede ir al crédito por cuidado de hijos.','You pay for child care with untaxed money (federal, California and FICA). Whatever the FSA doesn\'t cover can go to the child care credit.'),tt:L('Deductions & Credits → You and Your Family → Child and Dependent Care Credit (Form 2441). Necesitas el nombre, la dirección y el EIN del centro.','Deductions & Credits → You and Your Family → Child and Dependent Care Credit (Form 2441). You need the provider\'s name, address and EIN.'),act:true}); }
  }
  // 5. Child tax credit check
  if(K.u17>0) add({t:L(`Crédito por hijos: ${K.u17} × $2,200`,`Child tax credit: ${K.u17} × $2,200`),save:0,kind:'ok',when:'',d:L(`Ya incluido en el cálculo (${fmt(R.ctc)}). Requisitos: cada hijo con SSN, menor de 17 a 31 de diciembre y viviendo con vosotros más de medio año.${K.o17?` Por los mayores de 17 hay un crédito de $500 cada uno.`:''}`,`Already included in the calculation (${fmt(R.ctc)}). Requirements: each child has an SSN, is under 17 on December 31 and lived with you more than half the year.${K.o17?` Children 17 and over get a $500 credit each.`:''}`),tt:L('Se aplica solo al añadir a los hijos como dependientes en Personal Info → Dependents.','It applies automatically when you add the children as dependents in Personal Info → Dependents.')});
  // 6. Trump account
  if(K.trump.length&&!P.f4547) add({t:L(`Reclama $1,000 para ${K.trump.length>1?K.trump.length+' de tus hijos':'tu hijo nacido en '+K.trump[0].by} (Trump Account)`,`Claim $1,000 for ${K.trump.length>1?K.trump.length+' of your children':'your child born in '+K.trump[0].by} (Trump Account)`),save:1000*K.trump.length,kind:'dinero',when:L('Con la declaración, o cuanto antes si no lo hiciste en la de 2025','With your return, or as soon as possible if you didn\'t do it on your 2025 return'),
    d:L('El gobierno deposita $1,000 en una cuenta de inversión para cada niño ciudadano con SSN nacido entre 2025 y 2028. No es automático: hay que pedirlo con el Form 4547. No es un ahorro de impuestos, pero es dinero para el niño.','The government deposits $1,000 into an investment account for each citizen child with an SSN born between 2025 and 2028. It is not automatic: you must request it with Form 4547. It is not a tax saving, but it is money for the child.'),tt:L('Busca "Trump Account" o "Form 4547" en la lupa de TurboTax y marca la casilla del pilot program contribution (línea 7) para cada niño.','Search "Trump Account" or "Form 4547" in TurboTax and check the pilot program contribution box (line 7) for each child.'),act:true});
  // 7. Property tax prepay
  if(R.useItem&&R.saltRaw<R.saltCap&&yearOpen){ const half=(P.homePropTax||R.homePT||0)/2; if(half>500){ const room=Math.min(half,R.saltCap-R.saltRaw); const s=savingsOf(year,{propTax:room,caDelta:room}); add({t:L(`Paga en diciembre la 2ª cuota del impuesto de propiedad (${fmt(room)})`,`Pay the 2nd property tax installment in December (${fmt(room)})`),save:s.total,kind:'adelantar',when:dec31,d:L('En California la segunda cuota vence el 10 de abril, pero puedes pagarla antes. Si la pagas en diciembre, cuenta en este año, en el que detallas y estás por debajo del tope SALT. Es un adelanto del ahorro (el año siguiente deducirás menos), útil si este año tu tipo es más alto.','In California the second installment is due April 10, but you can pay it early. If you pay it in December, it counts this year, when you itemize and are under the SALT cap. It brings the saving forward (next year you\'ll deduct less), useful if your rate is higher this year.'),tt:L('Deductions & Credits → Your Home → Property Taxes: pon el total pagado en el año natural.','Deductions & Credits → Your Home → Property Taxes: enter the total paid in the calendar year.'),act:true}); } }
  // 8. Charity bunching
  if(!R.useItem&&R.itemized>R.C.std*0.75) add({t:L('Agrupa los donativos en un solo año','Bunch your donations into one year'),save:0,kind:'estrategia',when:L('Planificación','Planning'),d:L(`Tu deducción detallada (${fmt(R.itemized)}) se queda cerca de la estándar (${fmt(R.C.std)}). Si concentras los donativos de dos años en uno (o usas un Donor-Advised Fund), ese año superarás la estándar y el otro tomarás la estándar.`,`Your itemized deduction (${fmt(R.itemized)}) is close to the standard one (${fmt(R.C.std)}). If you concentrate two years of donations into one (or use a Donor-Advised Fund), that year you'll exceed the standard deduction and take the standard one the other year.`),tt:''});
  // 9. Rental
  R.rentals.forEach(r=>{ if(r.depMissing) add({t:L(`Amortización de ${r.p.name}: probablemente la mayor deducción que te falta`,`Depreciation on ${r.p.name}: probably the biggest deduction you're missing`),save:0,kind:'revisar',when:L('Antes de declarar','Before filing'),d:L('Cada año puedes deducir el valor de la construcción (sin el terreno) ÷ 27.5. Si nunca la has aplicado, la ley la cuenta igual al vender ("allowed or allowable"), así que conviene corregirlo; puede requerir el Form 3115. Pon el valor de la construcción y el año de inicio en Cuentas → Editar la casa.','Every year you can deduct the building value (without land) ÷ 27.5. If you have never taken it, the law counts it anyway when you sell ("allowed or allowable"), so it is worth fixing; it may require Form 3115. Enter the building value and start year in Accounts → Edit the house.'),tt:L('Rental Properties → tu casa → Assets/Depreciation → Add asset → Residential Rental Real Estate.','Rental Properties → your house → Assets/Depreciation → Add asset → Residential Rental Real Estate.')});
    add({t:L(`Registra todos los gastos de ${r.p.name}`,`Record every expense of ${r.p.name}`),save:0,kind:'revisar',when:L('Todo el año','All year'),d:L('Además de hipoteca, impuestos, seguro y HOA, también se deducen las reparaciones, los materiales, la gestión, la publicidad, los gastos legales, el desplazamiento (millas) y el seguro de responsabilidad civil. Regístralos como "Gastos alquiler".','Besides mortgage, taxes, insurance and HOA, you can also deduct repairs, supplies, management, advertising, legal fees, travel (mileage) and liability insurance. Record them as "Rental expenses".'),tt:'Rental Properties → Expenses.'});
    if(R.rentalNetRaw<0&&R.rentalAllowed>R.rentalNetRaw) add({t:L('Tu pérdida de alquiler no se pierde: se acumula','Your rental loss isn\'t lost: it carries forward'),save:0,kind:'info',when:'',d:L(`Con un ingreso por encima de $150,000 la pérdida pasiva (${fmt(R.rentalNetRaw)}) no se deduce este año. Se acumula (Form 8582) y la usarás cuando la casa dé beneficios o cuando la vendas. Asegúrate de que TurboTax arrastra las pérdidas de años anteriores.`,`With income above $150,000 the passive loss (${fmt(R.rentalNetRaw)}) isn't deductible this year. It carries forward (Form 8582) and you'll use it when the house makes a profit or when you sell it. Make sure TurboTax carries over prior-year losses.`),tt:L('Importa la declaración del año pasado al empezar; revisa "Passive activity loss carryover" en el alquiler.','Import last year\'s return when you start; check "Passive activity loss carryover" in the rental section.')}); });
  // 10. Tax-loss harvesting
  const taxable=S.accounts.filter(a=>a.kind==='brokerage'&&a.holdings&&a.holdings.rows.length);
  const losers=taxable.flatMap(a=>a.holdings.rows.filter(x=>x.gain!=null&&x.gain<0).map(x=>({...x,acc:a.name})));
  if(losers.length){ const tl=-losers.reduce((s,x)=>s+x.gain,0); const sv=savingsOf(year,{k401:Math.min(tl,3000),caDelta:Math.min(tl,3000)});
    add({t:L(`Vende con pérdida ${losers.map(x=>x.sym).join(', ')} (${fmt(-tl)})`,`Sell at a loss: ${losers.map(x=>x.sym).join(', ')} (${fmt(-tl)})`),save:sv.total,when:yearOpen?dec31:'',d:L(`Según tus posiciones del ${dLabel(taxable[0].holdings.date)}, ${losers.map(x=>`${x.sym} pierde ${fmt(-x.gain)}`).join('; ')}. Venderlas compensa ganancias y hasta $3,000 de sueldo; el resto pasa a años siguientes. Recompra algo parecido pero no idéntico (por ejemplo, otro fondo de un índice distinto) o espera 31 días para evitar la regla wash sale. En M1, venderlas desde el pie la reinvierte en los demás slices.`,`According to your positions as of ${dLabel(taxable[0].holdings.date)}, ${losers.map(x=>`${x.sym} is down ${fmt(-x.gain)}`).join('; ')}. Selling them offsets gains and up to $3,000 of wages; the rest carries forward. Buy back something similar but not identical (for example, a fund tracking a different index) or wait 31 days to avoid the wash sale rule. In M1, selling from the pie reinvests it in the other slices.`),tt:L('Sale en el 1099-B de M1.','It shows on the M1 1099-B.'),act:true}); }
  else if(taxable.length) add({t:L('Sin pérdidas que aprovechar en M1','No losses to harvest at M1'),save:0,kind:'ok',when:'',d:L(`Con las posiciones del ${dLabel(taxable[0].holdings.date)} ninguna está en pérdidas, así que no hay tax-loss harvesting que hacer. Evita vender posiciones con ganancia en la cuenta normal salvo que lo necesites.`,`With the positions as of ${dLabel(taxable[0].holdings.date)} none is at a loss, so there is no tax-loss harvesting to do. Avoid selling positions at a gain in the taxable account unless you need to.`),tt:''});
  else if(S.accounts.some(a=>a.kind==='brokerage')) add({t:L('Revisa pérdidas en M1 antes del 31 de diciembre','Check for losses at M1 before December 31'),save:0,kind:'estrategia',when:yearOpen?dec31:'',d:L(`Si alguna posición de tu cuenta normal está en pérdidas, venderla compensa ganancias y hasta $3,000 de sueldo al año (${fmt(3000*R.marginal)} federales a tu tipo). Cuidado con la regla wash sale: no recompres lo mismo ni algo "sustancialmente idéntico" en los 30 días antes o después.`,`If any position in your taxable account is at a loss, selling it offsets gains and up to $3,000 of wages a year (${fmt(3000*R.marginal)} federal at your rate). Watch the wash sale rule: don't buy back the same thing or something "substantially identical" within 30 days before or after.`),tt:L('Sale en el 1099-B de M1; impórtalo en Investments and Savings.','It shows on the M1 1099-B; import it in Investments and Savings.')});
  // 11. Withholding
  if(R.balance>3000) add({t:L(`Ajusta tu W-4: estás prestando ${fmt(R.balance)} sin intereses a Hacienda`,`Adjust your W-4: you're lending ${fmt(R.balance)} interest-free to the IRS`),save:0,kind:'estrategia',when:L('Cuando quieras','Any time'),d:L('Una devolución grande significa que te retienen de más. Con el IRS Tax Withholding Estimator puedes ajustar el W-4 y cobrar ese dinero cada mes, por ejemplo para pagar principal extra de la hipoteca o invertir.','A big refund means too much is withheld. With the IRS Tax Withholding Estimator you can adjust your W-4 and get that money every month, for example to pay extra mortgage principal or invest.'),tt:''});
  if(R.balance<-1000) add({t:L(`Evita la multa: te faltan ${fmt(-R.balance)} de retención`,`Avoid the penalty: you're ${fmt(-R.balance)} short on withholding`),save:0,kind:'revisar',when:yearOpen?L('Antes de fin de año','Before year end'):'',d:L('Con un ingreso por encima de $150,000, te libras de la multa si has pagado al menos el 110% del impuesto del año pasado o el 90% del de este año. Sube la retención en el W-4 o haz un pago estimado (Form 1040-ES).','With income above $150,000, you avoid the penalty if you have paid at least 110% of last year\'s tax or 90% of this year\'s. Raise withholding on your W-4 or make an estimated payment (Form 1040-ES).'),tt:''});
  // 12. 529
  if(K.u17>0&&!(P.c529>0)) add({t:L('Para el ahorro de los niños, compara el 529 con la cuenta normal','For the kids\' savings, compare a 529 with a regular account'),save:0,kind:'futuro',when:'',d:L('California no desgrava el 529, pero lo que crece no paga impuestos si se usa en estudios (y hasta $10,000 al año en colegio K-12). Si ya tienes el dinero en una cuenta normal, mover lo que hay supone realizar ganancias; plantéalo para las aportaciones nuevas.','California gives no deduction for a 529, but the growth is tax-free if used for education (and up to $10,000 a year for K-12 school). If the money is already in a regular account, moving it means realizing gains; consider it for new contributions.'),tt:''});
  // 13. Mortgage > 750k
  R.mortRows.filter(m=>m.fF<1).forEach(m=>add({t:L('Intereses de hipoteca por encima del límite federal','Mortgage interest above the federal limit'),save:0,kind:'info',when:'',d:L(`Tu préstamo medio (${fmtK(m.avg)}) supera los $750,000 federales: deduces el ${Math.round(m.fF*100)}% en la federal y el 100% en California (límite $1M). TurboTax lo calcula si metes bien el principal pendiente y la fecha de origen.`,`Your average loan (${fmtK(m.avg)}) exceeds the $750,000 federal limit: you deduct ${Math.round(m.fF*100)}% federally and 100% in California ($1M limit). TurboTax calculates it if you enter the outstanding principal and origination date correctly.`),tt:L('Your Home → Mortgage Interest (1098): contesta a las preguntas de "loan balance" y fecha del préstamo.','Your Home → Mortgage Interest (1098): answer the "loan balance" and loan date questions.')}));
  return out.sort((a,b)=>(b.save||0)-(a.save||0));
}
function taxOptimizar(el){
  const year=taxSel.year; const R=computeTaxes(year); const recs=recommendations(year); const P=prof(year);
  const total=recs.filter(r=>r.kind==='ahorro'||r.kind==='adelantar').reduce((s,r)=>s+r.save,0);
  const missing=[]; if(!(P.children||[]).length&&!taxYear(year).kids) missing.push(L('hijos','children')); if(P.spouseWorks===undefined) missing.push(L('si tu cónyuge trabaja','whether your spouse works')); if(!R.wages) missing.push(L('salario (W-2 o estimado)','wages (W-2 or estimate)'));
  const badge={ahorro:['good','$'],adelantar:['good','$'],dinero:['good','$'],ok:['good','✓'],revisar:['warn','!'],estrategia:['info','i'],futuro:['info','i'],info:['info','i']};
  const fc=L('Federal + California, aprox.','Federal + California, approx.');
  el.innerHTML=`
  ${missing.length?`<div class="alert warn"><span class="ic">!</span><div><b>${L('Completa tu perfil para afinar:','Complete your profile to fine-tune:')}</b> ${L('falta','missing')} ${missing.join(', ')}. <a href="#impuestos" id="goPerfil">${L('Ir a Familia y situación','Go to Family & situation')}</a></div></div>`:''}
  <div class="grid g4">
    <div class="card stat"><div class="lbl">${L('Impuesto federal estimado','Estimated federal tax')} ${year}</div><div class="val">${fmt(R.totalTax)}</div><div class="note">${R.balance>=0?L('Devolución','Refund'):L('A pagar','Amount due')} ${fmt(Math.abs(R.balance))}</div></div>
    <div class="card stat">${helpBtn('opt_total')}<div class="lbl">${L('Ahorro posible con las acciones de abajo','Possible savings with the actions below')}</div><div class="val pos">${fmt(total)}</div><div class="note">${fc}</div></div>
    <div class="card stat"><div class="lbl">${L('Tu tipo marginal','Your marginal rate')}</div><div class="val">${Math.round(R.marginal*100)}% + ${Math.round(caMarginal(year,R.fs,Math.max(0,R.agi-Math.max(R.caStd,R.caItem)))*1000)/10}%</div><div class="note">${fc}</div></div>
  </div>
  <h3 class="sec">${L('Recomendaciones, de más a menos ahorro','Recommendations, from most to least savings')}${helpBtn('opt_recs',true)}</h3>
  ${recs.map(r=>{const [c,ic]=badge[r.kind]||['info','i']; return `<div class="alert ${c}" style="align-items:flex-start"><span class="ic">${ic}</span><div style="flex:1"><div class="row" style="align-items:baseline;gap:6px"><b style="flex:1;min-width:200px">${esc(r.t)}</b>${r.save>=1?`<span class="pill" style="flex:none">${r.kind==='dinero'?'+':L('ahorro ≈ ','savings ≈ ')}${fmt(r.save)}</span>`:''}</div>${r.when?`<div class="muted">${esc(r.when)}</div>`:''}<div style="margin-top:4px">${esc(r.d)}</div>${r.tt?`<div class="muted" style="margin-top:4px"><b>TurboTax:</b> ${esc(r.tt)}</div>`:''}</div></div>`;}).join('')}
  <div class="card" style="margin-top:12px">${helpBtn('opt_ai')}<h2>${L('Plan completo con Claude','Full plan with Claude')}</h2><p class="sub">${L('Claude revisa todo lo anterior, con tu perfil familiar (solo edades y cifras), y busca más oportunidades legales.','Claude reviews all of the above, with your family profile (ages and figures only), and looks for more legal opportunities.')}</p>
    <button class="pri" id="optAI">${L('Pedir plan a Claude','Ask Claude for a plan')}</button><div id="optOut" class="ai-out" style="margin-top:12px"></div></div>
  <p class="muted">${L('Estimaciones con las reglas federales y de California vigentes tras la ley OBBBA. No es asesoramiento fiscal: confirma las decisiones importantes con un CPA o un enrolled agent.','Estimates using the federal and California rules in force after the OBBBA law. This is not tax advice: confirm important decisions with a CPA or an enrolled agent.')}</p>`;
  if($('#goPerfil')) $('#goPerfil').onclick=e=>{e.preventDefault();taxSel.tab='perfil';route();};
  $('#optAI').onclick=()=>askClaudeTax(year,R,'plan');
}

/* ---------- Guía TurboTax ---------- */
function taxTurbo(el){
  const year=taxSel.year; const ty=taxYear(year); const R=computeTaxes(year); const P=prof(year); const K=kidsSplit(year);
  const W2=ty.docs.filter(d=>d.type==='W2'), D1098=ty.docs.filter(d=>d.type==='1098'), INV=ty.docs.filter(d=>['C1099','1099DIV','1099INT','1099B'].includes(d.type)), PT=ty.docs.filter(d=>d.type==='PROPTAX');
  const v=(d,k)=>d.fields[k]!=null?fmt(d.fields[k],2):'—';
  const exp=expectedDocs(year).filter(e=>!e.ok&&!e.opt);
  const steps=[];
  steps.push({t:L('Antes de empezar','Before you start'),b:`<ul><li>${L('Producto: <b>TurboTax Online Premium</b> (o TurboTax Desktop Premier). Lo necesitas por la casa en alquiler (Schedule E) y las inversiones; las versiones Free y Deluxe online no incluyen el Schedule E.','Product: <b>TurboTax Online Premium</b> (or TurboTax Desktop Premier). You need it for the rental property (Schedule E) and investments; the online Free and Deluxe versions don\'t include Schedule E.')}</li><li>${L('Si el año pasado usaste TurboTax, <b>importa esa declaración</b>: trae la amortización acumulada del alquiler y las pérdidas pasivas pendientes.','If you used TurboTax last year, <b>import that return</b>: it brings the rental\'s accumulated depreciation and pending passive losses.')}</li><li>${L('Ten a mano el SSN y la fecha de nacimiento de todos, y tu cuenta bancaria para la devolución.','Have everyone\'s SSN and date of birth at hand, and your bank account for the refund.')}</li>${exp.length?`<li class="neg">${L('Te faltan:','You are missing:')} ${exp.map(e=>esc(e.k)).join('; ')}.</li>`:`<li class="pos">${L('Tienes todos los documentos clave registrados.','You have all the key documents recorded.')}</li>`}<li>${L('TurboTax cambia algún nombre de menú cada año. Si no encuentras algo, usa la lupa (Search) con el término en inglés que te indico.','TurboTax renames some menus every year. If you can\'t find something, use Search with the English term given here.')}</li></ul>`});
  steps.push({t:'Personal Info',b:`<ul><li>Filing status: <b>${ty.filing==='S'?'Single':'Married Filing Jointly'}</b>.</li><li>${L(`Datos de los dos cónyuges; ocupación de tu cónyuge: ${P.spouseWorks===false?'"Homemaker"':'la suya'}.`,`Details for both spouses; your spouse's occupation: ${P.spouseWorks===false?'"Homemaker"':'their own'}.`)}</li><li>${L('Estado de residencia todo el año: <b>California</b>.','State of residence all year: <b>California</b>.')}</li><li>${L(`Dependents: añade a ${(P.children||[]).length||ty.kids||'tus'} hijo(s) con nombre, fecha de nacimiento y SSN; "lived with you 12 months". TurboTax aplica solo el crédito por hijos (${fmt(R.ctc)}).`,`Dependents: add your ${(P.children||[]).length||ty.kids||''} child(ren) with name, date of birth and SSN; "lived with you 12 months". TurboTax applies the child tax credit automatically (${fmt(R.ctc)}).`)}</li></ul>`});
  steps.push({t:'Wages & Income → W-2',b:W2.length?W2.map(d=>`<p><b>${esc(d.payer||L('Empleador','Employer'))}</b>: ${L('importa el W-2 con el EIN de la empresa o escríbelo a mano:','import the W-2 with the employer\'s EIN or type it in by hand:')}</p><ul><li>${L('Casilla','Box')} 1: ${v(d,'wages')} · ${L('Casilla','Box')} 2: ${v(d,'fedWH')}</li><li>${L('Casilla 12 código D','Box 12 code D')}: ${v(d,'k401')} ${L('(marca también "Retirement plan" en la casilla 13)','(also check "Retirement plan" in box 13)')}</li><li>${L('Casilla','Box')} 14: ${v(d,'sdi')}, ${L('categoría','category')} <b>"CA SDI / State disability insurance"</b> ${L('(se deduce como impuesto estatal)','(deductible as a state tax)')}</li><li>${L('Casillas','Boxes')} 16/17: ${v(d,'stateWages')} / ${v(d,'stateWH')}</li></ul>`).join(''):`<p class="neg">${L('Aún no hay W-2 en la app. Cuando llegue (finales de enero), impórtalo en la app y aquí verás las cifras.','No W-2 in the app yet. When it arrives (end of January), import it in the app and the figures will show here.')}</p>`});
  steps.push({t:'Wages & Income → Investments and Savings (1099)',b:INV.length?`<p>${L('Elige "Import from my bank or brokerage" y busca tu bróker. Si no aparece, introduce los totales de cada formulario:','Choose "Import from my bank or brokerage" and find your broker. If it isn\'t listed, enter the totals of each form:')}</p>`+INV.map(d=>`<ul><li><b>${esc(d.payer||FORM_LABEL[d.type])}</b>: ${Object.entries(d.fields).map(([k,x])=>`${esc(((FORM_FIELDS[d.type]||[]).find(f=>f[0]===k)||[k,k])[1])} ${fmt(x,2)}`).join(' · ')}</li></ul>`).join('')+(R.ftc?`<p>${L('Hay impuesto extranjero pagado: acepta el crédito simplificado (Foreign Tax Credit) cuando TurboTax lo proponga.','There is foreign tax paid: accept the simplified Foreign Tax Credit when TurboTax offers it.')}</p>`:''):`<p class="muted">${L('Sin 1099 de inversiones registrados todavía (M1 los publica hacia mediados de febrero).','No investment 1099s recorded yet (M1 publishes them around mid-February).')}</p>`});
  R.rentals.forEach(r=>{ steps.push({t:`Wages & Income → Rental Properties and Royalties (Schedule E) · ${esc(r.p.name)}`,b:`<ul><li>${L('Tipo: Single Family Residence · días alquilada: 365 · uso personal: 0 · "Active participation": <b>Sí</b>.','Type: Single Family Residence · days rented: 365 · personal use: 0 · "Active participation": <b>Yes</b>.')}</li><li>Rents received: <b>${fmt(r.rent,2)}</b>${r.rentEst?` <span class="neg">${L('(estimado: confírmalo con tus cobros reales)','(estimated: confirm it with your actual collections)')}</span>`:''}</li><li>Expenses → Mortgage interest: ${fmt(r.exp.mortgageInterest,2)}${r.mIntEst?L(' (estimado: usa el 1098 de esa hipoteca)',' (estimated: use that mortgage\'s 1098)'):''} · Taxes: ${fmt(r.exp.propertyTax,2)} · Insurance: ${fmt(r.exp.insurance,2)} · HOA (Other → "HOA fees"): ${fmt(r.exp.hoa,2)} · Repairs: ${fmt(r.exp.repairs,2)}${r.exp.other?` · Other: ${fmt(r.exp.other,2)}`:''}</li><li>Assets/Depreciation: ${r.depMissing?`<span class="neg">${L('añade la casa como "Residential Rental Real Estate" con su coste SIN terreno y la fecha en que empezó a alquilarse','add the house as "Residential Rental Real Estate" with its cost WITHOUT land and the date it was first rented')}</span>`:L(`revisa que esté la construcción (≈${fmt(r.p.buildingBasis)}) desde ${r.p.inService}; TurboTax calcula ${fmt(r.exp.depreciation)} al año`,`check the building is there (≈${fmt(r.p.buildingBasis)}) since ${r.p.inService}; TurboTax calculates ${fmt(r.exp.depreciation)} a year`)}.</li><li>${L('Si TurboTax dice que la pérdida queda "suspended", es correcto con tus ingresos: se acumula para el futuro.','If TurboTax says the loss is "suspended", that is correct for your income: it carries forward.')}</li><li>${L('El impuesto de propiedad y el seguro de esta casa van <b>aquí</b>, no en "Your Home".','This house\'s property tax and insurance go <b>here</b>, not under "Your Home".')}</li></ul>`}); });
  steps.push({t:'Deductions & Credits → Your Home',b:(D1098.filter(d=>!isRentalMortgage(mortgageFor(d))).map(d=>{ const pre=mortgageFor(d)&&mortgageFor(d).pre2017; return `<p><b>Mortgage Interest (1098) · ${esc(d.payer||'')}</b>: ${L(`casilla 1 ${v(d,'interest')}, casilla 2 ${v(d,'principalStart')}. Cuando pregunte, indica que el préstamo se usó para comprar tu vivienda, la fecha de origen (${pre?'antes':'después'} del 16/12/2017) y el saldo a 31 de diciembre. Con eso aplica el límite de $750k (federal) y el de $1M en California.`,`box 1 ${v(d,'interest')}, box 2 ${v(d,'principalStart')}. When asked, say the loan was used to buy your home, the origination date (${pre?'before':'after'} 12/16/2017) and the balance on December 31. With that it applies the $750k (federal) and $1M (California) limits.`)}</p>`; }).join('')||`<p class="muted">${L('Añade el 1098 de la casa cuando llegue en enero.','Add the home\'s 1098 when it arrives in January.')}</p>`)+`<p><b>Property Taxes</b>: ${L(`solo los de tu casa: ${fmt(R.homePT||P.homePropTax||0,2)} pagados en el año natural ${year}${PT.length?'':' (sube los recibos para confirmarlo)'}.`,`only your home's: ${fmt(R.homePT||P.homePropTax||0,2)} paid in calendar year ${year}${PT.length?'':' (upload the bills to confirm it)'}.`)}</p>`});
  steps.push({t:'Deductions & Credits → Charitable Donations',b:`<p>${L(`Donativos en efectivo: ${fmt(R.charity,2)}. Guarda los recibos (obligatorio a partir de $250 por donación). ${year>=2026?'Desde 2026, si tomas la deducción estándar, puedes deducir igualmente hasta $2,000 en donativos en efectivo (casados).':''}`,`Cash donations: ${fmt(R.charity,2)}. Keep the receipts (required from $250 per donation). ${year>=2026?'From 2026, if you take the standard deduction, you can still deduct up to $2,000 in cash donations (married).':''}`)}</p>`});
  steps.push({t:'Deductions & Credits → Retirement and Investments / Medical',b:`<ul><li>IRA: ${P.iraSpouse?L(`cónyuge ${fmt(P.iraSpouse)} (tradicional)`,`spouse ${fmt(P.iraSpouse)} (traditional)`):L('si haces la spousal IRA antes del 15 de abril, anótala aquí','if you make the spousal IRA contribution before April 15, enter it here')}${P.iraYou?` · ${L('tú','you')} ${fmt(P.iraYou)}`:''}${P.roth?` · Roth ${fmt(P.roth)}`:''}.</li><li>HSA (Form 8889): ${P.hdhp===true?L(`aportado ${fmt(P.hsa||0)}; tipo de cobertura "Family"`,`contributed ${fmt(P.hsa||0)}; coverage type "Family"`):L('solo si tienes HDHP/HSA','only if you have an HDHP/HSA')}.</li></ul>`});
  steps.push({t:'Deductions & Credits → You and Your Family',b:`<ul><li>Child Tax Credit: ${L('automático con los dependientes','automatic with the dependents')} (${K.u17} × $2,200).</li>${K.trump.length?`<li><b>Trump Account (Form 4547)</b>: ${P.f4547?L('ya presentado','already filed'):`<span class="neg">${L('busca "Form 4547" y marca la línea 7 para el niño nacido en ','search "Form 4547" and check line 7 for the child born in ')}${K.trump.map(c=>c.by).join(', ')} → $1,000</span>`}.</li>`:''}<li>Child and Dependent Care Credit: ${P.spouseWorks===false?L('sáltalo: no aplica si uno de los dos no trabaja ni estudia','skip it: it doesn\'t apply if one spouse neither works nor studies'):L('si pagasteis guardería, añade el centro con su EIN','if you paid for child care, add the provider with its EIN')}.</li></ul>`});
  steps.push({t:'Other Tax Situations / Estimates',b:`<ul><li>Estimated taxes paid: federal ${fmt(ty.estFed||0)} · California ${fmt(ty.estCA||0)}.</li><li>${L('Comprueba que TurboTax compara la deducción detallada con la estándar. Debería salir','Check that TurboTax compares itemized with standard. It should come out as')} <b>${R.useItem?L('detallada (itemized) ≈ ','itemized ≈ ')+fmt(R.itemized):L('estándar ','standard ')+fmt(R.C.std)}</b>.</li></ul>`});
  steps.push({t:'Federal Review',b:`<p>${L(`Compara con la app: AGI ≈ <b>${fmt(R.agi)}</b>, impuesto ≈ <b>${fmt(R.totalTax)}</b>, ${R.balance>=0?'devolución':'a pagar'} ≈ <b>${fmt(Math.abs(R.balance))}</b>. Si la diferencia pasa de unos cientos de dólares, busca el origen (suele ser un 1099 que falta o una casilla mal escrita). Responde a todas las alertas del Review.`,`Compare with the app: AGI ≈ <b>${fmt(R.agi)}</b>, tax ≈ <b>${fmt(R.totalTax)}</b>, ${R.balance>=0?'refund':'amount due'} ≈ <b>${fmt(Math.abs(R.balance))}</b>. If the difference is more than a few hundred dollars, find the cause (usually a missing 1099 or a mistyped box). Answer every alert in the Review.`)}</p>`});
  steps.push({t:'State Taxes → California',b:`<ul><li>${L('TurboTax pasa los datos federales. En los ajustes (Schedule CA) revisa que:','TurboTax carries over the federal data. In the adjustments (Schedule CA) check that:')}<ul><li>${L(`Los intereses de hipoteca suban al 100% (límite de $1M en CA): ≈ ${fmt(R.homeIntCA)}.`,`Mortgage interest goes up to 100% ($1M limit in CA): ≈ ${fmt(R.homeIntCA)}.`)}</li>${P.hdhp?`<li>${L('Las aportaciones a la HSA se suman de nuevo (California no las reconoce).','HSA contributions are added back (California doesn\'t recognize them).')}</li>`:''}<li>${L('No se deduzca el impuesto estatal sobre la renta (California no lo permite); el de propiedad sí.','State income tax is not deducted (California doesn\'t allow it); property tax is.')}</li></ul></li><li>${L(`Detallada CA ≈ ${fmt(R.caItem)} frente a una estándar de ≈${fmt(R.caStd)}.`,`CA itemized ≈ ${fmt(R.caItem)} versus a standard of ≈${fmt(R.caStd)}.`)}</li><li>${L('Retención CA (W-2 casilla 17)','CA withholding (W-2 box 17)')}: ${fmt(R.stateWH)}.</li></ul>`});
  steps.push({t:'File',b:`<ul><li>${L(`Presenta por internet (e-file) la federal y la de California. Devolución por depósito directo; si sale a pagar, págalo antes del ${year+1}-04-15 (Direct Debit).`,`E-file both the federal and California returns. Refund by direct deposit; if you owe, pay before ${year+1}-04-15 (Direct Debit).`)}</li><li>${L('Descarga el PDF completo con los worksheets y guárdalo, porque lo necesitarás el año que viene para la amortización y las pérdidas.','Download the full PDF with the worksheets and keep it, because you\'ll need it next year for depreciation and losses.')}</li><li>${L('Después: si la devolución fue grande o tuviste que pagar, ajusta tu W-4.','Afterwards: if the refund was large or you had to pay, adjust your W-4.')}</li></ul>`});
  el.innerHTML=`<div class="card" style="margin-bottom:12px">${helpBtn('turbo')}<h2>${L('Guía TurboTax','TurboTax guide')} ${year}</h2><p class="sub">${L('Paso a paso con tus cifras. Márcalos según avances. Se guardan en este dispositivo.','Step by step with your figures. Tick them off as you go. They are saved on this device.')}</p>
   <div class="row"><button id="ttAI">${L('Ampliar la guía con Claude','Expand the guide with Claude')}</button><button id="ttCopy">${L('Copiar la guía','Copy the guide')}</button></div><div id="ttOut" class="ai-out" style="margin-top:10px"></div></div>
   ${steps.map((s,i)=>{ const done=(ty.ttDone||{})[i]; return `<div class="card" style="margin-bottom:10px;${done?'opacity:.6':''}"><label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" data-st="${i}" style="width:auto;margin-top:4px" ${done?'checked':''}><div style="flex:1"><h2>${i+1}. ${s.t}</h2></div></label><div class="ai-out">${s.b}</div></div>`; }).join('')}`;
  el.querySelectorAll('[data-st]').forEach(c=>c.onchange=()=>{ ty.ttDone=ty.ttDone||{}; ty.ttDone[c.dataset.st]=c.checked; save(); route(); });
  $('#ttCopy').onclick=async()=>{ const txt=steps.map((s,i)=>`${i+1}. ${s.t.replace(/<[^>]+>/g,'')}\n`+s.b.replace(/<li>/g,'\n- ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&')).join('\n\n'); try{await navigator.clipboard.writeText(txt);toast(L('Guía copiada','Guide copied'))}catch(e){toast(L('No se pudo copiar','Could not copy'))} };
  $('#ttAI').onclick=()=>askClaudeTax(year,R,'turbotax','#ttOut');
}
VIEWS.impuestos=(el)=>{
  const year=taxSel.year||defaultTaxYear(); taxSel.year=year; const tab=taxSel.tab||'resumen';
  const years=[...new Set([2025,2026,defaultTaxYear(),...Object.keys(S.tax||{}).map(Number)])].sort();
  el.innerHTML=`<div class="card" style="margin-bottom:8px">${helpBtn('taxes')}<div class="row"><div><h2 style="margin:0">${L('Impuestos','Taxes')} ${year}</h2><p class="muted" style="margin:2px 0 0">${L(`Se declaran en ${year+1}. Estimación orientativa, no asesoramiento fiscal.`,`Filed in ${year+1}. An estimate for guidance, not tax advice.`)}</p></div><select id="tyY" style="max-width:120px">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select></div></div>
   <div class="tabs-inline">${[['resumen',L('Resumen y documentos','Summary & documents')],['perfil',L('Familia y situación','Family & situation')],['optimizar',L('Cómo pagar menos','How to pay less')],['turbotax',L('Guía TurboTax','TurboTax guide')]].map(([k,l])=>`<button class="${k===tab?'pri':''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="taxBody"></div>`;
  $('#tyY').onchange=e=>{taxSel.year=+e.target.value;route();};
  el.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{taxSel.tab=b.dataset.tab;route();});
  ({resumen:taxResumen,perfil:taxPerfil,optimizar:taxOptimizar,turbotax:taxTurbo})[tab]($('#taxBody'));
};

/* ---------- Manual de usuario (textos en help.js) ---------- */
VIEWS.ayuda=(el)=>{
  const M=(window.MANUAL||{})[LANG]||(window.MANUAL||{}).es; const G=window.HELP_GROUPS||[];
  if(!M){ el.innerHTML=`<div class="card empty">${L('No se pudo cargar el manual.','The manual could not be loaded.')}</div>`; return; }
  const gid=i=>'man-g'+i;
  el.innerHTML=`<div class="card man">
    <h1 style="font-size:22px;margin:0 0 6px">${M.title}</h1>
    <div class="toc muted"><b>${M.toc}:</b> ${M.intro.map(s=>`<a href="#ayuda" data-go="man-${s.id}">${s.h}</a>`).join('')} ${G.map((g,i)=>`<a href="#ayuda" data-go="${gid(i)}">${g[LANG]}</a>`).join('')} <a href="#ayuda" data-go="man-faq">${M.faq.h}</a></div>
    ${M.intro.map(s=>`<h2 id="man-${s.id}">${s.h}</h2>${s.b}`).join('')}
    <h2>${M.screens}</h2>
    ${G.map((g,i)=>`<h2 id="${gid(i)}" style="font-size:16px">${g[LANG]}</h2>${g.keys.map(k=>{ const h=helpEntry(k); return h?`<h3 id="man-${k}">${h.t}</h3>${helpBody(h)}`:''; }).join('')}`).join('')}
    <h2 id="man-faq">${M.faq.h}</h2>${M.faq.b}
    ${M.disclaimer}
  </div>`;
  el.querySelectorAll('[data-go]').forEach(a=>a.onclick=e=>{ e.preventDefault(); const t=document.getElementById(a.dataset.go); if(t) t.scrollIntoView({behavior:'smooth'}); });
};

/* ---------- Copia y ajustes ---------- */
// Copias cifradas. v2: PBKDF2-SHA256 con 600.000 iteraciones (OWASP/NIST SP 800-132) y la cabecera (app, versión, iteraciones)
// autenticada como datos adicionales de AES-GCM, para que nadie pueda rebajar las iteraciones sin que falle el descifrado.
// v1 (250.000 iteraciones, sin cabecera autenticada) se sigue pudiendo restaurar.
const BK_ITER=600000, BK_MIN=10;
async function deriveKey(pass,salt,it=250000){ const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
const bkAAD=(v,it)=>new TextEncoder().encode(`misfinanzas|v${v}|PBKDF2-SHA256|${it}`);
const b64=u=>{let s='';u=new Uint8Array(u);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function encryptState(pass){ const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12)); const key=await deriveKey(pass,salt,BK_ITER); const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bkAAD(2,BK_ITER)},key,new TextEncoder().encode(JSON.stringify(Object.assign({},S,{secret:undefined})))); return JSON.stringify({app:'misfinanzas',v:2,kdf:'PBKDF2-SHA256',it:BK_ITER,salt:b64(salt),iv:b64(iv),data:b64(ct)}); }
async function decryptBackup(txt,pass){ const o=JSON.parse(txt); if(o.app!=='misfinanzas'){ const e=new Error(L('No es una copia de MyFinZen / Mis Finanzas','This is not a MyFinZen / Mis Finanzas backup')); e.code='notbackup'; throw e; } const v2=o.v>=2; const it=v2?(+o.it||0):250000; if(v2&&it<BK_ITER){ const e=new Error(L('Copia no válida','Invalid backup')); e.code='notbackup'; throw e; } const key=await deriveKey(pass,unb64(o.salt),it); const pt=await crypto.subtle.decrypt(v2?{name:'AES-GCM',iv:unb64(o.iv),additionalData:bkAAD(2,it)}:{name:'AES-GCM',iv:unb64(o.iv)},key,unb64(o.data)); return JSON.parse(new TextDecoder().decode(pt)); }
VIEWS.ajustes=(el)=>{
  const lb=S.settings.lastBackup;
  el.innerHTML=`
  <div class="card" style="margin-bottom:12px">${helpBtn('lang')}<h2>${L('Idioma','Language')}</h2><p class="sub">${L('Elige el idioma de la aplicación. Se guarda en este dispositivo.','Choose the app language. It is saved on this device.')}</p><div class="row" style="justify-content:flex-start"><select id="sLang" style="max-width:220px"><option value="es" ${LANG==='es'?'selected':''}>Español</option><option value="en" ${LANG==='en'?'selected':''}>English</option></select></div></div>
  <div class="grid g2">
   <div class="card">${helpBtn('backup')}<h2>${L('Copia de seguridad cifrada','Encrypted backup')}</h2><p class="sub">${L('Tus datos solo están en este navegador. Haz una copia cada mes y guárdala en Dropbox o donde quieras: va cifrada con tu contraseña. También sirve para <b>pasar los datos del ordenador al móvil</b>.','Your data only lives in this browser. Make a backup every month and keep it in Dropbox or wherever you like: it is encrypted with your password. It is also how you <b>move your data from computer to phone</b>.')}</p>
     <p>${lb?`${L('Última copia','Last backup')}: <b>${dLabel(lb.slice(0,10))}</b>`:`<span class="neg"><b>${L('Aún no has hecho ninguna copia.','You haven\'t made any backup yet.')}</b></span>`}</p>
     <label class="f">${L('Contraseña de la copia','Backup password')}<input type="password" id="bP" autocomplete="new-password"></label>
     <p class="muted">${L('Mínimo 10 caracteres; mejor una frase de varias palabras. Si la olvidas, no hay forma de recuperar la copia. Se cifra con AES-256-GCM y PBKDF2-SHA256 (600.000 iteraciones).','At least 10 characters; a phrase of several words is best. If you forget it, the backup cannot be recovered. It is encrypted with AES-256-GCM and PBKDF2-SHA256 (600,000 iterations).')}</p>
     <button class="pri" id="bExp">${L('Crear copia cifrada','Create encrypted backup')}</button>
     <div id="bOut" style="margin-top:10px"></div></div>
   <div class="card">${helpBtn('restore')}<h2>${L('Restaurar copia','Restore backup')}</h2><p class="sub">${L('Sustituye los datos de este dispositivo por los de la copia.','Replaces the data on this device with the backup\'s.')}</p>
     <label class="f">${L('Archivo de copia (.json)','Backup file (.json)')}<input type="file" id="rF" accept=".json,application/json,text/plain"></label>
     <label class="f">${L('O pega el texto de la copia','Or paste the backup text')}<textarea id="rT" placeholder='{"app":"misfinanzas",...}'></textarea></label>
     <label class="f">${L('Contraseña','Password')}<input type="password" id="rP"></label>
     <button id="rGo">${L('Restaurar','Restore')}</button></div>
  </div>
  <div class="spacer"></div>
  <div class="grid g2">
   <div class="card">${helpBtn('prefs')}<h2>${L('Preferencias','Preferences')}</h2>
     <label class="f">${L('Meses de gastos en el fondo de emergencia','Months of expenses in the emergency fund')}<input id="sEM" inputmode="numeric" value="${S.settings.emergencyMonths}"></label>
     <label class="f">${L('Contexto para Claude (opcional, sin datos sensibles)','Context for Claude (optional, nothing sensitive)')}<textarea id="sCtx" placeholder="${L('Ej.: familia de 5, un solo sueldo, horizonte de inversión largo, quiero jubilarme sin hipoteca…','E.g.: family of 5, one income, long investment horizon, want to retire mortgage-free…')}">${esc(S.settings.context||'')}</textarea></label>
     <label class="f">${L('Nombres a ocultar antes de enviar texto a Claude (separados por comas)','Names to hide before sending text to Claude (comma-separated)')}<input id="sHide" value="${esc(S.settings.hideNames||'')}" placeholder="${L('Tu nombre, el de tu cónyuge, empresa…','Your name, your spouse\'s, employer…')}"></label>
     <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sAuto" style="width:auto" ${S.settings.autoClaude?'checked':''}> ${L('Leer con Claude, sin preguntar, los PDFs que no reconozca (siempre con datos ocultos)','Read unrecognized PDFs with Claude without asking (always with data hidden)')}</label>
     <button id="sSave">${L('Guardar','Save')}</button></div>
   <div class="card">${helpBtn('rules')}<h2>${L('Categorías y reglas','Categories and rules')}</h2><p class="sub">${L(`${userCats().length} categorías propias · ${S.rules.length} reglas. Las reglas se crean solas cuando recategorizas un movimiento.`,`${userCats().length} custom categories · ${S.rules.length} rules. Rules are created automatically when you recategorize a transaction.`)}</p>
     <div class="row" style="margin-bottom:8px;justify-content:flex-start"><button class="pri" id="sCats">${L('Gestionar categorías','Manage categories')}</button></div>
     <div class="tbl" style="max-height:260px;overflow:auto"><table><tbody>${S.rules.map((r,i)=>`<tr><td style="font-family:monospace;font-size:12px;word-break:break-all">${esc(r.pattern)}</td><td>${esc(catL(r.cat))}</td><td><button class="sm dan" data-r="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>
     <div class="spacer"></div><button id="reCat">${L('Volver a categorizar todo con las reglas','Recategorize everything with the rules')}</button></div>
  </div>
  <div class="spacer"></div>
  <div class="grid g2">
   <div class="card">${helpBtn('security')}<h2>${L('Seguridad','Security')}</h2>
     <label class="f">${L('Bloquear automáticamente tras (minutos sin usarla)','Lock automatically after (minutes idle)')}<select id="sLock">${[1,2,5,10,15,30].map(m=>`<option ${m===(S.settings.lockMin||5)?'selected':''}>${m}</option>`).join('')}</select></label>
     <p class="sub" style="margin-bottom:6px">${L('Passkeys (huella, cara o PIN):','Passkeys (fingerprint, face or PIN):')}</p>
     ${VAULT.meta.pk.length?`<table><tbody>${VAULT.meta.pk.map((p,i)=>`<tr><td>${esc(p.name)}<div class="muted">${L('creada','created')} ${esc(p.created)}</div></td><td class="n"><button class="sm dan" data-pk="${i}">${L('Quitar','Remove')}</button></td></tr>`).join('')}</tbody></table>`:`<p class="muted">${L('Ninguna en este dispositivo.','None on this device.')}</p>`}
     <div class="row" style="margin-top:8px">${passkeyCapable()?`<button id="sPkAdd">${L('+ Añadir passkey de este dispositivo','+ Add a passkey for this device')}</button>`:''}<button id="sPw">${L('Cambiar contraseña maestra','Change master password')}</button><button id="sRec">${L('Nueva clave de recuperación','New recovery key')}</button></div>
     <div id="sSecMsg" class="muted" style="margin-top:6px"></div></div>
   <div class="card">${helpBtn('apikey')}<h2>${L('Claude (opcional)','Claude (optional)')}</h2><p class="sub">${L('Con tu clave de API de Anthropic se activan el análisis, el plan de impuestos y la lectura de PDFs difíciles. La clave se guarda cifrada en este dispositivo y no se incluye en las copias. Créala en console.anthropic.com → API Keys. Se paga por uso.','Your Anthropic API key turns on the analysis, the tax plan and reading difficult PDFs. The key is stored encrypted on this device and is not included in backups. Create it at console.anthropic.com → API Keys. You pay per use.')}</p>
     <label class="f">${L('Clave de API','API key')}<input type="password" id="sKey" autocomplete="off" placeholder="sk-ant-…" value="${S.secret&&S.secret.apiKey?'••••••••••••':''}"></label>
     <div class="row"><button id="sKeySave" class="pri">${L('Guardar clave','Save key')}</button><button id="sKeyTest">${L('Probar','Test')}</button>${S.secret&&S.secret.apiKey?`<button id="sKeyDel" class="dan">${L('Quitar','Remove')}</button>`:''}</div><div id="sKeyMsg" class="muted" style="margin-top:6px"></div></div>
  </div>
  <div class="spacer"></div>
  <div class="card">${helpBtn('wipe')}<h2>${L('Borrar todo','Delete everything')}</h2><p class="sub">${L('Elimina todos los datos de este dispositivo. Haz antes una copia.','Removes all data from this device. Make a backup first.')}</p><button class="dan" id="wipe">${L('Borrar todos los datos','Delete all data')}</button></div>
  <p class="muted" style="margin-top:14px">${L(`Datos: ${S.accounts.length} cuentas · ${S.snapshots.length} saldos · ${S.tx.length} movimientos.`,`Data: ${S.accounts.length} accounts · ${S.snapshots.length} balances · ${S.tx.length} transactions.`)}</p>`;
  $('#sLang').onchange=e=>setLang(e.target.value);
  $('#sCats').onclick=()=>manageCats();
  $('#bExp').onclick=async()=>{ const p=$('#bP').value; if(p.length<BK_MIN) return toast(L(`Usa una contraseña de ${BK_MIN} caracteres o más (mejor una frase)`,`Use a password of ${BK_MIN}+ characters (a phrase is best)`)); $('#bExp').disabled=true; $('#bExp').textContent=L('Cifrando…','Encrypting…'); const txt=await encryptState(p); const fn=`myfinzen-${today()}.json`; const box=$('#bOut');
    const saved=downloadFile(fn,txt);
    box.innerHTML=`<p class="${saved?'pos':''}">${saved?L('Copia descargada.','Backup downloaded.'):L('Si no se descargó, copia el texto y guárdalo en un archivo o nota:','If it didn\'t download, copy the text and save it in a file or note:')}</p>${saved?'':`<textarea readonly style="min-height:70px;font-size:11px">${esc(txt)}</textarea><button class="sm" id="bCopy">${L('Copiar','Copy')}</button>`}`;
    const c=$('#bCopy'); if(c) c.onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast(L('Copiado','Copied'))}catch(e){toast(L('Selecciona el texto y cópialo','Select the text and copy it'))}};
    $('#bExp').disabled=false; $('#bExp').textContent=L('Crear copia cifrada','Create encrypted backup');
    S.settings.lastBackup=new Date().toISOString(); save(); };
  $('#rGo').onclick=async()=>{ let txt=$('#rT').value.trim(); const f=$('#rF').files[0]; if(f) txt=await f.text(); if(!txt) return toast(L('Elige un archivo o pega la copia','Choose a file or paste the backup')); try{ const st=sanitizeState(await decryptBackup(txt,$('#rP').value)); const ok=await confirmModal(L('Restaurar copia','Restore backup'),L(`<p>La copia tiene ${st.accounts.length} cuentas y ${st.tx.length} movimientos. Sustituirá lo que hay en este dispositivo.</p>`,`<p>The backup has ${st.accounts.length} accounts and ${st.tx.length} transactions. It will replace what is on this device.</p>`)); if(!ok)return; const keep=S.secret; S=st; S.secret=keep||{}; REC=null; save(); toast(L('Copia restaurada','Backup restored')); location.hash='#resumen'; route(); }catch(e){ toast(e.code==='notbackup'?e.message:L('Contraseña incorrecta o archivo dañado','Wrong password or damaged file')); } };
  $('#sSave').onclick=()=>{ const n=parseInt($('#sEM').value); if(n>0) S.settings.emergencyMonths=n; S.settings.context=$('#sCtx').value.trim(); S.settings.hideNames=$('#sHide').value.trim(); S.settings.autoClaude=$('#sAuto').checked; save(); toast(L('Guardado','Saved')); };
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ S.rules.splice(+b.dataset.r,1); save(); route(); });
  $('#sLock').onchange=e=>{ S.settings.lockMin=+e.target.value; save(); bumpLock(); toast(L('Guardado','Saved')); };
  el.querySelectorAll('[data-pk]').forEach(b=>b.onclick=async()=>{ if(await confirmModal(L('¿Quitar passkey?','Remove passkey?'),`<p>${L('Podrás seguir entrando con la contraseña maestra.','You can still sign in with the master password.')}</p>`)){ VAULT.meta.pk.splice(+b.dataset.pk,1); await persist(); route(); } });
  if($('#sPkAdd')) $('#sPkAdd').onclick=async()=>{ try{ await addPasskey(); toast(L('Passkey añadida','Passkey added')); route(); }catch(e){ $('#sSecMsg').textContent=e.code==='noprf'?e.message:(e.name==='NotAllowedError'?L('Cancelado.','Cancelled.'):e.message); } };
  $('#sPw').onclick=()=>{ openModal(`<h2>${L('Cambiar contraseña maestra','Change master password')}</h2><label class="f">${L('Contraseña actual','Current password')}<input type="password" id="cp0"></label><label class="f">${L('Nueva (mín. 10)','New (min. 10)')}<input type="password" id="cp1" autocomplete="new-password"></label><label class="f">${L('Repítela','Repeat it')}<input type="password" id="cp2" autocomplete="new-password"></label><div class="row"><button id="mc">${L('Cancelar','Cancel')}</button><button class="pri" id="cpOk">${L('Cambiar','Change')}</button></div>`); $('#mc').onclick=closeModal;
    $('#cpOk').onclick=async()=>{ const a=$('#cp1').value; if(a.length<10) return toast(L('Mínimo 10 caracteres','At least 10 characters')); if(a!==$('#cp2').value) return toast(L('No coinciden','They don\'t match')); try{ const p=VAULT.meta.pw; await unseal(await kdfPass($('#cp0').value,unb64(p.salt),p.it),p.wrap); }catch(e){ return toast(L('La contraseña actual no es correcta','The current password is wrong')); } await setPassword(a); closeModal(); toast(L('Contraseña cambiada','Password changed')); }; };
  $('#sRec').onclick=async()=>{ if(!await confirmModal(L('Nueva clave de recuperación','New recovery key'),`<p>${L('La clave anterior dejará de funcionar.','The previous key will stop working.')}</p>`)) return; const rec=await newRecovery(); openModal(`<h2>${L('Nueva clave de recuperación','New recovery key')}</h2><p class="muted">${L('Guárdala en papel en un sitio seguro.','Keep it on paper somewhere safe.')}</p><div class="reccode">${rec}</div><div class="row"><button class="pri" id="mc">${L('La he guardado','I\'ve saved it')}</button></div>`); $('#mc').onclick=closeModal; };
  $('#sKeySave').onclick=()=>{ const v=$('#sKey').value.trim(); if(!v||/^•+$/.test(v)) return toast(L('Pega la clave','Paste the key')); if(!/^sk-ant-/.test(v)) return toast(L('La clave debe empezar por sk-ant-','The key must start with sk-ant-')); S.secret=Object.assign({},S.secret,{apiKey:v}); save(); toast(L('Clave guardada','Key saved')); route(); };
  $('#sKeyTest').onclick=async()=>{ const m=$('#sKeyMsg'); m.textContent=L('Probando…','Testing…'); try{ const r=await claudeCall('Responde solo: OK',{modelTier:'quick',maxTokens:10,stream:false}); m.textContent=L('Funciona ✓ (','Works ✓ (')+r.text.trim()+')'; }catch(e){ m.textContent=e.message; } };
  if($('#sKeyDel')) $('#sKeyDel').onclick=()=>{ if(S.secret) delete S.secret.apiKey; save(); route(); };
  $('#reCat').onclick=()=>{ let n=0; S.tx.forEach(t=>{ if(t.manual||t.rec) return; const c=categorize(t.desc,t.amount)||otherCat(t.amount); if(c!==t.cat){t.cat=c;n++;} }); save(); toast(L(`${n} movimientos recategorizados`,`${n} transactions recategorized`)); };
  $('#wipe').onclick=async()=>{ if(await confirmModal(L('¿Borrar todo?','Delete everything?'),`<p>${L('Se borrarán los datos, la contraseña y las passkeys de este dispositivo. No se puede deshacer.','The data, password and passkeys on this device will be deleted. This cannot be undone.')}</p>`)){ clearTimeout(saveTimer); saveTimer=null; await persistQ; VAULT.dk=null; S=null; await IDB.set('vault',null); try{ localStorage.removeItem('mfz-lang'); }catch(e){} location.hash=''; location.reload(); } };
};

/* ---------- Modal helpers ---------- */
function openModal(html){ $('#modal').innerHTML=html; $('#modalBg').classList.add('show'); setTimeout(()=>{const f=$('#modal').querySelector('input:not([type=checkbox]):not([type=radio])'); if(f&&window.innerWidth>700) f.focus();},50); }
function closeModal(){ $('#modalBg').classList.remove('show'); }
$('#modalBg').addEventListener('click',e=>{ if(e.target.id==='modalBg') closeModal(); });
function confirmModal(title,body){ return new Promise(res=>{ openModal(`<h2>${title}</h2>${body}<div class="row" style="margin-top:12px"><button id="cN">${L('Cancelar','Cancel')}</button><button class="pri" id="cY">${L('Continuar','Continue')}</button></div>`); $('#cN').onclick=()=>{closeModal();res(false)}; $('#cY').onclick=()=>{closeModal();res(true)}; }); }

/* ============================================================
   Bóveda cifrada: contraseña maestra, passkey (WebAuthn PRF),
   clave de recuperación y bloqueo automático.
   - Los datos se cifran con una clave aleatoria (DK, AES-GCM 256).
   - La DK se guarda "envuelta" por cada método de desbloqueo.
   - Nada en claro toca el disco; nada sale del dispositivo.
   ============================================================ */
const VAULT={meta:null,dk:null,dkRaw:null};
const TE=new TextEncoder(), TD=new TextDecoder();
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const b64u=buf=>b64(buf).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const PW_ITER=600000, REC_ITER=200000;
async function kdfPass(pass,salt,it){ const k=await crypto.subtle.importKey('raw',TE.encode(pass),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
async function kdfPrf(out){ const base=await crypto.subtle.importKey('raw',out,'HKDF',false,['deriveKey']); return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:TE.encode('myfinzen-prf-v1'),info:TE.encode('vault-kek')},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
async function seal(key,bytes){ const iv=rnd(12); const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes); return {iv:b64(iv),ct:b64(ct)}; }
async function unseal(key,o){ return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},key,unb64(o.ct))); }
async function setDK(raw){ VAULT.dkRaw=raw; VAULT.dk=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']); }
// Clave de recuperación: 24 símbolos de un alfabeto de 31 (≈119 bits). Muestreo por rechazo para que todos sean equiprobables.
function makeRecovery(){ const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const lim=256-256%A.length; let s='', n=0; while(n<24){ for(const b of rnd(32)){ if(b>=lim||n>=24) continue; s+=A[b%A.length]; n++; if(n%4===0&&n<24) s+='-'; } } return s; }
const normRec=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
// Las escrituras van en cola: así nunca se guarda una versión vieja encima de una nueva. El contenido se toma al llamar,
// de modo que bloquear justo después (lockNow) sigue guardando lo último.
let persistQ=Promise.resolve(), persistWarned=false;
function persist(){ if(!VAULT.dk||!S||!VAULT.meta) return persistQ; const dk=VAULT.dk, meta=VAULT.meta, bytes=TE.encode(JSON.stringify(S));
  persistQ=persistQ.then(async()=>{ meta.data=await seal(dk,bytes); meta.updated=new Date().toISOString(); const ok=await IDB.set('vault',meta);
    if(!ok&&!persistWarned){ persistWarned=true; toast(L('No se pudo guardar en este dispositivo (¿sin espacio?). Haz una copia cifrada.','Could not save on this device (out of space?). Make an encrypted backup.')); } if(ok) persistWarned=false; }).catch(e=>{ console.warn('persist',e); });
  return persistQ; }
async function createVault(pass){
  const raw=rnd(32); await setDK(raw);
  const salt=rnd(16), rsalt=rnd(16); const rec=makeRecovery();
  VAULT.meta={v:1,created:new Date().toISOString(),pw:{salt:b64(salt),it:PW_ITER,wrap:await seal(await kdfPass(pass,salt,PW_ITER),raw)},rec:{salt:b64(rsalt),it:REC_ITER,wrap:await seal(await kdfPass(normRec(rec),rsalt,REC_ITER),raw)},pk:[]};
  S=blankState(); await persist(); return rec;
}
async function loadState(){ const raw=await unseal(VAULT.dk,VAULT.meta.data); S=sanitizeState(JSON.parse(TD.decode(raw))); raw.fill(0); migrateCats(); }
async function unlockWithPassword(pass){ const p=VAULT.meta.pw; const raw=await unseal(await kdfPass(pass,unb64(p.salt),p.it),p.wrap); await setDK(raw); await loadState(); }
async function unlockWithRecovery(code){ const r=VAULT.meta.rec; const raw=await unseal(await kdfPass(normRec(code),unb64(r.salt),r.it),r.wrap); await setDK(raw); await loadState(); }
async function setPassword(pass){ const salt=rnd(16); VAULT.meta.pw={salt:b64(salt),it:PW_ITER,wrap:await seal(await kdfPass(pass,salt,PW_ITER),VAULT.dkRaw)}; await persist(); }
async function newRecovery(){ const rec=makeRecovery(), rsalt=rnd(16); VAULT.meta.rec={salt:b64(rsalt),it:REC_ITER,wrap:await seal(await kdfPass(normRec(rec),rsalt,REC_ITER),VAULT.dkRaw)}; await persist(); return rec; }
function passkeyCapable(){ return !!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext); }
function deviceName(){ const u=navigator.userAgent; if(/Android/.test(u)) return 'Android'; if(/iPhone|iPad/.test(u)) return 'iPhone/iPad'; if(/Mac/.test(u)) return 'Mac'; if(/Windows/.test(u)) return 'Windows'; return 'Dispositivo'; }
async function addPasskey(){
  const prfSalt=rnd(32);
  const cred=await navigator.credentials.create({publicKey:{rp:{name:'MyFinZen',id:location.hostname},user:{id:rnd(16),name:'MyFinZen · '+deviceName(),displayName:'MyFinZen'},challenge:rnd(32),
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'preferred',userVerification:'required'},timeout:120000,extensions:{prf:{eval:{first:prfSalt}}}}});
  const ext=cred.getClientExtensionResults()||{};
  if(!ext.prf||ext.prf.enabled===false) throw Object.assign(new Error(L('Este dispositivo o navegador no admite passkeys con cifrado (PRF). Usa la contraseña maestra.','This device or browser doesn\'t support passkeys with encryption (PRF). Use the master password.')),{code:'noprf'});
  let out=ext.prf.results&&ext.prf.results.first;
  if(!out){ const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,allowCredentials:[{type:'public-key',id:cred.rawId}],userVerification:'required',timeout:120000,extensions:{prf:{eval:{first:prfSalt}}}}});
    const e2=a.getClientExtensionResults()||{}; out=e2.prf&&e2.prf.results&&e2.prf.results.first; }
  if(!out) throw Object.assign(new Error(L('Este dispositivo o navegador no admite passkeys con cifrado (PRF). Usa la contraseña maestra.','This device or browser doesn\'t support passkeys with encryption (PRF). Use the master password.')),{code:'noprf'});
  VAULT.meta.pk.push({id:b64u(cred.rawId),prfSalt:b64(prfSalt),wrap:await seal(await kdfPrf(out),VAULT.dkRaw),created:today(),name:deviceName()});
  await persist();
}
async function unlockWithPasskey(){
  const pk=VAULT.meta.pk; if(!pk.length) throw new Error(L('No hay passkeys','There are no passkeys'));
  const fromU=s=>unb64(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4));
  const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,allowCredentials:pk.map(p=>({type:'public-key',id:fromU(p.id)})),userVerification:'required',timeout:120000,
    extensions:{prf:{evalByCredential:Object.fromEntries(pk.map(p=>[p.id,{first:unb64(p.prfSalt)}]))}}}});
  const id=b64u(a.rawId); const p=pk.find(x=>x.id===id); const e=a.getClientExtensionResults()||{}; const out=e.prf&&e.prf.results&&e.prf.results.first;
  if(!p||!out) throw new Error(L('La passkey no devolvió la clave. Usa la contraseña maestra.','The passkey didn\'t return the key. Use the master password.'));
  await setDK(await unseal(await kdfPrf(out),p.wrap)); await loadState();
}
/* ---------- Bloqueo ---------- */
let lockTimer=null, hiddenAt=0;
function lockNow(){ if(S) flushSave(); clearTimeout(lockTimer); if(VAULT.dkRaw) VAULT.dkRaw.fill(0); VAULT.dk=null; VAULT.dkRaw=null; S=null; REC=null; NEWS.data=null; NEWS.tk='all'; NEWS.q=''; closeModal(); $('#app').innerHTML=''; showGate('unlock',true); }
function bumpLock(){ clearTimeout(lockTimer); if(!S) return; const m=(S.settings&&S.settings.lockMin)||5; lockTimer=setTimeout(()=>{ if(S) lockNow(); },m*60000); }
['pointerdown','keydown','scroll','touchstart'].forEach(ev=>window.addEventListener(ev,()=>{ if(S) bumpLock(); },{passive:true}));
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ hiddenAt=Date.now(); if(S) flushSave(); } else if(S&&hiddenAt&&Date.now()-hiddenAt>((S.settings.lockMin||5)*60000)) lockNow(); });
/* ---------- Pantallas de acceso ---------- */
function showGate(mode,extra){
  const g=$('#gate'); g.style.display='flex'; document.body.classList.add('locked');
  const box=html=>{ g.innerHTML=`<div class="gate-card"><div class="gate-logo"><img src="icons/icon-192.png" alt=""><div><b>MyFinZen</b><div class="muted">${L('Tus finanzas, cifradas en tu dispositivo','Your finances, encrypted on your device')}</div></div></div>${html}${langSwitch()}</div>`; wireLang(g,()=>showGate(mode,mode==='unlock'?true:extra)); };
  const tooShort=L('Mínimo 10 caracteres','At least 10 characters'), noMatch=L('No coinciden','They don\'t match'), cancelled=L('Cancelado.','Cancelled.');
  if(mode==='setup'){
    box(`<h2>${L('Crea tu contraseña maestra','Create your master password')}</h2><p class="muted">${L('Cifra todos tus datos en este dispositivo. Nadie puede recuperarla por ti: ni el creador de la app, ni GitHub, ni Anthropic. Mejor una frase de varias palabras (mínimo 10 caracteres).','It encrypts all your data on this device. Nobody can recover it for you: not the app\'s author, not GitHub, not Anthropic. A phrase of several words works best (at least 10 characters).')}</p>
      <label class="f">${L('Contraseña maestra','Master password')}<input type="password" id="g1" autocomplete="new-password"></label><label class="f">${L('Repítela','Repeat it')}<input type="password" id="g2" autocomplete="new-password"></label>
      <div id="gStr" class="muted"></div><button class="pri" id="gGo" style="width:100%;margin-top:8px">${L('Crear y cifrar','Create and encrypt')}</button>`);
    $('#g1').oninput=()=>{ const v=$('#g1').value; const s=v.length>=20?L('muy buena','very good'):v.length>=14?L('buena','good'):v.length>=10?L('aceptable','acceptable'):L('demasiado corta','too short'); $('#gStr').textContent=L('Longitud: ','Length: ')+s; };
    $('#gGo').onclick=async()=>{ const a=$('#g1').value, b=$('#g2').value; if(a.length<10) return toast(tooShort); if(a!==b) return toast(noMatch); $('#gGo').disabled=true; $('#gGo').textContent=L('Cifrando…','Encrypting…'); const rec=await createVault(a); showGate('recovery',rec); };
  }
  else if(mode==='recovery'){
    box(`<h2>${L('Tu clave de recuperación','Your recovery key')}</h2><p class="muted">${L('Si olvidas la contraseña y pierdes tus dispositivos, es la única forma de recuperar los datos. Escríbela en papel y guárdala en un sitio seguro. No se volverá a mostrar.','If you forget the password and lose your devices, this is the only way to recover your data. Write it on paper and keep it somewhere safe. It won\'t be shown again.')}</p>
      <div class="reccode">${extra}</div><button class="sm" id="gCopy">${L('Copiar','Copy')}</button>
      <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="gOk" style="width:auto"> ${L('La he guardado en un lugar seguro','I have saved it somewhere safe')}</label>
      <button class="pri" id="gNext" style="width:100%" disabled>${L('Continuar','Continue')}</button>`);
    $('#gCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(extra); toast(L('Copiada. Pégala en un sitio seguro y bórrala del portapapeles','Copied. Paste it somewhere safe and clear the clipboard')); }catch(e){ toast(L('Cópiala a mano','Copy it by hand')); } };
    $('#gOk').onchange=e=>$('#gNext').disabled=!e.target.checked;
    $('#gNext').onclick=()=>passkeyCapable()?showGate('passkey'):enterApp(true);
  }
  else if(mode==='passkey'){
    box(`<h2>${L('¿Desbloquear con tu huella?','Unlock with your fingerprint?')}</h2><p class="muted">${L('Crea una passkey en este dispositivo para abrir MyFinZen con la huella, la cara o el PIN del móvil. Es más segura que la contraseña: no se puede adivinar ni robar con una web falsa. La contraseña maestra seguirá sirviendo.','Create a passkey on this device to open MyFinZen with your phone\'s fingerprint, face or PIN. It is safer than the password: it can\'t be guessed or stolen by a fake website. The master password keeps working.')}</p>
      <button class="pri" id="gPk" style="width:100%">${L('Crear passkey','Create passkey')}</button><button id="gSkip" style="width:100%;margin-top:8px">${L('Ahora no','Not now')}</button><div id="gMsg" class="muted" style="margin-top:8px"></div>`);
    $('#gPk').onclick=async()=>{ try{ await addPasskey(); toast(L('Passkey creada','Passkey created')); enterApp(true); }catch(e){ $('#gMsg').textContent=e.code==='noprf'?e.message:(e.name==='NotAllowedError'?cancelled:L('No se pudo crear: ','Could not create it: ')+e.message); } };
    $('#gSkip').onclick=()=>enterApp(true);
  }
  else if(mode==='unlock'){
    const hasPk=VAULT.meta.pk.length>0&&passkeyCapable();
    box(`<h2>${L('Desbloquear','Unlock')}</h2>${hasPk?`<button class="pri" id="gPk" style="width:100%">${L('Usar huella / passkey','Use fingerprint / passkey')}</button><div class="muted" style="text-align:center;margin:10px 0">${L('o','or')}</div>`:''}
      <label class="f">${L('Contraseña maestra','Master password')}<input type="password" id="gP" autocomplete="current-password"></label>
      <button class="${hasPk?'':'pri'}" id="gGo" style="width:100%">${L('Desbloquear','Unlock')}</button>
      <div id="gMsg" class="neg" style="margin-top:8px;min-height:1em"></div>
      <p style="margin-top:14px"><a href="#" id="gRec">${L('Usar la clave de recuperación','Use the recovery key')}</a></p>`);
    const fail=m=>{ $('#gMsg').textContent=m; };
    if(hasPk){ const tryPk=async(auto)=>{ try{ await unlockWithPasskey(); enterApp(); }catch(e){ if(!auto) fail(e.name==='NotAllowedError'?cancelled:e.message); } }; $('#gPk').onclick=()=>tryPk(false); if(!extra&&!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) setTimeout(()=>tryPk(true),300); }
    const go=async()=>{ $('#gGo').disabled=true; $('#gGo').textContent=L('Comprobando…','Checking…'); try{ await unlockWithPassword($('#gP').value); enterApp(); }catch(e){ fail(L('Contraseña incorrecta','Wrong password')); $('#gGo').disabled=false; $('#gGo').textContent=L('Desbloquear','Unlock'); } };
    $('#gGo').onclick=go; $('#gP').onkeydown=e=>{ if(e.key==='Enter') go(); };
    $('#gRec').onclick=e=>{ e.preventDefault(); showGate('recover'); };
  }
  else if(mode==='recover'){
    box(`<h2>${L('Recuperar acceso','Recover access')}</h2><label class="f">${L('Clave de recuperación','Recovery key')}<input id="gR" autocapitalize="characters" placeholder="XXXX-XXXX-…"></label><label class="f">${L('Nueva contraseña maestra','New master password')}<input type="password" id="g1" autocomplete="new-password"></label><label class="f">${L('Repítela','Repeat it')}<input type="password" id="g2" autocomplete="new-password"></label>
      <button class="pri" id="gGo" style="width:100%">${L('Recuperar','Recover')}</button><div id="gMsg" class="neg" style="margin-top:8px"></div><p><a href="#" id="gBack">${L('Volver','Back')}</a></p>`);
    $('#gBack').onclick=e=>{e.preventDefault();showGate('unlock',true);};
    $('#gGo').onclick=async()=>{ const a=$('#g1').value; if(a.length<10) return toast(tooShort); if(a!==$('#g2').value) return toast(noMatch);
      try{ await unlockWithRecovery($('#gR').value); await setPassword(a); const rec=await newRecovery(); showGate('recovery',rec); }catch(e){ $('#gMsg').textContent=L('Clave de recuperación incorrecta','Wrong recovery key'); } };
  }
}
function enterApp(first){ const g=$('#gate'); g.style.display='none'; g.innerHTML=''; document.body.classList.remove('locked'); bumpLock(); if(first&&!location.hash) location.hash='#resumen'; route(); if(first) setTimeout(()=>openModal(`<h2>${L('Todo listo','All set')}</h2><p>${L('Tus datos se guardan cifrados en este dispositivo.','Your data is stored encrypted on this device.')}</p><ul><li>${L('Toca el icono <b>i</b> azul de cada sección para ver qué es y cómo usarla, o abre el <b>Manual</b>.','Tap the blue <b>i</b> icon on each section to see what it is and how to use it, or open the <b>Manual</b>.')}</li><li>${L('Si vienes de la versión de claude.ai: <b>Copia y ajustes → Restaurar copia</b>.','If you come from the claude.ai version: <b>Backup & settings → Restore backup</b>.')}</li><li>${L('Haz copias cifradas de vez en cuando y guárdalas en Dropbox.','Make encrypted backups now and then and keep them in Dropbox.')}</li><li>${L('Para usar Claude, pega tu clave de API en <b>Copia y ajustes</b> (opcional).','To use Claude, paste your API key in <b>Backup & settings</b> (optional).')}</li></ul><div class="row"><button class="pri" id="mc">${L('Entendido','Got it')}</button></div>`)||($('#mc').onclick=closeModal),200); }
/* ---------- Claude con la clave del usuario ---------- */
const MODELS={quick:'claude-haiku-5-5',default:'claude-sonnet-5-5',complex:'claude-opus-5-5'};
function parseJSONLoose(t){ const s=String(t||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,''); const a=s.indexOf('{'), b=s.lastIndexOf('}'); return JSON.parse(a>=0?s.slice(a,b+1):s); }
async function claudeCall(prompt,opts={}){
  const key=S&&S.secret&&S.secret.apiKey; if(!key) throw Object.assign(new Error(L('Añade tu clave de API de Anthropic en Copia y ajustes','Add your Anthropic API key in Backup & settings')),{code:'no_key'});
  const stream=opts.stream!==false&&!!opts.onText;
  const body={model:MODELS[opts.modelTier||'default']||MODELS.default,max_tokens:opts.maxTokens||8000,stream,messages:[{role:'user',content:prompt}]};
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:opts.signal,headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});
  if(!res.ok){ let m=''; try{ const j=await res.json(); m=j.error&&j.error.message||''; }catch(e){} const code=res.status===401?'bad_key':res.status===429?'rate_limited':res.status===529?'overloaded':'http_'+res.status;
    throw Object.assign(new Error(code==='bad_key'?L('La clave de API no es válida','The API key is not valid'):code==='rate_limited'?L('Demasiadas peticiones; prueba en un rato','Too many requests; try again in a while'):code==='overloaded'?L('Claude está saturado; prueba en un momento','Claude is overloaded; try again shortly'):(L('Error de la API: ','API error: ')+(m||res.status))),{code}); }
  if(!stream){ const j=await res.json(); return {text:(j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join(''),truncated:j.stop_reason==='max_tokens'}; }
  const rd=res.body.getReader(); let buf='', text='', stop=null;
  for(;;){ const {value,done}=await rd.read(); if(done) break; buf+=TD.decode(value,{stream:true}); let i;
    while((i=buf.indexOf('\n'))>=0){ const line=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!line.startsWith('data:')) continue; let ev; try{ ev=JSON.parse(line.slice(5)); }catch(e){ continue; }
      if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.type==='text_delta'){ text+=ev.delta.text; opts.onText({text,delta:ev.delta.text}); }
      else if(ev.type==='message_delta'&&ev.delta) stop=ev.delta.stop_reason; else if(ev.type==='error') throw new Error(ev.error&&ev.error.message||'Error'); } }
  return {text,truncated:stop==='max_tokens'};
}
function getSample(){ if(!(S&&S.secret&&S.secret.apiKey)) return Promise.resolve(null); const f=(p,o)=>claudeCall(p,o); f.json=async(p,o={})=>parseJSONLoose((await claudeCall(p,Object.assign({},o,{stream:false,maxTokens:16000}))).text); return Promise.resolve(f); }
function downloadFile(name,text,type='application/json'){ try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000); return true; }catch(e){ return false; } }

/* ---------- Boot ---------- */
(async function(){
  try{ if(window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js'; }catch(e){}
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  $('#lockBtn').onclick=()=>{ if(S) lockNow(); };
  window.addEventListener('pagehide',()=>{ if(S&&saveTimer) flushSave(); });
  const ok=await IDB.open();
  if(!ok){ document.body.innerHTML=L('<div style="padding:24px;font-family:sans-serif"><h2>Este navegador no permite guardar datos</h2><p>Abre MyFinZen en Chrome, Safari, Edge o Firefox sin modo incógnito.</p></div>','<div style="padding:24px;font-family:sans-serif"><h2>This browser doesn\'t allow saving data</h2><p>Open MyFinZen in Chrome, Safari, Edge or Firefox outside private mode.</p></div>'); return; }
  VAULT.meta=await IDB.get('vault');
  // Quien ya usaba la app (solo existía en español) sigue en español hasta que elija otro idioma.
  let stored=null; try{ stored=localStorage.getItem('mfz-lang'); }catch(e){}
  if(VAULT.meta&&!stored) LANG='es';
  applyStatic();
  showGate(VAULT.meta?'unlock':'setup');
  if('serviceWorker' in navigator){ try{ const reg=await navigator.serviceWorker.register('sw.js');
    const ready=w=>{ $('#updBar').style.display='flex'; $('#updGo').onclick=()=>{ persist().finally(()=>w.postMessage('skipWaiting')); }; };
    if(reg.waiting&&navigator.serviceWorker.controller) ready(reg.waiting);
    reg.addEventListener('updatefound',()=>{ const w=reg.installing; w&&w.addEventListener('statechange',()=>{ if(w.state==='installed'&&navigator.serviceWorker.controller) ready(w); }); });
    let reloaded=false; navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(reloaded) return; reloaded=true; location.reload(); });
    setInterval(()=>reg.update().catch(()=>{}),60*60*1000);
  }catch(e){} }
})();
