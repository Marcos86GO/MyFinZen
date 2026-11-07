// MyFinZen · recolector de noticias.
// Lo ejecuta GitHub Actions cada hora (.github/workflows/noticias.yml) y publica news.json en la rama `news`.
// Solo publica titulares de medios reconocidos y de acceso libre (lista 'trusted' de news/sources.json) y usa una lista pública de símbolos (news/universe.json).
// Descarta opinión, listas promocionales tipo "acciones para comprar" y similares, agrupa la misma noticia publicada por varios medios
// (n = cuántos la cuentan, o = otros enlaces) y le da un nivel de impacto i (0–3) según el tema y cuántos medios la recogen.
// No conoce ni recibe nada del usuario: la app filtra en el dispositivo las noticias de sus posiciones.
// Uso: node news/build.mjs <salida.json> [anterior.json]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const H = 3600e3;
const FORMAT = 4; // súbelo si cambian los filtros para descartar lo acumulado
const UA = 'Mozilla/5.0 (compatible; MyFinZen-news/1.0; +https://github.com/Marcos86GO/MyFinZen)';
export const LIMITS = { regionHours: 72, regionMax: 100, countryMax: 50, tickerDays: 10, tickerMax: 6, rotation: 4, tickerDelayMs: Number(process.env.NEWS_DELAY_MS ?? 1500) };

/* ---------- XML / RSS ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', euro: '€' };
export function entities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
export function clean(s) {
  if (s == null) return '';
  let t = String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  t = entities(t); // a veces el HTML viene escapado dentro del título
  t = t.replace(/<[^>]*>/g, ' ');
  t = entities(t);
  return t.replace(/\s+/g, ' ').trim();
}
function tag(x, name) {
  const m = x.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : null;
}
export function parseFeed(xml) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = clean(tag(b, 'title'));
    let link = clean(tag(b, 'link'));
    if (!/^https?:\/\//i.test(link)) { const m = b.match(/<link[^>]*href=["']([^"']+)["']/i); link = m ? entities(m[1]) : ''; }
    if (!/^https?:\/\//i.test(link)) { const g = clean(tag(b, 'guid')); if (/^https?:\/\//i.test(g)) link = g; }
    const date = clean(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    const sm = b.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    out.push({ title, link, date, source: sm ? clean(sm[2]) : '', sourceUrl: sm ? entities(sm[1]) : '' });
  }
  return out;
}

/* ---------- Normalización ---------- */
export function host(u) { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }
export function isPaywalled(urls, list) {
  for (const u of urls) {
    if (!u) continue;
    let h, p; try { const x = new URL(u); h = x.hostname.replace(/^www\./, '').toLowerCase(); p = x.pathname; } catch { continue; }
    for (const e of list) {
      const i = e.indexOf('/');
      const d = i < 0 ? e : e.slice(0, i), pre = i < 0 ? '' : e.slice(i);
      if ((h === d || h.endsWith('.' + d)) && (!pre || p.startsWith(pre))) return true;
    }
  }
  return false;
}
// Medio de confianza: dominio exacto o subdominio de la lista 'trusted'. Devuelve su nivel (1 o 2) o 0.
export function trustTier(d, trusted) {
  if (!d || !trusted) return 0;
  for (let x = d; x; x = x.includes('.') ? x.slice(x.indexOf('.') + 1) : '') { if (trusted[x]) return trusted[x]; if (!x.includes('.')) break; }
  return 0;
}
// Lo que no es una noticia: opinión, publicidad, listas para "comprar ya", predicciones de precio…
export const JUNK = [
  /^(opinion|opinión|op-?ed|column|columna|editorial|commentary|tribuna|sponsored|patrocinado|publicidad|quiz|podcast)\s*[:|–—-]/i,
  /\b(\d+|two|three|four|five|six|seven|eight|nine|ten|top|best)\s+(\w+\s+)?(stocks?|ETFs?|funds?|shares|acciones|valores|fondos)\s+(to|que|para|a)\s+(buy|sell|watch|own|hold|comprar|vender|vigilar|tener)\b/i,
  /\b(stocks?|ETFs?|shares)\s+to\s+(buy|sell|watch|own|hold)\b/i,
  /\b(should you (buy|sell)|is it (time|too late) to (buy|sell)|buy (now|the dip)\?|no-?brainer|millionaire[- ]maker|retire (rich|early)|passive income|price (prediction|forecast)|could (soar|skyrocket|double|triple)|smartest \w+ to buy|forever stocks?|before it'?s too late|what to know before (you )?buy)\b/i,
  /\b(acciones|valores|fondos) (para comprar|que comprar|a comprar|a vigilar|para invertir)\b/i,
  /\b(hor[oó]scopo|horoscope|loter[ií]a|lottery|powerball|mega millions|promo code|c[oó]digo promocional|black friday deals?)\b/i,
  /\b(newsletter|sign ?up|suscr[ií]bete|subscribe)\b/i,
  /\b(precio del d[oó]lar|tipo de cambio|precio del oro|price of (gold|silver|oil)|current price of|cotizaci[oó]n del d[oó]lar)\b.*\b(hoy|today|\d{1,2} de \w+)\b/i];
// Temas de economía, mercados, empresas y política económica (español, inglés, italiano, portugués, francés)
const FIN = /\b(econom\w*|market(s)?|stocks?|shares?|bonds?|yields?|invest\w*|inversi\w*|bolsas?|mercados?|acciones|bonos|divisas?|d[oó]lar|dollar|euro|yen|yuan|peso|currenc\w*|inflation|inflaci\w*|inflazione|infla[cç][aã]o|rates?|tipos|tasas?|interest|inter[eé]s|banks?|banking|bancos?|banca|bancari\w*|fed|ecb|bce|gdp|pib|growth|crecimiento|recession|recesi\w*|jobs|employment|unemployment|empleo|paro|desempleo|wages?|salari\w*|prices?|precios?|cost of living|housing|vivienda|mortgages?|hipotec\w*|rents?|alquiler\w*|tax\w*|impuest\w*|fiscal|budget|presupuestos?|debt|deuda|deficit|d[eé]ficit|tariffs?|arancel\w*|trade|comercio|exports?|imports?|exportaci\w*|importaci\w*|oil|crude|petr[oó]leo|crudo|gas|energy|energ[ií]a|electricity|electricidad|earnings|profits?|revenue|beneficios?|ingresos|ventas|sales|compan(y|ies)|empresas?|firms?|corporate|ceo|merger|acquisition|takeover|fusi[oó]n|adquisici[oó]n|deal|ipo|layoffs?|despidos|startups?|business\w*|negocios?|industr\w*|manufactur\w*|retail\w*|consum\w*|spending|gasto|bitcoin|crypto\w*|cripto\w*|ai|ia|chips?|semiconductor\w*|tech|technology|tecnolog\w*|nvidia|apple|microsoft|amazon|tesla|alphabet|ibex|ftse|dax|cac|nikkei|hang seng|s&p|nasdaq|dow|tsx|asx|kospi|sensex|nifty|merval|ibovespa|ipsa|colcap|riesgo pa[ií]s|prima de riesgo|eur[ií]bor|sanctions?|sanci[oó]n|sanciones|subsid\w*|pensions?|pensi[oó]n|pensiones|retirement|jubilaci\w*|social security|seguridad social|wall street|borsa|mercati|azioni|imprese|aziende|lavoro|occupazione|tassi|prezzi|juros|emprego|a[cç][oõ]es|c[aâ]mbio|bourse|march[eé]s?|banque|croissance|ch[oô]mage|entreprises?|fmi|imf|opec|opep|wto|omc)\b/i;
const POL = /\b(elections?|elecci[oó]n|elecciones|congress|senate|senado|white house|casa blanca|president|presidente|government|gobierno|governo|gouvernement|parliament|parlamento|minister|ministro|ministra|law|ley|legge|bill|regulation|regulaci[oó]n|supreme court|tribunal supremo|policy|summit|cumbre|treaty|tratado|g7|g20|nato|otan|eu|ue)\b/i;
const NOISE = /\b(shooting|shot dead|killed|kills|murder\w*|stabb\w*|arrest\w*|police|tiroteo|asesin\w*|detenid\w*|polic[ií]a|crime|crimen|football|soccer|tennis|rugby|cricket|golf|nba|nfl|mlb|nhl|championship|olympic\w*|f[uú]tbol|liga|tenis|calcio|campeonato|davis cup|grand prix|f[oó]rmula 1|recipe|receta|horoscope|celebrity|famos[oa]s|movie|pel[ií]cula|weather|snow|nieve|met office|comer|m[uú]sculos|dieta|nutrici\w*|ejercicio f[ií]sico|workout|recipes?)\b/i;
// ¿Es una noticia de economía o política económica? (los titulares de una sola empresa buscada por símbolo no pasan por aquí)
export function isRelevant(t) { return (FIN.test(t) || POL.test(t)) && !NOISE.test(t) && t.trim().split(/\s+/).length >= 5; }
export const JUNK_PATH = /\/(opinion|opinions|opinión|commentary|commentisfree|columnists?|columns?|editorials?|blogs?|sponsored|partner-content|brandstudio|brand-studio|paid-content|press-releases?|comunicados?|patrocinado|publicidad|podcasts?|quizz?e?s?|shopping|deals|select|cnbc-select)\//i;
export function isJunk(t, url) { if (JUNK.some(r => r.test(t))) return true; try { return JUNK_PATH.test(new URL(url).pathname); } catch { return false; } }

export function titleKey(t) {
  return t.toLowerCase().replace(/&/g, ' and ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 14).join(' ');
}
export const REJECTED = new Map(); // dominios descartados por no estar en 'trusted' (solo para el registro de la tarea)
export function normalize(raw, feed, list, now = Date.now(), trusted = null) {
  const items = [];
  for (const r of raw) {
    if (!r.title || !/^https?:\/\//i.test(r.link)) continue;
    const isGN = host(r.link) === 'news.google.com';
    let source = r.source || feed.source || '';
    let t = r.title;
    if (isGN && source && t.endsWith(' - ' + source)) t = t.slice(0, -(source.length + 3)).trim();
    const d = isGN ? host(r.sourceUrl) : host(r.link);
    if (!source) source = d;
    if (isPaywalled([r.link, r.sourceUrl], list)) continue;
    if (trusted && !trustTier(d, trusted)) { if (d) REJECTED.set(d, (REJECTED.get(d) || 0) + 1); continue; } // solo medios reconocidos y de acceso libre
    if (feed.allow && !isPaywalled([isGN ? r.sourceUrl : r.link], feed.allow.map(a => a.replace(/^\./, '')))) continue; // fuera de los dominios permitidos
    let p = Date.parse(r.date); if (!Number.isFinite(p)) p = now; if (p > now + H) p = now;
    if (t.length < 12 || isJunk(t, isGN ? '' : r.link)) continue;
    if (!feed.symbol && !isRelevant(t)) continue; // fuera deportes, sucesos, secciones y temas sin relación con la economía
    items.push({ t, u: r.link, s: source, d, p: new Date(p).toISOString() });
  }
  return items;
}

/* ---------- Descarga ---------- */
export function gnURL(gn, editions, when = '1d') { // when: 1d, 2d, 7d…
  const e = editions[gn.ed || 'US'];
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${gn.q} when:${when}`)}&hl=${e.hl}&gl=${e.gl}&ceid=${encodeURIComponent(e.ceid)}`;
}
async function get(url, timeoutMs = 20000) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' } });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return await r.text();
  } finally { clearTimeout(tm); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function tickerQuery(u) {
  if (u.t === 'etf') return { ed: 'US', q: `"${u.s}" ETF` };
  const names = (u.a && u.a.length ? u.a : [u.n]).map(x => `"${x}"`);
  return { ed: 'US', q: `(${names.join(' OR ')}) (stock OR shares OR earnings)` };
}

/* ---------- Unión y recorte ---------- */
export function merge(lists) {
  const byKey = new Map();
  for (const it of lists.flat()) {
    const k = titleKey(it.t); if (!k) continue;
    const ex = byKey.get(k);
    if (!ex) { byKey.set(k, { ...it, r: [...(it.r || [])], k: [...(it.k || [])] }); continue; }
    for (const x of it.r || []) if (!ex.r.includes(x)) ex.r.push(x);
    for (const x of it.k || []) if (!ex.k.includes(x)) ex.k.push(x);
    if (host(ex.u) === 'news.google.com' && host(it.u) !== 'news.google.com') { ex.u = it.u; ex.s = it.s; ex.d = it.d; } // mejor el enlace directo al medio
    if (it.p < ex.p) ex.p = it.p;
  }
  return [...byKey.values()];
}
/* ---------- La misma noticia en varios medios ---------- */
const STOP = new Set(('the a an and or of to in on for at by with from as is are was were be been its it this that after amid over into than more most new says said will would could may might can just about up down out how why what who when where your you our their his her they we not but has have had '
  + 'el la los las de del y o u en por para con sin un una unos unas al lo que se su sus es son fue ha han tras ante sobre entre como más mas hoy este esta estos estas ya muy pero sí si le les ser está están '
  + 'il di da do dos das no em um uma os as é ao à pela pelo').split(/\s+/));
const stem = w => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const WEAK = new Set('stock stocks market markets share shares wall street investor investors price prices rate rates week today year index bolsa bolsas mercado mercados accion acciones inversor inversores precio precios tipos semana año indice dow nasdaq 500 sube suben baja bajan cae caen rise rises fall falls gain gains'.split(' ').map(stem));
export function tokens(t) {
  return [...new Set(String(t).toLowerCase().replace(/&/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$%]+/g, ' ').split(' ')
    .filter(w => w && !STOP.has(w) && (w.length >= 3 || /\d/.test(w))).map(stem))];
}
function weight(A) { let s = 0; for (const w of A) s += WEAK.has(w) ? 0.5 : 1; return s; }
export function sameStory(A, B) { // A, B: Set de palabras
  let sh = 0, strong = 0; for (const w of A) if (B.has(w)) { if (WEAK.has(w)) sh += 0.5; else { sh += 1; strong++; } }
  return strong >= 2 && sh >= 3 && sh / Math.min(weight(A), weight(B)) >= 0.6;
}
const HI = /\b(Fed|Federal Reserve|FOMC|Powell|ECB|BCE|Lagarde|Bank of England|Bank of Japan|BoJ|PBOC|Banxico|Banco de España|Banco Central|central banks?|bancos? centrales?|interest rates?|tipos de inter[eé]s|tasas? de inter[eé]s|rate (cut|hike|decision)s?|(recorte|subida|bajada) de tipos|inflation|inflaci[oó]n|CPI|IPC|PCE|jobs report|nonfarm|payrolls?|unemployment rate|tasa de (paro|desempleo)|GDP|PIB|recession|recesi[oó]n|tariffs?|aranceles?|trade (war|deal)|guerra comercial|sanctions?|sanciones|shutdown|debt ceiling|techo de deuda|default|impago|bankrupt\w*|bankruptcy|quiebra|concurso de acreedores|bailout|rescate|crash|meltdown|crisis)\b/i;
const MID = /\b(record (high|low|close)|all-time high|m[aá]ximos? hist[oó]ricos?|plunge[sd]?|plummet\w*|tumble[sd]?|soar(s|ed|ing)?|surge[sd]?|sell-?off|rout|se desploma\w*|se hunde\w*|se dispara\w*|desplome|earnings|resultados|profit warning|guidance|merger|acquisition|acquires?|acquired|takeover|buyout|fusi[oó]n|adquisici[oó]n|OPA|IPO|salida a bolsa|layoffs?|despidos|ERE|SEC|CNMV|antitrust|fined|multa|downgrade[sd]?|oil prices?|OPEC\+?|OPEP|petr[oó]leo|treasury yields?|bond yields?|prima de riesgo|\$\d+(\.\d+)?\s?(billion|trillion|bn|tn)|\d+([.,]\d+)? (mil millones|billones))\b/i;
// Impacto 0–3: tema (política monetaria, inflación, empleo, aranceles, crisis… = 2; grandes movimientos, resultados, fusiones… = 1) + cuántos medios la cuentan (3+ = 1; 5+ = 2)
export function impact(titles, n) {
  const k = titles.some(t => HI.test(t)) ? 2 : titles.some(t => MID.test(t)) ? 1 : 0;
  return Math.min(3, k + (n >= 5 ? 2 : n >= 3 ? 1 : 0)); // con 2 medios no basta: muchos reproducen la misma nota de agencia
}
export function cluster(items, trusted = {}, windowH = 36) {
  const tk = items.map(it => new Set(tokens(it.t))); const P = items.map((_, i) => i);
  const find = i => { while (P[i] !== i) { P[i] = P[P[i]]; i = P[i]; } return i; };
  const idx = new Map(); tk.forEach((A, i) => { for (const w of A) if (!WEAK.has(w)) { if (!idx.has(w)) idx.set(w, []); idx.get(w).push(i); } });
  const ms = items.map(it => Date.parse(it.p));
  for (let i = 0; i < items.length; i++) {
    const cnt = new Map(); for (const w of tk[i]) if (!WEAK.has(w)) for (const j of idx.get(w)) if (j < i) cnt.set(j, (cnt.get(j) || 0) + 1);
    for (const [j, c] of cnt) if (c >= 2 && Math.abs(ms[i] - ms[j]) <= windowH * H && find(i) !== find(j) && sameStory(tk[i], tk[j])) P[find(i)] = find(j);
  }
  const groups = new Map(); items.forEach((it, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(it); });
  const out = [];
  for (const g of groups.values()) {
    const rank = it => (trustTier(it.d, trusted) || 3) * 10 + (host(it.u) === 'news.google.com' ? 1 : 0);
    g.sort((a, b) => rank(a) - rank(b) || a.p.localeCompare(b.p));
    const rep = g[0]; const doms = new Map();
    for (const it of g) { if (it.d && !doms.has(it.d)) doms.set(it.d, { s: it.s, u: it.u, d: it.d }); for (const o of it.o || []) if (o.d && !doms.has(o.d)) doms.set(o.d, o); }
    const n = Math.max(doms.size || 1, ...g.map(it => it.n || 1));
    const o = [...doms.values()].filter(x => x.d !== rep.d).slice(0, 4);
    out.push({ ...rep, p: g.reduce((m, it) => (it.p < m ? it.p : m), rep.p), r: [...new Set(g.flatMap(it => it.r || []))], k: [...new Set(g.flatMap(it => it.k || []))], n, o, i: impact(g.map(it => it.t), n) });
  }
  return out;
}

export function trim(items, regions, now = Date.now(), L = LIMITS) {
  const country = new Set(regions.filter(r => r.country).map(r => r.id));
  const sorted = items.slice().sort((a, b) => b.p.localeCompare(a.p));
  const keepR = new Map(), keepK = new Map();
  for (const it of sorted) {
    const age = now - Date.parse(it.p);
    it.r = it.r.filter(r => { if (age > L.regionHours * H) return false; const n = keepR.get(r) || 0; const max = country.has(r) ? L.countryMax : L.regionMax; if (n >= max) return false; keepR.set(r, n + 1); return true; });
    it.k = it.k.filter(k => { if (age > L.tickerDays * 24 * H) return false; const n = keepK.get(k) || 0; if (n >= L.tickerMax) return false; keepK.set(k, n + 1); return true; });
  }
  return sorted.filter(it => it.r.length || it.k.length).map(it => { const o = { t: it.t, u: it.u, s: it.s, d: it.d, p: it.p };
    if (it.i != null) o.i = it.i; if (it.n > 1) o.n = it.n; if (it.o && it.o.length) o.o = it.o; if (it.r.length) o.r = it.r; if (it.k.length) o.k = it.k; return o; });
}

/* ---------- Programa ---------- */
async function main() {
  const [outPath = 'news.json', prevPath] = process.argv.slice(2);
  const SRC = JSON.parse(await fs.readFile(path.join(HERE, 'sources.json'), 'utf8'));
  const UNI = JSON.parse(await fs.readFile(path.join(HERE, 'universe.json'), 'utf8'));
  let prev = {}; if (prevPath) { try { prev = JSON.parse(await fs.readFile(prevPath, 'utf8')); } catch { prev = {}; } }
  if (prev.v !== FORMAT) prev = {}; // al cambiar filtros o formato se empieza de cero
  const BLOCK = [...SRC.paywall, ...(SRC.skip || [])];
  const now = Date.now();
  const status = []; const got = [];

  // 1) Titulares por región (en paralelo, de 6 en 6)
  const queue = SRC.feeds.slice();
  async function worker() {
    while (queue.length) {
      const f = queue.shift(); const t0 = Date.now();
      const url = f.gn ? gnURL(f.gn, SRC.editions, f.gn.when || '1d') : f.url;
      try {
        const items = normalize(parseFeed(await get(url)), f, BLOCK, now, SRC.trusted).map(x => ({ ...x, r: [f.region] }));
        got.push(items); status.push({ id: f.id, region: f.region, ok: items.length > 0, n: items.length, ms: Date.now() - t0, ...(items.length ? {} : { err: 'sin titulares' }) });
      } catch (e) { status.push({ id: f.id, region: f.region, ok: false, n: 0, ms: Date.now() - t0, err: String(e.message || e).slice(0, 120) }); }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  // 2) Noticias por símbolo: una cuarta parte del universo en cada ejecución (todo en la primera)
  const slot = Math.floor(now / H) % LIMITS.rotation;
  const first = !(prev.items && prev.items.length);
  const todo = UNI.filter((u, i) => first || i % LIMITS.rotation === slot);
  let tOk = 0, tFail = 0, stopped = '';
  for (const u of todo) {
    try {
      const items = normalize(parseFeed(await get(gnURL(tickerQuery(u), SRC.editions, '7d'))), { symbol: u.s }, BLOCK, now, SRC.trusted).map(x => ({ ...x, k: [u.s] }));
      got.push(items); tOk++;
    } catch (e) {
      tFail++;
      if (e.status === 429 || e.status === 503) { stopped = 'Google News pidió esperar (HTTP ' + e.status + ')'; break; }
    }
    await sleep(LIMITS.tickerDelayMs);
  }

  // 3) Unir con lo anterior, quitar duplicados y recortar
  const regions = SRC.regions;
  const prevItems = (prev.items || []).filter(x => !isPaywalled(['https://' + x.d + '/'], BLOCK) && trustTier(x.d, SRC.trusted) && !isJunk(x.t, x.u) && ((x.k && x.k.length && !(x.r && x.r.length)) || isRelevant(x.t))).map(x => ({ ...x, r: x.r || [], k: x.k || [] }));
  const items = trim(cluster(merge([prevItems, ...got]), SRC.trusted), regions, now);
  const out = {
    v: FORMAT, updated: new Date(now).toISOString(), regions,
    universe: UNI.map(u => ({ s: u.s, n: u.n, ...(u.a ? { a: u.a } : {}) })),
    feeds: status.sort((a, b) => a.id.localeCompare(b.id)),
    tickers: { queried: todo.length, ok: tOk, failed: tFail, ...(stopped ? { stopped } : {}) },
    items
  };
  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out));
  const okF = status.filter(s => s.ok).length;
  console.log(`Fuentes: ${okF}/${status.length} con titulares · símbolos: ${tOk}/${todo.length}${stopped ? ' · ' + stopped : ''} · ${items.length} noticias (${items.filter(x => x.i >= 2).length} de alto impacto, ${items.filter(x => x.n > 1).length} en varios medios)`);
  for (const s of out.feeds) console.log(`${s.ok ? '✓' : '✗'} ${s.id.padEnd(24)} ${String(s.n).padStart(3)} ${s.err || ''}`);
  const rej = [...REJECTED].sort((a, b) => b[1] - a[1]).slice(0, 60);
  if (rej.length) console.log('Descartados por no estar en trusted (revisar de vez en cuando): ' + rej.map(([d, c]) => d + ' ' + c).join(', '));
  if (!okF) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error(e); process.exit(1); });
